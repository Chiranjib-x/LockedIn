import { notFound } from "next/navigation";
import { requireUser } from "@suite/auth/auth";
import { BackLink } from "@suite/ui";
import { inputClass } from "@suite/ui";
import { SubmitButton } from "@suite/ui";
import { applyToJoin } from "@/modules/communities/actions";

// Application form — shown instead of instant join once a community has
// questions (0054). Answers go to the leads; accept auto-joins.
export default async function ApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase } = await requireUser();
  const { id } = await params;
  const { error } = await searchParams;

  const [{ data: community }, { data: questions }] = await Promise.all([
    supabase.from("communities").select("id, name, emoji, is_approved").eq("id", id).maybeSingle(),
    supabase.from("community_questions").select("id, prompt").eq("community_id", id).order("ord").order("created_at"),
  ]);
  if (!community?.is_approved || !questions?.length) notFound();

  const apply = applyToJoin.bind(null, id);

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <BackLink href={`/communities/${id}`} label={community.name} />
      <div>
        <h1 className="text-2xl font-bold">
          Apply to {community.emoji} {community.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          The leads review every application — you&rsquo;ll get a notification either way.
        </p>
      </div>
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      <form action={apply} className="flex flex-col gap-4">
        {questions.map((q) => (
          <label key={q.id} className="flex flex-col gap-1 text-sm font-medium">
            {q.prompt}
            <textarea name={`q_${q.id}`} required rows={3} className={inputClass} />
          </label>
        ))}
        <SubmitButton pendingLabel="Sending…">Send application</SubmitButton>
      </form>
    </main>
  );
}
