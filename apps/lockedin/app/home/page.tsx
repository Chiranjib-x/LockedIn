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
import CampusPulse from "@/modules/feed/campus-pulse";
import RecentChats from "@/modules/feed/recent-chats";
import RenewalsSoon from "@/modules/feed/renewals-soon";
import FreshListings from "@/modules/feed/fresh-listings";
import BoardHighlights from "@/modules/feed/board-highlights";
import GroupBuysClosing from "@/modules/feed/group-buys-closing";
import FreeWindow from "@/modules/feed/free-window";
import { InstallPrompt } from "@/components/install-prompt";
import RequestJoin, { type JoinableSpace } from "@/modules/spaces/request-join";

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
        .select("name, college_id, colleges(name)")
        .eq("id", user.id)
        .single<{ name: string; college_id: string | null; colleges: { name: string } | null }>(),
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

  const collegeId = profile?.college_id ?? null;

  // Second-tier live stats (cabs / group-buys / pools) — head counts only.
  const [
    { count: tripCount },
    { count: orderCount },
    { count: poolCount },
    { count: studentCount },
    { count: clubCount },
    { data: spaceMemberRows },
    { count: toolCount },
    { count: myListingCount },
  ] = await Promise.all([
    supabase.from("trips").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("group_orders").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("is_discoverable", true)
      .gt("open_seats", 0),
    // Campus scale. RLS already scopes both of these to the viewer's own college
    // ("profiles: same-college read", "communities: college read").
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("communities").select("id", { count: "exact", head: true }).eq("is_approved", true),
    // RLS returns only the spaces this user belongs to, so one query counts them
    // all without an N+1 and without leaking any space they are not in.
    supabase.from("space_members").select("space_id"),
    // Toolbox size, so the card advertises what is actually in there. RLS scopes
    // showcase_items to the viewer's college ("showcase_items: college read").
    supabase.from("showcase_items").select("id", { count: "exact", head: true }).eq("is_active", true),
    // Has this student ever put anything up for sale? 124 of 143 never have, and
    // 8 live listings is what makes the app feel empty to the next arrival. Asked
    // once, concretely, and only of people it applies to.
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id),
  ]);

  // campus_buildings is public-read (0065: `using (true)`) so RLS does NOT scope
  // it — without this filter the count would include every other college's map.
  const { count: placeCount } = collegeId
    ? await supabase
        .from("campus_buildings")
        .select("id", { count: "exact", head: true })
        .eq("college_id", collegeId)
    : { count: 0 as number | null };

  // Every circle at this college plus whether I'm in it or already asked. `spaces`
  // is member-only under RLS, so a non-member cannot even see what to ask for —
  // hence the definer RPC.
  const { data: joinableRows } = await supabase.rpc("list_joinable_spaces");
  const joinableSpaces = (joinableRows ?? []) as JoinableSpace[];

  const membersBySpace = new Map<string, number>();
  for (const r of spaceMemberRows ?? []) {
    membersBySpace.set(r.space_id, (membersBySpace.get(r.space_id) ?? 0) + 1);
  }

  // Live counts for the feature cards below, keyed by route. Only routes whose
  // number means something to a student before they tap belong here — a count of
  // how many tools are in the Toolbox is a reason to open it; a count of pages in
  // Timetable is not.
  const FEATURE_COUNTS: Record<string, number> = {
    "/toolbox": toolCount ?? 0,
  };

  // What the campus actually has, as opposed to what happens to be listed today.
  // A student's first read of /home was "6 things for sale" — the smallest true
  // number in the database — while 93 classmates and 76 clubs stayed invisible.
  // Same data, and the honest total is the one worth showing first.
  const campusStats = [
    { n: studentCount ?? 0, label: "students" },
    { n: clubCount ?? 0, label: "clubs & teams" },
    { n: placeCount ?? 0, label: "places mapped" },
  ]
    // Drop anything below 2. A "1" conveys no scale, and it also keeps every
    // label correctly plural without a singular case for each one.
    .filter((s) => s.n >= 2);
  // Below this there is no scale to report, and claiming any would be worse than
  // saying nothing — an empty college should read as empty.
  const showCampusStats = (studentCount ?? 0) >= 10 && campusStats.length >= 2;

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

      {/* One ask, once, and only to people who have never sold anything. A
          generic "+" produced 8 listings across 143 students; a specific request
          with a named first step is what marketplaces bootstrap on. It disappears
          the moment they post, so it never becomes wallpaper. */}
      {myListingCount === 0 && (
        <Link href="/marketplace/new" className="animate-fade-up press" style={{ animationDelay: "20ms" }}>
          <div className="glass press-glow flex items-center gap-4 rounded-3xl border border-primary/30 p-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-tint-green text-tint-green-fg">
              <Tag className="h-7 w-7" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading font-bold">Sell one thing you&rsquo;re not using</h2>
              <p className="text-sm text-muted-foreground">
                A calculator, a lab coat, last sem&rsquo;s cycle. Takes about 30 seconds, and
                it&rsquo;s what makes this place worth opening for everyone else.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
          </div>
        </Link>
      )}

      {/* flex, not a fixed grid: a college with only two stats left a dead third
          column when the grid stayed three wide. */}
      {showCampusStats && (
        <div
          className="animate-fade-up glass flex items-center justify-around gap-2 rounded-3xl px-3 py-3"
          style={{ animationDelay: "30ms" }}
        >
          {campusStats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-heading text-xl font-bold text-primary">{s.n}</p>
              <p className="text-[11px] leading-tight text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/search"
        className="animate-fade-up press flex min-h-11 items-center gap-2.5 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground"
        style={{ animationDelay: "40ms" }}
      >
        <Search className="h-4 w-4" strokeWidth={2.2} />
        Search campus…
      </Link>

      {/* LIVELY L1 — proof that other people are here, above the feature grid.
          Every row is real; it renders nothing rather than pad a quiet campus. */}
      <Suspense fallback={<SkeletonSection />}>
        <CampusPulse />
      </Suspense>

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
                {/* LIVELY L2. "8 things for sale" is the smallest true number in
                    the database and it was the first thing a new student read.
                    Below a real shelf, lead with the people instead — equally
                    true, and it is the buyers that make listing here worth it.
                    The stock count returns once it is a number worth showing. */}
                {(listingCount ?? 0) >= 20 ? (
                  <>
                    <span className="font-semibold text-primary">{listingCount}</span> thing
                    {listingCount === 1 ? "" : "s"} for sale on campus right now
                  </>
                ) : (studentCount ?? 0) >= 10 ? (
                  <>
                    Buy, sell and rent with{" "}
                    <span className="font-semibold text-primary">{studentCount}</span> verified
                    students from your college
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
                <h2 className="flex flex-wrap items-center gap-x-2 font-heading font-bold">
                  {s.name}
                  {/* Members can already read this roster; showing the size tells
                      someone inside a 30-person room that it is a 30-person room. */}
                  {(membersBySpace.get(s.id) ?? 0) > 1 && (
                    <span className="text-xs font-semibold text-primary">
                      {membersBySpace.get(s.id)} members
                    </span>
                  )}
                </h2>
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
        {/* "Ask someone who's already inside" was a dead end for anyone who knew
            nobody inside — which is most people. They can now ask directly, for
            whichever circle is theirs, and a person decides (0088). */}
        {(mySpaces ?? []).length === 0 && joinableSpaces.length > 0 && (
          <div className="animate-fade-up glass flex flex-col gap-3 rounded-3xl p-4" style={{ animationDelay: "180ms" }}>
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-tint-rose text-2xl">
                🔒
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading font-bold">Her Circle &amp; His Circle</h2>
                <p className="text-sm text-muted-foreground">
                  Members-only spaces, invisible to everyone else.
                </p>
              </div>
            </div>
            <RequestJoin spaces={joinableSpaces} />
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

        {FEATURES.map((m, i) => {
          // Keyed by href, not by array position or label, so a count can never
          // end up on the wrong card if this list is reordered or renamed.
          const badge = FEATURE_COUNTS[m.href];
          return (
            <Link key={m.short} href={m.href} className="animate-fade-up press" style={{ animationDelay: `${260 + i * 20}ms` }}>
              <div className="glass press-glow flex items-center gap-4 rounded-3xl p-4">
                <span className="relative shrink-0">
                  <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${m.tint}`}>
                    <m.icon className="h-7 w-7" strokeWidth={2} />
                  </span>
                  {badge != null && badge > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-bg bg-primary px-1 text-[11px] font-bold text-on-primary"
                    >
                      {badge}
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading font-bold">{m.short}</h2>
                  <p className="text-sm text-muted-foreground">
                    {badge != null && badge > 0 && m.href === "/toolbox"
                      ? `${badge} free tools and resources, all legal`
                      : m.blurb}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
              </div>
            </Link>
          );
        })}
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
