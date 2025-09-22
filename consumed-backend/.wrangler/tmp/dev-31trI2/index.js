var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// wrangler-modules-watch:wrangler:modules-watch
var init_wrangler_modules_watch = __esm({
  "wrangler-modules-watch:wrangler:modules-watch"() {
    init_modules_watch_stub();
  }
});

// ../../../../AppData/Roaming/npm/node_modules/wrangler/templates/modules-watch-stub.js
var init_modules_watch_stub = __esm({
  "../../../../AppData/Roaming/npm/node_modules/wrangler/templates/modules-watch-stub.js"() {
    init_wrangler_modules_watch();
  }
});

// src/utils/base64url.ts
function base64UrlEncode(buf) {
  let binary = "";
  if (typeof buf === "string") {
    binary = btoa(unescape(encodeURIComponent(buf)));
  } else {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
    binary = btoa(s);
  }
  return binary.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function base64ToArrayBuffer(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
function pemToPkcs8(pem) {
  const clean = pem.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s+/g, "");
  return base64ToArrayBuffer(clean);
}
var init_base64url = __esm({
  "src/utils/base64url.ts"() {
    "use strict";
    init_modules_watch_stub();
    __name(base64UrlEncode, "base64UrlEncode");
    __name(base64ToArrayBuffer, "base64ToArrayBuffer");
    __name(pemToPkcs8, "pemToPkcs8");
  }
});

// src/utils/googleAuth.ts
var googleAuth_exports = {};
__export(googleAuth_exports, {
  getGoogleAccessToken: () => getGoogleAccessToken
});
async function getGoogleAccessToken(sa, scope) {
  const iat = Math.floor(Date.now() / 1e3);
  const exp = iat + 3600;
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat
  };
  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const claimB64 = base64UrlEncode(JSON.stringify(claim));
  const message = `${headerB64}.${claimB64}`;
  const pkcs8 = pemToPkcs8(sa.private_key);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, key, enc.encode(message));
  const jwt = `${message}.${base64UrlEncode(sig)}`;
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token error: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json.access_token;
}
var init_googleAuth = __esm({
  "src/utils/googleAuth.ts"() {
    "use strict";
    init_modules_watch_stub();
    init_base64url();
    __name(getGoogleAccessToken, "getGoogleAccessToken");
  }
});

