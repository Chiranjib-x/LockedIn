"use client";

import { useState } from "react";
import ProfileSearch from "@/components/profile-search";
import UpiPay from "@/components/upi-pay";
import { useRefresh } from "@/lib/use-refresh";
import { addMember, removeMember, setShare, setPaid, splitEvenly } from "./actions";

export function AddPoolMember({
  subId,
  defaultShare,
  memberIds,
}: {
  subId: string;
  defaultShare: number;
  memberIds: string[];
}) {
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"
      >
        ＋ Add member
      </button>
    );
  }
  return (
    <div className="animate-scale-in flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
      <ProfileSearch
        excludeIds={memberIds}
        onPick={async (p) => {
          const e = await addMember(subId, p.id, defaultShare);
          setErr(e);
          if (!e) refresh();
        }}
      />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button onClick={() => setOpen(false)} className="text-left text-xs text-muted-foreground hover:underline">
        Close
      </button>
    </div>
  );
}

export function MemberRow({
  member,
  subId,
  isOwner,
  isMe,
  upiId,
  ownerName,
  serviceName,
}: {
  member: { id: string; share_amount: number; paid_status: boolean; name: string };
  subId: string;
  isOwner: boolean;
  isMe: boolean;
  upiId: string | null;
  ownerName: string;
  serviceName: string;
}) {
  const refresh = useRefresh();
  const [payOpen, setPayOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          {member.name} {isMe && <span className="text-muted-foreground">(you)</span>}
        </p>
        <button
          onClick={async () => {
            if (!isOwner) return;
            const v = prompt("Share amount (₹)", String(member.share_amount));
            if (v != null && !Number.isNaN(Number(v))) { await setShare(member.id, subId, Number(v)); refresh(); }
          }}
          className={`font-heading text-sm font-bold ${isOwner ? "underline decoration-dotted" : ""}`}
        >
          ₹{Number(member.share_amount).toFixed(0)}
        </button>
        {isOwner ? (
          <>
            <button
              onClick={async () => { await setPaid(member.id, subId, !member.paid_status); refresh(); }}
              className={`press rounded-full px-3 py-1 text-xs font-semibold ${
                member.paid_status ? "bg-accent text-on-accent" : "border border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {member.paid_status ? "Paid ✓" : "Mark paid"}
            </button>
            <button
              onClick={async () => { if (confirm(`Remove ${member.name}?`)) { await removeMember(member.id, subId); refresh(); } }}
              className="press text-xs text-destructive"
              aria-label="Remove member"
            >
              ✕
            </button>
          </>
        ) : member.paid_status ? (
          <span className="text-xs font-semibold text-accent">Paid ✓</span>
        ) : isMe ? (
          <button
            onClick={() => setPayOpen((s) => !s)}
            className="press rounded-full bg-primary px-3 py-1 text-xs font-semibold text-on-primary"
          >
            Pay
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">due</span>
        )}
      </div>
      {payOpen && isMe && upiId && (
        <UpiPay upiId={upiId} payeeName={ownerName} amount={Number(member.share_amount)} note={serviceName} />
      )}
      {payOpen && isMe && !upiId && (
        <p className="text-sm text-muted-foreground">Owner hasn’t added a UPI ID — pay them directly.</p>
      )}
    </div>
  );
}

export function SplitEvenlyButton({ subId }: { subId: string }) {
  const refresh = useRefresh();
  return (
    <button
      onClick={async () => { await splitEvenly(subId); refresh(); }}
      className="press rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
    >
      Split evenly
    </button>
  );
}
