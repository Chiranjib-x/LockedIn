#!/usr/bin/env node
// Build the LockedIn product brochure as a self-contained PDF.
//
//   node scripts/make-brochure.mjs [--base http://localhost:3001] [--skip-shots]
//
// Captures real phone screenshots from the running app, renders them into an A4
// document with the feature map and use-cases, and prints it to PDF. Everything
// is inlined as data URIs, so the HTML and the PDF are both single files you can
// send to anyone.
//
// SCREENSHOTS COME FROM DEMO COLLEGE ONLY. That college's email domain is
// demo.invalid, which cannot receive mail, so nobody can ever sign up into it and
// every account in it is seeded. A brochure gets forwarded — it must not carry a
// real student's name, listing, or message. The one exception is the campus map,
// which is public building data with no person attached.
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const QRCode = require("qrcode");
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const BASE = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:3001";
const SKIP_SHOTS = args.includes("--skip-shots");

const OUT_DIR = "docs/brochure";
const SHOT_DIR = path.join(OUT_DIR, "shots");
fs.mkdirSync(SHOT_DIR, { recursive: true });

// Supplied screenshots (e.g. taken on a real phone) go here. Drop files in and
// re-run — no flag needed. --photos <dir> overrides the location.
const PHOTO_DIR = args.includes("--photos")
  ? args[args.indexOf("--photos") + 1]
  : path.join(OUT_DIR, "photos");

function suppliedPhotos() {
  if (!fs.existsSync(PHOTO_DIR)) return [];
  return fs
    .readdirSync(PHOTO_DIR)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort()
    .map((f) => path.join(PHOTO_DIR, f));
}

// Demo College dev account (docs/STATE.md). Seeded data, no real students.
const EMAIL = "lockedin.phase1.test@gmail.com";
const PASSWORD = "testpass1234";

const LINKS = {
  app: "https://www.lockedincampus.online",
  download: "https://www.lockedincampus.online/download",
  compass: "https://map.lockedincampus.online",
  clubs: "https://clubs.lockedincampus.online",
  trade: "https://trade.lockedincampus.online",
  gate: "https://gate.lockedincampus.online",
  instagram: "https://instagram.com/chiranjib_x",
};

// ── screenshots ───────────────────────────────────────────────────────────────

// Only screens with something ON them. /chats was in this list and shipped a
// "No chats yet" empty state into the middle of a brochure — an empty state is
// the one thing a marketing document must never show.
const SHOTS = [
  { file: "home.png", route: "/home", caption: "Everything on one screen, ordered by what's happening now." },
  { file: "marketplace.png", route: "/marketplace", caption: "Buy, sell and rent — only with verified students of your own college." },
  { file: "gate.png", route: "/gate", caption: "Gate Runner: someone already walking to the gate brings your parcel." },
  { file: "space.png", route: null, caption: "Her Circle and His Circle — members-only, invisible to everyone else." },
  { file: "compass.png", route: null, caption: "Campus Compass: find any building, with no account at all." },
  { file: "toolbox.png", route: "/toolbox", caption: "33 free, legal tools — papers, courses, software, project assets." },
  { file: "board.png", route: "/board", caption: "Lost & found that matches lost posts against found ones for you." },
  // /timetable and /chats are deliberately absent: Demo College has no classes and
  // no conversations, so both render empty states. Seed those before showing them.
];

