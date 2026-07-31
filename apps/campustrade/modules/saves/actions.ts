"use server";

import { createClient } from "@suite/auth/server";
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

// college_id stamps server-side (TENANCY RULE) — hence actions, not direct
// client-side table writes.
export async function toggleSave(targetType: string, targetId: string, saved: boolean) {
  const { supabase, user } = await ctx();
  if (saved) {
    await supabase
      .from("saves")
      .delete()
      .eq("user_id", user.id)
      .eq("target_type", targetType)
      .eq("target_id", targetId);
  } else {
    const { data: profile } = await supabase
      .from("profiles").select("college_id").eq("id", user.id).single();
    await supabase.from("saves").insert({
      user_id: user.id,
      college_id: profile?.college_id,
      target_type: targetType,
      target_id: targetId,
    });
  }
  revalidatePath("/saved");
}

export async function saveSearch(module: string, query: string, filters: Record<string, string>) {
  const { supabase, user } = await ctx();
  const { data: profile } = await supabase
    .from("profiles").select("college_id").eq("id", user.id).single();
  const { error } = await supabase.from("saved_searches").insert({
    user_id: user.id,
    college_id: profile?.college_id,
    module,
    query: query || null,
    filters,
  });
  revalidatePath("/saved");
  return error ? "Couldn't save this search." : null;
}

export async function deleteSavedSearch(id: string) {
  const { supabase } = await ctx();
  await supabase.from("saved_searches").delete().eq("id", id);
  revalidatePath("/saved");
}
