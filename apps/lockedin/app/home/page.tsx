import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CarTaxiFront,
  Footprints,
  Handshake,
  MapPin,
  PartyPopper,
  Pin,
  Search,
  ShoppingBag,
  Tag,
  Target,
  Tv,
  Users,
  Users2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { istNow } from "@/modules/timetable/helpers";
import { SkeletonSection } from "@suite/ui";
import NowStrip from "@/modules/feed/now-strip";
import LeaderStrip from "@/modules/feed/leader-strip";
import ClubsStrip from "@/modules/feed/clubs-strip";
import RecentChats from "@/modules/feed/recent-chats";
import RenewalsSoon from "@/modules/feed/renewals-soon";
import FreshListings from "@/modules/feed/fresh-listings";
import BoardHighlights from "@/modules/feed/board-highlights";
import GroupBuysClosing from "@/modules/feed/group-buys-closing";
import FreeWindow from "@/modules/feed/free-window";
import { InstallPrompt } from "@/components/install-prompt";

// Personalized home feed (Phase 26, pulled forward). The chip row below is
// the "compact module nav" the phase brief asks for — direct access to any
// module stays one tap away even with the full grid gone. Each feed section
// is its own Suspense boundary + owns its error handling internally, so one
// broken section streams in empty instead of blanking the page.

// Every feature gets a flagship-style card (icon chip + title + blurb +
// arrow) — same visual weight as Marketplace/Gate Runner, no smaller tiles.
const FEATURES: { short: string; href: string; icon: LucideIcon; tint: string; blurb: string }[] = [
  { short: "Board", href: "/board", icon: Pin, tint: "bg-tint-rose text-tint-rose-fg", blurb: "Lost & found and campus notices." },
  { short: "Events", href: "/events", icon: PartyPopper, tint: "bg-tint-violet text-tint-violet-fg", blurb: "What's happening on campus." },
  { short: "Match", href: "/matches", icon: Target, tint: "bg-tint-violet text-tint-violet-fg", blurb: "Find a compatible roommate." },
  { short: "Clubs & Teams", href: "/communities", icon: Users, tint: "bg-tint-blue text-tint-blue-fg", blurb: "Chapters, clubs, and student teams." },
  { short: "Crews", href: "/crews", icon: Users2, tint: "bg-tint-rose text-tint-rose-fg", blurb: "Private groups for roommates & friends." },
  { short: "Toolbox", href: "/toolbox", icon: Wrench, tint: "bg-tint-amber text-tint-amber-fg", blurb: "Handy tools picked for students." },
  { short: "Deals", href: "/deals", icon: Tag, tint: "bg-tint-green text-tint-green-fg", blurb: "Offers from campus merchants." },
  { short: "Timetable", href: "/timetable", icon: CalendarDays, tint: "bg-tint-violet text-tint-violet-fg", blurb: "Classes, attendance, bunk math." },
  { short: "Study Groups", href: "/study-groups", icon: BookOpen, tint: "bg-tint-teal text-tint-teal-fg", blurb: "Find people studying your course." },
  { short: "My Pools", href: "/subscriptions", icon: Tv, tint: "bg-tint-teal text-tint-teal-fg", blurb: "Subscriptions you're sharing." },
];

