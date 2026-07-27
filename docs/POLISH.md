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
| **J2** | Find your way | VIT Compass, /timetable, free windows, /search | P1, P7 | — | — |
| **J3** | Buy & sell | /marketplace, listings, offers, requests, /saved | P2, P5 | — | — |
| **J4** | Gate run | /gate, post, opt-in, claim, deliver, reward | P4, P2 | — | — |
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
2026-07-27 · J1 first run · 1 fixed / 1 filed / 1 dismissed · walked at 390×844 and 360×800 as a genuinely fresh zero-data VIT account (seeded at DB level because confirm-email is now ON, then deleted). No horizontal overflow at either width on any screen. Empty states on /timetable and /notifications are good ("No classes today — enjoy it, or add your week below"). Signup states the college-domain rule up front, before you can fail it. Sub-44px tap targets remain in the mother app's header + text links (logo 19px wide, avatar chip 36px, "Requests" 57×20, "Delete my account" 342×16) — QUEUE A16 did this pass for gaterunner+vitcompass only; filed as A35 rather than fixed here, since it is J-wide and not J1-specific.
