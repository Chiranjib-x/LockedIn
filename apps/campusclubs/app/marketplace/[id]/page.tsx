import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@suite/auth/auth";
import Gallery from "@/modules/marketplace/gallery";
import { rupees } from "@/modules/marketplace/format";
import { openChat } from "@/modules/chat/actions";
import { RatingBadge } from "@/modules/ratings/stars";
import { getRating } from "@/modules/ratings/get-rating";
import { KarmaBadge } from "@/modules/karma/badge";
import ReportSheet from "@/modules/moderation/report-sheet";
import ShareButton from "@/components/share-button";
import SaveButton from "@/components/save-button";
import VerifiedName from "@/components/verified-name";
import { BuyerOffer, SellerOffers, type OfferRow } from "@/modules/marketplace/offer-panel";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { id } = await params;

  const { data: listing } = await supabase
    .from("listings")
    .select("*, seller:profiles!listings_seller_id_fkey(id, name, verified_name, hostel_block, karma)")
    .eq("id", id)
    .single();

  if (!listing) notFound();
  const seller = listing.seller as {
    id: string;
    name: string;
    verified_name: string | null;
    hostel_block: string | null;
    karma: number;
  };
  const isMine = seller.id === user.id;
  const sellerRating = await getRating(seller.id);
  const { data: savedRow } = await supabase
    .from("saves")
    .select("target_id")
    .eq("user_id", user.id)
    .eq("target_type", "listing")
    .eq("target_id", listing.id)
    .maybeSingle();

  // Phase 33 offers: RLS returns the seller's full list, a buyer only theirs.
  const { data: offerRows } = await supabase
    .from("offers")
    .select("id, buyer_id, amount, counter_amount, status, buyer:profiles!offers_buyer_id_fkey(name)")
    .eq("listing_id", listing.id)
    .order("created_at", { ascending: false });
  const offers: OfferRow[] = (offerRows ?? []).map((o) => ({
    id: o.id,
    buyer_id: o.buyer_id,
    amount: Number(o.amount),
    counter_amount: o.counter_amount == null ? null : Number(o.counter_amount),
    status: o.status,
    buyer_name: (o.buyer as unknown as { name: string } | null)?.name ?? "Student",
  }));
  const myOffer = offers.find(
    (o) => o.buyer_id === user.id && (o.status === "pending" || o.status === "countered")
  );

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
        <span className="flex items-center gap-2">
          <SaveButton targetType="listing" targetId={listing.id} initialSaved={savedRow !== null} />
          {/* A space listing is members-only. The share link is a PUBLIC preview
              page, so offering it here would hand out exactly what the space
              exists to keep in. No share button for space-scoped items. */}
          {listing.space_id == null && (
            <ShareButton path={`/p/listing/${listing.id}`} title={listing.title} />
          )}
          {!isMine && <ReportSheet targetType="listing" targetId={listing.id} authorId={seller.id} />}
        </span>
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
        <div className="text-right">
          <p className="font-heading text-2xl font-bold text-primary">
            {rupees(listing.price)}
            {listing.listing_type === "rent" && <span className="text-sm font-medium">/day</span>}
          </p>
          {listing.listing_type === "rent" && listing.deposit != null && Number(listing.deposit) > 0 && (
            <p className="text-xs text-muted-foreground">+ {rupees(Number(listing.deposit))} deposit</p>
          )}
        </div>
      </div>

      {listing.status === "sold" && (
        <p className="rounded-2xl bg-muted p-3 text-center text-sm font-medium">This item has been sold.</p>
      )}
      {listing.listing_type === "rent" && listing.rental_status === "lent_out" && (
        <p className="rounded-2xl bg-muted p-3 text-center text-sm font-medium">
          Currently lent out
          {listing.rental_due != null &&
            ` — back ${new Date(listing.rental_due).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}`}
        </p>
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
          <div className="flex flex-wrap items-center gap-2">
            <VerifiedName name={seller.verified_name} />
            <RatingBadge avg={sellerRating.avg} count={sellerRating.count} />
          </div>
        </div>
      </div>

      {isMine ? (
        <>
          {listing.listing_type !== "rent" && <SellerOffers offers={offers} />}
          <Link
            href={`/marketplace/${listing.id}/edit`}
            className="press flex min-h-12 items-center justify-center rounded-full border border-border bg-card px-6 font-semibold"
          >
            Edit your listing
          </Link>
        </>
      ) : (
        listing.status === "available" && (
          <div className="glass sticky bottom-24 z-10 flex flex-col gap-2 rounded-3xl p-3">
            <form action={startChat}>
              <button
                type="submit"
                className="press shine gradient-brand glow-primary flex min-h-12 w-full items-center justify-center rounded-full px-6 font-semibold text-on-primary"
              >
                Chat with seller
              </button>
            </form>
            {listing.listing_type !== "rent" && (
              <BuyerOffer listingId={listing.id} mine={myOffer ?? null} />
            )}
          </div>
        )
      )}
    </main>
  );
}
