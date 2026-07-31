import Link from "next/link";
import { Sparkles, ShoppingBag, Pin, Users, Footprints } from "lucide-react";
import { createClient } from "@suite/auth/server";

// LIVELY L1 — what happened on campus without you.
//
// The app is not empty, it LOOKS empty: 143 students, 96 in one circle, 77 clubs,
// and a new arrival's first read is "8 things for sale". Everything below is a
// real row; nothing here is invented, and nothing is padded when there is little
// to show — an empty campus should read as empty.
//
// Signups are AGGREGATED on purpose. Names are already same-college readable, so
// listing them would leak nothing, but "11 students joined today" is both a
// stronger signal than a roll-call and less exposure than one. Individual entries
// are limited to things a student deliberately published.

type Row = { kind: string; created_at: string; label: string | null };

// Date.now() lives in these standalone helpers, never inline in the component —
// the react-hooks purity rule rejects an impure call during render, and
// free-window.tsx / group-buys-closing.tsx already use this shape.
function hoursAgoISO(hours: number) {
  return new Date(Date.now() - hours * 3600000).toISOString();
}

function ago(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ICON: Record<string, typeof Pin> = {
  listing: ShoppingBag,
  post: Pin,
  club: Users,
  pickup: Footprints,
};

const HREF: Record<string, string> = {
  listing: "/marketplace",
  post: "/board",
  club: "/communities",
  pickup: "/gate",
};

const VERB: Record<string, string> = {
  listing: "went up for sale",
  post: "posted on the board",
  club: "opened up",
  pickup: "needs picking up at the gate",
};

export default async function CampusPulse() {
  let rows: Row[] = [];
  let joinedToday = 0;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const since = hoursAgoISO(7 * 24);
    const dayAgo = hoursAgoISO(24);

    // All RLS-scoped to the viewer's college. space_id is excluded from listings:
    // a members-only item must not surface on everyone's home.
    const [listings, posts, clubs, joins] = await Promise.all([
      supabase
        .from("listings")
        .select("title, created_at")
        .is("space_id", null)
        .eq("status", "available")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("posts")
        .select("title, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("communities")
        .select("name, created_at")
        .eq("is_approved", true)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", dayAgo),
    ]);

    joinedToday = joins.count ?? 0;
    rows = [
      ...(listings.data ?? []).map((r) => ({ kind: "listing", created_at: r.created_at, label: r.title })),
      ...(posts.data ?? []).map((r) => ({ kind: "post", created_at: r.created_at, label: r.title })),
      ...(clubs.data ?? []).map((r) => ({ kind: "club", created_at: r.created_at, label: r.name })),
    ]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 6);
  } catch {
    return null; // one broken section streams in empty, it does not blank the page
  }

  // Nothing real to show beats padding it with something invented.
  if (rows.length === 0 && joinedToday < 2) return null;

  return (
    <section className="animate-fade-up flex flex-col gap-3">
      <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
        <Sparkles className="h-4 w-4 text-primary" strokeWidth={2.4} />
        Happening on campus
      </h2>

      {joinedToday >= 2 && (
        <Link href="/search" className="press">
          <div className="glass flex items-center gap-3 rounded-2xl p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tint-green text-tint-green-fg">
              <Users className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-semibold">{joinedToday} students</span> joined in the
              last day
            </p>
          </div>
        </Link>
      )}

      {rows.map((r, i) => {
        const Icon = ICON[r.kind] ?? Pin;
        return (
          <Link key={`${r.kind}-${i}`} href={HREF[r.kind] ?? "/home"} className="press">
            <div className="glass flex items-center gap-3 rounded-2xl p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Icon className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm">
                <span className="font-medium">{r.label ?? "Something"}</span>{" "}
                <span className="text-muted-foreground">{VERB[r.kind]}</span>
              </p>
              <span className="shrink-0 text-xs text-muted-foreground">{ago(r.created_at)}</span>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
