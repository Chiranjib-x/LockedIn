# POLISH — the product ledger

`docs/QUEUE.md` is planned work. `docs/FINDINGS.md` is what `/hunt` found in the
code. **This file is what `/polish` found by using the app as a student.**

Run it with `/polish`. The protocol lives in `.claude/commands/polish.md`.

## Severity × effort

| | meaning | | |
|---|---|---|---|
| **S1** | blocks or actively misleads a student | **E1** | ≤20 lines |
| **S2** | costs a student real time or trust | **E2** | a file or two |
| **S3** | friction — noticed, tolerated | **E3** | schema / API change |
| **S4** | polish | | |

Fix order is **S1 first, then highest severity per unit effort** — an S2/E1 beats
an S1/E3 that needs a migration and a product decision.

A finding is `open` → `fixed` | `filed` | `blocked` | `dismissed`.
**Every finding carries a persona.** If no persona hits it, it is not friction —
it is a preference, and preferences are not work.

---

## Journeys — walked in this order

Ordered by how many students hit them. A journey is walked only when it has been
**driven** at 390×844 and 360×800, through every persona, with the logic audit done.

| # | Journey | Surfaces | Personas | Last walked | Findings |
|---|---|---|---|---|---|
| **J1** | **First run** — signup → first screen → "now what?" | signup, /home, onboarding, empty states | P1, P6, P7 | 2026-07-27 | J1-1 fixed · J1-2 filed · J1-D1 dismissed |
| **J2** | Find your way | VIT Compass, /timetable, free windows, /search | P1, P7 | 2026-07-27 | J2-1 fixed · J2-2 filed |
| **J3** | Buy & sell | /marketplace, listings, offers, requests, /saved | P2, P5 | 2026-07-27 | J3-1 fixed · J3-D1/D2 dismissed |
| **J4** | Gate run | /gate, post, opt-in, claim, deliver, reward | P4, P2 | 2026-07-27 | J4-1 fixed |
| **J5** | Clubs & events | /communities, /for-clubs, events, RSVP, check-in, analytics | P3, P1 | 2026-07-27 | J5-1 fixed · J5-2, J5-3 filed |
| **J6** | Talk to people | /chats, usernames, contact boundaries, reporting | P5, P2 | 2026-07-27 | **J6-1 filed (S1)** |
| **J7** | Split & share | /group-buy, /subscriptions, /cabs, /crews | P2, P5 | 2026-07-27 | J7-1 fixed |
| **J8** | Spaces | Girls' Closet / Boys' Den, invites, vouching | P5, P1 | 2026-07-27 | **isolation verified clean** · J8-1 filed · J8-D1 dismissed |
| **J9** | Come back | /notifications, push, "what changed since last time" | **P6**, P7 | 2026-07-28 | **J9-1, J9-2 fixed** |
| **J10** | Trust & safety | moderation, reports, bans, /delete-account, /privacy | P5 | 2026-07-28 | **verified clean** · J10-D1 dismissed |

**J9 is the one that matters most.** The live signup curve — 3 on 07-13, 4 on
07-14, 6 on 07-15, then 1, 1, 1 — is a retention failure, not an acquisition
failure. Do not let J9 sit unwalked because J3 is more fun.

---

## Findings

<!-- POLISH-FINDINGS -->

### J1-1 · Auth failures showed the student `{}` · **S2/E1** · P1, P7 · **fixed**
- **Hit while:** logging in as a brand-new fresher whose auth row was malformed.
  GoTrue returned `500 {"msg":"Database error querying schema"}`, supabase-js
  surfaced `message: "{}"`, and the app redirected to `/login?error=%7B%7D` — so
  the login screen literally told the student **`{}`**.
- **Why it matters:** the message is rendered verbatim, so any non-standard error
  body becomes an unusable screen. A student cannot act on `{}`, and it reads as
  broken rather than temporarily unavailable.
- **Fix:** `authMessage()` guard in `app/auth/actions.ts` on both `login` and
  `signup` — empty, `{}` or `[object Object]` is replaced with an actionable
  sentence; every real message (e.g. "Invalid login credentials") passes through
  untouched. Echoed to all four apps (lockedin/campusclubs/campustrade were
  byte-identical so `cp`; gaterunner differs on its `@suite/auth/server` import
  and was ported by hand).
- **Evidence:** reproduced by nulling `confirmation_token` on a live auth row and
  driving the real login form. Before → URL `/login?error=%7B%7D`. After →
  `SHOWN TO STUDENT: "Couldn't log you in — try again in a moment."`. Control:
  known account + wrong password still returns `400 invalid_credentials` →
  "Invalid login credentials", i.e. good messages are not swallowed.
  `gate.mjs --build` PASS ×4.

