#!/usr/bin/env node
// Wire a Firebase service-account key into local dev, without the secret ever
// passing through a chat window, a commit, or a terminal echo.
//
// WHY THIS EXISTS: the project's Firebase admin key has been rotated twice, both
// times because the JSON was pasted into a conversation. A secret that reaches a
// chat window is spent — the only fix is rotation, never assessment. This script
// means you never have to paste one again: the key file stays on your disk and
// only the values move.
//
//   node scripts/set-firebase-env.mjs "C:\\Users\\you\\Downloads\\<key>.json"          # preview
//   node scripts/set-firebase-env.mjs "C:\\Users\\you\\Downloads\\<key>.json" --write  # apply
//
// DRY RUN BY DEFAULT, and that default was bought the hard way: this script was
// once test-run against the real .env.local files and overwrote three live
// values with throwaway test data. A tool that edits config in place must show
// you the diff before it earns the right to write.
//
// It updates FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
// in the .env.local of every app that actually has a push dispatch route,
// preserving every other line. Existing values are replaced, not duplicated.
// Nothing secret is printed.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const APPS = ["lockedin", "campusclubs", "campustrade"]; // the three with /api/push/dispatch
const ROOT = resolve(import.meta.dirname, "..");

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const keyPath = args.find((a) => !a.startsWith("--"));
if (!keyPath) {
  console.error("usage: node scripts/set-firebase-env.mjs <path-to-service-account.json>");
  process.exit(1);
}
if (!existsSync(keyPath)) {
  console.error(`no such file: ${keyPath}`);
  process.exit(1);
}

let key;
try {
  key = JSON.parse(readFileSync(keyPath, "utf8"));
} catch (e) {
  console.error(`could not parse JSON: ${e.message}`);
  process.exit(1);
}

for (const f of ["project_id", "client_email", "private_key"]) {
  if (!key[f]) {
    console.error(`key file is missing "${f}" — is this a service-account JSON?`);
    process.exit(1);
  }
}

// The app does .replace(/\\n/g, "\n"), so the env value must carry LITERAL \n
// two-character sequences, not real newlines. Store it quoted and escaped.
const vars = {
  FIREBASE_PROJECT_ID: key.project_id,
  FIREBASE_CLIENT_EMAIL: key.client_email,
  FIREBASE_PRIVATE_KEY: `"${key.private_key.replace(/\n/g, "\\n")}"`,
};

const upsert = (text, name, value) => {
  const line = `${name}=${value}`;
  const re = new RegExp(`^${name}=.*$`, "m");
  if (re.test(text)) return text.replace(re, line);
  return (text.endsWith("\n") || text === "" ? text : text + "\n") + line + "\n";
};

let touched = 0;
for (const app of APPS) {
  const envPath = join(ROOT, "apps", app, ".env.local");
  if (!existsSync(envPath)) {
    console.log(`  ${app}: no .env.local — skipped (create it first if you run this app locally)`);
    continue;
  }
  const before = readFileSync(envPath, "utf8");
  let text = before;
  for (const [name, value] of Object.entries(vars)) text = upsert(text, name, value);
  const existing = Object.keys(vars).filter((n) => new RegExp(`^${n}=`, "m").test(before));
  const verb = existing.length ? `REPLACE ${existing.length} existing` : "add 3 new";
  if (WRITE) {
    writeFileSync(envPath, text);
    touched++;
    console.log(`  ${app}: wrote 3 vars (${verb})`);
  } else {
    console.log(`  ${app}: would ${verb} var(s) — no change made`);
  }
}

const fp = key.private_key_id ? String(key.private_key_id).slice(0, 8) : "unknown";
console.log(`\nlocal dev wired for ${touched} app(s) · key id ${fp}… · project ${key.project_id}`);
console.log(
  [
    "",
    "STILL YOURS TO DO — production:",
    "  Vercel → each of lockedin / campusclubs / campustrade → Settings → Environment Variables",
    "  Add the same three names. Copy the values from the JSON file itself, not from a chat window.",
    "  FIREBASE_PRIVATE_KEY must keep its literal \\n sequences.",
    "  Redeploy each project afterwards — env changes do not apply to existing deployments.",
    "",
    "THEN: delete every older key in Firebase Console → Service accounts → Manage keys.",
    "Generating a new key never revokes an old one. Deleting is the rotation.",
    "Finally, delete the JSON from Downloads — on disk it is the same secret, just quieter.",
  ].join("\n")
);
