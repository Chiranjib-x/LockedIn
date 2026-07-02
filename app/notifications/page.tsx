import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";

const TYPE_EMOJI: Record<string, string> = {
  group_buy: "🤝",
  match: "🎯",
  gate: "🏃",
  space: "👗",
  subscription: "📺",
  rating: "⭐",
};

function ago(ts: string) {
  const mins = (Date.now() - new Date(ts).getTime()) / 60000;
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

export default async function NotificationsPage() {
  const { supabase, user } = await requireUser();

  const { data: items } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  // Opening the page marks everything read — no per-item ceremony.
  if (items?.some((n) => !n.read)) {
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-bold">Notifications</h1>

      {!items?.length ? (
        <Card className="mt-2 flex flex-col items-center gap-2 py-10 text-center">
          <span className="text-3xl">🔔</span>
          <p className="font-medium">Nothing yet</p>
          <p className="text-sm text-muted-foreground">
            Order updates, matches, and pickups will land here.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((n, i) => {
            const inner = (
              <Card
                className={`animate-fade-up flex items-start gap-3 ${n.read ? "opacity-70" : "border-primary/30"}`}
                style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
              >
                <span className="text-xl">{TYPE_EMOJI[n.type] ?? "🔔"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{n.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{ago(n.created_at)} ago</p>
                </div>
                {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </Card>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className="press">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </main>
  );
}
