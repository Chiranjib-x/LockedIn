import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Card, inputClass } from "@/components/ui";

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  full: "Full",
  completed: "Done",
  cancelled: "Cancelled",
};

function timeLabel(departAt: string) {
  return new Date(departAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default async function CabsPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string; date?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { destination, date } = await searchParams;

  let query = supabase
    .from("trips")
    .select("*, creator:profiles!trips_creator_id_fkey(name), members:trip_members(user_id)")
    .in("status", ["open", "full"])
    .order("depart_at", { ascending: true })
    .limit(40);

  if (destination) {
    query = query.or(`destination.ilike.%${destination}%,origin.ilike.%${destination}%`);
  }
  if (date) {
    const start = new Date(date + "T00:00:00");
    const end = new Date(date + "T23:59:59");
    query = query.gte("depart_at", start.toISOString()).lte("depart_at", end.toISOString());
  }

  const { data: trips } = await query;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cab pooling</h1>
        <Link
          href="/cabs/new"
          className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          ＋ Post a trip
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          name="destination"
          defaultValue={destination}
          placeholder="Search by place…"
          className={inputClass}
        />
        <input
          name="date"
          type="date"
          defaultValue={date}
          className={`${inputClass} w-auto`}
        />
        <button type="submit" className="press min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-medium">
          Go
        </button>
      </form>

      {!trips?.length ? (
        <Card className="mt-2 flex flex-col items-center gap-2 py-10 text-center">
          <span className="text-3xl">🚕</span>
          <p className="font-medium">No trips found</p>
          <p className="text-sm text-muted-foreground">Post one and split the fare with people headed the same way.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {trips.map((t, i) => {
            const joined = (t.members as { user_id: string }[]).some((m) => m.user_id === user.id);
            const takenSeats = (t.members as unknown[]).length;
            return (
              <Link key={t.id} href={`/cabs/${t.id}`} className="animate-fade-up press" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                <Card className="transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === "open" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                    {joined && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">You’re in</span>}
                    <span className="ml-auto text-xs text-muted-foreground">{timeLabel(t.depart_at)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="max-w-[38%] truncate rounded-full bg-tint-blue px-2.5 py-0.5 text-sm font-semibold text-tint-blue-fg">
                      {t.origin}
                    </span>
                    <span className="route-dash min-w-4 flex-1" />
                    <span className="max-w-[38%] truncate rounded-full bg-tint-green px-2.5 py-0.5 text-sm font-semibold text-tint-green-fg">
                      {t.destination}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    by {(t.creator as { name: string })?.name ?? "someone"} ·
                    <span className="flex items-center gap-1" title={`${takenSeats}/${t.seats} seats taken`}>
                      {Array.from({ length: Math.min(t.seats, 8) }).map((_, si) => (
                        <span key={si} className={`h-2 w-2 rounded-full ${si < takenSeats ? "bg-muted-foreground/50" : "glow-primary bg-accent"}`} />
                      ))}
                    </span>
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