function greeting() {
  const h = istNow().getHours(); // server tz is UTC on Vercel — must shift

  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { data: mySpaces }, { data: openPickups }, { count: listingCount }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("name, colleges(name)")
        .eq("id", user.id)
        .single<{ name: string; colleges: { name: string } | null }>(),
      // RLS: only spaces the user is a member of come back. Everyone else
      // never sees this section exists.
      supabase.from("spaces").select("id, name, emoji, description"),
      // Live flagship stats — both RLS-scoped to the user's college.
      supabase.from("pickup_requests").select("reward").eq("status", "open"),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "available")
        .is("space_id", null),
    ]);

  // Second-tier live stats (cabs / group-buys / pools) — head counts only.
  const [{ count: tripCount }, { count: orderCount }, { count: poolCount }] = await Promise.all([
    supabase.from("trips").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("group_orders").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("is_discoverable", true)
      .gt("open_seats", 0),
  ]);

  const firstName = profile?.name?.split(" ")[0] ?? "";
  const gateCount = openPickups?.length ?? 0;
  const gateRewards = (openPickups ?? []).reduce((s, r) => s + Number(r.reward || 0), 0);

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
        href="/search"
        className="animate-fade-up press flex min-h-11 items-center gap-2.5 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground"
        style={{ animationDelay: "40ms" }}
      >
        <Search className="h-4 w-4" strokeWidth={2.2} />
        Search campus…
      </Link>

      {/* Club owners & team leads get their management command center first —
          renders nothing for normal students, so no toggle, no confusion. */}
      <Suspense fallback={<SkeletonSection />}>
        <LeaderStrip />
      </Suspense>

      {/* Personal & dynamic — your next class + any attendance warning.
          Self-hides for anyone without a timetable, so new users skip it. */}
      <Suspense fallback={<SkeletonSection />}>
        <NowStrip />
      </Suspense>

      {/* Flagship showcase — the features that sell the app get hero cards
          with live numbers; everything else stays one tap away in the grid. */}
      <div className="flex flex-col gap-3">
        <Link href="/marketplace" className="animate-fade-up press" style={{ animationDelay: "60ms" }}>
          <div className="glass press-glow flex items-center gap-4 rounded-3xl p-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-tint-blue text-tint-blue-fg">
              <ShoppingBag className="h-7 w-7" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading font-bold">Marketplace</h2>
              <p className="text-sm text-muted-foreground">
                {(listingCount ?? 0) > 0 ? (
                  <>
                    <span className="font-semibold text-primary">{listingCount}</span> thing
                    {listingCount === 1 ? "" : "s"} for sale on campus right now
                  </>
                ) : (
                  "Buy, sell, and rent — students from your college only."
                )}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
          </div>
        </Link>

        <Link href="/gate" className="animate-fade-up press" style={{ animationDelay: "120ms" }}>
          <div className="glass press-glow flex items-center gap-4 rounded-3xl p-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-tint-green text-tint-green-fg">
              <Footprints className="h-7 w-7" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-2 font-heading font-bold">
                Gate Runner
                {gateCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-tint-green px-2 py-0.5 text-[10px] font-bold text-tint-green-fg">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> LIVE
                  </span>
                )}
              </h2>
              <p className="text-sm text-muted-foreground">
                {gateCount > 0 ? (
                  <>
                    {gateCount} deliver{gateCount === 1 ? "y" : "ies"} waiting at the gate
                    {gateRewards > 0 && <> · <span className="font-semibold text-accent">₹{gateRewards.toFixed(0)} up for grabs</span></>}
                  </>
                ) : (
                  "Your delivery, picked up by someone already at the gate."
                )}
              </p>
              <span className="route-dash mt-2 block w-3/4" />
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
          </div>
        </Link>

        {(mySpaces ?? []).map((s) => (
          <Link key={s.id} href={`/spaces/${s.id}`} className="animate-fade-up press" style={{ animationDelay: "180ms" }}>
            <div className="urgent-border glass press-glow flex items-center gap-4 rounded-3xl p-4">
              {/* Neutral tile: the emoji carries the space's identity, so a new
                  space can never inherit another one's colour. */}
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl">
                {s.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading font-bold">{s.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {/* Was `name.includes("closet") ? … : …`, which sent BOTH
                      spaces down the men's branch the moment 0084 renamed them —
                      "Her Circle … boys only" shipped. The copy lives on the row
                      now, so it cannot drift from the name again. */}
                  {s.description}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
            </div>
          </Link>
        ))}

        {/* POLISH J8-1: the landing page sells Girls' Closet and Boys' Den by
            name, but a non-member never saw them mentioned again anywhere in the
            app — no /spaces index exists and /home only lists spaces you are
            already in. Students who signed up *because* of that pitch just
            concluded it did not exist. This says nothing the public landing page
            does not already say, so it leaks no membership. */}
        {(mySpaces ?? []).length === 0 && (
          <div className="animate-fade-up glass flex items-center gap-4 rounded-3xl p-4" style={{ animationDelay: "180ms" }}>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-tint-rose text-2xl">
              🔒
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading font-bold">Girls&rsquo; Closet &amp; Boys&rsquo; Den</h2>
              <p className="text-sm text-muted-foreground">
                Members-only spaces, invisible to everyone else. A member vouches you
                in — ask someone who&rsquo;s already inside.
              </p>
            </div>
          </div>
        )}

        <Link href="/cabs" className="animate-fade-up press" style={{ animationDelay: "200ms" }}>
          <div className="glass press-glow flex items-center gap-4 rounded-3xl p-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-tint-rose text-tint-rose-fg">
              <CarTaxiFront className="h-7 w-7" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading font-bold">Cab Pooling</h2>
              <p className="text-sm text-muted-foreground">
                {(tripCount ?? 0) > 0 ? <><span className="font-semibold text-primary">{tripCount}</span> trip{tripCount === 1 ? "" : "s"} to join</> : "Split a ride, split the fare."}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
          </div>
        </Link>

        <Link href="/group-buy" className="animate-fade-up press" style={{ animationDelay: "220ms" }}>
          <div className="glass press-glow flex items-center gap-4 rounded-3xl p-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-tint-amber text-tint-amber-fg">
              <Handshake className="h-7 w-7" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading font-bold">Group-Buys</h2>
              <p className="text-sm text-muted-foreground">
                {(orderCount ?? 0) > 0 ? <><span className="font-semibold text-primary">{orderCount}</span> order{orderCount === 1 ? "" : "s"} open</> : "One order, split delivery fee."}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
          </div>
        </Link>

        <Link href="/subscriptions/browse" className="animate-fade-up press" style={{ animationDelay: "240ms" }}>
          <div className="glass press-glow flex items-center gap-4 rounded-3xl p-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-tint-teal text-tint-teal-fg">
              <Tv className="h-7 w-7" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading font-bold">Netflix & Spotify Pools</h2>
              <p className="text-sm text-muted-foreground">
                {(poolCount ?? 0) > 0 ? <><span className="font-semibold text-primary">{poolCount}</span> open seat{poolCount === 1 ? "" : "s"}</> : "Share a subscription, split the cost."}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
          </div>
        </Link>

        {FEATURES.map((m, i) => (
          <Link key={m.short} href={m.href} className="animate-fade-up press" style={{ animationDelay: `${260 + i * 20}ms` }}>
            <div className="glass press-glow flex items-center gap-4 rounded-3xl p-4">
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${m.tint}`}>
                <m.icon className="h-7 w-7" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading font-bold">{m.short}</h2>
                <p className="text-sm text-muted-foreground">{m.blurb}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
            </div>
          </Link>
        ))}
      </div>

      {/* Clubs & teams — high on the page so campus life isn't hidden. */}
      <Suspense fallback={<SkeletonSection />}>
        <ClubsStrip />
      </Suspense>

      <InstallPrompt />

      <Suspense fallback={<SkeletonSection />}>
        <FreeWindow />
      </Suspense>


      <Suspense fallback={<SkeletonSection />}>
        <RecentChats />
      </Suspense>
      <Suspense fallback={<SkeletonSection />}>
        <RenewalsSoon />
      </Suspense>
      <Suspense fallback={<SkeletonSection />}>
        <FreshListings />
      </Suspense>
      <Suspense fallback={<SkeletonSection />}>
        <BoardHighlights />
      </Suspense>
      <Suspense fallback={<SkeletonSection />}>
        <GroupBuysClosing />
      </Suspense>

      {/* A human at the bottom of the feed. Students had no route to one:
          the banned banner said "contact an admin" with nothing to tap. */}
      <a
        href="https://www.instagram.com/chiranjib_x/"
        target="_blank"
        rel="noopener noreferrer"
        className="press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-border bg-card text-sm text-muted-foreground hover:border-primary hover:text-foreground"
      >
        💬 Feedback, a bug, or an idea? Message @chiranjib_x on Instagram
      </a>
    </main>
  );
}
