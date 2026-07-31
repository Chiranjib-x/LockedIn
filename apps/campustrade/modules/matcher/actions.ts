"use server";

import { createClient } from "@suite/auth/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { scoreMatch, type Prefs } from "./score";

export async function savePrefs(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("college_id").eq("id", user.id).single();

  const { error } = await supabase.from("match_prefs").upsert({
    user_id: user.id,
    college_id: profile?.college_id,
    sleep_schedule: String(formData.get("sleep_schedule") ?? "normal"),
    cleanliness: Number(formData.get("cleanliness") ?? 3),
    study_style: String(formData.get("study_style") ?? "quiet"),
    noise_tolerance: Number(formData.get("noise_tolerance") ?? 3),
    food_pref: String(formData.get("food_pref") ?? "any"),
    smoking: formData.get("smoking") === "on",
    looking_for: String(formData.get("looking_for") ?? "both"),
    bio: String(formData.get("bio") ?? "").trim() || null,
    is_opted_in: formData.get("is_opted_in") === "on",
    updated_at: new Date().toISOString(),
  });

  if (error) redirect("/matches/prefs?error=" + encodeURIComponent(error.message));
  revalidatePath("/matches");
  redirect("/matches");
}

export async function connect(targetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Mutual interest: if they already requested me, both rows become mutual.
  const { data: reverse } = await supabase
    .from("match_requests")
    .select("id")
    .eq("requester_id", targetId)
    .eq("target_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles").select("college_id").eq("id", user.id).single();

  if (reverse) {
    await supabase.from("match_requests").update({ status: "mutual" }).eq("id", reverse.id);
    await supabase.from("match_requests").insert({
      requester_id: user.id,
      target_id: targetId,
      college_id: profile?.college_id,
      status: "mutual",
    });
    // Mutual → open a chat with a preference-based icebreaker and route in.
    const [{ data: mine }, { data: theirs }] = await Promise.all([
      supabase.from("match_prefs").select("*").eq("user_id", user.id).single(),
      supabase.from("match_prefs").select("*").eq("user_id", targetId).single(),
    ]);
    let icebreaker = "You matched — say hi! 👋";
    if (mine && theirs) {
      const { why } = scoreMatch(mine as Prefs, theirs as Prefs);
      if (why.length) icebreaker = `You ${why.join(" and ")} — say hi! 👋`;
    }
    const { data: conv } = await supabase.rpc("start_match_chat", { other: targetId, icebreaker });
    revalidatePath("/matches");
    if (conv) redirect(`/chats/${conv}`);
  } else {
    await supabase.from("match_requests").insert({
      requester_id: user.id,
      target_id: targetId,
      college_id: profile?.college_id,
    });
  }
  revalidatePath("/matches");
}

// Open (or find) the match chat — used by the "Message" action once mutual.
export async function messageMatch(targetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: conv } = await supabase.rpc("start_match_chat", { other: targetId, icebreaker: null });
  if (conv) redirect(`/chats/${conv}`);
  redirect("/matches");
}
