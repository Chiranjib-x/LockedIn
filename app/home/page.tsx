import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";

const MODULES: {
  name: string;
  desc: string;
  href: string;
  live: boolean;
}[] = [
  { name: "Marketplace", desc: "Buy & sell within campus", href: "/marketplace", live: false },
  { name: "Lost & Found + Notices", desc: "The campus board", href: "/board", live: false },
  { name: "Group-Buy", desc: "Pool orders, split via UPI", href: "/group-buy", live: false },
  { name: "Subscriptions", desc: "Share OTT & tool costs", href: "/subscriptions", live: false },
  { name: "Roommate Match", desc: "Find your people", href: "/matches", live: false },
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
        <p className="text-sm text-zinc-500">{profile?.colleges?.name}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MODULES.map((m) =>
          m.live ? (
            <Link key={m.name} href={m.href}>
              <Card className="h-full transition-colors hover:border-zinc-400">
                <h2 className="font-semibold">{m.name}</h2>
                <p className="text-sm text-zinc-500">{m.desc}</p>
              </Card>
            </Link>
          ) : (
            <Card key={m.name} className="h-full opacity-60">
              <h2 className="font-semibold">{m.name}</h2>
              <p className="text-sm text-zinc-500">{m.desc}</p>
              <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                Coming soon
              </span>
            </Card>
          )
        )}
      </div>
    </main>
  );
}
