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
  const price = Number(formData.get("price") ?? 0);
  const category = String(formData.get("category") ?? "").trim();
  const images = JSON.parse(String(formData.get("images") ?? "[]")) as string[];

  if (!title || !category || Number.isNaN(price) || price < 0) {
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
