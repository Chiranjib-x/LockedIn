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
| **J5** | Clubs & events | /communities, /for-clubs, events, RSVP, check-in, analytics | P3, P1 | — | — |
| **J6** | Talk to people | /chats, usernames, contact boundaries, reporting | P5, P2 | — | — |
| **J7** | Split & share | /group-buy, /subscriptions, /cabs, /crews | P2, P5 | — | — |
| **J8** | Spaces | Girls' Closet / Boys' Den, invites, vouching | P5, P1 | — | — |
| **J9** | Come back | /notifications, push, "what changed since last time" | **P6**, P7 | — | — |
| **J10** | Trust & safety | moderation, reports, bans, /delete-account, /privacy | P5 | — | — |

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
2026-07-27 · J4 gate run · 1 fixed (S2) · UI half is healthy: the runner opt-in shipped earlier today renders, toggles false→true and PERSISTS across navigation ("You're a gate runner"), proving the 0074 column grants were right; no overflow at 390 or 360; the empty state has personality ("someone's biryani always needs a hero"). The finding was again in the RULES, not the pixels — a runner who claims and then ghosts left the parcel stranded AND removed the job from the pool, with no reminder to anyone, because both existing escalation branches filter on a delivered_claimed_at that is still NULL in exactly that case.
2026-07-27 · J3 buy & sell · 1 fixed (S2) / 2 dismissed · the UI walk found nothing wrong — empty states on /saved, /marketplace/mine and requests are all good, trust signals on a listing are strong (name + verified name + karma tier + ★3.7 rating + "Chat with seller" as the only contact path), no email/phone/WhatsApp-number leak in the page source, no overflow at 390 or 360. The finding came from the LOGIC audit instead: nothing resolved a pending offer when the listing sold, so the buyer sat in a dead end forever. Fixed in the DB so all three marketplace forks inherit it. Note for later: ZERO offers have ever been made in production — same shape as GateRunner's supply problem, worth a look once the marketplace has traffic.
2026-07-27 · J2 find your way · 1 fixed (S1) / 1 filed · the headline: global search answered "Nothing on campus for SJT" while holding 48 verified buildings — places are now searchable by name AND nickname and deep-link into Compass. Clean on everything else: /timetable's zero-class state is good ("No classes today — enjoy it, or add your week below") with exactly one obvious next action and ZERO sub-44px targets at either width; search's no-results copy is good ("Try a different word — or post it yourself"); no horizontal overflow at 390 or 360 on any screen walked. Search's filter chips are 34px tall — already covered by QUEUE A35, not re-filed.
2026-07-27 · J1 first run · 1 fixed / 1 filed / 1 dismissed · walked at 390×844 and 360×800 as a genuinely fresh zero-data VIT account (seeded at DB level because confirm-email is now ON, then deleted). No horizontal overflow at either width on any screen. Empty states on /timetable and /notifications are good ("No classes today — enjoy it, or add your week below"). Signup states the college-domain rule up front, before you can fail it. Sub-44px tap targets remain in the mother app's header + text links (logo 19px wide, avatar chip 36px, "Requests" 57×20, "Delete my account" 342×16) — QUEUE A16 did this pass for gaterunner+vitcompass only; filed as A35 rather than fixed here, since it is J-wide and not J1-specific.
