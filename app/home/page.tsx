import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";

const MODULES: {
  name: string;
  desc: string;
  href: string;
  emoji: string;
  live: boolean;
}[] = [
  { name: "Marketplace", desc: "Buy & sell within campus", href: "/marketplace", emoji: "🛍️", live: false },
  { name: "Lost & Found + Notices", desc: "The campus board", href: "/board", emoji: "📌", live: false },
  { name: "Group-Buy", desc: "Pool orders, split via UPI", href: "/group-buy", emoji: "🤝", live: false },
  { name: "Subscriptions", desc: "Share OTT & tool costs", href: "/subscriptions", emoji: "📺", live: false },
  { name: "Roommate Match", desc: "Find your people", href: "/matches", emoji: "🎯", live: false },
];

export default async function HomePage() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, colleges(name)")
    .eq("id", user.id)
    .single<{ name: string; colleges: { name: string } | null }>();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">
          Hey{profile?.name ? ` ${profile.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-sm text-muted-foreground">{profile?.colleges?.name}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MODULES.map((m) =>
          m.live ? (
            <Link key={m.name} href={m.href}>
              <Card className="h-full transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
                <span className="text-2xl">{m.emoji}</span>
                <h2 className="mt-1 font-semibold">{m.name}</h2>
                <p className="text-sm text-muted-foreground">{m.desc}</p>
              </Card>
            </Link>
          ) : (
            <Card key={m.name} className="h-full opacity-70">
              <span className="text-2xl grayscale">{m.emoji}</span>
              <h2 className="mt-1 font-semibold">{m.name}</h2>
              <p className="text-sm text-muted-foreground">{m.desc}</p>
              <span className="mt-2 inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Coming soon
              </span>
            </Card>
          )
        )}
      </div>
    </main>
  );
}
