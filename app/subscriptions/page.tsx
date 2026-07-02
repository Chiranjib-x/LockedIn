import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { rupees } from "@/modules/marketplace/format";

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

export default async function SubscriptionsPage() {
  const { supabase, user } = await requireUser();

  // RLS: only pools I own or belong to come back.
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("*, members:subscription_members(user_id, share_amount, paid_status)")
    .order("renewal_date", { ascending: true });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subscription pools</h1>
        <Link
          href="/subscriptions/new"
          className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          ＋ New pool
        </Link>
      </div>

      {!subs?.length ? (
        <Card className="mt-2 flex flex-col items-center gap-2 py-10 text-center">
          <span className="text-3xl">📺</span>
          <p className="font-medium">No pools yet</p>
          <p className="text-sm text-muted-foreground">
            Split Netflix, Spotify, or any subscription with people you trust.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {subs.map((s, i) => {
            const members = s.members as { user_id: string; share_amount: number; paid_status: boolean }[];
            const isOwner = s.owner_id === user.id;
            const mine = members.find((m) => m.user_id === user.id);
            const unpaid = members.filter((m) => !m.paid_status).length;
            const days = daysUntil(s.renewal_date);
            return (
              <Link key={s.id} href={`/subscriptions/${s.id}`} className="animate-fade-up press" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                <Card className="transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold">{s.service_name}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${days <= 5 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                      renews {days <= 0 ? "today" : `in ${days}d`}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {rupees(Number(s.total_cost))}/{s.billing_cycle === "monthly" ? "mo" : "yr"} ·{" "}
                    {isOwner ? `you own · ${unpaid} unpaid` : mine ? `your share ${rupees(Number(mine.share_amount))}${mine.paid_status ? " · paid ✓" : " · due"}` : ""}
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