### J9-1 · "Not now" on the push prompt was permanent · **S2/E1** · P6 · **fixed**
### J9-2 · A failed "Enable" was recorded as success · **S2/E1** · P6 · **fixed**
- **The number that started it:** **166 notifications** generated across 12 users,
  and **1 push subscription across 18 real students.** The app is producing plenty
  of reasons to come back; 17 of 18 students only ever see them *if they are
  already in the app*. A bell that rings only when you are already in the room —
  which is precisely the retention flatline the signup curve shows.
- **J9-1:** the "✕ Not now" button wrote the **same `DONE_KEY`** as "Enable". One
  dismissal — almost always on day one, before you have a single chat, parcel or
  class, i.e. **before push has any value at all** — silenced the prompt on every
  page, forever. The code comment called this "one decision, remembered forever";
  it was conflating *yes* with *not right now*.
- **J9-2:** `Enable` awaited the subscribe and then unconditionally wrote
  `DONE_KEY` and dismissed. The helpers **already return**
  `"subscribed" | "denied" | "unsupported" | "failed"` — the caller **discarded
  the status**. So a denied permission or a failed subscribe was recorded as a
  completed decision and never asked again. Same class as J1-1: a failure
  silently treated as a success.
- **Fix:** `DONE_KEY` is now written **only** on `status === "subscribed"`.
  Anything else surfaces an actionable message (blocked → how to unblock;
  unsupported → add to home screen) and leaves the prompt live. "✕" writes a
  separate `SNOOZE_KEY` timestamp and the card returns after **7 days**, once the
  app has actually given them a reason.
- **Caught by C5 mid-fix:** I first wrote `if (ok === false)`, assuming a boolean.
  The helpers return a string union, so that guard would **never** have fired and
  I would have shipped the exact bug I was fixing. Pasting the real signature is
  the only reason this works.
- **`LOADED_AT` is module-scope on purpose:** `useSyncExternalStore` calls
  `getSnapshot` repeatedly during render, and reading `Date.now()` in there is how
  you get a render loop. Captured once per page load; re-asking one page load
  later is the right granularity anyway.
- **Evidence:** `gate.mjs --build` PASS on all four apps; full suite **8 passed
  (55.9s)**. Fork echo: clubs/trade were identical apart from a context key so
  they were `cp`'d back to identical; **gaterunner was hand-ported** — it has no
  `context` prop, different imports, its own `gr-` key prefix, and its helpers
  take an app argument.

### J8-1 · The landing page sells two spaces a new student cannot find · **S2/E2** · P1 · **filed — blocked on F7**
- `app/page.tsx` markets **Girls' Closet** and **Boys' Den** hard: their own titles
  ("A boys-only space no one else can see. Rent out the console between sems…")
  plus a pillar entry. It is one of the six things the landing page sells.
- Inside the app, a non-member never sees them again. `/home` renders only the
  spaces you already belong to, there is no `/spaces` index, and nothing explains
  that they are invite-only or how vouching works. A student who signed up
  *because* of that pitch has no path and no explanation — they just conclude it
  does not exist.
- **Why it is filed, not fixed:** the honest copy depends on **F7**. "Ask a
  member to vouch you in" is true once a space has a founding member — and VIT's
  **Girls' Closet currently has 0 members**, so shipping that sentence today
  points VIT students at a door nobody can open. Writing guidance that is false
  for the flagship space is worse than the current silence.
- **Recommendation, in this order:** (1) mint the founding invites (**F7**,
  `/admin/spaces`), then (2) add a short non-member card on `/home` — "Girls'
  Closet & Boys' Den are invite-only. A member vouches you in." Confirms nothing
  the landing page does not already say publicly, so there is no leak.

### J7-1 · Removing a pool member silently made the owner pay their share · **S2/E2** · P2 · **fixed**
- **Found by the logic audit.** `removeMember()` deletes the `subscription_members`
  row **and nothing else** — the remaining shares are never recalculated.
- **The money:** Netflix ₹400 split across owner + 3 members = ₹100 each. One
  member leaves. The other two still owe ₹100, so members cover ₹200 of a ₹400
  bill and **the owner quietly absorbs ₹200 every single cycle**, with nothing on
  screen saying so. The owner's share is implied (`total − Σ member shares`), so
  it silently grows and no number on the page ever looks wrong.
