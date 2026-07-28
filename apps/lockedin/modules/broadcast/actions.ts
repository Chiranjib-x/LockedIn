"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// A broadcast cannot be unsent, so every guard that matters lives in
// send_broadcast() (0080) — moderator-only, own college, 180-char cap, and a
// 30-minute floor between sends. This action is a thin caller: anything it
// checked here could be bypassed by hitting the RPC directly.
export async function sendBroadcast(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const message = String(formData.get("message") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim() || null;

  const { data, error } = await supabase.rpc("send_broadcast", {
    p_message: message,
    p_link: link,
  });

  if (error) {
    redirect("/admin/broadcast?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/admin/broadcast");
  redirect("/admin/broadcast?sent=" + String(data ?? 0));
}
