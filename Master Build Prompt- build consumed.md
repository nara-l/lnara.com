Master Build Prompt
You are building a “Media Diet Tracker” for lnara.com inspired by consumed.today.

## GOAL
The system should:
- Collect media consumption automatically (Spotify via Last.fm API, YouTube via YouTube Data API).
- Allow manual additions (articles, tweets, other).
- Store all entries in Google Sheets (used as a database, but never exposed directly).
- Provide a private curation dashboard at /draft/consumed where I can review the week’s items.
- Let me mark entries public/private, add notes, and publish.
- Generate a public digest page at /consumed/[week] with entries grouped day-by-day and bucketed by type.

## STORAGE
- Backend: Google Sheets.
- One sheet named `media_log`.
- Columns:


id | date | bucket | title | url | source | notes | is_public | created_at

- Bucket values: music, video, article, tweet, other.

## INGESTERS
- Spotify:
- Connect via Last.fm API (scrobbling enabled).
- Script pulls recent tracks for a given user/API key and appends rows.
- YouTube:
- Connect via YouTube Data API (OAuth once).
- Script pulls recent watch history and appends rows.
- Support a blocklist of channels/videoIds and per-video privacy overrides.

## DASHBOARD (/draft/consumed)
- Auth: simple password from .env.
- Pull last 7 days of rows from the Sheet.
- Group items by Day (Mon–Sun).
- Inside each day, group by bucket.
- For each entry:
- Show title, url, source.
- Editable notes field.
- Toggle public/private.
- Add form to manually add entries (article, tweet, other).
- Button: **Publish Week**:
- Collect last 7 days where is_public=true.
- Generate static file under /public/consumed/YYYY-WW/index.html.

## PUBLIC PAGES (/consumed/[week])
- Static, no Google Sheets queries.
- Layout:
- Header: “Media Consumed — Week [WW], YYYY”
- Show each day of the week in order.
- If no entries for a day, show “No entries”.
- Within each day, group items by bucket.
- Items shown as bullet points: `[Title](URL) — Notes`.
- Styling: Tailwind CSS, clean and simple, like consumed.today.

## CONFIG
- .env variables:
- SHEETS_ID
- GOOGLE_SERVICE_ACCOUNT_JSON
- LASTFM_USER
- LASTFM_API_KEY
- YOUTUBE_CLIENT_SECRET
- YOUTUBE_TOKEN_PATH
- DASHBOARD_PASSWORD
- BASE_URL

## DELIVERABLES
1. Server app (FastAPI or Express) with routes:
 - /draft/consumed (dashboard)
 - /publish/week (publish action)
 - /consumed/[week] (public digest)
2. Scripts:
 - ingest_lastfm.py
 - ingest_youtube.py
3. Frontend:
 - dashboard.html (private, with forms, toggles, notes, publish button)
 - published.html template (for static digest pages)
4. Config:
 - .env.example
 - blocklist.json, privacy_overrides.json
5. Docs:
 - README.md with setup steps:
   - Create Google Sheet + API credentials.
   - Enable Last.fm scrobbling + API key.
   - Enable YouTube Data API + OAuth.
   - Deploy app to lnara.com.
   - Use dashboard weekly to curate and publish.

## USER FLOW
- During the week:
- Ingester scripts auto-append Spotify + YouTube to Google Sheet.
- User may add articles/tweets manually through dashboard form.
- On Sunday:
- User logs into /draft/consumed.
- Reviews items day by day, toggles public/private, adds notes.
- Clicks **Publish Week**.
- Public:
- Anyone can visit /consumed/[week] to see the digest page.
- Digest shows day-by-day breakdown, grouped by bucket.
What you tell them

Public repo (Cloudflare Pages):

Contains only /consumed/[week] HTML files, CSS, assets.

No secrets.

Static, auto-built from GitHub commits.

Private backend (Cloudflare Worker or small VPS):

Hosts /draft/consumed dashboard (password-protected).

Talks to Google Sheets API (service account key stored in Worker/VPS secrets).

Runs ingesters for Last.fm + YouTube.

Generates static digest pages.

Pushes those digest pages to your public GitHub repo (via commit + deploy key) OR directly to Cloudflare R2/Pages API.

🟡 How they’ll implement

Repo split

media-diet-public (on GitHub, public) → your Cloudflare Pages site.

media-diet-backend (private) → Worker/VPS code.

Workflow

