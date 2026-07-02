"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";
import UpiPay from "@/components/upi-pay";
import { joinOrder, leaveOrder, setOrderStatus, markPaid, confirmPaid } from "./actions";

export function JoinForm({ orderId, unitPrice }: { orderId: string; unitPrice: number | null }) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState<number>(unitPrice ?? 0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const owed = unitPrice != null ? qty * unitPrice : amount;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <p className="font-semibold">Join this order</p>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Qty</span>
        <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="press h-11 w-11 rounded-full border border-border text-lg">−</button>
        <span className="w-6 text-center font-heading text-lg font-bold">{qty}</span>
        <button type="button" onClick={() => setQty(qty + 1)} className="press h-11 w-11 rounded-full border border-border text-lg">＋</button>
        <span className="ml-auto font-heading font-bold text-primary">₹{owed.toFixed(0)}</span>
      </div>
      {unitPrice == null && (
        <label className="flex flex-col gap-1 text-sm font-medium">
          Your share (₹)
          <input type="number" min={0} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className={inputClass} />
        </label>
      )}
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (flavour, size…)" className={inputClass} />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const e = await joinOrder(orderId, qty, note, owed);
          if (e) setErr(e);
          setBusy(false);
        }}
        className="press min-h-11 rounded-full bg-primary px-5 font-semibold text-on-primary hover:bg-primary-strong disabled:opacity-50"
      >
        {busy ? "Joining…" : "Count me in"}
      </button>
    </div>
  );
}

export function LeaveButton({ orderId }: { orderId: string }) {
  return (
    <button
      onClick={() => { if (confirm("Leave this order?")) leaveOrder(orderId); }}
      className="press rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
    >
      Leave order
    </button>
  );
}

const NEXT: Record<string, { to: "closed" | "collecting" | "completed"; label: string }> = {
  open: { to: "closed", label: "Close joining" },
  closed: { to: "collecting", label: "Start collecting money" },
  collecting: { to: "completed", label: "Mark completed 🎉" },
};

export function OrganizerControls({ orderId, status }: { orderId: string; status: string }) {
  const next = NEXT[status];
  return (
    <div className="flex flex-wrap gap-2">
      {next && (
        <button
          onClick={() => setOrderStatus(orderId, next.to)}
          className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          {next.label}
        </button>
      )}
      {status !== "open" && status !== "completed" && (
        <button
          onClick={() => setOrderStatus(orderId, "open")}
          className="press rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Reopen
        </button>
      )}
    </div>
  );
}

export function PayPanel({
  itemId,
  orderId,
  amount,
  upiId,
  payeeName,
  paidMarked,
  title,
}: {
  itemId: string;
  orderId: string;
  amount: number;
  upiId: string | null;
  payeeName: string;
  paidMarked: boolean;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <p className="text-sm font-semibold">Your share: ₹{amount.toFixed(0)}</p>
      {upiId ? (
        <UpiPay upiId={upiId} payeeName={payeeName} amount={amount} note={title} />
      ) : (
        <p className="text-sm text-muted-foreground">Organizer hasn’t added a UPI ID — pay them directly.</p>
      )}
      {paidMarked ? (
        <p className="text-sm font-medium text-accent">Marked as paid — waiting for organizer to confirm.</p>
      ) : (
        <button
          onClick={() => markPaid(itemId, orderId)}
          className="press min-h-11 rounded-full border border-accent px-5 text-sm font-semibold text-accent hover:bg-accent/10"
        >
          I’ve paid ✓
        </button>
      )}
    </div>
  );
}

export function ConfirmPaidButton({ itemId, orderId, confirmed }: { itemId: string; orderId: string; confirmed: boolean }) {
  return (
    <button
      onClick={() => confirmPaid(itemId, orderId, !confirmed)}
      className={`press rounded-full px-3 py-1 text-xs font-semibold ${
        confirmed ? "bg-accent text-on-accent" : "border border-border text-muted-foreground hover:bg-muted"
      }`}
    >
      {confirmed ? "Confirmed ✓" : "Confirm"}
    </button>
  );
}
