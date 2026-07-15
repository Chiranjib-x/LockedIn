import Link from "next/link";
import { ArrowRight, Inbox, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Led = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  is_official: boolean;
  recruiting: boolean;
};

// The command center for club owners & team leads. Renders ONLY when the user
// leads at least one community, so normal students never see it and there's no
// mode to get confused by — your leadership simply surfaces as its own cards.
// Each card is a one-tap door into that club/team's full management page, with
// a live "needs you" signal. This is the intuitive, non-toggle way to switch
// between "student me" (the rest of home) and "running my club/team".
function roleLabel(category: string) {
  if (category === "team") return "Team lead";
  return "Club lead";
}

export default async function LeaderStrip() {
  let led: Led[] = [];
  const pending: Record<string, number> = {};
  const members: Record<string, number> = {};
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: rows } = await supabase
      .from("community_members")
      .select("community:communities!inner(id, name, emoji, category, is_official, recruiting, is_approved)")
      .eq("user_id", user.id)
      .eq("role", "moderator");

    led = (rows ?? [])
      .map((r) => r.community as unknown as Led & { is_approved: boolean })
      .filter((c) => c && c.is_approved)
      .map(({ id, name, emoji, category, is_official, recruiting }) => ({ id, name, emoji, category, is_official, recruiting }));
    if (led.length === 0) return null;

    const ids = led.map((c) => c.id);
    // RLS lets a lead read their own communities' applications + members.
    const [{ data: apps }, { data: mems }] = await Promise.all([
      supabase.from("community_applications").select("community_id").in("community_id", ids).eq("status", "pending"),
      supabase.from("community_members").select("community_id").in("community_id", ids),
    ]);
    for (const a of apps ?? []) pending[a.community_id] = (pending[a.community_id] ?? 0) + 1;
    for (const m of mems ?? []) members[m.community_id] = (members[m.community_id] ?? 0) + 1;
  } catch {
    return null;
  }

  const totalPending = Object.values(pending).reduce((s, n) => s + n, 0);

  return (
    <section className="animate-fade-up flex flex-col gap-3 rounded-3xl border border-primary/25 bg-gradient-to-b from-primary/8 to-transparent p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-bold">Your command center</h2>
          <p className="text-xs text-muted-foreground">
            {led.length === 1 ? "The club you run" : `The ${led.length} you run`}
            {totalPending > 0 && <> · <span className="font-semibold text-primary">{totalPending} to review</span></>}
          </p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Users className="h-4.5 w-4.5" strokeWidth={2} />
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {led.map((c) => {
          const p = pending[c.id] ?? 0;
          const count = members[c.id] ?? 0;
          return (
            <Link key={c.id} href={`/communities/${c.id}`} className="press">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
                  {c.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-heading font-bold leading-tight">
                    <span className="truncate">{c.name}</span>
                    {c.is_official && <span className="shrink-0 text-primary">✔</span>}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">{roleLabel(c.category)}</span>
                    <span>· {count} member{count === 1 ? "" : "s"}</span>
                    {c.recruiting && <span className="text-accent">· 🟢 recruiting</span>}
                  </p>
                </div>
                {p > 0 ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-on-primary">
                    <Inbox className="h-3.5 w-3.5" strokeWidth={2.2} /> {p}
                  </span>
                ) : (
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
