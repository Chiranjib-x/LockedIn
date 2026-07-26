import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import FounderInvite from "@/modules/spaces/founder-invite";

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
  const { data: spaces } = await supabase.rpc("admin_list_spaces");
  const rows = (spaces ?? []) as { id: string; name: string; emoji: string | null; member_count: number }[];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">Spaces</h1>
        <p className="text-sm text-muted-foreground">
          Members-only spaces in your college. You can open an empty one by sending its first
          founding invite — after that, its members invite each other and you have no access.
        </p>
      </div>

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
          </Card>
        ))
      )}
    </main>
  );
}
