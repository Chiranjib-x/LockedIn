import { Card } from "@/components/ui";
import { rupees } from "@/modules/marketplace/format";
import { openChat } from "@/modules/chat/actions";
import ReportSheet from "@/modules/moderation/report-sheet";
import { setRequestFulfilled, deleteRequest } from "./actions";

export type RequestRow = {
  id: string;
  requester_id: string;
  title: string;
  description: string | null;
  category: string;
  budget: number | null;
  status: string;
};

// Server component: renders a want. The owner gets fulfill/delete controls;
// everyone else gets "I've got this" which opens a DM to the requester
// (context 'request'). Blocks are enforced inside find_or_create_dm.
export default function RequestCard({ request, meId }: { request: RequestRow; meId: string }) {
  const isMine = request.requester_id === meId;
  const fulfilled = request.status === "fulfilled";

  async function message() {
    "use server";
    await openChat(request.requester_id, "request", request.id);
  }
  async function toggle() {
    "use server";
    await setRequestFulfilled(request.id, !fulfilled);
  }
  async function remove() {
    "use server";
    await deleteRequest(request.id);
  }

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{request.title}</p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-0.5">{request.category}</span>
            {request.budget != null && <span>Budget {rupees(Number(request.budget))}</span>}
            {fulfilled && <span className="text-accent">· fulfilled</span>}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-tint-blue px-2 py-0.5 text-xs font-semibold text-tint-blue-fg">
            Wanted
          </span>
          {!isMine && <ReportSheet targetType="request" targetId={request.id} authorId={request.requester_id} compact />}
        </span>
      </div>

      {request.description && (
        <p className="whitespace-pre-wrap text-sm text-foreground/80">{request.description}</p>
      )}

      {isMine ? (
        <div className="flex gap-2">
          <form action={toggle} className="flex-1">
            <button type="submit" className="press min-h-11 w-full rounded-full border border-border text-sm font-medium hover:bg-muted">
              {fulfilled ? "Reopen" : "Mark fulfilled"}
            </button>
          </form>
          <form action={remove}>
            <button type="submit" className="press min-h-11 rounded-full border border-destructive/40 px-4 text-sm font-medium text-destructive hover:bg-destructive/10">
              Delete
            </button>
          </form>
        </div>
      ) : (
        !fulfilled && (
          <form action={message}>
            <button type="submit" className="press min-h-11 w-full rounded-full bg-primary text-sm font-semibold text-on-primary hover:bg-primary-strong">
              I&rsquo;ve got this →
            </button>
          </form>
        )
      )}
    </Card>
  );
}
