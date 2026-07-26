"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";
import { useRefresh } from "@suite/lib/use-refresh";
import { markAttendance } from "./actions";

const STATUSES = [
  { value: "present", label: "Present", emoji: "✅" },
  { value: "absent", label: "Absent", emoji: "❌" },
  { value: "cancelled", label: "Cancelled", emoji: "🚫" },
] as const;

type Status = (typeof STATUSES)[number]["value"];

export function MarkAttendance({
  courseCode,
  date,
  current,
}: {
  courseCode: string;
  date: string;
  current: Status | null;
}) {
  const refresh = useRefresh();
  const [status, setStatus] = useState<Status | null>(current);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex gap-1.5">
      {STATUSES.map((s) => (
        <button
          key={s.value}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setStatus(s.value);
            await markAttendance(courseCode, date, s.value);
            setBusy(false);
            refresh();
          }}
          className={`press rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
            status === s.value
              ? s.value === "present"
                ? "bg-accent text-on-accent"
                : s.value === "absent"
                  ? "bg-destructive text-on-destructive"
                  : "bg-muted text-muted-foreground"
              : "border border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {s.emoji} {s.label}
        </button>
      ))}
    </div>
  );
}

export function PastAttendanceForm({ courseCode }: { courseCode: string }) {
  const refresh = useRefresh();
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
      <p className="text-sm font-medium">Mark a past date</p>
      <input aria-label="Mark a past date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
      {date && (
        <div className="flex gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await markAttendance(courseCode, date, s.value);
                setBusy(false);
                setDate("");
                refresh();
              }}
              className="press rounded-full border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-50"
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
