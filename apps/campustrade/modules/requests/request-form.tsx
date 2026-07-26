"use client";

import { useState } from "react";
import { inputClass } from "@suite/ui";
import { SubmitButton } from "@suite/ui";
import { CATEGORIES } from "@/modules/marketplace/constants";
import { saveRequest } from "./actions";

// Mirrors the listing form's space picker so posting a want feels the same as
// posting an item. No photos, no price — just what you need and an optional budget.
export default function RequestForm({
  error,
  spaces = [],
  defaultSpaceId,
}: {
  error?: string;
  spaces?: { id: string; name: string; emoji: string }[];
  defaultSpaceId?: string;
}) {
  const [spaceId, setSpaceId] = useState(defaultSpaceId ?? "");

  return (
    <form action={saveRequest} className="flex flex-col gap-4">
      <input type="hidden" name="space_id" value={spaceId} />

      {spaces.length > 0 && (
        <div className="flex flex-col gap-1 text-sm font-medium">
          Ask in
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSpaceId("")}
              className={`press flex-1 rounded-2xl border px-3 py-2.5 font-medium ${!spaceId ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}
            >
              🛍️ Marketplace
            </button>
            {spaces.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSpaceId(s.id)}
                className={`press flex-1 rounded-2xl border px-3 py-2.5 font-medium ${spaceId === s.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}
              >
                {s.emoji} {s.name}
              </button>
            ))}
          </div>
          {spaceId && (
            <p className="text-xs font-normal text-muted-foreground">
              Only members of this space will see your request.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium">
        What do you need?
        <input name="title" required placeholder="e.g. Lehenga for a wedding, size M" className={inputClass} />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Category
          <select name="category" required defaultValue="" className={inputClass}>
            <option value="" disabled>Pick one</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Budget (₹, optional)
          <input name="budget" type="number" min={0} step="1" placeholder="Max you'd pay" className={inputClass} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Details
        <textarea name="description" rows={4} placeholder="Colour, size, when you need it by, rent or buy…" className={inputClass} />
      </label>

      <SubmitButton pendingLabel="Posting…">Post request</SubmitButton>
    </form>
  );
}
