import Link from "next/link";
import { CalendarDays, MapPin, Megaphone } from "lucide-react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import TypeBadge from "@/modules/board/badge";
import { JoinLeaveButton } from "@/modules/communities/client";

export default async function CommunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser();
  const { id } = await params;

  const { data: community } = await supabase.from("communities").select("*").eq("id", id).single();
  if (!community || !community.is_approved) notFound();

  const [{ data: members }, { data: posts }] = await Promise.all([
    supabase
      .from("community_members")
      .select("user_id, role, profile:profiles!community_members_user_id_fkey(name)")
      .eq("community_id", id),
    supabase
      .from("posts")
      .select("id, type, title, images, location, event_date, created_at")
      .eq("community_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const me = members?.find((m) => m.user_id === user.id);
  const mods = (members ?? []).filter((m) => m.role === "moderator");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/communities" className="text-sm text-muted-foreground hover:text-foreground">← Communities</Link>

      <div className="animate-fade-up flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {community.emoji} {community.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {members?.length ?? 0} member{(members?.length ?? 0) === 1 ? "" : "s"} · run by{" "}
            {mods.map((m) => (m.profile as unknown as { name: string })?.name).filter(Boolean).join(", ") || "the community"}
          </p>
        </div>
        <JoinLeaveButton id={id} joined={!!me} />
      </div>

      {community.description && (
        <p className="text-[15px] leading-relaxed text-foreground/90">{community.description}</p>
      )}

      {me?.role === "moderator" && (
        <Link
          href={`/board/new?community=${id}`}
          className="press flex min-h-11 items-center justify-center rounded-full border border-primary/40 bg-primary/5 px-5 text-sm font-semibold text-primary"
        >
          <Megaphone className="mr-1.5 h-4 w-4" strokeWidth={2} /> Post an update or event
        </Link>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Updates</h2>
        {!posts?.length ? (
          <Card className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="text-3xl">{community.emoji}</span>
            <p className="text-sm text-muted-foreground">
              Nothing yet — updates and events from the moderators land here.
            </p>
          </Card>
        ) : (
          posts.map((p, i) => (
            <Link key={p.id} href={`/board/${p.id}`} className="animate-fade-up press" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <Card>
                <div className="flex items-center gap-2">
                  <TypeBadge type={p.type} />
                  {p.type === "event" && p.event_date && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3 shrink-0" strokeWidth={2} />
                      {new Date(p.event_date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    </span>
                  )}
                </div>
                <h3 className="mt-1 font-semibold">{p.title}</h3>
                {p.location && (
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {p.location}
                  </p>
                )}
              </Card>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
