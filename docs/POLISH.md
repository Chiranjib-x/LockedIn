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
| **J1** | **First run** — signup → first screen → "now what?" | signup, /home, onboarding, empty states | P1, P6, P7 | — | — |
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
_None yet — run `/polish`._

---

## Dismissed

Recorded so the next pass does not re-raise them. A dismissal without a reason is
not a dismissal.

<!-- POLISH-DISMISSED -->

---

## Polish log

One line per journey. Newest last.

<!-- POLISH-LOG -->
