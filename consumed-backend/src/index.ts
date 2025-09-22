import { setCookie, parseCookies, makeSessionCookie, verifySessionCookie } from "./utils/cookie";
import { nowInNY, formatWeekPath } from "./utils/time";
import type { Env } from "./sheets";
import { SheetsClient } from "./sheets";

// Simple router
export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method.toUpperCase();

    // Cron trigger will call scheduled(); fetch handles HTTP only
    if (path === "/" || path === "/health") {
      return new Response("ok", { status: 200 });
    }

    if (path === "/test-publish" && method === "POST") {
      const url = new URL(req.url);
      const week = url.searchParams.get("week");
      if (!week || !/^\d{4}-\d{2}$/.test(week)) {
        return new Response("Invalid week format", { status: 400 });
      }
      const [year, weekNum] = week.split("-").map(Number);
      try {
        const rows = await sheets.listRowsForIsoWeek(year, weekNum);
        const publicRows = rows.filter(r => r.is_public);
        console.log(`Publishing ${publicRows.length} entries for week ${week}`);
        const result = await publishWeek(env, year, weekNum, publicRows);
        console.log(`Successfully published week ${week} with ${publicRows.length} entries`);
        return new Response(`Published week ${week} with ${publicRows.length} entries`);
      } catch (error) {
        console.error("Publish error:", error);
        return new Response(`Error: ${error}`, { status: 500 });
      }
    }

    // Authenticated routes start with /draft/consumed or /api or /publish
    const isAuthed = await authenticate(req, env);

    // YouTube OAuth flow (one time setup)
    if (path === "/oauth/youtube/start" && method === "GET") {
      if (!isAuthed) return new Response("Unauthorized", { status: 401 });
      const origin = `${url.protocol}//${url.host}`;
      const redirect = `${origin}/oauth/youtube/callback`;
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", env.YOUTUBE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirect);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.readonly");
      return Response.redirect(authUrl.toString(), 302);
    }
    if (path === "/oauth/youtube/callback" && method === "GET") {
      if (!isAuthed) return new Response("Unauthorized", { status: 401 });
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });
      const origin = `${url.protocol}//${url.host}`;
      const redirect = `${origin}/oauth/youtube/callback`;
      const body = new URLSearchParams({
        code,
        client_id: env.YOUTUBE_CLIENT_ID,
        client_secret: env.YOUTUBE_CLIENT_SECRET,
        redirect_uri: redirect,
        grant_type: "authorization_code",
      });
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      });
      const payload = await tokenRes.json<any>();
      const refresh = payload?.refresh_token;
      if (refresh) await env.RUN_STATUS.put("yt:refresh_token", refresh);
      const html = `<!doctype html><meta charset='utf-8'><title>YouTube connected</title><body style='font-family:system-ui;max-width:800px;margin:10vh auto;padding:16px'><h1>YouTube Connected</h1><p>Refresh token ${refresh ? "stored" : "NOT received"}. You can close this window.</p><p><a href='/draft/consumed'>&larr; Back to dashboard</a></p>`;
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    if (path === "/draft/consumed" && method === "GET") {
      if (!isAuthed) return loginPage();
      return dashboardPage(env);
    }

    if (path === "/api/login" && method === "POST") {
      const form = await req.formData();
      const password = String(form.get("password") || "");
      if (!password || password !== env.DASHBOARD_PASSWORD) {
        return new Response("Invalid password", { status: 401 });
      }
      const cookieVal = await makeSessionCookie({ u: "admin", t: Date.now() }, env.SESSION_SECRET);
      const headers = new Headers({ Location: "/draft/consumed" });
      headers.append("Set-Cookie", setCookie("sess", cookieVal, { httpOnly: true, path: "/", sameSite: "Lax", secure: true, maxAge: 60 * 60 * 8 }));
      return new Response(null, { status: 302, headers });
    }

    if (!isAuthed) return new Response("Unauthorized", { status: 401 });

    if (path === "/api/ingest" && method === "POST") {
      const { ingestLastFm } = await import("./ingest/lastfm");
      const { ingestYouTubeLikes } = await import("./ingest/youtube");
      const sheets = new SheetsClient(env);
      const [lfm, yt] = await Promise.allSettled([ingestLastFm(env), ingestYouTubeLikes(env)]);
      const rows: any[] = [];
      if (lfm.status === "fulfilled") rows.push(...lfm.value);
      if (yt.status === "fulfilled") rows.push(...yt.value);
      if (rows.length) await sheets.appendRows(rows as any);
      return new Response(`Ingested ${rows.length} rows`, { status: 200 });
    }

    if (path === "/api/entries" && method === "POST") {
      try {
        const form = await req.formData();
        const bucket = String(form.get("bucket") || "other");
        const title = String(form.get("title") || "").trim();
        const urlf = String(form.get("url") || "").trim();
        const notes = String(form.get("notes") || "").trim();
        const date = String(form.get("date") || new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }));

        // Validation
        if (!title) {
          return new Response("Title is required", { status: 400 });
        }
        if (!["music", "video", "article", "tweet", "other"].includes(bucket)) {
          return new Response("Invalid bucket type", { status: 400 });
        }
        if (urlf && !isValidUrl(urlf)) {
          return new Response("Invalid URL format", { status: 400 });
        }

        const { sha256Hex } = await import("./utils/hash");
        const id = await sha256Hex(`manual|${title}|${urlf}|${date}|${Date.now()}`);
        const nowIso = new Date().toISOString();
        const row = { id, date, bucket: bucket as any, title, url: urlf, source: "manual", notes, is_public: true, created_at: nowIso, updated_at: nowIso };
        const sheets = new SheetsClient(env);
        await sheets.appendRows([row]);
        return new Response("Entry added successfully", { status: 200 });
      } catch (err) {
        console.error("Error adding entry:", err);
        return new Response("Failed to add entry", { status: 500 });
      }
    }

    if (path.startsWith("/api/entries/") && method === "POST") {
      const rawId = path.split("/").pop()!;
      let form: FormData | null = null;

      try {
        if (!rawId) {
          return new Response("Entry ID is required", { status: 400 });
        }

        // Decode the URL-encoded ID to match what's stored in the sheet
        const id = decodeURIComponent(rawId);
        console.log(`Raw ID: ${rawId}, Decoded ID: ${id}`);

        form = await req.formData();
        const notes = form.has("notes") ? String(form.get("notes") || "").trim() : undefined;
        const isPublic = form.has("is_public") ? String(form.get("is_public")) : undefined;

        console.log(`Updating entry ${id} with notes: "${notes?.substring(0, 50)}..." is_public: ${isPublic}`);

        const sheets = new SheetsClient(env);
        await sheets.updateRow(id, {
          notes,
          is_public: typeof isPublic === "string" ? isPublic === "true" : undefined
        });

        console.log(`Successfully updated entry ${id}`);
        return new Response("Entry updated successfully", { status: 200 });
      } catch (err) {
        console.error("Error updating entry:", {
          error: err.message,
          stack: err.stack,
          rawId,
          decodedId: rawId ? decodeURIComponent(rawId) : "null",
          notes: form?.has("notes") ? String(form.get("notes") || "").substring(0, 100) : "no notes",
          isPublic: form?.has("is_public") ? String(form.get("is_public")) : "no is_public",
          hasSheetId: !!env.SHEETS_ID,
          hasServiceAccount: !!env.GOOGLE_SERVICE_ACCOUNT_JSON
        });
        return new Response(`Failed to update entry: ${err.message}`, { status: 500 });
      }
    }

    if (path.startsWith("/publish/week") && method === "POST") {
      try {
        const week = url.searchParams.get("week");
        const ww = week ?? formatWeekPath(nowInNY());
        const [y, w] = ww.split("-");
        const year = Number(y);
        const wk = Number(w);

        console.log(`Publishing week ${ww} (year: ${year}, week: ${wk})`);

        if (!year || !wk || year < 2020 || year > 2030 || wk < 1 || wk > 53) {
          return new Response("Invalid week format. Expected YYYY-WW", { status: 400 });
        }

        const sheets = new SheetsClient(env);
        const rowsAll = await sheets.listRowsForIsoWeek(year, wk);
        console.log(`Retrieved ${rowsAll.length} total entries for week ${ww}`);

        const rows = rowsAll.filter(r => r.is_public);
        console.log(`Found ${rows.length} public entries out of ${rowsAll.length} total for week ${ww}`);

        if (rows.length === 0) {
          console.log(`No public entries found for week ${ww} - returning 404`);
          return new Response(`No public entries found for week ${ww}`, { status: 404 });
        }

        console.log(`Publishing ${rows.length} entries for week ${ww}`);
        const { publishWeek } = await import("./publish/index");
        const res = await publishWeek(env as any, year, wk, rows as any);
        if (!res.ok) return res;
        console.log(`Successfully published week ${ww} with ${rows.length} entries`);
        return new Response(`Published week ${ww} with ${rows.length} entries`, { status: 200 });
      } catch (err) {
        console.error("Error publishing week:", err);
        return new Response("Failed to publish week", { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Run around 03:00–04:00 UTC only if local NY time is 23:00 and not processed today
    const ny = nowInNY();
    const yyyyMmDd = ny.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const hour = ny.getHours();
    if (hour !== 23) return; // gate to 11 PM ET

    const key = `last-run-${yyyyMmDd}`;
    const already = await env.RUN_STATUS.get(key);
    if (already) return;

    const { ingestLastFm } = await import("./ingest/lastfm");
    const { ingestYouTubeLikes } = await import("./ingest/youtube");
    const sheets = new SheetsClient(env);
    const [lfm, yt] = await Promise.allSettled([ingestLastFm(env), ingestYouTubeLikes(env)]);
    const rows: any[] = [];
    if (lfm.status === "fulfilled") rows.push(...lfm.value);
    if (yt.status === "fulfilled") rows.push(...yt.value);
    if (rows.length) await sheets.appendRows(rows as any);
    await env.RUN_STATUS.put(key, "1", { expirationTtl: 60 * 60 * 20 });
  },
};

async function authenticate(req: Request, env: Env): Promise<boolean> {
  const cookies = parseCookies(req.headers.get("Cookie"));
  const sess = cookies["sess"];
  if (!sess) return false;
  const payload = await verifySessionCookie(sess, env.SESSION_SECRET);
  return !!payload;
}

function loginPage(): Response {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Login · Consumed Draft</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:420px;margin:10vh auto;padding:0 16px;color:#111}form{display:flex;gap:8px}input[type=password]{flex:1;padding:10px;border:1px solid #ccc;border-radius:6px}button{padding:10px 16px;border:0;border-radius:6px;background:#111;color:#fff;cursor:pointer}</style>
</head><body>
  <h1>Consumed · Draft Login</h1>
  <form method="post" action="/api/login">
    <input type="password" name="password" placeholder="Password" autocomplete="current-password" required>
    <button type="submit">Login</button>
  </form>
</body></html>`;
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

async function dashboardPage(env: Env): Promise<Response> {
  const ny = nowInNY();
  const week = formatWeekPath(ny);

  // Fetch last 7 days of data
  const sheets = new SheetsClient(env);
  let entries: any[] = [];
  try {
    console.log("Fetching entries from Google Sheets...");
    entries = await sheets.listRowsSince(7);
    console.log(`Retrieved ${entries.length} entries from sheets`);
    if (entries.length > 0) {
      console.log("Sample entry:", {
        id: entries[0].id,
        title: entries[0].title,
        is_public: entries[0].is_public,
        date: entries[0].date
      });
    }
  } catch (err) {
    console.error("Failed to fetch entries:", {
      error: err.message,
      stack: err.stack,
      hasSheetId: !!env.SHEETS_ID,
      hasServiceAccount: !!env.GOOGLE_SERVICE_ACCOUNT_JSON
    });
  }

  // Group by date, then by bucket
  const groupedByDate = groupEntriesByDate(entries);

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Consumed · Draft</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:1200px;margin:2vh auto;padding:0 16px;color:#111;line-height:1.5}
header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:16px}
.bulk-controls{background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin-bottom:24px}
.bulk-controls h3{margin:0 0 12px 0;font-size:16px}
.bulk-actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.bulk-btn{padding:8px 16px;border:1px solid #ddd;border-radius:6px;background:#fff;color:#333;cursor:pointer;font-size:14px}
.bulk-btn.primary{background:#007bff;color:#fff;border-color:#007bff}
.bulk-btn:hover{background:#f8f9fa}
.bulk-btn.primary:hover{background:#0056b3}
.bulk-btn:disabled{opacity:0.6;cursor:not-allowed}
.bulk-btn:disabled:hover{background:inherit}
.status-summary{font-size:14px;color:#666;margin-left:auto}
.save-status{position:fixed;top:20px;right:20px;padding:8px 12px;border-radius:4px;font-size:12px;opacity:0;transition:opacity 0.3s}
.save-status.show{opacity:1}
.save-status.success{background:#d4edda;color:#155724;border:1px solid #c3e6cb}
.save-status.error{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb}
.publish-btn{padding:10px 16px;border:0;border-radius:6px;background:#111;color:#fff;cursor:pointer;font-size:14px;text-decoration:none;display:inline-block}
.publish-btn:hover{background:#333}
.day-section{margin:32px 0;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden}
.day-header{background:#f8f9fa;padding:16px;border-bottom:1px solid #e0e0e0;font-weight:600;font-size:16px}
.bucket-section{border-bottom:1px solid #f0f0f0}
.bucket-section:last-child{border-bottom:none}
.bucket-header{background:#fafbfc;padding:12px 16px;font-weight:500;font-size:14px;color:#666;text-transform:uppercase;letter-spacing:0.5px}
.entry{padding:16px;border-bottom:1px solid #f8f9fa;display:flex;align-items:flex-start;gap:16px}
.entry:last-child{border-bottom:none}
.entry-content{flex:1;min-width:0}
.entry-title{font-weight:500;margin:0 0 4px 0}
.entry-title a{color:#111;text-decoration:none}
.entry-title a:hover{text-decoration:underline}
.entry-meta{font-size:12px;color:#666;margin-bottom:8px}
.entry-notes{margin:8px 0}
.entry-notes textarea{width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:13px;font-family:inherit;resize:vertical;min-height:60px}
.entry-controls{display:flex;align-items:center;gap:12px;flex-shrink:0}
.toggle{position:relative;display:inline-block;width:44px;height:24px}
.toggle input{opacity:0;width:0;height:0}
.slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#ccc;border-radius:24px;transition:0.2s}
.slider:before{position:absolute;content:"";height:18px;width:18px;left:3px;bottom:3px;background:white;border-radius:50%;transition:0.2s}
input:checked + .slider{background:#2196F3}
input:checked + .slider:before{transform:translateX(20px)}
.toggle-label{font-size:12px;color:#666}
.add-form{background:#f8f9fa;border-radius:8px;padding:24px;margin:32px 0}
.form-row{display:flex;gap:16px;margin-bottom:16px;align-items:center;flex-wrap:wrap}
.form-row label{min-width:80px;font-weight:500;font-size:14px}
.form-row input, .form-row select, .form-row textarea{padding:8px;border:1px solid #ddd;border-radius:4px;font-size:14px;font-family:inherit}
.form-row input[type="text"], .form-row input[type="url"]{flex:1;min-width:200px}
.form-row textarea{flex:1;min-width:200px;resize:vertical;height:60px}
.form-row select{min-width:120px}
.add-btn{padding:10px 20px;border:0;border-radius:6px;background:#0066cc;color:#fff;cursor:pointer;font-size:14px}
.add-btn:hover{background:#0052a3}
.empty-state{text-align:center;padding:48px 16px;color:#666}
.ingest-btn{padding:8px 12px;border:1px solid #ddd;border-radius:4px;background:#fff;color:#666;cursor:pointer;font-size:12px;text-decoration:none}
.ingest-btn:hover{background:#f8f9fa}
</style>
</head><body>
  <header>
    <h1>Consumed · Draft</h1>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <a class="ingest-btn" href="/oauth/youtube/start">Connect YouTube</a>
      <form method="post" action="/api/ingest" style="display:inline"><button type="submit" class="ingest-btn">Run Ingest</button></form>
      <form method="post" action="/publish/week?week=${week}" style="display:inline"><button type="submit" class="publish-btn">Publish Week ${week}</button></form>
    </div>
  </header>

  <div class="bulk-controls">
    <h3>Bulk Actions</h3>
    <div class="bulk-actions">
      <button class="bulk-btn primary" onclick="bulkSetPublic()">Mark All Public</button>
      <button class="bulk-btn" onclick="bulkSetPrivate()">Mark All Private</button>
      <button class="bulk-btn" onclick="bulkSaveNotes()">Save All Notes</button>
      <span class="status-summary">
        <span id="public-count">0</span> public,
        <span id="private-count">0</span> private,
        <span id="total-count">0</span> total
      </span>
    </div>
  </div>

  <div class="save-status" id="save-status"></div>

  <div class="add-form">
    <h2 style="margin:0 0 16px 0">Add Manual Entry</h2>
    <form method="post" action="/api/entries">
      <div class="form-row">
        <label for="bucket">Type:</label>
        <select name="bucket" id="bucket" required>
          <option value="article">Article</option>
          <option value="video">Video</option>
          <option value="tweet">Tweet</option>
          <option value="music">Music</option>
          <option value="other">Other</option>
        </select>
        <label for="date">Date:</label>
        <input type="date" name="date" id="date" value="${new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" })}" required>
      </div>
      <div class="form-row">
        <label for="title">Title:</label>
        <input type="text" name="title" id="title" placeholder="Entry title" required>
      </div>
      <div class="form-row">
        <label for="url">URL:</label>
        <input type="url" name="url" id="url" placeholder="https://example.com">
      </div>
      <div class="form-row">
        <label for="notes">Notes:</label>
        <textarea name="notes" id="notes" placeholder="Optional notes..."></textarea>
      </div>
      <div class="form-row">
        <label></label>
        <button type="submit" class="add-btn">Add Entry</button>
      </div>
    </form>
  </div>

  ${renderEntries(groupedByDate)}

  <div class="bulk-controls">
    <h3>Bulk Actions</h3>
    <div class="bulk-actions">
      <button class="bulk-btn primary" onclick="bulkSetPublic()">Mark All Public</button>
      <button class="bulk-btn" onclick="bulkSetPrivate()">Mark All Private</button>
      <button class="bulk-btn" onclick="bulkSaveNotes()">Save All Notes</button>
      <span class="status-summary">
        <span id="public-count-bottom">0</span> public,
        <span id="private-count-bottom">0</span> private,
        <span id="total-count-bottom">0</span> total
      </span>
    </div>
  </div>

  <script>
    // Auto-save notes on blur
    document.addEventListener('blur', async (e) => {
      if (e.target.matches('.entry-notes textarea')) {
        const id = e.target.dataset.id;
        const notes = e.target.value;
        const originalBackground = e.target.style.background;

        try {
          // Show saving state
          e.target.style.background = '#fff3cd';
          e.target.style.borderColor = '#ffc107';

          const form = new FormData();
          form.append('notes', notes);
          const response = await fetch('/api/entries/' + id, {
            method: 'POST',
            body: form
          });

          if (response.ok) {
            // Show success
            e.target.style.background = '#d4edda';
            e.target.style.borderColor = '#28a745';
            setTimeout(() => {
              e.target.style.background = originalBackground;
              e.target.style.borderColor = '#ddd';
            }, 1500);
          } else {
            throw new Error('Save failed');
          }
        } catch (err) {
          console.error('Failed to save notes:', err);
          // Show error
          e.target.style.background = '#f8d7da';
          e.target.style.borderColor = '#dc3545';
          setTimeout(() => {
            e.target.style.background = originalBackground;
            e.target.style.borderColor = '#ddd';
          }, 2000);
        }
      }
    }, true);

    // Handle public/private toggle
    document.addEventListener('change', async (e) => {
      if (e.target.matches('.public-toggle')) {
        const id = e.target.dataset.id;
        const isPublic = e.target.checked;
        try {
          const form = new FormData();
          form.append('is_public', isPublic.toString());
          await fetch('/api/entries/' + id, {
            method: 'POST',
            body: form
          });
        } catch (err) {
          console.error('Failed to update visibility:', err);
          e.target.checked = !isPublic; // revert on error
        }
      }
    });

    // Handle form submission with feedback
    document.querySelector('.add-form form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const button = form.querySelector('button[type="submit"]');
      const originalText = button.textContent;

      try {
        button.textContent = 'Adding...';
        button.disabled = true;

        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form)
        });

        if (response.ok) {
          form.reset();
          // Set date to today
          form.querySelector('[name="date"]').value = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
          button.textContent = 'Added!';
          button.style.background = '#059669';
          setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
            button.disabled = false;
            form.reset();
            form.querySelector('[name="date"]').value = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
          }, 2000);
        } else {
          const error = await response.text();
          alert('Error: ' + error);
          button.textContent = originalText;
          button.disabled = false;
        }
      } catch (err) {
        console.error('Failed to add entry:', err);
        alert('Failed to add entry. Please try again.');
        button.textContent = originalText;
        button.disabled = false;
      }
    });

    // Bulk controls functionality
    function updateStatusSummary() {
      const publicCount = document.querySelectorAll('.public-toggle:checked').length;
      const totalCount = document.querySelectorAll('.public-toggle').length;
      const privateCount = totalCount - publicCount;

      // Update top summary
      document.getElementById('public-count').textContent = publicCount;
      document.getElementById('private-count').textContent = privateCount;
      document.getElementById('total-count').textContent = totalCount;

      // Update bottom summary
      document.getElementById('public-count-bottom').textContent = publicCount;
      document.getElementById('private-count-bottom').textContent = privateCount;
      document.getElementById('total-count-bottom').textContent = totalCount;
    }

    function showStatus(message, isSuccess = true) {
      const statusEl = document.getElementById('save-status');
      statusEl.textContent = message;

      // Set styles immediately
      statusEl.style.background = isSuccess ? '#d4edda' : '#f8d7da';
      statusEl.style.color = isSuccess ? '#155724' : '#721c24';
      statusEl.style.border = isSuccess ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
      statusEl.style.opacity = '1';
      statusEl.style.display = 'block';

      // Auto-hide after 4 seconds
      setTimeout(() => {
        statusEl.style.opacity = '0';
        setTimeout(() => { statusEl.style.display = 'none'; }, 300);
      }, 4000);
    }

    async function bulkSetPublic() {
      const toggles = document.querySelectorAll('.public-toggle:not(:checked)');
      const buttons = document.querySelectorAll('.bulk-btn');

      // Show loading state
      buttons.forEach(btn => btn.disabled = true);
      showStatus('Processing ' + toggles.length + ' entries...', true);

      let successCount = 0;

      for (const toggle of toggles) {
        try {
          const form = new FormData();
          form.append('is_public', 'true');
          await fetch('/api/entries/' + toggle.dataset.id, {
            method: 'POST',
            body: form
          });
          toggle.checked = true;
          successCount++;
        } catch (err) {
          console.error('Failed to update entry:', err);
        }
      }

      // Re-enable buttons
      buttons.forEach(btn => btn.disabled = false);

      updateStatusSummary();
      showStatus('✅ Updated ' + successCount + ' entries to public');
    }

    async function bulkSetPrivate() {
      const toggles = document.querySelectorAll('.public-toggle:checked');
      const buttons = document.querySelectorAll('.bulk-btn');

      // Show loading state
      buttons.forEach(btn => btn.disabled = true);
      showStatus('Processing ' + toggles.length + ' entries...', true);

      let successCount = 0;

      for (const toggle of toggles) {
        try {
          const form = new FormData();
          form.append('is_public', 'false');
          await fetch('/api/entries/' + toggle.dataset.id, {
            method: 'POST',
            body: form
          });
          toggle.checked = false;
          successCount++;
        } catch (err) {
          console.error('Failed to update entry:', err);
        }
      }

      // Re-enable buttons
      buttons.forEach(btn => btn.disabled = false);

      updateStatusSummary();
      showStatus('✅ Updated ' + successCount + ' entries to private');
    }

    async function bulkSaveNotes() {
      const textareas = document.querySelectorAll('.entry-notes textarea');
      const buttons = document.querySelectorAll('.bulk-btn');

      // Show loading state
      buttons.forEach(btn => btn.disabled = true);
      showStatus('Saving notes for ' + textareas.length + ' entries...', true);

      let successCount = 0;

      for (const textarea of textareas) {
        try {
          const form = new FormData();
          form.append('notes', textarea.value);
          await fetch('/api/entries/' + textarea.dataset.id, {
            method: 'POST',
            body: form
          });
          successCount++;
        } catch (err) {
          console.error('Failed to save notes:', err);
        }
      }

      // Re-enable buttons
      buttons.forEach(btn => btn.disabled = false);

      showStatus('✅ Saved notes for ' + successCount + ' entries');
    }

    // Initialize status summary on page load
    document.addEventListener('DOMContentLoaded', updateStatusSummary);

    // Update status when individual toggles change
    document.addEventListener('change', (e) => {
      if (e.target.matches('.public-toggle')) {
        updateStatusSummary();
      }
    });
  </script>
</body></html>`;

  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

function groupEntriesByDate(entries: any[]): Map<string, Map<string, any[]>> {
  const grouped = new Map<string, Map<string, any[]>>();

  console.log(`groupEntriesByDate: Starting with ${entries.length} entries`);
  if (entries.length > 0) {
    console.log("Sample entry dates:", entries.slice(0, 3).map(e => e.date));
  }

  // Get last 7 days starting from today in NY timezone
  const today = nowInNY();
  today.setHours(0, 0, 0, 0);

  const validDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    grouped.set(dateStr, new Map());
    validDates.push(dateStr);
  }

  console.log("Valid date keys:", validDates);

  // Group entries by date and bucket
  let matchedCount = 0;
  const unmatchedDates = new Set();
  for (const entry of entries) {
    const dateMap = grouped.get(entry.date);
    if (!dateMap) {
      unmatchedDates.add(entry.date);
      continue;
    }

    matchedCount++;
    if (!dateMap.has(entry.bucket)) {
      dateMap.set(entry.bucket, []);
    }
    dateMap.get(entry.bucket)!.push(entry);
  }

  console.log(`groupEntriesByDate: Matched ${matchedCount} out of ${entries.length} entries`);
  if (unmatchedDates.size > 0) {
    console.log("Unmatched entry dates:", Array.from(unmatchedDates));
  }
  return grouped;
}

function renderEntries(groupedByDate: Map<string, Map<string, any[]>>): string {
  if (groupedByDate.size === 0) {
    return '<div class="empty-state"><p>No entries found. Try running the ingest or adding entries manually.</p></div>';
  }

  const days = Array.from(groupedByDate.keys()).sort().reverse(); // Most recent first

  return days.map(date => {
    const dayName = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/New_York'
    });

    const buckets = groupedByDate.get(date)!;
    const bucketOrder = ['music', 'video', 'article', 'tweet', 'other'];
    const bucketsWithEntries = bucketOrder.filter(bucket => buckets.has(bucket) && buckets.get(bucket)!.length > 0);

    if (bucketsWithEntries.length === 0) return '';

    return `
      <div class="day-section">
        <div class="day-header">${dayName}</div>
        ${bucketsWithEntries.map(bucket => {
          const entries = buckets.get(bucket)!;
          return `
            <div class="bucket-section">
              <div class="bucket-header">${bucket} (${entries.length})</div>
              ${entries.map(entry => `
                <div class="entry">
                  <div class="entry-content">
                    <h3 class="entry-title">
                      ${entry.url ? `<a href="${escapeHtml(entry.url)}" target="_blank">${escapeHtml(entry.title)}</a>` : escapeHtml(entry.title)}
                    </h3>
                    <div class="entry-meta">${escapeHtml(entry.source)} • ${entry.date}</div>
                    <div class="entry-notes">
                      <textarea data-id="${escapeHtml(entry.id)}" placeholder="Add notes...">${escapeHtml(entry.notes || '')}</textarea>
                    </div>
                  </div>
                  <div class="entry-controls">
                    <label class="toggle">
                      <input type="checkbox" class="public-toggle" data-id="${escapeHtml(entry.id)}" ${entry.is_public ? 'checked' : ''}>
                      <span class="slider"></span>
                    </label>
                    <span class="toggle-label">Public</span>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
