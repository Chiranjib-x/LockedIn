import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import BackLink from "@/components/back-link";
import ListingCard from "@/modules/marketplace/listing-card";
import RequestCard, { type RequestRow } from "@/modules/requests/request-card";
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
      .select("user_id, profile:profiles!space_members_user_id_fkey(name)")
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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <BackLink href="/home" label="Home" />
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold">
          {space.emoji} {space.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {members?.length ?? 0} member{(members?.length ?? 0) === 1 ? "" : "s"} · members-only —
          invisible to everyone else
        </p>
      </div>

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
