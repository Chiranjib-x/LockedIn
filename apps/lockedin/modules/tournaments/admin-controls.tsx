"use client";

import { useState } from "react";
import { useRefresh } from "@suite/lib/use-refresh";
import { setFeatured, deleteTournament } from "./admin-actions";

// Feature / un-feature and delete. Kept apart from the form so the destructive
// pair is never one stray tap inside a save.
export default function AdminControls({
  id,
  isFeatured,
  entrants,
}: {
  id: string;
  isFeatured: boolean;
  entrants: number;
}) {
  const refresh = useRefresh();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<string | null>) => {
    setBusy(key);
    setMsg(null);
    const err = await fn();
    setBusy(null);
    if (err) setMsg(err);
    else refresh();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run("feat", () => setFeatured(isFeatured ? null : id))}
          className={`press min-h-11 rounded-full px-4 text-sm font-semibold ${
            isFeatured
              ? "border border-border bg-card text-muted-foreground hover:bg-muted"
              : "bg-primary text-on-primary"
          } disabled:opacity-50`}
        >
          {busy === "feat"
            ? "…"
            : isFeatured
              ? "Remove from home"
              : "Show on home"}
        </button>

        {/* Only offered while it can actually succeed — the RPC refuses once
            anyone has entered, and a button that always errors is noise. */}
        {entrants === 0 && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => {
              if (confirm("Delete this tournament? Nobody has entered it.")) {
                run("del", () => deleteTournament(id));
              }
            }}
            className="press min-h-11 rounded-full border border-destructive/40 px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            {busy === "del" ? "…" : "Delete"}
          </button>
        )}
      </div>
      {/* Explicit {" "}: JSX dropped the space after the ternary and after the
          <b>, rendering "1 person hasentered" and "donewhen". */}
      {entrants > 0 && (
        <p className="text-xs text-muted-foreground">
          {entrants}{" "}
          {entrants === 1 ? "person has" : "people have"}{" "}
          entered, so this can&rsquo;t be deleted. Set the status to <b>done</b>{" "}
          when it&rsquo;s over.
        </p>
      )}
      {msg && <p className="text-sm text-destructive">{msg}</p>}
    </div>
  );
}
