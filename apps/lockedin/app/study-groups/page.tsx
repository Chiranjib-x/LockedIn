import { BookOpen, MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card } from "@suite/ui";
import { EmptyState } from "@suite/ui";
import { KarmaBadge } from "@/modules/karma/badge";
import { CreateGroupForm, JoinLeaveButton } from "@/modules/study/client";

// Phase 34: study groups per course. Cross-links to course pages deferred —
// no courses table exists (Phase 23 skipped).

export default async function StudyGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string; created?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { error, code, created } = await searchParams;

  let query = supabase
    .from("study_groups")
    .select(
      "id, course_code, title, description, capacity, meet_info, conversation_id, creator_id, members:study_group_members(user_id, profile:profiles(name, karma))"
    )
    .order("created_at", { ascending: false });
  if (code) query = query.ilike("course_code", `%${code.toUpperCase().replace(/\s/g, "")}%`);
  const { data: groups } = await query.limit(50);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-bold">Study groups</h1>

      {created && (
        <p className="rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
          Group&rsquo;s live — it has its own chat. Get your classmates in. 📚
        </p>
      )}

      <CreateGroupForm error={error} />

      <form className="flex gap-2" action="/study-groups">
        <input aria-label="Filter by course code — e.g. CSE3006"
          name="code"
          defaultValue={code ?? ""}
          placeholder="Filter by course code — e.g. CSE3006"
          className="min-h-11 flex-1 rounded-full border border-border bg-card px-4 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        />
        <button type="submit" className="press min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary">
          Filter
        </button>
      </form>

      {!groups?.length ? (
        <EmptyState icon={BookOpen} tint="teal" title={code ? `Nothing for ${code}` : "No study groups yet"}>
          <p className="text-sm text-muted-foreground">Start one — misery loves company, especially before end-sems.</p>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => {
            const members = (g.members ?? []) as unknown as {
              user_id: string;
              profile: { name: string; karma: number } | null;
            }[];
            const isMember = members.some((m) => m.user_id === user.id);
            return (
              <Card key={g.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="rounded-full bg-tint-violet px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-tint-violet-fg">
                      {g.course_code}
                    </span>
                    <h2 className="mt-1 font-semibold">{g.title}</h2>
                    {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
                    {g.meet_info && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" strokeWidth={2} /> {g.meet_info}
                      </p>
                    )}
                  </div>
                  <JoinLeaveButton
                    gid={g.id}
                    isMember={isMember}
                    isFull={members.length >= g.capacity}
                    chatId={g.conversation_id}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1" title={`${members.length}/${g.capacity} in`}>
                    {Array.from({ length: Math.min(g.capacity, 8) }).map((_, si) => (
                      <span key={si} className={`h-2 w-2 rounded-full ${si < members.length ? "bg-primary" : "bg-muted"}`} />
                    ))}
                  </span>
                  ·
                  {members.slice(0, 4).map((m) => (
                    <span key={m.user_id} className="flex items-center gap-1">
                      {m.profile?.name ?? "Student"} <KarmaBadge karma={m.profile?.karma ?? 0} />
                    </span>
                  ))}
                  {members.length > 4 && <span>+{members.length - 4} more</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