async function capture() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  // Animations mid-flight produce half-faded screenshots. Freeze them, and hide
  // the dev-tools badge Next injects — it is not part of the product.
  const FREEZE = `*, *::before, *::after {
      animation-duration: 0s !important; animation-delay: 0s !important;
      transition: none !important; }
    nextjs-portal, [data-nextjs-toast], [data-nextjs-dev-tools-button],
    #__next-build-watcher, #__next-prerender-indicator { display: none !important; }`;

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('main form button[type="submit"]').click();
  await page.waitForURL("**/home", { timeout: 60_000 });
  console.log("logged in as the Demo College test account");

  // Find a space this account belongs to, so the members-only shot is real.
  const spaceHref = await page
    .locator('a[href^="/spaces/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);

  for (const shot of SHOTS) {
    let route = shot.route;
    if (shot.file === "space.png") route = spaceHref;
    if (shot.file === "compass.png") route = null;

    try {
      if (shot.file === "compass.png") {
        // Public, no login — and the only shot not from Demo College, because a
        // building map has no person in it.
        await page.goto(LINKS.compass, { waitUntil: "domcontentloaded", timeout: 45_000 });
      } else {
        if (!route) {
          console.log(`  skip ${shot.file} — no route resolved`);
          continue;
        }
        await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      }
      await page.addStyleTag({ content: FREEZE });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(SHOT_DIR, shot.file) });
      console.log(`  captured ${shot.file}`);
    } catch (e) {
      console.log(`  FAILED ${shot.file}: ${e.message.split("\n")[0]}`);
    }
  }

  await browser.close();
}

// ── content ───────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    group: "Buy, sell & rent",
    items: [
      ["Marketplace", "Buy, sell, and rent with verified students from your own campus."],
      ["Make an offer", "Haggle right on the listing — offer, counter, deal at one tap."],
      ["Requests", "Can't find it? Post what you need and let campus come to you."],
      ["Rent & lend", "Per-day pricing, deposits, due-date reminders, auto-relist on return."],
      ["Student deals", "Curated offers from shops around campus."],
    ],
  },
  {
    group: "Split the cost",
    items: [
      ["Group-buys", "One order, one delivery fee, split between everyone who joins."],
      ["Netflix & Spotify pools", "Browse open seats, join mid-cycle at a prorated share."],
      ["Cab pooling", "4 AM airport run? Find students leaving the same day, split the fare."],
      ["Gate Runner", "Someone's already walking to the gate — they grab your parcel, you reward them."],
    ],
  },
  {
    group: "Your people",
    items: [
      ["Clubs, chapters & teams", "Leads run recruiting, positions, broadcasts, analytics and rosters — no WhatsApp needed."],
      ["Events + barcode check-in", "Organizers scan college IDs at the door and get a live attendee roster."],
      ["Her Circle & His Circle", "Verified women-only and men-only spaces to buy, sell, swap and talk freely."],
      ["Study groups", "Course-tagged groups with their own built-in group chat."],
      ["Roommate match", "Compatibility-scored matches — sleep schedule, tidiness, guests, all of it."],
      ["Crews", "Private groups for roommates & friends with shared to-dos."],
    ],
  },
  {
    group: "Daily drivers",
    items: [
      ["Timetable + bunk math", "One-tap attendance and the answer to “can I skip today?”"],
      ["Campus board", "Lost & found that auto-matches lost posts to found ones, plus notices."],
      ["Built-in chat", "DMs and group rooms with context — every deal, ride and group has its thread."],
      ["Smart notifications", "Class nudges when your attendance is at risk, deal alerts, event pings."],
      ["Search & alerts", "One search across everything; save a search and get told when it appears."],
      ["Karma & ratings", "Good actors are visible — every deal builds your campus reputation."],
      ["Campus Compass", "Every building, hall and gate on a map. Works without an account."],
      ["Toolbox", "33 free, legal tools — papers, courses, software, project assets."],
    ],
  },
  {
    group: "Locked down",
    items: [
      ["College email only", "Every single person here is a verified student of your college."],
      ["No phone numbers", "Usernames, not numbers. Your contact stays private until you share it."],
      ["Report & block everywhere", "Campus moderators act on reports; blocked people can't reach you."],
      ["Your college only", "Everything you post stays inside your campus — enforced at the database."],
    ],
  },
];

