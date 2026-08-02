// IST time handling, in one place.
//
// This is the single most repeated bug class in this repo — shipped broken twice,
// in both directions (render side and parse side). It was ALSO duplicated: three
// forks carried modules/timetable/helpers.ts byte-identically while this file sat
// here with three functions and, when they were merged, zero consumers anywhere
// in the monorepo. The local copy was the real implementation. This file is now
// the superset of both, per QUEUE A37.
//
// THE TRAP, stated once so nobody rediscovers it: there are two date-key
// functions here and they are NOT interchangeable.
//
//   istDateKey(d)  takes a REAL INSTANT — converts through the Asia/Kolkata zone
//   dateKey(d)     takes an ALREADY-SHIFTED date (from istNow()/toIST()) and
//                  reads its local Y/M/D components
//
// Passing an instant to dateKey() yields the SERVER's date; passing an istNow()
// result to istDateKey() double-shifts it. Both are kept because both have real
// callers with different inputs. Prefer istDateKey() for anything read out of the
// database — those are instants.

// ── parse ────────────────────────────────────────────────────────────────────

// Parse a datetime-local form value ("YYYY-MM-DDTHH:MM") as IST wall-clock.
// Without the explicit offset, new Date() reads it in the server's tz (UTC on
// Vercel), shifting every user-entered time by +5:30.
export function istParse(local: string) {
  return new Date(local + "+05:30");
}

// ── shift ────────────────────────────────────────────────────────────────────

// Shift a real instant into a Date whose LOCAL components read as IST. The
// result is a lie about the instant and a truth about the wall clock — use it
// only where you immediately read getHours()/getDate(), never to store or
// compare.
export function toIST(d: Date) {
  return new Date(d.getTime() + (d.getTimezoneOffset() + 330) * 60000);
}

export function istNow() {
  return toIST(new Date());
}

// ── keys ─────────────────────────────────────────────────────────────────────

// IST Y-M-D for a REAL INSTANT. Never toISOString() (UTC — lands on the wrong
// day between 00:00 and 05:30 IST) and never toDateString() (server tz).
export function istDateKey(d: Date) {
  // en-CA gives YYYY-MM-DD, so the key sorts and compares as a string.
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

// IST Y-M-D for an ALREADY-SHIFTED date — pass an istNow()/toIST() result. See
// the trap note above: this is not istDateKey under a different name.
export function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// [start, end) of the current IST calendar day as real UTC instants, for range
// filters on timestamptz columns.
export function istTodayISO() {
  const ist = istNow();
  const start = Date.UTC(ist.getFullYear(), ist.getMonth(), ist.getDate()) - 330 * 60000;
  return { start: new Date(start).toISOString(), end: new Date(start + 86400000).toISOString() };
}

// ── labels ───────────────────────────────────────────────────────────────────

// "Today" / "Yesterday" / "5 Jul", decided in IST on any server timezone.
// FINDINGS F1: chat + notifications compared toDateString() (server tz = UTC on
// Vercel), so anything sent 00:00–05:30 IST was labelled the previous day.
export function istDayLabel(iso: string, now: Date = new Date()) {
  const key = istDateKey(new Date(iso));
  const todayKey = istDateKey(now);
  const yesterdayKey = istDateKey(new Date(now.getTime() - 86400000));
  if (key === todayKey) return "Today";
  if (key === yesterdayKey) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

// ── form round-trip ──────────────────────────────────────────────────────────

// The inverse of istParse: turn a stored instant back into the "YYYY-MM-DDTHH:MM"
// a <input type="datetime-local"> expects, showing IST wall-clock.
//
// Without this, an edit form on a UTC server renders 18:30 for a 00:00 IST start
// and silently rewinds the time by 5:30 every time anyone re-saves — the same
// bug as istParse, on the way out instead of the way in.
export function istInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  const d = toIST(new Date(iso)); // components now read as IST wall-clock
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
