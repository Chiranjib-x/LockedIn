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
  // Deliberate: a ₹0 pool has nothing to split, so 0 is rejected — but say so
  // instead of calling it "missing" (the old `!total` conflated the two).
  if (!service || !renewal) {
    redirect("/subscriptions/new?error=" + encodeURIComponent("Service and renewal date are required."));
  }
  if (!Number.isFinite(total) || total <= 0) {
    redirect("/subscriptions/new?error=" + encodeURIComponent("Enter a cost greater than ₹0 — that's what gets split."));
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

// ── Phase 31: discovery + request-to-join ────────────────────────────────────

export async function setDiscoverable(subId: string, discoverable: boolean, openSeats: number) {
  const { supabase } = await ctx();
  // RLS: owner-only update.
  await supabase
    .from("subscriptions")
    .update({ is_discoverable: discoverable, open_seats: discoverable ? Math.max(0, openSeats) : 0 })
    .eq("id", subId);
  revalidatePath(`/subscriptions/${subId}`);
  revalidatePath("/subscriptions/browse");
}

export async function requestJoin(subId: string, note: string) {
  const { supabase, user } = await ctx();
  const { data: profile } = await supabase
    .from("profiles").select("college_id, name").eq("id", user.id).single();
  // RLS enforces: discoverable, open seats, not owner/member, one request.
  const { error } = await supabase.from("sub_join_requests").insert({
    subscription_id: subId,
    requester_id: user.id,
    college_id: profile?.college_id,
    note: note.trim() || null,
  });
  if (error) return "Couldn't send the request — maybe you already asked.";
  const { data: sub } = await supabase
    .from("subscriptions").select("owner_id, college_id, service_name").eq("id", subId).single();
  if (sub) {
    await supabase.rpc("notify", {
      uid: sub.owner_id, cid: sub.college_id, ntype: "subscription",
      msg: `${profile?.name ?? "Someone"} wants a seat in your ${sub.service_name} pool`,
      nlink: `/subscriptions/${subId}`,
    });
  }
  revalidatePath(`/subscriptions/${subId}`);
  return null;
}

// Prorated first cycle: pay only for the days left until renewal, then the
// normal per-seat share. Both sides see the math in the notification.
export async function decideJoin(requestId: string, approve: boolean) {
  const { supabase } = await ctx();
  const { data: req } = await supabase
    .from("sub_join_requests")
    .update({ status: approve ? "approved" : "declined" })
    .eq("id", requestId)
    .select("requester_id, subscription_id, college_id")
    .single();
  if (!req) return "Couldn't update the request.";

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("service_name, total_cost, seats, billing_cycle, renewal_date, open_seats")
    .eq("id", req.subscription_id)
    .single();
  if (!sub) return "Pool vanished.";

  if (!approve) {
    await supabase.rpc("notify", {
      uid: req.requester_id, cid: req.college_id, ntype: "subscription",
      msg: `No seat this time on ${sub.service_name} — the owner declined.`,
      nlink: "/subscriptions/browse",
    });
    revalidatePath(`/subscriptions/${req.subscription_id}`);
    return null;
  }

  const perSeat = Math.ceil(Number(sub.total_cost) / sub.seats);
  const cycleDays = sub.billing_cycle === "monthly" ? 30 : 365;
  const daysLeft = Math.min(
    cycleDays,
    Math.max(0, Math.ceil((new Date(sub.renewal_date).getTime() - Date.now()) / 86400000))
  );
  const prorated = Math.ceil((perSeat * daysLeft) / cycleDays);

  const { error } = await supabase.from("subscription_members").insert({
    subscription_id: req.subscription_id,
    user_id: req.requester_id,
    college_id: req.college_id,
    share_amount: prorated,
  });
  if (error) return "Couldn't add them — " + error.message;

  await supabase
    .from("subscriptions")
    .update({ open_seats: Math.max(0, (sub.open_seats ?? 1) - 1) })
    .eq("id", req.subscription_id);

  await supabase.rpc("notify", {
    uid: req.requester_id, cid: req.college_id, ntype: "subscription",
    msg: `You're in the ${sub.service_name} pool 🎉 First cycle: ₹${prorated} (${daysLeft}/${cycleDays} days of the ₹${perSeat} share), then ₹${perSeat}.`,
    nlink: `/subscriptions/${req.subscription_id}`,
  });
  revalidatePath(`/subscriptions/${req.subscription_id}`);
  return null;
}
