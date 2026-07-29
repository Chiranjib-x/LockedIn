#!/usr/bin/env node
// Regression probe for the public share previews (/p/listing, /p/post, /p/club).
//
// Those pages serve logged-out visitors, so they read through SECURITY DEFINER
// RPCs that bypass RLS by design. That makes them the one place where adding a
// visibility column to a table silently opens a hole: 0021 was written before
// spaces existed, listings.space_id appeared underneath it in 0070, and a
// members-only Girls' Closet listing became readable by anyone with the URL.
// 0083 closed it. This script is what fails if it reopens.
//
// Fixtures are created inside a transaction that is ALWAYS rolled back, so this
// is safe to run against any database and does not depend on seeded demo data.
//
//   node scripts/probe-public-previews.mjs        -> exits 0 if every guard holds
//
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pg = require("pg");

const ENV = "apps/lockedin/.env.local";
const m = fs.readFileSync(ENV, "utf8").match(/^SUPABASE_DB_URL=(.*)$/m);
if (!m) {
  console.error(`No SUPABASE_DB_URL in ${ENV}`);
  process.exit(1);
}

const client = new pg.Client({
  connectionString: m[1].trim().replace(/^["']|["']$/g, ""),
});

const results = [];
/** Run `sql` as an unauthenticated web visitor and record how many rows leaked. */
async function asAnon(label, expectRows, sql, args) {
  await client.query("savepoint p");
  await client.query("set local role anon");
  let n = -1;
  let err = null;
  try {
    n = (await client.query(sql, args)).rows.length;
  } catch (e) {
    err = e.message;
  }
  await client.query("rollback to savepoint p");
  await client.query("reset role");
  const ok = err === null && n === expectRows;
  results.push({ check: label, expected: expectRows, got: err ?? n, ok });
}

await client.connect();
await client.query("begin");
try {
  // A space is members-only, so a listing inside one must never preview.
  const space = await client.query(
    `insert into listings (college_id, seller_id, title, price, category, space_id)
     select s.college_id, m.user_id, 'ZZ probe — members only', 1, 'Other', s.id
     from spaces s join space_members m on m.space_id = s.id limit 1
     returning id`
  );
  // A normal listing is the control: if this stops previewing, the fix is too broad.
  const normal = await client.query(
    `insert into listings (college_id, seller_id, title, price, category)
     select college_id, id, 'ZZ probe — public', 1, 'Other' from profiles limit 1
     returning id`
  );
  // A club nobody approved is not yet a public fact.
  const pending = await client.query(
    `insert into communities (college_id, created_by, name, emoji, category, is_approved)
     select college_id, id, 'ZZ probe — pending', '🧪', 'club', false from profiles limit 1
     returning id`
  );
  const approved = await client.query(
    `insert into communities (college_id, created_by, name, emoji, category, is_approved)
     select college_id, id, 'ZZ probe — approved', '🧪', 'club', true from profiles limit 1
     returning id`
  );

  if (!space.rows.length) {
    console.error("No space with a member exists — cannot probe the space guard.");
    process.exitCode = 1;
  } else {
    await asAnon("space listing stays private", 0,
      "select 1 from public_listing_preview($1)", [space.rows[0].id]);
  }
  await asAnon("normal listing still previews (control)", 1,
    "select 1 from public_listing_preview($1)", [normal.rows[0].id]);
  await asAnon("unapproved club stays private", 0,
    "select 1 from public_club_preview($1)", [pending.rows[0].id]);
  await asAnon("approved club previews (control)", 1,
    "select 1 from public_club_preview($1)", [approved.rows[0].id]);
} finally {
  // Nothing above is ever kept, including on failure.
  await client.query("rollback");
}

const leftovers = await client.query(
  `select (select count(*) from listings where title like 'ZZ probe%')
        + (select count(*) from communities where name like 'ZZ probe%') as n`
);
await client.end();

console.table(results);
const failed = results.filter((r) => !r.ok);
const dirty = Number(leftovers.rows[0].n);
if (dirty > 0) {
  console.error(`FAIL — ${dirty} probe row(s) survived the rollback.`);
  process.exitCode = 1;
}
if (failed.length) {
  console.error(`FAIL — ${failed.length} preview guard(s) broken.`);
  process.exitCode = 1;
} else if (!process.exitCode) {
  console.log("PASS — every public preview guard holds.");
}
