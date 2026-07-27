"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Start (or resume) a DM about a context, then open it. Blocks/bans enforced
// inside the RPC.
// `username` is the caller proving they know who they are messaging (QUEUE A36).
// 0078 accepts a DM only when a thread already exists, OR the target genuinely
// owns the named context (verified against the row — ctype/ctx are caller-
// supplied and must never be trusted), OR this exact username matches. Shared
// membership of a club is deliberately NOT enough: founder's call, 2026-07-28.
export async function openChat(
  otherId: string,
  contextType: string | null,
  contextId: string | null,
  username?: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("find_or_create_dm", {
    other: otherId,
    ctype: contextType,
    ctx: contextId,
    uname: username ?? null,
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
  // Clear the collapsed chat notification for this conversation.
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("link", `/chats/${conversationId}`)
    .eq("read", false);
}
