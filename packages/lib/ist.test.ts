// QUEUE A3 — Launch Gate #3 (timezone, shipped broken twice). These assertions
// are TZ-independent by construction, so `node --test` must pass identically
// under TZ=UTC and TZ=Asia/Kolkata. istParse relies on an explicit +05:30, so a
// regression that drops it would change the UTC instant and fail here.
import test from "node:test";
import assert from "node:assert/strict";
import { istParse, istDateKey, istDayLabel, istInputValue } from "./ist.ts";

test("istParse reads a datetime-local value as IST wall-clock", () => {
  // 10:00 IST == 04:30 UTC, same day.
  assert.equal(istParse("2026-07-15T10:00").toISOString(), "2026-07-15T04:30:00.000Z");
  // Midnight IST == 18:30 UTC the previous day (the boundary that broke twice).
  assert.equal(istParse("2026-01-01T00:00").toISOString(), "2025-12-31T18:30:00.000Z");
});

// FINDINGS F1 — the read-side twin. 20:00 UTC is already the NEXT day in IST
// (01:30), which is exactly the window the old toDateString() comparison got
// wrong. These must hold identically under TZ=UTC and TZ=Asia/Kolkata.
test("istDateKey resolves the IST calendar day, not the server's", () => {
  assert.equal(istDateKey(new Date("2026-07-15T20:00:00Z")), "2026-07-16");
  assert.equal(istDateKey(new Date("2026-07-15T18:29:00Z")), "2026-07-15");
  assert.equal(istDateKey(new Date("2026-07-15T18:30:00Z")), "2026-07-16");
});

test("istDayLabel says Today/Yesterday by IST day", () => {
  const now = new Date("2026-07-16T04:00:00Z"); // 09:30 IST on the 16th
  // 20:00 UTC on the 15th is 01:30 IST on the 16th — Today, not Yesterday.
  assert.equal(istDayLabel("2026-07-15T20:00:00Z", now), "Today");
  assert.equal(istDayLabel("2026-07-15T06:00:00Z", now), "Yesterday");
  assert.equal(istDayLabel("2026-07-10T06:00:00Z", now), "10 Jul");
});

// The round trip is the property that matters for an edit form: whatever a
// moderator typed must come back out of the form unchanged, on any server tz.
// A missing offset on either side shifts it by 5:30 per save.
test("istInputValue round-trips istParse on any server timezone", () => {
  for (const local of ["2026-09-12T18:30", "2026-01-01T00:00", "2026-12-31T23:59"]) {
    assert.equal(istInputValue(istParse(local).toISOString()), local);
  }
  assert.equal(istInputValue(null), "");
  // 18:30 UTC is 00:00 IST the NEXT day — the boundary that broke twice before.
  assert.equal(istInputValue("2026-07-15T18:30:00.000Z"), "2026-07-16T00:00");
});
