import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import Gallery from "@/modules/marketplace/gallery";
import TypeBadge from "@/modules/board/badge";
import ResolveButton from "@/modules/board/resolve-button";
import DeletePostButton from "@/modules/board/delete-post-button";
import { ThisIsMine, ClaimsPanel } from "@/modules/board/claims";
import { RsvpButton, FeedbackForm } from "@/modules/events/rsvp-feedback";
import ReportSheet from "@/modules/moderation/report-sheet";
import ShareButton from "@/components/share-button";
import SaveButton from "@/components/save-button";

// VIT Compass lives on its own subdomain; env-overridable so U11's neutral
// domain is a config change, not a code change.
const COMPASS_URL = process.env.NEXT_PUBLIC_COMPASS_URL ?? "https://map.lockedincampus.online";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { id } = await params;

  const { data: post } = await supabase
    .from("posts")
    .select("*, author:profiles!posts_author_id_fkey(id, name, hostel_block), community:communities(id, name, emoji), building:campus_buildings(id, name, aka)")
    .eq("id", id)
    .single();

  if (!post) notFound();
  const author = post.author as {
    id: string;
    name: string;
    hostel_block: string | null;
  };
  const club = post.community as unknown as { id: string; name: string; emoji: string } | null;
  const isMine = author.id === user.id;
  const resolvable = post.type === "lost" || post.type === "found";
  const { data: savedRow } = await supabase
    .from("saves")
    .select("target_id")
    .eq("user_id", user.id)
    .eq("target_type", "post")
    .eq("target_id", post.id)
    .maybeSingle();

  // RSVPs + feedback (0055) — events only. Feedback rows: RLS gives the
  // author everyone's, others their own.
  const isEvent = post.type === "event";
  // Server Component: renders once per request on the server, so a request-time
  // clock read is correct and idiomatic. The rule targets client render, where
  // impurity breaks memoisation.
  // eslint-disable-next-line react-hooks/purity
  const eventPast = isEvent && post.event_date != null && new Date(post.event_date).getTime() < Date.now();
  const [{ data: rsvps }, { data: feedback }] = isEvent
    ? await Promise.all([
        supabase.from("event_rsvps").select("user_id, created_at").eq("post_id", post.id).order("created_at"),
        supabase.from("event_feedback").select("user_id, rating, comment").eq("post_id", post.id),
      ])
    : [{ data: null }, { data: null }];
  const iRsvped = (rsvps ?? []).some((r) => r.user_id === user.id);
  const myFeedback = (feedback ?? []).find((f) => f.user_id === user.id);

  // Phase 30 claims: RLS returns the author's full list, a claimant only
  // their own row, everyone else nothing.
  const showClaims = post.type === "found";
  const { data: claimRows } = showClaims
    ? await supabase
        .from("post_claims")
        .select("id, answer, status, claimant_id, claimant:profiles!post_claims_claimant_id_fkey(name)")
        .eq("post_id", post.id)
    : { data: null };
  const myClaim = (claimRows ?? []).find((c) => c.claimant_id === user.id);

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <Link href={post.type === "event" ? "/events" : "/board"} className="text-sm text-muted-foreground hover:text-foreground">
          ← {post.type === "event" ? "Events" : "Board"}
        </Link>
        <span className="flex items-center gap-2">
          <SaveButton targetType="post" targetId={post.id} initialSaved={savedRow !== null} />
          <ShareButton path={`/p/post/${post.id}`} title={post.title} />
          {!isMine && <ReportSheet targetType="post" targetId={post.id} authorId={author.id} />}
        </span>
      </div>

      {post.images?.length > 0 && <Gallery images={post.images} title={post.title} />}

      <div className="flex items-center gap-2">
        <TypeBadge type={post.type} />
        {post.status === "resolved" && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">Resolved</span>
        )}
        {post.status === "claim_pending" && (
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            Claim accepted — handover pending
          </span>
        )}
      </div>

      <h1 className="text-2xl font-bold">{post.title}</h1>

      {club && (
        <Link
          href={`/communities/${club.id}`}
          className="press inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm font-semibold text-primary"
        >
          {club.emoji} {club.name}
        </Link>
      )}

      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        {post.location && (
          <p className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {post.location}
          </p>
        )}
        {/* QUEUE A34: the organiser picked this building, so we can point at the
            exact pin instead of hoping "SJT Auditorium" means something to a
            first-year. Compass honours /?b=<id> — it flies there and opens the
            sheet. `location` above still carries room-level detail. */}
        {(post.building as { id: string; name: string; aka: string | null } | null) && (
          <a
            href={`${COMPASS_URL}/?b=${(post.building as { id: string }).id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="press flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            Find {(post.building as { name: string }).name} on the campus map →
          </a>
        )}
        {post.type === "event" && post.event_date && (
          <p className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />{" "}
            {new Date(post.event_date).toLocaleString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
              timeZone: "Asia/Kolkata",
            })}
          </p>
        )}
      </div>

      {post.description && (
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">{post.description}</p>
      )}

      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-heading font-bold text-primary">
          {author.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{author.name || "Student"}</p>
          {author.hostel_block && <p className="text-xs text-muted-foreground">{author.hostel_block}</p>}
        </div>
      </div>

      {showClaims && !isMine && (post.status === "open" || myClaim != null) && (
        <ThisIsMine
          postId={post.id}
          question={post.claim_question}
          myClaimStatus={myClaim?.status ?? null}
        />
      )}
      {showClaims && isMine && (
        <ClaimsPanel
          postId={post.id}
          claims={(claimRows ?? []).map((c) => ({
            id: c.id,
            answer: c.answer,
            status: c.status,
            claimant: (c.claimant as unknown as { name: string } | null)?.name ?? "Student",
          }))}
        />
      )}

      {isEvent && !eventPast && (
        <RsvpButton postId={post.id} going={iRsvped} count={rsvps?.length ?? 0} capacity={post.capacity} />
      )}

      {isEvent && eventPast && !isMine && !myFeedback && <FeedbackForm postId={post.id} />}

      {isEvent && isMine && (feedback?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-sm font-semibold">
            Feedback · {feedback!.length} · avg{" "}
            {(feedback!.reduce((s, f) => s + f.rating, 0) / feedback!.length).toFixed(1)}⭐
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            {feedback!.filter((f) => f.comment).map((f, i) => (
              <p key={i} className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
                {"⭐".repeat(f.rating)} {f.comment}
              </p>
            ))}
          </div>
        </div>
      )}

      {isEvent && isMine && (
        <Link
          href={`/board/${post.id}/checkin`}
          className="press flex min-h-12 items-center justify-center rounded-full bg-primary px-6 font-semibold text-on-primary hover:bg-primary-strong"
        >
          Run check-in →
        </Link>
      )}

      {isMine && resolvable && <ResolveButton id={post.id} resolved={post.status === "resolved"} />}

      {isMine && <DeletePostButton id={post.id} label={post.type === "event" ? "Delete event" : "Delete post"} />}
    </main>
  );
}
