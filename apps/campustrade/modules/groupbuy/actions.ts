"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { istParse } from "@/modules/timetable/helpers";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createOrder(formData: FormData) {
  const { supabase, user } = await ctx();

  const title = String(formData.get("title") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  if (!title || !deadline || !category) {
    redirect("/group-buy/new?error=" + encodeURIComponent("Title, category, and deadline are required."));
  }

  const { data: profile } = await supabase
    .from("profiles").select("college_id").eq("id", user.id).single();

  const unitPriceRaw = String(formData.get("unit_price") ?? "").trim();
  const { data, error } = await supabase
    .from("group_orders")
    .insert({
      organizer_id: user.id,
      college_id: profile?.college_id,
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      category,
      deadline: istParse(deadline).toISOString(),
      unit_price: unitPriceRaw ? Number(unitPriceRaw) : null,
      upi_id: String(formData.get("upi_id") ?? "").trim() || null,
    })
    .select("id")
    .single();

  if (error) redirect("/group-buy/new?error=" + encodeURIComponent(error.message));
  revalidatePath("/group-buy");
  redirect(`/group-buy/${data!.id}`);
}

export async function joinOrder(orderId: string, quantity: number, note: string, amount: number) {
  const { supabase, user } = await ctx();
  const { data: profile } = await supabase
    .from("profiles").select("college_id").eq("id", user.id).single();

  const { error } = await supabase.from("group_order_items").insert({
    order_id: orderId,
    user_id: user.id,
    college_id: profile?.college_id,
    quantity,
    note: note || null,
    amount_owed: amount,
  });
  revalidatePath(`/group-buy/${orderId}`);
  return error?.message ?? null;
}

export async function leaveOrder(orderId: string) {
  const { supabase, user } = await ctx();
  await supabase.from("group_order_items").delete().eq("order_id", orderId).eq("user_id", user.id);
  revalidatePath(`/group-buy/${orderId}`);
}

export async function setOrderStatus(
  orderId: string,
  status: "open" | "closed" | "ordered" | "arrived" | "collecting" | "completed" | "cancelled"
) {
  const { supabase } = await ctx();
  await supabase.from("group_orders").update({ status }).eq("id", orderId); // RLS: organizer only
  revalidatePath(`/group-buy/${orderId}`);
  revalidatePath("/group-buy");
}

// Phase 35: organizer sets pickup point + delivery fee + split mode.
export async function updateLogistics(orderId: string, formData: FormData) {
  const { supabase } = await ctx();
  const feeRaw = String(formData.get("delivery_fee") ?? "").trim();
  await supabase
    .from("group_orders")
    .update({
      pickup_location: String(formData.get("pickup_location") ?? "").trim() || null,
      delivery_fee: feeRaw ? Number(feeRaw) : null,
      split_mode: String(formData.get("split_mode") ?? "even") === "proportional" ? "proportional" : "even",
    })
    .eq("id", orderId); // RLS: organizer only
  revalidatePath(`/group-buy/${orderId}`);
}

export async function markPaid(itemId: string, orderId: string) {
  const { supabase } = await ctx();
  await supabase.from("group_order_items").update({ paid_marked: true }).eq("id", itemId);
  revalidatePath(`/group-buy/${orderId}`);
}

export async function confirmPaid(itemId: string, orderId: string, confirmed: boolean) {
  const { supabase } = await ctx();
  await supabase.from("group_order_items").update({ paid_confirmed: confirmed }).eq("id", itemId);
  revalidatePath(`/group-buy/${orderId}`);
}
