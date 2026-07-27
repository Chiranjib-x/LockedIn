Walk the app as real students, find what's weak, then fix it as a senior engineer — one journey per pass.

`/hunt` finds **bugs** from the code inward. `/polish` finds **friction and
faulty logic** from the user inward, and — unlike `/hunt` — it is allowed to fix
what it finds. Its ledger is `docs/POLISH.md`.

## The prime directive

**Do not break a working app to make it prettier.** Every change here is
elective. That means the bar is higher, not lower: a change ships only if it
removes a *named* problem a student actually hit in a journey. "This felt off" is
not a finding. "A fresher on day one lands on /home and every list is empty, so
there is nothing to do and no reason to return" is.

The corollary: **a journey that finds nothing is a success.** Record it and move
on. Inventing work to look busy is how a stable app becomes an unreviewable diff.

## Startup — once per session

1. Read `docs/POLISH.md` (journey table, open findings), `docs/STATE.md`
   `## Constraints` + `## Failed attempts`, and `docs/FINDINGS.md` `## Dismissed`
   — never re-raise something already ruled out with a reason.
2. `git status --short` — dirty tree means finish or shelve that first.
3. Baseline the gate so you can tell your breakage from pre-existing red:
   `node scripts/gate.mjs <app>` for the apps in scope.
4. Say which journey you're taking and why.

## The personas — a team, not one tester

Each pass runs the journey **through every persona below**. They notice different
things; that is the entire point of a panel. Do not merge them into one generic
user.

| # | Persona | What they are trying to do | What they notice that others miss |
|---|---|---|---|
| **P1** | **Fresher, week one** | Find a building, find their class, find anyone | Empty states, jargon, anything assuming you already have friends or context |
| **P2** | **Seller / buyer** | Offload a cycle, buy a fridge | Trust signals, price/condition clarity, how you contact a stranger safely |
| **P3** | **Club secretary** | Run a Gravitas event, recruit, track attendance | Bulk actions, permissions, "can I undo that", anything that needs 20 taps |
| **P4** | **Gate runner** | Earn ₹ on a walk they're already taking | Whether the job is *findable at the moment it matters*, and whether it's worth it |
| **P5** | **The sceptic** | Check what the app knows and leaks | Exposed identity, contact info, cross-college bleed, anything creepy |
| **P6** | **Day-7 returner** | Remember why they installed it | Whether anything changed since last time. This persona measures retention |
| **P7** | **Constrained phone** | Use it one-handed on bad campus wifi | 360px overflow, tap targets, slow-network double-submit, offline behaviour |

**P6 is the most important and the most skipped.** The live signup curve (a burst
then flatline) says retention, not acquisition, is this product's actual problem.
A journey that never asks "why would they open this again tomorrow?" is not done.

## The iteration — one journey per pass

**1 — Pick a journey.** First row in the `docs/POLISH.md` journey table with no
`Last walked` date. Journeys are ordered by how many students hit them.

**2 — Walk it, as each persona.** Drive the real app at **390×844 and 360×800**
against the dev server. For every persona, record what they'd do next and where
they'd stall. A journey is not walked until you have driven it — reading the code
is how you miss that a button exists but is below the fold behind an empty list.

**3 — Audit the logic, separately from the UI.** For every feature in the
journey, write its rules down and attack them. This is where the non-obvious
problems live:
- What happens if the other party never acts? (never delivers, never confirms,
  never replies) Is there a timeout, an escalation, or does it hang forever?
- What if two people act at once? Who wins, and does the loser get told?
- What if the only admin/owner/founder leaves?
- What does a count of **zero** do — is it data or is it treated as missing?
- Can a user reach a state with no legal next action?
- Does every state the DB permits have a screen that renders it?

**4 — Triage.** Every finding gets a severity AND an effort, because the fix
order depends on both:

| | meaning |
|---|---|
| **S1** | blocks or actively misleads a student |
| **S2** | costs a student real time or trust |
| **S3** | friction — noticed, tolerated |
| **S4** | polish |

Effort: **E1** ≤20 lines · **E2** a file or two · **E3** schema/API change.
Fix order is **S1 first, then highest severity per unit effort.** An S2/E1 beats
an S1/E3 that needs a migration and a decision — do the cheap high-value ones
first and keep the loop moving.

**5 — Fix, as a senior engineer.** In fix order:
- Smallest change that removes the named problem. Not a redesign.
- **Fork echo before done.** `lockedin`/`campusclubs`/`campustrade` share ~100
  near-identical files — but they have genuinely diverged (google-auth-button and
  the gate module both differ). `md5sum` the file in each fork BEFORE copying;
  if they differ, port the change by hand and preserve each fork's own values.
- Anything needing a product decision or access you don't have → file it, say
  what you need, move on. Do not guess at product intent.
- S3/S4 that are not on the current journey → file to `docs/QUEUE.md`, do not fix.

**6 — Gate, every time.** `node scripts/gate.mjs <app> --build` for each app
touched, plus `npx playwright test`. Red gate: TRIGGER → `docs/guardrails/DEBUG.md`.
A red suite full of `[WebServer] TypeError: fetch failed` is the sandbox's egress
flapping, not your change — check the log before debugging code that is fine.

**7 — Commit.** One concern per commit: `polish: <what> (POLISH <ID>)`.
Push only if the user has asked for pushes in this conversation.

**8 — Record, same turn.** Finding → `fixed` with a real `Evidence:` line
(a command and its output, or a before/after). Journey row gets today's date and
the finding IDs. Append to `## Polish log`.

**9 — Next journey.** No check-in.

## The finishing pass — only after every journey is walked

Do not start this early; it is meaningless on an app whose journeys still have
S1s. In order:

1. **Correctness sweep** — `node scripts/sweep.mjs --fork` for drift; every app
   green on `gate.mjs --build`; full E2E green.
2. **Query cost** — for each list screen, count the queries it issues. Any N+1
   or missing index on a hot path gets fixed or filed with the `EXPLAIN` pasted.
3. **First paint** — what does each main screen render before data arrives? A
   spinner is acceptable; a blank page is not; layout shift is not.
4. **Dead weight** — unreferenced components, routes nothing links to, deps
   nothing imports. Delete with the three-grep proof from `CODE.md` C14.
5. **The empty app test** — create a brand-new account and walk it. Every screen
   must explain itself with zero data. This is the single highest-leverage check
   in this file, because it is what every new student sees.

## Stop conditions

1. **All journeys walked and the finishing pass is done** — report the ledger.
2. **A change needs a product decision** — two defensible designs, no way to pick
   from the code. File it with a recommendation, move on.
3. **A fix would touch a user constraint** — `docs/STATE.md` `## Constraints` has
   verbatim "do not build X" lines. They win.
4. **A finding needs access you don't have** — dashboard, Play Console, a real
   phone. File under QUEUE `USER-GATED`.
5. **Three failed attempts on one finding** — mark it `blocked`, write the
   ATTEMPT entries, move on. Do not grind.
6. **The diff for one journey exceeds ~400 lines** — stop and report. A polish
   pass that large is a redesign that has not been agreed.

## What does not count

- A journey marked walked when you only read the code.
- A finding with no persona attached — if no persona hits it, it is not friction.
- A "fix" that changes a working screen with no named problem behind it.
- A fix in one fork when the construct exists in three.
- An S1 left open because an S4 was more fun to fix.
- The finishing pass run before the journeys.
