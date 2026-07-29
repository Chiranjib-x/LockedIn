import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, CalendarDays, MapPin, PartyPopper, Search, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { istNow, istTodayISO } from "@/modules/timetable/helpers";
import { SkeletonSection } from "@suite/ui";
import LeaderStrip from "@/modules/feed/leader-strip";
import ClubsStrip from "@/modules/feed/clubs-strip";
import { InstallPrompt } from "@/components/install-prompt";

// CampusClubs home = leaders' command center + two flagship shelves (clubs,
// events) + discovery. Everything the mother app showed for marketplace/gate/
// daily-life lives in the other suite apps, so it's gone from here.

function greeting() {
  const h = istNow().getHours(); // server tz is UTC on Vercel — must shift
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const { supabase, user } = await requireUser();
  const { start: startOfDay } = istTodayISO();

  const [{ data: profile }, { count: clubCount }, { count: eventCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, colleges(name)")
      .eq("id", user.id)
      .single<{ name: string; colleges: { name: string } | null }>(),
    // RLS scopes both counts to the user's college.
    supabase.from("communities").select("id", { count: "exact", head: true }),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("type", "event")
      .gte("event_date", startOfDay),
  ]);

  const firstName = profile?.name?.split(" ")[0] ?? "";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <div className="animate-fade-up">
        <p className="text-sm text-muted-foreground">{greeting()}</p>
        <h1 className="text-3xl font-bold">{firstName || "Hey"}</h1>
        {profile?.colleges?.name && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <MapPin className="h-3 w-3" strokeWidth={2.2} /> {profile.colleges.name}
          </span>
        )}
      </div>

      <Link
        href="/communities"
        className="animate-fade-up press flex min-h-11 items-center gap-2.5 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground"
        style={{ animationDelay: "40ms" }}
      >
        <Search className="h-4 w-4" strokeWidth={2.2} />
        Find a club, chapter or team…
      </Link>

      {/* Leads' management command center — renders nothing for normal students,
          so there's no toggle and no confusion. */}
      <Suspense fallback={<SkeletonSection />}>
        <LeaderStrip />
      </Suspense>

      {/* Flagship shelves — same hero-card weight as the mother app. */}
      <div className="flex flex-col gap-3">
        <Link href="/communities" className="animate-fade-up press" style={{ animationDelay: "60ms" }}>
          <div className="glass press-glow flex items-center gap-4 rounded-3xl p-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-tint-blue text-tint-blue-fg">
              <Users className="h-7 w-7" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading font-bold">Clubs, Chapters &amp; Teams</h2>
              <p className="text-sm text-muted-foreground">
                {(clubCount ?? 0) > 0 ? (
                  <>
                    <span className="font-semibold text-primary">{clubCount}</span> on your campus — join,
                    lead, or start your own
                  </>
                ) : (
                  "Join a club, lead one, or start your own."
                )}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
          </div>
        </Link>

        <Link href="/events" className="animate-fade-up press" style={{ animationDelay: "120ms" }}>
          <div className="glass press-glow flex items-center gap-4 rounded-3xl p-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-tint-violet text-tint-violet-fg">
              <PartyPopper className="h-7 w-7" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-2 font-heading font-bold">
                Events
                {(eventCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-tint-violet px-2 py-0.5 text-[10px] font-bold text-tint-violet-fg">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> LIVE
                  </span>
                )}
              </h2>
              <p className="text-sm text-muted-foreground">
                {(eventCount ?? 0) > 0 ? (
                  <>
                    <span className="font-semibold text-primary">{eventCount}</span> coming up — RSVP and
                    check in with a barcode
                  </>
                ) : (
                  "What's happening on campus, with barcode check-in."
                )}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
          </div>
        </Link>

        <Link href="/events/new" className="animate-fade-up press" style={{ animationDelay: "160ms" }}>
          <div className="glass press-glow flex items-center gap-4 rounded-3xl p-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-tint-amber text-tint-amber-fg">
              <CalendarDays className="h-7 w-7" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading font-bold">Host an event</h2>
              <p className="text-sm text-muted-foreground">Post it, take RSVPs, scan IDs at the door.</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
          </div>
        </Link>
      </div>

      {/* Discover shelves — official clubs, chapters, teams. High on the page
          so campus life isn't hidden. */}
      <Suspense fallback={<SkeletonSection />}>
        <ClubsStrip />
      </Suspense>

      <InstallPrompt />

    </main>
  );
}
