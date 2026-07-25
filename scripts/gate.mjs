#!/usr/bin/env node
/**
 * gate.mjs — the verification gate for the agentic loop.
 *
 * One command that decides whether a loop iteration is allowed to commit.
 * Exits 0 only if every selected check passed. Never weaken a check here to
 * make it pass (CLAUDE.md hard stop #1) — fix the code instead.
 *
 *   node scripts/gate.mjs                    # tsc + lint, all apps
 *   node scripts/gate.mjs lockedin           # tsc + lint, one app
 *   node scripts/gate.mjs lockedin --build   # + next build (slow, needs env)
 *   node scripts/gate.mjs lockedin --no-lint # typecheck only (fast iteration)
 *   node scripts/gate.mjs all --build --json
 *   node scripts/gate.mjs all --timeout=1800 # raise the per-check cap
 *
 * Notes
 * - --build runs `next build`, which needs the app's Supabase env vars. If
 *   they are absent the build fails for reasons unrelated to your change;
 *   run the fast gate during iteration and --build before declaring a phase
 *   complete.
 * - Each check has a timeout (default 15 min) so a hung check can never wedge
 *   a loop iteration. TIMEOUT is reported distinctly from FAIL — it means
 *   "unknown", not "broken", and should be investigated, not retried blindly.
 * - eslint skips `android/**`: that tree is generated Capacitor/Gradle output,
 *   not source. Excluding generated output is not weakening the check.
 * - Cross-platform: uses shell:true so it works from PowerShell and bash.
 */

import { spawnSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const APPS_DIR = join(REPO, 'apps');

const allApps = readdirSync(APPS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(APPS_DIR, d.name, 'package.json')))
  .map((d) => d.name)
  .sort();

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const positional = argv.filter((a) => !a.startsWith('--'));

const WITH_BUILD = flags.has('--build');
const NO_LINT = flags.has('--no-lint');
const AS_JSON = flags.has('--json');

const timeoutFlag = [...flags].find((f) => f.startsWith('--timeout='));
const TIMEOUT_MS = (timeoutFlag ? Number(timeoutFlag.split('=')[1]) : 900) * 1000;
if (!Number.isFinite(TIMEOUT_MS) || TIMEOUT_MS <= 0) {
  console.error('gate: --timeout must be a positive number of seconds');
  process.exit(2);
}

const target = positional[0] ?? 'all';
const apps = target === 'all' ? allApps : [target];

for (const a of apps) {
  if (!allApps.includes(a)) {
    console.error(`gate: unknown app "${a}". Known: ${allApps.join(', ')}`);
    process.exit(2);
  }
}

function run(label, cmd, cwd) {
  const started = Date.now();
  const r = spawnSync(cmd, { cwd, shell: true, encoding: 'utf8', timeout: TIMEOUT_MS });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
  // spawnSync sets signal SIGTERM when it kills on timeout.
  const timedOut = r.error?.code === 'ETIMEDOUT' || r.signal === 'SIGTERM';
  return {
    label,
    cmd,
    ok: !timedOut && r.status === 0,
    timedOut,
    code: r.status ?? -1,
    ms: Date.now() - started,
    // Keep the tail: compilers put the useful summary at the end.
    output: out.split('\n').slice(-40).join('\n'),
  };
}

const results = [];

for (const app of apps) {
  const cwd = join(APPS_DIR, app);
  const checks = [['typecheck', 'npx tsc --noEmit']];
  if (!NO_LINT) checks.push(['lint', 'npx eslint . --ignore-pattern "android/**"']);
  if (WITH_BUILD) checks.push(['build', 'npx next build']);

  for (const [label, cmd] of checks) {
    if (!AS_JSON) process.stdout.write(`… ${app} ${label} `);
    const res = run(label, cmd, cwd);
    res.app = app;
    results.push(res);
    if (!AS_JSON) {
      const verdict = res.ok ? 'PASS' : res.timedOut ? 'TIMEOUT' : 'FAIL';
      process.stdout.write(`${verdict} (${(res.ms / 1000).toFixed(1)}s)\n`);
      if (res.timedOut) {
        console.log(indent(`exceeded ${TIMEOUT_MS / 1000}s — result UNKNOWN, not failed.`));
        console.log(indent(`re-run alone: cd apps/${app} && ${cmd}`));
      }
      if (!res.ok && res.output) console.log(indent(res.output));
    }
    // Fail fast within an app: a broken typecheck makes lint/build noise.
    if (!res.ok) break;
  }
}

function indent(s) {
  return s
    .split('\n')
    .map((l) => `    ${l}`)
    .join('\n');
}

const failed = results.filter((r) => !r.ok);

if (AS_JSON) {
  console.log(JSON.stringify({ ok: failed.length === 0, withBuild: WITH_BUILD, results }, null, 2));
} else {
  console.log('\n' + '-'.repeat(52));
  for (const app of apps) {
    const mine = results.filter((r) => r.app === app);
    const bad = mine.find((r) => !r.ok);
    const verdict = !bad ? 'PASS' : bad.timedOut ? 'TIMEOUT' : 'FAIL';
    console.log(`${verdict}  ${app}${bad ? `  (${bad.label})` : ''}`);
  }
  console.log('-'.repeat(52));
  const skipped = [!WITH_BUILD && 'build', NO_LINT && 'lint'].filter(Boolean);
  console.log(
    failed.length === 0
      ? `GATE PASS — ${apps.length} app(s), ${results.length} check(s)` +
          (skipped.length ? ` · skipped: ${skipped.join(', ')}` : '')
      : `GATE FAIL — ${failed.length} check(s) not green: ` +
          failed.map((f) => `${f.app}/${f.label}${f.timedOut ? ' (TIMEOUT)' : ''}`).join(', ')
  );
}

process.exit(failed.length === 0 ? 0 : 1);
