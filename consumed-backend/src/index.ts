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
        const row = { id, date, bucket: bucket as any, title, url: urlf, source: "manual", notes, is_public: false, created_at: nowIso, updated_at: nowIso };
        const sheets = new SheetsClient(env);
        await sheets.appendRows([row]);
        return new Response("Entry added successfully", { status: 200 });
      } catch (err) {
        console.error("Error adding entry:", err);
        return new Response("Failed to add entry", { status: 500 });
      }
    }

    if (path.startsWith("/api/entries/") && method === "POST") {
      try {
        const id = path.split("/").pop()!;
        if (!id) {
          return new Response("Entry ID is required", { status: 400 });
        }

        const form = await req.formData();
        const notes = form.has("notes") ? String(form.get("notes") || "").trim() : undefined;
        const isPublic = form.has("is_public") ? String(form.get("is_public")) : undefined;

        const sheets = new SheetsClient(env);
        await sheets.updateRow(id, {
          notes,
          is_public: typeof isPublic === "string" ? isPublic === "true" : undefined
        });
        return new Response("Entry updated successfully", { status: 200 });
      } catch (err) {
        console.error("Error updating entry:", err);
        return new Response("Failed to update entry", { status: 500 });
      }
    }

    if (path.startsWith("/publish/week") && method === "POST") {
      try {
        const week = url.searchParams.get("week");
        const ww = week ?? formatWeekPath(nowInNY());
        const [y, w] = ww.split("-");
        const year = Number(y);
        const wk = Number(w);

        if (!year || !wk || year < 2020 || year > 2030 || wk < 1 || wk > 53) {
          return new Response("Invalid week format. Expected YYYY-WW", { status: 400 });
        }

        const sheets = new SheetsClient(env);
        const rowsAll = await sheets.listRowsForIsoWeek(year, wk);
        const rows = rowsAll.filter(r => r.is_public);

        if (rows.length === 0) {
          return new Response(`No public entries found for week ${ww}`, { status: 404 });
        }

        const { publishWeek } = await import("./publish/index");
        const res = await publishWeek(env as any, year, wk, rows as any);
        if (!res.ok) return res;
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
    entries = await sheets.listRowsSince(7);
  } catch (err) {
    console.error("Failed to fetch entries:", err);
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

  <script>
    // Auto-save notes on blur
    document.addEventListener('blur', async (e) => {
      if (e.target.matches('.entry-notes textarea')) {
        const id = e.target.dataset.id;
        const notes = e.target.value;
        try {
          const form = new FormData();
          form.append('notes', notes);
          await fetch('/api/entries/' + id, {
            method: 'POST',
            body: form
          });
        } catch (err) {
          console.error('Failed to save notes:', err);
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
            window.location.reload();
          }, 1000);
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
  </script>
</body></html>`;

  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

function groupEntriesByDate(entries: any[]): Map<string, Map<string, any[]>> {
  const grouped = new Map<string, Map<string, any[]>>();

  // Get last 7 days starting from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    grouped.set(dateStr, new Map());
  }

  // Group entries by date and bucket
  for (const entry of entries) {
    const dateMap = grouped.get(entry.date);
    if (!dateMap) continue;

    if (!dateMap.has(entry.bucket)) {
      dateMap.set(entry.bucket, []);
    }
    dateMap.get(entry.bucket)!.push(entry);
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
