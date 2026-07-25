import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { rupees } from "@/modules/marketplace/format";

// Phase 22 public preview: NO requireUser — anyone with the link sees exactly
// the whitelisted fields public_listing_preview() exposes (migration 0021),
// plus a signup CTA. Full detail and all interactions stay behind auth.

type Preview = {
  id: string;
  title: string;
  price: number;
  category: string;
  image: string | null;
  status: string;
  college_name: string;
};

async function getPreview(id: string): Promise<Preview | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .rpc("public_listing_preview", { lid: id })
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
    description: `${rupees(Number(p.price))} · ${p.category} · ${p.college_name}`,
  };
}

export default async function PublicListingPreview({
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
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{p.category}</span>
            {p.status === "sold" && (
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium">Sold</span>
            )}
          </div>
          <h1 className="text-xl font-bold">{p.title}</h1>
          <p className="font-heading text-2xl font-bold text-primary">{rupees(Number(p.price))}</p>
          <p className="text-sm text-muted-foreground">On LockedIn at {p.college_name}</p>
        </div>
      </div>

      <Link
        href="/signup"
        className="press flex min-h-12 items-center justify-center rounded-full bg-primary px-6 font-semibold text-on-primary shadow-lg shadow-primary/25"
      >
        Join with your college email to contact
      </Link>
      <p className="text-center text-xs text-muted-foreground">
        Verified students only. No outsiders — that’s the point.
      </p>
    </main>
  );
}
