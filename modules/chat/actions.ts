"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Start (or resume) a DM about a context, then open it. Blocks/bans enforced
// inside the RPC.
export async function openChat(otherId: string, contextType: string | null, contextId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("find_or_create_dm", {
    other: otherId,
    ctype: contextType,
    ctx: contextId,
  });
  if (error) redirect("/chats?error=" + encodeURIComponent(error.message === "blocked" ? "You can’t message this person." : error.message));
  redirect(`/chats/${data}`);
}

export async function markRead(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);
}
