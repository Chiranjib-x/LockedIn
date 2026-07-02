"use client";

import { useState } from "react";
import { joinCommunity, leaveCommunity, approveCommunity, rejectCommunity } from "./actions";

export function JoinLeaveButton({ id, joined }: { id: string; joined: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await (joined ? leaveCommunity(id) : joinCommunity(id));
        setBusy(false);
      }}
      className={`press rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50 ${
        joined ? "border border-border bg-card text-muted-foreground hover:bg-muted" : "bg-primary text-on-primary hover:bg-primary-strong"
      }`}
    >
      {busy ? "…" : joined ? "Leave" : "Join"}
    </button>
  );
}

export function ApproveButtons({ id }: { id: string }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => approveCommunity(id)}
        className="press rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-on-accent"
      >
        Approve ✓
      </button>
      <button
        onClick={() => { if (confirm("Reject this proposal?")) rejectCommunity(id); }}
        className="press rounded-full border border-destructive/40 px-4 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
      >
        Reject
      </button>
    </div>
  );
}
