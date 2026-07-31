import { createClient } from "@suite/auth/server";

// Average stars + count for a user, via the security-definer summary so it works
// even though a ratee can't read their own rating rows (blind ratings).
export async function getRating(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("rating_summary", { uid: userId }).single<{
    avg: number;
    cnt: number;
  }>();
  if (!data || data.cnt === 0) return { avg: null as number | null, count: 0 };
  return { avg: data.avg, count: data.cnt };
}
