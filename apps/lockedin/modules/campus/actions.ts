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
    .select("is_moderator")
    .eq("id", user.id)
    .single();
  if (!profile?.is_moderator) redirect("/home");
  return { supabase };
}

// Blank or non-numeric coordinate fields become NULL (a building with no pin
// yet), never 0 — which would drop a marker into the Gulf of Guinea.
function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Insert (no id) or update (id present) — the RPC self-guards moderator +
// college and stamps college_id. ponytail: no photo field yet, so p_photos is
// null → the RPC resets photos to '{}'. Harmless while no building has photos;
// add a photos passthrough here before shipping photo upload.
export async function saveBuilding(formData: FormData) {
  const { supabase } = await requireModerator();
  const id = String(formData.get("id") ?? "").trim() || null;
  const { error } = await supabase.rpc("save_campus_building", {
    p_id: id,
    p_name: String(formData.get("name") ?? "").trim(),
    p_aka: String(formData.get("aka") ?? "").trim() || null,
    p_category: String(formData.get("category") ?? "academic").trim(),
    p_description: String(formData.get("description") ?? "").trim() || null,
    p_lat: num(formData.get("lat")),
    p_lng: num(formData.get("lng")),
    p_near: String(formData.get("near_landmark") ?? "").trim() || null,
    p_photos: null,
  });
  if (error) redirect("/admin/campus?error=" + encodeURIComponent(error.message));
  revalidatePath("/admin/campus");
  redirect("/admin/campus");
}

export async function deleteBuilding(id: string) {
  const { supabase } = await requireModerator();
  await supabase.rpc("delete_campus_building", { p_id: id });
  revalidatePath("/admin/campus");
}
