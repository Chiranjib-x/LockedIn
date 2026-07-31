import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@suite/auth/auth";
import { rupees } from "@/modules/marketplace/format";
import { openChat } from "@/modules/chat/actions";
import {
  JoinLeaveButton,
  CreatorControls,
  PayPanel,
  ConfirmPaidButton,
} from "@/modules/cabs/client";

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  full: "Full",
  completed: "Done",
  cancelled: "Cancelled",
};

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser();
  const { id } = await params;

  const { data: trip } = await supabase
    .from("trips")
    .select("*, creator:profiles!trips_creator_id_fkey(id, name)")
    .eq("id", id)
    .single();
  if (!trip) notFound();

  const { data: members } = await supabase
    .from("trip_members")
    .select("*, profile:profiles!trip_members_user_id_fkey(name)")
    .eq("trip_id", id)
    .order("joined_at");

  const creator = trip.creator as { id: string; name: string };
  const isCreator = creator.id === user.id;
  const mine = members?.find((m) => m.user_id === user.id);
  const takenSeats = members?.length ?? 0;
  const full = takenSeats >= trip.seats;

  async function messageCreator() {
    "use server";
    await openChat(creator.id, "trip", trip.id);
  }

  // Split evenly across the creator + everyone joined.
  const share = trip.fare_total != null ? Number(trip.fare_total) / (takenSeats + 1) : null;

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/cabs" className="text-sm text-muted-foreground hover:text-foreground">← Cab pooling</Link>

      <div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${trip.status === "open" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
            {STATUS_LABEL[trip.status]}
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-bold">{trip.origin} → {trip.destination}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(trip.depart_at).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}
          {" · "}posted by {isCreator ? "you" : creator.name}
          {trip.fare_total != null && <> · {rupees(Number(trip.fare_total))} total</>}
        </p>
      </div>

      {trip.notes && <p className="whitespace-pre-wrap text-[15px] text-foreground/90">{trip.notes}</p>}

      {isCreator ? (
        <CreatorControls tripId={trip.id} status={trip.status} />
      ) : (
        mine && (
          <form action={messageCreator}>
            <button type="submit" className="press rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted">
              Message trip creator 💬
            </button>
          </form>
        )
      )}

      {!isCreator && (trip.status === "open" || trip.status === "full") && (
        <JoinLeaveButton tripId={trip.id} joined={!!mine} full={full} />
      )}

      {mine && share != null && !mine.paid_confirmed && (
        <PayPanel
          memberId={mine.id}
          tripId={trip.id}
          amount={share}
          upiId={trip.upi_id}
          payeeName={creator.name}
          paidMarked={mine.paid_marked}
          route={`${trip.origin} → ${trip.destination}`}
        />
      )}
      {mine && mine.paid_confirmed && (
        <p className="rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm font-medium text-accent">
          Payment confirmed — you’re all set. 🎉
        </p>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">{takenSeats}/{trip.seats} seats taken</h2>
          {share != null && <p className="text-sm text-muted-foreground">₹{share.toFixed(0)} each (incl. creator)</p>}
        </div>
        {!members?.length ? (
          <p className="text-sm text-muted-foreground">No one’s joined yet.</p>
        ) : (
          members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5">
              <p className="min-w-0 flex-1 truncate text-sm font-medium">
                {(m.profile as { name: string })?.name ?? "Student"}
              </p>
              {share != null && (
                isCreator ? (
                  <ConfirmPaidButton memberId={m.id} tripId={trip.id} confirmed={m.paid_confirmed} />
                ) : m.paid_confirmed ? (
                  <span className="text-xs font-semibold text-accent">Paid ✓</span>
                ) : m.paid_marked ? (
                  <span className="text-xs text-muted-foreground">marked</span>
                ) : null
              )}
            </div>
          ))
        )}
      </section>
    </main>
  );
}
