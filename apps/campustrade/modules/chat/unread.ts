import type { createClient } from "@suite/auth/server";

// Count of conversations with a message newer than my last_read_at, not sent by
// me. ponytail: two small queries + a map — fine at student-chat volumes; move
// to a SQL view if a user ever has hundreds of conversations.
export async function unreadChatCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: parts } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);
  if (!parts?.length) return 0;

  const ids = parts.map((p) => p.conversation_id);
  const { data: msgs } = await supabase
    .from("messages")
    .select("conversation_id, created_at, sender_id")
    .in("conversation_id", ids)
    .order("created_at", { ascending: false });

  const lastRead = new Map(parts.map((p) => [p.conversation_id, p.last_read_at]));
  const seen = new Set<string>();
  let count = 0;
  for (const m of msgs ?? []) {
    if (seen.has(m.conversation_id)) continue; // only newest per conversation
    seen.add(m.conversation_id);
    if (m.sender_id !== userId && new Date(m.created_at) > new Date(lastRead.get(m.conversation_id)!)) {
      count++;
    }
  }
  return count;
}
