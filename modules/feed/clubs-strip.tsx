import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Section } from "@/components/ui";

type Club = { id: string; name: string; emoji: string; recruiting: boolean; is_official: boolean; members: { user_id: string }[] };

// Home showcase for clubs & chapters — recruiting ones lead. Makes clubs a
// first-class part of the home page instead of a single tile in the grid.
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
      .select("id, name, emoji, recruiting, is_official, members:community_members(user_id)")
      .eq("is_approved", true)
      .order("recruiting", { ascending: false })
      .order("is_official", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10));
  } catch {
    return null;
  }
  if (!clubs?.length) return null;

  return (
    <Section title="Clubs & Teams" action={{ href: "/communities", label: "See all" }}>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {clubs.map((c) => {
          const count = c.members.length;
          return (
            <Link key={c.id} href={`/communities/${c.id}`} className="press w-36 shrink-0">
              <div
                className={`flex h-full flex-col gap-1.5 rounded-2xl border p-3 ${
                  c.recruiting ? "border-accent/40 bg-accent/5" : "border-border bg-card"
                }`}
              >
                <span className="text-3xl">{c.emoji}</span>
                <p className="truncate text-sm font-semibold">
                  {c.name}
                  {c.is_official && <span className="ml-1 text-primary">✔</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {count} member{count === 1 ? "" : "s"}
                </p>
                {c.recruiting && (
                  <span className="mt-0.5 w-fit rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                    🟢 Recruiting
                  </span>
                )}
              </div>
            </Link>
          );
        })}
        <Link href="/communities" className="press flex w-24 shrink-0 items-center justify-center rounded-2xl border border-dashed border-border text-sm font-medium text-primary">
          See all →
        </Link>
      </div>
    </Section>
  );
}
