"use server";

import { createClient } from "@suite/auth/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { istParse } from "@suite/lib/ist";

// Organiser-side writes. Guards live in the RPCs (0091) and were probed:
// non-moderator save, team size 12, registration closing after the start, and
// deleting a tournament people have entered are all refused at the database.

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase };
}

// datetime-local gives "YYYY-MM-DDTHH:MM" with no zone. istParse pins it to
// +05:30 — without that a UTC server reads every entered time 5:30 early, which
// is this repo's most-repeated bug (packages/lib/ist.test.ts guards both ways).
function toInstant(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? istParse(s).toISOString() : null;
}

export async function saveTournament(formData: FormData) {
  const { supabase } = await ctx();
  const id = String(formData.get("id") ?? "").trim() || null;

  const { error } = await supabase.rpc("admin_save_tournament", {
    p_id: id,
    p_game: String(formData.get("game") ?? "").trim(),
    p_title: String(formData.get("title") ?? "").trim(),
    p_tagline: String(formData.get("tagline") ?? "").trim() || null,
    p_details: String(formData.get("details") ?? "").trim() || null,
    p_team_size: Number(formData.get("team_size") ?? 1),
    p_starts_at: toInstant(formData.get("starts_at")),
    p_reg_closes_at: toInstant(formData.get("reg_closes_at")),
    p_status: String(formData.get("status") ?? "draft"),
    p_prize: String(formData.get("prize") ?? "").trim() || null,
    p_contact: String(formData.get("contact") ?? "").trim() || null,
  });

  revalidatePath("/admin/tournaments");
  revalidatePath("/home");
  if (error) {
    redirect("/admin/tournaments?error=" + encodeURIComponent(error.message));
  }
  redirect("/admin/tournaments?saved=1");
}

export async function setFeatured(id: string | null) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("set_featured_tournament", { p_tournament: id });
  revalidatePath("/admin/tournaments");
  revalidatePath("/home");
  return error ? error.message : null;
}

export async function deleteTournament(id: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("admin_delete_tournament", { p_id: id });
  revalidatePath("/admin/tournaments");
  revalidatePath("/home");
  return error ? error.message : null;
}
