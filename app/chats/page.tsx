import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";

function ago(iso: string) {
  const mins = (Date.now() - new Date(iso).getTime()) / 60000;
  if (mins < 1) return "now";
  if (mins < 60) return `${Math.round(mins)}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

export default async function ChatsPage() {
  const { supabase, user } = await requireUser();

  // Conversations I'm in, with the other participant + last message.
  const { data: parts } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at, conversations(id, context_type, context_id, created_at)")
    .eq("user_id", user.id);

  const convIds = (parts ?? []).map((p) => p.conversation_id);

  const [{ data: others }, { data: lastMsgs }] = await Promise.all([
    supabase
      .from("conversation_participants")
      .select("conversation_id, user_id, profiles(name)")
      .in("conversation_id", convIds.length ? convIds : ["00000000-0000-0000-0000-000000000000"])
      .neq("user_id", user.id),
    supabase
      .from("messages")
      .select("conversation_id, body, created_at, sender_id")
      .in("conversation_id", convIds.length ? convIds : ["00000000-0000-0000-0000-000000000000"])
      .order("created_at", { ascending: false }),
  ]);

  const otherByConv = new Map((others ?? []).map((o) => [o.conversation_id, o]));
  const lastByConv = new Map<string, { body: string; created_at: string; sender_id: string }>();
  for (const m of lastMsgs ?? []) if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);

  const rows = (parts ?? [])
    .map((p) => {
      const other = otherByConv.get(p.conversation_id) as { user_id: string; profiles: { name: string } } | undefined;
      const last = lastByConv.get(p.conversation_id);
      const unread = last ? new Date(last.created_at) > new Date(p.last_read_at) && last.sender_id !== user.id : false;
      return {
        id: p.conversation_id,
        name: other?.profiles?.name ?? "Student",
        last,
        unread,
        sortKey: last ? new Date(last.created_at).getTime() : 0,
      };
    })
    .filter((r) => r.last) // hide empty conversations
    .sort((a, b) => b.sortKey - a.sortKey);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-4 py-6">
      <h1 className="text-2xl font-bold">Chats</h1>
      {!rows.length ? (
        <Card className="mt-2 flex flex-col items-center gap-2 py-10 text-center">
          <span className="text-3xl">💬</span>
          <p className="font-medium">No chats yet</p>
          <p className="text-sm text-muted-foreground">
            Message a seller from any listing to start a conversation.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <Link key={r.id} href={`/chats/${r.id}`} className="press">
              <Card className={`flex items-center gap-3 ${r.unread ? "border-primary/40" : ""}`}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading font-bold text-primary">
                  {r.name[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{r.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{ago(r.last!.created_at)}</span>
                  </div>
                  <p className={`truncate text-sm ${r.unread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                    {r.last!.sender_id === user.id ? "You: " : ""}
                    {r.last!.body}
                  </p>
                </div>
                {r.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
