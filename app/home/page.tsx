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
  Pin,
  Search,
  ShoppingBag,
  Tag,
  Target,
  Tv,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { SkeletonSection } from "@/components/skeleton";
import NowStrip from "@/modules/feed/now-strip";
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
const MODULES: { short: string; href: string; icon: LucideIcon; tint: string }[] = [
  { short: "Market", href: "/marketplace", icon: ShoppingBag, tint: "bg-tint-blue text-tint-blue-fg" },
  { short: "Board", href: "/board", icon: Pin, tint: "bg-tint-rose text-tint-rose-fg" },
  { short: "Group-Buy", href: "/group-buy", icon: Handshake, tint: "bg-tint-amber text-tint-amber-fg" },
  { short: "Pools", href: "/subscriptions", icon: Tv, tint: "bg-tint-teal text-tint-teal-fg" },
  { short: "Match", href: "/matches", icon: Target, tint: "bg-tint-violet text-tint-violet-fg" },
  { short: "Gate", href: "/gate", icon: Footprints, tint: "bg-tint-green text-tint-green-fg" },
  { short: "Groups", href: "/communities", icon: Users, tint: "bg-tint-blue text-tint-blue-fg" },
  { short: "Toolbox", href: "/toolbox", icon: Wrench, tint: "bg-tint-amber text-tint-amber-fg" },
  { short: "Deals", href: "/deals", icon: Tag, tint: "bg-tint-green text-tint-green-fg" },
  { short: "Cabs", href: "/cabs", icon: CarTaxiFront, tint: "bg-tint-rose text-tint-rose-fg" },
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
  const [{ data: profile }, { data: mySpaces }] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, colleges(name)")
      .eq("id", user.id)
      .single<{ name: string; colleges: { name: string } | null }>(),
    // RLS: only spaces the user is a member of come back. Everyone else
    // never sees this section exists.
    supabase.from("spaces").select("id, name, emoji"),
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

      <div
        className="animate-fade-up grid grid-cols-4 gap-3"
        style={{ animationDelay: "60ms" }}
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

      <InstallPrompt />

      <Suspense fallback={<SkeletonSection />}>
        <NowStrip />
      </Suspense>

      <Suspense fallback={<SkeletonSection />}>
        <FreeWindow />
      </Suspense>

      <QuantaBanner />

      {(mySpaces?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-3">
          {mySpaces!.map((s) => (
            <Link key={s.id} href={`/spaces/${s.id}`} className="animate-fade-up press">
              <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-accent/5 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">
                      {s.emoji} {s.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">Members-only space</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary" strokeWidth={2.2} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

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
