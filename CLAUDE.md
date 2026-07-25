<!-- guardrails-kit: v1.0 -->
<!-- BEGIN KIT CORE v1.0 -->
<!-- Editing this file? Read docs/guardrails/_FORMAT.md first. Never paraphrase kit text. -->
These rules compensate for known model failure modes. They are procedures, not advice — follow them literally.

## Routing — the moment X happens, your next tool call is Read on the doc
| The moment you... | Read |
|---|---|
| realize — at start or mid-task — the task needs >2 file edits or edits in >1 top-level directory, or are about to Edit a 3rd file with no TASK block posted | docs/guardrails/PLAN.md |
| are about to create or modify a repo file — by Edit, Write, or a shell command that writes files — for the first time since session start or the last compaction | docs/guardrails/CODE.md |
| see a test you expected to pass fail, a build/test/run command exit non-zero, a traceback, run output that contradicts your prediction, or a user-reported bug you have not reproduced this session | docs/guardrails/DEBUG.md |
| are about to write "done", "fixed", "works", "passing", "complete", "resolved", or "ready", or to run git commit / gh pr create | docs/guardrails/VERIFY.md |
| are about to Read a 3rd file over 300 lines, or a search returned >50 hits | docs/guardrails/EFFICIENCY.md |
| return from compaction or /resume, the user pauses the work ("stop", "later", "tomorrow"), or a task with a TASK block has no docs/STATE.md | docs/guardrails/SESSION.md |
| no row above matches but the work feels risky | docs/guardrails/PLAN.md |

Row matched: write `TRIGGER: <event> -> <doc>`; your next tool call is Read on that doc, in the same message, with no acting tool call beside it (other triggered Reads may batch with it). 2+ rows match at once? Write one TRIGGER line per row and Read each matched doc, in table order, before any other tool call. Already Read the doc since the last compaction? Write `TRIGGER: <event> -> <doc> (cached: <its checklist IDs, from memory>)` and obey those items — cannot list the IDs without looking? It is not cached: Read the doc. A TRIGGER line whose next tool call is not that Read is itself a violation.

## Iron rules
- Before your first Edit of a file: Read the enclosing function/class plus the import block — a Grep snippet is not a Read; under 250 lines, Read it all (guessed edits patch the wrong code).
- Modify existing files with Edit, never Write — sole exception: the rewrite procedure in docs/guardrails/CODE.md; if Edit fails twice, re-Read the region and retry Edit (memory rewrites delete real code).
- After changing any signature, symbol name, return shape, config key, route, CLI flag, env var, or enum member: run REFERENCE SWEEP per docs/guardrails/CODE.md (missed callers break silently).
- Before calling an unfamiliar or third-party API with 2+ arguments: paste its real signature per docs/guardrails/CODE.md C5 (plausible is not real).
- Claim done/fixed/works/passing/complete/resolved/ready only beside fresh command output in the same turn; otherwise report `EDITED-UNVERIFIED: <file>` (unrun code is unknown code).
- Never write "should work", "should fix", "likely resolves", or "ought to now" — only the two legal forms in docs/guardrails/VERIFY.md: `Verified: <command> -> <result line>` / `UNVERIFIED — to confirm, run: <command>` (hedges hide skipped runs).
- Treat the user's stated bug location or cause as a hypothesis; trace evidence to file:line before editing there (wrong premise wastes the fix).
- Change only lines the task requires; log other findings as `NOTED (not done): <thing> <file:line>` (drive-by edits are unreviewed bugs).
- Never truthiness-check a value that can be 0, "", or false — compare to null/undefined/None explicitly; JS defaults use ?? (zero is data).
- About to write "probably / presumably / likely / I assume / should be" about this repo's code: run the Grep or Read that answers it instead (a guess costs 10x the lookup).
- The turn the user states "don't / only / keep / stop": append it verbatim to docs/STATE.md `## Constraints` — file missing? Create it per docs/guardrails/SESSION.md S2 (unwritten constraints decay within 50 turns).
- Batch independent tool calls into one message; between calls write at most one line, findings and decisions only — details: docs/guardrails/EFFICIENCY.md E5/E6 (narration buries findings).
<!-- END KIT CORE -->

## Project

