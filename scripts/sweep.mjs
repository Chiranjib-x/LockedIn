#!/usr/bin/env node
/**
 * sweep.mjs — static bug detectors tuned to THIS repo's bug history.
 *
 * Every detector here encodes a bug this project actually shipped, or a rule
 * from CLAUDE.md that has been violated before. It is deliberately not a
 * generic linter: eslint already covers generic. This covers the traps that
 * bit *you* — the ⚠ markers in docs/MULTI-APP-PLAN.md's Launch Gate and the
 * entries in docs/STATE.md `## Failed attempts`.
 *
 *   node scripts/sweep.mjs                  # all apps, all detectors
 *   node scripts/sweep.mjs lockedin         # one app
 *   node scripts/sweep.mjs --axis=perf      # one axis
 *   node scripts/sweep.mjs --id=C1          # one detector
 *   node scripts/sweep.mjs --json           # machine-readable
 *   node scripts/sweep.mjs --fork           # fork-drift only
 *
 * ── READ THIS BEFORE ACTING ON OUTPUT ──────────────────────────────────────
 * A hit is a SUSPECT, not a conviction. Regex cannot tell an IST bug from a
 * deliberately-UTC timestamp, or a real N+1 from a bounded 3-row join. Every
 * finding must be confirmed by reading the code before it is "fixed".
 * Mass-applying fixes from this output is how you break working code.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const APPS_DIR = join(REPO, 'apps');

const SKIP_DIRS = new Set([
  'node_modules', '.next', 'out', 'build', 'android', 'ios', '.git', 'public', 'dist',
]);

/* ── detectors ─────────────────────────────────────────────────────────────
 * severity: P0 crash/data-loss/leak · P1 broken flow · P2 degraded · P3 polish
 * Detectors return matches; the loop triages them.
 */
