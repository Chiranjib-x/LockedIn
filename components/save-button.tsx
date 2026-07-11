"use client";

import { useState } from "react";
import { toggleSave } from "@/modules/saves/actions";

// Bookmark toggle for detail pages; optimistic flip, server stamps tenancy.
export default function SaveButton({
  targetType,
  targetId,
  initialSaved,
}: {
  targetType: "listing" | "post" | "group_order";
  targetId: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  return (
    <button
      aria-label={saved ? "Remove from saved" : "Save for later"}
      onClick={async () => {
        setSaved(!saved);
        await toggleSave(targetType, targetId, saved);
      }}
      className="press flex min-h-11 min-w-11 items-center justify-center text-lg"
    >
      {saved ? "🔖" : "📑"}
    </button>
  );
}
