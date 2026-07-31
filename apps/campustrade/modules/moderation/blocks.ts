import type { createClient } from "@suite/auth/server";

// Reusable block filter. Per-user blocking isn't practical in RLS alone, so this
// is query-level filtering layered on top: fetch the ids the current user has
// blocked, exclude those authors from list queries.
export async function blockedIds(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", userId);
  return (data ?? []).map((b) => b.blocked_id as string);
}

// PostgREST `not.in` needs a (a,b,c) list; empty must be a non-matching sentinel.
export function notInList(ids: string[]) {
  return ids.length ? `(${ids.join(",")})` : "(00000000-0000-0000-0000-000000000000)";
}
