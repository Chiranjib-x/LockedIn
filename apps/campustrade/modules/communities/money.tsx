"use client";

import { useState } from "react";
import UpiPay from "@/components/upi-pay";
import { useRefresh } from "@/lib/use-refresh";
import { createCollection, setDuePaid, deleteCollection } from "./actions";

type Member = { user_id: string; name: string };
type Due = { id: string; user_id: string; amount: number; paid: boolean };
type Collection = {
  id: string;
  title: string;
  kind: string;
  amount: number;
  upi_id: string | null;
  dues: Due[];
};

// Dues + fund split — a "who owes / who paid" ledger. Payment is the existing
// UPI copy-pay helper; leads tick people paid (LockedIn holds no money).
export default function Money({
  cid,
  isLead,
  meId,
  collections,
  members,
}: {
  cid: string;
  isLead: boolean;
  meId: string;
  collections: Collection[];
  members: Member[];
}) {
  const refresh = useRefresh();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"dues" | "fund">("dues");
  const [amount, setAmount] = useState("");
  const [upi, setUpi] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const nameOf = (id: string) => members.find((m) => m.user_id === id)?.name ?? "Member";

  if (!isLead && collections.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">💸 Dues & funds</h2>

      {isLead && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Term dues / Fest fund"
            className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm" />
          <div className="flex gap-2">
            <select value={kind} onChange={(e) => setKind(e.target.value as "dues" | "fund")}
              className="min-h-10 rounded-xl border border-border bg-background px-2 text-sm">
              <option value="dues">Dues (each pays the amount)</option>
              <option value="fund">Fund (split across members)</option>
            </select>
            <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder={kind === "fund" ? "Total ₹" : "₹ each"}
              className="min-h-10 w-24 rounded-xl border border-border bg-background px-3 text-sm" />
          </div>
          <input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="Collector's UPI ID (e.g. you@upi)"
            className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm" />
          <button
            disabled={busy || !title.trim() || !(Number(amount) > 0)}
            onClick={async () => {
              setBusy(true);
              setErr(await createCollection(cid, title, kind, Number(amount), upi)); refresh();
              setTitle(""); setAmount(""); setUpi("");
              setBusy(false);
            }}
            className="press min-h-10 rounded-full bg-primary text-sm font-semibold text-on-primary disabled:opacity-50"
          >
            Create — bill every member
          </button>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
      )}

      {collections.map((coll) => {
        const paidCount = coll.dues.filter((d) => d.paid).length;
        const myDue = coll.dues.find((d) => d.user_id === meId);
        return (
          <div key={coll.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{coll.title}</p>
                <p className="text-xs text-muted-foreground">
                  ₹{Number(coll.amount).toFixed(0)} {coll.kind === "fund" ? "each (split)" : "each"} · {paidCount}/{coll.dues.length} paid
                </p>
              </div>
              {isLead && (
                <button onClick={async () => { if (confirm("Delete this collection?")) { await deleteCollection(coll.id, cid); refresh(); } }}
                  className="press shrink-0 text-xs text-destructive">✕</button>
              )}
            </div>

            {/* Member's own pay button */}
            {myDue && !myDue.paid && coll.upi_id && (
              <UpiPay upiId={coll.upi_id} payeeName={coll.title} amount={Number(myDue.amount)} note={coll.title} />
            )}
            {myDue?.paid && <p className="text-xs font-medium text-accent">You&rsquo;re marked paid ✓</p>}

            {/* Lead's paid/unpaid grid */}
            {isLead && (
              <div className="flex flex-col gap-1">
                {coll.dues.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-1.5 text-sm">
                    <span className="truncate">{nameOf(d.user_id)}</span>
                    <button
                      onClick={async () => { await setDuePaid(d.id, cid, !d.paid); refresh(); }}
                      className={`press shrink-0 rounded-full px-3 py-0.5 text-xs font-semibold ${d.paid ? "bg-accent/15 text-accent" : "border border-border"}`}
                    >
                      {d.paid ? "Paid ✓" : "Mark paid"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
