import { requireUser } from "@/lib/auth";
import { inputClass } from "@/components/ui";
import BackLink from "@/components/back-link";
import { SubmitButton } from "@/components/submit-button";
import { proposeCommunity } from "@/modules/communities/actions";

export default async function NewCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { error } = await searchParams;

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <BackLink href="/communities" label="Communities" />
      <div>
        <h1 className="text-2xl font-bold">Propose a community</h1>
        <p className="text-sm text-muted-foreground">
          Clubs, chapters, student teams, interest groups — once approved, it
          goes live and you become its first lead. Leads can appoint co-leads,
          assign positions, recruit, broadcast, and export rosters.
        </p>
      </div>
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      <form action={proposeCommunity} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <label className="flex w-24 flex-col gap-1 text-sm font-medium">
            Emoji
            <input name="emoji" defaultValue="🎯" maxLength={4} className={`${inputClass} text-center text-xl`} />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Name
            <input name="name" required placeholder="e.g. F1 Paddock, Valorant VIT" className={inputClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Category
          <select name="category" defaultValue="other" className={inputClass}>
            <option value="club">Official club / chapter</option>
            <option value="team">Student team</option>
            <option value="sports">Sports</option>
            <option value="gaming">Gaming</option>
            <option value="hobby">Hobby</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          What’s it about?
          <textarea name="description" rows={3} placeholder="Race weekends together, ranked grind, weekly kickabouts…" className={inputClass} />
        </label>
        <SubmitButton pendingLabel="Sending…">Send proposal</SubmitButton>
      </form>
    </main>
  );
}
