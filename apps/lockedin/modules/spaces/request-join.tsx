"use client";

import { useState } from "react";
import { useRefresh } from "@suite/lib/use-refresh";
import { requestJoin } from "./join-actions";

export type JoinableSpace = {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  i_am_member: boolean;
  request_status: string | null;
};

// Ask to join a circle.
//
// Both circles are always offered to everyone. Nothing here reads gender, and
// nothing auto-decides: a moderator approves. That is the point — a student who
// does not fit a two-way split can ask for the one they belong in and have a
// person say yes, instead of being sorted by a field.
export default function RequestJoin({ spaces }: { spaces: JoinableSpace[] }) {
  const refresh = useRefresh();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const joinable = spaces.filter((s) => !s.i_am_member);
  if (joinable.length === 0) return null;

  const ask = async (s: JoinableSpace) => {
    setBusy(s.id);
    setMsg(null);
    const err = await requestJoin(s.id);
    setBusy(null);
    if (err) setMsg(err);
    else {
      setMsg(`Asked to join ${s.name}. You'll get a notification either way.`);
      refresh();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {joinable.map((s) => {
        const pending = s.request_status === "pending";
        return (
          <div key={s.id} className="flex items-center gap-3">
            <span className="text-lg">{s.emoji}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
            <button
              type="button"
              disabled={pending || busy === s.id}
              onClick={() => ask(s)}
              className="press min-h-11 shrink-0 rounded-full border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary disabled:opacity-60"
            >
              {pending ? "Asked ✓" : busy === s.id ? "…" : "Ask to join"}
            </button>
          </div>
        );
      })}
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      <p className="text-xs text-muted-foreground">
        Ask for whichever one is yours — a real person reads every request, and nothing is
        decided by what&rsquo;s on your profile.
      </p>
    </div>
  );
}