// src/publish/html.ts
function groupByDayAndBucket(entries) {
  const out = {};
  for (const e of entries) {
    const day = e.date;
    if (!out[day]) out[day] = { music: [], video: [], article: [], tweet: [], other: [] };
    const b = e.bucket ?? "other";
    if (!out[day][b]) out[day][b] = [];
    out[day][b].push(e);
  }
  return out;
}
function renderDigestHTML(d) {
  console.log(`renderDigestHTML: Rendering week ${d.year}-${d.week} with ${d.entries.length} entries`);
  const weekPath = `${String(d.year)}-${String(d.week).padStart(2, "0")}`;
  const grouped = groupByDayAndBucket(d.entries);
  const days = weekDaysET(d);
  console.log(`renderDigestHTML: Week days: ${JSON.stringify(days)}`);
  console.log(`renderDigestHTML: Grouped days: ${JSON.stringify(Object.keys(grouped))}`);
  const esc = /* @__PURE__ */ __name((s) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"), "esc");
  let body = "";
  for (const day of days) {
    const buckets = grouped[day];
    const bucketEntryCount = buckets ? Object.values(buckets).reduce((sum, arr) => sum + arr.length, 0) : 0;
    console.log(`renderDigestHTML: Day ${day} has ${bucketEntryCount} entries`);
    body += `<section class="day"><h2>${day}</h2>`;
    if (!buckets) {
      body += `<p class="empty">No entries</p>`;
    } else {
      for (const bucket of ["music", "video", "article", "tweet", "other"]) {
        const list = buckets[bucket] || [];
        if (!list.length) continue;
        body += `<h3 class="bucket">${bucketLabel(bucket)}</h3><ul>`;
        for (const e of list) {
          const title = esc(e.title || e.url || "(untitled)");
          const url = esc(e.url || "#");
          const notes = esc(e.notes || "");
          body += `<li><a href="${url}" rel="noopener noreferrer">${title}</a>${notes ? ` \u2014 ${notes}` : ""}</li>`;
        }
        body += `</ul>`;
      }
    }
    body += `</section>`;
  }
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Media Consumed \u2014 Week ${weekPath}</title>
  <meta name="description" content="Weekly media consumed by Lawrence, grouped by day and bucket.">
  <link rel="stylesheet" href="/consumed/style.css">
</head>
<body>
  <header class="site-header">
    <h1>Media Consumed \u2014 Week ${weekPath}</h1>
  </header>
  <main class="container">
    ${body}
  </main>
</body>
</html>`;
}
function bucketLabel(b) {
  switch (b) {
    case "music":
      return "Music";
    case "video":
      return "Video";
    case "article":
      return "Articles";
    case "tweet":
      return "Tweets";
    default:
      return "Other";
  }
}
function weekDaysET(d) {
  const monday = isoWeekToDateET(d.year, d.week);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday.getTime());
    dt.setDate(dt.getDate() + i);
    out.push(dt.toLocaleDateString("en-CA", { timeZone: "America/New_York" }));
  }
  return out;
}
function isoWeekToDateET(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const mondayUTC = new Date(jan4);
  mondayUTC.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
  const etString = mondayUTC.toLocaleString("en-US", { timeZone: "America/New_York" });
  return new Date(etString);
}
var init_html = __esm({
  "src/publish/html.ts"() {
    "use strict";
    init_modules_watch_stub();
    __name(groupByDayAndBucket, "groupByDayAndBucket");
    __name(renderDigestHTML, "renderDigestHTML");
    __name(bucketLabel, "bucketLabel");
    __name(weekDaysET, "weekDaysET");
    __name(isoWeekToDateET, "isoWeekToDateET");
  }
});

// src/publish/github.ts
async function commitFilesToGitHub(env, message, files) {
  if (!env.GITHUB_TOKEN) {
    return new Response("GITHUB_TOKEN not configured; cannot push to repo", { status: 501 });
  }
  const [owner, repo] = env.PUBLIC_REPO.split("/");
  const branch = env.PUBLIC_REPO_BRANCH || "main";
  const api = "https://api.github.com";
  const auth = { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "Content-Type": "application/json", "User-Agent": "consumed-backend" };
  const results = [];
  for (const file of files) {
    try {
      let existingSha;
      const getRes = await fetch(`${api}/repos/${owner}/${repo}/contents/${file.path}?ref=${branch}`, { headers: auth });
      if (getRes.ok) {
        const existing = await getRes.json();
        existingSha = existing.sha;
      } else if (getRes.status !== 404) {
        results.push(getRes);
        continue;
      }
      const content = btoa(unescape(encodeURIComponent(file.content)));
      const putBody = {
        message: `${message} - ${file.path}`,
        content,
        branch
      };
      if (existingSha) {
        putBody.sha = existingSha;
      }
      const putRes = await fetch(`${api}/repos/${owner}/${repo}/contents/${file.path}`, {
        method: "PUT",
        headers: auth,
        body: JSON.stringify(putBody)
      });
      results.push(putRes);
      if (!putRes.ok) {
        console.error(`Failed to commit ${file.path}:`, await putRes.text());
      }
    } catch (err) {
      console.error(`Error committing ${file.path}:`, err);
      results.push(new Response(`Error: ${err}`, { status: 500 }));
    }
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    return new Response(`${failed.length} of ${files.length} file commits failed`, { status: 207 });
  }
  try {
    await triggerCloudflareDeployment(env);
  } catch (err) {
    console.warn("Failed to trigger Cloudflare deployment:", err);
  }
  return new Response(`Successfully committed ${files.length} files`, { status: 200 });
}
async function triggerCloudflareDeployment(env) {
  if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID || !env.CF_PAGES_PROJECT_NAME) {
    console.log("Direct upload not configured - GitHub commit only");
    return;
  }
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/pages/projects/${env.CF_PAGES_PROJECT_NAME}/deployments`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.CF_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "source": {
            "type": "github",
            "config": {
              "production_branch": "master",
              "build_command": "npm run build",
              "destination_dir": "dist"
            }
          }
        })
      }
    );
    if (response.ok) {
      const result = await response.json();
      console.log("Successfully triggered Cloudflare Pages deployment:", result.result?.id);
    } else {
      console.error("Direct deployment failed:", response.status, await response.text());
    }
  } catch (err) {
    console.error("Error triggering direct deployment:", err);
  }
}
var init_github = __esm({
  "src/publish/github.ts"() {
    "use strict";
    init_modules_watch_stub();
    __name(commitFilesToGitHub, "commitFilesToGitHub");
    __name(triggerCloudflareDeployment, "triggerCloudflareDeployment");
  }
});

