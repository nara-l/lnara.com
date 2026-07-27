# Annotation acceptance

## Product boundary

- Only the author can create, edit, publish, privatize, or delete annotations.
- Readers can see public annotations but never receive annotation controls.
- Every annotation has explicit `private` or `public` visibility.
- Public annotations are part of the static page and remain readable without JavaScript.
- Private annotations are returned only through an authenticated author endpoint.
- Article prose remains unchanged. Passage anchors use text-quote selectors stored outside the Markdown body.

## Reading experience

- The existing Source Serif 4 typography, 68ch article column, numbered headings, and compressed contents navigation remain unchanged.
- Public annotated passages have a restrained visual treatment and numbered references.
- Wide desktop can place notes in a right rail without narrowing the article.
- Tablet and phone use linked annotations below the article, with an enhanced disclosure or sheet when JavaScript is available.
- Selecting, opening, or closing an annotation must not shift the article column.
- Keyboard focus, reduced motion, and touch selection are supported.

## Capture experience

- Author mode is absent for ordinary readers: no controls and no annotation network requests.
- Author mode supports mouse, keyboard, stylus, iOS selection, and Android selection.
- A selection must resolve to exactly one passage in one article block.
- The composer shows the selected quotation, note text, optional tags, and a private/public visibility control.
- Draft text survives recoverable request failures.
- Save reports success only after the selected persistence path succeeds.

## Persistence and security

- Public annotations are stored in `src/data/annotations/*.json` and compiled into the site.
- Private annotations are stored in Cloudflare D1.
- Authentication and authorization are enforced by the Worker, never by hidden client UI alone.
- The production author session uses an HttpOnly, Secure, SameSite cookie.
- Public-save retries are idempotent and cannot create duplicate annotations.
- GitHub writes use optimistic concurrency and never rewrite article prose.
- Payloads, slugs, tags, quotation lengths, and note lengths are validated server-side.

## Failure behavior

- Missing source passage: keep the draft and report that the passage no longer matches.
- Ambiguous passage: keep the draft and request a longer selection.
- Authentication failure: preserve the draft and require author setup again.
- Public-write conflict: refetch, retry once, and report a conflict if it remains.
- Private-storage failure: preserve the draft and do not claim success.
- Build-time missing or ambiguous public selectors produce warnings with the note slug and annotation id.

## Verification matrix

| Capability | Status | Verification | Evidence |
| --- | --- | --- | --- |
| Static public annotations | Operationally verified locally | Temporary sidecar fixture, static build, inspect generated HTML, then remove fixture | Anchor, reference, note, no Index, and hidden author controls all present in `dist` |
| Desktop reading rail | Operationally verified locally | Browser at 1280 x 720 | 68ch article and existing left contents rail unchanged; author controls do not resize the article |
| Tablet reading and capture | Operationally verified locally | Browser at 768px; keyboard passage capture, create, edit, privatize, publish, delete, and draft discard | 68ch article retained, mobile Contents shown, no overflow, private highlights restored, and lifecycle controls persisted through the local Worker |
| Phone reading and capture | Partially verified | Browser at 390 x 844 | Reading, bottom-sheet composer, collapsed Contents, deferred login, direct unlock-to-composer continuation, keyboard capture, private save/delete, persisted-note drawer, and no horizontal overflow verified; native touch selection still needs a physical-device pass |
| Private D1 persistence | Operationally verified in production | Create, authenticated fetch, and delete against `annotations.lnara.com` and production D1 | Worker version `7991c5a0-6a52-4272-b214-2776fde1627e`; create returned 201, persisted read found one row, delete returned 200, and cleanup left zero verification rows |
| Public persistence | Operationally verified locally | Real Worker requests against a local GitHub Contents API emulator | Create wrote one sidecar entry; edit updated it without duplication; privatize removed it; republish restored it; delete and retry removed it; real GitHub credential and branch write remain unverified |
| Authentication | Operationally verified in production | Production Worker requests plus local browser recovery and automated tampered, wrong-secret, and expired-session checks | Production login returned 200, wrong password and unauthenticated fetch returned 401, foreign origin returned 403; author mode locally preserves the pending passage through login; session tests pass |
| Retry and idempotency | Operationally verified locally | Duplicate create, edit, and delete requests plus simulated GitHub conflict | Repeated keys returned the persisted result without duplicate D1 or sidecar entries; GitHub conflict refetched once |
| Regression checks | Implemented | Astro check, static build, matcher tests, Worker typecheck | 16 tests pass; Astro reports zero diagnostics; Worker TypeScript reports zero errors |
| Deployed author UI | Operationally verified in production | Keyboard passage capture, login, private save, reload, notes drawer, and delete at `lnara.com` | Unlock continued directly to the selected passage; `Notes (1)` restored the D1-backed note after reload; cleanup returned the drawer to zero notes |

## Remaining before production

- Exercise native text selection and composer save on Lawrence's actual phone and tablet.
- Exercise one real GitHub sidecar commit on a non-production branch, including a failed build and retry.
