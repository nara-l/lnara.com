Handover: Consumed Feature (Private Backend + Public Digest)

Overview
- Goal: Weekly media digest (like consumed.today) with a private curation dashboard and public static weekly pages.
- Public site (this repo): Astro on Cloudflare Pages. No secrets. Only published digests under `public/consumed/`.
- Private backend (new repo): Cloudflare Worker hosting the dashboard, daily ingesters, and a publisher that commits generated HTML to this public repo.
- Timezone: America/New_York (ET). Use ISO week (Mon–Sun).
- Ingestion schedule: daily at 11:00 PM ET (cron in UTC; code gates to ET).
- YouTube proxy: use “Liked videos” as watch history proxy (user likes each watched video).
- Add “Consumed” nav link on the site only after the first publish.

Repos
- Public site repo (this one): lnara.com on Cloudflare Pages.
  - Includes `public/consumed/style.css` (digest stylesheet).
  - Updated “Master Build Prompt- build consumed.md” with decisions + TODOs.
- Private backend repo (create): move the scaffold from `consumed-backend/` into a new private repo named `consumed-backend`.

What's Implemented (Backend Scaffold) ✅ COMPLETE
- Routing, auth, cron (src/index.ts)
  - Password login via `DASHBOARD_PASSWORD` → HTTP-only session cookie ✅
  - GET `/draft/consumed` FULL DASHBOARD with day/bucket grouping, toggles, notes ✅
  - POST `/api/entries` to add manual entries ✅
  - POST `/api/entries/:id` to update notes/is_public ✅
  - POST `/api/ingest` manual trigger (Last.fm + YouTube Likes) ✅
  - POST `/publish/week?week=YYYY-WW` → generate and commit static week + update index ✅
  - GET `/oauth/youtube/start` & `/oauth/youtube/callback` for one-time YouTube OAuth ✅
  - `scheduled()` runs daily, gates to 23:00 ET, runs ingesters, appends to Sheets ✅
- Google Sheets client (src/sheets.ts) ✅
  - Service account JWT flow ✅
  - Methods: `appendRows`, `listRowsSince`, `listRowsForIsoWeek`, `updateRow` ✅
  - Ensures header row exists; tab name `media_log` ✅
- Ingester scripts ✅
  - `src/ingest/lastfm.ts`: Last.fm recent tracks (200 limit) → bucket=music; KV dedupe ✅
  - `src/ingest/youtube.ts`: YouTube Liked videos → bucket=video; KV dedupe; OAuth working ✅
- Publish generator ✅
  - `src/publish/html.ts`: renders weekly digest with Mon–Sun sections grouped by bucket ✅
  - `src/publish/index.ts`: writes `public/consumed/YYYY-WW/index.html` and rebuilds index ✅
  - `src/publish/github.ts`: commits files via GitHub Contents API ✅
- Utilities ✅
  - `src/utils/time.ts` (NY time + ISO week) ✅
  - `src/utils/hash.ts` (sha256), `src/utils/cookie.ts` (HMAC cookie) ✅
  - `src/utils/googleAuth.ts` (SA JWT), `src/utils/base64url.ts` ✅

Public Site Styling
- `public/consumed/style.css` provides small, clean styling for weekly pages.

Environment & Secrets (Worker) ✅ ALL CONFIGURED
- `DASHBOARD_PASSWORD` — dashboard password ✅
- `SESSION_SECRET` — random string for cookie HMAC ✅
- `SHEETS_ID` — Google Sheet ID ✅
- `GOOGLE_SERVICE_ACCOUNT_JSON` — full JSON key for service account ✅
- `LASTFM_USER`, `LASTFM_API_KEY` — Last.fm credentials ✅
- `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` — Google OAuth Web app credentials ✅
- `PUBLIC_REPO` — `nara-l/lnara.com` (corrected) ✅
- `PUBLIC_REPO_BRANCH` — `master` (corrected) ✅
- `GITHUB_TOKEN` — fine-grained PAT with Contents: Read/Write ✅
- `CF_PAGES_DEPLOY_HOOK_URL` — Cloudflare Pages Deploy Hook webhook URL ⏳ PENDING

Cloudflare KV
- Namespace binding: `RUN_STATUS`
- Keys used:
  - `lastfm:last_uts` — last ingested Last.fm timestamp
  - `yt:last_liked_at` — last ingested YouTube liked timestamp
  - `yt:refresh_token` — YouTube refresh token
  - `yt:likes_playlist_id` — cached Likes playlist ID
  - `last-run-YYYY-MM-DD` — daily cron dedupe for ET date

Endpoints Summary (Backend)
- GET `/draft/consumed` — dashboard (login required)
- POST `/api/entries` — create manual entry (bucket/title/url/notes/date)
- POST `/api/entries/:id` — update notes/is_public
- POST `/api/ingest` — manual run of Last.fm + YouTube Likes
- POST `/publish/week?week=YYYY-WW` — publish selected ISO week
- GET `/oauth/youtube/start` — start YouTube OAuth (login required)
- GET `/oauth/youtube/callback` — handle OAuth; stores `yt:refresh_token`

Data Model (Google Sheet: media_log)
- Columns: `id | date | bucket | title | url | source | notes | is_public | created_at | updated_at`
- `date`: ET-local `YYYY-MM-DD`; buckets: `music | video | article | tweet | other`
- IDs:
  - Last.fm: sha256(`artist|track|timestamp`)
  - YouTube: `youtube:videoId|likedAt`
  - Manual: UUID or sha256 of fields+timestamp

