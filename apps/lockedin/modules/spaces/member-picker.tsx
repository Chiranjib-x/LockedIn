"use client";

import { useState } from "react";
import { useRefresh } from "@suite/lib/use-refresh";
import { inputClass } from "@suite/ui";
import { addSpaceMember, removeSpaceMember, setSpaceLead } from "./admin-actions";

export type Student = { id: string; name: string | null; username: string | null; isLead?: boolean };

// Tap a name to add them, tap × to remove. Filter is client-side because a
// college roster is small enough that a round-trip per keystroke would feel
// worse than rendering the list once.
export default function MemberPicker({
  spaceId,
  spaceName,
  members,
  candidates,
  canPromote = false,
}: {
  spaceId: string;
  spaceName: string;
  members: Student[];
  candidates: Student[];
  /** Only a college moderator appoints the lead. */
  canPromote?: boolean;
}) {
  const refresh = useRefresh();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const needle = q.trim().toLowerCase();
  const shown = needle
    ? candidates.filter(
        (c) =>
          (c.name ?? "").toLowerCase().includes(needle) ||
          (c.username ?? "").toLowerCase().includes(needle)
      )
    : candidates;

  const run = async (fn: () => Promise<string | null>, id: string) => {
    setBusy(id);
    setMsg(null);
    const err = await fn();
    setBusy(null);
    if (err) setMsg(err);
    else refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">
          In {spaceName} · {members.length}
        </p>
        {members.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nobody yet — add the first person below.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <span
                key={m.id}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 text-sm"
              >
                {m.isLead && <span title="Space lead">👑</span>}
                {m.name ?? "Student"}
                {canPromote && !m.isLead && (
                  <button
                    type="button"
                    aria-label={`Make ${m.name ?? "student"} the lead of ${spaceName}`}
                    disabled={busy === m.id}
                    onClick={() => run(() => setSpaceLead(spaceId, m.id), m.id)}
                    className="press min-h-11 min-w-11 shrink-0 text-muted-foreground hover:text-primary disabled:opacity-50"
                  >
                    {busy === m.id ? "…" : "👑"}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${m.name ?? "student"} from ${spaceName}`}
                  disabled={busy === m.id}
                  onClick={() => run(() => removeSpaceMember(spaceId, m.id), m.id)}
                  className="press min-h-11 min-w-11 shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
                >
                  {busy === m.id ? "…" : "×"}
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Add someone
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a name or @username"
          aria-label={`Search students to add to ${spaceName}`}
          className={inputClass}
        />
      </label>

      {shown.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {candidates.length === 0
            ? "Everyone at your college is already in."
            : `No student matches “${q}”.`}
        </p>
      ) : (
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {shown.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={busy === s.id}
              onClick={() => run(() => addSpaceMember(spaceId, s.id), s.id)}
              className="press inline-flex min-h-11 items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 text-left text-sm hover:border-primary disabled:opacity-50"
            >
              <span className="min-w-0 truncate">
                {s.name ?? "Student"}
                {s.username && (
                  <span className="ml-1 font-normal text-muted-foreground">@{s.username}</span>
                )}
              </span>
              <span className="shrink-0 text-xs font-semibold text-primary">
                {busy === s.id ? "Adding…" : "Add"}
              </span>
            </button>
          ))}
        </div>
      )}

      {msg && <p className="text-sm text-destructive">{msg}</p>}
      <p className="text-xs text-muted-foreground">
        They get a notification saying you added them, and can leave whenever they want.
        {canPromote && " Tap 👑 to let one member manage this roster without you."}
      </p>
    </div>
  );
}
