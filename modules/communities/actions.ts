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

export async function proposeCommunity(formData: FormData) {
  const { supabase, user } = await ctx();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/communities/new?error=" + encodeURIComponent("Give it a name."));

  const { data: profile } = await supabase
    .from("profiles").select("college_id").eq("id", user.id).single();

  const { error } = await supabase.from("communities").insert({
    created_by: user.id,
    college_id: profile?.college_id,
    name,
    emoji: String(formData.get("emoji") ?? "").trim() || "🎯",
    category: String(formData.get("category") ?? "other"),
    description: String(formData.get("description") ?? "").trim() || null,
  });
  if (error) redirect("/communities/new?error=" + encodeURIComponent(error.message));
  revalidatePath("/communities");
  redirect("/communities?proposed=1");
}

export async function joinCommunity(id: string) {
  const { supabase, user } = await ctx();
  await supabase.from("community_members").insert({ community_id: id, user_id: user.id });
  revalidatePath(`/communities/${id}`);
  revalidatePath("/communities");
}

export async function leaveCommunity(id: string) {
  const { supabase, user } = await ctx();
  await supabase.from("community_members").delete().eq("community_id", id).eq("user_id", user.id);
  revalidatePath(`/communities/${id}`);
  revalidatePath("/communities");
}

export async function approveCommunity(id: string) {
  const { supabase } = await ctx();
  await supabase.from("communities").update({ is_approved: true }).eq("id", id); // RLS: founder only
  revalidatePath("/communities");
}

export async function rejectCommunity(id: string) {
  const { supabase } = await ctx();
  await supabase.from("communities").delete().eq("id", id); // RLS: founder or proposer-pending
  revalidatePath("/communities");
}

export async function expressInterest(id: string) {
  const { supabase, user } = await ctx();
  await supabase.from("community_interests").insert({ community_id: id, user_id: user.id });
  revalidatePath(`/communities/${id}`);
}

export async function withdrawInterest(id: string) {
  const { supabase, user } = await ctx();
  await supabase.from("community_interests").delete().eq("community_id", id).eq("user_id", user.id);
  revalidatePath(`/communities/${id}`);
}

export async function setRecruiting(id: string, on: boolean) {
  const { supabase } = await ctx();
  await supabase.rpc("set_recruiting", { cid: id, on_flag: on }); // gated: club/app moderator
  revalidatePath(`/communities/${id}`);
  revalidatePath("/communities");
}

export async function setMemberPosition(cid: string, uid: string, position: string) {
  const { supabase } = await ctx();
  await supabase.rpc("set_member_position", { cid, uid, pos: position }); // gated: club/app moderator
  revalidatePath(`/communities/${cid}`);
}

// Lead management (0052). Both RPCs enforce: caller is a lead/founder, and a
// team always keeps at least one lead.
export async function setMemberRole(cid: string, uid: string, role: "member" | "moderator") {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("set_community_role", { cid, uid, newrole: role });
  revalidatePath(`/communities/${cid}`);
  return error?.message ?? null;
}

export async function removeMember(cid: string, uid: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("remove_community_member", { cid, uid });
  revalidatePath(`/communities/${cid}`);
  return error?.message ?? null;
}
