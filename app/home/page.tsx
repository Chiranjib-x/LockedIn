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
import { SkeletonSection } from "@/components/skeleton";
import NowStrip from "@/modules/feed/now-strip";
import ClubsStrip from "@/modules/feed/clubs-strip";
import RecentChats from "@/modules/feed/recent-chats";
import RenewalsSoon from "@/modules/feed/renewals-soon";
import FreshListings from "@/modules/feed/fresh-listings";
import BoardHighlights from "@/modules/feed/board-highlights";
import GroupBuysClosing from "@/modules/feed/group-buys-closing";
import FreeWindow from "@/modules/feed/free-window";
import QuantaBanner from "@/modules/communities/quanta-banner";
import { InstallPrompt } from "@/components/pwa";

// Personalized home feed (Phase 26, pulled forward). The chip row below is
// the "compact module nav" the phase brief asks for — direct access to any
// module stays one tap away even with the full grid gone. Each feed section
// is its own Suspense boundary + owns its error handling internally, so one
// broken section streams in empty instead of blanking the page.

// Tinted tiles per docs/design/directions.png — six token hues cycling, so
// neighbouring tiles never share a colour and the grid scans by hue.
// Marketplace + Gate are flagship hero cards; Cabs/Group-Buy/Pools are the
// live-stat row. The grid covers the rest (Pools tile kept for "my pools").
const MODULES: { short: string; href: string; icon: LucideIcon; tint: string }[] = [
  { short: "Board", href: "/board", icon: Pin, tint: "bg-tint-rose text-tint-rose-fg" },
  { short: "Events", href: "/events", icon: PartyPopper, tint: "bg-tint-violet text-tint-violet-fg" },
  { short: "Pools", href: "/subscriptions", icon: Tv, tint: "bg-tint-teal text-tint-teal-fg" },
  { short: "Match", href: "/matches", icon: Target, tint: "bg-tint-violet text-tint-violet-fg" },
  { short: "Clubs", href: "/communities", icon: Users, tint: "bg-tint-blue text-tint-blue-fg" },
  { short: "Crews", href: "/crews", icon: Users2, tint: "bg-tint-rose text-tint-rose-fg" },
  { short: "Toolbox", href: "/toolbox", icon: Wrench, tint: "bg-tint-amber text-tint-amber-fg" },
  { short: "Deals", href: "/deals", icon: Tag, tint: "bg-tint-green text-tint-green-fg" },
  { short: "Timetable", href: "/timetable", icon: CalendarDays, tint: "bg-tint-violet text-tint-violet-fg" },
  { short: "Study", href: "/study-groups", icon: BookOpen, tint: "bg-tint-teal text-tint-teal-fg" },
];

function greeting() {
  // ponytail: server-local hour ≈ IST for this deployment's audience
  const h = new Date().getHours();
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
      supabase.from("spaces").select("id, name, emoji"),
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

      {/* Flagship showcase — the features that sell the app get hero cards
          with live numbers; everything else stays one tap away in the grid. */}
      <div className="flex flex-col gap-3">
        <Link href="/gate" className="animate-fade-up press" style={{ animationDelay: "60ms" }}>
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

        <Link href="/marketplace" className="animate-fade-up press" style={{ animationDelay: "120ms" }}>
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

        {/* Second-tier live stats: cabs · group-buys · pools */}
        <div className="animate-fade-up grid grid-cols-3 gap-3" style={{ animationDelay: "200ms" }}>
          {[
            { href: "/cabs", icon: CarTaxiFront, tint: "bg-tint-rose text-tint-rose-fg", n: tripCount ?? 0, label: (tripCount ?? 0) === 1 ? "trip to join" : "trips to join" },
            { href: "/group-buy", icon: Handshake, tint: "bg-tint-amber text-tint-amber-fg", n: orderCount ?? 0, label: (orderCount ?? 0) === 1 ? "order open" : "orders open" },
            { href: "/subscriptions/browse", icon: Tv, tint: "bg-tint-teal text-tint-teal-fg", n: poolCount ?? 0, label: (poolCount ?? 0) === 1 ? "Netflix/Spotify seat" : "Netflix/Spotify seats" },
          ].map((s) => (
            <Link key={s.href} href={s.href} className="press">
              <div className="glass press-glow flex flex-col items-center gap-1 rounded-3xl px-2 py-3 text-center">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.tint}`}>
                  <s.icon className="h-4.5 w-4.5" strokeWidth={2} />
                </span>
                <span className="font-heading text-lg leading-tight font-bold text-primary">{s.n}</span>
                <span className="text-[10px] leading-tight font-medium text-muted-foreground">{s.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div
        className="animate-fade-up grid grid-cols-4 gap-3"
        style={{ animationDelay: "220ms" }}
      >
        {MODULES.map((m) => (
          <Link key={m.short} href={m.href} className="press flex flex-col items-center gap-1">
            <span className={`press-glow flex h-14 w-14 items-center justify-center rounded-2xl ${m.tint}`}>
              <m.icon className="h-6 w-6" strokeWidth={2} />
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">{m.short}</span>
          </Link>
        ))}
      </div>

      <Suspense fallback={<SkeletonSection />}>
        <ClubsStrip />
      </Suspense>

      <InstallPrompt />

      <Suspense fallback={<SkeletonSection />}>
        <NowStrip />
      </Suspense>

      <Suspense fallback={<SkeletonSection />}>
        <FreeWindow />
      </Suspense>

      <QuantaBanner />

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
