import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { getChatRows, ago } from "@/modules/chat/recent";
import PushOptIn from "@/components/push-opt-in";

export default async function ChatsPage() {
  const { supabase, user } = await requireUser();
  const rows = await getChatRows(supabase, user.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-4 py-6">
      <h1 className="text-2xl font-bold">Chats</h1>
      <PushOptIn context="chats" />
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
