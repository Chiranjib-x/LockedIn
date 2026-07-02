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

export async function createSubscription(formData: FormData) {
  const { supabase, user } = await ctx();

  const service = String(formData.get("service_name") ?? "").trim();
  const total = Number(formData.get("total_cost") ?? 0);
  const renewal = String(formData.get("renewal_date") ?? "").trim();
  if (!service || !total || !renewal) {
    redirect("/subscriptions/new?error=" + encodeURIComponent("Service, cost, and renewal date are required."));
  }

  const { data: profile } = await supabase
    .from("profiles").select("college_id").eq("id", user.id).single();

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      owner_id: user.id,
      college_id: profile?.college_id,
      service_name: service,
      total_cost: total,
      billing_cycle: String(formData.get("billing_cycle") ?? "monthly"),
      renewal_date: renewal,
      seats: Number(formData.get("seats") ?? 4) || 4,
      upi_id: String(formData.get("upi_id") ?? "").trim() || null,
    })
    .select("id")
    .single();

  if (error) redirect("/subscriptions/new?error=" + encodeURIComponent(error.message));
  revalidatePath("/subscriptions");
  redirect(`/subscriptions/${data!.id}`);
}

export async function addMember(subId: string, userId: string, share: number) {
  const { supabase, user } = await ctx();
  const { data: profile } = await supabase
    .from("profiles").select("college_id").eq("id", user.id).single();
  const { error } = await supabase.from("subscription_members").insert({
    subscription_id: subId,
    user_id: userId,
    college_id: profile?.college_id,
    share_amount: share,
  });
  revalidatePath(`/subscriptions/${subId}`);
  return error?.message ?? null;
}

export async function removeMember(memberId: string, subId: string) {
  const { supabase } = await ctx();
  await supabase.from("subscription_members").delete().eq("id", memberId);
  revalidatePath(`/subscriptions/${subId}`);
}

export async function setShare(memberId: string, subId: string, share: number) {
  const { supabase } = await ctx();
  await supabase.from("subscription_members").update({ share_amount: share }).eq("id", memberId);
  revalidatePath(`/subscriptions/${subId}`);
}

export async function setPaid(memberId: string, subId: string, paid: boolean) {
  const { supabase } = await ctx();
  await supabase
    .from("subscription_members")
    .update({ paid_status: paid, last_paid: paid ? new Date().toISOString() : null })
    .eq("id", memberId);
  revalidatePath(`/subscriptions/${subId}`);
}

export async function splitEvenly(subId: string) {
  const { supabase } = await ctx();
  const [{ data: sub }, { data: members }] = await Promise.all([
    supabase.from("subscriptions").select("total_cost").eq("id", subId).single(),
    supabase.from("subscription_members").select("id").eq("subscription_id", subId),
  ]);
  if (!sub || !members?.length) return;
  // Owner occupies one seat too — split across members + owner.
  const share = Math.ceil(Number(sub.total_cost) / (members.length + 1));
  for (const m of members) {
    await supabase.from("subscription_members").update({ share_amount: share }).eq("id", m.id);
  }
  revalidatePath(`/subscriptions/${subId}`);
}
