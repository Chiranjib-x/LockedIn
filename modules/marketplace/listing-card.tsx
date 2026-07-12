import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { rupees } from "./format";

export type ListingCardData = {
  id: string;
  title: string;
  price: number;
  category: string;
  images: string[];
  status: "available" | "sold";
  listing_type?: "sell" | "rent";
  rental_status?: string;
};

// Shared browse-grid card. ponytail: plain <img>, not next/image — Supabase
// public URLs need remotePatterns config and these are already-sized uploads.
export default function ListingCard({ listing, index = 0 }: { listing: ListingCardData; index?: number }) {
  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="animate-fade-up press group flex flex-col"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
        {listing.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.images[0]}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-tint-blue to-tint-teal">
            <PackageOpen className="h-10 w-10 text-tint-blue-fg/60" strokeWidth={1.6} />
          </div>
        )}
        {listing.status === "sold" && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/30 backdrop-blur-[2px]">
            <span className="rounded-full bg-card px-3 py-1 text-sm font-semibold">Sold</span>
          </div>
        )}
        {listing.listing_type === "rent" && listing.rental_status === "lent_out" && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/30 backdrop-blur-[2px]">
            <span className="rounded-full bg-card px-3 py-1 text-sm font-semibold">Lent out</span>
          </div>
        )}
        {listing.listing_type === "rent" && (
          <span className="absolute top-2 left-2 rounded-full bg-tint-teal px-2 py-0.5 text-xs font-semibold text-tint-teal-fg">
            Rent
          </span>
        )}
        <span className="glass absolute right-2 bottom-2 rounded-full px-2.5 py-0.5 font-heading text-sm font-bold text-primary">
          {rupees(listing.price)}
          {listing.listing_type === "rent" && <span className="text-[10px] font-medium">/day</span>}
        </span>
      </div>
      <p className="mt-2 truncate text-sm font-medium">{listing.title}</p>
      <p className="text-xs text-muted-foreground">{listing.category}</p>
    </Link>
  );
}
