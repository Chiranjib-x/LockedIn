import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Section } from "@/components/ui";

// Date.now() lives in these standalone helpers (not inline in the component
// body) so the React Compiler lint rule doesn't flag it as an impure render
// call — same pattern as timeLeft() in app/group-buy/page.tsx.
function isoHoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 3600000).toISOString();
}
function hoursUntil(iso: string) {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3600000));
}

export default async function GroupBuysClosing() {
  let orders: { id: string; title: string; category: string; deadline: string }[] | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    ({ data: orders } = await supabase
      .from("group_orders")
      .select("id, title, category, deadline")
      .eq("status", "open")
      .lte("deadline", isoHoursFromNow(48))
      .order("deadline"));
  } catch {
    return null;
  }

  if (!orders?.length) return null;

  return (
    <Section title="Group-buys closing soon">
      <div className="flex flex-col gap-2">
        {orders.map((o) => {
          const left = hoursUntil(o.deadline);
          return (
            <Link key={o.id} href={`/group-buy/${o.id}`} className="press">
              <Card className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{o.title}</p>
                  <p className="text-xs text-muted-foreground">{o.category}</p>
                </div>
                <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                  {left <= 1 ? "closing" : `${left}h left`}
                </span>
              </Card>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}
