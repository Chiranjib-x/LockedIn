Work `docs/QUEUE.md` top-down, autonomously, one item per iteration, until a stop condition fires.

You already have standing permission to keep going without checking in
(STATE.md `## Constraints`, 2026-07-12). Use it. Do not ask "shall I continue?"
between items — the stop conditions below are the only reasons to come back.

## Startup — once per session, before touching anything

1. Read `docs/STATE.md` in full, then `docs/QUEUE.md`.
2. Run `git status --short` and `git log --oneline -5`.
3. State in one line: the Goal, and the ID of the first `open` AGENT item.

If the tree is dirty and item **A0** is still `open`, A0 *is* your first item —
do not start anything else on top of unknown edits.

## The iteration

Repeat until a stop condition fires.

**1 — Pick.** First AGENT item with state `open` whose `Blocked by` items are all
`done`. Skip `blocked`. Never pick from USER-GATED. Set its state to `doing`.

**2 — Plan, if it's big.** The routing table in CLAUDE.md still governs every
iteration: >2 file edits or edits in >1 top-level directory means you write the
TRIGGER line and Read `docs/guardrails/PLAN.md` before editing. The loop does not
suspend the guardrails — it runs inside them.

**3 — Work it.** Only what the item's `Do` describes. Anything else you notice
goes to STATE `## Open items` as `NOTED (not done): <thing> <file:line>`, or as a
new AGENT item at the bottom of the queue if it's substantial. Drive-by fixes are
how a loop turns one reviewable commit into an unreviewable one.

**4 — Gate.**

```
node scripts/gate.mjs <app>          # typecheck + lint, ~15s + ~90s per app
node scripts/gate.mjs <app> --build  # + next build, before closing a phase
```

Gate the app(s) you touched, not all five, or each iteration costs eight minutes.
Then satisfy the item's own `Done when` — that is a separate, stricter bar than
the gate, and it is the one that actually closes the item.

**Gate red:** write the TRIGGER line, Read `docs/guardrails/DEBUG.md`, fix, re-gate.
Third failed attempt on the same item: stop working it. Set the item to `blocked`,
write an ATTEMPT entry in STATE `## Failed attempts` (format in DEBUG.md D6), and
go to the next item. Do not weaken the check to get green — that is a hard stop in
CLAUDE.md, and a silenced check certifies the regression.

**5 — Commit.** One commit per item.

```
git add -A && git commit -m "<area>: <what changed> (QUEUE <ID>)"
```

**Never `git push`.** The user set this loop to commit-only. If you think a push
is needed, that is a stop condition, not a decision.

**6 — Record.** In the same turn:
- QUEUE item → `done`, and fill its `Evidence:` line with the command and its
  actual result. An empty Evidence line means the item is not done.
- STATE `## Done` → `<item> — RESULT: <conclusion/numbers>`; refresh `## Now`
  and `## Next`.
- Append to the QUEUE `## Loop log`:
  `<date> · <ID> · <done|blocked> · <commit sha> · <one line>`

**7 — Next item.** No summary, no check-in. Go.

## Stop conditions — the only reasons to come back to the user

Stop, report what's done and what's left, and wait, when:

1. **The AGENT list is exhausted** — every item `done` or `blocked`.
2. **An item needs a human** — it turns out to require a dashboard login, a
   phone, a payment, or a preference only the user holds. Move it to USER-GATED
   with a one-line note on what you need, then continue with the next AGENT item.
   Only stop entirely when this empties the actionable list.
3. **Three failed attempts on the same item** — already handled by marking it
   `blocked` and continuing; stop only if this happens on three separate items,
   which means something environmental is wrong, not something in the code.
4. **A destructive action is the only way forward** — dropping a column, deleting
   data or branches, `git reset --hard`, `git push`. Paste exactly what would be
   lost and wait.
5. **A user constraint blocks the item** — check STATE `## Constraints` before
   deciding an item is fine; several are verbatim "do not build X".
6. **You would have to write "should work"** — if you cannot produce a real
   command and a real result line, you are not done. Report
   `EDITED-UNVERIFIED: <file>` and stop rather than closing the item.

## What does not count as progress

- An item marked `done` with an empty `Evidence:` line.
- A gate that passed because a check was skipped, loosened, or `as any`'d.
- A commit that bundles two items.
- Any claim of done/fixed/works/passing that isn't beside fresh command output
  in the same turn.
