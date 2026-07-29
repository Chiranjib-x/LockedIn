"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Adding someone to a members-only space changes who can see them, so every
// guard lives in the RPCs (0081): moderator of that space's own college, and the
// target must be in that same college. The add is never silent — the person is
// notified who added them and told they can leave.

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase };
}

export async function addSpaceMember(spaceId: string, userId: string) {
  const { supabase } = await ctx();
  const { data, error } = await supabase.rpc("admin_add_space_member", {
    p_space: spaceId,
    p_user: userId,
  });
  revalidatePath("/admin/spaces");
  if (error) return error.message;
  return data === "already" ? "They're already in." : null;
}

// Appoint (or clear, with null) the one member trusted to manage this space.
// Moderator-only — a lead cannot promote anyone, including themselves.
export async function setSpaceLead(spaceId: string, userId: string | null) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("admin_set_space_lead", {
    p_space: spaceId,
    p_user: userId,
  });
  revalidatePath("/admin/spaces");
  revalidatePath(`/spaces/${spaceId}`);
  return error ? error.message : null;
}

export async function removeSpaceMember(spaceId: string, userId: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("admin_remove_space_member", {
    p_space: spaceId,
    p_user: userId,
  });
  revalidatePath("/admin/spaces");
  return error ? error.message : null;
}
