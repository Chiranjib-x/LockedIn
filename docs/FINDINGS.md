# FINDINGS — the bug-hunt ledger

`docs/QUEUE.md` is planned work. **This file is discovered work** — what `/hunt`
found, what it triaged, and what it did about it.

## Severity

| | meaning | who fixes |
|---|---|---|
| **P0** | data loss, data leak, crash, security/tenancy hole | `/hunt` fixes in-loop |
| **P1** | a user-facing flow is broken or silently wrong | `/hunt` fixes in-loop |
| **P2** | degraded — slow, ugly, inaccessible, confusing | filed to QUEUE, not fixed in-loop |
| **P3** | polish | filed to QUEUE, not fixed in-loop |

A finding is `open` → `confirmed` | `dismissed` → `fixed`.
**`dismissed` is a first-class outcome** and must carry a reason. Most static
hits are false positives; recording *why* one was dismissed is what stops the
next sweep from re-raising it.

## Fork echo

`lockedin`, `campusclubs`, and `campustrade` are forks sharing ~100 near-identical
module files. **Every confirmed finding must be checked in the other two forks
before it is closed.** A fix landed in one fork and not the others is not a fix —
it is new drift. Record the echo check on the finding.

---

## Coverage — which beats have been swept

A beat is one feature surface. `/hunt` works them in order and never claims a
beat it has not actually walked.

| # | Beat | Surfaces | Last swept | Findings |
|---|---|---|---|---|
| B1 | auth | login, signup, logout, OAuth return, delete-account, middleware | 2026-07-26 | none (F4 filed, D4/D5 dismissed) |
| B2 | marketplace | listings, new, mine, requests, offers, saved | — | — |
| B3 | chat | threads, realtime, unread, contact flows | partial (static only) | F1 |
| B4 | board & events | posts, events, RSVP, check-in, feedback | — | — |
| B5 | communities | clubs, teams, applications, roles, ops, money, polls | — | — |
| B6 | daily life | cabs, group-buy, subscriptions, toolbox, deals, boxes | — | — |
| B7 | spaces & matching | spaces, vouching, matches, prefs, crews | — | — |
| B8 | timetable | timetable, attendance, free-slot finder | — | — |
| B9 | notifications | in-app, push routing, scheduled posts | — | — |
| B10 | admin & moderation | moderation queue, campus CMS, showcase | — | — |
| B11 | shell | header, bottom nav, search, home, landing, error/404/offline | partial (static only) | F2 dismissed (see `## Dismissed`); F20 filed |
| B12 | gaterunner | the whole app (5 pages) | — | — |
| B13 | vitcompass | the whole app (map) | — | — |

---

## Open findings

### F1 · Chat day labels render in server timezone
- **Severity:** P1 · **Axis:** correctness · **State:** confirmed
- **Detector:** C1, plus manual read
- **Where:** `modules/chat/thread.tsx:11-19` (`dayLabel`) and `:116`; same file in all three forks. Also `app/notifications/page.tsx:48`.
- **What:** `dayLabel` builds `new Date(iso)`, compares with `toDateString()`, and formats with `toLocaleDateString("en-IN", { day, month })` — no `timeZone`. `toDateString()` and the formatter both resolve in the *server* timezone. Vercel is UTC.
- **Impact:** a message sent 00:00–05:30 IST is stamped with the previous day, and the "Today" / "Yesterday" separators are wrong for that window. This is the Launch Gate #3 bug class, which this project has already shipped twice.
- **Fork echo:** present in lockedin, campusclubs, campustrade (identical code).
- **Fix:** route through `packages/lib/ist.ts` — compare IST day keys rather than `toDateString()`, and pass `timeZone: "Asia/Kolkata"` to the formatter. The A3 unit tests already cover `ist.ts` under both `TZ=UTC` and `TZ=Asia/Kolkata`; extend them to `dayLabel`.
- **Evidence:**