// src/publish/index.ts
var publish_exports = {};
__export(publish_exports, {
  publishWeek: () => publishWeek
});
async function publishWeek(env, year, week, rows) {
  const html = renderDigestHTML({ year, week, entries: rows });
  const ww = String(week).padStart(2, "0");
  const weeks = await listWeeksFromRepo(env);
  if (!weeks.includes(`${year}-${ww}`)) weeks.push(`${year}-${ww}`);
  const weeksSorted = weeks.filter((x) => /^\d{4}-\d{2}$/.test(x)).sort((a, b) => b.localeCompare(a));
  const indexHtml = renderIndexHTML(weeksSorted);
  const files = [
    { path: `public/consumed/${year}-${ww}/index.html`, content: html },
    { path: `public/consumed/index.html`, content: indexHtml }
  ];
  const res = await commitFilesToGitHub(env, `Publish consumed week ${year}-${ww}`, files);
  return res;
}
async function listWeeksFromRepo(env) {
  const token = env.GITHUB_TOKEN;
  if (!token) return [];
  const [owner, repo] = env.PUBLIC_REPO.split("/");
  const branch = env.PUBLIC_REPO_BRANCH || "main";
  const api = `https://api.github.com/repos/${owner}/${repo}/contents/public/consumed?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(api, { headers: { Authorization: `Bearer ${token}`, "User-Agent": "consumed-backend" } });
  if (!res.ok) return [];
  const json = await res.json();
  const dirs = json.filter((x) => x.type === "dir").map((x) => x.name);
  return dirs;
}
function renderIndexHTML(weeks) {
  const items = weeks.map((w) => `<li><a href="/consumed/${w}/">Week ${w}</a></li>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Media Consumed \u2014 Index</title>
  <link rel="stylesheet" href="/consumed/style.css">
</head>
<body>
  <header class="site-header"><h1>Media Consumed \u2014 Index</h1></header>
  <main class="container">
    <section class="day">
      <h2>Weeks</h2>
      <ul>${items}</ul>
    </section>
  </main>
</body>
</html>`;
}
var init_publish = __esm({
  "src/publish/index.ts"() {
    "use strict";
    init_modules_watch_stub();
    init_html();
    init_github();
    __name(publishWeek, "publishWeek");
    __name(listWeeksFromRepo, "listWeeksFromRepo");
    __name(renderIndexHTML, "renderIndexHTML");
  }
});

// src/utils/hash.ts
var hash_exports = {};
__export(hash_exports, {
  sha256Hex: () => sha256Hex
});
async function sha256Hex(input) {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}
var init_hash = __esm({
  "src/utils/hash.ts"() {
    "use strict";
    init_modules_watch_stub();
    __name(sha256Hex, "sha256Hex");
  }
});

// src/ingest/lastfm.ts
var lastfm_exports = {};
__export(lastfm_exports, {
  ingestLastFm: () => ingestLastFm
});
async function ingestLastFm(env) {
  try {
    const api = "https://ws.audioscrobbler.com/2.0/";
    const url = `${api}?method=user.getrecenttracks&user=${encodeURIComponent(env.LASTFM_USER)}&api_key=${encodeURIComponent(env.LASTFM_API_KEY)}&format=json&limit=200`;
    console.log("Last.fm API URL:", url);
    const res = await fetch(url);
    console.log("Last.fm API response status:", res.status);
    if (!res.ok) {
      console.log("Last.fm API failed:", res.statusText);
      return [];
    }
    const json = await res.json();
    console.log("Last.fm API response keys:", Object.keys(json));
    const tracks = json?.recenttracks?.track || [];
    console.log("Last.fm tracks found:", tracks.length);
    if (!Array.isArray(tracks)) {
      console.log("Tracks is not an array:", tracks);
      return [];
    }
    const out = [];
    for (const t of tracks) {
      console.log("Processing track object:", JSON.stringify(t, null, 2));
      const date = t?.date?.uts ? Number(t.date.uts) : null;
      console.log(`Track: ${t?.artist?.["#text"]} - ${t?.name}, date:`, date);
      if (!date) {
        console.log("Skipping - no date (now playing)");
        continue;
      }
      const artist = t?.artist?.["#text"] || "";
      const name = t?.name || "";
      const title = `${artist} \u2014 ${name}`.trim();
      const url2 = t?.url || "";
      const etDate = new Date(date * 1e3).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
      console.log("Creating hash for:", `${artist}|${name}|${date}`);
      const id = await sha256Hex(`${artist}|${name}|${date}`);
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      console.log("Adding track to output:", title);
      out.push({
        id,
        date: etDate,
        bucket: "music",
        title,
        url: url2,
        source: "lastfm",
        notes: "",
        is_public: true,
        created_at: nowIso,
        updated_at: nowIso
      });
    }
    console.log("Final output rows:", out.length);
    return out;
  } catch (error) {
    console.error("Error in ingestLastFm:", error);
    return [];
  }
}
var init_lastfm = __esm({
  "src/ingest/lastfm.ts"() {
    "use strict";
    init_modules_watch_stub();
    init_hash();
    __name(ingestLastFm, "ingestLastFm");
  }
});

// src/ingest/youtube.ts
var youtube_exports = {};
__export(youtube_exports, {
  ingestYouTubeLikes: () => ingestYouTubeLikes
});
async function ingestYouTubeLikes(env) {
  const token = await getYouTubeAccessToken(env);
  if (!token) return [];
  let likesId = await env.RUN_STATUS.get("yt:likes_playlist_id");
  if (!likesId) {
    likesId = await fetchLikesPlaylistId(token);
    if (likesId) await env.RUN_STATUS.put("yt:likes_playlist_id", likesId);
  }
  if (!likesId) return [];
  const since = await env.RUN_STATUS.get("yt:last_liked_at");
  const items = await fetchAllLikedItems(token, likesId);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  let maxLiked = since || "";
  const out = [];
  for (const it of items) {
    const videoId = it.snippet?.resourceId?.videoId;
    const likedAt = it.snippet?.publishedAt;
    const title = it.snippet?.title || "(untitled)";
    if (!videoId || !likedAt) continue;
    if (since && likedAt <= since) continue;
    const id = `youtube:${videoId}|${likedAt}`;
    const etDate = new Date(likedAt).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    out.push({
      id,
      date: etDate,
      bucket: "video",
      title,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      source: "youtube",
      notes: "",
      is_public: true,
      created_at: nowIso,
      updated_at: nowIso
    });
    if (likedAt > maxLiked) maxLiked = likedAt;
  }
  if (out.length && maxLiked) await env.RUN_STATUS.put("yt:last_liked_at", maxLiked);
  return out;
}
async function getYouTubeAccessToken(env) {
  const refreshToken = await env.RUN_STATUS.get("yt:refresh_token");
  if (!refreshToken) return null;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: env.YOUTUBE_CLIENT_ID,
    client_secret: env.YOUTUBE_CLIENT_SECRET
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.access_token;
}
async function fetchLikesPlaylistId(token) {
  const res = await fetch("https://www.googleapis.com/youtube/v3/channels?mine=true&part=contentDetails", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  const json = await res.json();
  const likes = json?.items?.[0]?.contentDetails?.relatedPlaylists?.likes;
  return likes || null;
}
async function fetchAllLikedItems(token, playlistId) {
  const out = [];
  let pageToken;
  for (let i = 0; i < 10; i++) {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) break;
    const json = await res.json();
    out.push(...json.items || []);
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}
var init_youtube = __esm({
  "src/ingest/youtube.ts"() {
    "use strict";
    init_modules_watch_stub();
    __name(ingestYouTubeLikes, "ingestYouTubeLikes");
    __name(getYouTubeAccessToken, "getYouTubeAccessToken");
    __name(fetchLikesPlaylistId, "fetchLikesPlaylistId");
    __name(fetchAllLikedItems, "fetchAllLikedItems");
  }
});

// .wrangler/tmp/bundle-buFmFx/middleware-loader.entry.ts
init_modules_watch_stub();

// .wrangler/tmp/bundle-buFmFx/middleware-insertion-facade.js
init_modules_watch_stub();

// src/index.ts
init_modules_watch_stub();

// src/utils/cookie.ts
init_modules_watch_stub();
function setCookie(name, value, opts = {}) {
  const parts = [
    `${name}=${value}`,
    `Path=${opts.path ?? "/"}`,
    opts.httpOnly ? "HttpOnly" : void 0,
    opts.sameSite ? `SameSite=${opts.sameSite}` : "SameSite=Lax",
    opts.secure ? "Secure" : void 0,
    typeof opts.maxAge === "number" ? `Max-Age=${opts.maxAge}` : void 0
  ].filter(Boolean);
  return parts.join("; ");
}
__name(setCookie, "setCookie");
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  const pairs = header.split(";");
  for (const p of pairs) {
    const [k, ...rest] = p.split("=");
    const key = k.trim();
    const val = rest.join("=").trim();
    if (key) out[key] = decodeURIComponent(val ?? "");
  }
  return out;
}
__name(parseCookies, "parseCookies");
async function hmac(data, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}
__name(hmac, "hmac");
async function makeSessionCookie(payload, secret) {
  const json = JSON.stringify(payload);
  const body = btoa(unescape(encodeURIComponent(json)));
  const sig = await hmac(body, secret);
  return `${body}.${sig}`;
}
__name(makeSessionCookie, "makeSessionCookie");
async function verifySessionCookie(cookie, secret) {
  const [body, sig] = cookie.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(body, secret);
  if (expected !== sig) return null;
  try {
    const json = decodeURIComponent(escape(atob(body)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
__name(verifySessionCookie, "verifySessionCookie");

// src/utils/time.ts
init_modules_watch_stub();
function nowInNY() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const parts = Object.fromEntries(
    // @ts-ignore
    fmt.formatToParts(/* @__PURE__ */ new Date()).map((p) => [p.type, p.value])
  );
  const str = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}-05:00`;
  const ny = new Date((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/New_York" }));
  return ny;
}
__name(nowInNY, "nowInNY");
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 864e5 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}
__name(isoWeek, "isoWeek");
function formatWeekPath(date) {
  const { year, week } = isoWeek(date);
  const ww = String(week).padStart(2, "0");
  return `${year}-${ww}`;
}
__name(formatWeekPath, "formatWeekPath");

// src/sheets.ts
init_modules_watch_stub();
var SheetsClient = class {
  constructor(env) {
    this.env = env;
  }
  static {
    __name(this, "SheetsClient");
  }
  async token() {
    const sa = JSON.parse(this.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const scope = "https://www.googleapis.com/auth/spreadsheets";
    const { getGoogleAccessToken: getGoogleAccessToken2 } = await Promise.resolve().then(() => (init_googleAuth(), googleAuth_exports));
    return getGoogleAccessToken2({ client_email: sa.client_email, private_key: sa.private_key }, scope);
  }
  async ensureHeader() {
    const values = await this.valuesGet("media_log!1:1");
    if (!values || values.length === 0) {
      await this.valuesAppend([["id", "date", "bucket", "title", "url", "source", "notes", "is_public", "created_at", "updated_at"]]);
    }
  }
  async appendRows(rows) {
    await this.ensureHeader();
    const values = rows.map((r) => [
      r.id,
      r.date,
      r.bucket,
      r.title,
      r.url,
      r.source,
      r.notes ?? "",
      r.is_public ? "TRUE" : "FALSE",
      r.created_at,
      r.updated_at
    ]);
    await this.valuesAppend(values);
  }
  async listRowsSince(days) {
    console.log(`listRowsSince: Fetching last ${days} days of data`);
    const all = await this.allRows();
    console.log(`listRowsSince: Retrieved ${all.length} total rows from sheets`);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
    const cutoffStr = cutoff.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    console.log(`listRowsSince: Cutoff date is ${cutoffStr}`);
    const filtered = all.filter((r) => r.date >= cutoffStr);
    console.log(`listRowsSince: After date filtering, ${filtered.length} rows remain`);
    console.log(`listRowsSince: Date comparison - cutoff: ${cutoffStr}, sample entries:`, all.slice(0, 3).map((r) => ({ date: r.date, title: r.title?.substring(0, 20) })));
    if (filtered.length > 0) {
      console.log(`listRowsSince: Sample filtered entry:`, {
        id: filtered[0].id?.substring(0, 20),
        date: filtered[0].date,
        title: filtered[0].title?.substring(0, 30),
        is_public: filtered[0].is_public,
        bucket: filtered[0].bucket
      });
    }
    return filtered;
  }
  async listRowsForIsoWeek(year, week) {
    console.log(`listRowsForIsoWeek: Starting for week ${year}-${week}`);
    const all = await this.allRows();
    console.log(`listRowsForIsoWeek: Retrieved ${all.length} total rows`);
    const days = this.weekDays(year, week);
    const set = new Set(days);
    const filtered = all.filter((r) => set.has(r.date));
    console.log(`listRowsForIsoWeek: Found ${filtered.length} entries for week ${year}-${week}`);
    if (filtered.length > 0) {
      console.log(`listRowsForIsoWeek: Sample entries:`, filtered.slice(0, 3).map((r) => ({
        date: r.date,
        title: r.title?.substring(0, 30),
        is_public: r.is_public
      })));
      const publicCount = filtered.filter((r) => r.is_public).length;
      console.log(`listRowsForIsoWeek: ${publicCount} are public, ${filtered.length - publicCount} are private`);
    }
    return filtered;
  }
  async updateRow(id, patch) {
    console.log(`updateRow: Starting update for id ${id}, patch:`, patch);
    const sheet = await this.valuesGet("media_log!A:Z");
    if (!sheet || sheet.length === 0) {
      console.log("updateRow: No sheet data found");
      return;
    }
    console.log(`updateRow: Retrieved sheet with ${sheet.length} rows`);
    const header = sheet[0];
    let idIdx = header.indexOf("id");
    if (idIdx < 0) idIdx = 0;
    const notesIdx = header.indexOf("notes");
    const pubIdx = header.indexOf("is_public");
    const updatedIdx = header.indexOf("updated_at");
    console.log(`updateRow: Column indices - id: ${idIdx}, notes: ${notesIdx}, is_public: ${pubIdx}, updated_at: ${updatedIdx}`);
    for (let i = 1; i < sheet.length; i++) {
      const row = sheet[i];
      if (row[idIdx] === id) {
        console.log(`updateRow: Found matching row at index ${i}, current values:`, {
          id: row[idIdx],
          notes: row[notesIdx],
          is_public: row[pubIdx]
        });
        if (typeof patch.notes !== "undefined" && notesIdx >= 0) {
          row[notesIdx] = patch.notes ?? "";
          console.log(`updateRow: Updated notes to: "${patch.notes}"`);
        }
        if (typeof patch.is_public !== "undefined" && pubIdx >= 0) {
          row[pubIdx] = patch.is_public ? "TRUE" : "FALSE";
          console.log(`updateRow: Updated is_public to: ${patch.is_public ? "TRUE" : "FALSE"}`);
        }
        if (updatedIdx >= 0) {
          row[updatedIdx] = (/* @__PURE__ */ new Date()).toISOString();
        }
        const range = `media_log!A${i + 1}:Z${i + 1}`;
        console.log(`updateRow: Updating range ${range} with row:`, row);
        await this.valuesUpdate(range, [row]);
        console.log(`updateRow: Successfully updated row for id ${id}`);
        return;
      }
    }
    console.log(`updateRow: No row found with id ${id}`);
  }
  async allRows() {
    console.log("allRows: Starting to fetch recent rows (optimized)");
    await this.ensureHeader();
    console.log("allRows: Header ensured, fetching all data with header");
    const values = await this.valuesGet("media_log!A:Z");
    console.log(`allRows: Raw values response - ${values ? values.length : 0} rows`);
    if (!values || values.length <= 1) {
      console.log("allRows: No data found or only header row");
      return [];
    }
    const header = values[0];
    console.log("allRows: Header columns:", header);
    console.log("allRows: Header length:", header.length);
    console.log("allRows: First few header values:", header.slice(0, 10));
    console.log("allRows: Sample data row:", values[1]?.slice(0, 10));
    if (!header || header.length === 0 || header[0] !== "id") {
      console.log("allRows: Header seems corrupted, using expected header");
      console.log("allRows: First header value is:", header[0]);
      const expectedHeader = ["id", "date", "bucket", "title", "url", "source", "notes", "is_public", "created_at", "updated_at"];
      console.log("allRows: Using fallback header:", expectedHeader);
      return this.processRowsWithHeader(expectedHeader, values);
    }
    const rows = values.slice(1).map((v) => this.mapRow(header, v));
    const filteredRows = rows.filter(Boolean);
    console.log(`allRows: Mapped and filtered to ${filteredRows.length} valid rows`);
    return filteredRows;
  }
  processRowsWithHeader(header, values) {
    console.log(`processRowsWithHeader: Processing ${values.length} values with fallback header`);
    const dataRows = values.slice(1);
    const rows = dataRows.map((v) => this.mapRow(header, v));
    const filteredRows = rows.filter(Boolean);
    console.log(`processRowsWithHeader: Mapped and filtered to ${filteredRows.length} valid rows`);
    return filteredRows;
  }
  mapRow(header, v) {
    const idx = /* @__PURE__ */ __name((name) => header.indexOf(name), "idx");
    const pick = /* @__PURE__ */ __name((name) => {
      const i = idx(name);
      return i >= 0 ? v[i] ?? "" : "";
    }, "pick");
    const idValue = pick("id");
    if (!idValue) {
      console.log(`mapRow: Rejecting row - no id value`);
      return null;
    }
    return {
      id: idValue,
      date: pick("date"),
      bucket: pick("bucket") || "other",
      title: pick("title"),
      url: pick("url"),
      source: pick("source"),
      notes: pick("notes"),
      is_public: pick("is_public").toUpperCase() === "TRUE",
      created_at: pick("created_at"),
      updated_at: pick("updated_at")
    };
  }
  weekDays(year, week) {
    console.log(`weekDays: Calculating dates for ISO week ${year}-${week}`);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const day = jan4.getUTCDay() || 7;
    const mondayUTC = new Date(jan4);
    mondayUTC.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
    const out = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(mondayUTC.getTime());
      dt.setUTCDate(mondayUTC.getUTCDate() + i);
      const s = dt.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
      out.push(s);
    }
    console.log(`weekDays: Week ${year}-${week} includes dates:`, out);
    return out;
  }
  async valuesGet(range) {
    console.log(`valuesGet: Starting API call for range "${range}"`);
    const token = await this.token();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.env.SHEETS_ID}/values/${encodeURIComponent(range)}`;
    console.log(`valuesGet: API URL: ${url}`);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    console.log(`valuesGet: Response status: ${res.status} ${res.statusText}`);
    if (!res.ok) {
      console.log(`valuesGet: API error - status ${res.status}`);
      const errorText = await res.text();
      console.log(`valuesGet: Error response body: ${errorText}`);
      return [];
    }
    const json = await res.json();
    console.log(`valuesGet: Response structure:`, {
      hasValues: !!json.values,
      valuesLength: json.values?.length || 0,
      firstRowLength: json.values?.[0]?.length || 0,
      responseKeys: Object.keys(json)
    });
    const result = json.values ?? [];
    console.log(`valuesGet: Returning ${result.length} rows`);
    return result;
  }
  async valuesAppend(values) {
    const token = await this.token();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.env.SHEETS_ID}/values/${encodeURIComponent("media_log!A:Z")}:append?valueInputOption=RAW`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ values })
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Sheets append failed: ${res.status} ${t}`);
    }
  }
  async valuesUpdate(range, values) {
    const token = await this.token();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.env.SHEETS_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ values })
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Sheets update failed: ${res.status} ${t}`);
    }
  }
};

