import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CarTaxiFront,
  Handshake,
  MapPin,
  Pin,
  Search,
  ShoppingBag,
  Tag,
  Target,
  Tv,
  Users2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { istNow } from "@/modules/timetable/helpers";
import { SkeletonSection } from "@/components/skeleton";
import NowStrip from "@/modules/feed/now-strip";
import RecentChats from "@/modules/feed/recent-chats";
import RenewalsSoon from "@/modules/feed/renewals-soon";
import FreshListings from "@/modules/feed/fresh-listings";
import BoardHighlights from "@/modules/feed/board-highlights";
import GroupBuysClosing from "@/modules/feed/group-buys-closing";
import { InstallPrompt } from "@/components/pwa";

// Personalized home feed (Phase 26, pulled forward). The chip row below is
// the "compact module nav" the phase brief asks for — direct access to any
// module stays one tap away even with the full grid gone. Each feed section
// is its own Suspense boundary + owns its error handling internally, so one
// broken section streams in empty instead of blanking the page.

// Every feature gets a flagship-style card (icon chip + title + blurb +
// arrow) — same visual weight as Marketplace/Gate Runner, no smaller tiles.
const FEATURES: { short: string; href: string; icon: LucideIcon; tint: string; blurb: string }[] = [
  { short: "Board", href: "/board", icon: Pin, tint: "bg-tint-rose text-tint-rose-fg", blurb: "Lost & found and campus notices." },
  { short: "Match", href: "/matches", icon: Target, tint: "bg-tint-violet text-tint-violet-fg", blurb: "Find a compatible roommate." },
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
  const [{ data: profile }, { data: mySpaces }, { count: listingCount }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("name, colleges(name)")
        .eq("id", user.id)
        .single<{ name: string; colleges: { name: string } | null }>(),
      // RLS: only spaces the user is a member of come back. Everyone else
      // never sees this section exists.
      supabase.from("spaces").select("id, name, emoji"),
      // Live flagship stat — RLS-scoped to the user's college.
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

        {(mySpaces ?? []).map((s) => (
          <Link key={s.id} href={`/spaces/${s.id}`} className="animate-fade-up press" style={{ animationDelay: "180ms" }}>
            <div className="urgent-border glass press-glow flex items-center gap-4 rounded-3xl p-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-tint-rose text-2xl">
                {s.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading font-bold">{s.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {/* ponytail: name-based copy; per-space tagline column if spaces multiply */}
                  {s.name.toLowerCase().includes("closet")
                    ? "Rent out fest fits — dresses, jewellery, heels — girls only."
                    : "Rent or sell your niche stuff — consoles, kits, gear — boys only."}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
            </div>
          </Link>
        ))}

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

      <InstallPrompt />

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
    </main>
  );
}
