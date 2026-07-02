import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import Thread from "@/modules/chat/thread";
import { markRead } from "@/modules/chat/actions";

const CONTEXT_HINT: Record<string, string> = {
  listing: "About a listing",
  match: "You matched",
  group_order: "Group-buy",
  subscription: "Subscription pool",
  study_group: "Study group",
};

export default async function ChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser();
  const { id } = await params;

  // RLS: non-participants get nothing back.
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, context_type, context_id")
    .eq("id", id)
    .single();
  if (!conv) notFound();

  const [{ data: other }, { data: messages }, { data: myProfile }] = await Promise.all([
    supabase
      .from("conversation_participants")
      .select("user_id, profiles(name)")
      .eq("conversation_id", id)
      .neq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("contact_pref").eq("id", user.id).single(),
  ]);

  await markRead(id);

  const otherName = (other?.profiles as { name: string } | undefined)?.name ?? "Student";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
      <div className="glass sticky top-0 z-10 flex items-center gap-3 border-b border-border px-4 py-2">
        <Link href="/chats" className="press text-lg text-muted-foreground">←</Link>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-heading font-bold text-primary">
          {otherName[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <p className="font-semibold leading-tight">{otherName}</p>
          {conv.context_type && (
            <p className="text-xs text-muted-foreground">{CONTEXT_HINT[conv.context_type] ?? ""}</p>
          )}
        </div>
      </div>

      <Thread
        conversationId={id}
        meId={user.id}
        initial={messages ?? []}
        showOpeners={conv.context_type === "listing"}
        myContact={myProfile?.contact_pref ?? null}
      />
    </main>
  );
}