const DETECTORS = [
  // ── correctness & data safety ──
  {
    id: 'C1', axis: 'correctness', severity: 'P1', files: /\.tsx?$/,
    name: 'Date rendered without IST timezone',
    why: 'Vercel runs UTC, dev machines run IST. Shipped broken twice (Launch Gate #3 ⚠⚠). Any toLocale*String without timeZone renders -5:30 off in production.',
    fix: 'Pass { timeZone: "Asia/Kolkata" }, or use the helpers in packages/lib/ist.ts.',
    // The options object is often multiline, so timeZone may sit several lines
    // below the call. Look at a window, not just the matched line.
    scan: (src) => matchLines(src, /\.toLocale(?:Date|Time)?String\s*\(/g, (line, m) => {
      const window = src.slice(m.index, m.index + 300);
      const call = window.slice(0, balancedEnd(window));
      return !/timeZone/.test(call);
    }),
  },
  {
    id: 'C2', axis: 'correctness', severity: 'P1', files: /\.tsx?$/,
    name: 'datetime-local parsed in server timezone',
    why: 'The write-side half of the same bug. new Date("2026-01-01T10:00") parses in the SERVER tz; on Vercel that shifts every user-entered time by +5:30.',
    fix: 'Use istParse from packages/lib/ist.ts for any value coming from an <input type="datetime-local">.',
    // WRITE side only. A DB timestamp is already UTC-qualified and parses
    // correctly — matching those buried the real hits 20:1. Require the value
    // to come from a form/user input on the same line.
    scan: (src) => matchLines(src, /new Date\s*\(/g, (line) =>
      /formData\.get|\.value\b|params\.|searchParams|body\[|body\./.test(line) &&
      !/istParse/.test(line)),
  },
  {
    id: 'C3', axis: 'correctness', severity: 'P1', files: /\.tsx?$/,
    name: 'Truthiness check on a value that can legitimately be 0',
    why: 'CLAUDE.md iron rule: zero is data. `if (!count)` and `qty || 1` silently treat a real 0 as missing — wrong totals, wrong seat counts, wrong shares.',
    fix: 'Compare explicitly to null/undefined, or use ?? instead of ||.',
    scan: (src) => matchLines(src,
      /(?:if\s*\(\s*!|!)\s*(?:\w+\.)*(count|qty|quantity|price|amount|seats|share|share_amount|total|balance|index|idx|rating|karma|score|stock|remaining|capacity)\b|(?:\w+\.)*(count|qty|quantity|price|amount|seats|total|rating|karma|stock|capacity)\s*\|\|\s*/g,
      (line) => !/\?\?/.test(line) && !/!==\s*(null|undefined)/.test(line) && !/length/.test(line)),
  },
  {
    id: 'C4', axis: 'correctness', severity: 'P2', files: /\.tsx?$/,
    name: 'Silently swallowed error',
    why: 'Launch Gate #4: no silent failures. An empty catch turns a broken action into a button that does nothing — the hardest class of bug to report.',
    fix: 'Surface a readable message, or comment why swallowing is correct (localStorage in private mode is a legitimate case).',
    scan: (src) => matchLines(src, /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g, () => true),
  },
  {
    id: 'C5', axis: 'correctness', severity: 'P0', files: /\.tsx?$/,
    name: 'select(*) on profiles — column-privacy trap',
    why: 'Migration 0041 revoked column-level SELECT on profiles.room/contact_pref. A select(*) 403s for everyone. This exact pattern took prod down for ~8 minutes.',
    fix: 'Name the columns you need, or read your own row via the my_profile() definer RPC.',
    scan: (src) => matchLines(src, /from\s*\(\s*['"]profiles['"]\s*\)[\s\S]{0,80}?select\s*\(\s*['"]\*/g, () => true),
  },
  {
    id: 'C6', axis: 'correctness', severity: 'P1', files: /\.tsx?$/,
    name: 'PostgREST .or() built from user input',
    why: 'Already hit: a search query containing `,` or `()` breaks .or() parsing and the query silently returns wrong rows. Fixed once in marketplace/board/cabs — check every new call site.',
    fix: 'Strip or escape , ( ) from the term before interpolating, the way the marketplace search does.',
    scan: (src) => matchLines(src, /\.or\s*\(\s*[`'"][^`'"]*\$\{/g, () => true),
  },
  {
    id: 'C7', axis: 'correctness', severity: 'P0', files: /\.sql$/,
    name: 'UPDATE policy without WITH CHECK',
    why: 'Documented RLS gotcha in STATE `## Failed attempts`: an UPDATE policy with only USING re-checks USING against the NEW row, so any transition that drops the actor\'s own claim (runner_id = null) silently updates 0 rows.',
    fix: 'Add WITH CHECK, or move the transition into a SECURITY DEFINER function (the claim_pickup / unclaim_pickup pattern).',
    scan: (src) => {
      const out = [];
      const re = /create\s+policy[\s\S]*?;/gi;
      let m;
      while ((m = re.exec(src)) !== null) {
        const stmt = m[0];
        if (/for\s+update/i.test(stmt) && /using/i.test(stmt) && !/with\s+check/i.test(stmt)) {
          out.push({ index: m.index, text: stmt.split('\n')[0].trim() });
        }
      }
      return out;
    },
  },
  {
    id: 'C8', axis: 'correctness', severity: 'P0', files: /\.sql$/,
    name: 'New table without college_id (tenancy rule)',
    why: 'CLAUDE.md: every content table has college_id, no exceptions. A table without it leaks across colleges the moment a second college signs up.',
    fix: 'Add college_id FK + RLS scoped via get_my_college_id(), stamped server-side on insert.',
    scan: (src) => {
      const out = [];
      const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(\w+)\s*\(([\s\S]*?)\n\s*\);/gi;
      let m;
      while ((m = re.exec(src)) !== null) {
        const [, table, body] = m;
        // Join/lookup tables legitimately inherit tenancy from their parent.
        const isJoin = /_(members|items|votes|rsvps|checkins|dues|claims|reads|feedback)$/.test(table);
        if (!/college_id/i.test(body) && !isJoin) {
          out.push({ index: m.index, text: `create table ${table}` });
        }
      }
      return out;
    },
  },

  // ── UX ──
  {
    id: 'U1', axis: 'ux', severity: 'P2', files: /\.tsx$/,
    name: 'List render with no empty state',
    why: 'Launch Gate #4: every list has an intentional empty state. A bare .map() on an empty array renders nothing — indistinguishable from a broken page.',
    fix: 'Add a length === 0 branch, or use EmptyState from packages/ui.',
    scan: (src) => {
      if (/length\s*===\s*0|length\s*<\s*1|\.length\s*\?|EmptyState|isEmpty|no results|nothing here/i.test(src)) return [];
      // A SCREAMING_CASE source is a module-level constant (PILLARS, CATEGORIES).
      // Those arrays are never empty, so an empty state would be dead code.
      return matchLines(src, /\{\s*(\w+(?:\.\w+)*)\s*\.map\s*\(/g,
        (_line, m) => !/^[A-Z0-9_]+$/.test(m[1])).slice(0, 1);
    },
  },
  {
    id: 'U2', axis: 'ux', severity: 'P2', files: /\.tsx$/,
    name: 'Submit control with no pending state',
    why: 'Launch Gate #10: no double-submit on slow networks. A submit button that never disables lets a student on flaky campus wifi create three listings.',
    fix: 'Use SubmitButton from packages/ui, or wire disabled={pending}.',
    scan: (src) => {
      if (/SubmitButton|useFormStatus|disabled=\{.*(pending|loading|submitting|busy)/i.test(src)) return [];
      return matchLines(src, /type\s*=\s*["']submit["']/g, () => true).slice(0, 1);
    },
  },
  {
    id: 'U3', axis: 'ux', severity: 'P3', files: /\.tsx$/,
    name: 'Raw error object shown to the user',
    why: 'Postgres and PostgREST errors are not user-facing copy. "duplicate key value violates unique constraint" is not a message a student can act on.',
    fix: 'Map known error codes to human copy; log the raw error.',
    scan: (src) => matchLines(src, /\{\s*(?:\w+\.)*(?:error|err|e)\.message\s*\}/g, () => true),
  },
  {
    id: 'U4', axis: 'ux', severity: 'P3', files: /\.tsx?$/,
    name: 'Hardcoded colour outside the token system',
    why: 'CLAUDE.md: tokens in globals.css @theme, never hardcode hex. Hardcoded colours are what make dark mode break in one corner of one app.',
    fix: 'Use the @theme token. /design-check covers this interactively.',
    // Third-party brand marks (the Google "G") and PWA theme-color meta are
    // required to be literal — they are not token violations.
    scan: (src, path) => /globals\.css|logo\.tsx|opengraph-image|icon\.tsx|manifest|google-auth-button|capacitor\.config/.test(path)
      ? []
      : matchLines(src, /#[0-9a-fA-F]{6}\b/g, (line) =>
          !/prefers-color-scheme|themeColor|theme-color|<path\s+fill=/.test(line)),
  },

  // ── performance ──
  {
    id: 'P1', axis: 'perf', severity: 'P2', files: /\.tsx?$/,
    name: 'Deeply nested Supabase select (N+1 risk)',
    why: 'Launch Gate #11: no N+1 storms on list pages. Five apps now share one Postgres — a storm in one app degrades all five.',
    fix: 'Flatten the select, or move it to a view / RPC. Confirm with EXPLAIN before and after.',
    scan: (src) => matchLines(src, /select\s*\(\s*[`'"][^`'"]*\([^`'"]*\([^`'"]*\(/g, () => true),
  },
  {
    id: 'P2', axis: 'perf', severity: 'P2', files: /\.tsx?$/,
    name: 'Unbounded list query',
    why: 'A select with no limit grows without bound. Fine at 9 users, a 3MB payload at 9000.',
    fix: 'Add .limit() or .range(), and paginate the surface that renders it.',
    scan: (src) => {
      const out = [];
      const re = /\.from\s*\(\s*['"](\w+)['"]\s*\)([\s\S]{0,400}?);/g;
      let m;
      while ((m = re.exec(src)) !== null) {
        const chain = m[2];
        if (!/\.select\s*\(/.test(chain)) continue;
        if (/\.limit\s*\(|\.range\s*\(|\.single\s*\(|\.maybeSingle\s*\(|count:\s*['"]exact['"]|head:\s*true/.test(chain)) continue;
        if (/\.eq\s*\(\s*['"]id['"]/.test(chain)) continue; // single-row by id
        out.push({ index: m.index, text: `from('${m[1]}') …no limit` });
      }
      return out;
    },
  },
  {
    id: 'P3', axis: 'perf', severity: 'P2', files: /\.tsx$/,
    name: 'Raw <img> instead of next/image',
    why: 'Launch Gate #11: images compressed, budget under 2.5s on throttled 4G. Raw <img> ships the original bytes and shifts layout.',
    fix: 'Use next/image with width/height, or document why the raw tag is required.',
    scan: (src) => matchLines(src, /<img\s/g, () => true),
  },

  // ── accessibility ──
  {
    id: 'Y1', axis: 'a11y', severity: 'P2', files: /\.tsx$/,
    name: 'Image without alt text',
    why: 'Screen readers announce the filename instead. Also the fallback when an image 404s on bad campus wifi.',
    fix: 'Add alt; use alt="" only for genuinely decorative images.',
    scan: (src) => matchLines(src, /<(?:img|Image)\s(?![^>]*\balt\s*=)[^>]*>/g, () => true),
  },
  {
    id: 'Y2', axis: 'a11y', severity: 'P2', files: /\.tsx$/,
    name: 'Icon-only control with no accessible name',
    why: 'A button whose only child is an icon announces as "button". This app is icon-heavy (lucide-react everywhere), so this is the dominant a11y gap.',
    fix: 'Add aria-label, or include visually-hidden text.',
    scan: (src) => matchLines(src,
      /<button(?![^>]*aria-label)(?![^>]*title=)[^>]*>\s*(?:\{\s*)?<[A-Z]\w+[^>]*\/>\s*(?:\}\s*)?<\/button>/g, () => true),
  },
  {
    id: 'Y3', axis: 'a11y', severity: 'P2', files: /\.tsx$/,
    name: 'Form input with no associated label',
    why: 'Unlabelled inputs are unusable with a screen reader and lose the tap-target boost a label gives on mobile.',
    fix: 'Wire htmlFor/id, or aria-label on the input.',
    scan: (src) => {
      if (/htmlFor|<label/i.test(src)) return [];
      return matchLines(src, /<input(?![^>]*aria-label)[^>]*>/g, () => true).slice(0, 3);
    },
  },
];

/* ── helpers ──────────────────────────────────────────────────────────────── */

function matchLines(src, re, predicate) {
  const out = [];
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(src)) !== null) {
    const lineStart = src.lastIndexOf('\n', m.index) + 1;
    let lineEnd = src.indexOf('\n', m.index);
    if (lineEnd === -1) lineEnd = src.length;
    const line = src.slice(lineStart, lineEnd).trim();
    if (predicate(line, m)) out.push({ index: m.index, text: line.slice(0, 160) });
    if (re.lastIndex === m.index) re.lastIndex++; // zero-width guard
  }
  return out;
}

/** End offset of the call whose "(" is the first paren in `s`, or s.length. */
function balancedEnd(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return s.length;
}

function lineOf(src, index) {
  return src.slice(0, index).split('\n').length;
}

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.claude') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(full, out);
    } else if (/\.(tsx?|sql)$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

/* ── fork drift ───────────────────────────────────────────────────────────── */

const FORKS = ['lockedin', 'campusclubs', 'campustrade'];

/** Brand/theme differences are intentional; normalise them out before hashing. */
function normaliseForFork(src) {
  return src
    // Per-app identifiers are SUPPOSED to differ: appId, deep-link scheme,
    // OAuth redirect. Collapse the whole identifier first, or the generic
    // app-name rule below turns "com.lockedin.campus" and
    // "com.lockedin.campusclubs" into different strings and reports drift on
    // four files that are behaving correctly.
    .replace(/com\.[a-z]+\.[a-z]+/g, '@appid')
    .replace(/LockedIn|CampusClubs|CampusTrade|GateRunner|VIT Compass/g, '@APP')
    .replace(/lockedin|campusclubs|campustrade|gaterunner|vitcompass/g, '@app')
    .replace(/li-theme|cc-theme|ct-theme|gr-theme|vc-theme/g, '@theme')
    .replace(/\s+/g, ' ')
    .trim();
}

function forkDrift() {
  const byRel = new Map();
  for (const app of FORKS) {
    const root = join(APPS_DIR, app);
    if (!existsSync(root)) continue;
    for (const abs of walk(root)) {
      const rel = relative(root, abs).replace(/\\/g, '/');
      if (!rel.startsWith('modules/') && !rel.startsWith('components/') && !rel.startsWith('lib/')) continue;
      if (!byRel.has(rel)) byRel.set(rel, new Map());
      const src = readFileSync(abs, 'utf8');
      byRel.get(rel).set(app, {
        hash: createHash('sha1').update(normaliseForFork(src)).digest('hex').slice(0, 10),
        lines: src.split('\n').length,
      });
    }
  }
  const drifted = [];
  for (const [rel, apps] of byRel) {
    if (apps.size < 2) continue; // present in only one fork — that's subtraction, not drift
    const hashes = new Set([...apps.values()].map((v) => v.hash));
    if (hashes.size > 1) {
      drifted.push({
        file: rel,
        apps: [...apps.entries()].map(([a, v]) => `${a}(${v.lines}L,${v.hash})`).join(' '),
      });
    }
  }
  return drifted.sort((a, b) => a.file.localeCompare(b.file));
}

/* ── run ──────────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const positional = argv.filter((a) => !a.startsWith('--'));
const AS_JSON = flags.has('--json');
const FORK_ONLY = flags.has('--fork');
const axisFlag = [...flags].find((f) => f.startsWith('--axis='))?.split('=')[1];
const idFlag = [...flags].find((f) => f.startsWith('--id='))?.split('=')[1];

const allApps = readdirSync(APPS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => d.name).sort();
const apps = positional.length ? positional : allApps;

let active = DETECTORS;
if (axisFlag) active = active.filter((d) => d.axis === axisFlag);
if (idFlag) active = active.filter((d) => d.id === idFlag.toUpperCase());

const findings = [];

if (!FORK_ONLY) {
  const targets = [];
  for (const app of apps) targets.push(...walk(join(APPS_DIR, app)).map((f) => ({ f, app })));
  // Migrations are shared, not per-app.
  if (!positional.length) targets.push(...walk(join(REPO, 'supabase')).map((f) => ({ f, app: 'supabase' })));

  for (const { f, app } of targets) {
    let src;
    try { src = readFileSync(f, 'utf8'); } catch { continue; }
    const rel = relative(REPO, f).replace(/\\/g, '/');
    for (const d of active) {
      if (!d.files.test(f)) continue;
      let hits = [];
      try { hits = d.scan(src, rel) || []; } catch { continue; }
      for (const h of hits) {
        findings.push({
          id: d.id, axis: d.axis, severity: d.severity, name: d.name,
          app, file: rel, line: lineOf(src, h.index), snippet: h.text,
        });
      }
    }
  }
}

const drift = FORK_ONLY || !idFlag ? forkDrift() : [];

/* ── report ───────────────────────────────────────────────────────────────── */

if (AS_JSON) {
  console.log(JSON.stringify({ findings, drift, detectors: active.map((d) => d.id) }, null, 2));
  process.exit(0);
}

const SEV_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };
const byDetector = new Map();
for (const f of findings) {
  if (!byDetector.has(f.id)) byDetector.set(f.id, []);
  byDetector.get(f.id).push(f);
}

console.log(`\nSWEEP — ${apps.join(', ')}\n${'='.repeat(60)}`);

if (!FORK_ONLY) {
  const ids = [...byDetector.keys()].sort((a, b) => {
    const da = DETECTORS.find((d) => d.id === a), db = DETECTORS.find((d) => d.id === b);
    return SEV_ORDER[da.severity] - SEV_ORDER[db.severity] || a.localeCompare(b);
  });

  if (!ids.length) console.log('\nNo detector hits.');

  for (const id of ids) {
    const d = DETECTORS.find((x) => x.id === id);
    const hits = byDetector.get(id);
    const perApp = {};
    for (const h of hits) perApp[h.app] = (perApp[h.app] ?? 0) + 1;
    console.log(`\n[${d.severity}] ${d.id} · ${d.name}  — ${hits.length} hit(s)`);
    console.log(`   why: ${d.why}`);
    console.log(`   fix: ${d.fix}`);
    console.log(`   by app: ${Object.entries(perApp).map(([a, n]) => `${a}=${n}`).join('  ')}`);
    for (const h of hits.slice(0, 6)) console.log(`     ${h.file}:${h.line}  ${h.snippet}`);
    if (hits.length > 6) console.log(`     … ${hits.length - 6} more (--id=${d.id} --json for all)`);
  }
}

if (drift.length) {
  console.log(`\n${'='.repeat(60)}\nFORK DRIFT — ${drift.length} shared file(s) differ across lockedin/campusclubs/campustrade`);
  console.log('(brand names and theme keys normalised out, so these are real differences)');
  console.log('A bug fixed in one fork and not the others shows up here.');
  for (const d of drift.slice(0, 25)) console.log(`   ${d.file}\n      ${d.apps}`);
  if (drift.length > 25) console.log(`   … ${drift.length - 25} more (--fork --json for all)`);
}

const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
for (const f of findings) counts[f.severity]++;
console.log(`\n${'='.repeat(60)}`);
console.log(`TOTAL  P0=${counts.P0}  P1=${counts.P1}  P2=${counts.P2}  P3=${counts.P3}  ·  fork-drift=${drift.length}`);
console.log('Every hit is a SUSPECT. Confirm by reading the code before fixing.\n');
