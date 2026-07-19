import Link from "next/link";
import { CalendarDays, MapPin, PartyPopper } from "lucide-react";
import { requireUser } from "@/lib/auth";
import EmptyState from "@/components/empty-state";
import { Card } from "@/components/ui";
import { blockedIds, notInList } from "@/modules/moderation/blocks";
import { istTodayISO } from "@/modules/timetable/helpers";

// Dedicated events surface — split out of the board so lost & found and events
// don't share one feed. Detail (+ organizer check-in) still lives at /board/[id].
export default async function EventsPage() {
  const { supabase, user } = await requireUser();
  const blocked = await blockedIds(supabase, user.id);

  const { start: startOfDay } = istTodayISO();

  // Upcoming events, soonest first. Past events drop off the list.
  const { data: events } = await supabase
    .from("posts")
    .select("id, title, images, location, event_date, status, community:communities(id, name, emoji)")
    .eq("type", "event")
    .gte("event_date", startOfDay)
    .not("author_id", "in", notInList(blocked))
    .order("event_date", { ascending: true })
    .limit(60);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        <Link
          href="/events/new"
          className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          ＋ Post event
        </Link>
      </div>

      {!events?.length ? (
        <EmptyState icon={PartyPopper} tint="violet" title="No upcoming events">
          <p className="text-sm text-muted-foreground">
            Hosting something? Post it — fests, meets, open mics, workshops.
          </p>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((e, i) => (
            <Link key={e.id} href={`/board/${e.id}`} className="animate-fade-up press" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
              <Card className={e.status === "resolved" ? "opacity-55" : ""}>
                <div className="flex gap-3">
                  {e.images?.[0] && (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={e.images[0]} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {e.event_date && (
                      <p className="flex items-center gap-1 text-xs font-semibold text-tint-violet-fg">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
                        {new Date(e.event_date).toLocaleString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: "Asia/Kolkata",
                        })}
                      </p>
                    )}
                    <h2 className="mt-1 truncate font-semibold">{e.title}</h2>
                    {(() => {
                      const club = e.community as unknown as { name: string; emoji: string } | null;
                      return club ? (
                        <p className="truncate text-xs font-medium text-primary">
                          {club.emoji} {club.name}
                        </p>
                      ) : null;
                    })()}
                    {e.location && (
                      <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {e.location}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
