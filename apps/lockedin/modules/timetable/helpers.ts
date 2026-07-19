export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type TimetableEntry = {
  id: string;
  day_of_week: number;
  starts_at: string; // "HH:MM:SS"
  ends_at: string;
  course_code: string;
  title: string;
  venue: string | null;
  min_attendance: number | null;
};

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Vercel functions run in UTC; students are IST. toIST shifts a Date so its
// wall-clock getters (getHours/getDay/getDate…) read Asia/Kolkata on any
// server timezone — a no-op on an IST machine. Read-only trick: never compare
// a shifted Date to real timestamps or serialize it (toISOString is off by
// the shift). For rendering real timestamps, pass timeZone: "Asia/Kolkata"
// to toLocale* instead.
export function toIST(d: Date) {
  return new Date(d.getTime() + (d.getTimezoneOffset() + 330) * 60000);
}
export function istNow() {
  return toIST(new Date());
}

// Parse a datetime-local form value ("YYYY-MM-DDTHH:MM") as IST wall-clock.
// Without the explicit offset, new Date() reads it in SERVER time — UTC on
// Vercel — shifting every user-entered time by +5:30 (write-side twin of the
// render bug fixed 2026-07-15).
export function istParse(local: string) {
  return new Date(local + "+05:30");
}

// [start, end) of the current IST calendar day as real UTC instants, for
// range filters on timestamptz columns.
export function istTodayISO() {
  const ist = istNow();
  const start = Date.UTC(ist.getFullYear(), ist.getMonth(), ist.getDate()) - 330 * 60000;
  return { start: new Date(start).toISOString(), end: new Date(start + 86400000).toISOString() };
}

// IST Y-M-D, not toISOString() (which is UTC and lands on the wrong day
// between midnight and 5:30 AM IST) — pass an istNow()-shifted date.
export function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// Free window until the next class starts today. null when a class is
// ongoing or the user has no timetable; minutes is capped at 180 for
// relevance ("free all evening" ≈ 3h of actionable window).
export function getFreeWindow(entries: TimetableEntry[], now: Date): number | null {
  if (entries.length === 0) return null;
  const next = getNextClass(entries, now);
  if (next === null) return 180; // no more classes today
  if (next.ongoing) return null;
  return Math.min(next.minutesUntil, 180);
}

// Next entry today (or later this week) with time-until, for the home "Up
// Next" card and the Today view's highlight.
export function getNextClass(entries: TimetableEntry[], now: Date) {
  const day = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const today = entries
    .filter((e) => e.day_of_week === day && toMinutes(e.ends_at) > nowMin)
    .sort((a, b) => toMinutes(a.starts_at) - toMinutes(b.starts_at));
  if (today.length) {
    const next = today[0];
    const minutesUntil = Math.max(0, toMinutes(next.starts_at) - nowMin);
    const ongoing = toMinutes(next.starts_at) <= nowMin;
    return { entry: next, minutesUntil, ongoing };
  }
  return null;
}
