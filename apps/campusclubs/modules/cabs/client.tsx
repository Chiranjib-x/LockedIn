"use client";

import { useState } from "react";
import UpiPay from "@/components/upi-pay";
import { useRefresh } from "@suite/lib/use-refresh";
import { joinTrip, leaveTrip, cancelTrip, completeTrip, markTripPaid, confirmTripPaid } from "./actions";

export function JoinLeaveButton({ tripId, joined, full }: { tripId: string; joined: boolean; full: boolean }) {
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!joined && full) {
    return <span className="rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">Full</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          if (joined) {
            if (!confirm("Leave this trip?")) { setBusy(false); return; }
            await leaveTrip(tripId);
          } else {
            const e = await joinTrip(tripId);
            if (e) setErr(e);
          }
          setBusy(false);
          refresh();
        }}
        className={`press rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50 ${
          joined ? "border border-border bg-card text-muted-foreground hover:bg-muted" : "bg-primary text-on-primary hover:bg-primary-strong"
        }`}
      >
        {busy ? "…" : joined ? "Leave" : "Join trip"}
      </button>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}

const NEXT: Record<string, { to: "completed"; label: string }> = {
  open: { to: "completed", label: "Mark completed 🎉" },
  full: { to: "completed", label: "Mark completed 🎉" },
};

export function CreatorControls({ tripId, status }: { tripId: string; status: string }) {
  const refresh = useRefresh();
  const next = NEXT[status];
  return (
    <div className="flex flex-wrap gap-2">
      {next && (
        <button
          onClick={async () => { await completeTrip(tripId); refresh(); }}
          className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          {next.label}
        </button>
      )}
      {(status === "open" || status === "full") && (
        <button
          onClick={async () => { if (confirm("Cancel this trip?")) { await cancelTrip(tripId); refresh(); } }}
          className="press rounded-full border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          Cancel trip
        </button>
      )}
    </div>
  );
}

export function PayPanel({
  memberId,
  tripId,
  amount,
  upiId,
  payeeName,
  paidMarked,
  route,
}: {
  memberId: string;
  tripId: string;
  amount: number;
  upiId: string | null;
  payeeName: string;
  paidMarked: boolean;
  route: string;
}) {
  const refresh = useRefresh();
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <p className="text-sm font-semibold">Your share: ₹{amount.toFixed(0)}</p>
      {upiId ? (
        <UpiPay upiId={upiId} payeeName={payeeName} amount={amount} note={route} />
      ) : (
        <p className="text-sm text-muted-foreground">Trip creator hasn’t added a UPI ID — pay them directly.</p>
      )}
      {paidMarked ? (
        <p className="text-sm font-medium text-accent">Marked as paid — waiting for the creator to confirm.</p>
      ) : (
        <button
          onClick={async () => { await markTripPaid(memberId, tripId); refresh(); }}
          className="press min-h-11 rounded-full border border-accent px-5 text-sm font-semibold text-accent hover:bg-accent/10"
        >
          I’ve paid ✓
        </button>
      )}
    </div>
  );
}

export function ConfirmPaidButton({ memberId, tripId, confirmed }: { memberId: string; tripId: string; confirmed: boolean }) {
  const refresh = useRefresh();
  return (
    <button
      onClick={async () => { await confirmTripPaid(memberId, tripId, !confirmed); refresh(); }}
      className={`press rounded-full px-3 py-1 text-xs font-semibold ${
        confirmed ? "bg-accent text-on-accent" : "border border-border text-muted-foreground hover:bg-muted"
      }`}
    >
      {confirmed ? "Confirmed ✓" : "Confirm"}
    </button>
  );
}
