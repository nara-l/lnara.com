# Annotation Worker

Local and future production API for Lawrence's private and public note
annotations.

Production private annotations run at `https://annotations.lnara.com` with D1
persistence. Public publishing remains disabled until a narrowly scoped GitHub
credential is configured.

## Local setup

```powershell
npm install
npx wrangler d1 migrations apply lnara-annotations-local --local
npm run dev -- --port 8787 `
  --var AUTHOR_PASSWORD:choose-a-local-password `
  --var SESSION_SECRET:choose-a-long-local-secret
```

Run the Astro site from the repository root, then open:

```text
http://127.0.0.1:4323/notes/<note-slug>?annotate=1
```

Reader URLs without `?annotate=1` do not show controls or call this API.

Private annotations persist in local D1. Public saves additionally require a
`GITHUB_TOKEN` binding and write a versioned sidecar to
`src/data/annotations/<note-slug>.json` on the configured branch.

## Test on a phone or tablet

Use the laptop's LAN IPv4 address in place of `<lan-ip>`. The author client
automatically sends local API requests to the same hostname as the page.

```powershell
# Repository root
npm run dev -- --host 0.0.0.0

# annotations-worker
npm run dev -- --ip 0.0.0.0 --port 8787 `
  --var ALLOWED_ORIGIN:http://<lan-ip>:4323 `
  --var AUTHOR_PASSWORD:choose-a-local-password `
  --var SESSION_SECRET:choose-a-long-local-secret
```

On a device connected to the same network, open:

```text
http://<lan-ip>:4323/notes/<note-slug>?annotate=1
```

Keep the exact `ALLOWED_ORIGIN`; do not use a wildcard with credentialed
requests. Production likewise requires a same-site API hostname so the strict
author cookie is not treated as a third-party cookie.

For an end-to-end local public-write test without GitHub:

```powershell
npm run mock-github
npm run dev -- --port 8787 `
  --var AUTHOR_PASSWORD:choose-a-local-password `
  --var SESSION_SECRET:choose-a-long-local-secret `
  --var GITHUB_TOKEN:local-test-token `
  --var GITHUB_API_URL:http://127.0.0.1:8790
```

Inspect the emulator's persisted sidecar at `http://127.0.0.1:8790/__state`.

## Checks

From the repository root:

```powershell
npm test
npx astro check
```

From this directory:

```powershell
npm run typecheck
```

This Worker has not been deployed. Production requires a real D1 binding,
secrets, an exact allowed origin, and an end-to-end branch write before release.
