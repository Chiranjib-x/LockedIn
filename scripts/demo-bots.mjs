#!/usr/bin/env node
// "Bot mode" — populate DEMO COLLEGE with believable students and campus
// activity, so the app can be shown alive: screenshots, the Play listing, and
// demoing /for-clubs to a club secretary (docs/LAUNCH.md G-4w) all land badly
// against empty shelves.
//
//   node scripts/demo-bots.mjs                # preview (default)
//   node scripts/demo-bots.mjs --write        # seed
//   node scripts/demo-bots.mjs --remove --write   # wipe every bot + their content
//
// WHY DEMO COLLEGE, AND NOWHERE ELSE
// Every table in this app is RLS-scoped by college, and Demo College's domain is
// `demo.invalid`, which cannot receive mail — so nobody can ever sign up into it.
// Bots placed there are invisible to the 18 real VIT students BY CONSTRUCTION,
// not by a flag someone can forget to check. That is the whole design.
//
// It is also why this must never be pointed at vitstudent.ac.in. The founder's
// own rule is "stop people from faking their actual names, as we need to be able
// to get their actual info", and a real student who DMs a bot or offers ₹500 for
// a bot's cycle learns the app is fake — the one first impression that cannot be
// re-spent. The college is hard-coded below for exactly that reason.

import pg from "pg";

const DEMO_DOMAIN = "demo.invalid"; // hard-coded: never seed a real college
const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const REMOVE = args.includes("--remove");

const BOTS = [
  ["Ananya Rao", "ananya_rao", "A Block", "2027"],
  ["Rohit Menon", "rohit_menon", "B Block", "2026"],
  ["Sneha Iyer", "sneha_iyer", "D Block", "2028"],
  ["Karthik Nair", "karthik_nair", "K Block", "2027"],
  ["Priya Sharma", "priya_sharma", "A Block", "2026"],
  ["Arjun Das", "arjun_das", "N Block", "2028"],
  ["Meera Krishnan", "meera_k", "D Block", "2027"],
  ["Vikram Reddy", "vikram_reddy", "M Block", "2026"],
  ["Divya Pillai", "divya_pillai", "C Block", "2028"],
  ["Aditya Bose", "aditya_bose", "B Block", "2027"],
];

const LISTINGS = [
  ["Firefox cycle — barely used", "Cycles", 3200, "Rode it one sem. New brake pads, gears tuned. Pickup from A Block."],
  ["Casio FX-991EX calculator", "Electronics", 700, "Bought for maths, never needed it after. Box included."],
  ["Mini fridge 45L", "Appliances", 3800, "Leaving campus, works perfectly. You collect from D Block."],
  ["Semester 3 CSE textbooks (set of 4)", "Books", 900, "All four, minimal highlighting."],
  ["Study lamp + extension board", "Furniture", 450, "Warm light, saved my eyes during CAT week."],
  ["Cricket kit — bat, pads, gloves", "Other", 2100, "SS bat, used one season. Slight tape on toe."],
  ["Noise cancelling headphones", "Electronics", 2600, "Great for the library. Case included."],
  ["Room mattress (single)", "Furniture", 1200, "Clean, no stains. Moving out Friday."],
];

const POSTS = [
  ["lost", "Lost blue Boat earbuds near SJT", "Left them on a bench outside SJT around 4pm. Case has a sticker.", "SJT"],
  ["found", "Found an ID card near the mess", "Found it by the wash basins. DM me your roll number to claim.", "Main Mess"],
  ["notice", "Anyone selling a cycle under 4k?", "Preferably geared. Can pick up from anywhere on campus.", "Campus"],
  ["notice", "Badminton doubles, courts free at 6", "Two of us looking for two more. Bring your own racquet.", "Sports Complex"],
];

const PICKUPS = [
  ["Amazon", "Small parcel — phone case", "A Block", 20],
  ["Flipkart", "Books box, a bit heavy", "D Block", 30],
  ["Zomato", "Dinner order, arriving 8:15", "K Block", 25],
];

const sql = String.raw;

