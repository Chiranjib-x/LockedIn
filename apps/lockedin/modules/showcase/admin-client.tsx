"use client";

import { useState } from "react";
import {
  toggleShowcaseItem,
  deleteShowcaseItem,
  toggleMerchant,
  deleteMerchant,
} from "./actions";

function AdminRow({
  isActive,
  onToggle,
  onDelete,
}: {
  isActive: boolean;
  onToggle: (next: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex shrink-0 gap-2">
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onToggle(!isActive);
          setBusy(false);
        }}
        className="press rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold disabled:opacity-50"
      >
        {isActive ? "Deactivate" : "Activate"}
      </button>
      <button
        disabled={busy}
        onClick={async () => {
          if (!confirm("Delete permanently?")) return;
          setBusy(true);
          await onDelete();
        }}
        className="press rounded-full border border-destructive/40 px-3 py-1 text-xs font-semibold text-destructive disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}

export function ShowcaseAdminRow({ id, isActive }: { id: string; isActive: boolean }) {
  return (
    <AdminRow
      isActive={isActive}
      onToggle={(next) => toggleShowcaseItem(id, next)}
      onDelete={() => deleteShowcaseItem(id)}
    />
  );
}

export function MerchantAdminRow({ id, isActive }: { id: string; isActive: boolean }) {
  return (
    <AdminRow
      isActive={isActive}
      onToggle={(next) => toggleMerchant(id, next)}
      onDelete={() => deleteMerchant(id)}
    />
  );
}
