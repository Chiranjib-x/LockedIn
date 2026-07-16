Run the Playwright test suite for this project at mobile viewport.

Setup:
- Viewport: **390×844** (iPhone-sized, mandatory for this project)
- Dev server must be running at http://localhost:3001 (PORT 3000 is another app — do not kill it)
- Test accounts (password `testpass1234`): `lockedin.phase1.test@gmail.com` (founder/moderator), `lockedin.test.girl@gmail.com`, `lockedin.test.boy@gmail.com` — all Demo College
- Use Playwright's **sync API** (Python), not the async API

If the user specified a feature to test, write a focused Playwright script that:
1. Logs in as the appropriate test account
2. Exercises the golden path for that feature
3. Checks at least one edge/error case
4. Cleans up any test data created (delete created records)

If no feature is specified, run any existing test files in the project.

Common gotchas:
- `button[type=submit]` matches the header logout button first on authed pages — always scope to `main button[type=submit]`
- RSC redirects stream as HTTP 200 with the original URL — check page content, not status code, when probing auth gates
- Never `.click()` a link that triggers a browser alert/confirm dialog — it blocks all subsequent commands

Report: tests run, passed/failed, and paste any failure tracebacks.
