import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@suite/auth/server";

// LIVELY L11 / QUEUE A40 — a reason to open it tomorrow.
//
// 9 of 143 students had ever opened the app on a day after signing up. Nothing
// on /home changed between visits unless someone else acted, so a second open
// had no payoff. This is the line that gives one.
//
// touch_last_seen() (0089) returns the PREVIOUS visit and advances in a single
// statement. That ordering is the whole feature: write-then-read would always
// compare against now and render "nothing new" forever.
//
// Renders nothing on a first visit, and nothing when nothing changed. An empty
// week should read as an empty week.

export default async function SinceLastVisit() {
  let listings = 0;
  let posts = 0;
  let since: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: prev } = await supabase.rpc("touch_last_seen");
    if (!prev) return null; // first ever visit — there is no "since"
    since = prev as string;

    // Both RLS-scoped to the viewer's college. Space listings excluded: a
    // members-only item must not be counted into everyone's "what's new".
    const [l, p] = await Promise.all([
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .is("space_id", null)
        .eq("status", "available")
        .gt("created_at", since),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .gt("created_at", since),
    ]);
    listings = l.count ?? 0;
    posts = p.count ?? 0;
  } catch {
    return null;
  }

  const total = listings + posts;
  if (total === 0) return null;

  const parts: string[] = [];
  if (listings > 0) parts.push(`${listings} new listing${listings === 1 ? "" : "s"}`);
  if (posts > 0) parts.push(`${posts} board post${posts === 1 ? "" : "s"}`);

  return (
    <Link href={listings >= posts ? "/marketplace" : "/board"} className="press animate-fade-up">
      <div className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/20">
          <Sparkles className="h-4 w-4 text-accent" strokeWidth={2.2} />
        </span>
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">Since you were last here:</span>{" "}
          {parts.join(" and ")}.
        </p>
        <ArrowRight className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} />
      </div>
    </Link>
  );
}
