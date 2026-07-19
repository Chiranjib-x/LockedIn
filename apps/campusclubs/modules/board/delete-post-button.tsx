"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deletePost } from "./actions";

export default function DeletePostButton({ id, label = "Delete post" }: { id: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={() => {
        if (confirm("Delete this permanently? This can’t be undone.")) {
          setBusy(true);
          deletePost(id);
        }
      }}
      className="press flex min-h-11 items-center justify-center gap-2 rounded-full border border-destructive/40 px-5 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" strokeWidth={2} /> {busy ? "Deleting…" : label}
    </button>
  );
}
