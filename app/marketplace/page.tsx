import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import FilterBar from "@/modules/marketplace/filter-bar";
import ListingCard from "@/modules/marketplace/listing-card";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const { supabase } = await requireUser();
  const { q, category, sort } = await searchParams;

  let query = supabase
    .from("listings")
    .select("id, title, price, category, images, status")
    .eq("status", "available")
    .is("space_id", null); // space listings live only inside their space

  if (category) query = query.eq("category", category);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc") query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data: listings } = await query.limit(60);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Marketplace</h1>
        <Link href="/marketplace/mine" className="text-sm font-medium text-primary hover:underline">
          My listings
        </Link>
      </div>

      <FilterBar />

      {!listings?.length ? (
        <Card className="mt-2 flex flex-col items-center gap-2 py-10 text-center">
          <span className="text-3xl">🔍</span>
          <p className="font-medium">{q || category ? "Nothing matches" : "No listings yet"}</p>
          <p className="text-sm text-muted-foreground">
            {q || category ? "Try a different search or category." : "Be the first to post something."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {listings.map((l, i) => (
            <ListingCard key={l.id} listing={l} index={i} />
          ))}
        </div>
      )}
    </main>
  );
}