- **Fix — surface the gap, do NOT re-split automatically.** Someone may already
  have paid this cycle, and changing what they owe behind their back is worse
  than showing the shortfall. The pool page now always shows
  `Members cover ₹X · you cover ₹Y` to the owner, and when the owner's share
  exceeds an even seat it adds: *"That's more than an even seat (₹134) — usually
  because someone left and the shares never changed. Tap 'Split evenly' below to
  rebalance."* The existing **Split evenly** control sits right underneath, so the
  fix is one tap and the owner stays in control of the money.
- **Evidence, both directions:** under-covered pool (₹400, 2 members @₹100) →
  `Members cover ₹200 · you cover ₹200` **plus** the warning naming ₹134 as the
  even seat. Balanced pool (₹400, 2 members @₹134) → `Members cover ₹268 · you
  cover ₹132`, **warning absent** — so no false positives; the transparency line
  always shows, only the warning is conditional. Fork-echoed by `cp` after
  proving lockedin's pre-edit file was byte-identical to both forks;
  `gate.mjs --build` PASS on all three.
- **Confirmed working while cleaning up:** a raw SQL `update subscription_members
  set share_amount` was refused with **"only the pool owner can change shares"** —
  the 0051 owner-guard trigger holds even against a direct DB connection, because
  `auth.uid()` is null outside a session.

### J6-1 · The "you need their @username" rule is enforced in the UI only · **S1/E3** · P5 · **filed — needs your decision, deliberately NOT half-fixed**
- **Your constraint, verbatim in STATE:** *"I dont want people to start using this
  app to text anyone they want by searching their name on it"* and *"to contact
  them, one should know their unique username"*.
- **The UI honours it.** `/search?tab=people` says "People are found by their
  exact @username — ask them for it", and searching a real student's NAME
  ("Chiru") returns `Nothing on campus`. `find_by_username` (0037) is exact-match
  only. Walked and confirmed.
- **The API does not.** Probed as a plain student with a real role JWT:
  `select count(*) from profiles` → **19 rows** (every same-college profile), and
  `where name ilike '%a%'` → **16 rows**. The policy is
  `profiles: same-college read → college_id = get_my_college_id()`, so partial
  NAME search works fine directly against PostgREST with the public anon key plus
  the student's own token.
- **Chained with `find_or_create_dm`, that is the whole rule defeated.** That
  function guards self-DM, cross-college (0067) and blocks — but it never checks
  that the caller knew the username or has any relationship. So: enumerate names →
  take the uuid → open a DM. Exactly the cold-DM-by-name-search the constraint
  exists to prevent.
- **Severity:** filed S1 despite not being a UX blocker, because it is a stated
  *safety* boundary and the app advertises it as enforced. Mitigating context,
  stated honestly: it is **not reachable by tapping around** — it needs devtools
  or curl. This is a weaker-than-promised boundary, not an open door.
- **Why I did not fix it in this pass:** the obvious guard (require a context, or
  a shared community, or the exact username) is defeated by the fact that
  `ctype`/`ctx` are caller-supplied and forgeable, so a partial guard is security
  theatre. Doing it properly means per-context verification (is the caller really
  the buyer on that listing / a member of that trip / …) across **6 call sites ×
  3 forks**, plus threading the username through the search path. That exceeds
  this journey's diff cap, and a wrong guard on messaging silently blocks real
  conversations — worse than the current state.
- **Recommended design, when you pick it up:**
  1. Add `p_username text default null` to `find_or_create_dm`.
  2. Allow the DM when ANY holds: a conversation already exists · caller and
     target share a community or space · the caller is genuinely party to the
     named context (verified per type, not trusted from the argument) ·
     `lower(p_username)` equals the target's username.
  3. Otherwise raise "you need their @username to start a chat".
  4. Pass the username through from `/search`'s People result, which is the one
     legitimate no-relationship path.
- **Not recommended:** locking down the `profiles` SELECT policy. Names are read
  on listings, rosters, chats and karma badges everywhere; restricting rows there
  would break display across the app for no extra safety once the DM path is
  guarded.

### J5-1 · Only ONE person could run check-in for a club event · **S2/E2** · P3 · **fixed**
- **Found by the logic audit**, on the exact path `docs/LAUNCH.md` bets the launch
  on. `record_checkin()` authorised `post_author = auth.uid()` OR a same-college
  app moderator — **nobody else, including the club's own leads.**
- **Why it matters:** at a real fest the person on the door is a volunteer or a
  co-lead, not whoever happened to tap "post event". Today they cannot scan a
  single attendee, so the club passes one phone around all evening or the author
  stands at the door for the duration. Delegation is the whole point of a club
  tool, and barcode check-in is the feature LAUNCH.md calls the differentiator
  ("nothing else on campus does this").
