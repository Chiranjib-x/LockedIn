import { Wrench } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import EmptyState from "@/components/empty-state";

export default async function ToolboxPage() {
  const { supabase } = await requireUser();
  const { data: items } = await supabase
    .from("showcase_items")
    .select("id, name, url, tagline, category, logo_url")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold">🧰 Toolbox</h1>
        <p className="text-sm text-muted-foreground">Apps and sites worth knowing about, picked for this campus.</p>
      </div>

      {!items?.length ? (
        <EmptyState icon={Wrench} tint="amber" title="Nothing here yet">
          <p className="text-sm text-muted-foreground">Check back soon.</p>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item, i) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="animate-fade-up press"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <Card className="flex h-full gap-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
                {item.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-lg">🔗</span>
                )}
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{item.name}</h2>
                  {item.tagline && <p className="text-sm text-muted-foreground">{item.tagline}</p>}
                  <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {item.category}
                  </span>
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
