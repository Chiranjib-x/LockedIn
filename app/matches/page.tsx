import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { scoreMatch, lookingForCompatible, type Prefs } from "@/modules/matcher/score";
import ConnectButton from "@/modules/matcher/connect-button";
import { KarmaBadge } from "@/modules/karma/badge";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { filter } = await searchParams;

  const { data: mine } = await supabase
    .from("match_prefs").select("*").eq("user_id", user.id).maybeSingle();

  if (!mine || !mine.is_opted_in) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-4xl">🎯</span>
        <h1 className="text-2xl font-bold">Find your people</h1>
        <p className="text-muted-foreground">
          Answer a few questions about how you live and study — we&rsquo;ll rank the most
          compatible students on campus.
        </p>
        <Link
          href="/matches/prefs"
          className="press flex min-h-12 items-center rounded-full bg-primary px-7 font-semibold text-on-primary shadow-lg shadow-primary/25"
        >
          {mine ? "Opt in to matching" : "Set up my profile"}
        </Link>
      </main>
    );
  }

  const [{ data: others }, { data: requests }] = await Promise.all([
    supabase
      .from("match_prefs")
      .select("*, profile:profiles!match_prefs_user_id_fkey(id, name, hostel_block, batch, contact_pref, karma)")
      .eq("is_opted_in", true)
      .neq("user_id", user.id),
    supabase.from("match_requests").select("*"),
  ]);

  const reqState = (otherId: string): "none" | "sent" | "incoming" | "mutual" => {
    const sent = requests?.find((r) => r.requester_id === user.id && r.target_id === otherId);
    const incoming = requests?.find((r) => r.requester_id === otherId && r.target_id === user.id);
    if (sent?.status === "mutual" || incoming?.status === "mutual") return "mutual";
    if (sent) return "sent";
    if (incoming) return "incoming";
    return "none";
  };

  const ranked = (others ?? [])
    .filter((o) => lookingForCompatible(mine.looking_for, o.looking_for))
    .filter((o) => !filter || o.looking_for === filter || o.looking_for === "both")
    .map((o) => ({ ...o, ...scoreMatch(mine as Prefs, o as Prefs) }))
    .sort((a, b) => b.score - a.score);

  const chip = (value: string | null, label: string) => (
    <Link
      href={value ? `/matches?filter=${value}` : "/matches"}
      className={`press shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
        (filter ?? "") === (value ?? "") ? "border-primary bg-primary text-on-primary" : "border-border bg-card"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Matches</h1>
        <Link href="/matches/prefs" className="text-sm font-medium text-primary hover:underline">
          Edit my answers
        </Link>
      </div>

      <div className="flex gap-2">
        {chip(null, "All")}
        {chip("roommate", "🛏️ Roommates")}
        {chip("study_buddy", "📚 Study buddies")}
      </div>

      {!ranked.length ? (
        <Card className="mt-2 flex flex-col items-center gap-2 py-10 text-center">
          <span className="text-3xl">🌱</span>
          <p className="font-medium">No one here yet</p>
          <p className="text-sm text-muted-foreground">
            You&rsquo;re early — matches appear as more students opt in.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {ranked.map((m, i) => {
            const p = m.profile as { id: string; name: string; hostel_block: string | null; batch: string | null; contact_pref: string | null; karma: number };
            const state = reqState(p.id);
            return (
              <Card key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-lg font-bold text-primary">
                    {p.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate font-semibold">{p.name}</p>
                        <KarmaBadge karma={p.karma ?? 0} />
                      </div>
                      <span className="shrink-0 font-heading text-lg font-bold text-primary">{m.score}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[p.batch, p.hostel_block].filter(Boolean).join(" · ")}
                      {m.looking_for !== "both" && <> · wants a {m.looking_for === "roommate" ? "roommate" : "study buddy"}</>}
                    </p>
                    {m.why.length > 0 && (
                      <p className="mt-1 text-sm text-accent">{m.why.join(" · ")}</p>
                    )}
                    {m.bio && <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{m.bio}</p>}
                    <div className="mt-2 flex items-center gap-2">
                      <ConnectButton targetId={p.id} state={state} />
                      {state === "mutual" && p.contact_pref && (
                        <span className="truncate text-sm font-medium">{p.contact_pref}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
