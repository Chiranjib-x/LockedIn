"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function myCollegeId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from("profiles").select("college_id").eq("id", userId).single();
  return data?.college_id as string | undefined;
}

export async function saveListing(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const images = JSON.parse(String(formData.get("images") ?? "[]")) as string[];
  const kind = String(formData.get("listing_type") ?? "sell") === "rent" ? "rent" : "sell";
  const perDay = Number(formData.get("price_per_day") ?? 0);
  // Rentals mirror ₹/day into price so cards, sorting, and search behave.
  const price = kind === "rent" ? perDay : Number(formData.get("price") ?? 0);

  if (!title || !category || Number.isNaN(price) || price < 0 || (kind === "rent" && perDay <= 0)) {
    redirect("/marketplace/new?error=" + encodeURIComponent("Title, category, and a valid price are required."));
  }

  const spaceId = String(formData.get("space_id") ?? "").trim() || null;

  const payload = {
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    price,
    category,
    condition: String(formData.get("condition") ?? "").trim() || null,
    images,
    listing_type: kind,
    price_per_day: kind === "rent" ? perDay : null,
    deposit: kind === "rent" ? Number(formData.get("deposit") ?? 0) || null : null,
  };

  if (id) {
    // Update — RLS guarantees seller-only. No need to touch college/seller.
    const { error } = await supabase.from("listings").update(payload).eq("id", id);
    if (error) redirect("/marketplace/" + id + "/edit?error=" + encodeURIComponent(error.message));
  } else {
    const collegeId = await myCollegeId(supabase, user.id);
    // college_id stamped server-side; RLS WITH CHECK enforces it AND space
    // membership when space_id is set.
    const { error } = await supabase
      .from("listings")
      .insert({ ...payload, seller_id: user.id, college_id: collegeId, space_id: spaceId });
    if (error) redirect("/marketplace/new?error=" + encodeURIComponent(error.message));
    if (spaceId) {
      revalidatePath(`/spaces/${spaceId}`);
      redirect(`/spaces/${spaceId}`);
    }
  }

  revalidatePath("/marketplace");
  revalidatePath("/marketplace/mine");
  redirect("/marketplace/mine");
}

// ── Phase 32: lend / return ──────────────────────────────────────────────────

export async function lendTo(id: string, borrowerId: string, due: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // RLS: seller-only update.
  const { error } = await supabase
    .from("listings")
    .update({ rental_status: "lent_out", lent_to: borrowerId, rental_due: due })
    .eq("id", id)
    .eq("listing_type", "rent");
  if (error) return "Couldn't record the loan.";
  const { data: l } = await supabase
    .from("listings").select("title, college_id").eq("id", id).single();
  if (l) {
    await supabase.rpc("notify", {
      uid: borrowerId, cid: l.college_id, ntype: "marketplace",
      msg: `Borrowed: ${l.title} — due back ${new Date(due).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
      nlink: `/marketplace/${id}`,
    });
  }
  revalidatePath("/marketplace/mine");
  revalidatePath(`/marketplace/${id}`);
  return null;
}

// Return completes the exchange: transaction row (is_rental) fires the 0011
// mutual-rating nudge, then the item relists automatically.
export async function markReturned(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: l } = await supabase
    .from("listings")
    .select("lent_to, college_id, seller_id")
    .eq("id", id)
    .single();
  if (!l || l.seller_id !== user.id || l.lent_to == null) return "Nothing to return.";

  await supabase.from("transactions").insert({
    college_id: l.college_id,
    context_type: "marketplace",
    context_id: id,
    party_a: user.id,
    party_b: l.lent_to,
    is_rental: true,
  });
  await supabase
    .from("listings")
    .update({ rental_status: "available", lent_to: null, rental_due: null })
    .eq("id", id);
  revalidatePath("/marketplace/mine");
  revalidatePath(`/marketplace/${id}`);
  return null;
}

export async function setSold(id: string, sold: boolean) {
  const supabase = await createClient();
  await supabase.from("listings").update({ status: sold ? "sold" : "available" }).eq("id", id);
  revalidatePath("/marketplace/mine");
  revalidatePath("/marketplace");
}

export async function deleteListing(id: string) {
  const supabase = await createClient();
  await supabase.from("listings").delete().eq("id", id);
  revalidatePath("/marketplace/mine");
  revalidatePath("/marketplace");
  redirect("/marketplace/mine");
}