- **Fix (`0077`):** a **lead** of the event's own community can now check in *and*
  read the roster. Applied to all three guards that had the same blind spot —
  `record_checkin()`, `event_roster()`, and the `event_checkins` read policy.
  Deliberately `role = 'moderator'` (the lead role) and **not** every member: a
  rank-and-file member must never mark attendance. Events with no `community_id`
  are unchanged.
- **Caught mid-fix — the twin-definition trap:** I first rebuilt the function from
  `0042`, but `0043` had already widened its return type (adding `attendee_id`
  and `email`). Postgres refused with *"cannot change return type of existing
  function"*. Rebased on `0043`, the live definition. Recorded because grepping
  for a function name in this repo can and does return a stale definition.
- **Evidence** (probes as real role JWTs, each in a rolled-back transaction):
  author → scan ALLOWED / roster ALLOWED; **club co-lead → scan ALLOWED / roster
  ALLOWED** (the fix); **plain member → scan DENIED / roster DENIED** (not
  over-permissive). `gate.mjs lockedin --build` PASS; full suite **8 passed**;
  0 probe rows left.

### J5-2 · The club pitch page still advertises an event that already happened · **S3/E1** · P3 · **filed**
- `/for-clubs` opens with *"Quanta bans WhatsApp groups, QR codes, and collecting
  phone numbers."* **Quanta ran 13–18 July and is over.** This is the page you
  hand to a club secretary during outreach, so stale-dated copy on it costs
  credibility with exactly the persona LAUNCH.md depends on.
- **Not rewritten, deliberately:** the replacement has to say something true
  about the *current* rules (Gravitas, or campus policy generally), and that is a
  fact about VIT I do not have. Guessing it would put a false claim on the
  outreach page — worse than a stale one.
- **Recommendation:** either name Gravitas if the same rules apply, or drop the
  event name entirely so the sentence stops rotting every semester.

### J5-3 · Dead Quanta banner still imported by four surfaces · **S4/E1** · — · **filed**
- `modules/communities/quanta-banner.tsx` hard-codes `QUANTA_END = 2026-07-19`
  and its own comment says *"delete after 2026-07-18"*. It now returns `null`
  unconditionally, but is still imported and rendered by
  `lockedin/app/communities`, `campusclubs/app/{communities,home}` and
  `campustrade/app/communities`.
- Harmless at runtime, which is why it will sit there forever. It belongs to the
  finishing pass's **dead weight** step — delete with the three-grep proof from
  `CODE.md` C14, across all forks.

### J4-1 · A claimed-but-abandoned pickup was invisible to everyone · **S2/E2** · P4, P2 · **fixed**
- **Found by the logic audit.** `escalate_stale_pickups()` (0022) has two
  branches and **both** open with `delivered_claimed_at < now() - interval '...'`.
  When a runner claims a pickup and never taps "Dropped it off",
  `delivered_claimed_at` is **NULL**, so both comparisons evaluate NULL -> false
  and **neither branch ever fires.**
- **What that means for a student:** the request sits `status='claimed'` forever.
  Nobody is reminded, no moderator is told, and because it is no longer `open`
  **no other runner can see it.** The requester's parcel is stranded at the gate
  and the job has silently left the pool — which is the worst possible failure
  for an app whose actual problem is that too few people run.
