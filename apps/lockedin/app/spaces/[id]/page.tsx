import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Card } from "@suite/ui";
import { BackLink } from "@suite/ui";
import ListingCard from "@/modules/marketplace/listing-card";
import RequestCard, { type RequestRow } from "@/modules/requests/request-card";
import MemberPicker, { type Student } from "@/modules/spaces/member-picker";
import AddMember from "@/modules/spaces/add-member";

export default async function SpacePage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser();
  const { id } = await params;

  // RLS: non-members get null here — the space is unreachable, not just hidden.
  const { data: space } = await supabase.from("spaces").select("*").eq("id", id).single();
  if (!space) notFound();

  const [{ data: members }, { data: listings }, { data: requests }] = await Promise.all([
    supabase
      .from("space_members")
      .select("user_id, is_lead, profile:profiles!space_members_user_id_fkey(name)")
      .eq("space_id", id),
    supabase
      .from("listings")
      .select("id, title, price, category, images, status")
      .eq("space_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("requests")
      .select("id, requester_id, title, description, category, budget, status")
      .eq("space_id", id)
      .eq("status", "open")
      .order("created_at", { ascending: false }),
  ]);

  // The space lead manages the roster without needing a moderator. is_lead lives
  // on space_members, which members can already read for their own space.
  const meRow = (members ?? []).find((m) => m.user_id === user.id) as { is_lead?: boolean } | undefined;
  const iAmLead = meRow?.is_lead === true;

  // Only fetched for the lead: the same tap-to-add list the admin screen uses.
  let leadRoster: { user_id: string; name: string | null; username: string | null; is_lead: boolean }[] = [];
  let leadCandidates: Student[] = [];
  if (iAmLead) {
    const [{ data: r }, { data: all }] = await Promise.all([
      supabase.rpc("admin_space_roster", { p_space: id }),
      supabase.from("profiles").select("id, name, username").eq("is_banned", false).order("name"),
    ]);
    leadRoster = (r ?? []) as typeof leadRoster;
    const inSpace = new Set(leadRoster.map((x) => x.user_id));
    leadCandidates = ((all ?? []) as Student[]).filter((p) => !inSpace.has(p.id));
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <BackLink href="/home" label="Home" />
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold">
          {space.emoji} {space.name}
        </h1>
        {space.description && (
          <p className="mt-0.5 text-sm text-foreground">{space.description}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {members?.length ?? 0} member{(members?.length ?? 0) === 1 ? "" : "s"} · members-only —
          invisible to everyone else
        </p>
      </div>

      {/* Members can already READ this roster (policy "space_members: members
          see the roster"), it was simply never rendered — you could see the
          count but not who. In a members-only space, knowing who else is in the
          room is the point. */}
      {(members ?? []).length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Who&rsquo;s in here</p>
          <div className="flex flex-wrap gap-2">
            {(members ?? []).map((m) => {
              const nm = (m.profile as unknown as { name: string } | null)?.name ?? "Student";
              const lead = (m as { is_lead?: boolean }).is_lead === true;
              return (
                <span
                  key={m.user_id}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm ${
                    lead ? "border-primary/40 bg-primary/10" : "border-border bg-card"
                  }`}
                >
                  {lead && <span title="Space lead">👑</span>}
                  {nm}
                  {m.user_id === user.id && <span className="text-muted-foreground">· you</span>}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {iAmLead && (
        <div className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-card p-3">
          <p className="text-sm font-semibold">👑 You manage this space</p>
          <MemberPicker
            spaceId={id}
            spaceName={space.name}
            members={leadRoster.map((r) => ({ id: r.user_id, name: r.name, username: r.username, isLead: r.is_lead }))}
            candidates={leadCandidates}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <AddMember spaceId={id} />
        <Link
          href={`/marketplace/new?space=${id}`}
          className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          ＋ Share an item
        </Link>
        <Link
          href={`/marketplace/requests/new?space=${id}`}
          className="press rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          🙋 Request something
        </Link>
      </div>

      {(requests?.length ?? 0) > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Requests</h2>
          {(requests as RequestRow[]).map((r) => (
            <RequestCard key={r.id} request={r} meId={user.id} />
          ))}
        </section>
      )}

      {!listings?.length ? (
        <Card className="mt-2 flex flex-col items-center gap-2 py-10 text-center">
          <span className="text-3xl">{space.emoji}</span>
          <p className="font-medium">Nothing shared yet</p>
          <p className="text-sm text-muted-foreground">
            Lehengas, jackets, heels, jewellery — post what you’re happy to lend or sell.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {listings.map((l, i) => (
            <ListingCard key={l.id} listing={l} index={i} />
          ))}
        </div>
      )}
    </main>
  );
}
