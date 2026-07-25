import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UpNextCard } from "@/modules/timetable/up-next-card";
import { getNextClass, istNow, type TimetableEntry } from "@/modules/timetable/helpers";
import { attendancePercent } from "@/modules/timetable/bunk-math";

type CourseTotals = { attended: number; held: number; threshold: number };

// Next class + a heads-up if ANY course (not just the next one) has slipped
// below threshold. Each feed section owns its own try/catch around the data
// fetch (only) so one broken section can never blank the rest of the page —
// JSX construction stays outside the try block per the react-hooks lint rule.
export default async function NowStrip() {
  let next: ReturnType<typeof getNextClass> = null;
  const byCourse = new Map<string, CourseTotals>();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [{ data: profile }, { data: entries }, { data: records }] = await Promise.all([
      supabase
        .from("profiles")
        .select("colleges(attendance_threshold)")
        .eq("id", user.id)
        .single<{ colleges: { attendance_threshold: number } | null }>(),
      supabase.from("timetable_entries").select("*"),
      supabase.from("attendance_records").select("course_code, status"),
    ]);

    const defaultThreshold = profile?.colleges?.attendance_threshold ?? 75;
    const allEntries = (entries ?? []) as TimetableEntry[];
    next = getNextClass(allEntries, istNow());

    for (const e of allEntries) {
      if (!byCourse.has(e.course_code)) {
        byCourse.set(e.course_code, { attended: 0, held: 0, threshold: e.min_attendance ?? defaultThreshold });
      }
    }
    for (const r of records ?? []) {
      const c = byCourse.get(r.course_code);
      if (!c || r.status === "cancelled") continue;
      c.held += 1;
      if (r.status === "present") c.attended += 1;
    }
  } catch {
    return null;
  }

  const below = [...byCourse.entries()].filter(
    ([code, c]) => c.held > 0 && attendancePercent(c.attended, c.held) < c.threshold && code !== next?.entry.course_code
  );

  if (!next && !below.length) return null;
  const nextCourse = next ? byCourse.get(next.entry.course_code) : undefined;

  return (
    <div className="flex flex-col gap-2">
      {next && nextCourse && (
        <UpNextCard
          entry={next.entry}
          minutesUntil={next.minutesUntil}
          ongoing={next.ongoing}
          attended={nextCourse.attended}
          held={nextCourse.held}
          threshold={nextCourse.threshold}
        />
      )}
      {below.length > 0 && (
        <Link
          href="/timetable"
          className="animate-fade-up press flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm font-medium text-destructive"
        >
          ⚠️ {below.length} course{below.length === 1 ? "" : "s"} below your attendance threshold
        </Link>
      )}
    </div>
  );
}