- **Fix:** `0076` adds a third branch — claimed, past `expected_at + 3h`, and
  never dropped off — which nudges the **runner** ("Did you grab it? Tap Dropped
  it off, or hand it back") and tells the **requester** they can cancel and
  repost. One-shot via a new `stale_claim_nudged_at` column.
- **Deliberately NOT auto-releasing the claim back to `open`:** the runner may
  physically hold the parcel and simply not have tapped. Auto-releasing would
  invite a second runner to collect something already collected. Nudge the
  humans; the requester already has cancel.
- **Evidence** (probes in a rolled-back transaction, three fixtures): stale 5h
  claim → **runner nudged + requester alerted**; fresh 1h claim → **not** nudged
  (no premature spam); dropped-off-5h-ago → the original 4h reminder **still
  fires**, so the existing branches are intact. One cron run produced exactly 3
  notifications; a second run produced **0**. `gate.mjs --build` PASS on lockedin
  and gaterunner; full suite **8 passed**; DB clean after.
- **Zero app-code changes** — the fix is in the hourly `gate-runner-escalation`
  cron job, so both gate surfaces inherit it.

### J3-1 · A pending offer on a sold listing was a dead end · **S2/E2** · P2 · **fixed**
- **Found by the logic audit, not the UI walk** — the screens all look fine. The
  rules did not: `listings` had one trigger (saved-search matching), `offers` had
  one (the 0068 transition guard), and **neither resolves an offer when the
  listing is marked sold.**
- **The buyer's actual path:** make an offer → seller sells to someone else →
  the offer stays `pending` **forever**, no notification, and offers surface
  *only* on the listing detail page (there is no "my offers" screen), so the only
  way to discover it is to revisit that exact listing and notice a live offer on
  a sold item. A state with no legal next action.
- **Fix — at the DB, not the app:** `0075` adds `close_offers_on_sold`, an AFTER
  UPDATE trigger on `listings` that declines every pending/countered offer the
  moment status becomes `sold` and notifies each buyer with the amount and a link.
  Chosen over an app-layer fix because three forks each own a marketplace surface
  and `setSold()` is a plain table update in all of them — the trigger closes it
  once for every caller, including direct PostgREST writes. **Zero app-code
  changes.**
- **Guarded against the obvious regression:** re-listing (`sold → available`)
  must not resurrect declined offers or re-notify, since the buyer was already
  told. The trigger fires only on the transition *into* sold.
- **Evidence** (probes inside a rolled-back transaction): pending offer after
  sold → `declined`; **1** notification, to the buyer, reading
  `"ZZ probe cycle" was sold — your ₹900 offer is closed.`; relist+resell →
  status still `declined`, **0** extra notifications. `gate.mjs lockedin --build`
  PASS; full suite **8 passed**; DB clean afterwards (0 probe listings).

### J2-1 · Global search couldn't find a single campus building · **S1/E2** · P1 · **fixed**
- **Hit while:** the fresher's most common question. Typed `SJT` into the search
  bar that says **"Search campus…"** and got back:
  `🤷 Nothing on campus for "SJT"` — while the DB held **48 human-verified
  buildings including Silver Jubilee Tower**. The app knew the answer and denied it.
- **Why S1:** it does not merely omit a result, it *asserts* the thing isn't on
  campus. For P1 that is the single highest-frequency query in week one, and a
  wrong "nothing here" teaches them the search box is useless.
- **Cause:** `/search` queried listings, posts, group_orders, communities and
  people. `campus_buildings` was never in the list, even though its RLS is
  public-read (0065) so the mother app can read it freely.
- **Fix:** a `Places` tab + a "Places on campus" section, matching **name OR aka**
  (students say "SJT" and "TT", never the full name), rendered ABOVE the other
  sections — someone searching a building wants the building, not a listing that
  mentions it. Each result deep-links to `map.chiranjib.online/?b=<id>`, which
  opens Compass with that pin already selected. With no query the tab is a
  browsable campus directory, which is what a fresher wants before they know what
  to search for. Reuses the established `replace(/[,()]/g," ")` sanitiser so the
  previously-fixed PostgREST `or()` bug is not reintroduced.
- **Also caught in the same pass, self-inflicted:** first render produced
  **"Near Near Gate 3"**, because moderators type "Near Gate 3" into a field the
  UI already prefixes with "Near". Now only prefixes when the value doesn't
  already start with it.
- **Evidence:** `q=SJT` → `Places on campus / Silver Jubilee Tower · SJT / Near
  Gate 3` + `SJT Canteen · SJT Food Court`; `q=gate` → Gate 1A, Gate 2A/2;
  Places tab with no query renders the directory. Tracked regression test added
  (`e2e/search-places.spec.ts`) which seeds its own building through the admin
  CMS and deletes it, so it survives the U10 cleanup. Full suite **8 passed**;
  `gate.mjs lockedin --build` PASS. Mother app only — the two forks are
  club/marketplace products and a campus directory is not their job.

### J2-2 · Nickname search misses punctuated names · **S3/E1** · P1 · **filed**
- `MGR` returns nothing, because the building is stored as `Dr. M.G.R Block` and
  `ilike '%MGR%'` cannot span the dots. A fresher types the nickname without
  punctuation every time.
- **Fix when picked up:** strip non-alphanumerics from both sides before
  comparing — e.g. an expression index on `regexp_replace(lower(name),'[^a-z0-9]','','g')`,
  or a generated `search_key` column. Cheap, but it is a schema change (E1 code /
  E3 if indexed), so not done inside a UI pass.

### J1-2 · Five 0-member chapters sit on a new student's home feed · **S3/E2** · P1, P6 · **filed — needs a product decision**
- **Hit while:** first `/home` load as a zero-data fresher. The clubs shelf renders
  `IEEE-TEMS VIT ✔ 0 members`, `IEEE-SPS VIT ✔ 0 members`, and three more.
- **Ordering is already sane** — `recruiting desc, is_official desc, created_at desc`
  in `modules/feed/clubs-strip.tsx`, so the three populated recruiting clubs do
  lead and the empty ones fall below. This is not a bug.
- **The tension:** "0 members" is honest, but five of them on the first screen a
  new student ever sees reads as a dead campus. Hiding them buries legitimately
  new clubs, which is the opposite problem. Two defensible designs, so **not
  guessed at.**
- **Recommendation:** don't hide — relabel. A 0-member official chapter should say
  something like "New — be the first in" rather than "0 members", turning a
  dead-signal into an invitation. One line in the shelf, no query change.



---

## Dismissed

Recorded so the next pass does not re-raise them. A dismissal without a reason is
not a dismissal.

<!-- POLISH-DISMISSED -->

### J10-D1 · "A VIT moderator can ban a Demo College student" — **dismissed, my probe measured the wrong thing**
The first probe reported `VIT mod bans a DEMO user -> ALLOWED` and I very nearly
filed it as a P0 tenancy leak. It was a false positive: the probe asked *"did the
RPC raise?"* when the question was *"did anything change?"* — and I had explicitly
called the state check "redundant" a step earlier, which is precisely what made
it wrong.

`mod_ban_user` is correctly scoped:
`update profiles set is_banned = true where id = uid and college_id = mod_college;`
A cross-college call matches 0 rows, so it returns without error and **changes
nothing**. Re-probed on actual state: VIT mod → DEMO user = `ACTUALLY BANNED:
false`; VIT mod → own-college user = `true`. Tenancy holds.

Residual, not worth fixing: the cross-college call is a **silent no-op** rather
than an error. It is unreachable from the UI anyway — `profiles` is same-college
read, so a VIT moderator cannot even list a Demo student, and the moderation
queue is college-scoped.

**Lesson for the next pass: for an RPC that guards with a WHERE clause rather than
a RAISE, absence of an exception proves nothing. Assert on the row.**

### J8-D1 · "`/spaces` is a dead end for non-members" — **dismissed, self-inflicted**
Typing `/spaces` shows "Nothing here — this page doesn't exist, or you don't have
access to it". That is because **there is no `/spaces` index route** (only
`[id]`, `join`, `loading`) and `grep 'href="/spaces"'` returns **nothing** — no
link in the app points there. I reached it by guessing a URL, not by following
the product. The real discoverability gap is J8-1; this 404 is not it.

