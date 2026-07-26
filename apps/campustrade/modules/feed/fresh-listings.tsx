import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Section } from "@suite/ui";
import { rupees } from "@/modules/marketplace/format";

type Listing = { id: string; title: string; price: number; images: string[]; category: string };

// "Weighted toward categories the user has saved, posted in, or opened
// recently" — there's no wishlist/save or view-tracking table, so the only
// existing signal is what the user has posted themselves. Heuristic: pull
// the newest 20 listings, then stable-sort so ones matching the user's own
// posted categories float to the top of that window, and show the top 6.
// No new tracking infra, per the phase brief.
function weighByOwnCategories(fresh: Listing[], myCategories: Set<string>) {
  return [...fresh]
    .map((l, i) => ({ l, i }))
    .sort((a, b) => {
      const boost = Number(myCategories.has(b.l.category)) - Number(myCategories.has(a.l.category));
      return boost !== 0 ? boost : a.i - b.i; // stable within same weight
    })
    .slice(0, 6)
    .map((x) => x.l);
}

export default async function FreshListings() {
  let weighted: Listing[] = [];
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [{ data: mine }, { data: fresh }] = await Promise.all([
      supabase.from("listings").select("category").eq("seller_id", user.id),
      supabase
        .from("listings")
        .select("id, title, price, images, category")
        .eq("status", "available")
        .neq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (!fresh?.length) return null;
    weighted = weighByOwnCategories(fresh, new Set((mine ?? []).map((l) => l.category)));
  } catch {
    return null;
  }

  if (!weighted.length) return null;

  return (
    <Section title="Fresh on campus" action={{ href: "/marketplace", label: "Browse all" }}>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {weighted.map((l) => (
          <Link key={l.id} href={`/marketplace/${l.id}`} className="press w-36 shrink-0">
            <Card className="h-full p-2">
              <div className="aspect-square w-full overflow-hidden rounded-xl bg-muted">
                {l.images?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.images[0]} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <p className="mt-1.5 truncate text-sm font-medium">{l.title}</p>
              <p className="text-sm font-bold text-primary">{rupees(Number(l.price))}</p>
            </Card>
          </Link>
        ))}
      </div>
    </Section>
  );
}