const SCENARIOS = [
  ["Your parcel is at the gate. You're in a lab till six.", "Post it on Gate Runner with a small reward. Someone already walking that way brings it to your block. You both get karma; nobody exchanges a number.", "Gate Runner"],
  ["Gravitas is in two weeks and you need an outfit once.", "Her Circle — a verified women-only space. Borrow the lehenga someone wore at Riviera instead of buying one you'll wear once. Invisible to everyone outside it.", "Her Circle"],
  ["You're a club secretary with an event and 400 members.", "One event page, RSVPs, a broadcast to every member, and check-in by scanning college ID barcodes at the door. WhatsApp cannot do the last one at all.", "CampusClubs"],
  ["6 AM flight. A cab to the airport is ₹1,600 alone.", "Post the trip. Three students flying the same morning split it four ways. Everyone pays ₹400.", "Cab pooling"],
  ["You pay for Netflix. Three seats sit empty.", "Open a pool, list the seats, and people from your own campus join mid-cycle at a prorated share. Renewal countdowns, no awkward reminders.", "Subscription pools"],
  ["First week. Your class is in a block you've never heard of.", "Campus Compass. Search the name or the nickname everyone actually uses, get the pin. No login needed — you can send the link to anyone.", "Campus Compass"],
  ["End of semester. Your calculator and cycle are dead weight.", "List them in minutes. Buyers are verified students on your campus, so nobody drives across the city and nobody haggles anonymously.", "Marketplace"],
  ["You've attended 74% and the cut-off is 75%.", "Timetable does the bunk math and warns you before you skip, not after the report card.", "Timetable"],
  ["You left your ID card in the mess two hours ago.", "Post it lost. The board auto-matches your post against everything reported found, so you get told instead of scrolling.", "Campus board"],
  ["You need a paper that's behind a ₹3,000 paywall.", "Toolbox has Unpaywall, arXiv, DOAJ and Semantic Scholar, plus a reminder that your library login already covers IEEE and Springer.", "Toolbox"],
];

const APPS = [
  ["🔥", "LockedIn", "The whole campus in one app — everything in this document.", LINKS.app],
  ["🧭", "Campus Compass", "Find any building. Public, no account needed.", LINKS.compass],
  ["🎓", "CampusClubs", "For club secretaries: events, rosters, barcode check-in.", LINKS.clubs],
  ["🛍️", "CampusTrade", "Just the marketplace and daily-life tools.", LINKS.trade],
  ["🏃", "GateRunner", "Just parcel pickups from the gate.", LINKS.gate],
];

// ── render ────────────────────────────────────────────────────────────────────

// Screenshots go in as JPEG, not PNG. Nine lossless phone captures made an 11 MB
// PDF; each one prints about 55 mm wide, so JPEG q85 is indistinguishable and the
// file becomes something you can actually attach to a message.
const sharp = require("sharp");
const shotCache = new Map();

