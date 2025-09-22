Consumed Backend (Private)

This is a minimal Cloudflare Worker scaffold for the private Media Diet backend. Move this folder into a private repo before deploying. Do not keep secrets or OAuth tokens in the public site repo.

Responsibilities
- Password-protected dashboard at `/draft/consumed` to curate the last 7 days (America/New_York).
- Daily ingesters at 11:00 PM ET: Last.fm recent tracks and YouTube Liked videos.
- Publish Week: render static HTML digest `/consumed/YYYY-WW/index.html` and update `/consumed/index.html`, then commit to the public site repo or upload to Cloudflare Pages.

Stack
- Cloudflare Workers (vanilla Router)
- Google Sheets (service account)
- Cron Triggers (UTC with ET gating)
- KV (dedupe last-run + optional session store)

Secrets (Wrangler)
- `DASHBOARD_PASSWORD`
- `SESSION_SECRET` (random string for cookie HMAC)
- `SHEETS_ID`
- `GOOGLE_SERVICE_ACCOUNT_JSON` (full JSON string)
- `LASTFM_USER`
- `LASTFM_API_KEY`
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `PUBLIC_REPO` (e.g., `LawrenceNara/lnara.com`)
- `PUBLIC_REPO_BRANCH` (e.g., `main`)
- `GITHUB_TOKEN` (preferred: GitHub PAT with repo write scope for REST API commits)
- `GITHUB_DEPLOY_KEY` (optional; SSH is not used by Workers — prefer token)

KV Bindings
- `RUN_STATUS` (stores last-ingest date for ET dedupe; also: `lastfm:last_uts`, `yt:last_liked_at`, `yt:refresh_token`, `yt:likes_playlist_id`)

Local Dev
1) Install deps: `npm i`
2) Login: `npx wrangler login`
3) Create KV: `npx wrangler kv namespace create RUN_STATUS`
4) Add secrets: `npx wrangler secret put DASHBOARD_PASSWORD` (repeat for others)
5) Run: `npm run dev`

Deploy
- `npm run deploy`
- Set route: e.g., `https://draft.lnara.com/consumed` → Worker

Notes
- Keep this repo private. Only the generated static HTML should land in the public site repo.
- Timezone: America/New_York. In cron handlers, convert from UTC and gate at 23:00 local time.

YouTube OAuth (one-time)
- Add route mapping for the Worker so you can hit:
  - `GET /oauth/youtube/start` → redirects to Google consent screen with `youtube.readonly` scope and `access_type=offline`.
  - `GET /oauth/youtube/callback` → exchanges the `code` for tokens and stores `yt:refresh_token` in KV.
- After this, the daily ingester uses the refresh token to fetch the Liked videos playlist and new items.

Manual Testing
- After deploying and logging in, you can trigger ingestion manually:
  - `POST /api/ingest` (runs Last.fm + YouTube Likes once and appends rows)
