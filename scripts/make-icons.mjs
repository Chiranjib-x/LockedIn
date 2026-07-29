#!/usr/bin/env node
// Regenerate every LockedIn icon from one master artwork.
//
// Run it again whenever the logo changes — hand-resizing a dozen PNGs across
// web, PWA and six Android densities is how they drift out of sync.
//
//   node scripts/make-icons.mjs <master.png> [--app lockedin] [--write]
//
// Dry-run by default: it prints what it would write and touches nothing. The
// master should be a square, full-bleed logo; rounded corners are filled in
// automatically so the OS can apply its own mask.
//
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const appIdx = args.indexOf("--app");
const APP = appIdx >= 0 ? args[appIdx + 1] : "lockedin";
// Skip the flags, and the value belonging to --app when that flag is present.
const appValueIdx = appIdx >= 0 ? appIdx + 1 : -1;
const MASTER = args.find((a, i) => !a.startsWith("--") && i !== appValueIdx);
if (!MASTER) {
  console.error("usage: node scripts/make-icons.mjs <master.png> [--app lockedin] [--write]");
  process.exit(1);
}

const ROOT = `apps/${APP}`;
if (!fs.existsSync(ROOT)) {
  console.error(`No such app: ${ROOT}`);
  process.exit(1);
}

// Android adaptive icons keep their art inside a 72/108 circle; anything outside
// is cropped by the launcher's mask. Same idea for a maskable PWA icon.
const SAFE = 72 / 108;

const planned = [];
const emitted = new Map(); // path -> buffer, so later steps reuse new bytes, not old files
const emit = async (file, buf) => {
  planned.push(`${buf.length.toString().padStart(7)}b  ${file}`);
  emitted.set(file, buf);
  if (WRITE) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buf);
  }
};

/**
 * Fill the light corners left by a rounded-square artwork so the result is a
 * true full-bleed square the OS can mask itself.
 *
 * Replaces the sheet showing through the rounded corners with the logo's own
 * backdrop colour.
 */
async function squareOff(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const at = (x, y) => (y * W + x) * C;

  // The hole is the bright region CONNECTED TO THE CORNERS — the sheet behind the
  // rounded edge. Testing brightness alone is not enough: the flame, the arc and
  // the white wordmark are the brightest pixels in the logo, so a plain
  // brightness test flags the artwork itself (measured: 19.6% of the image) and
  // the inpainting below then erases it. The dark rim of the tile is what stops
  // this fill from reaching the middle.
  const bright = (i) => data[i] + data[i + 1] + data[i + 2] > 400;
  const hole = new Uint8Array(W * H);
  const stack = [];
  for (const [cx, cy] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]]) stack.push(cx, cy);
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const k = y * W + x;
    if (hole[k] || !bright(at(x, y))) continue;
    hole[k] = 1;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  // Fill with the logo's own backdrop, sampled just inside each corner where the
  // art never reaches. Growing the edge inward-out instead seeds from the tile's
  // light bevel and leaves a pale halo in the corners.
  let r = 0, g = 0, b = 0;
  const probes = [
    [0.07, 0.16], [0.93, 0.16],
    [0.07, 0.84], [0.93, 0.84],
  ];
  for (const [px, py] of probes) {
    const i = at(Math.round(W * px), Math.round(H * py));
    r += data[i]; g += data[i + 1]; b += data[i + 2];
  }
  r = Math.round(r / probes.length);
  g = Math.round(g / probes.length);
  b = Math.round(b / probes.length);

  for (let k = 0; k < W * H; k++) {
    if (!hole[k]) continue;
    const i = k * C;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
  }

  return sharp(data, { raw: { width: W, height: H, channels: C } }).png().toBuffer();
}

/** Scale the art into the mask safe zone, centred on `bg` (or transparent). */
async function inset(master, size, bg) {
  const art = await sharp(master)
    .resize(Math.round(size * SAFE), Math.round(size * SAFE), { fit: "contain" })
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: art, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Minimal .ico wrapping PNG payloads — the format has allowed PNG since Vista. */
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + entries.length * 16;
  const dir = [];
  for (const { size, buf } of entries) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    dir.push(e);
  }
  return Buffer.concat([header, ...dir, ...entries.map((e) => e.buf)]);
}

