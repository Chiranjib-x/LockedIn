import Link from "next/link";
import { Users2, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import EmptyState from "@/components/empty-state";

// Private groups you're in (RLS returns only your crews). Distinct from Clubs.
export default async function CrewsPage() {
  const { supabase } = await requireUser();

  const { data: crews } = await supabase
    .from("crews")
    .select("id, name, members:crew_members(user_id), notes:crew_notes(status)")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Crews</h1>
          <p className="text-sm text-muted-foreground">Private groups for your roommates & people.</p>
        </div>
        <Link
          href="/crews/new"
          className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          ＋ New crew
        </Link>
      </div>

      {!crews?.length ? (
        <EmptyState icon={Users2} tint="teal" title="No crews yet">
          <p className="text-sm text-muted-foreground">
            Make one for your roommates — share reminders like “clean the room” or “fix the mirror.”
          </p>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {crews.map((c, i) => {
            const memberCount = (c.members as { user_id: string }[]).length;
            const pending = (c.notes as { status: string }[]).filter((n) => n.status === "pending").length;
            return (
              <Link key={c.id} href={`/crews/${c.id}`} className="animate-fade-up press" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                <Card className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {memberCount} member{memberCount === 1 ? "" : "s"}
                      {pending > 0 && <span className="text-accent"> · {pending} pending</span>}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
