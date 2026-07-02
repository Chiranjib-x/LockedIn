"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createPickup(formData: FormData) {
  const { supabase, user } = await ctx();

  const platform = String(formData.get("platform") ?? "").trim();
  const item = String(formData.get("item_desc") ?? "").trim();
  const drop = String(formData.get("drop_location") ?? "").trim();
  const expected = String(formData.get("expected_at") ?? "").trim();
  if (!platform || !item || !drop || !expected) {
    redirect("/gate/new?error=" + encodeURIComponent("Fill in the platform, item, drop point, and time."));
  }

  const { data: profile } = await supabase
    .from("profiles").select("college_id").eq("id", user.id).single();

  const { error } = await supabase.from("pickup_requests").insert({
    requester_id: user.id,
    college_id: profile?.college_id,
    platform,
    item_desc: item,
    gate: String(formData.get("gate") ?? "").trim() || "Main Gate",
    drop_location: drop,
    expected_at: new Date(expected).toISOString(),
    reward: Number(formData.get("reward") ?? 0) || 0,
  });

  if (error) redirect("/gate/new?error=" + encodeURIComponent(error.message));
  revalidatePath("/gate");
  redirect("/gate");
}

export async function claimPickup(id: string, upi: string) {
  const { supabase } = await ctx();
  const { data, error } = await supabase.rpc("claim_pickup", { rid: id, upi: upi || null });
  revalidatePath("/gate");
  if (error) return error.message;
  return data ? null : "Someone else claimed it first.";
}

export async function unclaimPickup(id: string) {
  const { supabase } = await ctx();
  // RLS: only the runner (or requester) can update this row.
  await supabase
    .from("pickup_requests")
    .update({ runner_id: null, runner_upi: null, status: "open" })
    .eq("id", id)
    .eq("status", "claimed");
  revalidatePath("/gate");
}

export async function confirmDelivered(id: string) {
  const { supabase, user } = await ctx();
  await supabase
    .from("pickup_requests")
    .update({ status: "delivered" })
    .eq("id", id)
    .eq("requester_id", user.id);
  revalidatePath("/gate");
}

export async function cancelPickup(id: string) {
  const { supabase, user } = await ctx();
  await supabase
    .from("pickup_requests")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("requester_id", user.id);
  revalidatePath("/gate");
}