// src/index.ts
init_publish();
var src_default = {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method.toUpperCase();
    if (path === "/" || path === "/health") {
      return new Response("ok", { status: 200 });
    }
    if (path === "/test-publish" && method === "POST") {
      const url2 = new URL(req.url);
      const week = url2.searchParams.get("week");
      if (!week || !/^\d{4}-\d{2}$/.test(week)) {
        return new Response("Invalid week format", { status: 400 });
      }
      const [year, weekNum] = week.split("-").map(Number);
      try {
        const sheets = new SheetsClient(env);
        const rows = await sheets.listRowsForIsoWeek(year, weekNum);
        const publicRows = rows.filter((r) => r.is_public);
        console.log(`Publishing ${publicRows.length} entries for week ${week}`);
        const result = await publishWeek(env, year, weekNum, publicRows);
        console.log(`Successfully published week ${week} with ${publicRows.length} entries`);
        return new Response(`Published week ${week} with ${publicRows.length} entries`);
      } catch (error) {
        console.error("Publish error:", error);
        return new Response(`Error: ${error}`, { status: 500 });
      }
    }
    const isAuthed = await authenticate(req, env);
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
        grant_type: "authorization_code"
      });
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body
      });
      const payload = await tokenRes.json();
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
      const { ingestLastFm: ingestLastFm2 } = await Promise.resolve().then(() => (init_lastfm(), lastfm_exports));
      const { ingestYouTubeLikes: ingestYouTubeLikes2 } = await Promise.resolve().then(() => (init_youtube(), youtube_exports));
      const sheets = new SheetsClient(env);
      const [lfm, yt] = await Promise.allSettled([ingestLastFm2(env), ingestYouTubeLikes2(env)]);
      const rows = [];
      if (lfm.status === "fulfilled") rows.push(...lfm.value);
      if (yt.status === "fulfilled") rows.push(...yt.value);
      if (rows.length) await sheets.appendRows(rows);
      return new Response(`Ingested ${rows.length} rows`, { status: 200 });
    }
    if (path === "/api/entries" && method === "POST") {
      try {
        const form = await req.formData();
        const bucket = String(form.get("bucket") || "other");
        const title = String(form.get("title") || "").trim();
        const urlf = String(form.get("url") || "").trim();
        const notes = String(form.get("notes") || "").trim();
        const date = String(form.get("date") || (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA", { timeZone: "America/New_York" }));
        if (!title) {
          return new Response("Title is required", { status: 400 });
        }
        if (!["music", "video", "article", "tweet", "other"].includes(bucket)) {
          return new Response("Invalid bucket type", { status: 400 });
        }
        if (urlf && !isValidUrl(urlf)) {
          return new Response("Invalid URL format", { status: 400 });
        }
        const { sha256Hex: sha256Hex2 } = await Promise.resolve().then(() => (init_hash(), hash_exports));
        const id = await sha256Hex2(`manual|${title}|${urlf}|${date}|${Date.now()}`);
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        const row = { id, date, bucket, title, url: urlf, source: "manual", notes, is_public: true, created_at: nowIso, updated_at: nowIso };
        const sheets = new SheetsClient(env);
        await sheets.appendRows([row]);
        return new Response("Entry added successfully", { status: 200 });
      } catch (err) {
        console.error("Error adding entry:", err);
        return new Response("Failed to add entry", { status: 500 });
      }
    }
    if (path.startsWith("/api/entries/") && method === "POST") {
      const rawId = path.split("/").pop();
      let form = null;
      try {
        if (!rawId) {
          return new Response("Entry ID is required", { status: 400 });
        }
        const id = decodeURIComponent(rawId);
        console.log(`Raw ID: ${rawId}, Decoded ID: ${id}`);
        form = await req.formData();
        const notes = form.has("notes") ? String(form.get("notes") || "").trim() : void 0;
        const isPublic = form.has("is_public") ? String(form.get("is_public")) : void 0;
        console.log(`Updating entry ${id} with notes: "${notes?.substring(0, 50)}..." is_public: ${isPublic}`);
        const sheets = new SheetsClient(env);
        await sheets.updateRow(id, {
          notes,
          is_public: typeof isPublic === "string" ? isPublic === "true" : void 0
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
        const rows = rowsAll.filter((r) => r.is_public);
        console.log(`Found ${rows.length} public entries out of ${rowsAll.length} total for week ${ww}`);
        if (rows.length === 0) {
          console.log(`No public entries found for week ${ww} - returning 404`);
          return new Response(`No public entries found for week ${ww}`, { status: 404 });
        }
        console.log(`Publishing ${rows.length} entries for week ${ww}`);
        const { publishWeek: publishWeek2 } = await Promise.resolve().then(() => (init_publish(), publish_exports));
        const res = await publishWeek2(env, year, wk, rows);
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
  async scheduled(event, env, ctx) {
    const ny = nowInNY();
    const yyyyMmDd = ny.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const hour = ny.getHours();
    if (hour !== 23) return;
    const key = `last-run-${yyyyMmDd}`;
    const already = await env.RUN_STATUS.get(key);
    if (already) return;
    const { ingestLastFm: ingestLastFm2 } = await Promise.resolve().then(() => (init_lastfm(), lastfm_exports));
    const { ingestYouTubeLikes: ingestYouTubeLikes2 } = await Promise.resolve().then(() => (init_youtube(), youtube_exports));
    const sheets = new SheetsClient(env);
    const [lfm, yt] = await Promise.allSettled([ingestLastFm2(env), ingestYouTubeLikes2(env)]);
    const rows = [];
    if (lfm.status === "fulfilled") rows.push(...lfm.value);
    if (yt.status === "fulfilled") rows.push(...yt.value);
    if (rows.length) await sheets.appendRows(rows);
    await env.RUN_STATUS.put(key, "1", { expirationTtl: 60 * 60 * 20 });
  }
};
async function authenticate(req, env) {
  const cookies = parseCookies(req.headers.get("Cookie"));
  const sess = cookies["sess"];
  if (!sess) return false;
  const payload = await verifySessionCookie(sess, env.SESSION_SECRET);
  return !!payload;
}
__name(authenticate, "authenticate");
function loginPage() {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Login \xB7 Consumed Draft</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:420px;margin:10vh auto;padding:0 16px;color:#111}form{display:flex;gap:8px}input[type=password]{flex:1;padding:10px;border:1px solid #ccc;border-radius:6px}button{padding:10px 16px;border:0;border-radius:6px;background:#111;color:#fff;cursor:pointer}</style>
</head><body>
  <h1>Consumed \xB7 Draft Login</h1>
  <form method="post" action="/api/login">
    <input type="password" name="password" placeholder="Password" autocomplete="current-password" required>
    <button type="submit">Login</button>
  </form>
</body></html>`;
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}
__name(loginPage, "loginPage");
async function dashboardPage(env) {
  const ny = nowInNY();
  const week = formatWeekPath(ny);
  const sheets = new SheetsClient(env);
  let entries = [];
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
  const groupedByDate = groupEntriesByDate(entries);
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Consumed \xB7 Draft</title>
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
    <h1>Consumed \xB7 Draft</h1>
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
        <input type="date" name="date" id="date" value="${(/* @__PURE__ */ new Date()).toLocaleDateString("en-CA", { timeZone: "America/New_York" })}" required>
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
      showStatus('\u2705 Updated ' + successCount + ' entries to public');
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
      showStatus('\u2705 Updated ' + successCount + ' entries to private');
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

      showStatus('\u2705 Saved notes for ' + successCount + ' entries');
    }

    // Initialize status summary on page load
    document.addEventListener('DOMContentLoaded', updateStatusSummary);

    // Update status when individual toggles change
    document.addEventListener('change', (e) => {
      if (e.target.matches('.public-toggle')) {
        updateStatusSummary();
      }
    });
  <\/script>
</body></html>`;
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}
__name(dashboardPage, "dashboardPage");
function groupEntriesByDate(entries) {
  const grouped = /* @__PURE__ */ new Map();
  console.log(`groupEntriesByDate: Starting with ${entries.length} entries`);
  if (entries.length > 0) {
    console.log("Sample entry dates:", entries.slice(0, 3).map((e) => e.date));
  }
  const today = nowInNY();
  today.setHours(0, 0, 0, 0);
  const validDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    grouped.set(dateStr, /* @__PURE__ */ new Map());
    validDates.push(dateStr);
  }
  console.log("Valid date keys:", validDates);
  let matchedCount = 0;
  const unmatchedDates = /* @__PURE__ */ new Set();
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
    dateMap.get(entry.bucket).push(entry);
  }
  console.log(`groupEntriesByDate: Matched ${matchedCount} out of ${entries.length} entries`);
  if (unmatchedDates.size > 0) {
    console.log("Unmatched entry dates:", Array.from(unmatchedDates));
  }
  return grouped;
}
__name(groupEntriesByDate, "groupEntriesByDate");
function renderEntries(groupedByDate) {
  if (groupedByDate.size === 0) {
    return '<div class="empty-state"><p>No entries found. Try running the ingest or adding entries manually.</p></div>';
  }
  const days = Array.from(groupedByDate.keys()).sort().reverse();
  return days.map((date) => {
    const dayName = (/* @__PURE__ */ new Date(date + "T12:00:00")).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      timeZone: "America/New_York"
    });
    const buckets = groupedByDate.get(date);
    const bucketOrder = ["music", "video", "article", "tweet", "other"];
    const bucketsWithEntries = bucketOrder.filter((bucket) => buckets.has(bucket) && buckets.get(bucket).length > 0);
    if (bucketsWithEntries.length === 0) return "";
    return `
      <div class="day-section">
        <div class="day-header">${dayName}</div>
        ${bucketsWithEntries.map((bucket) => {
      const entries = buckets.get(bucket);
      return `
            <div class="bucket-section">
              <div class="bucket-header">${bucket} (${entries.length})</div>
              ${entries.map((entry) => `
                <div class="entry">
                  <div class="entry-content">
                    <h3 class="entry-title">
                      ${entry.url ? `<a href="${escapeHtml(entry.url)}" target="_blank">${escapeHtml(entry.title)}</a>` : escapeHtml(entry.title)}
                    </h3>
                    <div class="entry-meta">${escapeHtml(entry.source)} \u2022 ${entry.date}</div>
                    <div class="entry-notes">
                      <textarea data-id="${escapeHtml(entry.id)}" placeholder="Add notes...">${escapeHtml(entry.notes || "")}</textarea>
                    </div>
                  </div>
                  <div class="entry-controls">
                    <label class="toggle">
                      <input type="checkbox" class="public-toggle" data-id="${escapeHtml(entry.id)}" ${entry.is_public ? "checked" : ""}>
                      <span class="slider"></span>
                    </label>
                    <span class="toggle-label">Public</span>
                  </div>
                </div>
              `).join("")}
            </div>
          `;
    }).join("")}
      </div>
    `;
  }).join("");
}
__name(renderEntries, "renderEntries");
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
__name(escapeHtml, "escapeHtml");
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
__name(isValidUrl, "isValidUrl");

// ../../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
init_modules_watch_stub();
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
init_modules_watch_stub();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-buFmFx/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
init_modules_watch_stub();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-buFmFx/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
