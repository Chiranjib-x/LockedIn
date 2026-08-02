import Link from "next/link";
import { Trophy, ArrowRight } from "lucide-react";
import { createClient } from "@suite/auth/server";

// The home banner for whatever competition is running.
//
// Driven entirely by tournaments.is_featured, so there is no banner table to
// manage: feature the next one when a new game starts, un-feature when you stop,
// and this renders nothing at all. That last case is the one that matters — a
// dead "VALORANT CUP" banner sitting on the home screen in December is worse
// than never having run one.
//
// Deliberately loud. It is the only element on /home allowed to be, because it
// is the thing a WhatsApp group is being invited to and it competes with ten
// feature cards for a first-time visitor's attention.

type Featured = {
  id: string;
  game: string;
  title: string;
  tagline: string | null;
  team_size: number;
  starts_at: string | null;
  reg_closes_at: string | null;
  status: string;
  team_count: number;
  player_count: number;
  i_am_in: boolean;
};

function dayLabel(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

export default async function TournamentBanner() {
  let t: Featured | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    ({ data: t } = await supabase.rpc("featured_tournament").maybeSingle<Featured>());
  } catch {
    return null;
  }
  if (!t) return null;

  const players = Number(t.player_count);
  const teams = Number(t.team_count);
  const closed = t.status === "closed";
  const when = dayLabel(t.starts_at);

  return (
    <Link href={`/tournaments/${t.id}`} className="animate-fade-up press">
      <div className="press-glow relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent p-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary">
            <Trophy className="h-7 w-7" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
              {t.game}
              {closed ? " · registration closed" : " · open now"}
            </p>
            <h2 className="truncate font-heading text-lg font-bold">{t.title}</h2>
            <p className="text-sm text-muted-foreground">
              {/* Real counts only. Before anyone enters this says what it is
                  rather than boasting an empty bracket. */}
              {players > 0
                ? `${players} player${players === 1 ? "" : "s"} · ${teams} team${teams === 1 ? "" : "s"} in`
                : t.tagline ??
                  (t.team_size > 1 ? `Teams of ${t.team_size}` : "Open to everyone")}
              {when && ` · ${when}`}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-primary" strokeWidth={2.4} />
        </div>

        <p className="mt-3 rounded-full bg-card/70 px-3 py-1.5 text-center text-xs font-semibold text-foreground">
          {t.i_am_in
            ? "You're in — tap to see your team"
            : closed
              ? "Tap for the bracket and fixtures"
              : t.team_size > 1
                ? `Enter a team of ${t.team_size} →`
                : "Enter →"}
        </p>
      </div>
    </Link>
  );
}
