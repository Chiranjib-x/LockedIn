Hunt bugs across the five apps, beat by beat: sweep → confirm → triage → fix P0/P1 → file the rest.

`/loop` executes a known queue. **`/hunt` discovers the work.** Its output is
`docs/FINDINGS.md`, and the P2/P3 findings it files become `/loop`'s future input.

## The prime directive

**A detector hit is a suspect, not a conviction.** `scripts/sweep.mjs` is regex
over a codebase; it cannot tell a real N+1 from a bounded three-row join, or an
IST bug from a deliberately-UTC timestamp. Confirm every finding by reading the
code before touching it. Mass-applying fixes from sweep output is how you break
five working apps at once.

The corollary: **`dismissed` is a success.** A sweep that raises 450 P2s and
confirms 12 of them did its job. Record why the other 438 were ruled out.

## Startup — once per session

1. Read `docs/FINDINGS.md` (coverage table, open findings, dismissals) and
   `docs/STATE.md` `## Constraints` + `## Failed attempts`.
2. `git status --short` — a dirty tree means finish or shelve that first.
3. Run the full sweep once for a baseline:
   `node scripts/sweep.mjs`
4. Say which beat you're taking and why.

## The iteration — one beat per pass

**1 — Pick a beat.** First row in the FINDINGS coverage table with no
`Last swept` date. Beats are ordered by blast radius: auth and marketplace before
polish. Announce it.

**2 — Sweep it, four ways.** A beat is not swept until all four have run:

- **Static.** `node scripts/sweep.mjs <app> --axis=<axis>` for the beat's files.
  Detectors encode this repo's own bug history — C1/C2 are the IST bugs it
  shipped twice, C5 is the outage from migration 0041, C7 is the RLS gotcha in
  STATE `## Failed attempts`.
- **Read.** Open the beat's server actions and the RLS policies for its tables.
  Static analysis cannot see a missing authorization check. This is where P0s
  actually live.
- **Run.** Drive the beat's happy path *and* its edge cases at 390×844 against
  the dev server on :3001. Empty state, first-run, permission-denied,
  slow-network double-submit, back-button mid-flow.
- **Probe.** For any table the beat writes: attempt the write as the wrong user,
  the wrong college, and a non-member. Established pattern — real role JWTs, SQL
  probes, paste the output. College isolation is the one that matters most; five
  apps now share one Postgres.

**3 — Triage each hit.** Read the code, then assign:
- **P0** data loss, leak, crash, tenancy hole → fix now
- **P1** a user-facing flow is broken or silently wrong → fix now
- **P2/P3** degraded or cosmetic → file to FINDINGS *and* append a QUEUE item;
  do not fix in this loop
- **dismissed** → record the reason in FINDINGS `## Dismissed`

**4 — Fork echo, before any fix is called done.** `lockedin`, `campusclubs`, and
`campustrade` share ~100 near-identical files. For every confirmed finding, grep
the same construct in the other two forks. Fix all affected forks in the same
commit. A fix in one fork only is not a fix — it is new drift, and
`node scripts/sweep.mjs --fork` will raise it next sweep.

**5 — Fix P0/P1 only.** Smallest change that resolves the finding.
- Add or extend a test that fails before the fix and passes after. For a bug
  class this repo has shipped before (IST, RLS, version skew), the test is the
  deliverable — the fix without it will regress.
- Everything else you notice goes to FINDINGS or QUEUE. Not into this commit.

**6 — Gate.** `node scripts/gate.mjs <app>` for each app you touched, plus
`npx playwright test` if the beat has specs. Red gate: TRIGGER →
`docs/guardrails/DEBUG.md` → fix → re-gate. Three failures on one finding: mark
it `blocked`, write an ATTEMPT entry in STATE `## Failed attempts`, move on.

**7 — Commit.** One commit per finding, or one per beat when the fixes are a
single class across forks.
`git commit -m "<beat>: <what> (FINDINGS <ID>)"` — **never push.**

**8 — Record.** Same turn: finding → `fixed` with a filled `Evidence:` line;
coverage table row gets today's date and the finding IDs; append to
`## Hunt log`: `<date> · <beat> · <n confirmed>/<n raised> · <sha> · <one line>`.

**9 — Next beat.** No check-in.

## "Make it amazing" — the standing bar

Beyond bugs, a beat is not swept until you have asked, of its main screen:

- Does every list have a real empty state, or does it render blank?
- Does every action give feedback — pending, success, failure — or does the
  button just sit there?
- Does every failure say something a student can act on, or does it surface
  `duplicate key value violates unique constraint`?
- Can you reach a dead end with no way back?
- At 390px and 360px: any horizontal overflow, any tap target under 44px?
- Icon-only controls: do they have accessible names?

File what you find. **Do not redesign working screens.** Polish is a P2/P3 file,
not an in-loop rewrite — an autonomous loop that starts refactoring UI it merely
finds unlovely is how a stable app becomes an unreviewable diff.

## Stop conditions

1. **All beats swept** — report the ledger: raised, confirmed, fixed, filed.
2. **A P0 needs a destructive fix** — dropping a column, deleting rows, rewriting
   history. Paste exactly what would be lost and wait.
3. **A finding needs a product decision** — two defensible behaviours and no way
   to pick from the code. File it, say what you'd need, move on.
4. **A user constraint blocks the fix** — check STATE `## Constraints`; several
   are verbatim "do not build X".
5. **The fix requires access you don't have** — Supabase dashboard, Play Console,
   a physical phone. File it under QUEUE's USER-GATED list.
6. **Three separate findings hit three failed attempts** — something
   environmental is wrong. Stop and report rather than grinding.

## What does not count

- A beat marked swept when only the static detector ran.
- A finding marked `fixed` with an empty `Evidence:` line.
- A fix in one fork when the construct exists in three.
- A P2 "fixed" opportunistically mid-beat — that is scope creep wearing a
  bug's clothes.
- A dismissal with no reason recorded.
