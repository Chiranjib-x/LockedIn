import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { rupees } from "@/modules/marketplace/format";
import { AddPoolMember, MemberRow, SplitEvenlyButton } from "@/modules/subscriptions/client";
import { DiscoverToggle, RequestJoin, JoinRequestsPanel } from "@/modules/subscriptions/discovery";
import { openChat } from "@/modules/chat/actions";

export default async function SubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser();
  const { id } = await params;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*, owner:profiles!subscriptions_owner_id_fkey(id, name)")
    .eq("id", id)
    .single();
  if (!sub) notFound();

  const { data: members } = await supabase
    .from("subscription_members")
    .select("*, profile:profiles!subscription_members_user_id_fkey(name)")
    .eq("subscription_id", id)
    .order("created_at");

  const owner = sub.owner as { id: string; name: string };
  const isOwner = owner.id === user.id;
  const isMember = (members ?? []).some((m) => m.user_id === user.id);

  // Phase 31: seat requests (owner sees all on their pool; requester their own).
  const { data: joinReqs } = await supabase
    .from("sub_join_requests")
    .select("id, note, status, requester_id, requester:profiles!sub_join_requests_requester_id_fkey(name)")
    .eq("subscription_id", id);
  const myRequest = (joinReqs ?? []).find((r) => r.requester_id === user.id);

  async function messageOwner() {
    "use server";
    await openChat(owner.id, "subscription", sub.id);
  }
  const list = (members ?? []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    share_amount: Number(m.share_amount),
    paid_status: m.paid_status,
    name: (m.profile as { name: string })?.name ?? "Student",
  }));
  const unpaid = list.filter((m) => !m.paid_status);
  const days = Math.ceil((new Date(sub.renewal_date).getTime() - Date.now()) / 86400000);
  const defaultShare = Math.ceil(Number(sub.total_cost) / sub.seats);

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/subscriptions" className="text-sm text-muted-foreground hover:text-foreground">← Pools</Link>

      <div>
        <h1 className="text-2xl font-bold">{sub.service_name}</h1>
        <p className="text-sm text-muted-foreground">
          {rupees(Number(sub.total_cost))}/{sub.billing_cycle === "monthly" ? "month" : "year"} · owned by{" "}
          {isOwner ? "you" : owner.name} · {sub.seats} seats
        </p>
      </div>

      <div className={`rounded-2xl border p-3 text-sm font-medium ${days <= 5 ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-border bg-card"}`}>
        <CalendarDays className="mr-1 inline h-3.5 w-3.5" strokeWidth={2} />
        Renews {new Date(sub.renewal_date).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
        {days > 0 && <> — in {days} day{days === 1 ? "" : "s"}</>}
        {unpaid.length > 0 && <> · {unpaid.length} member{unpaid.length === 1 ? "" : "s"} still owe{unpaid.length === 1 ? "s" : ""}</>}
      </div>

      {isOwner ? (
        <>
          <DiscoverToggle subId={sub.id} discoverable={sub.is_discoverable} openSeats={sub.open_seats} />
          <JoinRequestsPanel
            requests={(joinReqs ?? [])
              .filter((r) => r.status === "pending")
              .map((r) => ({
                id: r.id,
                note: r.note,
                requester: (r.requester as unknown as { name: string } | null)?.name ?? "Student",
              }))}
          />
          <div className="flex flex-wrap gap-2">
            <AddPoolMember subId={sub.id} defaultShare={defaultShare} memberIds={[...list.map((m) => m.user_id), owner.id]} />
            {list.length > 0 && <SplitEvenlyButton subId={sub.id} />}
          </div>
        </>
      ) : isMember ? (
        <form action={messageOwner}>
          <button type="submit" className="press rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted">
            Message owner 💬
          </button>
        </form>
      ) : (
        sub.is_discoverable &&
        sub.open_seats > 0 && <RequestJoin subId={sub.id} alreadyAsked={myRequest != null} />
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{list.length} member{list.length === 1 ? "" : "s"}</h2>
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground">No members yet — add the people you share with.</p>
        )}
        {list.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            subId={sub.id}
            isOwner={isOwner}
            isMe={m.user_id === user.id}
            upiId={sub.upi_id}
            ownerName={owner.name}
            serviceName={sub.service_name}
          />
        ))}
      </section>

      {isOwner && list.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Tap a member’s amount to edit their share. “Split evenly” divides {rupees(Number(sub.total_cost))} across
          everyone including you.
        </p>
      )}
    </main>
  );
}
