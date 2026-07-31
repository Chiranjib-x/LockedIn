import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@suite/auth/server";
import { CATEGORY_META } from "@/modules/communities/categories";

// Public preview for a club page — same shape as app/p/listing/[id]/page.tsx and
// app/p/post/[id]/page.tsx, added later because clubs never had one.
//
// This is the link a secretary can actually paste into their own group: it opens
// without an account, so it works on people who don't have one yet. The gated
// /communities/[id] page stays the destination for everything else.

type Preview = {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  category: string;
  logo_url: string | null;
  is_official: boolean;
  recruiting: boolean;
  member_count: number;
  college_name: string;
};

async function getPreview(id: string): Promise<Preview | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .rpc("public_club_preview", { cid: id })
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
    title: `${p.name} — LockedIn`,
    description:
      p.description?.slice(0, 160) ??
      `${CATEGORY_META[p.category]?.label ?? "Community"} at ${p.college_name}`,
  };
}

export default async function PublicClubPreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getPreview(id);
  if (!p) notFound();

  const meta = CATEGORY_META[p.category];
  // A brand-new club showing "0 members" on a card being pasted into a group is
  // an advert for it being dead. Say nothing instead — the count returns the
  // moment there is one to be proud of.
  const count = Number(p.member_count);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-10">
      <div className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-start gap-3">
            {p.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.logo_url} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
                {p.emoji ?? meta?.emoji ?? "✨"}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold">{p.name}</h1>
              <p className="text-sm text-muted-foreground">
                {meta?.label ?? "Community"} · {p.college_name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {p.is_official && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                ✔ Official
              </span>
            )}
            {p.recruiting && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 font-semibold text-accent">
                🟢 Recruiting
              </span>
            )}
            {count > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                {count} member{count === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {p.description && <p className="text-sm">{p.description}</p>}
        </div>
      </div>

      <Link
        href="/signup"
        className="press flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-center font-semibold text-on-primary shadow-lg shadow-primary/25"
      >
        {p.recruiting ? "Join with your college email to apply" : "Join with your college email to follow"}
      </Link>
      <p className="text-center text-xs text-muted-foreground">
        Verified students only. No outsiders — that’s the point.
      </p>
    </main>
  );
}
