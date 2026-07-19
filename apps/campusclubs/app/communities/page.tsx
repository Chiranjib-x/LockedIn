import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import EmptyState from "@/components/empty-state";
import { ApproveButtons } from "@/modules/communities/client";
import QuantaBanner from "@/modules/communities/quanta-banner";
import { CATEGORY_META, catGroup } from "@/modules/communities/categories";
import { dismissDeletionRequest } from "@/modules/communities/actions";

const catChip = (cat: string) => `${CATEGORY_META[cat]?.emoji ?? "✨"} ${CATEGORY_META[cat]?.label ?? "Community"}`;

export default async function CommunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ proposed?: string; deleted?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { proposed, deleted } = await searchParams;

  const [{ data: communities }, { data: myMemberships }, { data: prof }] = await Promise.all([
    supabase
      .from("communities")
      .select("*, members:community_members(user_id)")
      .order("created_at", { ascending: false }),
    supabase.from("community_members").select("community_id").eq("user_id", user.id),
    supabase.from("profiles").select("is_moderator").eq("id", user.id).single(),
  ]);

  const myIds = new Set((myMemberships ?? []).map((m) => m.community_id));
  const approved = (communities ?? []).filter((c) => c.is_approved);
  const pending = (communities ?? []).filter((c) => !c.is_approved);
  const recruiting = approved.filter((c) => c.recruiting);
  // Four distinct shelves by type. is_official is a badge within each, not a
  // shelf of its own.
  const byGroup = (g: string) => approved.filter((c) => catGroup(c.category) === g);
  const chapters = byGroup("chapter");
  const clubs = byGroup("club");
  const teams = byGroup("team");
  const groups = byGroup("community");
  const deletionRequests = prof?.is_moderator ? approved.filter((c) => c.deletion_requested_at) : [];

  const clubCard = (c: (typeof approved)[number], i: number) => {
    const count = (c.members as { user_id: string }[]).length;
    return (
      <Link key={c.id} href={`/communities/${c.id}`} className="animate-fade-up press" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
        <Card className="h-full transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
          <div className="flex items-start justify-between">
            {c.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.logo_url} alt="" className="h-11 w-11 rounded-xl object-cover" />
            ) : (
              <span className="text-2xl">{c.emoji}</span>
            )}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{catChip(c.category)}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{c.name}</h2>
            {c.is_official && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">✔ Official</span>
            )}
            {c.recruiting && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">🟢 Recruiting</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {count} member{count === 1 ? "" : "s"}
            {myIds.has(c.id) && <span className="text-accent"> · you’re in</span>}
          </p>
        </Card>
      </Link>
    );
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Communities</h1>
        <Link
          href="/communities/new"
          className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          ＋ Propose
        </Link>
      </div>

      <QuantaBanner />

      <Link href="/for-clubs" className="press">
        <Card className="flex items-center justify-between gap-3 border-primary/30 bg-gradient-to-r from-primary/10 to-accent/5 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
          <div>
            <h2 className="font-semibold">Run a club or team? Bring it to CampusClubs</h2>
            <p className="text-sm text-muted-foreground">Announce to members, recruit, assign positions, and collect leads — no WhatsApp or QR needed.</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
        </Card>
      </Link>

      {proposed && (
        <p className="rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
          Proposal sent — it goes live once approved. You’ll get a notification. 🎉
        </p>
      )}

      {deleted && (
        <p className="rounded-2xl border border-border bg-muted p-3 text-sm text-muted-foreground">Community deleted.</p>
      )}

      {deletionRequests.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">🗑️ Deletion requests</h2>
          {deletionRequests.map((c) => {
            async function dismiss() {
              "use server";
              await dismissDeletionRequest(c.id);
            }
            return (
              <Card key={c.id} className="flex flex-col gap-2 border-destructive/30">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{c.emoji}</span>
                  <p className="font-semibold">{c.name}</p>
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs">{catChip(c.category)}</span>
                </div>
                {c.deletion_reason && <p className="text-sm text-muted-foreground">“{c.deletion_reason}”</p>}
                <div className="flex gap-2">
                  <Link
                    href={`/communities/${c.id}`}
                    className="press flex-1 rounded-full bg-destructive px-4 py-1.5 text-center text-sm font-semibold text-on-destructive"
                  >
                    Review &amp; delete →
                  </Link>
                  <form action={dismiss}>
                    <button type="submit" className="press rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:bg-muted">
                      Dismiss
                    </button>
                  </form>
                </div>
              </Card>
            );
          })}
        </section>
      )}

      {pending.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">
            {prof?.is_moderator ? "Awaiting your approval" : "Your pending proposals"}
          </h2>
          {pending.map((c) => (
            <Card key={c.id} className="flex flex-col gap-2 border-dashed">
              <div className="flex items-center gap-2">
                <span className="text-xl">{c.emoji}</span>
                <p className="font-semibold">{c.name}</p>
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs">{catChip(c.category)}</span>
              </div>
              {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
              {c.is_official && (
                <p className="text-xs font-medium text-primary">Claims to be official — verify before approving.</p>
              )}
              {prof?.is_moderator ? (
                <ApproveButtons id={c.id} claimsOfficial={!!c.is_official} />
              ) : (
                <p className="text-xs text-muted-foreground">Waiting for approval…</p>
              )}
            </Card>
          ))}
        </section>
      )}

      {recruiting.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">🟢 Recruiting now</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recruiting.map((c, i) => clubCard(c, i))}
          </div>
        </section>
      )}

      {!approved.length ? (
        <EmptyState icon={Users} tint="blue" title="No communities yet">
          <p className="text-sm text-muted-foreground">
            Chapters, clubs, teams, interest groups — propose the one you wish existed.
          </p>
        </EmptyState>
      ) : (
        <>
          {[
            { title: "🎖️ Chapters", items: chapters },
            { title: "🎭 Clubs", items: clubs },
            { title: "🚀 Student teams", items: teams },
            { title: "✨ Communities & groups", items: groups },
          ].map((shelf) =>
            shelf.items.length > 0 ? (
              <section key={shelf.title} className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold">{shelf.title}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {shelf.items.map((c, i) => clubCard(c, i))}
                </div>
              </section>
            ) : null
          )}
        </>
      )}
    </main>
  );
}
