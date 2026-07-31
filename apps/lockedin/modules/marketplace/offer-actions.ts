"use server";

import { createClient } from "@suite/auth/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { markSoldTo } from "@/modules/ratings/actions";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Drops a plain-text line into the buyer<->seller DM so the negotiation has
// chat context (deviation: no special chat cards — see 0033 header).
async function dropChatLine(
  supabase: Awaited<ReturnType<typeof createClient>>,
  senderId: string,
  otherId: string,
  listingId: string,
  body: string
) {
  const { data: convId } = await supabase.rpc("find_or_create_dm", {
    other: otherId,
    ctype: "listing",
    ctx: listingId,
  });
  if (convId != null) {
    await supabase.from("messages").insert({ conversation_id: convId, sender_id: senderId, body });
  }
}

export async function makeOffer(listingId: string, amount: number) {
  const { supabase, user } = await ctx();
  if (!Number.isFinite(amount) || amount <= 0) return "Enter a real amount.";
  const { data: profile } = await supabase
    .from("profiles").select("college_id, name").eq("id", user.id).single();
  const { error } = await supabase.from("offers").insert({
    listing_id: listingId,
    buyer_id: user.id,
    college_id: profile?.college_id,
    amount,
  });
  if (error) return "Couldn't send — you may already have an active offer.";

  const { data: l } = await supabase
    .from("listings").select("seller_id, college_id, title").eq("id", listingId).single();
  if (l) {
    await supabase.rpc("notify", {
      uid: l.seller_id, cid: l.college_id, ntype: "marketplace",
      msg: `₹${amount} offered for ${l.title}`, nlink: `/marketplace/${listingId}`,
    });
    await dropChatLine(supabase, user.id, l.seller_id, listingId, `📩 Offered ₹${amount} for "${l.title}"`);
  }
  revalidatePath(`/marketplace/${listingId}`);
  return null;
}

export async function decideOffer(
  offerId: string,
  action: "accept" | "decline" | "counter",
  counterAmount?: number
) {
  const { supabase, user } = await ctx();
  const { data: offer } = await supabase
    .from("offers")
    .select("id, listing_id, buyer_id, amount, counter_amount, status")
    .eq("id", offerId)
    .single();
  if (!offer) return "Offer not found.";
  const { data: l } = await supabase
    .from("listings").select("seller_id, college_id, title").eq("id", offer.listing_id).single();
  if (!l) return "Listing gone.";
  const isSeller = l.seller_id === user.id;
  // RLS already hides other people's offers from the read above, but the
  // guards below also gate the notify/chat side effects, which RLS can't.
  if (!isSeller && offer.buyer_id !== user.id) return "Not your offer.";
  // Closed offers stay closed — otherwise a re-tap re-fires "Deal 🤝"
  // notifications and chat lines forever.
  if (offer.status === "accepted" || offer.status === "declined") return "This offer is already closed.";
  const other = isSeller ? offer.buyer_id : l.seller_id;

  if (action === "counter") {
    if (!isSeller) return "Only the seller counters.";
    if (!Number.isFinite(counterAmount) || (counterAmount ?? 0) <= 0) return "Enter a counter amount.";
    await supabase.from("offers").update({ status: "countered", counter_amount: counterAmount }).eq("id", offerId);
    await supabase.rpc("notify", {
      uid: other, cid: l.college_id, ntype: "marketplace",
      msg: `Counter-offer: ₹${counterAmount} for ${l.title}`, nlink: `/marketplace/${offer.listing_id}`,
    });
    await dropChatLine(supabase, user.id, other, offer.listing_id, `↩️ Countered at ₹${counterAmount} for "${l.title}"`);
  } else if (action === "decline") {
    await supabase.from("offers").update({ status: "declined" }).eq("id", offerId);
    await supabase.rpc("notify", {
      uid: other, cid: l.college_id, ntype: "marketplace",
      msg: `Offer ${isSeller ? "declined" : "withdrawn"} on ${l.title}`, nlink: `/marketplace/${offer.listing_id}`,
    });
  } else {
    // accept: seller accepts buyer's amount, or buyer accepts the counter.
    // A buyer can't "accept" their own uncountered offer — that would notify
    // the seller of a deal the seller never agreed to.
    if (!isSeller && offer.status !== "countered") return "Wait for the seller to respond.";
    const agreed = isSeller ? Number(offer.amount) : Number(offer.counter_amount ?? offer.amount);
    await supabase.from("offers").update({ status: "accepted" }).eq("id", offerId);
    await supabase.rpc("notify", {
      uid: other, cid: l.college_id, ntype: "marketplace",
      msg: `Deal at ₹${agreed} for ${l.title} 🤝`, nlink: `/marketplace/${offer.listing_id}`,
    });
    await dropChatLine(supabase, user.id, other, offer.listing_id, `🤝 Deal agreed at ₹${agreed} for "${l.title}"`);
    if (isSeller) {
      // one-tap completion: record the sale at the agreed price
      await supabase.from("listings").update({ price: agreed }).eq("id", offer.listing_id);
      const err = await markSoldTo(offer.listing_id, offer.buyer_id);
      if (err) return err;
    }
  }
  revalidatePath(`/marketplace/${offer.listing_id}`);
  return null;
}
