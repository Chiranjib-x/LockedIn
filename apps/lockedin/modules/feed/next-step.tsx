import Link from "next/link";
import { ArrowRight, CalendarDays, Users, Heart } from "lucide-react";
import { createClient } from "@suite/auth/server";

// LIVELY L7 (QUEUE A38) — one suggestion, after a student has just done
// something, chosen from what they genuinely have not done yet.
//
// ONE, not a list. A menu of "things you could try" is a tour, and a tour is
// what people close. This picks the first unmet item in a fixed order and shows
// only that; when they do it, the next one takes its place, and when there is
// nothing left the component renders nothing at all.
//
// Every check is a real query against the viewer's own rows, so a suggestion can
// never tell someone to do a thing they have already done.

type Step = {
  href: string;
  icon: typeof Users;
  title: string;
  body: string;
};

export default async function NextStep() {
  let step: Step | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [spaces, timetable, clubs] = await Promise.all([
      // RLS returns only spaces this user belongs to, so a count of 0 means
      // "not in a circle" without leaking whether the circles exist.
      supabase.from("space_members").select("space_id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("timetable_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("community_members").select("community_id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    // Fixed order, most-useful first. The first unmet one wins.
    if ((spaces.count ?? 0) === 0) {
      step = {
        href: "/home",
        icon: Heart,
        title: "Ask to join your circle",
        body: "Her Circle and His Circle are members-only — buy, sell and talk without the whole campus watching.",
      };
    } else if ((timetable.count ?? 0) === 0) {
      step = {
        href: "/timetable",
        icon: CalendarDays,
        title: "Add your timetable",
        body: "Then the app knows when you're free, and can answer “can I skip today?”",
      };
    } else if ((clubs.count ?? 0) === 0) {
      step = {
        href: "/communities",
        icon: Users,
        title: "Find your club",
        body: "77 clubs, chapters and teams are on here. Joining one is how the app stops being just a marketplace.",
      };
    }
  } catch {
    return null;
  }

  if (!step) return null; // nothing left to suggest — say nothing

  const Icon = step.icon;
  return (
    <Link href={step.href} className="press animate-fade-up">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-5 w-5 text-primary" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{step.title}</p>
          <p className="text-xs text-muted-foreground">{step.body}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
      </div>
    </Link>
  );
}