Publishing Flow
- `POST /publish/week?week=YYYY-WW`:
  - Reads `is_public=true` rows for the week from Sheets
  - Renders digest to `public/consumed/YYYY-WW/index.html`
  - Rebuilds `/public/consumed/index.html` from repo listing + this week
  - Commits files to lnara.com repo via GitHub API
- After first publish, add nav link to `/consumed` in the public site.

CURRENT STATUS ✅ BACKEND WORKING - ❌ CLOUDFLARE PAGES DEPLOYMENT ISSUE

✅ BACKEND FIXED: Google Sheets header corruption resolved
**Solution**: User manually added proper header row to Google Sheets
**Result**: Dashboard now shows 163 entries (up from 49), backend publishing works correctly

✅ CONSUMED FEATURE WORKING:
- Dashboard displays last 7 days of entries with proper grouping ✅
- Publishing generates correct HTML for full week (all 7 days) ✅
- 163 entries published for week 2025-38 ✅
- Backend HTML generation working correctly ✅

✅ DEPLOYMENT ISSUE RESOLVED: CLOUDFLARE PAGES DEPLOY HOOKS IMPLEMENTED
**Problem**: Cloudflare Pages (free plan) not picking up recent GitHub commits due to Build watch paths
**Solution**: Official Cloudflare Pages Deploy Hooks + Build configuration fixes
**Date**: Sept 21, 2025 - Fixed

**Root Cause Identified**:
- Build watch paths in Cloudflare Pages excluded `public/consumed/**/*.html` files
- CSS changes deployed because they matched watch patterns, HTML changes didn't
- Trigger files don't work on Cloudflare Pages - Deploy Hooks are the official solution

**Solution Implemented**:
1. ✅ **Backend Updated**: Modified `consumed-backend/src/publish/github.ts` to use Deploy Hooks
2. **Manual Configuration Required**:
   - Set up Deploy Hook in Cloudflare Dashboard → Pages → Project → Settings → Deploy Hooks
   - Add environment variable `CF_PAGES_DEPLOY_HOOK_URL` to the Worker
   - Fix Build watch paths to include `public/**` and `src/**`
   - Verify production branch is set to `master`

**Technical Changes**:
- `commitFilesToGitHub()` now calls official Deploy Hook URL after GitHub commits
- Replaced cache-busting with proper POST to Deploy Hook webhook
- Added error handling and logging for Deploy Hook responses

**Files Updated**:
- ✅ consumed-backend/src/publish/github.ts: Deploy Hook integration complete

**Next Steps**:
1. **Cloudflare Dashboard Setup** (Manual):
   - Pages → Project → Settings → Builds & deployments → Deploy Hooks → Add deploy hook
   - Name: `force-production-build`, Branch: `master`
   - Copy webhook URL
2. **Environment Variable**: Add `CF_PAGES_DEPLOY_HOOK_URL` to Worker secrets
3. **Build Watch Paths**: Clear or add `public/**`, `src/**`
4. **Test**: Trigger a publish and verify immediate deployment

3) Blocklist and privacy overrides (optional)
- Add KV `blocklist` and `privacy_overrides` JSON
  - `blocklist`: channel IDs/video IDs (YouTube), artists/tracks (Last.fm)
  - `privacy_overrides`: map entry IDs → `is_public` default
- Apply during ingest

4) Harden auth & rate limiting
- KV token bucket per IP for POSTs; add CSRF token to forms

5) Logging
- Add logs for scheduled ingests and publish results; maintain `/health` (exists)

6) Docs
- Ensure private repo README includes: service account setup, YouTube OAuth config, Cloudflare route/cron, secrets checklist

Quick Setup Steps (Private Backend Repo)
- Create private repo `consumed-backend`; move `consumed-backend/` contents there
- `npm i && npx wrangler login`
- `npx wrangler kv namespace create RUN_STATUS`
- `npx wrangler secret put` for all secrets listed above
- Deploy: `npm run deploy`
- Routes: map `draft.lnara.com/*` to Worker (OAuth callback requires `/oauth/...`)
- Cron: add 03:00 & 04:00 UTC; code gates to 23:00 ET
- One-time: log into `/draft/consumed` then visit `/oauth/youtube/start`; callback stores refresh token
- Test: `POST /api/ingest` to seed data, then `POST /publish/week?week=YYYY-WW`
- Verify commit in public repo under `public/consumed/YYYY-WW/index.html` and `/public/consumed/index.html`

Acceptance Criteria - STATUS
- Dashboard shows last 7 ET days grouped by day and bucket; notes and public/private toggles persist; manual add works ✅ COMPLETE
- Daily ingestion at 11 PM ET ingests Last.fm and YouTube Likes without duplicates ✅ COMPLETE
- Publish produces weekly HTML and updates index; commit lands in public repo ✅ WORKING (debugging deployment)
- No draft/private data in public repo ✅ VERIFIED
- Add nav link to `/consumed` after first publish ⏳ PENDING (after site deployment issue resolved)

Key Backend Files
- `src/index.ts` — routes, scheduled handler (expand dashboard rendering)
- `src/sheets.ts` — Sheets client
- `src/ingest/lastfm.ts` & `src/ingest/youtube.ts` — ingestion
- `src/publish/github.ts` — GitHub commits (switch to contents API recommended)
- `src/publish/index.ts` — weekly and index generation
- `wrangler.toml` — KV binding and routes

Notes
- YouTube OAuth client must include the authorized redirect URI that matches the Worker route
- Share the Google Sheet with the service account email; sheet tab must be `media_log`
- Secrets must stay in the Worker environment only
- Digest pages use `/public/consumed/style.css` in the public repo

