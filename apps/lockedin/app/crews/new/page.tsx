import { requireUser } from "@/lib/auth";
import BackLink from "@/components/back-link";
import { inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createCrew } from "@/modules/crews/actions";

export default async function NewCrewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { error } = await searchParams;

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <BackLink href="/crews" label="Crews" />
      <div>
        <h1 className="text-2xl font-bold">New crew</h1>
        <p className="text-sm text-muted-foreground">Private — only people you add can see it.</p>
      </div>
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      <form action={createCrew} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Crew name
          <input name="name" required placeholder="e.g. G-Block 214, The Squad" className={inputClass} />
        </label>
        <SubmitButton pendingLabel="Creating…">Create crew</SubmitButton>
      </form>
    </main>
  );
}
