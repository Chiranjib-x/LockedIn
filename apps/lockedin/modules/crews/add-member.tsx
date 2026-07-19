"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import ProfileSearch from "@/components/profile-search";
import { useRefresh } from "@/lib/use-refresh";
import { addCrewMember } from "./actions";

// Add a crew member by exact @username (same privacy model as the rest of the
// app — you add people you already know).
export default function AddCrewMember({ crewId, excludeIds }: { crewId: string; excludeIds: string[] }) {
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold hover:bg-muted"
      >
        <UserPlus className="h-4 w-4 text-primary" strokeWidth={2} /> Add someone
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
      <p className="text-sm font-medium">Add by @username</p>
      <ProfileSearch
        excludeIds={excludeIds}
        actionLabel="Add"
        onPick={async (p) => {
          await addCrewMember(crewId, p.id);
          refresh();
        }}
      />
      <button onClick={() => setOpen(false)} className="press text-xs text-muted-foreground">
        Done
      </button>
    </div>
  );
}
