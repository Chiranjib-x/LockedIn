import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@suite/auth/auth";
import { Card } from "@suite/ui";
import { ReportActions } from "@/modules/moderation/mod-actions";

const TARGET_TABLE: Record<string, string> = {
  listing: "listings",
  post: "posts",
  group_order: "group_orders",
  request: "requests",
};

export default async function ModerationPage() {
  const { supabase, user } = await requireUser();
  const { data: prof } = await supabase.from("profiles").select("is_moderator").eq("id", user.id).single();
  if (!prof?.is_moderator) notFound();

  const { data: reports } = await supabase
    .from("reports")
    .select("*, reporter:profiles!reports_reporter_id_fkey(name)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  // Fetch the reported content inline (best-effort per type).
  const enriched = await Promise.all(
    (reports ?? []).map(async (r) => {
      let preview = "";
      let authorId: string | null = null;
      if (r.target_type === "user") {
        const { data } = await supabase.from("profiles").select("name").eq("id", r.target_id).single();
        preview = data?.name ?? "(user)";
        authorId = r.target_id;
      } else if (TARGET_TABLE[r.target_type]) {
        const table = TARGET_TABLE[r.target_type];
        const authorCol =
          table === "listings" ? "seller_id" : table === "posts" ? "author_id" : table === "requests" ? "requester_id" : "organizer_id";
        const { data } = await supabase.from(table).select(`title, ${authorCol}`).eq("id", r.target_id).maybeSingle();
        preview = (data as { title?: string } | null)?.title ?? "(removed or gone)";
        authorId = (data as Record<string, string> | null)?.[authorCol] ?? null;
      }
      return { ...r, preview, authorId };
    })
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-bold">Moderation</h1>
      <p className="text-sm text-muted-foreground">{enriched.length} open report{enriched.length === 1 ? "" : "s"}</p>

      {/* Admin hub: /admin/campus and /admin/spaces are moderator-only and were
          otherwise unreachable — the header can't take a third icon without
          re-breaking the 360px overflow fixed earlier. */}
      <nav className="flex flex-wrap gap-2">
        <Link href="/admin/campus" className="press inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
          🗺️ Campus map
        </Link>
        <Link href="/admin/spaces" className="press inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
          🔒 Spaces
        </Link>
        <Link href="/admin/showcase" className="press inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
          🧰 Toolbox &amp; Deals
        </Link>
        <Link href="/admin/broadcast" className="press inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
          📣 Broadcast
        </Link>
        <Link href="/admin/tournaments" className="press inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
          🏆 Tournaments
        </Link>
      </nav>

      {!enriched.length ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="text-3xl">🛡️</span>
          <p className="font-medium">Queue is clear</p>
          <p className="text-sm text-muted-foreground">No open reports. Nice and quiet.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {enriched.map((r) => (
            <Card key={r.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                  {r.target_type}
                </span>
                <span className="text-xs text-muted-foreground">by {(r.reporter as { name: string })?.name}</span>
              </div>
              <p className="font-medium">“{r.preview}”</p>
              <p className="text-sm text-muted-foreground">Reason: {r.reason}</p>
              <ReportActions
                reportId={r.id}
                targetType={r.target_type}
                targetId={r.target_id}
                authorId={r.authorId}
              />
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
