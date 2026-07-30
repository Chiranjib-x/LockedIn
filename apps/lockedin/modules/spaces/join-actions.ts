"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Asking to join a circle, and deciding those requests. Every guard lives in the
// RPCs (0088) — probed: a requester cannot approve their own request either
// through decide_space_join() or by UPDATEing the row directly.

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase };
}

export async function requestJoin(spaceId: string, note?: string) {
  const { supabase } = await ctx();
  const { data, error } = await supabase.rpc("request_space_join", {
    p_space: spaceId,
    p_note: note?.trim() || null,
  });
  revalidatePath("/home");
  if (error) return error.message;
  if (data === "already_member") return "You're already in.";
  if (data === "already_pending") return "You've already asked — it's waiting to be looked at.";
  return null;
}

export async function decideJoin(requestId: string, approve: boolean) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("decide_space_join", {
    p_request: requestId,
    p_approve: approve,
  });
  revalidatePath("/admin/spaces");
  revalidatePath("/home");
  return error ? error.message : null;
}
