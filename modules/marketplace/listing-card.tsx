import Link from "next/link";
import { rupees } from "./format";

export type ListingCardData = {
  id: string;
  title: string;
  price: number;
  category: string;
  images: string[];
  status: "available" | "sold";
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
          <div className="flex h-full w-full items-center justify-center text-4xl">📦</div>
        )}
        {listing.status === "sold" && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/40">
            <span className="rounded-full bg-card px-3 py-1 text-sm font-semibold">Sold</span>
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-sm font-medium">{listing.title}</p>
      <p className="font-heading font-bold text-primary">{rupees(listing.price)}</p>
      <p className="text-xs text-muted-foreground">{listing.category}</p>
    </Link>
  );
}
