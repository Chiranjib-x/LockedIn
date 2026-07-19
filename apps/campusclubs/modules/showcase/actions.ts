"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireModerator() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("college_id, is_moderator")
    .eq("id", user.id)
    .single();
  if (!profile?.is_moderator) redirect("/toolbox");
  return { supabase, collegeId: profile.college_id, userId: user.id };
}

export async function createShowcaseItem(formData: FormData) {
  const { supabase, collegeId, userId } = await requireModerator();
  await supabase.from("showcase_items").insert({
    college_id: collegeId,
    created_by: userId,
    name: String(formData.get("name") ?? "").trim(),
    url: String(formData.get("url") ?? "").trim(),
    tagline: String(formData.get("tagline") ?? "").trim() || null,
    category: String(formData.get("category") ?? "other").trim(),
    logo_url: String(formData.get("logo_url") ?? "").trim() || null,
  });
  revalidatePath("/toolbox");
  revalidatePath("/admin/showcase");
  redirect("/admin/showcase");
}

export async function toggleShowcaseItem(id: string, isActive: boolean) {
  const { supabase } = await requireModerator();
  await supabase.from("showcase_items").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/toolbox");
  revalidatePath("/admin/showcase");
}

export async function deleteShowcaseItem(id: string) {
  const { supabase } = await requireModerator();
  await supabase.from("showcase_items").delete().eq("id", id);
  revalidatePath("/toolbox");
  revalidatePath("/admin/showcase");
}

export async function createMerchant(formData: FormData) {
  const { supabase, collegeId, userId } = await requireModerator();
  await supabase.from("merchants").insert({
    college_id: collegeId,
    created_by: userId,
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "other").trim(),
    logo_url: String(formData.get("logo_url") ?? "").trim() || null,
    offer_text: String(formData.get("offer_text") ?? "").trim(),
    details: String(formData.get("details") ?? "").trim() || null,
    link_or_contact: String(formData.get("link_or_contact") ?? "").trim() || null,
  });
  revalidatePath("/deals");
  revalidatePath("/admin/showcase");
  redirect("/admin/showcase");
}

export async function toggleMerchant(id: string, isActive: boolean) {
  const { supabase } = await requireModerator();
  await supabase.from("merchants").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/deals");
  revalidatePath("/admin/showcase");
}

export async function deleteMerchant(id: string) {
  const { supabase } = await requireModerator();
  await supabase.from("merchants").delete().eq("id", id);
  revalidatePath("/deals");
  revalidatePath("/admin/showcase");
}