### F20 · CampusClubs still ships the mother's marketplace/chat routes, unlinked but live
- **Severity:** P2 · **Axis:** correctness/product · **State:** open
- **Detector:** manual read, surfaced while confirming F2's `header.tsx` dismissal (see `## Dismissed`)
- **Where:** `apps/campusclubs/app/{marketplace,board,group-buy,cabs,subscriptions,search,toolbox,deals,admin/showcase}/**`, plus `modules/{matcher,requests}/**`
- **What:** `docs/MULTI-APP-PLAN.md:122-128` (Phase 3) claims CampusClubs was "Stripped to clubs-only" and that a coherence pass removed chat "Message buttons... chat is Trade's." In the actual tree, none of that happened below the nav/header layer: `/marketplace`, `/board`, `/group-buy`, `/cabs`, `/subscriptions`, `/search`, `/toolbox`, `/deals`, `/admin/showcase` are all still present, fully wired, and unguarded (no `notFound()`/redirect — confirmed on `app/marketplace/page.tsx` + `middleware.ts`). At least `marketplace/[id]`, `group-buy/[id]`, `cabs/[id]`, `subscriptions/[id]`, `search`, `modules/board/actions.ts`, and `modules/requests/request-card.tsx` still render a working "Message" button calling `openChat`, contradicting the documented removal. None of these routes are linked from `bottom-nav.tsx`, `header.tsx`, or (repo-grepped) anywhere else in the app — reachable only via a direct URL, bookmark, or search-engine hit.
- **Impact:** a CampusClubs user who lands on one of these URLs gets a fully working marketplace + 1:1 chat inside what is supposed to be a clubs-only app — a product-identity inconsistency, not a tenancy hole (RLS scoping is unaffected either way).
- **Fix:** already covered by `docs/QUEUE.md` A10 ("Suite coherence pass... walk every reachable route and find links or buttons pointing at a feature that app doesn't own"). Not fixed here — outside F2's scope.
- **Evidence:** `grep -rln "/admin/showcase"` inside `apps/campusclubs` → only the route's own `actions.ts`, zero other UI references; `grep -rln "openChat\|Message"` across `apps/campusclubs/app` and `modules` → hits pasted above, none behind nav.

### F3 · `li-theme` localStorage key kept by both forks
- **Severity:** P3 · **Axis:** correctness · **State:** confirmed
- **Where:** `app/layout.tsx:34` in campusclubs and campustrade
- **What:** both forks kept the mother's `li-theme` key; `gaterunner` correctly uses `gr-theme`.
- **Impact:** none today — the apps sit on different subdomains, so localStorage is already origin-isolated. Pure drift, filed so it is not rediscovered every sweep.
- **Fix:** rename to `cc-theme` / `ct-theme` when next touching those files. Not worth its own commit.
- **Evidence:**

---

### F4 · Auth inputs have no labels (placeholder-only)
- **Severity:** P3 · **Axis:** a11y · **State:** confirmed
- **Detector:** Y3 (148 hits repo-wide; auth surface = 3 in each fork)
- **Where:** `app/login/page.tsx:31-32`, `app/signup/page.tsx:30-32` — all 4 apps
- **What:** inputs carry `placeholder` + `name` but no `<label htmlFor>`/`aria-label`. Placeholder vanishes on focus and is not a reliable accessible name.
- **Impact:** screen-reader users get "edit text, blank"; no label tap-target. Not a broken flow — filed, not fixed in-loop.
- **Fork echo:** identical in lockedin/campusclubs/campustrade/gaterunner.
- **Fix:** `aria-label` on each input (smallest change), or wrap in `<label>`. Do the whole Y3 class in one pass, not per-beat.
- **Evidence:**

## Dismissed

Findings the sweep raised and a human or agent ruled out. Keep these — they are
what stops the next sweep re-litigating settled ground.

### D1 · C8 on `colleges`, `messages`, `conversation_participants`, `blocks`
- **Detector:** C8 (table without `college_id`)
- **Why dismissed:** `colleges` *is* the tenancy root — it cannot have a `college_id`. Chat tables (`messages`, `conversation_participants`) and `blocks` scope through their parent conversation / user rather than a college column. **Not yet verified** — this dismissal is provisional and B3 must confirm the chat tables really are isolated before it stands.

### D3 · Fork drift on `components/google-auth-button.tsx`
- **Detector:** `--fork`
- **Why dismissed:** the only difference is the OAuth `redirectTo` scheme, which
  is *supposed* to differ per app. Verified aligned across all three sources of
  truth: `capacitor.config.ts` `appId` == `redirectTo` == `AndroidManifest.xml`
  `android:scheme`, for campus / campusclubs / campustrade / gaterunner. The
  normaliser was over-collapsing app names inside the identifier; fixed in
  `sweep.mjs` (`com.x.y` → `@appid` before the generic app-name rule), so this
  no longer raises.
- **Worth knowing:** these four schemes are what Supabase must allow-list
  (QUEUE U4). If that list and these values ever diverge, OAuth breaks inside
  the installed APK and *only* there — it will look fine on web.

### D2 · C2 across the board — 0 hits after tightening
- **Detector:** C2 (datetime-local parsed in server tz)
- **Why dismissed:** not a dismissal so much as an all-clear. The write-side IST fix (`istParse`) is in place — 42 uses across 13 files in the mother app. C2 now exists as a *regression guard*: if it ever fires again, a new form skipped `istParse`.

---

### D4 · C4 on `themeInit` catch — all 4 apps
- **Detector:** C4 (silently swallowed error)
- **Why dismissed:** deliberate. `localStorage.getItem` throws in private-browsing/blocked-cookie modes; the empty catch leaves the class untoggled so the page falls back to the `prefers-color-scheme` default. Nothing to surface to a user — the documented legitimate case in C4's own `fix:` note.

