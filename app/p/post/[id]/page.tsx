import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import TypeBadge from "@/modules/board/badge";

// Phase 22 public preview for board posts — see app/p/listing/[id]/page.tsx.

type Preview = {
  id: string;
  title: string;
  type: string;
  location: string | null;
  image: string | null;
  status: string;
  event_date: string | null;
  college_name: string;
};

async function getPreview(id: string): Promise<Preview | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .rpc("public_post_preview", { pid: id })
      .maybeSingle<Preview>();
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await getPreview(id);
  if (!p) return { title: "LockedIn" };
  return {
    title: `${p.title} — LockedIn`,
    description: `${p.type[0].toUpperCase() + p.type.slice(1)} on the ${p.college_name} board`,
  };
}

export default async function PublicPostPreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getPreview(id);
  if (!p) notFound();

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-10">
      <div className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-card">
        {p.image && (
          <div className="aspect-square w-full bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-center gap-2">
            <TypeBadge type={p.type} />
            {p.status === "resolved" && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">Resolved</span>
            )}
          </div>
          <h1 className="text-xl font-bold">{p.title}</h1>
          {p.location && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {p.location}
            </p>
          )}
          {p.type === "event" && p.event_date && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />{" "}
              {new Date(p.event_date).toLocaleString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
          <p className="text-sm text-muted-foreground">On LockedIn at {p.college_name}</p>
        </div>
      </div>

      <Link
        href="/signup"
        className="press flex min-h-12 items-center justify-center rounded-full bg-primary px-6 font-semibold text-on-primary shadow-lg shadow-primary/25"
      >
        Join with your college email to see more
      </Link>
      <p className="text-center text-xs text-muted-foreground">
        Verified students only. No outsiders — that’s the point.
      </p>
    </main>
  );
}
