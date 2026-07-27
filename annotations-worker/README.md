# Annotation Worker

The annotation API for lnara.com. Cloudflare D1 is the only annotation store.
Every saved annotation is public; the author password protects create, edit,
and delete operations.

## Request model

- `GET /api/annotations/:slug` is public.
- `POST /api/annotations/session` exchanges the author password for an
  HttpOnly session cookie.
- `POST`, `PATCH`, and `DELETE` annotation requests require that session.
- The Astro reader fetches annotations from D1 and attaches them to matching
  passages in the browser.
- Article Markdown is never modified by annotation operations.

`AUTHOR_PASSWORD` and `SESSION_SECRET` are Worker secrets. They are not stored
in this repository.

## Local setup

```powershell
npm install
npx wrangler d1 migrations apply lnara-annotations-local --local
npm run dev -- --port 8787 `
  --var AUTHOR_PASSWORD:choose-a-local-password `
  --var SESSION_SECRET:choose-a-long-local-secret
```

Run the Astro site from the repository root and open:

```text
http://127.0.0.1:4323/notes/<note-slug>?annotate=1
```

Use the ordinary note URL to verify the public reader experience.

## Checks

```powershell
# Repository root
npm test
npx astro check

# annotations-worker
npm run typecheck
```
