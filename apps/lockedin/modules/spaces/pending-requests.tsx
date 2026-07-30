"use client";

import { useState } from "react";
import { useRefresh } from "@suite/lib/use-refresh";
import { decideJoin } from "./join-actions";

export type PendingRequest = {
  id: string;
  space_name: string;
  name: string | null;
  username: string | null;
  note: string | null;
  created_at: string;
};

// The founder's queue. Approving inserts the membership and notifies the student;
// declining also notifies them, plainly and without a reason, rather than leaving
// them wondering forever.
export default function PendingRequests({ requests }: { requests: PendingRequest[] }) {
  const refresh = useRefresh();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No one is waiting. Requests from students appear here.
      </p>
    );
  }

  const decide = async (id: string, approve: boolean) => {
    setBusy(id);
    setMsg(null);
    const err = await decideJoin(id, approve);
    setBusy(null);
    if (err) setMsg(err);
    else refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      {requests.map((r) => (
        <div key={r.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {r.name ?? "Student"}
              {r.username && (
                <span className="ml-1 font-normal text-muted-foreground">@{r.username}</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              wants to join <span className="font-medium text-foreground">{r.space_name}</span>
            </p>
            {r.note && <p className="mt-1 text-xs italic text-muted-foreground">“{r.note}”</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy === r.id}
              onClick={() => decide(r.id, true)}
              className="press min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50"
            >
              {busy === r.id ? "…" : "Approve"}
            </button>
            <button
              type="button"
              disabled={busy === r.id}
              onClick={() => decide(r.id, false)}
              className="press min-h-11 rounded-full border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
      {msg && <p className="text-sm text-destructive">{msg}</p>}
    </div>
  );
}
