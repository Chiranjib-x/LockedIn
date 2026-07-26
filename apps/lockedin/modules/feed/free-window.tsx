import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Section } from "@suite/ui";
import { getFreeWindow, istNow, type TimetableEntry } from "@/modules/timetable/helpers";

// "While you're free" — the timetable is the moat: things you could actually
// do in the gap before your next class (open gate pickups, cabs departing).
// Renders only when the user has a timetable and a ≥20-minute window.
// Date.now() in standalone helpers per the react-hooks/purity pattern.
function isoMinutesFromNow(min: number) {
  return new Date(Date.now() + min * 60000).toISOString();
}
function minutesUntil(iso: string) {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000));
}

export default async function FreeWindow() {
  let pickups: { id: string; platform: string; item_desc: string; reward: number; expected_at: string }[] = [];
  let trips: { id: string; destination: string; depart_at: string; seats: number }[] = [];
  let window: number | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: entries } = await supabase
      .from("timetable_entries")
      .select("id, day_of_week, starts_at, ends_at, course_code, title, venue, min_attendance");
    window = getFreeWindow((entries ?? []) as TimetableEntry[], istNow());
    if (window === null || window < 20) return null;

    const horizon = isoMinutesFromNow(window);
    const [pickupsRes, tripsRes] = await Promise.all([
      supabase
        .from("pickup_requests")
        .select("id, platform, item_desc, reward, expected_at")
        .eq("status", "open")
        .neq("requester_id", user.id)
        .lte("expected_at", horizon)
        .gte("expected_at", isoMinutesFromNow(-15))
        .order("expected_at")
        .limit(3),
      supabase
        .from("trips")
        .select("id, destination, depart_at, seats")
        .eq("status", "open")
        .neq("creator_id", user.id)
        .lte("depart_at", horizon)
        .gte("depart_at", isoMinutesFromNow(0))
        .order("depart_at")
        .limit(3),
    ]);
    pickups = pickupsRes.data ?? [];
    trips = tripsRes.data ?? [];
  } catch {
    return null;
  }

  if (pickups.length === 0 && trips.length === 0) return null;

  return (
    <Section title={`While you’re free (${window}m)`}>
      <div className="flex flex-col gap-2">
        {pickups.map((r) => (
          <Link key={r.id} href="/gate" className="press">
            <Card className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">🏃 {r.platform} · {r.item_desc}</p>
                <p className="text-xs text-muted-foreground">at the gate in ~{minutesUntil(r.expected_at)}m</p>
              </div>
              {Number(r.reward) > 0 && (
                <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                  ₹{Number(r.reward).toFixed(0)}
                </span>
              )}
            </Card>
          </Link>
        ))}
        {trips.map((t) => (
          <Link key={t.id} href={`/cabs/${t.id}`} className="press">
            <Card className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">🚕 {t.destination}</p>
                <p className="text-xs text-muted-foreground">leaves in ~{minutesUntil(t.depart_at)}m</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Section>
  );
}
