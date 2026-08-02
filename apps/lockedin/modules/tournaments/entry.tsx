"use client";

import { useState } from "react";
import { useRefresh } from "@suite/lib/use-refresh";
import { inputClass } from "@suite/ui";
import { createTeam, joinTeam, leaveTeam } from "./actions";

export type TeamRow = {
  id: string;
  name: string;
  captain_id: string;
  members: { user_id: string; ign: string | null; name: string | null }[];
};

// Entering, and joining someone else's team.
//
// The in-game name is asked for once, here, at the only moment it is needed. An
// organiser cannot run a Valorant bracket without Riot IDs, and chasing them in
// a group chat afterwards is the job this is meant to remove.
export default function Entry({
  tournamentId,
  teamSize,
  teams,
  meId,
  myTeamId,
  open,
}: {
  tournamentId: string;
  teamSize: number;
  teams: TeamRow[];
  meId: string;
  myTeamId: string | null;
  open: boolean;
}) {
  const refresh = useRefresh();
  const [name, setName] = useState("");
  const [ign, setIgn] = useState("");
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

  if (myTeamId) {
    const mine = teams.find((t) => t.id === myTeamId);
    const isCaptain = mine?.captain_id === meId;
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-accent/40 bg-accent/10 p-4">
        <p className="text-sm font-semibold">You&rsquo;re in — {mine?.name}</p>
        <p className="text-xs text-muted-foreground">
          {mine?.members.length ?? 0} of {teamSize} spots filled.
          {isCaptain && teamSize > 1 && " Share this page with the rest of your team."}
        </p>
        <button
          type="button"
          disabled={busy === "leave"}
          onClick={() => run("leave", () => leaveTeam(tournamentId, myTeamId))}
          className="press min-h-11 self-start rounded-full border border-border bg-card px-4 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          {busy === "leave"
            ? "…"
            : isCaptain
              ? "Withdraw the team"
              : "Leave the team"}
        </button>
        {msg && <p className="text-sm text-destructive">{msg}</p>}
      </div>
    );
  }

  if (!open) {
    return (
      <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Registration is closed.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-card p-4">
        <p className="text-sm font-semibold">
          {teamSize > 1 ? `Enter a team of ${teamSize}` : "Enter"}
        </p>
        <label className="flex flex-col gap-1 text-xs font-medium">
          {teamSize > 1 ? "Team name" : "Your tag"}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={teamSize > 1 ? "e.g. Block C Rejects" : "e.g. your handle"}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Your in-game name
          <input
            value={ign}
            onChange={(e) => setIgn(e.target.value)}
            placeholder="e.g. Chiru#4721"
            className={inputClass}
          />
        </label>
        <button
          type="button"
          disabled={busy === "create" || name.trim().length < 2}
          onClick={() => run("create", () => createTeam(tournamentId, name, ign))}
          className="press min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary disabled:opacity-50"
        >
          {busy === "create" ? "…" : teamSize > 1 ? "Create the team" : "Enter"}
        </button>
      </div>

      {teamSize > 1 && teams.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Or join a team that needs players</p>
          {teams
            .filter((t) => t.members.length < teamSize)
            .map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.members.length}/{teamSize} · needs {teamSize - t.members.length}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy === t.id}
                  onClick={() => run(t.id, () => joinTeam(tournamentId, t.id, ign))}
                  className="press min-h-11 shrink-0 rounded-full border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary disabled:opacity-50"
                >
                  {busy === t.id ? "…" : "Join"}
                </button>
              </div>
            ))}
          {teams.every((t) => t.members.length >= teamSize) && (
            <p className="text-xs text-muted-foreground">
              Every team so far is full — make your own above.
            </p>
          )}
        </div>
      )}

      {msg && <p className="text-sm text-destructive">{msg}</p>}
    </div>
  );
}