### J3-D1 · "A WhatsApp button on the listing page violates the no-WhatsApp constraint" — **dismissed**
The listing detail does render a **WhatsApp** button, and STATE carries the
verbatim rule *"i dont want anyone to share their whatsapp number like so easily"*.
Traced it before acting: `components/share-button.tsx:49` is
`https://wa.me/?text=<title> — <public link>` — **no phone number in the URL**. It
opens WhatsApp's share sheet so the user picks a recipient, i.e. it shares a
public listing link, not anyone's contact details. The constraint was about
exposing your own number as a contact method, which remains removed. Not a
violation. Recorded so a future pass does not "fix" a working share button.

### J3-D2 · "`setSold` has no ownership check" — **dismissed**
`modules/marketplace/actions.ts:130` updates `listings.status` filtered only by
`id`, with no `.eq("seller_id", user.id)`. Checked the DB rather than assuming:
policy `listings: seller update` is `USING (seller_id = auth.uid())`, so a
non-owner's update affects 0 rows, and the control is never rendered to a
non-owner anyway. Defence-in-depth would be nice, not a finding.

### J1-D1 · "`/home` renders completely blank for a new student" — **dismissed, measurement artifact**
First walk reported `main` innerText as **empty** at both 390 and 360, which looked
like the flagship S1 this loop exists to catch. It was wrong: `/home` streams its
sections through Suspense (see the comment at `app/home/page.tsx:42` — a broken
section is meant to stream in empty rather than blank the page), and the probe
measured immediately after `waitForURL`, before streaming settled. Re-measured
after `networkidle` + 2.5s: **1286 characters, 16 module cards, real content**.
**Lesson for the next pass: on this app, never assert on page text without
waiting for streaming to settle — you will invent an S1 that does not exist.**

---

## Polish log

One line per journey. Newest last.

