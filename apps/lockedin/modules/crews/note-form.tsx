"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { addNote } from "./actions";

// Drop a reminder / to-do into the crew (cleaning, fix the mirror, …).
export default function NoteForm({ crewId }: { crewId: string }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setBody("");
    await addNote(crewId, text);
    setBusy(false);
  }

  return (
    <div className="flex gap-2">
      <input aria-label="Add a reminder — e.g. Clean the room by Sunday"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Add a reminder — e.g. Clean the room by Sunday"
        className="min-h-11 flex-1 rounded-full border border-border bg-card px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      />
      <button
        onClick={submit}
        disabled={busy || !body.trim()}
        className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-40"
        aria-label="Add reminder"
      >
        <Plus className="h-5 w-5" strokeWidth={2.4} />
      </button>
    </div>
  );
}