const main = async () => {
  const c = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const col = await c.query(`select id, name from colleges where email_domain = $1`, [DEMO_DOMAIN]);
  if (!col.rows.length) {
    console.error(`no college with domain ${DEMO_DOMAIN} — refusing to guess at another one`);
    process.exit(1);
  }
  const collegeId = col.rows[0].id;
  console.log(`target: ${col.rows[0].name} (${DEMO_DOMAIN})`);

  if (REMOVE) {
    const n = await c.query(`select count(*)::int n from auth.users where email like $1`, [`%@${DEMO_DOMAIN}`]);
    console.log(`would delete ${n.rows[0].n} bot account(s) and everything they authored`);
    if (!WRITE) return console.log("\ndry run — add --write to apply");
    const d = await c.query(`delete from auth.users where email like $1 returning id`, [`%@${DEMO_DOMAIN}`]);
    console.log(`deleted ${d.rowCount} bot account(s); their content cascades`);
    return;
  }

  const existing = await c.query(`select count(*)::int n from auth.users where email like $1`, [`%@${DEMO_DOMAIN}`]);
  console.log(`existing bots: ${existing.rows[0].n}`);
  console.log(
    `would seed: ${BOTS.length} students · ${LISTINGS.length} listings · ${POSTS.length} board posts · ` +
      `${PICKUPS.length} gate pickups · 1 event · 1 cab trip · 1 group-buy · 1 subscription pool`
  );
  if (!WRITE) return console.log("\ndry run — add --write to apply");

  const ids = [];
  for (const [name, username, block, batch] of BOTS) {
    const email = `${username}@${DEMO_DOMAIN}`;
    await c.query(`delete from auth.users where email = $1`, [email]);
    const u = await c.query(
      sql`insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
          values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
            'authenticated', $1, crypt('demopass1234', gen_salt('bf')), now(), now(), now(),
            '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('name', $2::text))
          returning id`,
      [email, name]
    );
    const id = u.rows[0].id;
    // GoTrue scans these into non-nullable Go strings; NULL 500s the password grant.
    await c.query(
      sql`update auth.users set confirmation_token='', recovery_token='', email_change_token_new='',
            email_change='', email_change_token_current='', phone_change='', phone_change_token='',
            reauthentication_token='' where id = $1`,
      [id]
    );
    await c.query(
      sql`insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
          values ($1::text, $2::uuid, jsonb_build_object('sub',$3::text,'email',$4::text), 'email', now(), now(), now())`,
      [id, id, id, email]
    );
    // handle_new_user made the profile; fill in the campus detail it cannot know.
    await c.query(
      `update profiles set name=$2, username=$3, hostel_block=$4, batch=$5, college_id=$6 where id=$1`,
      [id, name, username, block, batch, collegeId]
    );
    ids.push(id);
  }
  console.log(`seeded ${ids.length} students`);

  const pick = (i) => ids[i % ids.length];

  for (const [i, [title, category, price, description]] of LISTINGS.entries()) {
    await c.query(
      `insert into listings (college_id, seller_id, title, category, price, description, status)
       values ($1,$2,$3,$4,$5,$6,'available')`,
      [collegeId, pick(i), title, category, price, description]
    );
  }
  for (const [i, [type, title, description, location]] of POSTS.entries()) {
    await c.query(
      `insert into posts (college_id, author_id, type, title, description, location)
       values ($1,$2,$3::post_type,$4,$5,$6)`,
      [collegeId, pick(i + 3), type, title, description, location]
    );
  }
  await c.query(
    `insert into posts (college_id, author_id, type, title, description, location, event_date, capacity)
     values ($1,$2,'event','Open mic night — acoustic sets welcome',
       'Bring an instrument or just come listen. Sign-ups at the door.', 'Audi Block',
       now() + interval '5 days', 80)`,
    [collegeId, pick(1)]
  );
  for (const [i, [platform, item, drop, reward]] of PICKUPS.entries()) {
    await c.query(
      `insert into pickup_requests (college_id, requester_id, platform, item_desc, gate, drop_location, expected_at, reward, status)
       values ($1,$2,$3,$4,'Main Gate',$5, now() + ($6 || ' minutes')::interval, $7, 'open')`,
      [collegeId, pick(i + 5), platform, item, drop, String(40 + i * 25), reward]
    );
  }
  await c.query(
    `insert into trips (college_id, creator_id, origin, destination, depart_at, seats, status)
     values ($1,$2,'Main Gate','Katpadi Junction', now() + interval '2 days', 3, 'open')`,
    [collegeId, pick(2)]
  );
  await c.query(
    `insert into group_orders (college_id, organizer_id, title, category, deadline, status)
     values ($1,$2,'Bulk stationery run — notebooks & pens','Other', now() + interval '3 days','open')`,
    [collegeId, pick(4)]
  );
  await c.query(
    `insert into subscriptions (college_id, owner_id, service_name, total_cost, billing_cycle, renewal_date, seats, is_discoverable, open_seats)
     values ($1,$2,'Spotify Duo',149,'monthly', now() + interval '18 days', 2, true, 1)`,
    [collegeId, pick(6)]
  );

  console.log("seeded campus activity: listings, board, event, gate pickups, cab trip, group-buy, pool");
  console.log(`\nlog in as any of: ${BOTS.map((b) => b[1] + "@" + DEMO_DOMAIN).slice(0, 3).join(", ")} …  password: demopass1234`);
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FAILED:", e.message);
    process.exit(1);
  });
