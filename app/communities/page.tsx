import Link from "next/link";
import { Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import EmptyState from "@/components/empty-state";
import { ApproveButtons } from "@/modules/communities/client";
import QuantaBanner from "@/modules/communities/quanta-banner";

const CATEGORY_LABEL: Record<string, string> = {
  club: "🏛️ Club",
  sports: "⚽ Sports",
  gaming: "🎮 Gaming",
  hobby: "🎨 Hobby",
  other: "✨ Other",
};

export default async function CommunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ proposed?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { proposed } = await searchParams;

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

  const clubCard = (c: (typeof approved)[number], i: number) => {
    const count = (c.members as { user_id: string }[]).length;
    return (
      <Link key={c.id} href={`/communities/${c.id}`} className="animate-fade-up press" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
        <Card className="h-full transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
          <div className="flex items-start justify-between">
            <span className="text-2xl">{c.emoji}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{CATEGORY_LABEL[c.category]}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{c.name}</h2>
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

      {proposed && (
        <p className="rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
          Proposal sent — it goes live once approved. You’ll get a notification. 🎉
        </p>
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
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs">{CATEGORY_LABEL[c.category]}</span>
              </div>
              {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
              {prof?.is_moderator ? (
                <ApproveButtons id={c.id} />
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
            F1, football, Valorant, quizzing — propose the group you wish existed.
          </p>
        </EmptyState>
      ) : (
        <section className="flex flex-col gap-2">
          {recruiting.length > 0 && <h2 className="text-lg font-semibold">All communities</h2>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {approved.map((c, i) => clubCard(c, i))}
          </div>
        </section>
      )}
    </main>
  );
}
