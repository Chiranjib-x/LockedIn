// QUEUE A3 — Launch Gate #3 (timezone, shipped broken twice). These assertions
// are TZ-independent by construction, so `node --test` must pass identically
// under TZ=UTC and TZ=Asia/Kolkata. istParse relies on an explicit +05:30, so a
// regression that drops it would change the UTC instant and fail here.
import test from "node:test";
import assert from "node:assert/strict";
import { istParse } from "./ist.ts";

test("istParse reads a datetime-local value as IST wall-clock", () => {
  // 10:00 IST == 04:30 UTC, same day.
  assert.equal(istParse("2026-07-15T10:00").toISOString(), "2026-07-15T04:30:00.000Z");
  // Midnight IST == 18:30 UTC the previous day (the boundary that broke twice).
  assert.equal(istParse("2026-01-01T00:00").toISOString(), "2025-12-31T18:30:00.000Z");
});
