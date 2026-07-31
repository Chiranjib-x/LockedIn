import Link from "next/link";
import { createClient } from "@suite/auth/server";
import { Card, Section } from "@suite/ui";
import { getChatRows, ago, type ChatRow } from "@/modules/chat/recent";

export default async function RecentChats() {
  let unread: ChatRow[] = [];
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    unread = (await getChatRows(supabase, user.id)).filter((r) => r.unread).slice(0, 3);
  } catch {
    return null;
  }

  if (!unread.length) return null;

  return (
    <Section title="Unread chats" action={{ href: "/chats", label: "See all" }}>
      <div className="flex flex-col gap-2">
        {unread.map((r) => (
          <Link key={r.id} href={`/chats/${r.id}`} className="press">
            <Card className="flex items-center gap-3 border-primary/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading font-bold text-primary">
                {r.name[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold">{r.name}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{ago(r.last.created_at)}</span>
                </div>
                <p className="truncate text-sm font-medium text-foreground">{r.last.body}</p>
              </div>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
            </Card>
          </Link>
        ))}
      </div>
    </Section>
  );
}
