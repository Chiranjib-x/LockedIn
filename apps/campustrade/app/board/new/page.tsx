import { requireUser } from "@/lib/auth";
import BackLink from "@/components/back-link";
import PostForm from "@/modules/board/post-form";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; community?: string }>;
}) {
  const { supabase } = await requireUser();
  const { error, community } = await searchParams;

  // Posting as a community (moderators only — RLS enforces).
  let communityName: string | undefined;
  if (community) {
    const { data } = await supabase
      .from("communities").select("name, emoji").eq("id", community).single();
    if (data) communityName = `${data.emoji} ${data.name}`;
  }

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <BackLink href={communityName ? `/communities/${community}` : "/board"} label={communityName ? "Community" : "Board"} />
      <h1 className="text-2xl font-bold">{communityName ? "Post an update" : "Post to the board"}</h1>
      <PostForm
        error={error}
        communityId={communityName ? community : undefined}
        communityName={communityName}
        kind={communityName ? "community" : "board"}
      />
    </main>
  );
}
