"use client";

import Link from "next/link";
import { useState } from "react";
import { setSold, deleteListing } from "./actions";
import { markSoldTo } from "@/modules/ratings/actions";
import ProfileSearch from "@/components/profile-search";

// My-Listings row actions. "Mark sold" opens a same-college buyer picker so the
// sale records a transaction (→ mutual rating). "Just mark sold" stays for the
// no-specific-buyer case.
export default function ListingActions({ id, sold }: { id: string; sold: boolean }) {
  const [picking, setPicking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (sold) {
    return (
      <div className="flex flex-wrap gap-2 text-sm">
        <button onClick={() => setSold(id, false)} className="press rounded-full border border-border px-3 py-1.5 font-medium hover:bg-muted">
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
              else setPicking(false);
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
          <button onClick={() => setSold(id, true)} className="press rounded-full border border-border px-3 py-1.5 font-medium hover:bg-muted">
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
  return (
    <button
      onClick={() => {
        if (confirm("Delete this listing? This can’t be undone.")) deleteListing(id);
      }}
      className="press rounded-full border border-destructive/40 px-3 py-1.5 font-medium text-destructive hover:bg-destructive/10"
    >
      Delete
    </button>
  );
}
