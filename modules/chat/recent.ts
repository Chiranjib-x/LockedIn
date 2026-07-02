import { createClient } from "@/lib/supabase/server";

export function ago(iso: string) {
  const mins = (Date.now() - new Date(iso).getTime()) / 60000;
  if (mins < 1) return "now";
  if (mins < 60) return `${Math.round(mins)}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

export type ChatRow = {
  id: string;
  name: string;
  last: { body: string; created_at: string; sender_id: string };
  unread: boolean;
};

// Shared by /chats (full list) and the home feed's "recent chats" section.
export async function getChatRows(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<ChatRow[]> {
  const { data: parts } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at, conversations(id, context_type, context_id, created_at)")
    .eq("user_id", userId);

  const convIds = (parts ?? []).map((p) => p.conversation_id);
  if (!convIds.length) return [];

  const [{ data: others }, { data: lastMsgs }] = await Promise.all([
    supabase
      .from("conversation_participants")
      .select("conversation_id, user_id, profiles(name)")
      .in("conversation_id", convIds)
      .neq("user_id", userId),
    supabase
      .from("messages")
      .select("conversation_id, body, created_at, sender_id")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false }),
  ]);

  const otherByConv = new Map((others ?? []).map((o) => [o.conversation_id, o]));
  const lastByConv = new Map<string, { body: string; created_at: string; sender_id: string }>();
  for (const m of lastMsgs ?? []) if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);

  return (parts ?? [])
    .map((p) => {
      const other = otherByConv.get(p.conversation_id) as { user_id: string; profiles: { name: string } } | undefined;
      const last = lastByConv.get(p.conversation_id);
      const unread = last ? new Date(last.created_at) > new Date(p.last_read_at) && last.sender_id !== userId : false;
      return {
        id: p.conversation_id,
        name: other?.profiles?.name ?? "Student",
        last,
        unread,
        sortKey: last ? new Date(last.created_at).getTime() : 0,
      };
    })
    .filter((r): r is ChatRow & { sortKey: number } => !!r.last)
    .sort((a, b) => b.sortKey - a.sortKey);
}
