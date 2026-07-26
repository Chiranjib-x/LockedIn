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
- **State:** done
- **Where:** `apps/{lockedin,campusclubs,campustrade}/modules/marketplace/offer-panel.tsx`, `apps/lockedin/android/gradlew.bat`, untracked `supabase/migrations/0038_drop_contact_pref.sql`, and one throwaway left by the loop's own setup: `apps/vitcompass/__gate_probe.ts.bak` (a deliberate type error used to prove the gate goes red — delete it, it is not source)
- **Why:** the tree is dirty at loop start. A loop that commits on top of unknown edits attributes someone else's change to its own task.
- **Do:** `git diff` each file. If the change is coherent and gated, commit it on its own. If you cannot tell what it is, stop and ask — do not absorb it into another commit. `0038_drop_contact_pref.sql` is **not** yours to apply (see U6); leave it untracked or commit it unapplied with a comment saying so.
- **Done when:** `git status --short` is empty except for deliberate leftovers, each named in STATE.md `## Open items`.
- **Evidence:** deleted `apps/vitcompass/__gate_probe.ts.bak` (throwaway type-error probe); committed loop scaffolding (CLAUDE.md ## Autonomous loop, .claude/commands/loop.md, docs/QUEUE.md, scripts/gate.mjs) as edb1ad8. `git status --short` → only `?? supabase/migrations/0038_drop_contact_pref.sql` (deferred per U6, named in STATE ## Open items "DEFERRED DROP").

### A1 · Commit an actual E2E suite (the project has zero tests tracked)
- **State:** done
- **Why:** `git ls-files | grep -iE "test|spec|playwright"` returns nothing but two stock Capacitor Java stubs. Every verification this project has ever done was an ad-hoc script that was then deleted. That is why the same bugs recur (⚠ markers in MULTI-APP-PLAN's Launch Gate are all repeats). Tests are the only item here that makes the *other* items cheaper.
- **Do:** add Playwright at the repo root (`npm i -D @playwright/test` at the workspace root, `playwright.config.ts` with a 390×844 project, `baseURL` from env). Write `e2e/smoke.spec.ts` covering, for the mother app: login with the Demo College test account → `/marketplace` renders → `/board` renders → logout completes. Scope selectors to `main` — `button[type=submit]` matches the header logout form first (this has bitten twice; see STATE `## Failed attempts`). Add root script `"test:e2e": "playwright test"`.
- **Done when:** `npx playwright test` passes against a dev server on :3001, and the spec files are tracked by git.
- **Evidence:** `npx playwright test` → `1 passed (27.2s)` PW_EXIT=0 (webServer auto-started mother dev on :3001; spec drove login→/marketplace(h1 "Marketplace")→/board(h1 "Campus board")→/profile logout→/login). `git ls-files` tracks `e2e/smoke.spec.ts` + `playwright.config.ts`. Commit 27e2e6c. Root `test:e2e` script added; selectors scoped to `main`.

### A2 · Extend the suite to the Launch Gate items that can be automated
- **State:** done
- **Blocked by:** A1
- **Why:** Launch Gate (MULTI-APP-PLAN, 14 points) is prose. Prose checklists rot; specs don't.
- **Do:** turn these Gate points into specs, one file each: #2 refresh-after-mutation (mutate → assert the mounted list updated with no reload), #4 empty/loading/error states (assert an intentional empty state on each list route), #5 mobile 390px **and** 360px (assert `document.documentElement.scrollWidth <= viewport` on each main route), #8 unknown route 404s gracefully. Leave #1/#3/#6/#7/#9–#14 to their own items — several are user-gated.
- **Done when:** `npx playwright test` green, and each spec file names its Gate point in a top-of-file comment.
- **Evidence:** `npx playwright test --workers=1` → `6 passed (1.9m)` PW_EXIT=0. Four new specs, each names its Gate point in a top comment: gate5-mobile-overflow (#5, 390+360 scrollWidth<=clientWidth on 5 main routes), gate8-unknown-route (#8, /bogus → 404), gate4-empty-states (#4, no-match /search → "Nothing on campus for"), gate2-refresh (#2, gate cancel → useRefresh removes card, URL unchanged). Debug: gate2 flaked in-suite (reload hit /login) — root cause = smoke's logout is a Supabase GLOBAL signOut invalidating the shared user; fixed by giving smoke its own user (test.boy). Commit 454a253. NOTE: gate2 leaves one 'cancelled' scratch pickup per run (filtered from all queries, inert).

### A3 · Timezone regression test (Gate #3 — shipped broken twice)
- **State:** done
- **PLAN CHANGE (2026-07-25):** assumed all 4 fns in packages/lib/ist.ts; actually only istParse is there — toIST/istNow/istTodayISO/istParse live in apps/lockedin/modules/timetable/helpers.ts (pure, no imports; duplicated across the 4 forked apps + a partial copy in packages/lib/ist.ts). Revised: test both files where the code actually is. istParse duplication flagged for A8.
- **Blocked by:** A1
- **Why:** IST/UTC has been the single most repeated bug class in this repo — render side and parse side, both directions, ⚠×2.
- **Do:** unit-test `packages/lib/ist.ts` (`toIST`/`istNow`/`istTodayISO`/`istParse`) with `TZ=UTC` **and** `TZ=Asia/Kolkata` set, asserting identical results — that asymmetry is exactly what Vercel-vs-dev-machine exposed. Node's built-in test runner is enough; no new dep.
- **Done when:** `TZ=UTC node --test` and `TZ=Asia/Kolkata node --test` both pass with identical output.
- **Evidence:** `TZ=UTC node --test packages/lib/ist.test.ts apps/lockedin/modules/timetable/helpers.test.ts` → `tests 5, pass 5, fail 0`; `TZ=Asia/Kolkata …` → `tests 5, pass 5, fail 0`. Root `test:ist` script added. lockedin typecheck PASS after excluding `*.test.ts` (Node type-stripping needs the .ts import extension; next-build tsc rejected it — TS5097). Commit b4df691. NOTE: lockedin lint is red on 17 PRE-EXISTING react/no-unescaped-entities errors (proven via stash: identical 18 problems on clean tree, typecheck PASS) — not from A3; filed as A13.

### A4 · Capacitor configs for gaterunner and vitcompass
- **State:** done
- **Why:** STATE: "gaterunner/vitcompass have NO capacitor config yet." campusclubs/campustrade shipped the *mother's* config once (738b7d0) and would have loaded the wrong site — the same hole is still open on two apps.
- **Do:** add `apps/gaterunner/capacitor.config.ts` and `apps/vitcompass/capacitor.config.ts` modelled on `apps/campusclubs/capacitor.config.ts`. Each gets its own `appId` (`com.lockedin.gaterunner`, `com.lockedin.vitcompass`), `appName`, `server.url` (`gate.chiranjib.online`, `map.chiranjib.online`), and brand splash. Register the per-app deep-link scheme `com.<app>.campus://auth/callback`.
- **Done when:** each config file's `appId` and `server.url` grepped back and pasted, and no config's `server.url` points at another app's host. Supabase allow-listing of the new schemes is **U4**, not yours.
- **Evidence:** grep of all 5 configs — appId: com.lockedin.{campus,gaterunner,campusclubs,campustrade,vitcompass}; server.url: www|gate|clubs|trade|map.chiranjib.online; cross-host check = "all self-hosted ✓". Both new configs are plain objects (no @capacitor/cli dep); gaterunner+vitcompass typecheck PASS. Commit 59b316f. Deep-link scheme registration is native (cap-add) + U4. NOTE: gaterunner+vitcompass lint pre-existing-red (vitcompass campus-map.tsx:195 setState-in-effect; capacitor.config.ts clean) → rolled into A13.

### A5 · Per-app push notification title
- **State:** done
- **Why:** STATE: "push /api/push/dispatch title still 'LockedIn' (cosmetic)". Four apps, one name in every notification.
- **Do:** derive the title from the `app` field the dispatch route already routes on (`gaterunner`/`clubs`/`trade`/`lockedin`). No schema change — 0063 already carries the routing.
- **Done when:** the title mapping is read back from the route file, and a dispatch for each of the four app values is shown producing its own title.
- **Evidence:** PLAN CHANGE — the route received no `app` field (only message/link/nid/subs); 0063 computes the routed app but didn't pass it. Migration 0066 adds `'app', preferred` to the pg_net body (applied; `pg_get_functiondef` includes `'app', preferred` = true, function-only, no table change). New pure `app/api/push/title.ts` `titleFor(app)` → GateRunner/CampusClubs/CampusTrade/LockedIn (default LockedIn); route.ts imports it for web-push + FCM titles. `npm run test:unit` → tests 7, pass 7 (title: 4 values + fallback). lockedin typecheck PASS. Commit e99d5a1. NOTE: activates in prod on next deploy; fork dispatch routes are dormant copies (pg_net targets the lockedin alias only).

### A6 · Migration: `posts_community_id_fkey` ON DELETE CASCADE
- **State:** done
- **Why:** STATE `## Done`, logged as NOTED-not-done: deleting a community that has posts errors. Harmless today only because nothing with posts has been deleted yet.
- **Do:** next-numbered migration in `supabase/migrations/`, additive, drop+recreate the FK with `ON DELETE CASCADE`. Per the standing 2026-07-12 permission you may apply migrations without asking. Expand/contract still applies — this one is safe because it removes no column.
- **Done when:** applied, and a probe shows deleting a scratch community with a post succeeds and removes the post; scratch data cleaned up after.
- **Evidence:** PLAN CHANGE — FK was already SET NULL (0060), not RESTRICT; the "deletion errors" premise was already fixed, so this is the orphan→cascade cleanup the item's CASCADE directive wants. All child FKs of posts (event_rsvps/checkins/feedback, post_claims) verified CASCADE, so no RESTRICT in the chain. 0067 applied: `confdeltype` → CASCADE. Probe (rolled back): inserted scratch community + a post (type 'event'), deleted the community → `post cascaded away: true, community gone: true`. Commit 0f0aa2a.

### A7 · Regenerate Android launcher mipmaps from the current brand mark
- **State:** done
- **Why:** STATE `## Facts`: "Android launcher mipmaps still the OLD icon — regenerate at next APK/AAB rebuild."
- **Do:** regenerate from `components/logo.tsx` geometry via the sharp/Pillow tooling noted in STATE. Keep the cream adaptive background `#F6F5F1` and the `#2251C7` foreground already verified in the v1.1 APK.
- **Done when:** the new mipmap PNGs are in the tree and the foreground pixel colour is verified on the generated asset. The AAB rebuild + upload is **U3**.
- **Evidence:** regenerated 18 PNGs (6 densities × ic_launcher/ic_launcher_round/ic_launcher_foreground) from logo.tsx geometry via sharp. Foreground = cobalt flame-key on transparent (adaptive 108dp safe zone, frac 0.44); legacy/round on cream #F6F5F1. Verified: xxxhdpi foreground center pixel = (34,81,199) = #2251C7; 5503 cobalt + 181142 transparent px. Legacy ic_launcher visually confirmed (cream + cobalt mark). Background stays @color/ic_launcher_background #F6F5F1. `git ls-files mipmap-*/*.png` = 18. Commit 26f295a. AAB rebuild = U3.

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
- **State:** done 2026-07-26 — no work needed; the original 130s measurement was on a network-mounted FS, as the item itself suspected. Measured natively: lint completes in **~5.8s per app**, and a full `node scripts/gate.mjs <app>` (typecheck + lint) in well under 30s. Five apps gate in ~2 min total, inside the item's 3-minute bar, with lint included and no rules disabled to get there.
- **Why:** `npx eslint .` did not finish in 130s on `apps/vitcompass` — the app with no `android/` tree, so generated Android output is not the cause. At ~2min × 5 apps, lint is too slow to run every iteration, and a check that gets skipped for being slow is a check you do not have. (Measured on a network-mounted FS; re-measure natively first — it may already be acceptable on your machine.)
- **Do:** time `npx eslint .` natively per app. If it is genuinely slow, the usual causes are type-aware rules pulling the whole TS program, and `globalIgnores` missing generated trees — note `build/**` in the app eslint configs is anchored to the config dir, so `android/app/build/**` is *not* ignored. Add explicit ignores for generated trees, and consider `--cache`.
- **Done when:** `node scripts/gate.mjs all` completes under 3 minutes total, with lint included and no rules disabled to get there.
- **Evidence:**

### A13 · Fix pre-existing react/no-unescaped-entities lint errors (gate is red)
- **State:** done 2026-07-26 — **ALL FIVE APPS GREEN** (`node scripts/gate.mjs <app>` → PASS on lockedin, campusclubs, campustrade, gaterunner, vitcompass). 17 errors/fork → 0. Real fixes for every reactivity issue (useSyncExternalStore for SSR'd browser-state reads, rAF-deferred animation starts, derived-not-mutated day separators, counter-based optimistic ids, ref writes moved into effects, dropped a redundant state). Three sites keep a one-line documented `react-hooks/purity` exemption: two are Server Components where a request-time clock read is correct Next.js, one is a poll close-time check where the alternative is a per-poll timer. `npx playwright test` → 6 passed after the refactor (it touched chat, theme, notifications, scanner).
- **Superseded note (kept for history):** partially done 2026-07-26 — **vitcompass + gaterunner are GREEN**; the mother + 2 forks are a bigger, riskier job than this item assumed (see Scope correction) and need a decision before proceeding.
- **Scope correction (measured, not estimated):** `apps/lockedin` has **17 errors across ~12 files in FOUR rule classes**, not one: `react-hooks/set-state-in-effect` ×6 files (`theme-toggle.tsx`, `pwa.tsx`, `confetti.tsx`, `count-up.tsx`, `share-button.tsx`, `push-opt-in.tsx`), "Cannot call impure function during render" ×2 (`board/[id]/page.tsx:49`, `subscriptions/[id]/page.tsx:50`), "Cannot reassign variable after render completes" ×1 (`notifications/page.tsx:84`), and `react/no-unescaped-entities` ×1 (`study-groups/page.tsx:34`). campusclubs + campustrade are forks of the same files, so the true job is ~51 fixes across 3 apps — in code that is deployed and working.
- **Evidence (this item's real progress):** `node scripts/gate.mjs vitcompass` → `GATE PASS — 1 app(s), 2 check(s)`; `node scripts/gate.mjs gaterunner` → `GATE PASS — 1 app(s), 2 check(s)`. Both fixed properly, no rule disabled: vitcompass's checklist init became a lazy `useState` initialiser (panel only mounts after a tap, so it never SSRs); gaterunner's push opt-in moved to `useSyncExternalStore` with a `false` server snapshot (it DOES render on the server, so a lazy initialiser would hydration-mismatch).
- **Decision needed before the rest:** rewriting the mother's theme toggle, PWA install prompt, and animation components ×3 forks is a real-regression risk for zero user-facing gain, on a day the apps went live. Options: (a) leave the mother+forks lint-red and keep gating them with `--no-lint` (status quo, zero risk); (b) do it in a dedicated session with an E2E pass per component; (c) fix only the two non-cosmetic classes (impure-call, reassign-after-render) and leave the setState-in-effect ones. Recommend (b) — later, not on launch day.
- **Why:** the lint gate is pre-existing-red on EVERY app (typecheck is green on all). lockedin/campusclubs/campustrade: 17 `react/no-unescaped-entities` (fork copies of the same JSX). gaterunner: react errors too. vitcompass: `setState synchronously within an effect` at campus-map.tsx:195. Surfaced while gating A3/A4. A red lint gate means the loop cannot cleanly gate any app it touches.
- **Do:** per rule — escape bare `'`/`"`/`’` in JSX (`&apos;`/`&rsquo;`/`&quot;` or `{"…"}`); for the vitcompass setState-in-effect, guard/restructure the localStorage init (it's a benign one-time read, but satisfy the rule without disabling it). Style/structure only, no behavior change. Fix each app, gate after each.
- **Done when:** `node scripts/gate.mjs <app>` passes lint (0 errors) for every app, pasted per app.
- **Evidence:**

### A14 · gaterunner: redirect an already-authenticated user away from /login and /signup
- **State:** open
- **Why:** FINDINGS F10 — `app/page.tsx` redirects a logged-in user to `/gate`; `app/login/page.tsx` and `app/signup/page.tsx` don't have the equivalent guard, so a bookmark/back-button visit shows the auth form under a "Log out" header.
- **Do:** add `if (user) redirect("/gate")` (same pattern as the landing page) to the top of both pages. Check whether lockedin/campusclubs/campustrade's `/login`+`/signup` have the same gap while touching this (F10 only confirmed it in gaterunner).
- **Done when:** a Playwright probe — real login, then `page.goto("/login")` and `page.goto("/signup")` — lands on `/gate` (or each app's home route) both times, pasted per app touched.
- **Evidence:**

### A15 · gaterunner: pending/error state on gate lifecycle action buttons
- **State:** open
- **Why:** FINDINGS F11 — `RunnerActions`/`RequesterActions` in `modules/gate/client.tsx` ("Dropped it off ✓", "Can't make it", "Received it ✓", "Cancel") mutate with no busy flag and no error surface, unlike `ClaimButton`/`RunnerNote` in the same file.
- **Do:** add the same `useState` busy pattern already used by `ClaimButton`; have `markDroppedOff`/`confirmDelivered`/`cancelPickup` in `modules/gate/actions.ts` return the Supabase error (or a boolean) instead of discarding it, and show it inline on failure.
- **Done when:** clicking each button disables it until the action resolves, and a forced failure (e.g. stale row) shows a message instead of silently no-op'ing — demonstrated in a Playwright spec or pasted manual run.
- **Evidence:**

### A16 · Tap-target pass: gaterunner pill buttons + vitcompass map markers/chips
- **State:** open
- **Why:** FINDINGS F12 — several controls measure under the 44×44px mobile tap-target guideline: gaterunner's "Cancel" (30px), "I'm heading to the gate" (34px), "＋ My delivery" link (36px); vitcompass's building markers (18×18px, the app's primary interaction) and category chips (30px).
- **Do:** bump the gaterunner buttons to `min-h-11` (matches `ClaimButton`/`RunnerNote` convention already in the same file). For vitcompass markers, grow the invisible hit-area without growing the visual dot (dense-map overlap risk) — look at `vc_map_initial_390.png` before picking a size.
- **Done when:** the `getBoundingClientRect` sub-44px sweep (`button, a` filtered `h<44 || w<44`) returns empty on `/gate` and vitcompass's `/` at both 390×844 and 360×800, pasted.
- **Evidence:**

### A17 · vitcompass: empty state for zero-building colleges + token-based marker colours
- **State:** open
- **Why:** FINDINGS F13 — `campus-map.tsx` has no `buildings.length === 0` branch (silently renders an empty map), and the six category marker colours are raw hex instead of referencing the `@theme` tokens (`academic`'s `#2251c7` duplicates the documented brand-cobalt token).
- **Do:** add a "no buildings mapped yet" message gated on `buildings.length === 0`. For colours, since markers are imperative DOM (`document.createElement`, not JSX/Tailwind), read the values via `getComputedStyle(document.documentElement).getPropertyValue(...)` or inline `var(--color-x)` in the `cssText` — needs the actual token names from `app/globals.css` `@theme`, not a blind hex swap.
- **Done when:** rendering with `buildings=[]` shows the message (test by stubbing the query), and `grep -c '#[0-9a-fA-F]\{6\}' apps/vitcompass/components/campus-map.tsx` is 0.
- **Evidence:**

### A20 · Whole-app Y3 label pass (unlabeled inputs, repo-wide)
- **State:** open
- **Why:** FINDINGS F4 has been extended by three separate beats now (B1 auth, B12 gaterunner, B6/B8 daily-life+timetable) without ever getting its own queue item — each beat found more unlabeled inputs and the fix note has said "do the whole Y3 class in one pass, not per-beat" since B1. Left per-beat, it never gets fixed.
- **Do:** `node scripts/sweep.mjs <app> --id=Y3 --json` per app, add `aria-label` (smallest change) or wrap in `<label htmlFor>` for every hit. Known sites so far: auth pages (all 4 apps), `apps/gaterunner/modules/gate/client.tsx:17,82`, `app/cabs/page.tsx:59,65`, `modules/subscriptions/discovery.tsx:36`, `modules/communities/boxes.tsx:29,123,129`, `modules/showcase/forms.tsx:16,18,19`, `modules/timetable/attendance-marker.tsx:68` — plus whatever the full per-app sweep turns up outside beats already walked.
- **Done when:** `node scripts/sweep.mjs <app> --id=Y3` returns 0 hits for every app, pasted per app.
- **Evidence:**

### A21 · Truthiness-on-zero cleanup (FINDINGS F31)
- **State:** open
- **Why:** FINDINGS F31 — three small `0`-is-falsy bugs in B6: `modules/communities/actions.ts:404` (`addBoxItem` coerces an explicit quantity of `0` to `1`), `modules/groupbuy/client.tsx:32` (share amount input visually blanks at `0`), `modules/subscriptions/actions.ts:22` (rejects `total_cost = 0` as "required"). None are data-breaking, all match the CLAUDE.md "zero is data" iron rule.
- **Do:** `addBoxItem` — `Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 1` instead of `Math.floor(quantity) || 1`. `JoinForm` — decide whether a literal-zero display matters enough to fix (e.g. track a separate "touched" flag) or close as intentional. `createSubscription` — switch to an explicit `total == null || Number.isNaN(total)` check, or confirm rejecting `0` is deliberate product behaviour and close as won't-fix.
- **Done when:** each of the three sites either has a passing before/after example pasted (input `0` → stored `0`), or a dated won't-fix note in STATE `## Decisions` for the ones that are deliberate.
- **Evidence:**

### A30 · `/admin/showcase` empty state for Toolbox/Deals lists
- **State:** open
- **Why:** FINDINGS F40 — `app/admin/showcase/page.tsx` renders nothing but the create-form when a college has 0 showcase items / 0 merchants, unlike the sibling `/admin/campus` CMS which already has "No buildings yet — add the first one above."
- **Do:** add the same short empty-state message under each of the two sections (`items?.length === 0` / `merchants?.length === 0`). Byte-identical file in campusclubs/campustrade — fix all three in one commit.
- **Done when:** a moderator account with 0 showcase items and 0 merchants sees an explicit "nothing here yet" message under each section, pasted per app.
- **Evidence:**

### A31 · Pending/error state on moderation-queue and campus-CMS delete buttons
- **State:** open
- **Why:** FINDINGS F41 — `modules/moderation/mod-actions.tsx`'s `ReportActions` (Dismiss/Remove content/Ban user) and `modules/campus/admin-client.tsx`'s `BuildingRow` Delete button mutate with no busy flag and no error surfaced, same class as F11/A15 (gaterunner). The four underlying server actions (`dismissReport`/`removeContent`/`banUser`/`deleteBuilding`) also discard their Supabase/RPC error today.
- **Do:** wire the same `useState` busy pattern `ReportSheet` already uses two files over; return the error string from each server action instead of discarding it, and show it inline on failure. `mod-actions.tsx` is byte-identical across lockedin/campusclubs/campustrade — fix all three; `admin-client.tsx` is lockedin-only.
- **Done when:** clicking each button disables it until the action resolves, and a forced 0-row update (e.g. a report another moderator already actioned) shows a message instead of silently no-op'ing — demonstrated in a Playwright spec or pasted manual run.
- **Evidence:**

### A32 · Header unread-notification badge staleness on the /notifications visit itself
- **State:** open
- **Why:** FINDINGS F42 — `components/header.tsx`'s `NotificationBell` runs an independent `read = false` count with no ordering guarantee against `app/notifications/page.tsx`'s own mark-all-read update in the same navigation; live-verified showing a stale "2" badge on the very page that just marked those two notifications read. Self-heals on the next navigation — low priority.
- **Do:** either have the page's mark-read update run in a step the layout can also await, or move the badge count into a client component that revalidates off the same server action rather than an independent RSC query. Byte-identical in campusclubs/campustrade — fix all three if picked up.
- **Done when:** the badge count on the page that visits `/notifications` matches the post-mark-read DB state within that same render, demonstrated with a before/after count pasted.
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
2026-07-25 · A0 · done · edb1ad8 · landed /loop scaffolding, deleted gate probe, 0038 left untracked
2026-07-25 · A1 · done · 27e2e6c · root Playwright smoke (login→marketplace→board→logout) 1 passed 27.2s
2026-07-25 · A2 · done · 454a253 · automated Gate #2/#4/#5/#8 specs; 6 passed; fixed shared-user global-signout interference
2026-07-25 · A3 · done · b4df691 · IST TZ-regression unit tests (node:test) 5/5 under TZ=UTC and TZ=Asia/Kolkata; filed A13 (pre-existing lint)
2026-07-25 · A4 · done · 59b316f · capacitor configs for gaterunner+vitcompass; all 5 apps self-hosted; typecheck PASS
2026-07-25 · A5 · done · e99d5a1 · per-app push title (0066 passes app; titleFor 4/4); test:unit 7/7; activates on deploy
2026-07-25 · A6 · done · 0f0aa2a · posts.community_id FK SET NULL→CASCADE (0067); probe: community-delete cascades post
2026-07-25 · A7 · done · 26f295a · regenerated 18 launcher mipmaps from brand mark; foreground #2251C7 verified
2026-07-25 · LOOP PAUSED by user after A7 ("stop after this and push"). Next open: A8. Actionable remain: A8-A13.
2026-07-26 · A13 (partial) · 8af4385.. · vitcompass + gaterunner gates now fully green (typecheck+lint); mother+2 forks measured at ~51 fixes in 4 rule classes across deployed components — stopped for a decision rather than rewriting live theme/PWA/animation code on launch day
2026-07-26 · A13 · done · (this commit) · all five apps green on typecheck+lint; 17 errors/fork -> 0; 6 E2E passed after the refactor
2026-07-26 · A12 · done · (this commit) · lint measured at ~5.8s/app natively — the 130s figure was a network-FS artifact; no config change needed
