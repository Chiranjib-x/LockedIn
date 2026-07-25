# QUEUE — the agentic loop's work list

`docs/STATE.md` is memory (what happened). **This file is the queue** (what's next),
and it is the only thing `/loop` is allowed to pick work from.

## How to read this file

Two lists, and the distinction is the whole point:

- **AGENT** — items an agent can finish alone, end to end, with a check that
  proves it. `/loop` works these top-down.
- **USER-GATED** — items that need a human: a dashboard login, a phone in hand,
  a payment, a judgement call. `/loop` must **never** attempt these, never
  fake them, and never stall on them. It reports them and moves on.

Item states: `open` → `doing` → `done` | `blocked`.
Only `/loop` (or you) changes a state, and `done` requires the evidence line filled in.

**Item format** — every AGENT item must have a `Done when` that is a command
whose output settles it, or an observation specific enough that two people
would agree. "Improve X" is not an item. "X passes Y" is.

---

## AGENT — work top-down

### A0 · Land or shelve the uncommitted work in the tree
- **State:** open
- **Where:** `apps/{lockedin,campusclubs,campustrade}/modules/marketplace/offer-panel.tsx`, `apps/lockedin/android/gradlew.bat`, untracked `supabase/migrations/0038_drop_contact_pref.sql`, and one throwaway left by the loop's own setup: `apps/vitcompass/__gate_probe.ts.bak` (a deliberate type error used to prove the gate goes red — delete it, it is not source)
- **Why:** the tree is dirty at loop start. A loop that commits on top of unknown edits attributes someone else's change to its own task.
- **Do:** `git diff` each file. If the change is coherent and gated, commit it on its own. If you cannot tell what it is, stop and ask — do not absorb it into another commit. `0038_drop_contact_pref.sql` is **not** yours to apply (see U6); leave it untracked or commit it unapplied with a comment saying so.
- **Done when:** `git status --short` is empty except for deliberate leftovers, each named in STATE.md `## Open items`.
- **Evidence:**

### A1 · Commit an actual E2E suite (the project has zero tests tracked)
- **State:** open
- **Why:** `git ls-files | grep -iE "test|spec|playwright"` returns nothing but two stock Capacitor Java stubs. Every verification this project has ever done was an ad-hoc script that was then deleted. That is why the same bugs recur (⚠ markers in MULTI-APP-PLAN's Launch Gate are all repeats). Tests are the only item here that makes the *other* items cheaper.
- **Do:** add Playwright at the repo root (`npm i -D @playwright/test` at the workspace root, `playwright.config.ts` with a 390×844 project, `baseURL` from env). Write `e2e/smoke.spec.ts` covering, for the mother app: login with the Demo College test account → `/marketplace` renders → `/board` renders → logout completes. Scope selectors to `main` — `button[type=submit]` matches the header logout form first (this has bitten twice; see STATE `## Failed attempts`). Add root script `"test:e2e": "playwright test"`.
- **Done when:** `npx playwright test` passes against a dev server on :3001, and the spec files are tracked by git.
- **Evidence:**

### A2 · Extend the suite to the Launch Gate items that can be automated
- **State:** open
- **Blocked by:** A1
- **Why:** Launch Gate (MULTI-APP-PLAN, 14 points) is prose. Prose checklists rot; specs don't.
- **Do:** turn these Gate points into specs, one file each: #2 refresh-after-mutation (mutate → assert the mounted list updated with no reload), #4 empty/loading/error states (assert an intentional empty state on each list route), #5 mobile 390px **and** 360px (assert `document.documentElement.scrollWidth <= viewport` on each main route), #8 unknown route 404s gracefully. Leave #1/#3/#6/#7/#9–#14 to their own items — several are user-gated.
- **Done when:** `npx playwright test` green, and each spec file names its Gate point in a top-of-file comment.
- **Evidence:**

### A3 · Timezone regression test (Gate #3 — shipped broken twice)
- **State:** open
- **Blocked by:** A1
- **Why:** IST/UTC has been the single most repeated bug class in this repo — render side and parse side, both directions, ⚠×2.
- **Do:** unit-test `packages/lib/ist.ts` (`toIST`/`istNow`/`istTodayISO`/`istParse`) with `TZ=UTC` **and** `TZ=Asia/Kolkata` set, asserting identical results — that asymmetry is exactly what Vercel-vs-dev-machine exposed. Node's built-in test runner is enough; no new dep.
- **Done when:** `TZ=UTC node --test` and `TZ=Asia/Kolkata node --test` both pass with identical output.
- **Evidence:**

### A4 · Capacitor configs for gaterunner and vitcompass
- **State:** open
- **Why:** STATE: "gaterunner/vitcompass have NO capacitor config yet." campusclubs/campustrade shipped the *mother's* config once (738b7d0) and would have loaded the wrong site — the same hole is still open on two apps.
- **Do:** add `apps/gaterunner/capacitor.config.ts` and `apps/vitcompass/capacitor.config.ts` modelled on `apps/campusclubs/capacitor.config.ts`. Each gets its own `appId` (`com.lockedin.gaterunner`, `com.lockedin.vitcompass`), `appName`, `server.url` (`gate.chiranjib.online`, `map.chiranjib.online`), and brand splash. Register the per-app deep-link scheme `com.<app>.campus://auth/callback`.
- **Done when:** each config file's `appId` and `server.url` grepped back and pasted, and no config's `server.url` points at another app's host. Supabase allow-listing of the new schemes is **U4**, not yours.
- **Evidence:**

### A5 · Per-app push notification title
- **State:** open
- **Why:** STATE: "push /api/push/dispatch title still 'LockedIn' (cosmetic)". Four apps, one name in every notification.
- **Do:** derive the title from the `app` field the dispatch route already routes on (`gaterunner`/`clubs`/`trade`/`lockedin`). No schema change — 0063 already carries the routing.
- **Done when:** the title mapping is read back from the route file, and a dispatch for each of the four app values is shown producing its own title.
- **Evidence:**

### A6 · Migration: `posts_community_id_fkey` ON DELETE CASCADE
- **State:** open
- **Why:** STATE `## Done`, logged as NOTED-not-done: deleting a community that has posts errors. Harmless today only because nothing with posts has been deleted yet.
- **Do:** next-numbered migration in `supabase/migrations/`, additive, drop+recreate the FK with `ON DELETE CASCADE`. Per the standing 2026-07-12 permission you may apply migrations without asking. Expand/contract still applies — this one is safe because it removes no column.
- **Done when:** applied, and a probe shows deleting a scratch community with a post succeeds and removes the post; scratch data cleaned up after.
- **Evidence:**

### A7 · Regenerate Android launcher mipmaps from the current brand mark
- **State:** open
- **Why:** STATE `## Facts`: "Android launcher mipmaps still the OLD icon — regenerate at next APK/AAB rebuild."
- **Do:** regenerate from `components/logo.tsx` geometry via the sharp/Pillow tooling noted in STATE. Keep the cream adaptive background `#F6F5F1` and the `#2251C7` foreground already verified in the v1.1 APK.
- **Done when:** the new mipmap PNGs are in the tree and the foreground pixel colour is verified on the generated asset. The AAB rebuild + upload is **U3**.
- **Evidence:**

### A8 · Migrate lockedin's internal imports onto `packages/{ui,lib,auth}`
- **State:** open
- **Why:** Phase 0 deliberately left the mother's imports untouched to keep prod zero-risk. The debt is that a fix to a shared component now has to be made twice — and the four child apps drifted from the mother once already.
- **Do:** move one surface at a time, gate after each: `packages/ui` first (`Card`/`Button`/`Section`/`inputClass`), then `packages/lib` (`ist`, `use-refresh`, `push`), then `packages/auth`. Run the REFERENCE SWEEP from `docs/guardrails/CODE.md` after each move — this is exactly the "changed a symbol, missed a caller" case.
- **Done when:** `node scripts/gate.mjs all --build` passes, and lockedin has no local copy of a module that also exists in `packages/`.
- **Evidence:**

### A9 · N+1 and index review across the shared DB (Gate #11)
- **State:** open
- **Why:** five apps now hit one Postgres. List pages with nested selects are the classic storm, and the cost lands on every app at once.
- **Do:** for each app's main list routes, read the query and record rows-fetched-per-render. Add indexes for the hottest per-app predicates (`college_id` + the app's own filter column). Additive migrations only.
- **Done when:** each hot query has its `EXPLAIN` output pasted showing an index scan, not a seq scan, on the tables that matter.
- **Evidence:**

### A10 · Suite coherence pass (Gate #14) on all five apps
- **State:** open
- **Blocked by:** A2
- **Why:** each child app was forked by subtraction. Subtraction leaves dead links to features the app no longer owns — already found and fixed once on campusclubs (68f4b1c), never checked on the others.
- **Do:** per app, walk every reachable route and find links or buttons pointing at a feature that app doesn't own. Either hide them or convert them to a deep link / store link. Also check the wordmark: campusclubs had "LockedIn" strings left on reachable pages.
- **Done when:** per app, a crawl of reachable routes shows zero links to non-owned features, pasted per app.
- **Evidence:**

### A11 · Phase 5d events overlay — decide, then do or close
- **State:** open
- **Why:** deferred because "events have free-text venues, no coords". It stays on the list forever unless it's decided.
- **Do:** two viable paths — (a) map free-text venues onto `campus_buildings` by fuzzy name at write time with a picker fallback, or (b) close the item as won't-do. Write the choice into STATE `## Decisions` with its reason either way. If the choice needs the user, this becomes user-gated: say so and move on.
- **Done when:** either the overlay ships with venue→building resolution tested, or STATE `## Decisions` carries a dated won't-do line.
- **Evidence:**

### A12 · Make lint fast enough to gate on
- **State:** open
- **Why:** `npx eslint .` did not finish in 130s on `apps/vitcompass` — the app with no `android/` tree, so generated Android output is not the cause. At ~2min × 5 apps, lint is too slow to run every iteration, and a check that gets skipped for being slow is a check you do not have. (Measured on a network-mounted FS; re-measure natively first — it may already be acceptable on your machine.)
- **Do:** time `npx eslint .` natively per app. If it is genuinely slow, the usual causes are type-aware rules pulling the whole TS program, and `globalIgnores` missing generated trees — note `build/**` in the app eslint configs is anchored to the config dir, so `android/app/build/**` is *not* ignored. Add explicit ignores for generated trees, and consider `--cache`.
- **Done when:** `node scripts/gate.mjs all` completes under 3 minutes total, with lint included and no rules disabled to get there.
- **Evidence:**

---

## USER-GATED — `/loop` reports these, never attempts them

Nothing here is a failure of the loop. These need you.

- **U1 · Vercel projects + DNS per app** — create a Vercel project per app (same repo, Root Directory `apps/<name>`, copy env vars) and a Cloudflare CNAME (`gate.`, `clubs.`, `trade.`, `map.`) → vercel, DNS-only. Blocks every deploy item.
- **U2 · Play Console** — $25 account, listing per `docs/playstore/LISTING.md`, data-safety form, upload the AAB.
- **U3 · Re-upload the current APK to the Drive file behind `/download`**, then phone-test domain load + Google round-trip.
- **U4 · Supabase dashboard** — finish Google provider setup (the button is live and errors until then); confirm Site URL = `https://www.chiranjib.online`; re-enable Confirm email now that Resend removes the rate limit; allow-list the new per-app deep-link schemes from A4.
- **U5 · Rotate two leaked credentials** — the Vercel token and the Firebase service-account key, both pasted into chat earlier. Still live as of the last check.
- **U6 · Approve migration 0038** (`DROP profiles.contact_pref`). Written, not applied; the harness safety classifier denied it once. Safe now that prod runs the new build, but it is a destructive DDL and needs your word.
- **U7 · Refine the 17 estimated VIT building coordinates** — 7 of 24 are exact GPS, 17 are estimates. Fix in-app at `/admin/campus`.
- **U8 · Manual phone QA** — the unautomatable set: barcode camera scan, photo upload, two-account realtime chat, UPI QR, Continue-with-Google inside the installed APK.
- **U9 · Monitoring (Gate #12)** — Sentry or equivalent needs an account and a DSN before the wiring can be done.
- **U10 · Launch-day data cleanup** — delete the `gmail.com` seed college and test accounts; re-point Girls' Closet / Boys' Den founding members to real hostel reps.

---

## Loop log

`/loop` appends one line per iteration. Newest last.

<!-- LOOP-LOG -->
