import Link from "next/link";
import { BarChart3, CalendarDays, Download, MapPin, Megaphone, Sparkles, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import TypeBadge from "@/modules/board/badge";
import { JoinLeaveButton, InterestButton, RecruitingToggle, RoleControls } from "@/modules/communities/client";
import PositionEditor from "@/modules/communities/position-editor";
import QuestionsEditor from "@/modules/communities/questions-editor";
import Meetings from "@/modules/communities/meetings";
import { TaskBoard, Resources, Inventory } from "@/modules/communities/ops";
import Money from "@/modules/communities/money";
import { Polls, Scheduled } from "@/modules/communities/polls";
import { openChat } from "@/modules/chat/actions";
import { decideApplication, withdrawApplication } from "@/modules/communities/actions";

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ applied?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { id } = await params;
  const { applied } = await searchParams;

  const { data: community } = await supabase.from("communities").select("*").eq("id", id).single();
  if (!community || !community.is_approved) notFound();

  const [{ data: members }, { data: posts }, { data: interests }, { data: questions }, { data: applications }] = await Promise.all([
    supabase
      .from("community_members")
      .select("user_id, role, position, profile:profiles!community_members_user_id_fkey(name)")
      .eq("community_id", id),
    supabase
      .from("posts")
      .select("id, type, title, images, location, event_date, created_at")
      .eq("community_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    // RLS: a regular viewer gets only their own row; a moderator gets all leads.
    supabase
      .from("community_interests")
      .select("user_id, created_at, profile:profiles!community_interests_user_id_fkey(name)")
      .eq("community_id", id),
    supabase.from("community_questions").select("id, prompt").eq("community_id", id).order("ord").order("created_at"),
    // RLS: applicant sees own; leads see all of this community's.
    supabase
      .from("community_applications")
      .select("id, user_id, answers, status, created_at, profile:profiles!community_applications_user_id_fkey(name)")
      .eq("community_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const me = members?.find((m) => m.user_id === user.id);
  const mods = (members ?? []).filter((m) => m.role === "moderator");
  const isMod = me?.role === "moderator";
  const iAmInterested = (interests ?? []).some((x) => x.user_id === user.id);
  const team = (members ?? []).filter((m) => (m as { position: string | null }).position);
  const nameOf = (m: unknown) => (((m as { profile: { name: string } | null }).profile)?.name) ?? "Student";
  const hasForm = (questions?.length ?? 0) > 0;
  const myApplication = (applications ?? []).find((a) => a.user_id === user.id && a.status === "pending");
  const pendingApps = isMod ? (applications ?? []).filter((a) => a.status === "pending") : [];

  // Meetings (0055): members see the list; leads schedule + roll-call.
  const { data: meetings } = me
    ? await supabase.from("team_meetings").select("id, title, meet_at").eq("community_id", id).order("meet_at", { ascending: false }).limit(12)
    : { data: null };
  const { data: attendanceRows } = meetings?.length
    ? await supabase.from("meeting_attendance").select("meeting_id, user_id").in("meeting_id", meetings.map((m) => m.id))
    : { data: null };
  const attendance: Record<string, string[]> = {};
  for (const r of attendanceRows ?? []) (attendance[r.meeting_id] ??= []).push(r.user_id);

  // Team ops (0056) — members read all three; writes are lead-gated by RLS.
  const [{ data: tasks }, { data: resources }, { data: inventory }, { data: collections }] = me
    ? await Promise.all([
        supabase.from("community_tasks").select("id, title, assignee_id, due_date, status").eq("community_id", id).order("created_at", { ascending: false }),
        supabase.from("community_resources").select("id, label, url").eq("community_id", id).order("created_at", { ascending: false }),
        supabase.from("community_inventory").select("id, item, holder_id, note").eq("community_id", id).order("created_at", { ascending: false }),
        // Money (0057): collections + their dues, one nested read.
        supabase.from("community_collections")
          .select("id, title, kind, amount, upi_id, dues:collection_dues(id, user_id, amount, paid)")
          .eq("community_id", id).order("created_at", { ascending: false }),
      ])
    : [{ data: null }, { data: null }, { data: null }, { data: null }];

  // Polls (0058) — members read + vote; scheduled posts are lead-only (RLS).
  const [{ data: polls }, { data: scheduled }] = me
    ? await Promise.all([
        supabase.from("community_polls")
          .select("id, question, options, closes_at, votes:poll_votes(user_id, choice)")
          .eq("community_id", id).order("created_at", { ascending: false }),
        isMod
          ? supabase.from("scheduled_posts").select("id, title, publish_at").eq("community_id", id).eq("published", false).order("publish_at")
          : Promise.resolve({ data: null }),
      ])
    : [{ data: null }, { data: null }];

  // Member activity insights (lead-only): meetings attended per member, from
  // the roll-call data already loaded above. No new query.
  const meetingCount = meetings?.length ?? 0;
  const attendedByUser: Record<string, number> = {};
  for (const ids of Object.values(attendance)) for (const uid of ids) attendedByUser[uid] = (attendedByUser[uid] ?? 0) + 1;
  const memberList = (members ?? []).map((m) => ({ user_id: m.user_id, name: nameOf(m) }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/communities" className="text-sm text-muted-foreground hover:text-foreground">← Communities</Link>

      <div className="animate-fade-up flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">
              {community.emoji} {community.name}
            </h1>
            {community.is_official && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">✔ Official</span>
            )}
            {community.recruiting && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                🟢 Recruiting
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {members?.length ?? 0} member{(members?.length ?? 0) === 1 ? "" : "s"} · run by{" "}
            {mods.map((m) => (m.profile as unknown as { name: string })?.name).filter(Boolean).join(", ") || "the community"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {me || !hasForm ? (
            <JoinLeaveButton id={id} joined={!!me} />
          ) : myApplication ? (
            <form
              action={async () => {
                "use server";
                await withdrawApplication(id);
              }}
            >
              <button type="submit" className="press rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
                Application pending — withdraw
              </button>
            </form>
          ) : (
            <Link
              href={`/communities/${id}/apply`}
              className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary hover:bg-primary-strong"
            >
              Apply to join
            </Link>
          )}
          {!me && <InterestButton id={id} interested={iAmInterested} />}
        </div>
      </div>

      {applied && (
        <p className="rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
          Application sent — the leads will review it. 📨
        </p>
      )}

      {community.description && (
        <p className="text-[15px] leading-relaxed text-foreground/90">{community.description}</p>
      )}

      {team.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">The team</h2>
          <div className="flex flex-wrap gap-2">
            {team.map((m) => (
              <span key={m.user_id} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                <span className="font-medium">{nameOf(m)}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {(m as { position: string }).position}
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

      {isMod && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link
            href={`/board/new?community=${id}`}
            className="press flex min-h-11 items-center justify-center rounded-full border border-primary/40 bg-primary/5 px-5 text-sm font-semibold text-primary"
          >
            <Megaphone className="mr-1.5 h-4 w-4" strokeWidth={2} /> Post an update or event
          </Link>
          <RecruitingToggle id={id} recruiting={community.recruiting} />
          <Link
            href={`/communities/${id}/analytics`}
            className="press flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold hover:bg-muted"
          >
            <BarChart3 className="h-4 w-4 text-primary" strokeWidth={2} /> View analytics
          </Link>
          <a
            href={`/communities/${id}/export`}
            className="press flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold hover:bg-muted"
          >
            <Download className="h-4 w-4 text-primary" strokeWidth={2} /> Export members (CSV)
          </a>
        </div>
      )}

      {isMod && <QuestionsEditor cid={id} questions={questions ?? []} />}

      {me && (
        <Meetings
          cid={id}
          isLead={!!isMod}
          meetings={meetings ?? []}
          members={memberList}
          attendance={attendance}
        />
      )}

      {me && <TaskBoard cid={id} isLead={!!isMod} tasks={tasks ?? []} members={memberList} />}
      {me && <Resources cid={id} isLead={!!isMod} resources={resources ?? []} />}
      {me && <Inventory cid={id} isLead={!!isMod} items={inventory ?? []} members={memberList} />}
      {me && (
        <Money
          cid={id}
          isLead={!!isMod}
          meId={user.id}
          collections={(collections ?? []) as Parameters<typeof Money>[0]["collections"]}
          members={memberList}
        />
      )}
      {me && <Polls cid={id} isLead={!!isMod} meId={user.id} polls={(polls ?? []) as Parameters<typeof Polls>[0]["polls"]} />}
      {isMod && <Scheduled cid={id} scheduled={scheduled ?? []} />}

      {isMod && pendingApps.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">📩 Applications · {pendingApps.length}</h2>
          {pendingApps.map((a) => {
            const decide = async (accept: boolean) => {
              "use server";
              await decideApplication(a.id, id, accept);
            };
            return (
              <Card key={a.id} className="flex flex-col gap-2">
                <p className="font-medium">{(a.profile as unknown as { name: string } | null)?.name ?? "Student"}</p>
                {(a.answers as { q: string; a: string }[]).map((ans, i) => (
                  <div key={i} className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">{ans.q}</p>
                    <p className="whitespace-pre-wrap">{ans.a}</p>
                  </div>
                ))}
                <div className="flex gap-2">
                  <form action={decide.bind(null, true)} className="flex-1">
                    <button type="submit" className="press min-h-10 w-full rounded-full bg-accent text-sm font-semibold text-on-accent">
                      Accept — add to members
                    </button>
                  </form>
                  <form action={decide.bind(null, false)}>
                    <button type="submit" className="press min-h-10 rounded-full border border-destructive/40 px-4 text-sm font-medium text-destructive hover:bg-destructive/10">
                      Reject
                    </button>
                  </form>
                </div>
              </Card>
            );
          })}
        </section>
      )}

      {isMod && (interests?.length ?? 0) > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-primary" strokeWidth={2} /> Interested · {interests!.length}
          </h2>
          <p className="text-xs text-muted-foreground">Students who tapped “I’m interested” — reach out to recruit them.</p>
          {interests!.map((it) => {
            async function message() {
              "use server";
              await openChat(it.user_id, null, null);
            }
            return (
              <Card key={it.user_id} className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">
                  {(it.profile as unknown as { name: string } | null)?.name ?? "Student"}
                </span>
                <form action={message}>
                  <button type="submit" className="press min-h-9 shrink-0 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted">
                    Message
                  </button>
                </form>
              </Card>
            );
          })}
        </section>
      )}

      {isMod && (members?.length ?? 0) > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5 text-primary" strokeWidth={2} /> Members · {members!.length}
          </h2>
          {meetingCount > 0 && (
            <p className="text-xs text-muted-foreground">Attendance shown per member across {meetingCount} meeting{meetingCount === 1 ? "" : "s"}.</p>
          )}
          {members!.map((m) => {
            const name = (m.profile as unknown as { name: string } | null)?.name ?? "Student";
            async function message() {
              "use server";
              await openChat(m.user_id, null, null);
            }
            const position = (m as { position: string | null }).position;
            const attended = attendedByUser[m.user_id] ?? 0;
            return (
              <Card key={m.user_id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">{name}</span>
                    {m.role === "moderator" && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Moderator</span>
                    )}
                    {meetingCount > 0 && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {attended}/{meetingCount} present
                      </span>
                    )}
                  </span>
                  {m.user_id !== user.id && (
                    <form action={message}>
                      <button type="submit" className="press min-h-9 shrink-0 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted">
                        Message
                      </button>
                    </form>
                  )}
                </div>
                <PositionEditor cid={id} uid={m.user_id} current={position} />
                <RoleControls cid={id} uid={m.user_id} role={m.role} isSelf={m.user_id === user.id} />
              </Card>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Updates</h2>
        {!posts?.length ? (
          <Card className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="text-3xl">{community.emoji}</span>
            <p className="text-sm text-muted-foreground">
              Nothing yet — updates and events from the moderators land here.
            </p>
          </Card>
        ) : (
          posts.map((p, i) => (
            <Link key={p.id} href={`/board/${p.id}`} className="animate-fade-up press" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <Card>
                <div className="flex items-center gap-2">
                  <TypeBadge type={p.type} />
                  {p.type === "event" && p.event_date && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3 shrink-0" strokeWidth={2} />
                      {new Date(p.event_date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                    </span>
                  )}
                </div>
                <h3 className="mt-1 font-semibold">{p.title}</h3>
                {p.location && (
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {p.location}
                  </p>
                )}
              </Card>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
