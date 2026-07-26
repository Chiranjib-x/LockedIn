import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { BackLink } from "@suite/ui";
import CheckinClient from "@/modules/events/checkin-client";

export default async function EventCheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser();
  const { id } = await params;

  const { data: post } = await supabase
    .from("posts")
    .select("id, title, type, author_id")
    .eq("id", id)
    .single();
  if (!post || post.type !== "event") notFound();

  // Only the organizer (author) or a moderator may run check-in. The RPC
  // re-enforces this server-side; this is the UI gate.
  const { data: prof } = await supabase.from("profiles").select("is_moderator").eq("id", user.id).single();
  if (post.author_id !== user.id && !prof?.is_moderator) notFound();

  // event_roster() (0043): organizer/moderator-only, includes attendee emails.
  const { data: rows } = await supabase.rpc("event_roster", { p_post_id: id });
  const initial = ((rows ?? []) as { code: string; name: string | null; email: string | null }[]).map(
    (r) => ({ code: r.code, name: r.name, email: r.email })
  );

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <BackLink href={`/board/${id}`} label="Event" />
      <div>
        <h1 className="text-2xl font-bold">Check-in</h1>
        <p className="text-sm text-muted-foreground">{post.title}</p>
      </div>
      <CheckinClient postId={id} initial={initial} />
    </main>
  );
}
