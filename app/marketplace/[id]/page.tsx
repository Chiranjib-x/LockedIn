import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import Gallery from "@/modules/marketplace/gallery";
import { rupees } from "@/modules/marketplace/format";
import { openChat } from "@/modules/chat/actions";
import { RatingBadge } from "@/modules/ratings/stars";
import { getRating } from "@/modules/ratings/get-rating";
import { KarmaBadge } from "@/modules/karma/badge";
import ReportSheet from "@/modules/moderation/report-sheet";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { id } = await params;

  const { data: listing } = await supabase
    .from("listings")
    .select("*, seller:profiles!listings_seller_id_fkey(id, name, hostel_block, contact_pref, karma)")
    .eq("id", id)
    .single();

  if (!listing) notFound();
  const seller = listing.seller as {
    id: string;
    name: string;
    hostel_block: string | null;
    contact_pref: string | null;
    karma: number;
  };
  const isMine = seller.id === user.id;
  const sellerRating = await getRating(seller.id);

  async function startChat() {
    "use server";
    await openChat(seller.id, "listing", listing.id);
  }

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <Link href="/marketplace" className="text-sm text-muted-foreground hover:text-foreground">
          ← Marketplace
        </Link>
        {!isMine && <ReportSheet targetType="listing" targetId={listing.id} authorId={seller.id} />}
      </div>

      <Gallery images={listing.images ?? []} title={listing.title} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{listing.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-0.5">{listing.category}</span>
            {listing.condition && <span className="rounded-full bg-muted px-2 py-0.5">{listing.condition}</span>}
          </p>
        </div>
        <p className="font-heading text-2xl font-bold text-primary">{rupees(listing.price)}</p>
      </div>

      {listing.status === "sold" && (
        <p className="rounded-2xl bg-muted p-3 text-center text-sm font-medium">This item has been sold.</p>
      )}

      {listing.description && (
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">{listing.description}</p>
      )}

      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-heading font-bold text-primary">
          {seller.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{seller.name || "Student"}</p>
            <KarmaBadge karma={seller.karma ?? 0} />
          </div>
          <RatingBadge avg={sellerRating.avg} count={sellerRating.count} />
        </div>
      </div>

      {isMine ? (
        <Link
          href={`/marketplace/${listing.id}/edit`}
          className="press flex min-h-12 items-center justify-center rounded-full border border-border bg-card px-6 font-semibold"
        >
          Edit your listing
        </Link>
      ) : (
        listing.status === "available" && (
          <form action={startChat}>
            <button
              type="submit"
              className="press flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 font-semibold text-on-primary shadow-lg shadow-primary/25"
            >
              Chat with seller
            </button>
          </form>
        )
      )}
    </main>
  );
}
