import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";

// Home feed structure follows docs/design/directions.png. The "Up Next" class
// card lands with Phase 24–25, "Due soon" with Phase 26, search with Phase 27.

const MODULES: {
  name: string;
  short: string;
  desc: string;
  href: string;
  emoji: string;
  live: boolean;
}[] = [
  { name: "Marketplace", short: "Market", desc: "Buy & sell within campus", href: "/marketplace", emoji: "🛍️", live: true },
  { name: "Lost & Found + Notices", short: "Board", desc: "The campus board", href: "/board", emoji: "📌", live: false },
  { name: "Group-Buy", short: "Group-Buy", desc: "Pool orders, split via UPI", href: "/group-buy", emoji: "🤝", live: false },
  { name: "Subscriptions", short: "Pools", desc: "Share OTT & tool costs", href: "/subscriptions", emoji: "📺", live: false },
  { name: "Roommate Match", short: "Match", desc: "Find your people", href: "/matches", emoji: "🎯", live: false },
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, colleges(name)")
    .eq("id", user.id)
    .single<{ name: string; colleges: { name: string } | null }>();

  const firstName = profile?.name?.split(" ")[0] ?? "";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <div className="animate-fade-up">
        <p className="text-sm text-muted-foreground">{greeting()}</p>
        <h1 className="text-3xl font-bold">{firstName || "Hey"}</h1>
        {profile?.colleges?.name && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            📍 {profile.colleges.name}
          </span>
        )}
      </div>

      {/* Module chip row per design */}
      <div
        className="animate-fade-up flex gap-2 overflow-x-auto pb-1"
        style={{ animationDelay: "60ms" }}
      >
        {MODULES.map((m) => (
          <span
            key={m.short}
            className={`flex min-w-16 flex-col items-center gap-1 ${m.live ? "" : "opacity-50"}`}
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-2xl ${m.live ? "" : "grayscale"}`}
            >
              {m.emoji}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">{m.short}</span>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MODULES.map((m, i) =>
          m.live ? (
            <Link
              key={m.name}
              href={m.href}
              className="animate-fade-up"
              style={{ animationDelay: `${120 + i * 60}ms` }}
            >
              <Card className="h-full transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
                <span className="text-2xl">{m.emoji}</span>
                <h2 className="mt-1 font-semibold">{m.name}</h2>
                <p className="text-sm text-muted-foreground">{m.desc}</p>
              </Card>
            </Link>
          ) : (
            <div
              key={m.name}
              className="animate-fade-up"
              style={{ animationDelay: `${120 + i * 60}ms` }}
            >
              <Card className="h-full border-dashed bg-transparent">
                <span className="text-2xl opacity-60 grayscale">{m.emoji}</span>
                <h2 className="mt-1 font-semibold text-muted-foreground">{m.name}</h2>
                <p className="text-sm text-muted-foreground/70">{m.desc}</p>
                <span className="mt-2 inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  Coming soon
                </span>
              </Card>
            </div>
          )
        )}
      </div>
    </main>
  );
}
