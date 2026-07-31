"use server";

import { createClient } from "@suite/auth/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function fileReport(
  targetType: "user" | "listing" | "post" | "group_order" | "subscription" | "request",
  targetId: string,
  reason: string
) {
  const { supabase, user } = await me();
  const { data: profile } = await supabase.from("profiles").select("college_id").eq("id", user.id).single();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    college_id: profile?.college_id,
    target_type: targetType,
    target_id: targetId,
    reason: reason.trim() || "No reason given",
  });
  return error?.message ?? null;
}

export async function blockUser(blockedId: string) {
  const { supabase, user } = await me();
  if (blockedId === user.id) return "You can’t block yourself.";
  const { error } = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: blockedId });
  revalidatePath("/marketplace");
  revalidatePath("/board");
  revalidatePath("/matches");
  return error?.message ?? null;
}

export async function unblockUser(blockedId: string) {
  const { supabase, user } = await me();
  await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", blockedId);
  revalidatePath("/settings/blocks");
}

// ── moderator-only ──
export async function dismissReport(reportId: string) {
  const { supabase } = await me();
  const { error } = await supabase.from("reports").update({ status: "dismissed" }).eq("id", reportId);
  revalidatePath("/admin/moderation");
  return error ? "Couldn't dismiss that report — refresh and try again." : null;
}

export async function removeContent(
  reportId: string,
  ttype: "listing" | "post" | "group_order" | "request",
  tid: string
) {
  const { supabase } = await me();
  const { error } = await supabase.rpc("mod_remove_content", { ttype, tid });
  if (error) return "Couldn't remove that content — refresh and try again.";
  await supabase.from("reports").update({ status: "actioned" }).eq("id", reportId);
  revalidatePath("/admin/moderation");
  return null;
}

export async function banUser(reportId: string, userId: string) {
  const { supabase } = await me();
  const { error } = await supabase.rpc("mod_ban_user", { uid: userId });
  if (error) return "Couldn't ban that user — refresh and try again.";
  await supabase.from("reports").update({ status: "actioned" }).eq("id", reportId);
  revalidatePath("/admin/moderation");
  return null;
}
