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
| B2 | marketplace | listings, new, mine, requests, offers, saved | partial 2026-07-26 (static+read+probe; run pass pending) | F6 fixed (P1); D11 dismissed |
| B3 | chat | threads, realtime, unread, contact flows | 2026-07-26 | F1 fixed, F5 fixed (P0), D1 verified, D6 dismissed |
| B4 | board & events | posts, events, RSVP, check-in, feedback | partial 2026-07-26 (events read+probe; board/claims + run pass pending) | none (D12 dismissed) |
| B5 | communities | clubs, teams, applications, roles, ops, money, polls | partial 2026-07-26 (static+read+probe; run pass pending) | none (D7 dismissed) |
| B6 | daily life | cabs, group-buy, subscriptions, toolbox, deals, boxes | 2026-07-26 | F30 fixed (P1); F31 filed; D20, D21 dismissed |
| B7 | spaces & matching | spaces, vouching, matches, prefs, crews | partial 2026-07-26 (spaces read+probe; matcher/crews + run pass pending) | F7 (P1, needs your decision); D13 dismissed |
| B8 | timetable | timetable, attendance, free-slot finder | 2026-07-26 | none (D20 covers probes; F4 extended) |
| B9 | notifications | in-app, push routing, scheduled posts | 2026-07-26 | F42 filed; D6 reconfirmed, D23 dismissed |
| B10 | admin & moderation | moderation queue, campus CMS, showcase | 2026-07-26 | F40, F41 filed (F4 extended); D22, D23 dismissed |
| B11 | shell | header, bottom nav, search, home, landing, error/404/offline | partial (static only) | F2 dismissed (see `## Dismissed`); F20 filed |
| B12 | gaterunner | the whole app (5 pages) | 2026-07-26 | F10, F11, F12 (F4 extended); D8, D9 |
| B13 | vitcompass | the whole app (map) | 2026-07-26 | F12, F13; D10 |

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
- **State update (2026-07-26):** **fixed** in `736a287`. Scope corrected during confirmation: the `app/notifications/page.tsx:48` half is a FALSE POSITIVE — that `dayLabel` already shifts both sides with `toIST`/`istNow`, and its un-timezoned fallback formatter is deliberate (the date is pre-shifted; adding `timeZone` would double-shift). See D6. Only `modules/chat/thread.tsx` was really broken.
- **Evidence:** `cd packages/lib && TZ=UTC node --test` → `pass 3 / fail 0`; `TZ=Asia/Kolkata node --test` → `pass 3 / fail 0` (identical). Fails-before proven: the old logic run under `TZ=UTC` returns `Yesterday` for `2026-07-15T20:00Z` (= 01:30 IST on the 16th) where the new test asserts `Today`. Fork echo: patched in lockedin + campusclubs + campustrade in the same commit; `node scripts/gate.mjs <app> --no-lint` → GATE PASS on all three.

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
- **Where:** `app/login/page.tsx:31-32`, `app/signup/page.tsx:30-32` — all 4 apps. **B12 extends this:** `apps/gaterunner/modules/gate/client.tsx:17` (`RunnerNote`'s coordination-note input) and `:82` (`ClaimButton`'s UPI input) are two more unlabeled inputs, gaterunner-only (these components don't exist in the other forks). **B6/B8 extend this further** (lockedin + campusclubs + campustrade, byte-identical files): `app/cabs/page.tsx:59,65` (destination/date search), `modules/subscriptions/discovery.tsx:36` (seat-request note textarea), `modules/communities/boxes.tsx:29,123,129` (box name / item name / item quantity — "boxes" is in B6 scope), `modules/showcase/forms.tsx:16,18,19` (moderator-only Toolbox add-item form, `app/admin/showcase`), `modules/timetable/attendance-marker.tsx:68` (`PastAttendanceForm`'s date input). **B10 extends this once more (lockedin-only — `modules/campus/admin-client.tsx` has no equivalent in campusclubs/campustrade):** `modules/campus/admin-client.tsx:26` (`BuildingForm`'s "Building name" input) and `:27` (its "AKA / nickname" input). `:25` in the same form is also a sweep hit but is a `type="hidden"` field (`<input type="hidden" name="id" .../>`) — not visible/focusable, so it is not a real a11y defect; noted here rather than counted.
- **What:** inputs carry `placeholder` + `name` but no `<label htmlFor>`/`aria-label`. Placeholder vanishes on focus and is not a reliable accessible name. The B6/B8 additions are mostly *near*-labelled (a sibling `<p>`/text node describes the field visually, e.g. "Mark a past date" above the date input) but not wired via `htmlFor`/`aria-label`, so the visual association doesn't reach assistive tech. The B10 additions are plain placeholder-only, same shape as the original auth-page hits.
- **Impact:** screen-reader users get "edit text, blank"; no label tap-target. Not a broken flow — filed, not fixed in-loop.
- **Fork echo:** identical in lockedin/campusclubs/campustrade/gaterunner for the auth pages; the client.tsx pair is gaterunner-specific (no equivalent component in the other three). The B6/B8 additions are byte-identical across lockedin/campusclubs/campustrade (`diff` empty on `cabs/page.tsx`, `subscriptions/discovery.tsx`, `communities/boxes.tsx`, `showcase/forms.tsx`, `timetable/attendance-marker.tsx`). The B10 addition (`modules/campus/admin-client.tsx`) exists only in lockedin — no fork echo needed, the file doesn't exist elsewhere.
- **Fix:** `aria-label` on each input (smallest change), or wrap in `<label>`. Do the whole Y3 class in one pass, not per-beat — QUEUE A20.
- **Evidence:** B12 static sweep — `node scripts/sweep.mjs gaterunner --id=Y3` → 7 hits total: the 5 already listed above plus `modules/gate/client.tsx:17` and `:82`. B6/B8 static sweep — `node scripts/sweep.mjs lockedin` filtered to cabs/group-buy/subscriptions/toolbox/deals/timetable/communities-boxes files → 9 more Y3 hits, all listed above, all confirmed on read. B10 static sweep — `node scripts/sweep.mjs lockedin --json` filtered to `app/admin/**`+`modules/{moderation,campus,showcase}/**` → 6 Y3 hits: `modules/campus/admin-client.tsx:25,26,27` (2 real, 1 hidden-input false-positive, both counted above) and `modules/showcase/forms.tsx:16,18,19` (already filed under the B6/B8 pass above, not double-counted — `:16` there is likewise a hidden `logo_url` input, same false-positive shape).

### F5 · Cross-college DMs — `find_or_create_dm` never checked the other participant's college
- **Severity:** P0 · **Axis:** tenancy · **State:** fixed
- **Detector:** manual read of `supabase/migrations/0015_chat.sql` during B3 (no static detector catches this — C8 only sees missing columns, not a definer RPC failing open)
- **Where:** `find_or_create_dm(other uuid, ctype text, ctx uuid)` — 0015, replaced by `supabase/migrations/0067_dm_college_scope.sql`
- **What:** the function stamped the new conversation with `college_id = <caller's college>` but never verified that `other` belonged to it. Every other tenancy path in the app is enforced at the DB; this one was not.
- **Impact:** a caller holding a foreign user's uuid could open a conversation across colleges **and deliver a message into it** — directly contradicting the app's stated promise ("everything you post stays inside your campus — enforced at the database"). Reachability was limited: `profiles` reads are RLS-scoped and `find_by_username` (0037) is college-scoped, so foreign uuids are not easily harvested — but the RPC *is* the trust boundary for chat and it failed open.
- **Fork echo:** DB-side, so one fix covers all five apps. Calling code (`openChat`) lives in lockedin + campustrade; campusclubs' UI Message buttons were already removed (see F20).
- **Fix:** `create or replace` with an explicit `exists (select 1 from profiles where id = other and college_id = my_college)` guard.
- **Evidence:** BEFORE (role-JWT probe, rolled back): VIT user → Demo College user → `CROSS-COLLEGE DM CREATED: b72ce70a-…` then `MESSAGE DELIVERED cross-college`. AFTER applying 0067: `cross-college blocked -> that person is not at your college`; same-college regression check `same-college DM ok: true (chiranjib.dash2024@vitstudent.ac.in -> aditya.asutosh2024@vitstudent.ac.in)`. Applied to live DB; committed `7829ec8`.

### F10 · gaterunner: an authenticated user can still land on `/login` / `/signup` and sees the auth form
- **Severity:** P2 · **Axis:** ux · **State:** confirmed
- **Detector:** manual read + run pass (no static detector — this is a missing guard, not a pattern regex catches)
- **Where:** `apps/gaterunner/app/login/page.tsx`, `apps/gaterunner/app/signup/page.tsx`
- **What:** `app/page.tsx` (landing) explicitly does `if (user) redirect("/gate")`, but `LoginPage`/`SignupPage` never call `auth.getUser()` — they render the form unconditionally. An already-authenticated user who navigates to `/login` or `/signup` (bookmark, browser back, typed URL) sees the header correctly reading "Log out" while the main content is a login/signup form, instead of being bounced to `/gate` like the landing page does.
- **Impact:** confusing, not broken — re-submitting the login form while authenticated just re-authenticates and redirects to `/gate` fine (verified); no data loss, no crash, no dead end (the header's "Log out" link always escapes). Inconsistent with the pattern the landing page already establishes.
- **Fork echo:** not checked against lockedin/campusclubs/campustrade (out of this beat's scope, B1 already swept those auth pages and did not flag this) — worth a look next time those pages are touched.
- **Fix:** add the same `if (user) redirect("/gate")` guard used on `app/page.tsx` to the top of `LoginPage`/`SignupPage`.
- **Evidence:** isolated Playwright probe (fresh context, real login, then `page.goto("/login")`): `navigated to /login while authenticated, url: http://localhost:3007/login`, `header text: Gate Runner | Log out`, `login form still rendered on /login while authed: True`; same for `/signup`.

### F11 · gaterunner: gate lifecycle action buttons mutate with no pending state and no error surfacing
- **Severity:** P2 · **Axis:** ux · **State:** confirmed
- **Detector:** manual read (U2's regex only matches `type="submit"`; these are plain `onClick` buttons, so the sweep missed them)
- **Where:** `apps/gaterunner/modules/gate/client.tsx` — `RunnerActions` ("Dropped it off ✓", "Can't make it") and `RequesterActions` ("Received it ✓", "Cancel"); server actions `markDroppedOff`/`confirmDelivered`/`cancelPickup` in `apps/gaterunner/modules/gate/actions.ts` don't check/return the Supabase `.update(...)` error either.
- **What:** unlike `ClaimButton` and `RunnerNote` in the same file (which track `busy`/`sent` state and surface errors), these four buttons call `await action(id); refresh();` with no busy flag and no error path. A slow network lets a double-tap fire the mutation twice (harmless here — the actions are idempotent `eq()`-filtered updates — but nothing visibly happens either, no spinner, no confirmation beyond the list re-rendering).
- **Impact:** not a broken flow (RLS-backed filters make the writes idempotent, so no corruption), but fails the "every action gives pending/success/failure feedback" bar — if the update legitimately affects 0 rows (e.g., a race where the other party already changed the row), the button just silently does nothing with no message.
- **Fix:** wire `useState` busy flags (same pattern as `ClaimButton`) and surface the `error` field these actions currently discard.
- **Evidence:** read of `client.tsx` `RunnerActions`/`RequesterActions` (no `useState` busy tracking, unlike `ClaimButton`/`RunnerNote` in the same file) and `actions.ts` `markDroppedOff`/`confirmDelivered`/`cancelPickup` (`await supabase.from(...).update(...)` result never assigned/checked).

### F12 · Sub-44px tap targets on gaterunner `/gate` and the vitcompass map
- **Severity:** P3 · **Axis:** ux/a11y · **State:** confirmed
- **Detector:** manual measurement (`getBoundingClientRect` sweep of `button, a` at 390×844 and 360×800) — not a static-source pattern
- **Where:** `apps/gaterunner/modules/gate/client.tsx` (`RequesterActions` "Cancel" 63.5×30px, `HeadingToGate` "🏃 I'm heading to the gate" 200×34px), `apps/gaterunner/app/gate/page.tsx` ("＋ My delivery" link 123×36px); `apps/vitcompass/components/campus-map.tsx` (building markers 18×18px — the app's primary interaction — and category filter chips 30px tall).
- **Impact:** below the standard 44×44px mobile tap-target guideline; the vitcompass markers are the most consequential since tapping a building is the whole point of the app, and at 18px several markers sit close together on a dense campus map (screenshot: TT/Fountain/D-Block cluster).
- **Fix:** bump padding/min-height on the gaterunner pill buttons to `min-h-11` (matches the convention already used by `ClaimButton`/`RunnerNote` in the same file); for the map markers, grow the invisible hit-area (e.g. a larger transparent padding box) without growing the visual dot, since 44px dots would overlap on a dense map — needs a look at the rendered screenshot, not a blind bump.
- **Evidence:** `eval_on_selector_all` measurement at 390×844: `Cancel {h:30,w:63.6}`, `🏃 I'm heading to the gate {h:34,w:200}`, `＋ My delivery {h:36,w:123.5}`; vitcompass markers: 24 buttons each `{h:18,w:18}` with correct per-building `aria-label` (so this is a size problem, not an a11y-name problem); chips `{h:30}`. Screenshots `vc_map_initial_390.png`, `gr_gate_authed_390.png`.

### F13 · vitcompass: no empty state for a zero-building college; marker colours hardcoded outside the token system
- **Severity:** P3 · **Axis:** ux/correctness · **State:** confirmed
- **Detector:** U1 (list render, no empty state) + U4 (hardcoded colour), both confirmed real on read
- **Where:** `apps/vitcompass/components/campus-map.tsx:21-27` (`CAT` colour map) and `:133` (`presentCats.map`)
- **What:** `app/page.tsx` only ever queries VIT Vellore's college row, so this is low-probability today, but if `campus_buildings` ever has zero rows with usable lat/lng for that college (e.g. a moderator bulk-clears coordinates via the CMS), `presentCats` is empty, no chips besides "All" render, and the map just shows... an empty campus with no explanation. Separately, the six category colours (`academic:#2251c7`, `hostel:#d97706`, `mess:#16a34a`, `sports:#dc2626`, `admin:#7c3aed`, `landmark:#db2777`) are literal hex, not `@theme` tokens — `academic`'s `#2251c7` is in fact the documented brand cobalt token (STATE `## Decisions`: "brand cobalt for icons = #2251C7") duplicated as a raw literal instead of referenced.
- **Impact:** neither is user-visible today (24 buildings are seeded, all with coordinates) — filed so it isn't lost, not because it's biting anyone now.
- **Fix:** add a "no buildings mapped yet" message when `buildings.length === 0`; pull marker colours from CSS custom properties (the markers are imperative DOM via `document.createElement`, so this needs `getComputedStyle` or inline `var(--color-x)`, not a Tailwind class — worth a small design decision, not a blind token swap).
- **Evidence:** `apps/vitcompass/components/campus-map.tsx:21-27` (literal hex map), `:133` (`presentCats.map` with no `length === 0` branch); `app/page.tsx:17-26` shows `buildings` can legitimately be `[]` if the college lookup or coordinate filter yields nothing.

### F6 · Buyer could self-accept their own offer (RLS UPDATE with no WITH CHECK)
- **Severity:** P1 · **Axis:** authorization · **State:** fixed
- **Detector:** C7 (UPDATE policy without WITH CHECK), confirmed by read + scratch-row probe
- **Where:** `offers: parties update` policy in `supabase/migrations/0033_offers.sql:45-50`; fixed by `supabase/migrations/0068_offer_transition_guard.sql`
- **What:** the policy's USING is "I am the buyer OR the listing's seller" and there is no WITH CHECK, so Postgres reuses USING for the new row. A buyer therefore satisfied the check for *any* edit of their own offer — including `status='accepted'`. The app-layer guard exists and is correct (`modules/marketplace/offer-actions.ts:105` — "A buyer can't 'accept' their own uncountered offer") but a direct PostgREST `PATCH /rest/v1/offers?id=eq.<id>` never runs it.
- **Impact:** a buyer could mark their own lowball offer accepted (the seller sees a deal they never agreed to, and the accept path fires "Deal 🤝" notifications + chat lines) and could mutate `amount`. Same class as F5: guarded in one layer only. Not a tenancy escape — `college_id` and `buyer_id` changes were already blocked.
- **Fork echo:** DB-side, so the fix covers all five apps at once. `offer-actions.ts` is identical in lockedin + campustrade; campusclubs' copy is unreachable (see F20).
- **Fix:** RLS `WITH CHECK` cannot see the OLD row, so transition rules need a `BEFORE UPDATE` trigger. 0068 adds `enforce_offer_transition()` mirroring `decideOffer` exactly, plus immutability for `amount` / `buyer_id` / `listing_id`.
- **Evidence:** BEFORE (scratch offer, rolled back): `buyer SELF-ACCEPTS own offer -> ALLOWED`, `buyer raises amount to 999999 -> ALLOWED`, `buyer reassigns buyer_id -> blocked`. AFTER 0068, 9/9 scenarios correct — attacks: self-accept → `wait for the seller to respond`, amount raise → `offer amount and parties cannot be changed`, buyer-counters → `only the seller counters`, edit-closed → `this offer is already closed`; legitimate flows all still `ALLOWED`: seller accept / decline / counter, buyer accepts a counter, buyer withdraws. `offers left in db: 0`. Commit `7cfa58e`.

### F30 · Payer could self-confirm their own "organizer/creator/owner marked me paid" flag (cabs, group-buy, subscriptions)
- **Severity:** P1 · **Axis:** authorization · **State:** fixed
- **Detector:** manual read of `trip_members`/`group_order_items`/`subscription_members` UPDATE policies during B6 (same shape as F6/0068 and the pre-existing 0051 `share_amount` guard — no static detector flags this; C7 only fires when a policy is missing WITH CHECK *and* the sweep's regex catches the `create policy` statement, which it did not for these three)
- **Where:** `trip_members: own or creator update` (`supabase/migrations/0019_cab_pooling.sql:80-85`), `group_order_items: own or organizer update` (`0005_group_buy.sql:66-72`), `subscription_members: owner or self update` (`0006_subscriptions.sql:77-83`) — fixed by `supabase/migrations/0069_paid_confirm_guard.sql`
- **What:** all three UPDATE policies are `using (user_id = auth.uid() OR <privileged party>)` with no `WITH CHECK`, so Postgres reuses USING for the NEW row (identical pattern to F6). The app UI only ever renders the "confirm/mark paid" control to the creator/organizer/owner (`ConfirmPaidButton` in `modules/cabs/client.tsx` and `modules/groupbuy/client.tsx`, `MemberRow`'s "Mark paid" in `modules/subscriptions/client.tsx`), but the server actions (`confirmTripPaid`, `confirmPaid`, `setPaid`) take no authorization check of their own beyond the table `.update()` — so a direct call to any of them lets the PAYER themselves flip the field that is supposed to record the *other* party's confirmation.
- **Impact:** a trip member / group-buy participant / subscription member could mark themselves `paid_confirmed`/`paid_status = true` (fake having paid) without the creator/organizer/owner ever confirming — defeats the one real trust signal these three money-pooling features have. `trip_members.paid_marked` and `group_order_items.paid_marked` (the payer's own "I've paid" self-report) were correctly left open; only the *confirmation* step was exposed. Same class already fixed once in this repo for `subscription_members.share_amount` (0051) and for `offers` (0068/F6) — this closes the two tables 0051 didn't reach on `subscription_members` (`paid_status`, `last_paid`) plus the two entirely-unguarded tables (`trip_members`, `group_order_items`).
- **Fork echo:** DB-side, so one fix covers all five apps. `modules/{cabs,groupbuy,subscriptions}/actions.ts` are byte-identical across lockedin/campusclubs/campustrade (`diff` empty on all three pairs).
- **Fix:** `supabase/migrations/0069_paid_confirm_guard.sql` — three `BEFORE UPDATE` trigger functions (`guard_trip_paid_confirmed`, `guard_group_order_paid_confirmed`, `guard_subscription_paid_status`), same shape as 0051's `guard_share_amount` and 0068's `enforce_offer_transition`: if the guarded column changes, require the caller to be the creator/organizer/owner via an `exists()` check, else `raise exception`.
- **Evidence:** BEFORE (role-JWT probes, rolled back, non-moderator Demo College users): `PROBE 1 trip_members (member self-sets paid_confirmed, not creator): VULNERABLE - 1 row(s) updated, paid_confirmed=true`; `PROBE 2 group_order_items (member self-sets paid_confirmed, not organizer): VULNERABLE - 1 row(s) updated, paid_confirmed=true`; `PROBE 3 subscription_members (member self-sets paid_status, not owner): VULNERABLE - 1 row(s) updated, paid_status=true`. AFTER applying 0069: `PROBE 1a … BLOCKED (correct)`, `PROBE 2a … BLOCKED (correct)`, `PROBE 3a … BLOCKED (correct)`; regression checks same run: `PROBE 1b member self-mark paid_marked: still works (true)`, `PROBE 1c creator confirms: works (true)`, `PROBE 2b/2c` same pattern, `PROBE 3b subscription_members owner marks paid: works (true)`, `PROBE 3c member self-set share_amount: still BLOCKED (0051 intact)` (no regression on the pre-existing guard). All scratch trips/orders/subscriptions/members created inside rolled-back transactions; `select count(*)` confirmed 0 leftover rows after. Applied to live DB directly via `SUPABASE_DB_URL`; not yet committed to a migration file at read time for `0068` — mine is the next-numbered `0069`, applied and probed independently of the concurrent B2 agent's `0068`.

### F31 · Truthiness-on-zero: a few B6 number inputs silently coerce a real 0 to something else
- **Severity:** P3 · **Axis:** correctness · **State:** confirmed
- **Detector:** C3 (2 hits) + manual read (1 more, same shape, C3's regex didn't match the `Math.floor(...) || 1` form)
- **Where:** `modules/communities/actions.ts:404` (`addBoxItem`, box-item quantity — in this beat's "boxes" scope), `modules/groupbuy/client.tsx:32` (`JoinForm`'s free-form "Your share" input), `modules/subscriptions/actions.ts:22` (`createSubscription`'s required-field check)
- **What:** three small `0`-is-falsy bugs, none of them the money-integrity kind (F30), all input-edge-case only:
  - `addBoxItem`: `quantity: Math.max(0, Math.floor(quantity) || 1)` — if a lead explicitly adds an item with quantity `0`, `Math.floor(0) || 1` evaluates to `1` (0 is falsy), so the item silently gets stocked at 1 instead of 0. Immediately correctable via the existing −/+ buttons, but the stored value doesn't match what was entered.
  - `JoinForm`: `value={amount || ""}` — once the free-form share amount reaches `0`, the input visually goes blank (0 is falsy) even though the underlying state is a real `0` and submits correctly. Confusing to look at, not data-breaking.
  - `createSubscription`: `if (!service || !total || !renewal)` rejects `total_cost = 0` with "required" even though `0` was supplied — arguably reasonable (a $0 subscription is not a real use case) but is the same truthiness shape as the other two.
- **Impact:** none of these lose data or bypass authorization — all are minor, input-edge-case-only UX/data-fidelity nits on paths a student rarely exercises with a literal zero. Filed per CLAUDE.md's explicit "zero is data" iron rule so the pattern is on record, not fixed in-loop (P3).
- **Fork echo:** `modules/groupbuy/client.tsx` and `modules/subscriptions/actions.ts` are byte-identical across lockedin/campusclubs/campustrade. `modules/communities/actions.ts` likewise shared.
- **Fix:** `addBoxItem` — replace `Math.floor(quantity) || 1` with an explicit `Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 1`. `JoinForm` — display state directly (`value={amount}`) with the input defaulting empty only via a separate "touched" flag, or accept the blank-at-zero UX as-is. `createSubscription` — compare `total == null || Number.isNaN(total)` instead of `!total`, or keep as deliberate validation (product call, not a code defect) and just drop it from this list.
- **Evidence:** `modules/communities/actions.ts:404`, `modules/groupbuy/client.tsx:32`, `modules/subscriptions/actions.ts:22` (all read directly, see excerpts above).

### F7 · VIT Vellore's Girls' Closet and Boys' Den are permanently unreachable (0 members, no bootstrap path)
- **Severity:** P1 · **Axis:** product/correctness · **State:** confirmed — **NEEDS A PRODUCT DECISION, not fixed in-loop** (hunt stop condition #3)
- **Detector:** none — found by probing space isolation and noticing the roster was empty. No static detector can see this; it is a *data* state that the *design* makes terminal.
- **Where:** `supabase/migrations/0004_spaces.sql:37-56` (the three `space_members` policies), `0027_sealed_vouching.sql` (`create_space_invite` / `redeem_space_invite`), live `spaces` / `space_members` rows.
- **What:** membership is the only key to a space, and every door needs an existing member: `spaces: members only` gates SELECT on `is_space_member(id)`; `space_members: members vouch new members` requires `is_space_member(space_id)` on INSERT; `create_space_invite` raises `not a member of this space`; `redeem_space_invite` requires the inviter to still be a member. There is **no moderator/founder bypass policy and no admin UI** — the only bootstrap that ever existed is the hardcoded seed insert at `0004_spaces.sql:87`, which seeded **Demo College only**.
- **Impact:** for **VIT Vellore — the real launch college — both spaces have 0 members**, so no student can see them, join them, be vouched in, or be invited. Girls' Closet and Boys' Den are headline pillars on the landing page and in the download-hub copy, so this is a marketed feature that is 100% inaccessible to every real user, with no in-app way to recover. It passed all prior testing because Demo College (the gmail test college) has 2 members in each.
- **Evidence:** live counts — `Girls' Closet / VIT Vellore → 0 members`, `Boys' Den / VIT Vellore → 0 members`, `Girls' Closet / Demo College → 2`, `Boys' Den / Demo College → 2`. Probed as a VIT non-moderator non-member: space rows visible `0`, roster rows visible `0`, space listings visible `0`, self-add → `new row violates row-level security policy`, `create_space_invite` → `not a member of this space`. (Those blocks are all CORRECT — isolation works; the problem is that nothing can ever open the door.)
- **Why not fixed here:** seeding founding members means choosing **which real students** get first access to a gendered, members-only space. That is a people decision with consent and privacy implications — an agent must not pick. STATE `## Open items` already carries "Re-point Girls' Closet / Boys' Den founding members to real hostel reps at launch"; this finding upgrades that from housekeeping to **launch-blocking**.
- **Options for the user:** (a) name 1–2 founding members per space and I seed them (one INSERT each, then vouching self-sustains); or (b) I add a founder-only bootstrap path — an app-moderator policy/RPC plus a small admin screen — so seeding never needs DB access again. (b) is the durable fix and also covers every future college.

### F40 · `/admin/showcase` Toolbox and Deals lists render nothing when empty — no empty state
- **Severity:** P3 · **Axis:** ux · **State:** confirmed
- **Detector:** none — the U1 (list-with-no-empty-state) regex didn't match this file's `items?.map(...)` shape; found on read + confirmed on a live run pass.
- **Where:** `apps/lockedin/app/admin/showcase/page.tsx:24-34` (Toolbox `items` list) and `:40-50` (Deals `merchants` list). Byte-identical in `apps/campusclubs` and `apps/campustrade` (`diff` empty on all three).
- **What:** both sections do `{items?.map(...)}` / `{merchants?.map(...)}` with no `.length === 0` branch. Compare to the sibling CMS at `/admin/campus`, which explicitly renders "No buildings yet — add the first one above." for the same empty-college case.
- **Impact:** live-verified on the Demo College moderator account (which has 0 showcase items and 0 merchants): the page shows only the create-forms with nothing below — not broken, but silently blank where a one-line "Nothing here yet" would remove the ambiguity ("did this load? is there a filter hiding rows?").
- **Fork echo:** `app/admin/showcase/page.tsx` is byte-identical across lockedin/campusclubs/campustrade.
- **Fix:** add the same short message pattern used on `/admin/campus` under each section when its array is empty.
- **Evidence:** live Playwright run (390×844 and 360×800, `lockedin.phase1.test@gmail.com`, Demo College — 0 showcase_items/merchants rows): page snippet captured `"Toolbox + Deals admin | 🧰 Toolbox | ... | Add to Toolbox | 🏷️ Deals | ... | Add deal"` — no items, no "empty" copy anywhere. Screenshots `admin_showcase_390.png`, `admin_showcase_360.png`.

### F41 · Moderation-queue and campus-CMS delete controls mutate with no pending/error state
- **Severity:** P2 · **Axis:** ux · **State:** confirmed — same bug class as F11 (gaterunner)
- **Detector:** manual read (U2's regex only matches `type="submit"`; these are plain `onClick` handlers)
- **Where:** `apps/lockedin/modules/moderation/mod-actions.tsx` (`ReportActions`: "Dismiss" / "Remove content" / "Ban user" buttons, used on `/admin/moderation`); `apps/lockedin/modules/campus/admin-client.tsx` (`BuildingRow`'s "Delete" button, used on `/admin/campus`).
- **What:** `ReportActions`' three buttons call `await dismissReport(...)` / `removeContent(...)` / `banUser(...)` then `refresh()`, with no `useState` busy flag and no check on the action's return value — unlike `ReportSheet` in the same module, which already has `busy`/`done` state for the exact same class of action (report/block). `BuildingRow`'s Delete button is the same shape: `await deleteBuilding(id); refresh();` with a `confirm()` gate but no busy state. None of the underlying server actions (`dismissReport`/`removeContent`/`banUser` in `modules/moderation/actions.ts`, `deleteBuilding` in `modules/campus/actions.ts`) surface an error to the caller either — `dismissReport`/`banUser` discard the Supabase error, `removeContent` discards the RPC error, `deleteBuilding` discards the RPC error.
- **Impact:** a double-tap on a slow connection can fire the same moderation action twice (harmless — all three are idempotent `eq()`-scoped updates/RPCs), but if the action legitimately affects 0 rows (e.g., a report another moderator already actioned, a building another moderator already deleted), the button just silently does nothing — no spinner, no confirmation, no error. Same "fails the pending/success/failure feedback bar" shape already filed as F11/QUEUE A15 for gaterunner.
- **Fork echo:** `modules/moderation/mod-actions.tsx` is byte-identical across lockedin/campusclubs/campustrade (`diff` empty). `modules/campus/admin-client.tsx` is lockedin-only — the VIT Compass campus CMS was only ever built in the mother app (STATE.md), `apps/campusclubs`/`apps/campustrade` have no `modules/campus/` directory at all.
- **Fix:** wire the same `useState` busy pattern `ReportSheet` already uses in the same file, and have the four server actions return their error string instead of discarding it.
- **Evidence:** read of `mod-actions.tsx` (no `useState` in `ReportActions`, contrast with `busy`/`done` in `ReportSheet` two files over) and `admin-client.tsx`'s `BuildingRow` (no `useState` around the Delete `onClick`); `modules/moderation/actions.ts` lines 50-72 and `modules/campus/actions.ts:54-58` (`deleteBuilding`) — none assign/check the Supabase/RPC error.

### F42 · Header unread-notification badge can render stale on the visit that marks notifications read
- **Severity:** P3 · **Axis:** ux/correctness · **State:** confirmed
- **Detector:** none — found on a live run pass, then traced in code.
- **Where:** `apps/lockedin/components/header.tsx`'s `NotificationBell` (an independent async Server Component doing its own `select count(*) ... eq('read', false)`) vs. `apps/lockedin/app/notifications/page.tsx:61-63` (marks every unread row `read = true` as a side effect of the SAME page render). Byte-identical `NotificationBell` and `notifications/page.tsx` across lockedin/campusclubs/campustrade.
- **What:** on the navigation that loads `/notifications`, the header (part of the shared layout) and the page body are separate async Server Components with no data dependency or ordering guarantee between them. The page's own `items` array is deliberately rendered pre-update (the code comment: items keep their unread styling/blue-dot on the visit that reads them — a reasonable "here's what's new" UX), but the header's independent count query has no such intent — it's just a plain `read = false` count that may or may not have observed the UPDATE yet, depending on Next's internal render/streaming order for that request.
- **Impact:** live-verified — screenshot `notif_390.png` shows the header badge reading "2" while the notifications page directly below it is the very page that just ran the mark-all-read update. Purely cosmetic: the count is correct again on the very next navigation (a fresh request re-runs the header's query against the now-committed DB state), so nothing is stuck or wrong long-term — a user could see one navigation where the badge and the (already-read-styled-next-time) list disagree.
- **Fork echo:** `NotificationBell` in `components/header.tsx` and `app/notifications/page.tsx`'s mark-read logic are byte-identical in campusclubs and campustrade (`diff` empty both).
- **Fix:** low priority given it self-heals in one navigation. If ever picked up: have the page's mark-read update run in a `before`/blocking step the layout can also await, or move the badge count into a client component that revalidates via the same server action instead of an independent RSC query.
- **Evidence:** `notif_390.png` — header badge "2" rendered alongside the notifications list on the same page load that runs the mark-read UPDATE.

## Dismissed

Findings the sweep raised and a human or agent ruled out. Keep these — they are
what stops the next sweep re-litigating settled ground.

### D22 · B9/B10 unbounded-list static hits — moderator-curated / personal-scoped, low-risk
- **Detector:** P2 (unbounded list query)
- **Where:** `apps/lockedin/app/admin/campus/page.tsx:24` (`campus_buildings`), `apps/lockedin/app/admin/moderation/page.tsx:19` (`reports`), `apps/lockedin/app/admin/showcase/page.tsx:13` (`showcase_items` + `merchants`), `apps/lockedin/modules/moderation/blocks.ts:7` (`blocks`).
- **Why dismissed:** same reasoning as D21's unbounded-list dismissal, applied to this beat's tables. `campus_buildings` is moderator-curated per college (24 seeded for VIT Vellore, the only real target so far — nowhere near a growth concern). `reports` is filtered to `status='open'` and is a queue moderators are expected to clear, not an ever-growing archive. `showcase_items`/`merchants` are moderator-added one at a time (`/admin/showcase` has no bulk-import path). `blocks` is a personal per-user list (`blocker_id = auth.uid()`) — nobody blocks hundreds of people. None of the four is user-generated-content-at-scale the way marketplace listings or board posts are; all four already fall under the existing `QUEUE A9` (N+1/index review) rather than needing a beat-specific item.

### D23 · B9/B10 adversarial probes — clean, no defects
- **Swept:** role-JWT probes in rolled-back transactions against the live DB (non-moderator, cross-college moderator, direct-table + direct-RPC calls bypassing the app layer), covering every table/RPC this beat writes: `notifications`, `push_subscriptions`, `reports`, `showcase_items`, `merchants`, `mod_remove_content`, `mod_ban_user`. `campus_buildings`/`save_campus_building`/`delete_campus_building` were **not** re-probed — D10 (same day, same migration untouched since) already covers cross-college write/delete + non-moderator + anon exhaustively.
- **Why clean, notification phishing vector (the brief's top concern):** `notifications: own update` has no explicit `WITH CHECK`, which looked exactly like the F6/F30 bug shape (UPDATE-without-WITH-CHECK). It is NOT exploitable here, unlike F6/F30: the sole USING clause is `user_id = auth.uid()` — i.e. it directly binds the very column an attacker would need to change to reassign a notification to a victim. Postgres reuses USING as the implicit WITH CHECK when none is given, so the reused check re-evaluates against the NEW row: `NEW.user_id = auth.uid()`. Reassigning `user_id` to someone else makes that false, and Postgres rejects it (`new row violates row-level security policy`) — confirmed live: an attacker (`lockedin.test.boy`) holding their own scratch notification could not `UPDATE ... SET user_id = <victim>, message = '<phish>', link = 'https://evil.example'` (blocked). This is the mirror image of D11's "listings: seller update" case — a C7-shaped policy that is actually safe because the mutable column *is* the ownership column. Direct `INSERT` into `notifications` targeting another user is blocked too (no INSERT policy at all — RLS default-denies). Cross-user `SELECT` (by id, and by `user_id` count) both return 0 rows.
- **Why clean, push_subscriptions (endpoint tokens):** no INSERT policy exists for `authenticated` (writes only via the `save_push_subscription`/`prune_push_subscription` definer RPCs) — a direct table INSERT for another user's `user_id` is rejected. `SELECT` is owner-only (`user_id = auth.uid()`) — a non-owner reading another user's row by id, or counting rows by `user_id`, both return 0.
- **Why clean, reports:** a non-moderator dismissing an open report in their own college → 0 rows updated (USING requires `is_moderator`). A moderator of a **different** college dismissing a same-`reason` report in Demo College → 0 rows updated (USING's `p.college_id = reports.college_id` subquery). Same-college moderator dismissing the same report → 1 row, `status: dismissed` (regression: legit flow intact).
- **Why clean, mod_remove_content / mod_ban_user:** both are `security definer` with an explicit `select ... where id = auth.uid() and is_moderator` gate inside the function body (not just RLS) — a non-moderator calling either directly raises `not a moderator`; the target row (`listings.removed`, `profiles.is_banned`) was confirmed unchanged afterward.
- **Why clean, showcase_items / merchants:** the `for all` policy on both tables has both USING and an explicit WITH CHECK (`is_app_moderator() and college_id = get_my_college_id()`) — direct INSERT/UPDATE/DELETE by a non-moderator all blocked (`new row violates row-level security policy` / 0 rows); a moderator inserting with a **foreign** college_id is blocked by the WITH CHECK too (Demo moderator → VIT `college_id`, rejected). Legitimate same-college moderator insert still works (regression check, 1 row).
- **Evidence:** full probe transcript in the hunt session (17 probes: N1-N3, P1-P2, R1-R3, M1-M2, S1-S3, ME1, plus 2 regression checks) — every attack blocked, every legitimate flow (moderator dismiss, moderator insert, owner mark-read) still worked. All scratch rows (notifications/reports/showcase_items/push_subscriptions) created and mutated inside one rolled-back transaction; post-run `select count(*)` sentinel query on each table confirmed 0 leftover rows.

### D13 · Space isolation (Girls' Closet / Boys' Den) — probed, holds
- **Why clean:** probed as a VIT Vellore non-moderator who is not a member: cannot read the space row, the roster, or any listing inside it (all `0 rows`); cannot self-add (`new row violates row-level security policy`) even when spoofing `added_by` to a real member; cannot mint an invite (`not a member of this space`). The `with check` on the vouch policy pins `added_by = auth.uid()` and requires the *actor* to already be a member, so there is no way to walk in. Gendered-space privacy holds at the database. (The flip side of that strength is F7.)

### D20 · B6/B8 tenancy + authorization probes — clean except F30
- **Swept:** role-JWT probes in rolled-back transactions against the live DB, cross-college (Demo College vs VIT Vellore) and non-moderator-vs-moderator, covering every table B6/B8 writes: `trips`/`trip_members`, `group_orders`/`group_order_items`, `subscriptions`/`subscription_members`, `showcase_items`/`merchants`, `timetable_entries`/`attendance_records`.
- **Why clean:** cross-college `trip_members` join (VIT user attempting to join a Demo College trip by UUID) → `BLOCKED - new row violates row-level security policy` — even though the INSERT policy's own `with_check` never mentions `college_id`, the `exists(select 1 from trips t where t.id = trip_id and t.status='open' ...)` subquery is itself subject to the caller's RLS on `trips` (`trips: same-college read`), so a foreign-college trip is invisible to the subquery and the `exists()` comes back false — tenancy holds transitively, not by an explicit column check. (Read alone would have missed this; only the live probe proved it — logged so the next sweep doesn't re-flag `trip_members`'s insert policy as a tenancy hole from a static read.) Cross-college `group_order_items` insert (self-supplied `college_id` mismatched to the order's real college) → blocked by its own explicit `college_id = get_my_college_id()` check. Cross-college `subscription_members` self-insert → blocked (insert policy requires the caller to be the subscription owner, which a VIT user never is for a Demo College pool). `showcase_items` insert by a non-moderator → blocked (`is_app_moderator()` guard). `timetable_entries` insert authored as one user but `user_id` set to another → blocked (owner-only `with check (user_id = auth.uid() ...)`). All five probes, one savepoint each, all rolled back; live DB confirmed unchanged after (`select count(*)` on each scratch predicate → 0).
- **The one thing that wasn't clean:** the payer-self-confirms-payment gap on `trip_members.paid_confirmed`, `group_order_items.paid_confirmed`, `subscription_members.paid_status` — filed and fixed as **F30**, not this entry.

### D21 · B6/B8 static hits — false positives and low-risk P2/P3s, not fixed
- **Detector:** C6, U1, U2, P2 (unbounded list), P3 (raw `<img>`)
- **Why dismissed:**
  - **C6** (`app/cabs/page.tsx:36`, `.or()` built from `destination`) — false positive. The line already does `destination?.replace(/[,()]/g, " ")` into `safeDest` before interpolating (the code comment even says why: `"Chennai (airport)" must not 400 the query`) — exactly the fix C6 asks for, already applied.
  - **U1** (`modules/timetable/attendance-summary.tsx:14`, `sorted.map` with no empty-array branch) — false positive. `AttendanceSummary` is only ever rendered by its one caller (`app/timetable/page.tsx`) inside `{courseMap.size > 0 && (...)}`, so it never receives an empty array in practice.
  - **P2 unbounded-list** (`app/timetable/[code]/page.tsx:15`, `from('profiles')…no limit`) — false positive. That call ends in `.single()`, not a list render; the detector's regex doesn't see the `.single()` suffix.
  - **P2 unbounded-list**, the remaining ~10 genuine list queries in scope (`trip_members`, `group_order_items`, `subscription_members`, `sub_join_requests`, `showcase_items`, `merchants`, `timetable_entries`) — real, but low-risk: each is either personal-scoped (a user's own timetable, capped near 30 entries/week), capacity-bounded (trip/order/pool participant counts are physically small), or moderator-curated (showcase/deals require a deliberate admin add). Already covered generally by the existing `QUEUE A9` (N+1/index review) rather than a new beat-specific item.
  - **U2** (no pending-state submit) on `app/cabs/page.tsx:71` ("Go" search), `app/cabs/[id]/page.tsx:76` / `app/group-buy/[id]/page.tsx:143` / `app/subscriptions/[id]/page.tsx:91` ("Message trip creator / organizer / owner") — all four are idempotent: the search form is a plain GET re-query, and the three "Message" buttons call `openChat` → `find_or_create_dm`, which finds-or-creates the same conversation on a repeat click (no duplicate rows, no duplicate side effects). A double-tap on a slow network is a no-op, not a bug.
  - **P3 raw `<img>`** (`app/deals/page.tsx:35`, `app/toolbox/page.tsx:39`) — small (40-48px) moderator-uploaded logo thumbnails on low-traffic admin-curated pages, not the LCP-relevant content the Gate #11 budget targets. Same repo-wide pattern as the other 19 hits outside this beat; not a beat-specific discovery.

### D12 · B4 events authorization — probed, no defects
- **Swept:** read of `record_checkin()` (0042) + adversarial probe of the event surface. **Board / lost-&-found claims and the run pass are still pending** — B4 is recorded partial.
- **Why clean:** `record_checkin` checks `post_college <> my_college` then requires `post_author = auth.uid()` OR an app moderator in that college, before it will resolve a roll number. Probed as a non-moderator, non-author user in the same college (`lockedin.test.boy@gmail.com`) against event "Silverstone GP watch party": `record_checkin` → `not authorized to check in for this event`; attendee roster (`event_checkins`) → `0 rows visible`; other people's `roll_number` → `permission denied for table profiles` (the 0041 column-level revoke doing its job); `insert into event_rsvps` for another `user_id` → `new row violates row-level security policy`; `update posts set title` on someone else's event → `0 rows`.
- **Note:** no profile in the probed college has a `roll_number` set yet, so the check-in *happy* path (organizer scans a real code → attendee resolves by name) is still unproven end-to-end. That is the camera-scan item already tracked in QUEUE U8 (manual phone QA), not a code defect.

### D11 · C7 on `listings: seller update` — escapes are blocked in practice
- **Detector:** C7 (UPDATE policy without WITH CHECK) — flagged P0
- **Why dismissed:** the policy really does lack a WITH CHECK (`pg_policy` on the live DB: `qual = (seller_id = auth.uid())`, `with_check = null`), but every escape it could theoretically permit is rejected. Probed as the seller against a live listing, each in a rolled-back savepoint: `title only -> ALLOWED (1 row)` (normal editing still works — no regression), `college_id change -> ERROR: new row violates row-level security policy`, `space_id inject into "Boys' Den" (not a member) -> ERROR: same`, `seller_id steal -> ERROR: same`. So tenancy, gendered-space membership, and ownership all hold on UPDATE.
- **Caveat, recorded honestly:** the blocking expression was not traced to a specific migration line — the dismissal rests on the empirical probe above, not on reading a WITH CHECK clause. If `listings` is ever re-policied, re-run those four probes rather than assuming.
- **Contrast with F6:** the same detector on `offers: parties update` was a REAL finding. C7 hits must be probed individually; the detector cannot tell these two apart.

### D7 · B5 communities authorization — probed, no defects
- **Swept:** static (baseline sweep) + read (`is_app_moderator` / `is_community_moderator` / `is_community_member` in 0017 + 0055; guards on `set_community_role`, `create_collection`, `decide_application`, `update_community_profile`, `request_community_deletion`, `adjust_box_item`) + adversarial probe. **Run pass still pending** — this beat is recorded partial, not swept.
- **Why clean:** every money/role/profile RPC opens with `if not (is_app_moderator() or is_community_moderator(cid)) then raise exception 'not allowed'`. Probed as an outsider (same college, non-member): `create_collection`, self-promote via `set_community_role`, `update_community_profile`, `request_community_deletion` all → `BLOCKED: not allowed`; `team_meetings` and `collection_dues` both read 0 rows. Probed as a genuine non-moderator member (`aditya.jaiswal2024@vitstudent.ac.in` in "Chiru's Club"): same three → `BLOCKED: not allowed`. Cross-college: a Demo College user could not read a VIT community (`no (ok)`) and `insert into community_members` → `new row violates row-level security policy`.
- **⚠ Probe methodology note (cost me a false P0):** an early probe reported a "plain member" successfully calling `create_collection` + self-promoting. The account was `lockedin.phase1.test@gmail.com`, which carries `profiles.is_moderator = true` app-wide, so `is_app_moderator()` correctly returned true. **Always exclude `is_moderator = true` when selecting a probe subject for a member-level check** — the founder test account is a member of several communities and will silently pass every guard.

### D6 · C1 on `app/notifications/page.tsx:48`
- **Detector:** C1 (date rendered without IST timezone)
- **Why dismissed:** false positive. That `dayLabel` shifts *both* sides with `toIST(new Date(ts))` / `istNow()` before comparing, so Today/Yesterday already resolve on IST calendar days. The flagged fallback `toLocaleDateString("en-IN", { day, month })` is deliberately un-timezoned because `d` is already shifted — adding `timeZone: "Asia/Kolkata"` would double-shift it by +5:30. The file's own comment says so. C1 cannot see that the Date was pre-shifted; treat this line as a known-good exception.

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

### D8 · B12 gaterunner static hits — C4 (themeInit) and U2 (logout button)
- **Detector:** C4, U2
- **Why dismissed:**
  - **C4** (`apps/gaterunner/app/layout.tsx:24`, `themeInit` empty catch) — same reasoning as D4: `localStorage.getItem` throws in private-browsing/blocked-cookie modes, the empty catch leaves the class untoggled and falls back to `prefers-color-scheme`. Identical pattern to the other three apps.
  - **U2** (`apps/gaterunner/components/gate-header.tsx:24`, "Log out" `<button type="submit">` with no pending state) — logout is idempotent (a second `signOut()` mid-flight is harmless) and the only outcome is a redirect to `/login`; there's no meaningful failure state to surface. Run-verified: clicking it always lands on `/login` with the header correctly showing "Log in".

### D9 · B12 `pickup_requests` RLS — adversarially probed, no defects
- **Swept:** role-JWT probes in rolled-back transactions against the live DB, cross-college (Demo College vs VIT Vellore) and cross-user within a college.
- **Why clean:** same-college read scoping holds (a VIT user selecting `pickup_requests` filtered to Demo College's `college_id` gets 0 rows; an unfiltered select only ever returns the caller's own college). Direct `INSERT` spoofing `college_id` to another college, or impersonating another `requester_id`, both rejected by RLS (`new row violates row-level security policy`). Direct `UPDATE`/`DELETE` by a non-requester/non-runner affects 0 rows. `claim_pickup` RPC: self-claim by the requester returns `"Someone else claimed it first."` (blocked by the `requester_id <> auth.uid()` guard); a cross-college claim attempt is likewise rejected and the target row was confirmed still `status='open', runner_id=null` afterward. `unclaim_pickup` and `set_runner_note` both reject a non-runner (`set_runner_note` raises `"not your pickup"`).
- **Evidence:** full probe transcript in the hunt session — 10 probes (P1–P10), all outcomes matched the RLS/RPC design (`0022_gate_runner_hardening.sql`, `0023_fix_unclaim.sql`, `0024_gate_run_announce.sql`, `0064_runner_note.sql`); all transactions rolled back, live data unchanged.

### D10 · B13 `campus_buildings` RLS — adversarially probed, no defects
- **Swept:** role-JWT probes in rolled-back transactions against the live DB (anon, authenticated non-moderator, moderator of the *other* college), per `0065_campus_buildings.sql`.
- **Why clean:** public read confirmed for `anon` (both colleges' rows visible — intentional design, buildings aren't sensitive). Direct `INSERT`/`UPDATE`/`DELETE` by an authenticated non-moderator, and direct `INSERT` by `anon`, all rejected (`new row violates row-level security policy` / 0 rows affected) — there is no write policy on the table at all, only the two SECURITY DEFINER RPCs. `save_campus_building`/`delete_campus_building` called by a non-moderator raise `"Only a college moderator can edit the campus map."`; `anon` can't call them at all (no `EXECUTE` grant). Cross-college write: a Demo College moderator targeting a VIT building's `id` via `save_campus_building` gets `"Building not found in your college."` and the VIT building's name was confirmed unchanged afterward; `delete_campus_building` on a foreign-college id silently affects 0 rows and the row was confirmed still present.
- **Evidence:** full probe transcript in the hunt session — 9 probes (B1–B9), all outcomes matched the RLS/RPC design; all transactions rolled back, live data unchanged.

## Hunt log

`/hunt` appends one line per iteration. Newest last.

<!-- HUNT-LOG -->
2026-07-26 · B1 auth · 0 confirmed P0/P1 of 3 raised · (no fix commit) · auth logic clean across 4 apps; F4 a11y filed, D4/D5 dismissed; "any email" was the gmail seed row (0066), not auth
2026-07-26 · F2 fork drift · 0 confirmed of 4 raised · (docs-only, see commit) · read all 3 versions + exact diffs of bottom-nav/header/nav-link/push-client — all 4 are legitimate per-app differences (nav is deliberately clubs-only, push `p_app` default covers lockedin's omission per 0063); F2 dismissed, F20 filed for the orphaned-routes discovery (covered by existing QUEUE A10)
2026-07-26 · B3 chat · 2 confirmed / 3 raised · 7829ec8+736a287 · F5 P0 cross-college DM closed (0067); F1 IST day labels fixed in 3 forks w/ tests; D1 verified, D6 dismissed
2026-07-26 · B5 communities (partial) · 0 confirmed / 6 probed · (no fix commit) · all role/money/profile RPC guards hold vs outsider + non-mod member + cross-college; D7 records the is_moderator probe pitfall
2026-07-26 · B12 gaterunner · 0 P0/P1, 3 P2/P3 confirmed of ~12 raised · (docs-only, see commit) · static+read+run(390/360)+adversarial-probe all four passes; pickup_requests RLS clean (D9); F10 auth-page redirect gap, F11 no pending/error state on lifecycle buttons, F4 extended w/ 2 more Y3 hits filed; C4/U2 dismissed (D8)
2026-07-26 · B13 vitcompass · 0 P0/P1, 2 P3 confirmed of ~2 raised · (docs-only, see commit) · static+read+run(390/360, WebGL)+adversarial-probe all four passes; campus_buildings RLS clean incl. cross-college write/delete (D10); F13 empty-state+hardcoded-colour filed; F12 (shared w/ B12) covers sub-44px map markers/chips
2026-07-26 · B2 marketplace (partial) · 1 confirmed / 21 C7 hits triaged · 7cfa58e · F6 P1 offer self-accept closed at DB (0068); D11 dismisses C7-on-listings after probing all 4 escapes
2026-07-26 · B4 board+events (partial) · 0 confirmed / 5 probed · (no fix commit) · event check-in, roster, roll_number, RSVP-spoof and post-edit all correctly blocked for a non-organizer; D12 records what is still pending
2026-07-26 · B6 daily life · 1 confirmed / 31 static hits triaged · 6bf2e1a · F30 P1 payer-self-confirms-payment closed at DB (0069, trip_members/group_order_items/subscription_members) — same class as F6/0068 and the pre-existing 0051 guard, found by read not by a detector; F31 (P3 truthiness-on-zero, 3 sites incl. boxes) filed; F4 extended w/ 9 more Y3 hits; D20 tenancy/authz probes clean besides F30 (trip_members insert policy has no explicit college check but is protected transitively via the referenced trips row's own RLS — logged so it isn't re-flagged); D21 dismisses C6/U1/U2/P2/P3 false-positives and low-risk hits; run pass 390+360 clean (no overflow, no console errors, real empty states)
2026-07-26 · B8 timetable · 0 confirmed / 3 static hits triaged · (covered by B6 commit, DB-side + docs) · timetable_entries/attendance_records are strictly owner-only RLS (no cross-user read at all — the "free-slot finder" is a personal-only helper, no team/cross-user surface in this beat); D20 covers the tenancy probe (spoofed user_id insert blocked); F4 extended w/ 1 Y3 hit (attendance-marker date input); U1 false positive dismissed (D21)
2026-07-26 · B7 spaces (partial) · 1 confirmed / 6 probed · (no fix — needs product decision) · F7 P1: VIT's Girls' Closet + Boys' Den have 0 members and the design has no bootstrap, so both are permanently unreachable for the launch college; D13 confirms isolation itself holds
2026-07-26 · B9 notifications · 0 P0/P1, 1 P3 confirmed of ~2 raised · (docs-only, see commit) · static+read+run(390/360)+adversarial-probe all four passes; notifications/push_subscriptions RLS clean incl. the phishing-reassignment vector the brief flagged (own-update's missing WITH CHECK is safe here because USING binds the mutated user_id column itself — contrast D11); F42 header-badge staleness filed; D6 (notifications/page.tsx:48 C1 false positive) reconfirmed, D23 records the full probe set
2026-07-26 · B10 admin & moderation · 0 P0/P1, 2 P2/P3 confirmed of ~11 raised · (docs-only, see commit) · static+read+run(390/360)+adversarial-probe all four passes; reports/showcase_items/merchants/mod_remove_content/mod_ban_user all correctly block non-moderators + cross-college moderators (D23); campus_buildings reused D10 (same-day, unchanged migration) rather than re-probing; F40 (showcase admin empty state) + F41 (moderation/campus-CMS buttons no pending state, same class as F11) filed; F4 extended w/ 2 more Y3 hits (campus admin-client.tsx); D22 dismisses the 4 unbounded-list hits as moderator-curated/personal-scoped

### F8 · Duplicate migration numbers (two 0066s, two 0067s)
- **Severity:** P2 · **Axis:** process/correctness · **State:** confirmed, not fixed
- **Where:** `supabase/migrations/0066_push_app_title.sql` + `0066_restrict_to_vit.sql`; `0067_posts_community_cascade.sql` + `0067_dm_college_scope.sql`
- **What:** two work streams (a `/loop` queue session and this `/hunt` session) picked the same next number independently. All four are applied to the live DB, so behaviour today is correct.
- **Impact:** ordering is ambiguous for any fresh rebuild or lexical-order runner, and a reader cannot tell from the folder what ran in which order. Future collisions are likely whenever two streams run concurrently.
- **Why not fixed:** renaming an APPLIED migration is not safe — a runner that tracks applied files by name would treat the renamed file as new and re-run it. CLAUDE.md also forbids editing applied migrations.
- **Fix (convention, for whoever numbers next):** always `ls supabase/migrations/ | tail -3` immediately before creating a file, and prefer a timestamp prefix over a sequence if concurrent streams continue.