<!-- POLISH-LOG -->
2026-07-28 · J10 trust & safety · 0 fixed / 1 dismissed · VERIFIED CLEAN, and this one was probed hard because it is the journey where a miss is a safety failure. Bans are enforced in the DATABASE, not just the UI: NOT is_banned() sits in the WITH CHECK of the INSERT policies on listings, posts and messages — a banned user's insert is refused by RLS, with a non-banned control proving the probe valid. mod_ban_user is college-scoped and a plain student calling it is refused 'not a moderator'. /privacy is specific and dated, /delete-account names exactly what it removes and demands you type DELETE, and /admin/moderation refuses a plain student without confirming the route exists. One dismissal recorded — I briefly mis-read a scoped no-op as a cross-college ban leak because the probe asserted on exceptions instead of on rows.
2026-07-28 · J9 come back · 2 fixed (S2, the retention journey) · THE HEADLINE NUMBER: 166 notifications generated across 12 users but only 1 push subscription across 18 real students. The app makes plenty of reasons to return; almost nobody can receive them. Two one-line causes, both in the opt-in card: "Not now" wrote the SAME key as "Enable" so a single day-one dismissal silenced it forever, and a DENIED or FAILED enable was written as success because the caller threw away a status string the helpers already return. Both fixed; the prompt now returns after 7 days and only a real subscription counts as decided. Best severity-per-effort find of the loop so far.
2026-07-27 · J8 spaces · 0 fixed / 1 filed / 1 dismissed · THE ISOLATION IS AIRTIGHT and that is the headline: probed as a non-member with a real role JWT, an outsider sees space row 0, roster 0, listings 0, requests 0 — all four boundaries hold. Cross-space invite scoping also holds: a Boys' Den member minting an invite to Girls' Closet is refused with "not a member of this space", while their own space is allowed. Design note worth keeping: spaces carry NO gender column and space_members no role — membership is purely social via vouching, with no INSERT policy so every write goes through a definer RPC. That is the right call; gender is not reliably storable. Only gap is discoverability (J8-1), and it is blocked on F7.
2026-07-27 · J7 split & share · 1 fixed (S2, money) · removing a subscription member never recalculated shares, so the owner silently ate the leaver's cost every cycle — fixed by surfacing the shortfall rather than re-splitting money people may already have paid. Both directions proven (warns when short, stays quiet when balanced). PROCESS CHANGE after the probe account was spotted in the live app mid-pass: the walk account is now named zz.polish.probe@ / 'ZZ PROBE — delete me' so it can never be mistaken for a student, and seed→walk→delete happens in one run instead of spanning steps.
2026-07-27 · J6 talk to people · 0 fixed / 1 filed (S1) · a journey where the UI is right and the API is not. /chats has a good empty state with a next action; the People tab correctly refuses NAME search and says to ask for the @username. But a plain student can read all 19 same-college profiles straight from PostgREST and filter them by partial name, then hand any uuid to find_or_create_dm — which never checks that you knew the username. The rule is client-side. Filed rather than half-fixed: ctype/ctx are caller-supplied so a quick guard is theatre, and the real fix is per-context verification across 6 call sites x 3 forks. NOT reachable by tapping around; needs devtools.
2026-07-27 · J5 clubs & events · 1 fixed (S2) / 2 filed · UI is healthy — /events has a real empty state, /communities leads with the recruiting shelf, /for-clubs is a strong outreach page, no overflow at 390. The finding was again in the RULES and it sat directly on the launch path: only the event's original author could run barcode check-in, so a club could not put a volunteer or co-lead on the door. Fixed across all three guards. Also learned the hard way that grepping a function name here can return a STALE definition — 0043 had already replaced 0042's record_checkin with a wider return type.
2026-07-27 · J4 gate run · 1 fixed (S2) · UI half is healthy: the runner opt-in shipped earlier today renders, toggles false→true and PERSISTS across navigation ("You're a gate runner"), proving the 0074 column grants were right; no overflow at 390 or 360; the empty state has personality ("someone's biryani always needs a hero"). The finding was again in the RULES, not the pixels — a runner who claims and then ghosts left the parcel stranded AND removed the job from the pool, with no reminder to anyone, because both existing escalation branches filter on a delivered_claimed_at that is still NULL in exactly that case.
2026-07-27 · J3 buy & sell · 1 fixed (S2) / 2 dismissed · the UI walk found nothing wrong — empty states on /saved, /marketplace/mine and requests are all good, trust signals on a listing are strong (name + verified name + karma tier + ★3.7 rating + "Chat with seller" as the only contact path), no email/phone/WhatsApp-number leak in the page source, no overflow at 390 or 360. The finding came from the LOGIC audit instead: nothing resolved a pending offer when the listing sold, so the buyer sat in a dead end forever. Fixed in the DB so all three marketplace forks inherit it. Note for later: ZERO offers have ever been made in production — same shape as GateRunner's supply problem, worth a look once the marketplace has traffic.
2026-07-27 · J2 find your way · 1 fixed (S1) / 1 filed · the headline: global search answered "Nothing on campus for SJT" while holding 48 verified buildings — places are now searchable by name AND nickname and deep-link into Compass. Clean on everything else: /timetable's zero-class state is good ("No classes today — enjoy it, or add your week below") with exactly one obvious next action and ZERO sub-44px targets at either width; search's no-results copy is good ("Try a different word — or post it yourself"); no horizontal overflow at 390 or 360 on any screen walked. Search's filter chips are 34px tall — already covered by QUEUE A35, not re-filed.
2026-07-27 · J1 first run · 1 fixed / 1 filed / 1 dismissed · walked at 390×844 and 360×800 as a genuinely fresh zero-data VIT account (seeded at DB level because confirm-email is now ON, then deleted). No horizontal overflow at either width on any screen. Empty states on /timetable and /notifications are good ("No classes today — enjoy it, or add your week below"). Signup states the college-domain rule up front, before you can fail it. Sub-44px tap targets remain in the mother app's header + text links (logo 19px wide, avatar chip 36px, "Requests" 57×20, "Delete my account" 342×16) — QUEUE A16 did this pass for gaterunner+vitcompass only; filed as A35 rather than fixed here, since it is J-wide and not J1-specific.

