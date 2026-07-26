import Link from "next/link";
import { Card } from "@suite/ui";
import { attendancePercent, canMissMore } from "./bunk-math";
import { formatTime } from "./helpers";
import type { TimetableEntry } from "./helpers";

export function UpNextCard({
  entry,
  minutesUntil,
  ongoing,
  attended,
  held,
  threshold,
}: {
  entry: TimetableEntry;
  minutesUntil: number;
  ongoing: boolean;
  attended: number;
  held: number;
  threshold: number;
}) {
  const pct = attendancePercent(attended, held);
  const ok = pct >= threshold;
  const timeLabel = ongoing ? "now" : minutesUntil < 60 ? `in ${minutesUntil}m` : `in ${Math.round(minutesUntil / 60)}h`;

  return (
    <Link href={`/timetable/${encodeURIComponent(entry.course_code)}`} className="animate-fade-up press">
      <Card className={ongoing || minutesUntil < 15 ? "urgent-border glow-primary" : "border-primary/30 bg-primary/5"}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wide text-primary uppercase">Up next</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-on-primary ${ongoing || minutesUntil < 15 ? "gradient-brand glow-primary" : "bg-primary"}`}>
            {timeLabel}
          </span>
        </div>
        <h2 className="mt-1 text-lg font-bold">{entry.title}</h2>
        <p className="text-sm text-muted-foreground">
          {formatTime(entry.starts_at)}–{formatTime(entry.ends_at)}{entry.venue && ` · ${entry.venue}`}
        </p>
        {held > 0 && (
          <>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Attendance</span>
              <span className={`font-semibold ${ok ? "text-accent" : "text-destructive"}`}>
                {pct.toFixed(0)}%
                {ok && <span className="ml-1 font-normal text-muted-foreground">skip {canMissMore(attended, held, threshold)} more</span>}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
              <div className={`h-1.5 rounded-full ${ok ? "bg-accent" : "bg-destructive"}`} style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
          </>
        )}
      </Card>
    </Link>
  );
}
