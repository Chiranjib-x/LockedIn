import { notFound } from "next/navigation";
import { Trophy, CalendarDays, Users, Gift } from "lucide-react";
import { requireUser } from "@suite/auth/auth";
import { BackLink } from "@suite/ui";
import ShareButton from "@/components/share-button";
import Entry, { type TeamRow } from "@/modules/tournaments/entry";

// A tournament, and the page people are sent to from the home banner.
// Share points at /p/tournament/[id] — the version that opens without an
// account, because the link is meant to travel through WhatsApp groups where
// most people do not have one yet.

function istDay(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { id } = await params;

  const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).single();
  if (!t) notFound();

  const { data: teamRows } = await supabase
    .from("tournament_teams")
    .select("id, name, captain_id, members:tournament_members(user_id, ign, profile:profiles!tournament_members_user_id_fkey(name))")
    .eq("tournament_id", id)
    .order("created_at");

  const teams: TeamRow[] = (teamRows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    captain_id: r.captain_id,
    members: ((r.members ?? []) as unknown as {
      user_id: string;
      ign: string | null;
      profile: { name: string } | null;
    }[]).map((m) => ({ user_id: m.user_id, ign: m.ign, name: m.profile?.name ?? null })),
  }));

  const myTeam = teams.find((t) => t.members.some((m) => m.user_id === user.id)) ?? null;
  const players = teams.reduce((n, t) => n + t.members.length, 0);
  const regOpen =
    t.status === "open" && (!t.reg_closes_at || new Date(t.reg_closes_at) > new Date());
  const closes = istDay(t.reg_closes_at);
  const starts = istDay(t.starts_at);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <BackLink href="/home" label="Home" />
        <ShareButton path={`/p/tournament/${t.id}`} title={t.title} />
      </div>

      <div className="animate-fade-up rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{t.game}</p>
        <h1 className="font-heading text-2xl font-bold">{t.title}</h1>
        {t.tagline && <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" strokeWidth={2.2} />
            {players} player{players === 1 ? "" : "s"} · {teams.length} team
            {teams.length === 1 ? "" : "s"}
          </span>
          {starts && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" strokeWidth={2.2} /> {starts}
            </span>
          )}
          {t.prize && (
            <span className="inline-flex items-center gap-1">
              <Gift className="h-3.5 w-3.5" strokeWidth={2.2} /> {t.prize}
            </span>
          )}
        </div>
        {closes && regOpen && (
          <p className="mt-2 text-xs font-medium text-accent">Registration closes {closes}</p>
        )}
      </div>

      {t.details && <p className="whitespace-pre-wrap text-sm">{t.details}</p>}

      <Entry
        tournamentId={t.id}
        teamSize={t.team_size}
        teams={teams}
        meId={user.id}
        myTeamId={myTeam?.id ?? null}
        open={regOpen}
      />

      {teams.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">
            Entered <span className="text-muted-foreground">· {teams.length}</span>
          </h2>
          {teams.map((tm) => (
            <div key={tm.id} className="rounded-2xl border border-border bg-card p-3">
              <p className="text-sm font-medium">
                {tm.name}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {tm.members.length}/{t.team_size}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {tm.members.map((m) => m.ign || m.name || "Player").join(" · ")}
              </p>
            </div>
          ))}
        </section>
      )}

      {teams.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card py-10 text-center">
          <Trophy className="h-8 w-8 text-muted-foreground" strokeWidth={1.8} />
          <p className="font-medium">Nobody has entered yet</p>
          <p className="text-sm text-muted-foreground">
            Be the first — it takes about twenty seconds.
          </p>
        </div>
      )}

      {t.contact && (
        <p className="text-center text-xs text-muted-foreground">Questions? {t.contact}</p>
      )}
    </main>
  );
}
