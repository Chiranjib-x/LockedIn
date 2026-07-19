import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { PastAttendanceForm } from "@/modules/timetable/attendance-marker";
import { attendancePercent, bunkMessage } from "@/modules/timetable/bunk-math";
import { DAY_NAMES, formatTime } from "@/modules/timetable/helpers";

export default async function CoursePage({ params }: { params: Promise<{ code: string }> }) {
  const { supabase } = await requireUser();
  const { code: raw } = await params;
  const code = decodeURIComponent(raw);

  const [{ data: profile }, { data: entries }, { data: records }] = await Promise.all([
    supabase.from("profiles").select("colleges(attendance_threshold)").single<{ colleges: { attendance_threshold: number } | null }>(),
    supabase.from("timetable_entries").select("*").eq("course_code", code).order("day_of_week"),
    supabase.from("attendance_records").select("*").eq("course_code", code).order("date", { ascending: false }),
  ]);

  if (!entries?.length) notFound();

  const threshold = entries.find((e) => e.min_attendance != null)?.min_attendance ?? profile?.colleges?.attendance_threshold ?? 75;
  const held = (records ?? []).filter((r) => r.status !== "cancelled").length;
  const attended = (records ?? []).filter((r) => r.status === "present").length;
  const pct = attendancePercent(attended, held);
  const ok = pct >= threshold;

  const STATUS_LABEL: Record<string, string> = { present: "Present ✅", absent: "Absent ❌", cancelled: "Cancelled 🚫" };

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/timetable" className="text-sm text-muted-foreground hover:text-foreground">← Timetable</Link>

      <div>
        <h1 className="text-2xl font-bold">{code}</h1>
        <p className="text-sm text-muted-foreground">{entries[0].title}</p>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Attendance</p>
          <span className={`font-heading text-xl font-bold ${ok ? "text-accent" : "text-destructive"}`}>{pct.toFixed(0)}%</span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-muted">
          <div className={`h-2 rounded-full ${ok ? "bg-accent" : "bg-destructive"}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{attended}/{held} attended · required {threshold}%</p>
        <p className="mt-2 text-sm font-medium">{bunkMessage(attended, held, threshold)}</p>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Weekly slots</h2>
        {entries.map((e) => (
          <p key={e.id} className="text-sm text-foreground/90">
            {DAY_NAMES[e.day_of_week]} · {formatTime(e.starts_at)}–{formatTime(e.ends_at)}{e.venue && ` · ${e.venue}`}
          </p>
        ))}
      </section>

      <PastAttendanceForm courseCode={code} />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">History</h2>
        {!records?.length ? (
          <p className="text-sm text-muted-foreground">No attendance marked yet.</p>
        ) : (
          records.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm">
              <span>{new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</span>
              <span className="font-medium">{STATUS_LABEL[r.status]}</span>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
