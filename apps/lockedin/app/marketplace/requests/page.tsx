import Link from "next/link";
import { HandHelping } from "lucide-react";
import { requireUser } from "@suite/auth/auth";
import { BackLink } from "@suite/ui";
import { EmptyState } from "@suite/ui";
import RequestCard, { type RequestRow } from "@/modules/requests/request-card";
import { blockedIds, notInList } from "@/modules/moderation/blocks";

// Whole-college requests (space_id null). Space requests live inside the space.
export default async function RequestsPage() {
  const { supabase, user } = await requireUser();
  const blocked = await blockedIds(supabase, user.id);

  // Open requests, plus the viewer's own fulfilled ones — otherwise a
  // fulfilled request disappears from every surface and can never be reopened.
  const { data: requests } = await supabase
    .from("requests")
    .select("id, requester_id, title, description, category, budget, status")
    .is("space_id", null)
    .or(`status.eq.open,requester_id.eq.${user.id}`)
    .not("requester_id", "in", notInList(blocked))
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <BackLink href="/marketplace" label="Marketplace" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Requests</h1>
        <Link
          href="/marketplace/requests/new"
          className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          ＋ Request
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Can&rsquo;t find it for sale? Post what you need — someone on campus may have it.
      </p>

      {!requests?.length ? (
        <EmptyState icon={HandHelping} tint="blue" title="No open requests">
          <p className="text-sm text-muted-foreground">Be the first to ask for something.</p>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {(requests as RequestRow[]).map((r) => (
            <RequestCard key={r.id} request={r} meId={user.id} />
          ))}
        </div>
      )}
    </main>
  );
}
