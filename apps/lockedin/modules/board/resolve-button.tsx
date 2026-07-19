"use client";

import { useRefresh } from "@/lib/use-refresh";
import { resolvePost } from "./actions";

export default function ResolveButton({ id, resolved }: { id: string; resolved: boolean }) {
  const refresh = useRefresh();
  return (
    <button
      onClick={async () => { await resolvePost(id, !resolved); refresh(); }}
      className={`press flex min-h-12 items-center justify-center rounded-full px-6 font-semibold ${
        resolved
          ? "border border-border bg-card"
          : "bg-accent text-on-accent shadow-lg shadow-accent/25"
      }`}
    >
      {resolved ? "Reopen" : "Mark resolved 🎉"}
    </button>
  );
}
