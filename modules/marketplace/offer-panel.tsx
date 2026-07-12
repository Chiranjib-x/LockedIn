"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Hourglass } from "lucide-react";
import { inputClass } from "@/components/ui";
import { makeOffer, decideOffer } from "./offer-actions";

function StatusChip({ kind }: { kind: "waiting" | "countered" }) {
  return kind === "waiting" ? (
    <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-tint-amber px-2 py-0.5 text-xs font-semibold text-tint-amber-fg">
      <Hourglass className="h-3 w-3" strokeWidth={2.4} /> Waiting
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-tint-violet px-2 py-0.5 text-xs font-semibold text-tint-violet-fg">
      <ArrowLeftRight className="h-3 w-3" strokeWidth={2.4} /> Countered
    </span>
  );
}

export type OfferRow = {
  id: string;
  buyer_id: string;
  amount: number;
  counter_amount: number | null;
  status: string;
  buyer_name: string;
};

// Buyer side: make/track an offer. Seller side: accept / counter / decline.
export function BuyerOffer({ listingId, mine }: { listingId: string; mine: OfferRow | null }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (mine?.status === "pending") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3 text-sm">
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusChip kind="waiting" />
          Your offer: <span className="font-semibold">₹{Number(mine.amount).toFixed(0)}</span>
        </span>
        <button
          disabled={busy}
          onClick={async () => { setBusy(true); await decideOffer(mine.id, "decline"); router.refresh(); setBusy(false); }}
          className="press rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
        >
          Withdraw
        </button>
      </div>
    );
  }
  if (mine?.status === "countered") {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-primary/40 bg-primary/5 p-3 text-sm">
        <p className="flex flex-wrap items-center gap-1.5">
          <StatusChip kind="countered" />
          Seller countered: <span className="font-semibold">₹{Number(mine.counter_amount).toFixed(0)}</span>{" "}
          <span className="text-muted-foreground">(you offered ₹{Number(mine.amount).toFixed(0)})</span>
        </p>
        <span className="flex gap-2">
          <button
            disabled={busy}
            onClick={async () => { setBusy(true); await decideOffer(mine.id, "accept"); router.refresh(); setBusy(false); }}
            className="press min-h-11 rounded-full bg-accent px-4 text-sm font-semibold text-on-accent"
          >
            Accept ₹{Number(mine.counter_amount).toFixed(0)}
          </button>
          <button
            disabled={busy}
            onClick={async () => { setBusy(true); await decideOffer(mine.id, "decline"); router.refresh(); setBusy(false); }}
            className="press min-h-11 rounded-full border border-border px-4 text-sm text-muted-foreground"
          >
            Pass
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
      <p className="text-sm font-medium">Make an offer</p>
      <span className="flex gap-2">
        <input
          type="number" min={1} value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="₹ your price"
          className={`${inputClass} flex-1`}
        />
        <button
          disabled={busy || amount === ""}
          onClick={async () => {
            setBusy(true);
            const e = await makeOffer(listingId, Number(amount));
            setErr(e);
            if (e == null) router.refresh();
            setBusy(false);
          }}
          className="press min-h-11 shrink-0 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary disabled:opacity-50"
        >
          {busy ? "Sending…" : "Offer"}
        </button>
      </span>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}

export function SellerOffers({ offers }: { offers: OfferRow[] }) {
  const router = useRouter();
  const [counterFor, setCounterFor] = useState<string | null>(null);
  const [counter, setCounter] = useState("");
  const [busy, setBusy] = useState(false);
  const active = offers.filter((o) => o.status === "pending" || o.status === "countered");
  if (active.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3">
      <h2 className="text-sm font-semibold">Offers</h2>
      {active.map((o) => (
        <div key={o.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-sm">
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium">{o.buyer_name}</span> offers{" "}
            <span className="font-semibold">₹{Number(o.amount).toFixed(0)}</span>
            {o.status === "countered" && (
              <>
                <StatusChip kind="countered" />
                <span className="text-muted-foreground">₹{Number(o.counter_amount).toFixed(0)}</span>
              </>
            )}
          </p>
          {o.status === "pending" &&
            (counterFor === o.id ? (
              <span className="flex gap-2">
                <input
                  type="number" min={1} value={counter}
                  onChange={(e) => setCounter(e.target.value)}
                  placeholder="₹ counter"
                  className={`${inputClass} flex-1`}
                />
                <button
                  disabled={busy || counter === ""}
                  onClick={async () => {
                    setBusy(true);
                    await decideOffer(o.id, "counter", Number(counter));
                    router.refresh();
                    setBusy(false);
                    setCounterFor(null);
                  }}
                  className="press min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50"
                >
                  Send
                </button>
              </span>
            ) : (
              <span className="flex flex-wrap gap-2">
                <button
                  disabled={busy}
                  onClick={async () => { setBusy(true); await decideOffer(o.id, "accept"); router.refresh(); setBusy(false); }}
                  className="press min-h-11 rounded-full bg-accent px-4 text-sm font-semibold text-on-accent"
                >
                  Accept — sold at ₹{Number(o.amount).toFixed(0)}
                </button>
                <button
                  onClick={() => setCounterFor(o.id)}
                  className="press min-h-11 rounded-full border border-primary/40 px-4 text-sm font-medium text-primary"
                >
                  Counter
                </button>
                <button
                  disabled={busy}
                  onClick={async () => { setBusy(true); await decideOffer(o.id, "decline"); router.refresh(); setBusy(false); }}
                  className="press min-h-11 rounded-full border border-border px-4 text-sm text-muted-foreground"
                >
                  Decline
                </button>
              </span>
            ))}
        </div>
      ))}
    </section>
  );
}
