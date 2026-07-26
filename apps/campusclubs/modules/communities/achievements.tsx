"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { useRefresh } from "@suite/lib/use-refresh";
import { addAchievement, deleteAchievement } from "./actions";

type Achievement = { id: string; title: string; detail: string | null; year: string | null };

// Achievements wall — leads add wins/milestones, everyone in the college sees
// them on the community page. Renders nothing for members if the list is empty.
export default function Achievements({
  cid,
  isLead,
  items,
}: {
  cid: string;
  isLead: boolean;
  items: Achievement[];
}) {
  const refresh = useRefresh();
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!isLead && items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Trophy className="h-5 w-5 text-primary" strokeWidth={2} /> Achievements
      </h2>

      {isLead && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
          <div className="flex gap-2">
            <input aria-label="Winner — Smart India Hackathon" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Winner — Smart India Hackathon"
              className="min-h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm" />
            <input aria-label="Year" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year"
              className="min-h-10 w-20 rounded-xl border border-border bg-background px-2 text-sm" />
          </div>
          <input aria-label="One line of detail (optional)" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="One line of detail (optional)"
            className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm" />
          <button
            disabled={busy || !title.trim()}
            onClick={async () => {
              setBusy(true);
              setErr(await addAchievement(cid, title, detail, year));
              setTitle(""); setDetail(""); setYear("");
              setBusy(false);
              refresh();
            }}
            className="press min-h-10 rounded-full bg-primary text-sm font-semibold text-on-primary disabled:opacity-50"
          >
            Add achievement
          </button>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
      )}

      {items.map((a) => (
        <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
          <span className="mt-0.5 text-xl">🏆</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">
              {a.title}
              {a.year && <span className="ml-1.5 text-xs font-normal text-muted-foreground">· {a.year}</span>}
            </p>
            {a.detail && <p className="text-sm text-muted-foreground">{a.detail}</p>}
          </div>
          {isLead && (
            <button onClick={async () => { await deleteAchievement(a.id, cid); refresh(); }} className="press shrink-0 text-xs text-destructive">✕</button>
          )}
        </div>
      ))}
    </section>
  );
}