During the week: backend fills Google Sheet.

Sunday: you log into lnara.com/draft/consumed (served by backend).

You curate → hit Publish.

Backend writes HTML digest → pushes into media-diet-public repo.

Cloudflare Pages rebuilds → new digest goes live at lnara.com/consumed/[week].

Secrets

Service account JSON, Last.fm API key, YouTube OAuth creds → stored only in Worker secrets or VPS .env.

Never in public repo.

---

ADDENDUM — Confirmed Decisions and Implementation TODO (America/New_York)

Confirmed Decisions

- Timezone: America/New_York; use ISO week (Mon–Sun) for grouping and publishing.
- Ingestion cadence: daily at 11:00 PM ET (handled via UTC cron + local-time gate).
- YouTube ingestion: use "Liked videos" as proxy for watch history; user will like every watched video.
- Spotify ingestion: via Last.fm recent tracks for LASTFM_USER.
- Navigation: add “Consumed” link only after first publish (target next Sunday).
- No email export for now.

Privacy & Repo Strategy

- Public repo (this site on Cloudflare Pages): contains only published static digests in `/public/consumed/YYYY-WW/` and an index at `/public/consumed/index.html`. No draft rows, no secrets.
- Private backend (Cloudflare Worker or small VPS; vanilla Worker routing is sufficient — Hono optional):
  - Password-protected dashboard at `/draft/consumed` (or `draft.lnara.com/consumed`).
  - Google Sheets access via service account stored as a secret.
  - Daily ingesters (Last.fm + YouTube Likes) at 11 PM ET.
  - Publish Week renders static HTML and pushes to the public repo via deploy key or Cloudflare Pages Direct Upload API.

Google Sheet Schema (media_log)

`id | date | bucket | title | url | source | notes | is_public | created_at | updated_at`

- Buckets: `music | video | article | tweet | other`.
- IDs:
  - Last.fm: `hash(artist|track|timestamp)`
  - YouTube Likes: `youtube:videoId|likedAt`
  - Manual: UUID v4

Dashboard (/draft/consumed)

- Auth via password; set HTTP-only session cookie; add `noindex`.
- View last 7 days (ET), grouped by day then bucket.
- Each entry: title, url, source; editable notes; toggle `is_public`.
- Manual add: article/tweet/other.
- Publish Week: generate `/consumed/YYYY-WW/index.html` and update `/consumed/index.html`.

Public Pages (/consumed/[YYYY-WW])

- Pure static HTML; no live Google Sheets queries.
- Header: `Media Consumed — Week [WW], YYYY`.
- Show Mon–Sun; if empty day → “No entries”.
- Group items by bucket; bullet format: `[Title](URL) — Notes`.
- Styling: inline CSS within the digest or a small `/consumed/style.css`.

Cron & Time Handling

- Cloudflare Cron uses UTC → schedule at 03:00 and 04:00 UTC.
- In code, compute America/New_York time; proceed only when local hour === 23 and today not processed (dedupe with KV/Sheet meta).

Publishing Flow

- Select ISO week; pull rows with `is_public=true` for that week.
- Render static digest + update index of weeks.
- Commit to this public repo via deploy key, or use Pages Direct Upload API. No secrets committed.

Backend Deliverables

- Worker/VPS routes:
  - `GET /draft/consumed` — dashboard
  - `POST /api/entries` — manual create
  - `POST /api/entries/:id` — update notes/is_public
  - `POST /publish/week?week=YYYY-WW` — publish action
- Ingesters (scheduled daily):
  - `ingest_lastfm` (recent tracks)
  - `ingest_youtube_likes`
- Config (in private backend repo): `.env.example` with
  - `SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `LASTFM_USER`, `LASTFM_API_KEY`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `DASHBOARD_PASSWORD`, `PUBLIC_REPO`, `PUBLIC_REPO_BRANCH`, `GITHUB_DEPLOY_KEY`
  - `blocklist.json`, `privacy_overrides.json`
- Docs: setup, secrets, cron, publish flow, and commit-to-public instructions.

Acceptance Criteria

- Private dashboard shows last 7 days grouped by day and bucket; notes/toggles work; manual add works.
- Daily ingestion runs at 11 PM ET and appends deduped rows.
- Publish Week creates `/public/consumed/YYYY-WW/index.html` and updates `/public/consumed/index.html` in this repo.
- No draft/private data lands in the public repo; nav link added only after first publish.
