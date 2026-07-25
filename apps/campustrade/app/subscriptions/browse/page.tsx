import Link from "next/link";
import { Tv } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { rupees } from "@/modules/marketplace/format";
import { KarmaBadge } from "@/modules/karma/badge";
import EmptyState from "@/components/empty-state";

// Phase 31 discovery board: pools that opened their seats to campus.
// service_name is freeform text, so there are no category chips — plain
// recency list until volume demands filters.

export default async function BrowsePoolsPage() {
  const { supabase, user } = await requireUser();

  const [{ data: pools }, { data: myMemberships }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id, service_name, total_cost, seats, billing_cycle, renewal_date, open_seats, owner_id, owner:profiles!subscriptions_owner_id_fkey(name, karma)")
      .eq("is_discoverable", true)
      .gt("open_seats", 0)
      .order("created_at", { ascending: false }),
    supabase.from("subscription_members").select("subscription_id").eq("user_id", user.id),
  ]);

  const mine = new Set((myMemberships ?? []).map((m) => m.subscription_id));
  const list = (pools ?? []).filter((p) => p.owner_id !== user.id && !mine.has(p.id));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Open pools</h1>
        <Link href="/subscriptions" className="text-sm font-medium text-primary hover:underline">
          My pools
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Grab a seat in someone’s subscription — pay only your share, prorated from the day you join.
      </p>

      {list.length === 0 ? (
        <EmptyState icon={Tv} tint="teal" title="No open pools right now">
          <p className="text-sm text-muted-foreground">Own a subscription? List your spare seats.</p>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((p) => {
            const perSeat = Math.ceil(Number(p.total_cost) / p.seats);
            const owner = p.owner as unknown as { name: string; karma: number } | null;
            return (
              <Link key={p.id} href={`/subscriptions/${p.id}`} className="press">
                <Card className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.service_name}</p>
                    <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      {owner?.name ?? "Student"} <KarmaBadge karma={owner?.karma ?? 0} /> · renews{" "}
                      {new Date(p.renewal_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-heading font-bold text-primary">{rupees(perSeat)}<span className="text-xs font-normal">/{p.billing_cycle === "monthly" ? "mo" : "yr"}</span></p>
                    {/* seat dots: ● taken · ○ open */}
                    <p className="flex items-center justify-end gap-1" title={`${p.open_seats} of ${p.seats} seats open`}>
                      {Array.from({ length: Math.min(p.seats, 8) }).map((_, i) => (
                        <span
                          key={i}
                          className={`h-2 w-2 rounded-full ${
                            i < p.seats - p.open_seats ? "bg-muted-foreground/50" : "glow-primary bg-accent"
                          }`}
                        />
                      ))}
                    </p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
