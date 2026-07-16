"use client";

import { useState } from "react";
import { useRefresh } from "@/lib/use-refresh";
import { createPoll, votePoll, deletePoll, schedulePost, cancelScheduled } from "./actions";

type Vote = { user_id: string; choice: number };
type Poll = { id: string; question: string; options: string[]; closes_at: string | null; votes: Vote[] };
type Scheduled = { id: string; title: string; publish_at: string };

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

// Member polls — leads create, members vote (one each, changeable), results
// visible to the group. Closed polls (past closes_at) are read-only.
export function Polls({ cid, isLead, meId, polls }: { cid: string; isLead: boolean; meId: string; polls: Poll[] }) {
  const refresh = useRefresh();
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  const [closes, setCloses] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!isLead && polls.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">🗳️ Polls</h2>
      {isLead && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Question"
            className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm" />
          {opts.map((o, i) => (
            <input key={i} value={o} onChange={(e) => setOpts(opts.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder={`Option ${i + 1}`}
              className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm" />
          ))}
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setOpts([...opts, ""])} className="press text-xs font-medium text-primary">+ option</button>
            <input type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)}
              title="Closes at (optional)"
              className="min-h-9 rounded-xl border border-border bg-background px-2 text-xs" />
          </div>
          <button
            disabled={busy || !q.trim() || opts.filter((o) => o.trim()).length < 2}
            onClick={async () => { setBusy(true); setErr(await createPoll(cid, q, opts, closes)); setQ(""); setOpts(["", ""]); setCloses(""); setBusy(false); refresh(); }}
            className="press min-h-10 rounded-full bg-primary text-sm font-semibold text-on-primary disabled:opacity-50"
          >
            Post poll
          </button>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
      )}
      {polls.map((poll) => {
        const total = poll.votes.length;
        const myChoice = poll.votes.find((v) => v.user_id === meId)?.choice ?? null;
        const closed = poll.closes_at != null && new Date(poll.closes_at).getTime() < Date.now();
        return (
          <div key={poll.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{poll.question}</p>
              {isLead && <button onClick={async () => { if (confirm("Delete this poll?")) { await deletePoll(poll.id, cid); refresh(); } }} className="press shrink-0 text-xs text-destructive">✕</button>}
            </div>
            {poll.options.map((opt, i) => {
              const count = poll.votes.filter((v) => v.choice === i).length;
              const pct = total ? Math.round((count / total) * 100) : 0;
              const mine = myChoice === i;
              return (
                <button
                  key={i}
                  disabled={closed}
                  onClick={async () => { if (!closed) { await votePoll(poll.id, cid, i); refresh(); } }}
                  className={`press relative overflow-hidden rounded-xl border px-3 py-2 text-left text-sm disabled:cursor-default ${mine ? "border-primary" : "border-border"}`}
                >
                  <span className="absolute inset-y-0 left-0 bg-primary/10" style={{ width: `${pct}%` }} aria-hidden />
                  <span className="relative flex justify-between">
                    <span>{mine ? "● " : ""}{opt}</span>
                    <span className="text-muted-foreground">{pct}% · {count}</span>
                  </span>
                </button>
              );
            })}
            <p className="text-xs text-muted-foreground">
              {total} vote{total === 1 ? "" : "s"}
              {poll.closes_at && ` · ${closed ? "closed" : "closes"} ${fmt(poll.closes_at)}`}
              {!closed && " · tap to vote or change"}
            </p>
          </div>
        );
      })}
    </section>
  );
}

// Scheduled announcements — write now, auto-publish later (5-min cron).
export function Scheduled({ cid, scheduled }: { cid: string; scheduled: Scheduled[] }) {
  const refresh = useRefresh();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">⏰ Scheduled announcements</h2>
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title"
          className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Details (optional)"
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
            className="min-h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm" />
          <button
            disabled={busy || !title.trim() || !when}
            onClick={async () => { setBusy(true); setErr(await schedulePost(cid, title, body, when)); setTitle(""); setBody(""); setWhen(""); setBusy(false); refresh(); }}
            className="press shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50"
          >
            Schedule
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">Publishes to all members within ~5 minutes of the set time.</p>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>
      {scheduled.map((s) => (
        <div key={s.id} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{s.title}</p>
            <p className="text-xs text-muted-foreground">→ {fmt(s.publish_at)}</p>
          </div>
          <button onClick={async () => { await cancelScheduled(s.id, cid); refresh(); }} className="press shrink-0 text-xs text-destructive">Cancel</button>
        </div>
      ))}
    </section>
  );
}
