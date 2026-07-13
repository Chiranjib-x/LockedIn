import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import Thread from "@/modules/chat/thread";
import VerifiedName from "@/components/verified-name";
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

  const [{ data: participants }, { data: messages }] = await Promise.all([
    supabase
      .from("conversation_participants")
      .select("user_id, profiles(name, verified_name)")
      .eq("conversation_id", id),
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
  ]);

  await markRead(id);

  // Multi-party (Phase 34): study-group chats title by group name and show
  // sender names; DMs keep the other person's name.
  const names = new Map(
    (participants ?? []).map((p) => [p.user_id, (p.profiles as unknown as { name: string } | null)?.name ?? "Student"])
  );
  const others = (participants ?? []).filter((p) => p.user_id !== user.id);
  const otherVerified = (others[0]?.profiles as unknown as { verified_name: string | null } | null)?.verified_name ?? null;
  const isGroup = conv.context_type === "study_group";
  let title = names.get(others[0]?.user_id) ?? "Student";
  if (isGroup && conv.context_id != null) {
    const { data: g } = await supabase
      .from("study_groups").select("title, course_code").eq("id", conv.context_id).maybeSingle();
    if (g) title = `${g.course_code} · ${g.title}`;
  }
  const otherName = title;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
      <div className="glass sticky top-0 z-10 flex items-center gap-3 border-b border-border px-4 py-2">
        <Link href="/chats" className="press text-lg text-muted-foreground">←</Link>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-heading font-bold text-primary">
          {otherName[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <p className="font-semibold leading-tight">{otherName}</p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {!isGroup && <VerifiedName name={otherVerified} />}
            {conv.context_type && <span>{CONTEXT_HINT[conv.context_type] ?? ""}</span>}
          </p>
        </div>
      </div>

      <Thread
        conversationId={id}
        meId={user.id}
        initial={messages ?? []}
        showOpeners={conv.context_type === "listing"}
        senderNames={isGroup ? Object.fromEntries(names) : null}
      />
    </main>
  );
}
