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

// Local Y-M-D, not toISOString() (which is UTC and can land on the wrong
// day near midnight IST) — same server-local approximation greeting() uses.
export function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
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
