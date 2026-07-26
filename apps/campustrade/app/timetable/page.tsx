import { CalendarDays } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card } from "@suite/ui";
import { EmptyState } from "@suite/ui";
import { MarkAttendance } from "@/modules/timetable/attendance-marker";
import { AddClassForm, DeleteEntryButton } from "@/modules/timetable/client";
import { AttendanceSummary, type CourseAttendance } from "@/modules/timetable/attendance-summary";
import { DAY_NAMES, dateKey, formatTime, istNow, type TimetableEntry } from "@/modules/timetable/helpers";
import PushOptIn from "@/components/push-opt-in";

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { error } = await searchParams;

  const [{ data: profile }, { data: entries }, { data: records }] = await Promise.all([
    supabase.from("profiles").select("college_id, colleges(attendance_threshold)").eq("id", user.id)
      .single<{ college_id: string; colleges: { attendance_threshold: number } | null }>(),
    supabase.from("timetable_entries").select("*").order("starts_at"),
    supabase.from("attendance_records").select("course_code, date, status"),
  ]);

  const defaultThreshold = profile?.colleges?.attendance_threshold ?? 75;
  const allEntries = (entries ?? []) as TimetableEntry[];
  const now = istNow(); // wall-clock reads below must be IST, not server tz
  const today = now.getDay();
  const todayKey = dateKey(now);

  const todayEntries = allEntries.filter((e) => e.day_of_week === today);
  const recordByCourseDate = new Map((records ?? []).map((r) => [`${r.course_code}|${r.date}`, r.status]));

  // Per-course aggregation for the summary widget.
  const courseMap = new Map<string, CourseAttendance>();
  for (const e of allEntries) {
    if (!courseMap.has(e.course_code)) {
      courseMap.set(e.course_code, {
        code: e.course_code,
        title: e.title,
        attended: 0,
        held: 0,
        threshold: e.min_attendance ?? defaultThreshold,
      });
    }
  }
  for (const r of records ?? []) {
    const c = courseMap.get(r.course_code);
    if (!c) continue;
    if (r.status === "cancelled") continue;
    c.held += 1;
    if (r.status === "present") c.attended += 1;
  }

  // Week grouped by day, starting today.
  const orderedDays = Array.from({ length: 7 }, (_, i) => (today + i) % 7);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="animate-fade-up text-2xl font-bold">Timetable</h1>

      <PushOptIn context="timetable" />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Today</h2>
        {!todayEntries.length ? (
          <EmptyState icon={CalendarDays} tint="violet" title="No classes today">
            <p className="text-sm text-muted-foreground">Enjoy it — or add your week below.</p>
          </EmptyState>
        ) : (
          todayEntries.map((e) => {
            const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
            const ongoing = e.starts_at.slice(0, 5) <= hm && hm < e.ends_at.slice(0, 5);
            return (
            <Card key={e.id} className={`flex flex-col gap-2 ${ongoing ? "urgent-border glow-primary" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold">
                    {e.title}
                    {ongoing && (
                      <span className="gradient-brand animate-pulse rounded-full px-2 py-0.5 text-[10px] font-bold text-on-primary">
                        NOW
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(e.starts_at)}–{formatTime(e.ends_at)} · {e.course_code}
                    {e.venue && <> · {e.venue}</>}
                  </p>
                </div>
              </div>
              <MarkAttendance
                courseCode={e.course_code}
                date={todayKey}
                current={(recordByCourseDate.get(`${e.course_code}|${todayKey}`) as "present" | "absent" | "cancelled") ?? null}
              />
            </Card>
            );
          })
        )}
      </section>

      {courseMap.size > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Attendance</h2>
          <AttendanceSummary courses={[...courseMap.values()]} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">This week</h2>
        {orderedDays.map((day) => {
          const dayEntries = allEntries.filter((e) => e.day_of_week === day);
          if (!dayEntries.length) return null;
          return (
            <div key={day} className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {day === today ? "Today" : DAY_NAMES[day]}
              </p>
              {dayEntries.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatTime(e.starts_at)}–{formatTime(e.ends_at)} · {e.course_code}
                      {e.venue && <> · {e.venue}</>}
                    </p>
                  </div>
                  <DeleteEntryButton id={e.id} />
                </div>
              ))}
            </div>
          );
        })}
        <AddClassForm error={error} />
      </section>
    </main>
  );
}