### D5 · B1 auth logic — read + run + fork echo, no defects
- **Swept:** `app/auth/actions.ts` (signup/login/logout/deleteAccount), `middleware.ts` (OAuth `/?code=` safety net), `lib/supabase/middleware.ts`, `app/auth/callback|confirm/route.ts`, `lib/auth.ts` `requireUser`, `delete_my_account()` (0050).
- **Why clean:** signup pre-checks the domain *and* defers to the `handle_new_user` trigger as the real trust boundary; `delete_my_account()` is definer + hard-scoped to `auth.uid()`, granted to `authenticated` only, revoked from `public, anon`; callback/confirm both fail closed to `/login?error=`. Run pass at 390px: wrong password → "Invalid login credentials", unregistered domain → "Use your college email — that domain isn't registered", empty submit blocked, logged-out `/delete-account` shows the login CTA. No raw DB errors leaked, no console errors, no overflow.
- **Fork echo:** `auth/actions.ts` + `middleware.ts` byte-identical in lockedin/campusclubs/campustrade; gaterunner differs only by `@suite/auth/server` import and `/gate` vs `/home` landing — both correct.
- **Note:** the "any email can log in" report was NOT an auth defect — it was the `gmail.com` dev-seed college row (fixed by migration 0066, awaiting user apply).

### F2 · Fork drift in four shared shell files — all four ruled legitimate
- **Detector:** `sweep.mjs --fork`
- **Where:** `components/bottom-nav.tsx`, `components/header.tsx`, `components/nav-link.tsx`, `lib/push/client.ts` (lockedin/campusclubs/campustrade)
- **Why dismissed:** read all three versions of each file plus exact `diff`s (not just the sweep's normalised hashes). No fix-in-one-fork-only pattern found in any of the four:
  - **`bottom-nav.tsx`** — `diff` between lockedin and campustrade is empty (byte-identical). campusclubs is genuinely clubs-only (Home·Clubs·[+ start club]·Events·Profile, no Chat tab) per `docs/MULTI-APP-PLAN.md:122-128` ("Stripped to clubs-only... chat is Trade's"), a documented, deliberate Phase 3 design choice, not an accidental omission.
  - **`nav-link.tsx`** — lockedin/campustrade identical (`diff` empty). campusclubs only *adds* `clubs`/`events` icon keys, required by its own `bottom-nav.tsx` usage — a pure superset, no behavioural change to the shared keys.
  - **`header.tsx`** — lockedin vs campustrade differ only in the wordmark string (already normalised out by the sweep's brand-name rule). campusclubs additionally omits the `Wrench` "Toolbox and Deals admin" link and points its search icon at `/communities` ("Find clubs") instead of `/search`. Verified both omitted targets (`/admin/showcase`, `/search`) still exist as live, unguarded routes in campusclubs, but are linked from **no other UI surface either** (`grep -rln "/admin/showcase"` and `grep -rln '"/search"'` across `apps/campusclubs` return zero hits outside the routes' own files) — consistent with the documented clubs-only nav, not a dropped link. (The underlying orphaned-routes situation is real but belongs to a different finding: filed as **F20**, and already covered by QUEUE A10.)
  - **`lib/push/client.ts`** — exact `diff` across all three shows the *only* difference is the `p_app` RPC argument: campusclubs passes `p_app: "clubs"`, campustrade passes `p_app: "trade"`, lockedin passes neither. Read `supabase/migrations/0063_push_routing.sql:13-14,28`: `save_push_subscription`'s `p_app` parameter is `default 'lockedin'`, and the insert does `coalesce(nullif(trim(p_app), ''), 'lockedin')` — so lockedin omitting the arg is functionally identical to explicitly passing `p_app: "lockedin"`. This is exactly the "3-arg shape... default fills — zero version skew" behaviour the migration's own comment documents. Not a bug, and the per-app value is exactly the thing the parent brief said *should* differ.
- **Config-lift note:** the two campusclubs-specific header targets and the nav tab set both stem from one fact — CampusClubs doesn't surface toolbox/deals/global-search in its primary nav. Collapsing that into a shared per-app nav-config would touch both files' control flow (not just a constant), so it isn't "cheap" — left as-is per instructions not to force-converge deliberately-different files.
- **Fork echo:** N/A — nothing to converge; all four differences are either byte-identical pairs or intentional per-app behaviour.

## Hunt log

`/hunt` appends one line per iteration. Newest last.

<!-- HUNT-LOG -->
2026-07-26 · B1 auth · 0 confirmed P0/P1 of 3 raised · (no fix commit) · auth logic clean across 4 apps; F4 a11y filed, D4/D5 dismissed; "any email" was the gmail seed row (0066), not auth
2026-07-26 · F2 fork drift · 0 confirmed of 4 raised · (docs-only, see commit) · read all 3 versions + exact diffs of bottom-nav/header/nav-link/push-client — all 4 are legitimate per-app differences (nav is deliberately clubs-only, push `p_app` default covers lockedin's omission per 0063); F2 dismissed, F20 filed for the orphaned-routes discovery (covered by existing QUEUE A10)
