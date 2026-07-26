# Annotation Worker

Local and future production API for Lawrence's private and public note
annotations.

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
