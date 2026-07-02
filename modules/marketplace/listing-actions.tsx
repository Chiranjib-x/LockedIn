"use client";

import Link from "next/link";
import { setSold, deleteListing } from "./actions";

// Small client wrapper so we can confirm destructive delete before firing the
// server action. Sold toggle needs no confirm.
export default function ListingActions({ id, sold }: { id: string; sold: boolean }) {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <button
        onClick={() => setSold(id, !sold)}
        className="press rounded-full border border-border px-3 py-1.5 font-medium hover:bg-muted"
      >
        {sold ? "Mark available" : "Mark sold"}
      </button>
      <Link
        href={`/marketplace/${id}/edit`}
        className="press rounded-full border border-border px-3 py-1.5 font-medium hover:bg-muted"
      >
        Edit
      </Link>
      <button
        onClick={() => {
          if (confirm("Delete this listing? This can't be undone.")) deleteListing(id);
        }}
        className="press rounded-full border border-destructive/40 px-3 py-1.5 font-medium text-destructive hover:bg-destructive/10"
      >
        Delete
      </button>
    </div>
  );
}
