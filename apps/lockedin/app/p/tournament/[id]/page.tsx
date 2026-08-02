import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@suite/auth/server";

// The link that gets pasted into a WhatsApp group. No account needed, because
// most people in that group do not have one — that is the entire point of
// running a tournament here rather than in the group itself.
//
// Whitelisted fields only (0090). No roster, no names, no in-game IDs: probed as
// role anon, which reads the preview but 0 rows of tournament_members.

type Preview = {
  id: string;
  game: string;
  title: string;
  tagline: string | null;
  details: string | null;
  team_size: number;
  starts_at: string | null;
  reg_closes_at: string | null;
  status: string;
  prize: string | null;
  team_count: number;
  player_count: number;
  college_name: string;
};

async function getPreview(id: string): Promise<Preview | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .rpc("public_tournament_preview", { tid: id })
      .maybeSingle<Preview>();
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await getPreview(id);
  if (!p) return { title: "LockedIn" };
  return {
    title: `${p.title} — ${p.game} at ${p.college_name}`,
    description:
      p.tagline ??
      `${p.game} tournament for verified ${p.college_name} students. ${
        p.team_size > 1 ? `Teams of ${p.team_size}.` : "Open entry."
      }`,
  };
}

function istDay(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export default async function PublicTournament({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getPreview(id);
  if (!p) notFound();

  const players = Number(p.player_count);
  const teams = Number(p.team_count);
  const open = p.status === "open";
  const starts = istDay(p.starts_at);
  const closes = istDay(p.reg_closes_at);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-10">
      <div className="animate-fade-up overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
          {p.game} · {p.college_name}
        </p>
        <h1 className="font-heading text-2xl font-bold">{p.title}</h1>
        {p.tagline && <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>}

        <div className="mt-3 flex flex-col gap-1 text-sm">
          {starts && (
            <p>
              <span className="text-muted-foreground">Starts</span> {starts}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Format</span>{" "}
            {p.team_size > 1 ? `Teams of ${p.team_size}` : "Solo"}
          </p>
          {p.prize && (
            <p>
              <span className="text-muted-foreground">Prize</span> {p.prize}
            </p>
          )}
          {/* Only shown once it is a number worth showing — an empty bracket
              advertises itself as empty. */}
          {players > 0 && (
            <p>
              <span className="text-muted-foreground">Entered</span> {players} player
              {players === 1 ? "" : "s"} across {teams} team{teams === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {open && closes && (
          <p className="mt-3 rounded-full bg-card/70 px-3 py-1.5 text-center text-xs font-semibold">
            Registration closes {closes}
          </p>
        )}
      </div>

      {p.details && <p className="whitespace-pre-wrap text-sm">{p.details}</p>}

      <Link
        href="/signup"
        className="press flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-center font-semibold text-on-primary shadow-lg shadow-primary/25"
      >
        {open ? "Sign up with your college email to enter" : "See it on LockedIn"}
      </Link>
      <p className="text-center text-xs text-muted-foreground">
        {p.college_name} students only — verified by college email. Free, and it opens in
        your browser.
      </p>
    </main>
  );
}
