import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Section } from "@/components/ui";
import TypeBadge from "@/modules/board/badge";

type Post = { id: string; type: string; title: string; location: string | null; event_date: string | null };

// Today's notices (posted today) + events (happening today). Lost & found
// "possible match" alerts from Phase 26's spec would need a similarity
// heuristic between lost/found descriptions that doesn't exist yet —
// skipped rather than faked.
export default async function BoardHighlights() {
  let posts: Post[] | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    ({ data: posts } = await supabase
      .from("posts")
      .select("id, type, title, location, event_date, created_at")
      .in("type", ["notice", "event"])
      .eq("status", "open")
      .or(
        `and(type.eq.notice,created_at.gte.${startOfDay}),and(type.eq.event,event_date.gte.${startOfDay},event_date.lt.${endOfDay})`
      )
      .order("created_at", { ascending: false })
      .limit(5));
  } catch {
    return null;
  }

  if (!posts?.length) return null;

  return (
    <Section title="Happening today" action={{ href: "/board", label: "See board" }}>
      <div className="flex flex-col gap-2">
        {posts.map((p) => (
          <Link key={p.id} href={`/board/${p.id}`} className="press">
            <Card>
              <div className="flex items-center gap-2">
                <TypeBadge type={p.type} />
                {p.type === "event" && p.event_date && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3 shrink-0" strokeWidth={2} />
                    {new Date(p.event_date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                  </span>
                )}
              </div>
              <h3 className="mt-1 truncate font-semibold">{p.title}</h3>
              {p.location && (
                <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {p.location}
                </p>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </Section>
  );
}
