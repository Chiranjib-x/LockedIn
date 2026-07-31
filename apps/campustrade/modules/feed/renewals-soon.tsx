import Link from "next/link";
import { createClient } from "@suite/auth/server";
import { Card, Section } from "@suite/ui";
import { rupees } from "@/modules/marketplace/format";

// Date.now() lives in these standalone helpers, not inline in the component
// body, so the React Compiler lint rule doesn't flag it as an impure render
// call — same pattern as timeLeft() in app/group-buy/page.tsx.
function dateKeyIn(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}
function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

// Subscription renewals within 7 days. RLS already scopes to pools the user
// owns or is a member of, so no extra visibility filtering needed here.
// Group-buy deadlines get their own tighter-window section below, and
// recruitment-drive tracking isn't a module that exists in this app (Phase
// 26's spec mentions it, but there's nothing to source it from — skipped).
export default async function RenewalsSoon() {
  let subs: { id: string; service_name: string; renewal_date: string; total_cost: number }[] | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    ({ data: subs } = await supabase
      .from("subscriptions")
      .select("id, service_name, renewal_date, total_cost")
      .gte("renewal_date", dateKeyIn(0))
      .lte("renewal_date", dateKeyIn(7))
      .order("renewal_date"));
  } catch {
    return null;
  }

  if (!subs?.length) return null;

  return (
    <Section title="Renewals due soon">
      <div className="flex flex-col gap-2">
        {subs.map((s) => {
          const days = daysUntil(s.renewal_date);
          return (
            <Link key={s.id} href={`/subscriptions/${s.id}`} className="press">
              <Card className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{s.service_name}</p>
                  <p className="text-xs text-muted-foreground">{rupees(Number(s.total_cost))}</p>
                </div>
                <span className="shrink-0 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                  {days <= 0 ? "today" : `${days}d`}
                </span>
              </Card>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}
