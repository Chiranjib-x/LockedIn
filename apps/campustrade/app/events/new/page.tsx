import { BackLink } from "@suite/ui";
import PostForm from "@/modules/board/post-form";
import { requireUser } from "@suite/auth/auth";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { error } = await searchParams;

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <BackLink href="/events" label="Events" />
      <h1 className="text-2xl font-bold">Post an event</h1>
      <PostForm error={error} kind="event" />
    </main>
  );
}
