import { notFound } from "next/navigation";
import { UserPlus, Users, Sparkles, CalendarDays, UserCheck, Megaphone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import BackLink from "@/components/back-link";

type Stats = {
  members: number;
  new_members_7d: number;
  interested: number;
  events: number;
  checkins: number;
  updates: number;
};

export default async function ClubAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser();
  const { id } = await params;

  const { data: community } = await supabase.from("communities").select("id, name, emoji").eq("id", id).single();
  if (!community) notFound();

  // Moderator gate (the RPC re-checks; this hides the page from non-mods).
  const { data: me } = await supabase
    .from("community_members").select("role").eq("community_id", id).eq("user_id", user.id).maybeSingle();
  const { data: prof } = await supabase.from("profiles").select("is_moderator").eq("id", user.id).single();
  if (me?.role !== "moderator" && !prof?.is_moderator) notFound();

  const { data: stats } = await supabase.rpc("club_stats", { cid: id }).single<Stats>();
  const s = stats ?? { members: 0, new_members_7d: 0, interested: 0, events: 0, checkins: 0, updates: 0 };

  const tiles = [
    { label: "Members", value: s.members, sub: s.new_members_7d > 0 ? `+${s.new_members_7d} this week` : "total", Icon: Users, tint: "bg-tint-blue text-tint-blue-fg" },
    { label: "New this week", value: s.new_members_7d, sub: "members joined", Icon: UserPlus, tint: "bg-tint-green text-tint-green-fg" },
    { label: "Interested", value: s.interested, sub: "leads to follow up", Icon: Sparkles, tint: "bg-tint-violet text-tint-violet-fg" },
    { label: "Events", value: s.events, sub: "posted", Icon: CalendarDays, tint: "bg-tint-amber text-tint-amber-fg" },
    { label: "Check-ins", value: s.checkins, sub: "across all events", Icon: UserCheck, tint: "bg-tint-teal text-tint-teal-fg" },
    { label: "Announcements", value: s.updates, sub: "sent to members", Icon: Megaphone, tint: "bg-tint-rose text-tint-rose-fg" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <BackLink href={`/communities/${id}`} label={community.name} />
      <div>
        <h1 className="text-2xl font-bold">{community.emoji} Analytics</h1>
        <p className="text-sm text-muted-foreground">How {community.name} is doing on LockedIn.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="flex flex-col gap-2">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${t.tint}`}>
              <t.Icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="font-heading text-3xl font-bold">{t.value}</p>
            <div>
              <p className="text-sm font-semibold">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      <p className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
        Grow these: keep <span className="font-medium text-foreground">Recruiting</span> on during Quanta, post events
        (each one notifies every member), and follow up with your interested leads.
      </p>
    </main>
  );
}
