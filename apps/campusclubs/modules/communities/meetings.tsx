"use client";

import { useState } from "react";
import { useRefresh } from "@/lib/use-refresh";
import { createMeeting, deleteMeeting, markMeetingAttendance, getFreeWindows } from "./actions";
import { DAY_SHORT } from "@/modules/timetable/helpers";

type Meeting = { id: string; title: string; meet_at: string };
type Member = { user_id: string; name: string };

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}
function minLabel(m: number) {
  const h = Math.floor(m / 60), mm = m % 60;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${period}`;
}

// Team meetings: leads schedule + take roll-call; members see the list.
// "When is everyone free?" uses the 0055 definer RPC over members' timetables.
export default function Meetings({
  cid,
  isLead,
  meetings,
  members,
  attendance,
}: {
  cid: string;
  isLead: boolean;
  meetings: Meeting[];
  members: Member[];
  attendance: Record<string, string[]>; // meeting_id -> present user_ids
}) {
  const refresh = useRefresh();
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openRoll, setOpenRoll] = useState<string | null>(null);
  const [freeDay, setFreeDay] = useState<number | null>(null);
  const [windows, setWindows] = useState<{ start_min: number; end_min: number }[] | null>(null);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">📅 Meetings</h2>

      {isLead && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
          <p className="text-sm font-semibold">When is everyone free?</p>
          <div className="flex flex-wrap gap-1.5">
            {DAY_SHORT.map((d, i) => (
              <button
                key={d}
                disabled={busy}
                onClick={async () => {
                  setBusy(true); setFreeDay(i); setWindows(null);
                  const r = await getFreeWindows(cid, i);
                  setWindows(r.windows); setBusy(false);
                }}
                className={`press rounded-full border px-3 py-1 text-xs font-medium ${freeDay === i ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}
              >
                {d}
              </button>
            ))}
          </div>
          {windows && (
            <p className="text-sm text-muted-foreground">
              {windows.length === 0
                ? "No shared free window 8 AM–9 PM that day."
                : windows.map((w) => `${minLabel(w.start_min)}–${minLabel(w.end_min)}`).join(" · ")}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Computed from members&rsquo; timetables without revealing anyone&rsquo;s individual schedule.
          </p>
        </div>
      )}

      {isLead && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
          <p className="text-sm font-semibold">Schedule a meeting</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Weekly sync"
            className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="min-h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm"
            />
            <button
              disabled={busy || !title.trim() || !when}
              onClick={async () => {
                setBusy(true);
                setErr(await createMeeting(cid, title, when));
                setTitle(""); setWhen("");
                setBusy(false);
                refresh();
              }}
              className="press shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
      )}

      {meetings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No meetings scheduled.</p>
      ) : (
        meetings.map((m) => {
          const present = new Set(attendance[m.id] ?? []);
          return (
            <div key={m.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{fmt(m.meet_at)} · {present.size}/{members.length} present</p>
                </div>
                {isLead && (
                  <span className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setOpenRoll(openRoll === m.id ? null : m.id)}
                      className="press rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
                    >
                      Roll-call
                    </button>
                    <button
                      onClick={async () => { if (confirm("Delete this meeting?")) { await deleteMeeting(m.id, cid); refresh(); } }}
                      className="press rounded-full border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
              {isLead && openRoll === m.id && (
                <div className="flex flex-wrap gap-1.5">
                  {members.map((mem) => {
                    const on = present.has(mem.user_id);
                    return (
                      <button
                        key={mem.user_id}
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          await markMeetingAttendance(m.id, cid, mem.user_id, !on);
                          setBusy(false);
                          refresh();
                        }}
                        className={`press rounded-full border px-3 py-1 text-xs font-medium ${on ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-card"}`}
                      >
                        {on ? "✓ " : ""}{mem.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </section>
  );
}
