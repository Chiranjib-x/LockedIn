"use client";

import { useState } from "react";
import { useRefresh } from "@suite/lib/use-refresh";
import { inputClass } from "@suite/ui";
import { setMyIgn } from "./actions";

// Set or fix your in-game name after you have already entered.
//
// join_tournament_team() takes an ign, but only at the moment you join — so
// anyone who entered without one, typed it wrong, or changed their Riot tag was
// stuck, and the organiser cannot seed a bracket without it. Editable right up
// until the tournament is over, deliberately: someone realising at 8pm that
// their tag is wrong should be able to fix it.
export default function MyIgn({
  tournamentId,
  current,
  label,
}: {
  tournamentId: string;
  current: string | null;
  label: string;
}) {
  const refresh = useRefresh();
  const [value, setValue] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const dirty = value.trim() !== (current ?? "").trim();

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const err = await setMyIgn(tournamentId, value);
    setBusy(false);
    if (err) setMsg(err);
    else {
      setMsg(value.trim() ? "Saved." : "Removed.");
      refresh();
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Your {label}
        <span className="text-xs font-normal text-muted-foreground">
          {current
            ? "Change it any time before the first match."
            : "The organiser needs this to add you to the bracket."}
        </span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`e.g. Ananya#4721`}
          aria-label={`Your ${label}`}
          maxLength={40}
          className={inputClass}
        />
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          className="press min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50"
        >
          {busy ? "Saving…" : current ? "Update" : "Save"}
        </button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}
