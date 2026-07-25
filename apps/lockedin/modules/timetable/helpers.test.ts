// QUEUE A3 — Launch Gate #3 (timezone, shipped broken twice — render side AND
// parse side). Every assertion is TZ-independent, so `node --test` must pass
// identically under TZ=UTC and TZ=Asia/Kolkata. A machine-TZ-dependent bug
// (e.g. dropping the getTimezoneOffset() term in toIST) passes on an IST box
// and fails on a UTC box — which is exactly the Vercel-vs-dev gap.
import test from "node:test";
import assert from "node:assert/strict";
import { toIST, istNow, istTodayISO, istParse } from "./helpers.ts";

test("istParse: datetime-local read as IST wall-clock (explicit +05:30)", () => {
  assert.equal(istParse("2026-07-15T10:00").toISOString(), "2026-07-15T04:30:00.000Z");
  assert.equal(istParse("2026-01-01T00:00").toISOString(), "2025-12-31T18:30:00.000Z");
});

test("toIST: local getters read IST wall-clock on any machine TZ", () => {
  // 00:00 UTC == 05:30 IST, same date.
  const a = toIST(new Date("2026-07-15T00:00:00Z"));
  assert.equal(a.getHours(), 5);
  assert.equal(a.getMinutes(), 30);
  assert.equal(a.getDate(), 15);
  // 20:00 UTC Jul 14 == 01:30 IST Jul 15 — the day-crossing case.
  const b = toIST(new Date("2026-07-14T20:00:00Z"));
  assert.equal(b.getHours(), 1);
  assert.equal(b.getDate(), 15);
});

test("istTodayISO: spans exactly one IST day (00:00 IST == 18:30 UTC)", () => {
  const { start, end } = istTodayISO();
  assert.equal(new Date(end).getTime() - new Date(start).getTime(), 86_400_000);
  assert.equal(new Date(start).getUTCHours(), 18);
  assert.equal(new Date(start).getUTCMinutes(), 30);
  const now = Date.now();
  assert.ok(new Date(start).getTime() <= now && now < new Date(end).getTime());
});

test("istNow returns a Date", () => {
  assert.ok(istNow() instanceof Date);
});
