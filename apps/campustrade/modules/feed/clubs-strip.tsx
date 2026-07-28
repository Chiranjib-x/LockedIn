import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { catLabel } from "@/modules/communities/categories";

type Club = {
  id: string;
  name: string;
  emoji: string;
  logo_url: string | null;
  category: string;
  recruiting: boolean;
  is_official: boolean;
  members: { user_id: string }[];
};

// Home showcase for clubs, chapters & teams — a prominent hero section, not a
// hidden strip. Official + recruiting lead; big chunky cards so campus life is
// one of the first things a student sees. College-scoped by RLS.
export default async function ClubsStrip() {
  let clubs: Club[] | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    ({ data: clubs } = await supabase
      .from("communities")
      .select("id, name, emoji, logo_url, category, recruiting, is_official, members:community_members(user_id)")
      .eq("is_approved", true)
      .order("recruiting", { ascending: false })
      .order("is_official", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8));
  } catch {
    return null;
  }
  if (!clubs?.length) return null;

  return (
    <section className="animate-fade-up flex flex-col gap-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="font-heading text-xl font-bold">Clubs, chapters & teams</h2>
          <p className="text-sm text-muted-foreground">Find your people on campus.</p>
        </div>
        <Link href="/communities" className="press flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-primary">
          See all <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
        </Link>
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
        {clubs.map((c) => {
          const count = c.members.length;
          return (
            <Link key={c.id} href={`/communities/${c.id}`} className="press w-44 shrink-0 snap-start">
              <div
                className={`glass press-glow flex h-full flex-col gap-2 rounded-3xl p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
                  c.recruiting ? "border-accent/40" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  {c.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logo_url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
                      {c.emoji}
                    </span>
                  )}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {catLabel(c.category)}
                  </span>
                </div>
                <p className="flex items-center gap-1 font-heading font-bold leading-tight">
                  <span className="truncate">{c.name}</span>
                  {c.is_official && <span className="shrink-0 text-primary">✔</span>}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {count} member{count === 1 ? "" : "s"}
                </p>
                {c.recruiting ? (
                  <span className="mt-auto w-fit rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                    🟢 Recruiting
                  </span>
                ) : (
                  <span className="mt-auto text-[11px] font-semibold text-primary">Open →</span>
                )}
              </div>
            </Link>
          );
        })}
        <Link
          href="/communities"
          className="press flex w-32 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border text-center"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ArrowRight className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <span className="px-2 text-xs font-semibold text-primary">See all clubs & teams</span>
        </Link>
      </div>
    </section>
  );
}
