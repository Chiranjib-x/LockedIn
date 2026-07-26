import Link from "next/link";
import { Handshake } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card } from "@suite/ui";
import { EmptyState } from "@suite/ui";

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  closed: "Ordering",
  collecting: "Collecting ₹",
  completed: "Done",
};

function timeLeft(deadline: string) {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return "closing";
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60000))}m left`;
  if (h < 24) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
}

export default async function GroupBuyPage() {
  const { supabase, user } = await requireUser();

  const { data: orders } = await supabase
    .from("group_orders")
    .select("*, organizer:profiles!group_orders_organizer_id_fkey(name), items:group_order_items(user_id)")
    .neq("status", "completed")
    .order("deadline", { ascending: true })
    .limit(40);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Group-buys</h1>
        <Link
          href="/group-buy/new"
          className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          ＋ Start one
        </Link>
      </div>

      {!orders?.length ? (
        <EmptyState icon={Handshake} tint="amber" title="No open group-buys">
          <p className="text-sm text-muted-foreground">
            Pooling an order splits the delivery fee — start one and share it.
          </p>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o, i) => {
            const joined = (o.items as { user_id: string }[]).some((it) => it.user_id === user.id);
            return (
              <Link key={o.id} href={`/group-buy/${o.id}`} className="animate-fade-up press" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                <Card className="transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${o.status === "open" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                    {joined && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">You’re in</span>}
                    <span className="ml-auto text-xs text-muted-foreground">{o.status === "open" ? timeLeft(o.deadline) : ""}</span>
                  </div>
                  <h2 className="mt-1 font-semibold">{o.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {o.category} · by {(o.organizer as { name: string })?.name ?? "someone"} ·{" "}
                    {(o.items as unknown[]).length} joined
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
