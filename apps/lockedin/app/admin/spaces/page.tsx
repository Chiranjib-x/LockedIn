import { notFound } from "next/navigation";
import { requireUser } from "@suite/auth/auth";
import { Card } from "@suite/ui";
import FounderInvite from "@/modules/spaces/founder-invite";
import MemberPicker, { type Student } from "@/modules/spaces/member-picker";
import PendingRequests, { type PendingRequest } from "@/modules/spaces/pending-requests";

// FINDINGS F7: a space with no members can never be joined — every door needs
// an existing member. This screen is the only way to open that first door, and
// it exists because Girls' Closet and Boys' Den shipped empty for VIT Vellore.
// Moderator-only; members and rosters are never listed here (spaces are
// members-only by design and the founder is not a member).
export default async function SpacesAdminPage() {
  const { supabase, user } = await requireUser();
  const { data: prof } = await supabase
    .from("profiles")
    .select("is_moderator, college_id")
    .eq("id", user.id)
    .single();
  if (!prof?.is_moderator) notFound();

  // The founder is not a member, so `spaces` is invisible under RLS — count
  // members through the same definer helper the bootstrap rule uses.
  const { data: pendingRows } = await supabase.rpc("pending_space_requests");
  const pending = (pendingRows ?? []) as PendingRequest[];

  const { data: spaces } = await supabase.rpc("admin_list_spaces");
  const rows = (spaces ?? []) as { id: string; name: string; emoji: string | null; member_count: number }[];

  // Everyone at this college, and each space's roster. Rosters go through a
  // definer RPC because the founder is NOT a member, so space_members is
  // invisible to them under RLS — the same reason admin_list_spaces exists.
  const { data: allStudents } = await supabase
    .from("profiles")
    .select("id, name, username")
    .eq("is_banned", false)
    .order("name");
  const students = (allStudents ?? []) as Student[];

  const rosters = Object.fromEntries(
    await Promise.all(
      rows.map(async (s) => {
        const { data } = await supabase.rpc("admin_space_roster", { p_space: s.id });
        return [s.id, (data ?? []) as { user_id: string; name: string | null; username: string | null; is_lead: boolean }[]] as const;
      })
    )
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">Spaces</h1>
        <p className="text-sm text-muted-foreground">
          Members-only spaces in your college. Add or remove members by tapping a name —
          everyone you add is told who added them and can leave whenever they want.
        </p>
      </div>

      {/* Requests first — someone is waiting on these, and a queue below three
          screens of rosters is a queue nobody reads. */}
      <Card className="flex flex-col gap-3">
        <div>
          <h2 className="font-heading font-bold">
            Waiting to join{pending.length > 0 && ` · ${pending.length}`}
          </h2>
          <p className="text-xs text-muted-foreground">
            Students choose the circle they belong in and you decide. Nothing is sorted
            automatically, and no profile field is consulted.
          </p>
        </div>
        <PendingRequests requests={pending} />
      </Card>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No spaces exist for your college yet.</p>
      ) : (
        rows.map((s) => (
          <Card key={s.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-xl">
                {s.emoji ?? "🔒"}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading font-bold">{s.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {s.member_count === 0 ? (
                    <span className="font-medium text-destructive">
                      Empty — nobody can join until you send a founding invite
                    </span>
                  ) : (
                    <>
                      {s.member_count} member{s.member_count === 1 ? "" : "s"} · running itself
                    </>
                  )}
                </p>
              </div>
            </div>
            {s.member_count === 0 && <FounderInvite spaceId={s.id} spaceName={s.name} />}

            {(() => {
              const roster = rosters[s.id] ?? [];
              const inSpace = new Set(roster.map((r) => r.user_id));
              return (
                <MemberPicker
                  spaceId={s.id}
                  spaceName={s.name}
                  members={roster.map((r) => ({ id: r.user_id, name: r.name, username: r.username, isLead: r.is_lead }))}
                  canPromote
                  candidates={students.filter((st) => !inSpace.has(st.id))}
                />
              );
            })()}
          </Card>
        ))
      )}
    </main>
  );
}
