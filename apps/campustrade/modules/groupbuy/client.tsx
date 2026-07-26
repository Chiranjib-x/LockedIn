"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";
import UpiPay from "@/components/upi-pay";
import { useRefresh } from "@/lib/use-refresh";
import { joinOrder, leaveOrder, setOrderStatus, markPaid, confirmPaid, updateLogistics } from "./actions";

export function JoinForm({ orderId, unitPrice }: { orderId: string; unitPrice: number | null }) {
  const refresh = useRefresh();
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
          {/* `amount || ""` blanked the field at a real 0 (zero is falsy). */}
          <input
            type="number"
            min={0}
            value={Number.isFinite(amount) ? amount : ""}
            onChange={(e) => setAmount(Number(e.target.value))}
            className={inputClass}
          />
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
          if (!e) refresh();
        }}
        className="press min-h-11 rounded-full bg-primary px-5 font-semibold text-on-primary hover:bg-primary-strong disabled:opacity-50"
      >
        {busy ? "Joining…" : "Count me in"}
      </button>
    </div>
  );
}

export function LeaveButton({ orderId }: { orderId: string }) {
  const refresh = useRefresh();
  return (
    <button
      onClick={async () => { if (confirm("Leave this order?")) { await leaveOrder(orderId); refresh(); } }}
      className="press rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
    >
      Leave order
    </button>
  );
}

const NEXT: Record<
  string,
  { to: "closed" | "ordered" | "arrived" | "collecting" | "completed"; label: string }
> = {
  open: { to: "closed", label: "Lock joining" },
  closed: { to: "ordered", label: "Order placed 📦" },
  ordered: { to: "arrived", label: "It's arrived 📍" },
  arrived: { to: "collecting", label: "Start collecting money" },
  collecting: { to: "completed", label: "Mark completed 🎉" },
};

export function OrganizerControls({ orderId, status }: { orderId: string; status: string }) {
  const refresh = useRefresh();
  const next = NEXT[status];
  return (
    <div className="flex flex-wrap gap-2">
      {next && (
        <button
          onClick={async () => { await setOrderStatus(orderId, next.to); refresh(); }}
          className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          {next.label}
        </button>
      )}
      {status === "closed" && (
        <button
          onClick={async () => { await setOrderStatus(orderId, "open"); refresh(); }}
          className="press rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Reopen
        </button>
      )}
      {status !== "completed" && status !== "cancelled" && (
        <button
          onClick={async () => { if (confirm("Cancel this order for everyone?")) { await setOrderStatus(orderId, "cancelled"); refresh(); } }}
          className="press rounded-full border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

export function LogisticsForm({
  orderId,
  pickup,
  fee,
  splitMode,
}: {
  orderId: string;
  pickup: string | null;
  fee: number | null;
  splitMode: string;
}) {
  const [open, setOpen] = useState(false);
  const action = updateLogistics.bind(null, orderId);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press self-start rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
      >
        ⚙️ Pickup & fees{pickup != null || fee != null ? " ✓" : ""}
      </button>
    );
  }
  return (
    <form
      action={action}
      onSubmit={() => setOpen(false)}
      className="animate-scale-in flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 text-sm"
    >
      <label className="flex flex-col gap-1 font-medium">
        Pickup location (sent with the “arrived” ping)
        <input name="pickup_location" defaultValue={pickup ?? ""} placeholder="e.g. H-Block 214" className={inputClass} />
      </label>
      <span className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 font-medium">
          Delivery fee (₹)
          <input name="delivery_fee" type="number" min={0} defaultValue={fee ?? ""} className={inputClass} />
        </label>
        <label className="flex flex-1 flex-col gap-1 font-medium">
          Split
          <select name="split_mode" defaultValue={splitMode} className={inputClass}>
            <option value="even">Evenly</option>
            <option value="proportional">By order value</option>
          </select>
        </label>
      </span>
      <button type="submit" className="press min-h-11 self-start rounded-full bg-primary px-5 font-semibold text-on-primary">
        Save
      </button>
    </form>
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
  const refresh = useRefresh();
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
          onClick={async () => { await markPaid(itemId, orderId); refresh(); }}
          className="press min-h-11 rounded-full border border-accent px-5 text-sm font-semibold text-accent hover:bg-accent/10"
        >
          I’ve paid ✓
        </button>
      )}
    </div>
  );
}

export function ConfirmPaidButton({ itemId, orderId, confirmed }: { itemId: string; orderId: string; confirmed: boolean }) {
  const refresh = useRefresh();
  return (
    <button
      onClick={async () => { await confirmPaid(itemId, orderId, !confirmed); refresh(); }}
      className={`press rounded-full px-3 py-1 text-xs font-semibold ${
        confirmed ? "bg-accent text-on-accent" : "border border-border text-muted-foreground hover:bg-muted"
      }`}
    >
      {confirmed ? "Confirmed ✓" : "Confirm"}
    </button>
  );
}
