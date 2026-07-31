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

// The IST primitives used to live here, duplicated byte-for-byte across three
// forks, while packages/lib/ist.ts held a rival copy with ZERO consumers. QUEUE
// A37 merged them: @suite/lib is now the superset and owns every date/time
// primitive; this file owns the timetable.
//
// They are re-exported because ~15 call sites per app already import them from
// here, and rewriting those adds risk to the repo's most bug-prone surface for
// no benefit. New code should import from "@suite/lib".
export {
  toIST,
  istNow,
  istParse,
  istTodayISO,
  dateKey,
  istDateKey,
  istDayLabel,
} from "@suite/lib";

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
