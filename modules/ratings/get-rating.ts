import { createClient } from "@/lib/supabase/server";

// Average stars + count for a user. Cheap enough to call per-profile;
// if it ever shows on lists at scale, denormalize onto profiles.
export async function getRating(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("ratings").select("stars").eq("ratee_id", userId);
  if (!data?.length) return { avg: null as number | null, count: 0 };
  const avg = data.reduce((s, r) => s + r.stars, 0) / data.length;
  return { avg, count: data.length };
}
