"use client";

import Link from "next/link";
import { useState } from "react";
import { setSold, deleteListing, lendTo, markReturned } from "./actions";
import { markSoldTo } from "@/modules/ratings/actions";
import ProfileSearch from "@/components/profile-search";
import { useRefresh } from "@suite/lib/use-refresh";

// My-Listings row actions. Sell listings: "Mark sold" -> buyer picker ->
// transaction (mutual rating). Rent listings (Phase 32): lend-to picker with
// a due date; "Mark returned" completes the transaction and relists.
export default function ListingActions({
  id,
  sold,
  listingType = "sell",
  lentOut = false,
}: {
  id: string;
  sold: boolean;
  listingType?: "sell" | "rent";
  lentOut?: boolean;
}) {
  const refresh = useRefresh();
  const [picking, setPicking] = useState(false);
  const [due, setDue] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (listingType === "rent") {
    if (lentOut) {
      return (
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            onClick={async () => { const e = await markReturned(id); if (e) setErr(e); else refresh(); }}
            className="press rounded-full bg-accent px-3 py-1.5 font-medium text-on-accent"
          >
            Mark returned ✓
          </button>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2 text-sm">
        {picking ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Due back
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="min-h-11 rounded-xl border border-border bg-card px-3"
              />
            </label>
            <p className="text-xs font-medium text-muted-foreground">Who’s borrowing it?</p>
            <ProfileSearch
              actionLabel="Lend to them"
              onPick={async (p) => {
                if (!due) { setErr("Pick a due date first."); return; }
                const e = await lendTo(id, p.id, due);
                if (e) setErr(e);
                else { setPicking(false); refresh(); }
              }}
            />
            {err && <p className="text-xs text-destructive">{err}</p>}
            <button onClick={() => setPicking(false)} className="text-left text-xs text-muted-foreground hover:underline">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setPicking(true)} className="press rounded-full bg-primary px-3 py-1.5 font-medium text-on-primary">
              Lend it out
            </button>
            <Link href={`/marketplace/${id}/edit`} className="press rounded-full border border-border px-3 py-1.5 font-medium hover:bg-muted">
              Edit
            </Link>
            <DeleteBtn id={id} />
          </div>
        )}
      </div>
    );
  }

  if (sold) {
    return (
      <div className="flex flex-wrap gap-2 text-sm">
        <button onClick={async () => { await setSold(id, false); refresh(); }} className="press rounded-full border border-border px-3 py-1.5 font-medium hover:bg-muted">
          Mark available
        </button>
        <DeleteBtn id={id} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      {picking ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">Who bought it? (they’ll be asked to rate you)</p>
          <ProfileSearch
            actionLabel="Sold to them"
            onPick={async (p) => {
              const e = await markSoldTo(id, p.id);
              if (e) setErr(e);
              else { setPicking(false); refresh(); }
            }}
          />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button onClick={() => setPicking(false)} className="text-left text-xs text-muted-foreground hover:underline">
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPicking(true)}
            className="press rounded-full bg-accent px-3 py-1.5 font-medium text-on-accent"
          >
            Mark sold
          </button>
          <button onClick={async () => { await setSold(id, true); refresh(); }} className="press rounded-full border border-border px-3 py-1.5 font-medium hover:bg-muted">
            Just mark sold
          </button>
          <Link href={`/marketplace/${id}/edit`} className="press rounded-full border border-border px-3 py-1.5 font-medium hover:bg-muted">
            Edit
          </Link>
          <DeleteBtn id={id} />
        </div>
      )}
    </div>
  );
}

function DeleteBtn({ id }: { id: string }) {
  const refresh = useRefresh();
  return (
    <button
      onClick={async () => {
        if (confirm("Delete this listing? This can’t be undone.")) { await deleteListing(id); refresh(); }
      }}
      className="press rounded-full border border-destructive/40 px-3 py-1.5 font-medium text-destructive hover:bg-destructive/10"
    >
      Delete
    </button>
  );
}
