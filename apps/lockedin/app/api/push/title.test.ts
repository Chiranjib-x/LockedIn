// QUEUE A5 — each routed app value produces its own push title; unknown/missing
// falls back to "LockedIn" (never a crash, never a blank title).
import test from "node:test";
import assert from "node:assert/strict";
import { titleFor } from "./title.ts";

test("titleFor maps each routed app to its display name", () => {
  assert.equal(titleFor("gaterunner"), "GateRunner");
  assert.equal(titleFor("clubs"), "CampusClubs");
  assert.equal(titleFor("trade"), "CampusTrade");
  assert.equal(titleFor("lockedin"), "LockedIn");
});

test("titleFor falls back to LockedIn for unknown/missing app", () => {
  assert.equal(titleFor(undefined), "LockedIn");
  assert.equal(titleFor("nope"), "LockedIn");
  assert.equal(titleFor(42), "LockedIn");
});
