"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { useRefresh } from "@/lib/use-refresh";
import { saveBuilding, deleteBuilding } from "./actions";

const CATEGORIES = ["academic", "hostel", "mess", "sports", "admin", "landmark"] as const;

export type Building = {
  id: string;
  name: string;
  aka: string | null;
  category: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  near_landmark: string | null;
};

export function BuildingForm({ building }: { building?: Building }) {
  return (
    <form action={saveBuilding} className="flex flex-col gap-3">
      {building && <input type="hidden" name="id" value={building.id} />}
      <input name="name" required defaultValue={building?.name ?? ""} placeholder="Building name" className={inputClass} />
      <input name="aka" defaultValue={building?.aka ?? ""} placeholder="AKA / nickname (optional)" className={inputClass} />
      <select name="category" defaultValue={building?.category ?? "academic"} className={inputClass}>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <textarea name="description" rows={2} defaultValue={building?.description ?? ""} placeholder="What happens here" className={inputClass} />
      <div className="flex gap-2">
        <input name="lat" defaultValue={building?.lat ?? ""} inputMode="decimal" placeholder="Latitude" className={inputClass} />
        <input name="lng" defaultValue={building?.lng ?? ""} inputMode="decimal" placeholder="Longitude" className={inputClass} />
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: in Google Maps, right-click the exact spot → click the “lat, lng” at the top to copy it.
      </p>
      <input name="near_landmark" defaultValue={building?.near_landmark ?? ""} placeholder="Near… (optional)" className={inputClass} />
      <SubmitButton pendingLabel="Saving…">{building ? "Save changes" : "Add building"}</SubmitButton>
    </form>
  );
}

export function BuildingRow({ building }: { building: Building }) {
  const refresh = useRefresh();
  const [editing, setEditing] = useState(false);
  const hasPin = building.lat != null && building.lng != null;
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {building.name} <span className="text-xs font-normal text-muted-foreground">· {building.category}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {hasPin ? `${building.lat!.toFixed(5)}, ${building.lng!.toFixed(5)}` : "⚠ no coordinates"}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setEditing((e) => !e)}
            className="press rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
          >
            {editing ? "Close" : "Edit"}
          </button>
          <button
            onClick={async () => {
              if (confirm(`Delete “${building.name}” from the campus map?`)) {
                await deleteBuilding(building.id);
                refresh();
              }
            }}
            className="press rounded-full border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
          >
            Delete
          </button>
        </div>
      </div>
      {editing && (
        <div className="border-t border-border pt-3">
          <BuildingForm building={building} />
        </div>
      )}
    </div>
  );
}