---

## Finishing pass — 2026-07-28

Gated behind all ten journeys, per `.claude/commands/polish.md`.

### 1 · Correctness sweep — **done**
- `sweep.mjs --fork`: **8 drifts → 7**. Seven are expected product divergence,
  confirmed by reading each: `bottom-nav`/`nav-link`/`header` (clubs has different
  nav items, icons and no admin-toolbox link), `pwa.tsx` (reworded comment + brand
  name), `lib/push/client.ts` (per-app name strings), and `modules/gate/{actions,client}`
  (my J4/J5 work; `/gate` is denied in clubs/trade by A10 middleware).
- **One was real and is fixed:** `offer-panel.tsx` had identical line counts but a
  different hash across forks — the giveaway. lockedin carried
  `aria-label="₹ your price"` and `aria-label="₹ counter"`; **both forks had
  neither.** QUEUE A20's accessibility pass was echoed incompletely. All three
  files are now byte-identical.
- All **five** apps `gate.mjs --build` **PASS**; full suite **8 passed**.

### 2 · Query cost — **no fix warranted**
- No per-row query on any hot list screen. `.map(async` appears twice repo-wide:
  `api/push/dispatch` is inherently one HTTP call per subscription and is bounded
  by `MAX_SUBS` (correct by design), and `admin/moderation` issues one query per
  **open** report.
- The moderation one is a genuine N+1 but not worth collapsing: it is
  moderator-only, parallelised through `Promise.all`, currently **1 row** in
  production, and polymorphic across five target tables — a single query means a
  union or five grouped queries, i.e. real complexity for a one-row screen.
  **Threshold for revisiting: if open reports routinely exceed ~50**, at which
  point a backlog that size is a moderation problem before it is a perf one.
- Indexes were already done properly in QUEUE A9 (8 additive indexes, each proven
  usable with `enable_seqscan=off` EXPLAIN).

### 3 · First paint — **clean**
- 12 routes ship content-shaped skeletons (`/home`, `/marketplace`, `/board`,
  `/communities`, `/gate`, `/cabs`, `/group-buy`, `/subscriptions`, `/timetable`,
  `/spaces`, `/matches`, `/notifications`).
- The other 9 are **not blank**: `app/loading.tsx` is a root fallback rendering
  `SpeederLoader`, which Next uses for any segment without its own. `error.tsx`
  and `not-found.tsx` both exist. No blank page, no layout shift.

### 4 · Dead weight — **awaiting approval**
`QuantaBanner` (J5-3) has returned `null` unconditionally since 19 July and its
own comment says delete it. C14 three-grep proof is clean: 13 bare-name hits
(3 definitions, 5 imports, 5 render sites), **0** dynamic dispatch, **0** barrel
exports. Deletion is a hard-stop action, so the exact target list was pasted for
the user and it is not removed yet.

### 5 · Empty-app test — **effectively continuous**
Not run as a separate step because every journey J1–J10 was walked on a
**brand-new zero-data account**, seeded and deleted per pass. That is the same
check, applied ten times. Its findings are already logged (J1-1, J2-1, and the
empty states confirmed good on `/timetable`, `/notifications`, `/saved`,
`/marketplace/mine`, `/events`, `/chats`).
