import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { rupees } from "@/modules/marketplace/format";
import TypeBadge from "@/modules/board/badge";
import { KarmaBadge } from "@/modules/karma/badge";
import { openChat } from "@/modules/chat/actions";
import SearchInput from "@/modules/search/search-input";
import VerifiedName from "@/components/verified-name";
import { catLabel } from "@/modules/communities/categories";

// Phase 27: one search bar across everything. Full-text via the 0028
// tsvector indexes. College scoping is RLS's job — these queries never
// mention college_id. Results are grouped per type (recency-ordered within
// groups; ts_rank mixing deferred until groups prove insufficient).
// People are EXACT-username-only (0037): you can't browse or name-search
// students to cold-DM them — you must already know their @username.

const TABS = [
  { key: "all", label: "All" },
  { key: "market", label: "Marketplace" },
  { key: "board", label: "Board" },
  { key: "clubs", label: "Clubs & Teams" },
  { key: "groupbuy", label: "Group-buys" },
  { key: "people", label: "People" },
] as const;

type Listing = { id: string; title: string; price: number; category: string; status: string };
type Post = { id: string; title: string; type: string; status: string };
type Order = { id: string; title: string; category: string; status: string };
type Person = { id: string; name: string; verified_name: string | null; username: string; hostel_block: string | null; karma: number };
type Club = { id: string; name: string; emoji: string; logo_url: string | null; category: string; description: string | null; recruiting: boolean; is_official: boolean };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const { supabase } = await requireUser();
  const { q = "", tab = "all" } = await searchParams;
  const query = q.trim();
  const active = TABS.some((t) => t.key === tab) ? tab : "all";
  const want = (key: string) => active === "all" || active === key;

  let listings: Listing[] = [];
  let posts: Post[] = [];
  let orders: Order[] = [];
  let people: Person[] = [];
  let clubs: Club[] = [];

  if (query.length >= 2) {
    const [l, p, o, u, cl] = await Promise.all([
      want("market")
        ? supabase
            .from("listings")
            .select("id, title, price, category, status")
            .textSearch("fts", query, { type: "websearch", config: "english" })
            .order("created_at", { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [] }),
      want("board")
        ? supabase
            .from("posts")
            .select("id, title, type, status")
            .textSearch("fts", query, { type: "websearch", config: "english" })
            .order("created_at", { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [] }),
      want("groupbuy")
        ? supabase
            .from("group_orders")
            .select("id, title, category, status")
            .textSearch("fts", query, { type: "websearch", config: "english" })
            .order("created_at", { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [] }),
      want("people")
        ? supabase.rpc("find_by_username", { uname: query.replace(/^@/, "") })
        : Promise.resolve({ data: [] }),
      want("clubs")
        ? supabase
            .from("communities")
            .select("id, name, emoji, logo_url, category, description, recruiting, is_official")
            .eq("is_approved", true)
            .ilike("name", `%${query}%`)
            .limit(10)
        : Promise.resolve({ data: [] }),
    ]);
    listings = (l.data ?? []) as Listing[];
    posts = (p.data ?? []) as Post[];
    orders = (o.data ?? []) as Order[];
    people = (u.data ?? []) as Person[];
    clubs = (cl.data ?? []) as Club[];
  } else {
    // No query yet → browse recent items for the active tab, so the category
    // toggles actually filter (People stays username-only).
    const [l, p, o, cl] = await Promise.all([
      want("market")
        ? supabase
            .from("listings")
            .select("id, title, price, category, status")
            .eq("status", "available")
            .is("space_id", null)
            .order("created_at", { ascending: false })
            .limit(12)
        : Promise.resolve({ data: [] }),
      want("board")
        ? supabase
            .from("posts")
            .select("id, title, type, status")
            .in("type", ["lost", "found", "notice"])
            .order("created_at", { ascending: false })
            .limit(12)
        : Promise.resolve({ data: [] }),
      want("groupbuy")
        ? supabase
            .from("group_orders")
            .select("id, title, category, status")
            .order("created_at", { ascending: false })
            .limit(12)
        : Promise.resolve({ data: [] }),
      want("clubs")
        ? supabase
            .from("communities")
            .select("id, name, emoji, logo_url, category, description, recruiting, is_official")
            .eq("is_approved", true)
            .order("recruiting", { ascending: false })
            .order("is_official", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(12)
        : Promise.resolve({ data: [] }),
    ]);
    listings = (l.data ?? []) as Listing[];
    posts = (p.data ?? []) as Post[];
    orders = (o.data ?? []) as Order[];
    clubs = (cl.data ?? []) as Club[];
  }

  const total = listings.length + posts.length + orders.length + people.length + clubs.length;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-bold">Explore</h1>
      <SearchInput initialQ={query} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/search?q=${encodeURIComponent(query)}&tab=${t.key}`}
            className={`press shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
              active === t.key
                ? "bg-primary text-on-primary"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {active === "people" && (
        <p className="text-xs text-muted-foreground">
          People are found by their exact @username — ask them for it.
        </p>
      )}

      {total === 0 ? (
        // People tab with no query shows only the username hint above.
        active === "people" && query.length < 2 ? null : (
          <Card className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-3xl">{query.length < 2 ? "🧭" : "🤷"}</span>
            {query.length < 2 ? (
              <p className="text-sm text-muted-foreground">Nothing here yet — be the first to post.</p>
            ) : (
              <>
                <p className="font-medium">Nothing on campus for “{query}”</p>
                <p className="text-sm text-muted-foreground">Try a different word — or post it yourself.</p>
              </>
            )}
          </Card>
        )
      ) : (
        <div className="flex flex-col gap-5">
          {listings.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">Marketplace</h2>
              {listings.map((l) => (
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
            </section>
          )}

          {posts.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">Board</h2>
              {posts.map((p) => (
                <Link key={p.id} href={`/board/${p.id}`} className="press">
                  <Card className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-semibold">{p.title}</p>
                    <TypeBadge type={p.type} />
                  </Card>
                </Link>
              ))}
            </section>
          )}

          {clubs.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">Clubs, chapters & teams</h2>
              {clubs.map((cl) => (
                <Link key={cl.id} href={`/communities/${cl.id}`} className="press">
                  <Card className="flex items-center gap-3">
                    {cl.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cl.logo_url} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="text-2xl">{cl.emoji}</span>
                    )}
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-semibold">
                        {cl.name}
                        {cl.is_official && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">✔ Official</span>
                        )}
                        {cl.recruiting && (
                          <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">🟢 Recruiting</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        <span className="font-medium">{catLabel(cl.category)}</span>
                        {cl.description ? ` · ${cl.description}` : ""}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </section>
          )}

          {orders.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">Group-buys</h2>
              {orders.map((o) => (
                <Link key={o.id} href={`/group-buy/${o.id}`} className="press">
                  <Card className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-semibold">{o.title}</p>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">{o.status}</span>
                  </Card>
                </Link>
              ))}
            </section>
          )}

          {people.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">People</h2>
              {people.map((person) => {
                async function message() {
                  "use server";
                  await openChat(person.id, null, null);
                }
                return (
                  <Card key={person.id} className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading font-bold text-primary">
                      {person.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{person.name || "Student"}</p>
                        <KarmaBadge karma={person.karma ?? 0} />
                      </div>
                      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <VerifiedName name={person.verified_name} />
                        <span>@{person.username}</span>
                        {person.hostel_block && <span>{person.hostel_block}</span>}
                      </p>
                    </div>
                    <form action={message}>
                      <button
                        type="submit"
                        className="press min-h-11 shrink-0 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted"
                      >
                        Message
                      </button>
                    </form>
                  </Card>
                );
              })}
            </section>
          )}
        </div>
      )}
    </main>
  );
}
