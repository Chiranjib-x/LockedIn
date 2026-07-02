import { redirect } from "next/navigation";

// Browse grid arrives in Phase 4. Until then, Marketplace opens to My Listings.
export default function MarketplaceIndex() {
  redirect("/marketplace/mine");
}
