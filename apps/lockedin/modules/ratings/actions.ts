"use server";

import { createClient } from "@suite/auth/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Seller marks a listing sold TO a specific same-college buyer. Records the
// sale + a transaction, which fires the rate-nudge notifications (trigger).
export async function markSoldTo(listingId: string, buyerId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: listing } = await supabase
    .from("listings")
    .select("id, seller_id, college_id, status")
    .eq("id", listingId)
    .single();
  if (!listing || listing.seller_id !== user.id) return "Not your listing.";
  if (buyerId === user.id) return "You can’t sell to yourself.";

  await supabase.from("listings").update({ status: "sold", sold_to_id: buyerId }).eq("id", listingId);
  // college_id stamped from the listing (server-side); insert RLS re-checks.
  const { error } = await supabase.from("transactions").insert({
    college_id: listing.college_id,
    context_type: "marketplace",
    context_id: listingId,
    party_a: user.id, // seller
    party_b: buyerId, // buyer
  });
  revalidatePath("/marketplace/mine");
  revalidatePath(`/marketplace/${listingId}`);
  return error?.message ?? null;
}

export async function submitRating(transactionId: string, rateeId: string, stars: number, comment: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("college_id").eq("id", user.id).single();

  const { error } = await supabase.from("ratings").insert({
    college_id: profile?.college_id,
    transaction_id: transactionId,
    rater_id: user.id,
    ratee_id: rateeId,
    stars,
    comment: comment.trim() || null,
  });
  revalidatePath("/notifications");
  return error?.message ?? null;
}
