"use client";

import { useState } from "react";
import { saveSearch } from "@/modules/saves/actions";

// "Save this search & alert me" — shown on filtered browse views; new
// matching content notifies (and pushes) the owner, capped hourly.
export default function SaveSearchButton({
  module,
  query,
  filters,
}: {
  module: "marketplace" | "board";
  query: string;
  filters: Record<string, string>;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  if (query === "" && Object.keys(filters).length === 0) return null;

  return (
    <button
      disabled={state === "busy" || state === "done"}
      onClick={async () => {
        setState("busy");
        const err = await saveSearch(module, query, filters);
        setState(err ? "error" : "done");
      }}
      className="press self-start rounded-full border border-primary/40 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-70"
    >
      {state === "done" ? "🔔 Alerting you ✓" : state === "error" ? "Failed — tap to retry" : state === "busy" ? "Saving…" : "🔔 Save this search & alert me"}
    </button>
  );
}
