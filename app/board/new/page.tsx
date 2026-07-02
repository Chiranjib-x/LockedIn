import { requireUser } from "@/lib/auth";
import PostForm from "@/modules/board/post-form";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { error } = await searchParams;

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <h1 className="text-2xl font-bold">Post to the board</h1>
      <PostForm error={error} />
    </main>
  );
}
