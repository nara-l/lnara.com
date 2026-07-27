# Annotation acceptance

## Product boundary

- Only the author can create, edit, or delete annotations.
- Every saved annotation is public and attached to its note.
- Readers see annotations but never receive author controls.
- D1 is the only annotation store.
- Article prose remains unchanged. Passage anchors use text-quote selectors stored outside the Markdown body.

## Reading experience

- The existing Source Serif 4 typography, 68ch article column, numbered headings, and compressed contents navigation remain unchanged.
- Annotated passages have a restrained visual treatment and numbered references.
- Wide desktop can place notes in a right rail without narrowing the article.
- Tablet and phone use linked annotations below the article.
- Selecting, opening, or closing an annotation must not shift the article column.
- Keyboard focus, reduced motion, and touch selection are supported.

## Capture experience

- Author mode is absent for ordinary readers.
- Author mode supports mouse, keyboard, stylus, iOS selection, and Android selection.
- A selection must resolve to exactly one passage in one article block.
- The composer shows the selected quotation, note text, and optional tags.
- Draft text survives recoverable request failures.
- Save reports success only after D1 persistence succeeds.

## Persistence and security

- Annotations are stored in Cloudflare D1.
- Public reads do not require a session.
- Create, edit, and delete require an authenticated author session.
- Authentication and authorization are enforced by the Worker, never by hidden client UI alone.
- The production author session uses an HttpOnly, Secure, SameSite cookie.
- Save retries are idempotent and cannot create duplicate annotations.
- Payloads, slugs, tags, quotation lengths, and note lengths are validated server-side.
- `AUTHOR_PASSWORD` and `SESSION_SECRET` are Worker secrets and are not committed to Git.

## Failure behavior

- Missing source passage: keep the draft and report that the passage no longer matches.
- Ambiguous passage: keep the draft and request a longer selection.
- Authentication failure: preserve the draft and require author setup again.
- D1 failure: preserve the draft and do not claim success.
- A missing or ambiguous selector leaves the note visible in the annotation list without highlighting the wrong passage.

## Verification matrix

| Capability | Status | Verification | Evidence |
| --- | --- | --- | --- |
| Public D1 reads | Operationally verified at the API | Unauthenticated GET before and after create, edit, and delete | Worker `3d6aceaa-0bff-4eed-828f-8c85dba3ab55`; anonymous reader saw the new and edited annotation immediately |
| Password-protected writes | Operationally verified at the API | Login, create, duplicate create, edit, duplicate delete, wrong password, unauthenticated write, and foreign origin | Login `200`; rejected requests `401`/`403`; retries were idempotent; final D1 count returned to zero |
| Desktop reading rail | Implemented, browser verification pending | Browser at 1280 x 720 | Verify 68ch article and left contents rail remain unchanged |
| Tablet reading and capture | Implemented, physical-device verification pending | Real tablet selection, save, reload, edit, delete | Pending |
| Phone reading and capture | Implemented, physical-device verification pending | Real phone selection, save, reload, edit, delete | Pending |
| Regression checks | Implemented | Astro check, static build, Worker typecheck, focused lint, automated tests | Zero Astro diagnostics; 5 tests pass; production build succeeds; changed files pass ESLint |

## Remaining before production

- Deploy the simplified site frontend.
- Verify the ordinary reader URL renders the live D1 highlight and note.
- Exercise native text selection and composer save on Lawrence's actual phone and tablet.
