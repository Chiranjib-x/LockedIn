"use client";

import { useState } from "react";
import { useRefresh } from "@/lib/use-refresh";
import { joinCommunity, leaveCommunity, approveCommunity, rejectCommunity, expressInterest, withdrawInterest, setRecruiting, setMemberRole, removeMember } from "./actions";

// Lead-only member management: promote/demote co-leads, remove members.
// The RPCs guard the last lead server-side; errors surface inline.
export function RoleControls({ cid, uid, role, isSelf }: { cid: string; uid: string; role: string; isSelf: boolean }) {
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isLead = role === "moderator";
  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setErr(await fn());
    setBusy(false);
    refresh();
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        disabled={busy}
        onClick={() => run(() => setMemberRole(cid, uid, isLead ? "member" : "moderator"))}
        className="press min-h-9 rounded-full border border-border px-3 text-xs font-medium hover:bg-muted disabled:opacity-50"
      >
        {isLead ? "Demote to member" : "Make lead"}
      </button>
      {!isSelf && (
        <button
          disabled={busy}
          onClick={() => { if (confirm("Remove them from this group?")) run(() => removeMember(cid, uid)); }}
          className="press min-h-9 rounded-full border border-destructive/40 px-3 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          Remove
        </button>
      )}
      {err && <span className="text-xs text-destructive">{err}</span>}
    </div>
  );
}

// Moderator toggle: flag the club as actively recruiting (surfaces it in the
// communities list + search). Great for Quanta week.
export function RecruitingToggle({ id, recruiting }: { id: string; recruiting: boolean }) {
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const [on, setOn] = useState(recruiting);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await setRecruiting(id, !on);
        setOn(!on);
        setBusy(false);
        refresh();
      }}
      className={`press flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold disabled:opacity-50 ${
        on ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-card hover:bg-muted"
      }`}
    >
      {on ? "🟢 Recruiting — tap to stop" : "Start recruiting"}
    </button>
  );
}

// Soft "I'm interested" lead — the booth CTA (no phone numbers). Distinct from
// joining; the club gets a list of interested students to follow up in-app.
export function InterestButton({ id, interested }: { id: string; interested: boolean }) {
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const [on, setOn] = useState(interested);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await (on ? withdrawInterest(id) : expressInterest(id));
        setOn(!on);
        setBusy(false);
        refresh();
      }}
      className={`press rounded-full border px-4 py-2 text-sm font-medium disabled:opacity-50 ${
        on ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-card hover:bg-muted"
      }`}
    >
      {busy ? "…" : on ? "Interested ✓" : "I’m interested"}
    </button>
  );
}

export function JoinLeaveButton({ id, joined }: { id: string; joined: boolean }) {
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await (joined ? leaveCommunity(id) : joinCommunity(id));
        setBusy(false);
        refresh();
      }}
      className={`press rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50 ${
        joined ? "border border-border bg-card text-muted-foreground hover:bg-muted" : "bg-primary text-on-primary hover:bg-primary-strong"
      }`}
    >
      {busy ? "…" : joined ? "Leave" : "Join"}
    </button>
  );
}

export function ApproveButtons({ id, claimsOfficial }: { id: string; claimsOfficial: boolean }) {
  const refresh = useRefresh();
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={async () => { await approveCommunity(id, true); refresh(); }}
        className="press rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-on-primary"
      >
        Approve as ✔ Official
      </button>
      <button
        onClick={async () => { await approveCommunity(id, false); refresh(); }}
        className="press rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-on-accent"
      >
        Approve{claimsOfficial ? " (strip official)" : " ✓"}
      </button>
      <button
        onClick={async () => { if (confirm("Reject this proposal?")) { await rejectCommunity(id); refresh(); } }}
        className="press rounded-full border border-destructive/40 px-4 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
      >
        Reject
      </button>
    </div>
  );
}
