import { Tag } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import EmptyState from "@/components/empty-state";

export default async function DealsPage() {
  const { supabase } = await requireUser();
  const { data: merchants } = await supabase
    .from("merchants")
    .select("id, name, category, logo_url, offer_text, details, link_or_contact")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold">🏷️ Deals</h1>
        <p className="text-sm text-muted-foreground">Local offers for students on campus.</p>
      </div>

      {!merchants?.length ? (
        <EmptyState icon={Tag} tint="green" title="No active deals yet">
          <p className="text-sm text-muted-foreground">Check back soon.</p>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {merchants.map((m, i) => (
            <Card
              key={m.id}
              className="animate-fade-up flex gap-3"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              {m.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">🏪</span>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{m.name}</h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{m.category}</span>
                </div>
                <p className="text-sm font-medium text-accent">{m.offer_text}</p>
                {m.details && <p className="text-sm text-muted-foreground">{m.details}</p>}
                {m.link_or_contact && (
                  <a href={m.link_or_contact} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-medium text-primary hover:underline">
                    Get this deal →
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
