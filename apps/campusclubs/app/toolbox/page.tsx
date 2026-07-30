import { Wrench } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card } from "@suite/ui";
import { EmptyState } from "@suite/ui";

type Item = {
  id: string;
  name: string;
  url: string;
  tagline: string | null;
  category: string | null;
  logo_url: string | null;
};

// Sections in the order a student is most likely to need them. Anything not
// listed — older entries, anything added later from /admin/showcase — sorts to
// the end alphabetically rather than disappearing.
const CATEGORY_ORDER = [
  "Academic papers",
  "Courses",
  "Books",
  "Software",
  "Free media",
  "Games",
  "Project assets",
  "Privacy & security",
];

export default async function ToolboxPage() {
  const { supabase } = await requireUser();
  const { data: items } = await supabase
    .from("showcase_items")
    .select("id, name, url, tagline, category, logo_url")
    .eq("is_active", true)
    .order("name")
    .returns<Item[]>();

  // Grouped, because a flat wall of 30+ links is a list nobody reads.
  const groups = new Map<string, Item[]>();
  for (const item of items ?? []) {
    const key = item.category?.trim() || "Other";
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  const sections = [...groups.entries()].sort(([a], [b]) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });

  const total = items?.length ?? 0;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold">🧰 Toolbox</h1>
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? `${total} free tools, sites and resources — every one of them legal and free to use.`
            : "Apps and sites worth knowing about, picked for this campus."}
        </p>
      </div>

      {total === 0 ? (
        <EmptyState icon={Wrench} tint="amber" title="Nothing here yet">
          <p className="text-sm text-muted-foreground">Check back soon.</p>
        </EmptyState>
      ) : (
        sections.map(([category, list], sectionIndex) => (
          <section key={category} className="flex flex-col gap-3">
            <h2 className="animate-fade-up text-sm font-semibold text-muted-foreground">
              {category} · {list.length}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {list.map((item, i) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="animate-fade-up press"
                  style={{ animationDelay: `${Math.min(sectionIndex * 2 + i, 8) * 40}ms` }}
                >
                  <Card className="flex h-full gap-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
                    {item.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-lg">
                        🔗
                      </span>
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{item.name}</h3>
                      {item.tagline && <p className="text-sm text-muted-foreground">{item.tagline}</p>}
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