// ---------------------------------------------------------------- build

const squared = await squareOff(MASTER);
const meta = await sharp(squared).metadata();
console.log(`master ${MASTER} -> squared ${meta.width}x${meta.height}`);

// The logo's background, reused as the Android adaptive-icon background so the
// launcher's mask blends into the art instead of framing it.
// Read an actual corner pixel — after squareOff that IS the background. Averaging
// the whole image instead would blend in the flame and give a muddy purple.
const px = await sharp(squared).extract({ left: 2, top: 2, width: 1, height: 1 }).raw().toBuffer();
const bg = { r: px[0], g: px[1], b: px[2], alpha: 1 };
const hex = "#" + [px[0], px[1], px[2]].map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
console.log(`background sampled: ${hex}`);

// compressionLevel ONLY. In sharp 0.34.5 `effort` is the palette-search knob, so
// passing it quantises to 256 colours even without `palette: true` — that banded
// this gradient flame and shredded the wordmark. Verified: with effort:10 the
// output has 256 distinct colours, with compressionLevel alone it has >5000.
const PNG_OPTS = { compressionLevel: 9 };
const png = (size) => sharp(squared).resize(size, size, { fit: "cover" }).png(PNG_OPTS).toBuffer();

// 1. Master artwork kept alongside the app.
await emit(`${ROOT}/assets/icon-only.png`, await png(1024));

// 2. Web + PWA. Sizes match what app/manifest.ts declares.
await emit(`${ROOT}/public/icons/icon-192.png`, await png(192));
await emit(`${ROOT}/public/icons/icon-512.png`, await png(512));
await emit(`${ROOT}/public/icons/apple-touch-icon.png`, await png(180));
await emit(`${ROOT}/public/icons/icon-maskable-192.png`, await inset(squared, 192, bg));
await emit(`${ROOT}/public/icons/icon-maskable-512.png`, await inset(squared, 512, bg));

// 3. Favicon — 16/32/48 in one file.
await emit(
  `${ROOT}/app/favicon.ico`,
  ico(await Promise.all([16, 32, 48].map(async (s) => ({ size: s, buf: await png(s) }))))
);

// 4. Android launcher icons, if this app is wrapped by Capacitor.
const RES = `${ROOT}/android/app/src/main/res`;
if (fs.existsSync(RES)) {
  const densities = { ldpi: 36, mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [d, size] of Object.entries(densities)) {
    await emit(`${RES}/mipmap-${d}/ic_launcher.png`, await png(size));
    await emit(`${RES}/mipmap-${d}/ic_launcher_round.png`, await png(size));
    // Foreground is 108dp against a 72dp safe zone, hence the 1.5x canvas.
    await emit(
      `${RES}/mipmap-${d}/ic_launcher_foreground.png`,
      await inset(squared, Math.round(size * 2.25), null)
    );
  }
  await emit(
    `${RES}/values/ic_launcher_background.xml`,
    Buffer.from(
      `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${hex}</color>\n</resources>\n`
    )
  );

  // Capacitor copies public/ into the APK; keep the checked-in copy in step.
  const CAP = `${ROOT}/android/app/src/main/assets/public/icons`;
  if (fs.existsSync(CAP)) {
    for (const f of fs.readdirSync(CAP)) {
      const web = `${ROOT}/public/icons/${f}`;
      // Prefer the bytes generated above; fall back to disk for any extra file.
      const buf = emitted.get(web) ?? (fs.existsSync(web) ? fs.readFileSync(web) : null);
      if (buf) await emit(`${CAP}/${f}`, buf);
    }
  }
}

console.log(planned.join("\n"));
console.log(
  WRITE
    ? `\nWROTE ${planned.length} file(s).`
    : `\nDRY RUN — ${planned.length} file(s) would change. Re-run with --write to apply.`
);
