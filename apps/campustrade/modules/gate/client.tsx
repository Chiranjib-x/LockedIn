"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";
import UpiPay from "@/components/upi-pay";
import { useRefresh } from "@suite/lib/use-refresh";
import { claimPickup, unclaimPickup, confirmDelivered, cancelPickup, markDroppedOff, announceGateRun } from "./actions";

export function HeadingToGate({ gate }: { gate: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <span className="flex flex-col gap-1">
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg(await announceGateRun(gate));
          setBusy(false);
        }}
        className="press self-start rounded-full border border-primary/40 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
      >
        🏃 {busy ? "Announcing…" : "I’m heading to the gate"}
      </button>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </span>
  );
}

export function ClaimButton({ id, reward }: { id: string; reward: number }) {
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [upi, setUpi] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-strong"
      >
        I’ll grab it{reward > 0 ? ` · ₹${reward.toFixed(0)}` : ""}
      </button>
    );
  }
  return (
    <div className="animate-scale-in flex w-full flex-col gap-2 rounded-xl border border-border p-3">
      <p className="text-xs text-muted-foreground">
        Your UPI ID so they can send the reward (optional):
      </p>
      <input aria-label="you@upi" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="you@upi" className={inputClass} />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const e = await claimPickup(id, upi.trim());
          if (e) setErr(e);
          setBusy(false);
          if (!e) refresh();
        }}
        className="press min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary disabled:opacity-50"
      >
        {busy ? "Claiming…" : "Confirm — I’m going to the gate"}
      </button>
    </div>
  );
}

export function RunnerActions({ id, droppedOff }: { id: string; droppedOff: boolean }) {
  const refresh = useRefresh();
  if (droppedOff) {
    return (
      <p className="text-xs text-muted-foreground">
        Dropped off ✓ — waiting for them to confirm. They get a nudge if they forget.
      </p>
    );
  }
  return (
    <span className="flex flex-wrap gap-2">
      <button
        onClick={async () => { await markDroppedOff(id); refresh(); }}
        className="press rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary hover:bg-primary-strong"
      >
        Dropped it off ✓
      </button>
      <button
        onClick={async () => { if (confirm("Give this pickup back to the pool?")) { await unclaimPickup(id); refresh(); } }}
        className="press rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
      >
        Can’t make it
      </button>
    </span>
  );
}

export function RequesterActions({
  id,
  status,
  reward,
  runnerUpi,
  runnerName,
  droppedOff = false,
}: {
  id: string;
  status: string;
  reward: number;
  runnerUpi: string | null;
  runnerName: string | null;
  droppedOff?: boolean;
}) {
  const refresh = useRefresh();
  const [payOpen, setPayOpen] = useState(false);

  if (status === "open") {
    return (
      <button
        onClick={async () => { if (confirm("Cancel this request?")) { await cancelPickup(id); refresh(); } }}
        className="press rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
      >
        Cancel
      </button>
    );
  }
  if (status === "claimed") {
    return (
      <span className="flex w-full flex-col gap-1">
        {droppedOff && (
          <p className="text-xs font-medium text-accent">
            {runnerName ?? "The runner"} says it’s been dropped off — all good?
          </p>
        )}
        <button
          onClick={async () => { await confirmDelivered(id); refresh(); }}
          className="press self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent"
        >
          Received it ✓
        </button>
      </span>
    );
  }
  if (status === "delivered" && reward > 0) {
    return (
      <div className="flex w-full flex-col gap-2">
        {!payOpen ? (
          <button
            onClick={() => setPayOpen(true)}
            className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
          >
            Send ₹{reward.toFixed(0)} reward
          </button>
        ) : runnerUpi ? (
          <UpiPay upiId={runnerUpi} payeeName={runnerName ?? "Runner"} amount={reward} note="Gate pickup reward" />
        ) : (
          <p className="text-sm text-muted-foreground">Runner didn’t add a UPI ID — thank them in person.</p>
        )}
      </div>
    );
  }
  return null;
}
