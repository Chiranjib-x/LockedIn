import Link from "next/link";
import { MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import Confetti from "@/components/confetti";
import { requireUser } from "@/lib/auth";
import { rupees } from "@/modules/marketplace/format";
import { openChat } from "@/modules/chat/actions";
import SaveButton from "@/components/save-button";
import {
  JoinForm,
  LeaveButton,
  OrganizerControls,
  LogisticsForm,
  PayPanel,
  ConfirmPaidButton,
} from "@/modules/groupbuy/client";

const STATUS_STEPS = ["open", "closed", "ordered", "arrived", "collecting", "completed"] as const;
const STEP_LABEL: Record<string, string> = {
  open: "Joining",
  closed: "Locked",
  ordered: "Ordered",
  arrived: "Arrived",
  collecting: "Collecting",
  completed: "Done",
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser();
  const { id } = await params;

  const { data: order } = await supabase
    .from("group_orders")
    .select("*, organizer:profiles!group_orders_organizer_id_fkey(id, name)")
    .eq("id", id)
    .single();
  if (!order) notFound();

  const { data: items } = await supabase
    .from("group_order_items")
    .select("*, profile:profiles!group_order_items_user_id_fkey(name)")
    .eq("order_id", id)
    .order("created_at");

  const organizer = order.organizer as { id: string; name: string };
  const isOrganizer = organizer.id === user.id;
  const mine = items?.find((it) => it.user_id === user.id);

  async function messageOrganizer() {
    "use server";
    await openChat(organizer.id, "group_order", order.id);
  }
  const { data: savedRow } = await supabase
    .from("saves")
    .select("target_id")
    .eq("user_id", user.id)
    .eq("target_type", "group_order")
    .eq("target_id", order.id)
    .maybeSingle();
  const total = (items ?? []).reduce((s, it) => s + Number(it.amount_owed), 0);
  const collected = (items ?? []).filter((it) => it.paid_confirmed).reduce((s, it) => s + Number(it.amount_owed), 0);
  const stepIdx = STATUS_STEPS.indexOf(order.status);

  // Phase 35 fee split — computed at display time (never persisted), so it
  // self-corrects as people join/leave; same philosophy as cab fare splits.
  const fee = order.delivery_fee == null ? 0 : Number(order.delivery_fee);
  const n = items?.length ?? 0;
  const feeShare = (amount: number) => {
    if (fee <= 0 || n === 0) return 0;
    if (order.split_mode === "proportional" && total > 0) return Math.ceil((amount / total) * fee);
    return Math.ceil(fee / n);
  };

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      {order.status === "completed" && <Confetti id={`gb-${order.id}`} />}
      <div className="flex items-center justify-between">
        <Link href="/group-buy" className="text-sm text-muted-foreground hover:text-foreground">← Group-buys</Link>
        <SaveButton targetType="group_order" targetId={order.id} initialSaved={savedRow !== null} />
      </div>

      <div>
        <h1 className="text-2xl font-bold">{order.title}</h1>
        <p className="text-sm text-muted-foreground">
          {order.category} · organized by {organizer.name}
          {order.unit_price != null && <> · {rupees(order.unit_price)}/unit</>}
        </p>
      </div>

      {/* status timeline */}
      {order.status === "cancelled" ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
          This order was cancelled.
        </p>
      ) : (
        <div className="flex items-center gap-1">
          {STATUS_STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`h-1.5 w-full rounded-full ${
                  i < stepIdx
                    ? "gradient-brand"
                    : i === stepIdx
                      ? "gradient-brand glow-primary animate-pulse"
                      : "bg-muted"
                }`}
              />
              <span className={`text-[10px] font-medium ${i <= stepIdx ? "text-primary" : "text-muted-foreground"}`}>
                {STEP_LABEL[s]}
              </span>
            </div>
          ))}
        </div>
      )}

      {order.pickup_location != null && (order.status === "arrived" || order.status === "collecting") && (
        <p className="flex items-center gap-1.5 rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm font-medium text-accent">
          <MapPin className="h-4 w-4 shrink-0" strokeWidth={2} /> Collect from {order.pickup_location}
        </p>
      )}

      {order.description && <p className="whitespace-pre-wrap text-[15px] text-foreground/90">{order.description}</p>}

      {order.status === "open" && (
        <p className="text-sm text-muted-foreground">
          ⏳ Joining closes {new Date(order.deadline).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
        </p>
      )}

      {isOrganizer ? (
        <>
          <OrganizerControls orderId={order.id} status={order.status} />
          <LogisticsForm
            orderId={order.id}
            pickup={order.pickup_location}
            fee={order.delivery_fee == null ? null : Number(order.delivery_fee)}
            splitMode={order.split_mode ?? "even"}
          />
        </>
      ) : (
        mine && (
          <form action={messageOrganizer}>
            <button type="submit" className="press rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted">
              Message organizer 💬
            </button>
          </form>
        )
      )}

      {!mine && order.status === "open" && !isOrganizer && (
        <JoinForm orderId={order.id} unitPrice={order.unit_price != null ? Number(order.unit_price) : null} />
      )}

      {fee > 0 && (
        <p className="rounded-2xl border border-border bg-card p-3 text-sm text-muted-foreground">
          🚚 Delivery fee {rupees(fee)} split {order.split_mode === "proportional" ? "by order value" : "evenly"}
          {mine && feeShare(Number(mine.amount_owed)) > 0 && (
            <> — your share {rupees(feeShare(Number(mine.amount_owed)))}</>
          )}
        </p>
      )}

      {mine && order.status === "collecting" && !mine.paid_confirmed && (
        <PayPanel
          itemId={mine.id}
          orderId={order.id}
          amount={Number(mine.amount_owed) + feeShare(Number(mine.amount_owed))}
          upiId={order.upi_id}
          payeeName={organizer.name}
          paidMarked={mine.paid_marked}
          title={order.title}
        />
      )}
      {mine && mine.paid_confirmed && (
        <>
          <Confetti id={`gb-paid-${mine.id}`} />
          <p className="rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm font-medium text-accent">
            Payment confirmed — you’re all set. 🎉
          </p>
        </>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">{items?.length ?? 0} joined</h2>
          <p className="text-sm text-muted-foreground">
            total {rupees(total)}
            {order.status === "collecting" && <> · collected {rupees(collected)}</>}
          </p>
        </div>
        {(items ?? []).map((it) => (
          <div key={it.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {(it.profile as { name: string })?.name ?? "Student"}
                <span className="text-muted-foreground"> × {it.quantity}</span>
              </p>
              {it.note && <p className="truncate text-xs text-muted-foreground">{it.note}</p>}
            </div>
            <span className="font-heading text-sm font-bold">{rupees(Number(it.amount_owed))}</span>
            {order.status !== "open" && (
              isOrganizer ? (
                <ConfirmPaidButton itemId={it.id} orderId={order.id} confirmed={it.paid_confirmed} />
              ) : it.paid_confirmed ? (
                <span className="text-xs font-semibold text-accent">Paid ✓</span>
              ) : it.paid_marked ? (
                <span className="text-xs text-muted-foreground">marked</span>
              ) : null
            )}
          </div>
        ))}
      </section>

      {mine && order.status === "open" && <LeaveButton orderId={order.id} />}
    </main>
  );
}
