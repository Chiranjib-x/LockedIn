import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import BackLink from "@/components/back-link";
import { LogOut } from "lucide-react";
import AddCrewMember from "@/modules/crews/add-member";
import NoteForm from "@/modules/crews/note-form";
import NoteActions from "@/modules/crews/note-actions";
import { leaveCrew } from "@/modules/crews/actions";

type Member = { user_id: string; profile: { name: string } | null };
type Note = {
  id: string;
  body: string;
  status: string;
  author_id: string;
  resolved_by: string | null;
  created_at: string;
};

export default async function CrewPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser();
  const { id } = await params;

  // RLS: non-members get nothing back — the crew is unreachable, not just hidden.
  const { data: crew } = await supabase.from("crews").select("id, name, creator_id").eq("id", id).single();
  if (!crew) notFound();

  const [{ data: members }, { data: notes }] = await Promise.all([
    supabase
      .from("crew_members")
      .select("user_id, profile:profiles!crew_members_user_id_fkey(name)")
      .eq("crew_id", id),
    supabase
      .from("crew_notes")
      .select("id, body, status, author_id, resolved_by, created_at")
      .eq("crew_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const roster = (members ?? []) as unknown as Member[];
  const names = new Map(roster.map((m) => [m.user_id, m.profile?.name ?? "Student"]));
  const list = (notes ?? []) as Note[];
  const pending = list.filter((n) => n.status !== "resolved");
  const resolved = list.filter((n) => n.status === "resolved");

  async function leave() {
    "use server";
    await leaveCrew(id);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <BackLink href="/crews" label="Crews" />

      <div className="animate-fade-up flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{crew.name}</h1>
          <p className="text-sm text-muted-foreground">
            {roster.length} member{roster.length === 1 ? "" : "s"} · private
          </p>
        </div>
        <form action={leave}>
          <button type="submit" title="Leave crew" className="press flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" strokeWidth={2} />
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {roster.map((m) => (
          <span key={m.user_id} className="rounded-full border border-border bg-card px-3 py-1 text-sm">
            {m.profile?.name ?? "Student"}
          </span>
        ))}
        <AddCrewMember crewId={id} excludeIds={roster.map((m) => m.user_id)} />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Reminders</h2>
        <NoteForm crewId={id} />

        {list.length === 0 ? (
          <Card className="mt-1 flex flex-col items-center gap-1 py-8 text-center">
            <span className="text-3xl">📝</span>
            <p className="text-sm text-muted-foreground">No reminders yet — add the first one above.</p>
          </Card>
        ) : (
          <div className="mt-1 flex flex-col gap-2">
            {pending.map((n) => (
              <Card key={n.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px]">{n.body}</p>
                  <p className="mt-0.5 text-xs font-medium text-accent">
                    ● Pending · by {names.get(n.author_id) ?? "Someone"}
                  </p>
                </div>
                <NoteActions noteId={n.id} crewId={id} resolved={false} canDelete={n.author_id === user.id} />
              </Card>
            ))}

            {resolved.map((n) => (
              <Card key={n.id} className="flex items-start justify-between gap-3 opacity-60">
                <div className="min-w-0">
                  <p className="text-[15px] line-through">{n.body}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    ✓ Resolved{n.resolved_by ? ` by ${names.get(n.resolved_by) ?? "someone"}` : ""}
                  </p>
                </div>
                <NoteActions noteId={n.id} crewId={id} resolved canDelete={n.author_id === user.id} />
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
