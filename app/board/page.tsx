import Link from "next/link";
import { MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import BoardFilter from "@/modules/board/board-filter";
import TypeBadge from "@/modules/board/badge";
import { blockedIds, notInList } from "@/modules/moderation/blocks";
import SaveSearchButton from "@/modules/search/save-search-button";

function when(post: { type: string; event_date: string | null; created_at: string }) {
  if (post.type === "event" && post.event_date) {
    return new Date(post.event_date).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  const mins = (Date.now() - new Date(post.created_at).getTime()) / 60000;
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { q, type } = await searchParams;

  const blocked = await blockedIds(supabase, user.id);

  let query = supabase
    .from("posts")
    .select("id, type, title, images, location, event_date, status, created_at")
    .not("author_id", "in", notInList(blocked))
    .order("created_at", { ascending: false });

  if (type) query = query.eq("type", type);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

  const { data: posts } = await query.limit(60);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campus board</h1>
        <Link
          href="/board/new"
          className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          ＋ Post
        </Link>
      </div>

      <BoardFilter />
      <SaveSearchButton module="board" query={q ?? ""} filters={type ? { type } : {}} />

      {!posts?.length ? (
        <Card className="mt-2 flex flex-col items-center gap-2 py-10 text-center">
          <span className="text-3xl">📌</span>
          <p className="font-medium">{q || type ? "Nothing matches" : "The board is empty"}</p>
          <p className="text-sm text-muted-foreground">
            {q || type ? "Try different filters." : "Lost something? Found something? Post it."}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((p, i) => (
            <Link key={p.id} href={`/board/${p.id}`} className="animate-fade-up press" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
              <Card className={p.status === "resolved" ? "opacity-55" : ""}>
                <div className="flex gap-3">
                  {p.images?.[0] && (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <TypeBadge type={p.type} />
                      {p.status === "resolved" && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">Resolved</span>
                      )}
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">{when(p)}</span>
                    </div>
                    <h2 className="mt-1 truncate font-semibold">{p.title}</h2>
                    {p.location && (
                      <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {p.location}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
