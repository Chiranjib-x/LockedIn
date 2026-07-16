"use client";

import { useState } from "react";
import { useRefresh } from "@/lib/use-refresh";
import { setMemberPosition } from "./actions";

const PRESETS = ["President", "Vice President", "Management Head", "Events Head", "Tech Head", "Design Head", "PR Head", "Treasurer"];

// Moderator control to tag a member's official club position. Presets for the
// common ones + free text; blank clears it.
export default function PositionEditor({ cid, uid, current }: { cid: string; uid: string; current: string | null }) {
  const refresh = useRefresh();
  const [value, setValue] = useState(current ?? "");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(v: string) {
    setBusy(true);
    await setMemberPosition(cid, uid, v);
    setBusy(false);
    setOpen(false);
    refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
      >
        {current ? `✎ ${current}` : "＋ Position"}
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-xl border border-border bg-muted/40 p-2">
      <div className="flex gap-1.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Events Head"
          className="min-h-9 flex-1 rounded-full border border-border bg-card px-3 text-sm"
        />
        <button type="button" disabled={busy} onClick={() => save(value)} className="press shrink-0 rounded-full bg-primary px-3 text-sm font-semibold text-on-primary disabled:opacity-50">
          Save
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => save(p)} className="press rounded-full bg-card px-2 py-0.5 text-[11px] hover:bg-muted">
            {p}
          </button>
        ))}
        {current && (
          <button type="button" onClick={() => save("")} className="press rounded-full px-2 py-0.5 text-[11px] text-destructive">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