**LockedIn — Campus Super-App** · Next.js (App Router, TypeScript) + Tailwind v4 + Supabase (Postgres/Auth/Storage/RLS/Realtime). Multi-college from one deployment; read [PROJECT.md](PROJECT.md) for phase tracker and build plans.

**TENANCY RULE (applies every table, no exceptions):** Every content table has `college_id` FK, RLS reads/writes scoped via `get_my_college_id()` SQL helper, `college_id` stamped server-side on insert. Users belong to college via email domain → `colleges` table maps `email_domain → college`.

**Design system:** Source of truth is Claude Design "Campus" project, exported to `docs/design/`. Tokens in `app/globals.css` `@theme` — never hardcode hex. Palette: warm cream paper + cobalt blue + transaction green. Shapes: pill buttons, chunky cards, squircle chips. Bottom nav is primary authed nav. Use `Card`/`Button`/`Section`/`inputClass` from `components/ui.tsx`. Glassmorphism reserved for floating layers (header, bottom nav, sheets). Motion is CSS-only (`animate-fade-up`, `.press`, `.shimmer`, etc.).

**Conventions:** Supabase clients in `lib/supabase/{client,server}.ts`. Migrations as SQL files in `supabase/migrations/`, numbered, never edited after commit. Feature modules in `app/` routes + `modules/<name>/`. Shared components in `components/`. Mobile-first; students are on phones. Verification via Playwright against dev server at **390×844 mobile viewport**. Dev login: `lockedin.phase1.test@gmail.com` / `testpass1234` (Demo College).

**Android-first (decided):** Capacitor wrapper around this Next.js app, no separate codebase. Phase 14.5 post-deploy: APK/AAB, app icon/splash, Play Store listing. Phase 20 (PWA) still happens. Phase 21 (push): native FCM via `@capacitor/push-notifications` inside app, web push as fallback. Keep everything mobile-web compatible.

**Project skills** (invoke with `/skill-name`):
- `/new-phase <name>` — scaffold migration + module + route for a new feature phase
- `/tenancy-check [file]` — audit SQL/TS for multi-college tenancy compliance
- `/mobile-verify <route>` — open route in Chrome at 390×844 and screenshot it
- `/design-check [file]` — scan for hardcoded colors and design token violations

## Autonomous loop

`docs/STATE.md` is memory; **`docs/QUEUE.md` is the work queue** — the ordered
AGENT list is the only place `/loop` may pick work from, and its USER-GATED list
is the set of things an agent must report rather than attempt.

- `/loop` — work QUEUE.md top-down: pick → work → gate → commit → record → next.
  Runs until the AGENT list is exhausted or a stop condition in the command fires.
- `node scripts/gate.mjs <app> [--build] [--no-lint]` — the verification gate.
  Exit 0 is the only thing that licenses a commit. Add `--build` before closing
  a phase. A `TIMEOUT` verdict means unknown, not passed.

The loop runs *inside* these guardrails, not instead of them: the routing table
above still fires every iteration, and the hard stops below still bind. An item
is `done` only with a real command and its real output on the Evidence line.

<!-- BEGIN KIT FOOTER v1.0 -->
## Hard stops
- NEVER make a failing test or check pass by weakening it — no skips, deleted tests, loosened asserts, raised tolerances, widened catch blocks, `as any` / `# type: ignore`, lint-disables -> instead: quote the failure, propose the change, wait for approval (a silenced check certifies the regression).
- NEVER run `git push` unless the user asked for a push in this conversation — quote their words beside the command -> instead: commit locally and report (publication is irreversible).
- NEVER kill processes by image name (`taskkill /IM node.exe`, `pkill node`) -> instead: find the PID via the port (`lsof -ti :PORT` | `netstat -ano | findstr :PORT`) then kill that PID (image-name kills take down your own harness).
- NEVER delete files/branches or run `git reset --hard` / `git checkout -- <file>` without pasting what will be lost -> instead: paste the exact target list and wait for the user's approval in this conversation (deletion is unrecoverable).

After compaction or /resume: routing row 6 has fired — write its TRIGGER line and Read docs/guardrails/SESSION.md (S1 runs first). Docs read before compaction no longer count as read: `(cached)` is invalid until you Read the doc again.
<!-- END KIT FOOTER -->