async function loadShots() {
  for (const shot of SHOTS) {
    const p = path.join(SHOT_DIR, shot.file);
    if (!fs.existsSync(p)) continue;
    const buf = await sharp(p).resize({ width: 700 }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    shotCache.set(shot.file, "data:image/jpeg;base64," + buf.toString("base64"));
  }
}

const dataUri = (file) => shotCache.get(file) ?? null;

// Supplied phone screenshots, normalised to the same width and encoding as the
// captured ones so they sit in the same grid without special-casing.
const photoUris = [];
async function loadPhotos() {
  for (const p of suppliedPhotos()) {
    const buf = await sharp(p).resize({ width: 700 }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    photoUris.push("data:image/jpeg;base64," + buf.toString("base64"));
  }
  if (photoUris.length) console.log(`included ${photoUris.length} supplied photo(s) from ${PHOTO_DIR}`);
}

/** Chunk supplied photos into pages of six for the 3x2 gallery grid. */
function photoPages() {
  const pages = [];
  for (let i = 0; i < photoUris.length; i += 6) pages.push(photoUris.slice(i, i + 6));
  return pages;
}

async function qr(text) {
  return QRCode.toDataURL(text, {
    margin: 0,
    width: 260,
    color: { dark: "#0b0b0d", light: "#ffffff" },
  });
}

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function phone(file, caption) {
  const src = dataUri(file);
  if (!src) return "";
  return `<figure class="phone">
      <img src="${src}" alt="">
      <figcaption>${esc(caption)}</figcaption>
    </figure>`;
}

async function buildHtml() {
  const iconSrc = fs.existsSync("apps/lockedin/assets/icon-only.png")
    ? "data:image/png;base64," + fs.readFileSync("apps/lockedin/assets/icon-only.png").toString("base64")
    : null;

  const qrApp = await qr(LINKS.app);
  const qrDownload = await qr(LINKS.download);
  const appQrs = await Promise.all(APPS.map(([, , , url]) => qr(url)));

  const featureCount = FEATURES.reduce((n, g) => n + g.items.length, 0);
  const shotsAvailable = SHOTS.filter((s) => dataUri(s.file));

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>LockedIn — Campus Super-App</title>
<style>
  @page { size: A4; margin: 0; }
  :root {
    --cream:#f6f5f1; --ink:#0b0b0d; --muted:#6b6e76;
    --cobalt:#2251C7; --green:#16a34a; --purple:#361861; --line:#e3e1da;
  }
  * { box-sizing: border-box; }
  html,body { margin:0; padding:0; }
  body {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: var(--ink); background: #fff;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page {
    width: 210mm; min-height: 297mm; padding: 16mm 15mm;
    page-break-after: always; position: relative; background: var(--cream);
    display: flex; flex-direction: column;
  }
  .page:last-child { page-break-after: auto; }
  h1 { font-size: 40pt; line-height:1.03; margin:0 0 6mm; letter-spacing:-1.2pt; }
  h2 { font-size: 19pt; margin:0 0 4mm; letter-spacing:-0.4pt; }
  h3 { font-size: 11.5pt; margin:0 0 1.5mm; }
  p  { font-size: 10.5pt; line-height:1.5; color:#2c2f36; margin:0 0 3mm; }
  .lede { font-size: 13pt; line-height:1.45; color:#2c2f36; }
  .kicker {
    font-size: 8.5pt; font-weight:800; letter-spacing:2.2pt;
    text-transform:uppercase; color:var(--cobalt); margin:0 0 5mm;
  }
  .muted { color: var(--muted); }

  /* Cover */
  .cover { background: linear-gradient(160deg,#2a1250 0%,#361861 55%,#1d0e37 100%); color:#fff; justify-content:center; }
  .cover h1, .cover p, .cover .kicker { color:#fff; }
  .cover .kicker { color:#c9b8ff; }
  .cover .lede { color:#e8e2ff; }
  .cover-icon { width:34mm; height:34mm; border-radius:8mm; margin-bottom:8mm; box-shadow:0 4mm 12mm rgba(0,0,0,.35); }
  .cover-foot { margin-top:auto; display:flex; align-items:flex-end; justify-content:space-between; gap:8mm; }
  .cover-foot .qr { background:#fff; padding:2.5mm; border-radius:3mm; }
  .cover-foot .qr img { width:26mm; height:26mm; display:block; }
  .url { font-size:12.5pt; font-weight:700; color:#fff; }

  /* Stat row */
  .stats { display:flex; gap:4mm; margin:6mm 0; }
  .stat { flex:1; background:#fff; border:0.4mm solid var(--line); border-radius:4mm; padding:4mm; }
  .stat b { display:block; font-size:20pt; line-height:1; color:var(--cobalt); }
  .stat span { font-size:8.5pt; color:var(--muted); }

  /* Features */
  .fgroup { margin-bottom:5mm; break-inside:avoid; }
  .fgroup > h2 { display:flex; align-items:center; gap:3mm; font-size:14pt; margin-bottom:3mm; }
  .fgroup > h2::after { content:""; flex:1; height:0.4mm; background:var(--line); }
  .fgrid { display:grid; grid-template-columns:1fr 1fr; gap:2.4mm; }
  .fitem { background:#fff; border:0.4mm solid var(--line); border-radius:3mm; padding:2.8mm 3.4mm; break-inside:avoid; }
  .fitem h3 { font-size:10pt; margin-bottom:1mm; }
  .fitem p { font-size:8.5pt; line-height:1.4; margin:0; color:#4a4d55; }

  /* Screens */
  .shots { display:grid; grid-template-columns:1fr 1fr 1fr; gap:5mm; margin-top:4mm; }
  /* Two rows of full-aspect phones are ~238mm tall and blew past A4. Cap the
     height and crop from the top — the top of each screen is the informative
     part, and the bottom nav is identical on every one anyway. */
  .gallery { grid-template-columns:1fr 1fr; gap:6mm 7mm; }
  .gallery img { height:96mm; width:100%; object-fit:cover; object-position:top; }
  .gallery figcaption { font-size:8.5pt; }
  /* Supplied photos: six to a page, uncaptioned, so three columns and shorter. */
  .gallery.three { grid-template-columns:1fr 1fr 1fr; gap:5mm; }
  .gallery.three img { height:107mm; }
  .phone { margin:0; break-inside:avoid; }
  .phone img {
    width:100%; display:block; border-radius:4mm;
    border:0.4mm solid var(--line); box-shadow:0 1.5mm 5mm rgba(0,0,0,.10);
    /* Full 390x844 aspect at this column width is ~119mm tall, which pushed the
       page past A4. Crop from the top; .gallery overrides with its own height. */
    height:74mm; object-fit:cover; object-position:top;
  }
  .phone figcaption { font-size:8pt; line-height:1.35; color:var(--muted); margin-top:2mm; }

  /* Scenarios */
  .scn { background:#fff; border:0.4mm solid var(--line); border-left:1.2mm solid var(--cobalt);
         border-radius:0 3mm 3mm 0; padding:3mm 3.6mm; margin-bottom:2.6mm; break-inside:avoid; }
  .scn h3 { font-size:10pt; margin-bottom:1.2mm; }
  .scn p { font-size:8.5pt; line-height:1.42; margin:0; color:#4a4d55; }
  .scn .tag { display:inline-block; margin-top:2mm; font-size:7.5pt; font-weight:800;
              letter-spacing:0.6pt; text-transform:uppercase; color:var(--cobalt);
              background:rgba(34,81,199,.09); border-radius:999px; padding:1mm 2.5mm; }

  /* Trust */
  .trust { background:var(--ink); color:#fff; border-radius:5mm; padding:6mm; margin-top:4mm; }
  .trust h2, .trust h3 { color:#fff; }
  .trust p { color:#c9cbd1; }
  .trust .fitem { background:rgba(255,255,255,.06); border-color:rgba(255,255,255,.14); }
  .trust .fitem p { color:#c9cbd1; }

  /* Apps */
  .app { display:flex; align-items:center; gap:4mm; background:#fff; border:0.4mm solid var(--line);
         border-radius:4mm; padding:4mm; margin-bottom:3mm; break-inside:avoid; }
  .app .emoji { font-size:20pt; width:12mm; text-align:center; }
  .app .body { flex:1; }
  .app .body h3 { margin-bottom:1mm; }
  .app .body p { font-size:9pt; margin:0; }
  .app .body .link { font-size:8.5pt; color:var(--cobalt); font-weight:700; }
  .app img { width:20mm; height:20mm; }

  .foot { margin-top:auto; padding-top:5mm; border-top:0.4mm solid var(--line);
          display:flex; justify-content:space-between; font-size:8pt; color:var(--muted); }
</style></head><body>

<!-- 1. Cover -->
<section class="page cover">
  ${iconSrc ? `<img class="cover-icon" src="${iconSrc}" alt="">` : ""}
  <p class="kicker">Campus super-app</p>
  <h1>Your campus.<br>One app.</h1>
  <p class="lede">
    ${featureCount} features built for one campus at a time. Every person inside is a
    verified student of your college — no outsiders, no phone numbers, nothing that
    leaves your campus.
  </p>
  <div class="cover-foot">
    <div>
      <p class="lede" style="margin-bottom:2mm">Open it in a browser. Nothing to install.</p>
      <div class="url">www.lockedincampus.online</div>
    </div>
    <div class="qr"><img src="${qrApp}" alt=""></div>
  </div>
</section>

<!-- 2. Why -->
<section class="page">
  <p class="kicker">Why this exists</p>
  <h2>Campus life runs on WhatsApp groups, and WhatsApp groups are terrible at it.</h2>
  <p class="lede">
    A message scrolls away in an hour. Nothing is searchable. "Anyone going to Katpadi
    on Friday?" gets lost under forty replies. You cannot run an event's attendance in
    a group chat, and you cannot sell a cycle to someone who joined last week and never
    read the backlog.
  </p>
  <p class="lede">
    LockedIn keeps the same things students already do — buying, selling, splitting,
    finding, organising — and gives each one a place where it stays put, stays
    searchable, and stays inside the campus.
  </p>
  <div class="stats">
    <div class="stat"><b>${featureCount}</b><span>shipped features</span></div>
    <div class="stat"><b>1</b><span>college per feed</span></div>
    <div class="stat"><b>0</b><span>phone numbers shared</span></div>
    <div class="stat"><b>₹0</b><span>to use</span></div>
  </div>
  <h2 style="margin-top:4mm">What it looks like</h2>
  <div class="shots">
    ${shotsAvailable.slice(0, 3).map((s) => phone(s.file, s.caption)).join("")}
  </div>
  <div class="foot"><span>LockedIn</span><span>www.lockedincampus.online</span></div>
</section>

<!-- 3-4. Features -->
<section class="page">
  <p class="kicker">Everything in it</p>
  <h2>${featureCount} features, grouped the way students think about them</h2>
  ${FEATURES.slice(0, 3)
    .map(
      (g) => `<div class="fgroup"><h2>${esc(g.group)}</h2><div class="fgrid">
        ${g.items.map(([n, b]) => `<div class="fitem"><h3>${esc(n)}</h3><p>${esc(b)}</p></div>`).join("")}
      </div></div>`
    )
    .join("")}
  <div class="foot"><span>Feature map — 1 of 2</span><span>www.lockedincampus.online</span></div>
</section>

<section class="page">
  ${FEATURES.slice(3)
    .map(
      (g) => `<div class="fgroup"><h2>${esc(g.group)}</h2><div class="fgrid">
        ${g.items.map(([n, b]) => `<div class="fitem"><h3>${esc(n)}</h3><p>${esc(b)}</p></div>`).join("")}
      </div></div>`
    )
    .join("")}
  <div class="foot"><span>Feature map — 2 of 2</span><span>www.lockedincampus.online</span></div>
</section>

<!-- Screens get their own page. Squeezed under the feature map they overflowed
     A4 by ~240px, which silently added a ninth page of spillover. -->
<section class="page">
  <p class="kicker">On a phone</p>
  <h2>Built for the device students actually use</h2>
  <p>Every screen here is the real app, not a mockup.</p>
  <div class="shots gallery">
    ${shotsAvailable.slice(3).map((s) => phone(s.file, s.caption)).join("")}
  </div>
  <div class="foot"><span>Screens</span><span>www.lockedincampus.online</span></div>
</section>

${photoPages()
  .map(
    (group, i) => `<section class="page">
  ${i === 0 ? `<p class="kicker">On a real phone</p><h2>Straight off the device</h2>` : ""}
  <div class="shots gallery three">
    ${group.map((src) => `<figure class="phone"><img src="${src}" alt=""></figure>`).join("")}
  </div>
  <div class="foot"><span>Screens${photoPages().length > 1 ? ` — ${i + 1} of ${photoPages().length}` : ""}</span><span>www.lockedincampus.online</span></div>
</section>`
  )
  .join("")}

<!-- 5-6. Scenarios -->
<section class="page">
  <p class="kicker">Use cases</p>
  <h2>Ten things that happen every week on this campus</h2>
  ${SCENARIOS.slice(0, 5)
    .map(
      ([q, a, tag]) =>
        `<div class="scn"><h3>${esc(q)}</h3><p>${esc(a)}</p><span class="tag">${esc(tag)}</span></div>`
    )
    .join("")}
  <div class="foot"><span>Use cases — 1 of 2</span><span>www.lockedincampus.online</span></div>
</section>

<section class="page">
  ${SCENARIOS.slice(5)
    .map(
      ([q, a, tag]) =>
        `<div class="scn"><h3>${esc(q)}</h3><p>${esc(a)}</p><span class="tag">${esc(tag)}</span></div>`
    )
    .join("")}
  <div class="trust">
    <p class="kicker" style="color:#8fb0ff">Locked down</p>
    <h2>Why it is safe to be on it</h2>
    <div class="fgrid">
      ${FEATURES[4].items
        .map(([n, b]) => `<div class="fitem"><h3>${esc(n)}</h3><p>${esc(b)}</p></div>`)
        .join("")}
    </div>
    <p style="margin:4mm 0 0; font-size:9pt">
      College isolation is enforced in the database itself, not in the app code — every
      table is scoped to your college, so there is no request that can return another
      campus's data.
    </p>
  </div>
  <div class="foot"><span>Use cases — 2 of 2</span><span>www.lockedincampus.online</span></div>
</section>

<!-- 7. Apps + get it -->
<section class="page">
  <p class="kicker">Five ways in</p>
  <h2>One super-app, plus four focused ones</h2>
  <p>Same verified-student rules, same campus isolation. Pick the one that matches what you need.</p>
  ${APPS.map(
    ([emoji, name, blurb, url], i) => `<div class="app">
      <div class="emoji">${emoji}</div>
      <div class="body">
        <h3>${esc(name)}</h3>
        <p>${esc(blurb)}</p>
        <div class="link">${esc(url.replace("https://", ""))}</div>
      </div>
      <img src="${appQrs[i]}" alt="">
    </div>`
  ).join("")}

  <div class="app" style="border-color:var(--cobalt); border-width:0.8mm">
    <div class="emoji">📱</div>
    <div class="body">
      <h3>Android app</h3>
      <p>Installed, it can tell you the moment someone claims your parcel or replies to you. The website cannot.</p>
      <div class="link">${esc(LINKS.download.replace("https://", ""))}</div>
    </div>
    <img src="${qrDownload}" alt="">
  </div>

  <p style="margin-top:5mm" class="muted">
    Questions, or want your club set up on it? <b>instagram.com/chiranjib_x</b>
  </p>
  <div class="foot"><span>LockedIn — built by a student at VIT Vellore</span><span>www.lockedincampus.online</span></div>
</section>

</body></html>`;
}

// ── main ──────────────────────────────────────────────────────────────────────

if (!SKIP_SHOTS) await capture();
await loadShots();
await loadPhotos();

const html = await buildHtml();
const htmlPath = path.join(OUT_DIR, "brochure.html");
fs.writeFileSync(htmlPath, html);
console.log(`wrote ${htmlPath} (${(html.length / 1024).toFixed(0)} KB)`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
await page.goto("file:///" + path.resolve(htmlPath).replace(/\\/g, "/"), {
  waitUntil: "load",
});

// A4 is 297mm tall = 1122.5px at 96dpi. A section taller than that is not
// clipped, it silently spills onto an extra page — which is how a 7-section
// document printed 8. Measure it instead of hoping.
const A4_PX = 1122.5;
const heights = await page.$$eval("section.page", (els) =>
  els.map((el, i) => ({ page: i + 1, height: Math.round(el.scrollHeight) }))
);
const overflowing = heights.filter((h) => h.height > A4_PX + 2);
console.table(heights.map((h) => ({ ...h, fits: h.height <= A4_PX + 2 ? "yes" : "NO" })));

const pdfPath = path.join(OUT_DIR, "LockedIn.pdf");
await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
});
await browser.close();

const mb = (fs.statSync(pdfPath).size / 1024 / 1024).toFixed(2);
// Count page objects, not /Count. The page tree is nested, so the first /Count in
// the file is a subtree — it reported 8 for a document that had 10 pages.
const pdfPages = (fs.readFileSync(pdfPath).toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log(`wrote ${pdfPath} — ${mb} MB, ${pdfPages} PDF pages from ${heights.length} sections`);

if (overflowing.length) {
  console.error(
    `FAIL — ${overflowing.length} section(s) overflow A4: ` +
      overflowing.map((o) => `page ${o.page} at ${o.height}px`).join(", ")
  );
  process.exitCode = 1;
}
