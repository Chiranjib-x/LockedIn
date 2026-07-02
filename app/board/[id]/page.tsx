import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import Gallery from "@/modules/marketplace/gallery";
import TypeBadge from "@/modules/board/badge";
import ResolveButton from "@/modules/board/resolve-button";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { id } = await params;

  const { data: post } = await supabase
    .from("posts")
    .select("*, author:profiles!posts_author_id_fkey(id, name, hostel_block, contact_pref)")
    .eq("id", id)
    .single();

  if (!post) notFound();
  const author = post.author as {
    id: string;
    name: string;
    hostel_block: string | null;
    contact_pref: string | null;
  };
  const isMine = author.id === user.id;
  const resolvable = post.type === "lost" || post.type === "found";

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/board" className="text-sm text-muted-foreground hover:text-foreground">
        ← Board
      </Link>

      {post.images?.length > 0 && <Gallery images={post.images} title={post.title} />}

      <div className="flex items-center gap-2">
        <TypeBadge type={post.type} />
        {post.status === "resolved" && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">Resolved</span>
        )}
      </div>

      <h1 className="text-2xl font-bold">{post.title}</h1>

      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        {post.location && <p>📍 {post.location}</p>}
        {post.type === "event" && post.event_date && (
          <p>
            🗓️{" "}
            {new Date(post.event_date).toLocaleString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>

      {post.description && (
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">{post.description}</p>
      )}

      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-heading font-bold text-primary">
          {author.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{author.name || "Student"}</p>
          {author.hostel_block && <p className="text-xs text-muted-foreground">{author.hostel_block}</p>}
        </div>
      </div>

      {isMine && resolvable && <ResolveButton id={post.id} resolved={post.status === "resolved"} />}
    </main>
  );
}
