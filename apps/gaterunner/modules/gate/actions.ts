"use server";

import { createClient } from "@suite/auth/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { istParse } from "@suite/lib/ist";

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
    expected_at: istParse(expected).toISOString(),
    reward: Number(formData.get("reward") ?? 0) || 0,
  });

  if (error) redirect("/gate/new?error=" + encodeURIComponent(error.message));
  revalidatePath("/gate");
  redirect("/gate");
}

export async function claimPickup(id: string, upi: string) {
  const { supabase } = await ctx();
  // claim_pickup (0022) returns null on success, else a user-facing reason
  // (someone beat you to it / you're at the 3-claim cap).
  const { data, error } = await supabase.rpc("claim_pickup", { rid: id, upi: upi || null });
  revalidatePath("/gate");
  if (error) return error.message;
  return (data as string | null) ?? null;
}

// One coordination note from the runner ("blue shirt, gate 2") — 0064 RPC
// guards runner-only + claimed, and pushes a gate notification to the requester.
export async function setRunnerNote(id: string, note: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("set_runner_note", { rid: id, note });
  revalidatePath("/gate");
  return error ? "Couldn't send the note." : null;
}

export async function announceGateRun(gate: string) {
  const { supabase } = await ctx();
  // announce_gate_run (0024): -1 = rate-limited, else requesters notified.
  const { data, error } = await supabase.rpc("announce_gate_run", { g: gate });
  if (error) return "Couldn't announce — try again.";
  const n = data as number;
  if (n === -1) return "You announced a run recently — give it 30 minutes.";
  if (n === 0) return "No parcels expected in the next 90 minutes — thanks anyway!";
  return `Pinged ${n} ${n === 1 ? "person" : "people"} waiting on parcels 🎉`;
}

// Standing opt-in to be pinged when someone posts a pickup (0074). This is the
// supply side of the app: before it existed, a request notified nobody and
// every unclaimed one just expired.
export async function setGateAlerts(on: boolean) {
  const { supabase, user } = await ctx();
  const { error } = await supabase
    .from("profiles")
    .update({ gate_alerts: on })
    .eq("id", user.id);
  revalidatePath("/gate");
  return error ? "Couldn't save that — try again." : null;
}

export async function markDroppedOff(id: string) {
  const { supabase, user } = await ctx();
  const { error } = await supabase
    .from("pickup_requests")
    .update({ delivered_claimed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("runner_id", user.id)
    .eq("status", "claimed");
  revalidatePath("/gate");
  return error ? "Couldn't mark it dropped off — refresh and try again." : null;
}

export async function unclaimPickup(id: string) {
  const { supabase } = await ctx();
  // Direct UPDATE can't null runner_id under the RLS policy (0023) — the
  // security definer function owns this transition.
  const { error } = await supabase.rpc("unclaim_pickup", { rid: id });
  revalidatePath("/gate");
  return error ? "Couldn't hand it back — refresh and try again." : null;
}

export async function confirmDelivered(id: string) {
  const { supabase, user } = await ctx();
  const { error } = await supabase
    .from("pickup_requests")
    .update({ status: "delivered" })
    .eq("id", id)
    .eq("requester_id", user.id);
  revalidatePath("/gate");
  return error ? "Couldn't confirm — refresh and try again." : null;
}

export async function cancelPickup(id: string) {
  const { supabase, user } = await ctx();
  const { error } = await supabase
    .from("pickup_requests")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("requester_id", user.id);
  revalidatePath("/gate");
  return error ? "Couldn't cancel — refresh and try again." : null;
}
