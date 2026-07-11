import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Card, Section } from "@/components/ui";
import { rupees } from "@/modules/marketplace/format";
import TypeBadge from "@/modules/board/badge";
import { deleteSavedSearch } from "@/modules/saves/actions";

// Phase 28: everything bookmarked, grouped by type, plus active alerts.

export default async function SavedPage() {
  const { supabase, user } = await requireUser();

  const [{ data: saves }, { data: searches }] = await Promise.all([
    supabase.from("saves").select("target_type, target_id").order("created_at", { ascending: false }),
    supabase.from("saved_searches").select("id, module, query, filters").order("created_at", { ascending: false }),
  ]);

  const ids = (t: string) => (saves ?? []).filter((s) => s.target_type === t).map((s) => s.target_id);
  const [listingIds, postIds, orderIds] = [ids("listing"), ids("post"), ids("group_order")];

  const [{ data: listings }, { data: posts }, { data: orders }] = await Promise.all([
    listingIds.length
      ? supabase.from("listings").select("id, title, price, category, status").in("id", listingIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? supabase.from("posts").select("id, title, type, status").in("id", postIds)
      : Promise.resolve({ data: [] }),
    orderIds.length
      ? supabase.from("group_orders").select("id, title, status").in("id", orderIds)
      : Promise.resolve({ data: [] }),
  ]);

  const total = (saves?.length ?? 0) + (searches?.length ?? 0);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
      <h1 className="text-2xl font-bold">Saved</h1>

      {total === 0 && (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="text-3xl">🔖</span>
          <p className="font-medium">Nothing saved yet</p>
          <p className="text-sm text-muted-foreground">
            Bookmark listings and posts, or save a search to get alerted when it appears.
          </p>
        </Card>
      )}

      {(searches?.length ?? 0) > 0 && (
        <Section title="Your alerts">
          <div className="flex flex-col gap-2">
            {searches!.map((s) => {
              const remove = deleteSavedSearch.bind(null, s.id);
              const filterText = Object.values((s.filters ?? {}) as Record<string, string>).join(", ");
              return (
                <Card key={s.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      🔔 {s.query || "Anything new"}
                      {filterText && <span className="text-muted-foreground"> · {filterText}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.module === "marketplace" ? "Marketplace" : "Board"} · pings you on new matches
                    </p>
                  </div>
                  <form action={remove}>
                    <button
                      type="submit"
                      aria-label="Delete alert"
                      className="press flex min-h-11 min-w-11 items-center justify-center text-muted-foreground"
                    >
                      ✕
                    </button>
                  </form>
                </Card>
              );
            })}
          </div>
        </Section>
      )}

      {(listings?.length ?? 0) > 0 && (
        <Section title="Marketplace">
          <div className="flex flex-col gap-2">
            {listings!.map((l) => (
              <Link key={l.id} href={`/marketplace/${l.id}`} className="press">
                <Card className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{l.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.category}
                      {l.status === "sold" && " · sold"}
                    </p>
                  </div>
                  <span className="shrink-0 font-heading font-bold text-primary">{rupees(Number(l.price))}</span>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {(posts?.length ?? 0) > 0 && (
        <Section title="Board">
          <div className="flex flex-col gap-2">
            {posts!.map((p) => (
              <Link key={p.id} href={`/board/${p.id}`} className="press">
                <Card className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate font-semibold">{p.title}</p>
                  <TypeBadge type={p.type} />
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {(orders?.length ?? 0) > 0 && (
        <Section title="Group-buys">
          <div className="flex flex-col gap-2">
            {orders!.map((o) => (
              <Link key={o.id} href={`/group-buy/${o.id}`} className="press">
                <Card className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate font-semibold">{o.title}</p>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">{o.status}</span>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </main>
  );
}
