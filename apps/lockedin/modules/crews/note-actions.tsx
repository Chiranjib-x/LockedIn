"use client";

import { useState } from "react";
import { Check, RotateCcw, Trash2 } from "lucide-react";
import { useRefresh } from "@/lib/use-refresh";
import { setNoteStatus, deleteNote } from "./actions";

// Resolve / reopen a crew note (any member), plus delete for the author.
export default function NoteActions({
  noteId,
  crewId,
  resolved,
  canDelete,
}: {
  noteId: string;
  crewId: string;
  resolved: boolean;
  canDelete: boolean;
}) {
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await setNoteStatus(noteId, crewId, !resolved);
          setBusy(false);
          refresh();
        }}
        className={`press flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-semibold disabled:opacity-50 ${
          resolved
            ? "border-border text-muted-foreground hover:bg-muted"
            : "border-accent/40 bg-accent/10 text-accent"
        }`}
      >
        {resolved ? (
          <>
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} /> Reopen
          </>
        ) : (
          <>
            <Check className="h-3.5 w-3.5" strokeWidth={2.6} /> Resolve
          </>
        )}
      </button>
      {canDelete && (
        <button
          disabled={busy}
          onClick={async () => {
            if (!confirm("Delete this reminder?")) return;
            setBusy(true);
            await deleteNote(noteId, crewId);
            refresh();
          }}
          className="press flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
