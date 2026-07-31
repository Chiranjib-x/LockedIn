"use server";

import { createClient } from "@suite/auth/server";
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

export async function createTrip(formData: FormData) {
  const { supabase, user } = await ctx();

  const origin = String(formData.get("origin") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const departAt = String(formData.get("depart_at") ?? "").trim();
  const seats = Number(formData.get("seats") ?? 0);
  if (!origin || !destination || !departAt || seats < 1) {
    redirect("/cabs/new?error=" + encodeURIComponent("Origin, destination, time, and seats are required."));
  }

  const { data: profile } = await supabase.from("profiles").select("college_id").eq("id", user.id).single();

  const fareRaw = String(formData.get("fare_total") ?? "").trim();
  const { data, error } = await supabase
    .from("trips")
    .insert({
      creator_id: user.id,
      college_id: profile?.college_id,
      origin,
      destination,
      depart_at: istParse(departAt).toISOString(),
      seats,
      notes: String(formData.get("notes") ?? "").trim() || null,
      fare_total: fareRaw ? Number(fareRaw) : null,
      upi_id: String(formData.get("upi_id") ?? "").trim() || null,
    })
    .select("id")
    .single();

  if (error) redirect("/cabs/new?error=" + encodeURIComponent(error.message));
  revalidatePath("/cabs");
  redirect(`/cabs/${data!.id}`);
}

export async function joinTrip(tripId: string) {
  const { supabase, user } = await ctx();
  const { error } = await supabase.from("trip_members").insert({ trip_id: tripId, user_id: user.id });
  revalidatePath(`/cabs/${tripId}`);
  revalidatePath("/cabs");
  return error?.message ?? null;
}

export async function leaveTrip(tripId: string) {
  const { supabase, user } = await ctx();
  await supabase.from("trip_members").delete().eq("trip_id", tripId).eq("user_id", user.id);
  revalidatePath(`/cabs/${tripId}`);
  revalidatePath("/cabs");
}

export async function cancelTrip(tripId: string) {
  const { supabase } = await ctx();
  await supabase.from("trips").update({ status: "cancelled" }).eq("id", tripId); // RLS: creator only
  revalidatePath(`/cabs/${tripId}`);
  revalidatePath("/cabs");
}

export async function completeTrip(tripId: string) {
  const { supabase } = await ctx();
  await supabase.from("trips").update({ status: "completed" }).eq("id", tripId);
  revalidatePath(`/cabs/${tripId}`);
  revalidatePath("/cabs");
}

export async function markTripPaid(memberId: string, tripId: string) {
  const { supabase } = await ctx();
  await supabase.from("trip_members").update({ paid_marked: true }).eq("id", memberId);
  revalidatePath(`/cabs/${tripId}`);
}

export async function confirmTripPaid(memberId: string, tripId: string, confirmed: boolean) {
  const { supabase } = await ctx();
  await supabase.from("trip_members").update({ paid_confirmed: confirmed }).eq("id", memberId);
  revalidatePath(`/cabs/${tripId}`);
}
