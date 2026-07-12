import Link from "next/link";
import {
  Award,
  Bell,
  Footprints,
  Handshake,
  MessageCircle,
  Sparkles,
  Star,
  Target,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import BackLink from "@/components/back-link";
import EmptyState from "@/components/empty-state";

// Per-type icon + tint, matching the module hues (REVAMP-PLAN Phase 5).
const KINDS: Record<string, { Icon: LucideIcon; cls: string }> = {
  group_buy: { Icon: Handshake, cls: "bg-tint-amber text-tint-amber-fg" },
  match: { Icon: Target, cls: "bg-tint-violet text-tint-violet-fg" },
  gate: { Icon: Footprints, cls: "bg-tint-green text-tint-green-fg" },
  space: { Icon: Sparkles, cls: "bg-tint-rose text-tint-rose-fg" },
  subscription: { Icon: Tv, cls: "bg-tint-teal text-tint-teal-fg" },
  rating: { Icon: Star, cls: "bg-tint-amber text-tint-amber-fg" },
  karma: { Icon: Award, cls: "bg-tint-violet text-tint-violet-fg" },
  chat: { Icon: MessageCircle, cls: "bg-tint-blue text-tint-blue-fg" },
};

function ago(ts: string) {
  const mins = (Date.now() - new Date(ts).getTime()) / 60000;
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

function dayLabel(ts: string) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
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

  let lastDay = "";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <BackLink href="/home" label="Home" />
      <h1 className="text-2xl font-bold">Notifications</h1>

      {!items?.length ? (
        <EmptyState icon={Bell} tint="blue" title="Nothing yet">
          <p className="text-sm text-muted-foreground">
            Order updates, matches, and pickups will land here.
          </p>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((n, i) => {
            const kind = KINDS[n.type] ?? { Icon: Bell, cls: "bg-tint-blue text-tint-blue-fg" };
            const day = dayLabel(n.created_at);
            const sep = day !== lastDay;
            lastDay = day;
            const inner = (
              <Card
                className={`animate-fade-up flex items-start gap-3 ${n.read ? "opacity-70" : "border-primary/30"}`}
                style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${kind.cls}`}>
                  <kind.Icon className="h-4.5 w-4.5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{n.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{ago(n.created_at)} ago</p>
                </div>
                {!n.read && <span className="glow-primary mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </Card>
            );
            return (
              <div key={n.id} className="flex flex-col gap-2">
                {sep && (
                  <p className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{day}</p>
                )}
                {n.link ? (
                  <Link href={n.link} className="press">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
