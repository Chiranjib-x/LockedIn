import Link from "next/link";
import { Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { EmptyState } from "@suite/ui";
import FilterBar from "@/modules/marketplace/filter-bar";
import ListingCard from "@/modules/marketplace/listing-card";
import { blockedIds, notInList } from "@/modules/moderation/blocks";
import SaveSearchButton from "@/modules/search/save-search-button";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; ltype?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { q, category, sort, ltype } = await searchParams;

  const blocked = await blockedIds(supabase, user.id);

  let query = supabase
    .from("listings")
    .select("id, title, price, category, images, status, listing_type, rental_status")
    .eq("status", "available")
    .is("space_id", null) // space listings live only inside their space
    .not("seller_id", "in", notInList(blocked));

  if (ltype === "sell" || ltype === "rent") query = query.eq("listing_type", ltype);
  if (category) query = query.eq("category", category);
  // strip PostgREST or() grammar chars — a search like "shoes, size 9" must not 400 the query
  const safeQ = q?.replace(/[,()]/g, " ");
  if (safeQ?.trim()) query = query.or(`title.ilike.%${safeQ}%,description.ilike.%${safeQ}%`);

  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc") query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data: listings } = await query.limit(60);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Marketplace</h1>
        <span className="flex items-center gap-3 text-sm font-medium text-primary">
          <Link href="/marketplace/requests" className="hover:underline">
            Requests
          </Link>
          <Link href="/marketplace/mine" className="hover:underline">
            My listings
          </Link>
        </span>
      </div>

      <FilterBar />
      <SaveSearchButton module="marketplace" query={q ?? ""} filters={category ? { category } : {}} />

      {!listings?.length ? (
        <EmptyState icon={Search} tint="blue" title={q || category ? "Nothing matches" : "No listings yet"}>
          <p className="text-sm text-muted-foreground">
            {q || category ? "Try a different search or category." : "Be the first to post something."}
          </p>
        </EmptyState>
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
