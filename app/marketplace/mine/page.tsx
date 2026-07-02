import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import ListingActions from "@/modules/marketplace/listing-actions";
import { rupees } from "@/modules/marketplace/format";

export default async function MyListingsPage() {
  const { supabase, user } = await requireUser();
  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My listings</h1>
        <Link
          href="/marketplace/new"
          className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          ＋ New
        </Link>
      </div>

      {!listings?.length ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="text-3xl">🛍️</span>
          <p className="font-medium">No listings yet</p>
          <p className="text-sm text-muted-foreground">Post your first item — it takes a minute.</p>
          <Link href="/marketplace/new" className="mt-2 text-sm font-semibold text-primary hover:underline">
            Post a listing →
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {listings.map((l, i) => (
            <Card
              key={l.id}
              className={`animate-fade-up ${l.status === "sold" ? "opacity-60" : ""}`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex gap-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {l.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">📦</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="truncate font-semibold">{l.title}</h2>
                    {l.status === "sold" && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">Sold</span>
                    )}
                  </div>
                  <p className="font-heading text-lg font-bold text-primary">{rupees(l.price)}</p>
                  <p className="text-xs text-muted-foreground">{l.category}</p>
                </div>
              </div>
              <div className="mt-3">
                <ListingActions id={l.id} sold={l.status === "sold"} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
