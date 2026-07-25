import Link from "next/link";
import { Card } from "@/components/ui";
import { attendancePercent } from "./bunk-math";

export type CourseAttendance = { code: string; title: string; attended: number; held: number; threshold: number };

export function AttendanceSummary({ courses }: { courses: CourseAttendance[] }) {
  const sorted = [...courses].sort(
    (a, b) => attendancePercent(a.attended, a.held) - attendancePercent(b.attended, b.held)
  );

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((c) => {
        const pct = attendancePercent(c.attended, c.held);
        const ok = pct >= c.threshold;
        return (
          <Link key={c.code} href={`/timetable/${encodeURIComponent(c.code)}`} className="press">
            <Card>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{c.code}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.title}</p>
                </div>
                <span className={`font-heading text-sm font-bold ${ok ? "text-accent" : "text-destructive"}`}>
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                <div
                  className={`h-1.5 rounded-full ${ok ? "bg-accent" : "bg-destructive"}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
