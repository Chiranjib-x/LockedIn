"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function proposeCommunity(formData: FormData) {
  const { supabase, user } = await ctx();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/communities/new?error=" + encodeURIComponent("Give it a name."));

  const { data: profile } = await supabase
    .from("profiles").select("college_id").eq("id", user.id).single();

  const { error } = await supabase.from("communities").insert({
    created_by: user.id,
    college_id: profile?.college_id,
    name,
    emoji: String(formData.get("emoji") ?? "").trim() || "🎯",
    category: String(formData.get("category") ?? "other"),
    description: String(formData.get("description") ?? "").trim() || null,
    // A claim only — the founder confirms or strips it at approval (0053).
    is_official: formData.get("is_official") === "on",
  });
  if (error) redirect("/communities/new?error=" + encodeURIComponent(error.message));
  revalidatePath("/communities");
  redirect("/communities?proposed=1");
}

export async function joinCommunity(id: string) {
  const { supabase, user } = await ctx();
  await supabase.from("community_members").insert({ community_id: id, user_id: user.id });
  revalidatePath(`/communities/${id}`);
  revalidatePath("/communities");
}

export async function leaveCommunity(id: string) {
  const { supabase, user } = await ctx();
  await supabase.from("community_members").delete().eq("community_id", id).eq("user_id", user.id);
  revalidatePath(`/communities/${id}`);
  revalidatePath("/communities");
}

export async function approveCommunity(id: string, official: boolean) {
  const { supabase } = await ctx();
  // RLS: founder only. Approval is where the official claim gets verified.
  await supabase.from("communities").update({ is_approved: true, is_official: official }).eq("id", id);
  revalidatePath("/communities");
}

export async function rejectCommunity(id: string) {
  const { supabase } = await ctx();
  await supabase.from("communities").delete().eq("id", id); // RLS: founder or proposer-pending
  revalidatePath("/communities");
}

export async function expressInterest(id: string) {
  const { supabase, user } = await ctx();
  await supabase.from("community_interests").insert({ community_id: id, user_id: user.id });
  revalidatePath(`/communities/${id}`);
}

export async function withdrawInterest(id: string) {
  const { supabase, user } = await ctx();
  await supabase.from("community_interests").delete().eq("community_id", id).eq("user_id", user.id);
  revalidatePath(`/communities/${id}`);
}

export async function setRecruiting(id: string, on: boolean) {
  const { supabase } = await ctx();
  await supabase.rpc("set_recruiting", { cid: id, on_flag: on }); // gated: club/app moderator
  revalidatePath(`/communities/${id}`);
  revalidatePath("/communities");
}

export async function setMemberPosition(cid: string, uid: string, position: string) {
  const { supabase } = await ctx();
  await supabase.rpc("set_member_position", { cid, uid, pos: position }); // gated: club/app moderator
  revalidatePath(`/communities/${cid}`);
}

// ── Applications (0054) ──────────────────────────────────────────────────────

export async function addQuestion(cid: string, prompt: string) {
  const { supabase, user } = await ctx();
  const p = prompt.trim();
  if (!p) return "Write the question first.";
  const { data: profile } = await supabase.from("profiles").select("college_id").eq("id", user.id).single();
  const { error } = await supabase.from("community_questions").insert({ community_id: cid, college_id: profile?.college_id, prompt: p });
  revalidatePath(`/communities/${cid}`);
  return error ? "Couldn't add the question." : null;
}

export async function removeQuestion(qid: string, cid: string) {
  const { supabase } = await ctx();
  await supabase.from("community_questions").delete().eq("id", qid); // RLS: lead only
  revalidatePath(`/communities/${cid}`);
}

// Form action from /communities/[id]/apply — answers snapshot the prompts.
export async function applyToJoin(cid: string, formData: FormData) {
  const { supabase, user } = await ctx();
  const { data: questions } = await supabase
    .from("community_questions").select("id, prompt").eq("community_id", cid).order("ord").order("created_at");
  const answers = (questions ?? []).map((q) => ({
    q: q.prompt,
    a: String(formData.get(`q_${q.id}`) ?? "").trim(),
  }));
  if (answers.some((x) => !x.a)) {
    redirect(`/communities/${cid}/apply?error=` + encodeURIComponent("Answer every question."));
  }
  const { data: profile } = await supabase.from("profiles").select("college_id").eq("id", user.id).single();
  const { error } = await supabase.from("community_applications").insert({
    community_id: cid, user_id: user.id, college_id: profile?.college_id, answers,
  });
  if (error) {
    redirect(`/communities/${cid}/apply?error=` + encodeURIComponent("You already have a pending application."));
  }
  revalidatePath(`/communities/${cid}`);
  redirect(`/communities/${cid}?applied=1`);
}

export async function withdrawApplication(cid: string) {
  const { supabase, user } = await ctx();
  await supabase.from("community_applications").delete()
    .eq("community_id", cid).eq("user_id", user.id).eq("status", "pending");
  revalidatePath(`/communities/${cid}`);
}

export async function decideApplication(appId: string, cid: string, accept: boolean) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("decide_application", { app_id: appId, accept });
  revalidatePath(`/communities/${cid}`);
  return error?.message ?? null;
}

// ── Polls + scheduled announcements (0058) ───────────────────────────────────

export async function createPoll(cid: string, question: string, options: string[], closesLocal: string) {
  const { supabase, user } = await ctx();
  const q = question.trim();
  const opts = options.map((o) => o.trim()).filter(Boolean);
  if (!q || opts.length < 2) return "A question and at least two options are required.";
  const { istParse } = await import("@/modules/timetable/helpers");
  const { data: profile } = await supabase.from("profiles").select("college_id").eq("id", user.id).single();
  const { error } = await supabase.from("community_polls").insert({
    community_id: cid, college_id: profile?.college_id, question: q, options: opts,
    closes_at: closesLocal ? istParse(closesLocal).toISOString() : null, created_by: user.id,
  });
  revalidatePath(`/communities/${cid}`);
  return error ? "Couldn't create the poll (leads only)." : null;
}

export async function votePoll(pollId: string, cid: string, choice: number) {
  const { supabase, user } = await ctx();
  const { data: profile } = await supabase.from("profiles").select("college_id").eq("id", user.id).single();
  // Upsert: one vote per member, changing it re-writes the row.
  await supabase.from("poll_votes").upsert(
    { poll_id: pollId, user_id: user.id, college_id: profile?.college_id, choice },
    { onConflict: "poll_id,user_id" }
  );
  revalidatePath(`/communities/${cid}`);
}

export async function deletePoll(pollId: string, cid: string) {
  const { supabase } = await ctx();
  await supabase.from("community_polls").delete().eq("id", pollId);
  revalidatePath(`/communities/${cid}`);
}

export async function schedulePost(cid: string, title: string, body: string, whenLocal: string) {
  const { supabase, user } = await ctx();
  const t = title.trim();
  if (!t || !whenLocal) return "Title and a publish time are required.";
  const { istParse } = await import("@/modules/timetable/helpers");
  const when = istParse(whenLocal);
  if (when.getTime() <= Date.now()) return "Pick a time in the future.";
  const { data: profile } = await supabase.from("profiles").select("college_id").eq("id", user.id).single();
  const { error } = await supabase.from("scheduled_posts").insert({
    community_id: cid, college_id: profile?.college_id, author_id: user.id,
    title: t, body: body.trim() || null, publish_at: when.toISOString(),
  });
  revalidatePath(`/communities/${cid}`);
  return error ? "Couldn't schedule it (leads only)." : null;
}

export async function cancelScheduled(schedId: string, cid: string) {
  const { supabase } = await ctx();
  await supabase.from("scheduled_posts").delete().eq("id", schedId);
  revalidatePath(`/communities/${cid}`);
}

// ── Money: dues + fund split (0057) ──────────────────────────────────────────

export async function createCollection(cid: string, title: string, kind: "dues" | "fund", amount: number, upi: string) {
  const { supabase } = await ctx();
  const t = title.trim();
  if (!t || !(amount > 0)) return "Title and a positive amount are required.";
  const { error } = await supabase.rpc("create_collection", {
    cid, p_title: t, p_kind: kind, p_amount: amount, p_upi: upi.trim(),
  });
  revalidatePath(`/communities/${cid}`);
  return error ? "Couldn't create it (leads only)." : null;
}

export async function setDuePaid(dueId: string, cid: string, paid: boolean) {
  const { supabase } = await ctx();
  await supabase.from("collection_dues") // RLS: lead only
    .update({ paid, paid_at: paid ? new Date().toISOString() : null })
    .eq("id", dueId);
  revalidatePath(`/communities/${cid}`);
}

export async function deleteCollection(collId: string, cid: string) {
  const { supabase } = await ctx();
  await supabase.from("community_collections").delete().eq("id", collId);
  revalidatePath(`/communities/${cid}`);
}

// ── Team ops: tasks / resources / inventory (0056) ───────────────────────────

export async function addTask(cid: string, title: string, assigneeId: string, due: string) {
  const { supabase, user } = await ctx();
  const t = title.trim();
  if (!t) return "Task needs a title.";
  const { data: profile } = await supabase.from("profiles").select("college_id").eq("id", user.id).single();
  const { error } = await supabase.from("community_tasks").insert({
    community_id: cid, college_id: profile?.college_id, title: t,
    assignee_id: assigneeId || null, due_date: due || null, created_by: user.id,
  });
  revalidatePath(`/communities/${cid}`);
  return error ? "Couldn't add the task (leads only)." : null;
}

export async function setTaskStatus(taskId: string, cid: string, done: boolean) {
  const { supabase } = await ctx();
  // RLS: assignee or lead.
  await supabase.from("community_tasks").update({ status: done ? "done" : "open" }).eq("id", taskId);
  revalidatePath(`/communities/${cid}`);
}

export async function deleteTask(taskId: string, cid: string) {
  const { supabase } = await ctx();
  await supabase.from("community_tasks").delete().eq("id", taskId); // RLS: lead
  revalidatePath(`/communities/${cid}`);
}

export async function addResource(cid: string, label: string, url: string) {
  const { supabase, user } = await ctx();
  const l = label.trim();
  let u = url.trim();
  if (!l || !u) return "Label and link are required.";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try { new URL(u); } catch { return "That doesn't look like a valid link."; }
  const { data: profile } = await supabase.from("profiles").select("college_id").eq("id", user.id).single();
  const { error } = await supabase.from("community_resources").insert({
    community_id: cid, college_id: profile?.college_id, label: l, url: u, added_by: user.id,
  });
  revalidatePath(`/communities/${cid}`);
  return error ? "Couldn't add it (leads only)." : null;
}

export async function deleteResource(rid: string, cid: string) {
  const { supabase } = await ctx();
  await supabase.from("community_resources").delete().eq("id", rid);
  revalidatePath(`/communities/${cid}`);
}

export async function addInventory(cid: string, item: string, note: string) {
  const { supabase, user } = await ctx();
  const it = item.trim();
  if (!it) return "Name the item.";
  const { data: profile } = await supabase.from("profiles").select("college_id").eq("id", user.id).single();
  const { error } = await supabase.from("community_inventory").insert({
    community_id: cid, college_id: profile?.college_id, item: it, note: note.trim() || null,
  });
  revalidatePath(`/communities/${cid}`);
  return error ? "Couldn't add it (leads only)." : null;
}

export async function setInventoryHolder(invId: string, cid: string, holderId: string) {
  const { supabase } = await ctx();
  await supabase.from("community_inventory").update({ holder_id: holderId || null }).eq("id", invId);
  revalidatePath(`/communities/${cid}`);
}

export async function deleteInventory(invId: string, cid: string) {
  const { supabase } = await ctx();
  await supabase.from("community_inventory").delete().eq("id", invId);
  revalidatePath(`/communities/${cid}`);
}

// ── Meetings + roll-call + free windows (0055) ───────────────────────────────

export async function createMeeting(cid: string, title: string, whenLocal: string) {
  const { supabase, user } = await ctx();
  const t = title.trim();
  if (!t || !whenLocal) return "Title and time are required.";
  const { istParse } = await import("@/modules/timetable/helpers");
  const { data: profile } = await supabase.from("profiles").select("college_id").eq("id", user.id).single();
  const { error } = await supabase.from("team_meetings").insert({
    community_id: cid, college_id: profile?.college_id,
    title: t, meet_at: istParse(whenLocal).toISOString(), created_by: user.id,
  });
  revalidatePath(`/communities/${cid}`);
  return error ? "Couldn't schedule it (leads only)." : null;
}

export async function deleteMeeting(meetingId: string, cid: string) {
  const { supabase } = await ctx();
  await supabase.from("team_meetings").delete().eq("id", meetingId); // RLS: lead only
  revalidatePath(`/communities/${cid}`);
}

export async function markMeetingAttendance(meetingId: string, cid: string, uid: string, present: boolean) {
  const { supabase, user } = await ctx();
  if (present) {
    const { data: profile } = await supabase.from("profiles").select("college_id").eq("id", user.id).single();
    const { error } = await supabase.from("meeting_attendance").insert({
      meeting_id: meetingId, user_id: uid, college_id: profile?.college_id, marked_by: user.id,
    });
    if (error && error.code !== "23505") return "Couldn't mark (leads only).";
  } else {
    await supabase.from("meeting_attendance").delete().eq("meeting_id", meetingId).eq("user_id", uid);
  }
  revalidatePath(`/communities/${cid}`);
  return null;
}

// Privacy-preserving: the RPC only ever returns merged gaps, never anyone's
// individual timetable.
export async function getFreeWindows(cid: string, dow: number) {
  const { supabase } = await ctx();
  const { data, error } = await supabase.rpc("team_free_windows", { cid, dow });
  if (error) return { error: "Couldn't compute free windows.", windows: [] as { start_min: number; end_min: number }[] };
  return { error: null, windows: (data ?? []) as { start_min: number; end_min: number }[] };
}

// Lead management (0052). Both RPCs enforce: caller is a lead/founder, and a
// team always keeps at least one lead.
export async function setMemberRole(cid: string, uid: string, role: "member" | "moderator") {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("set_community_role", { cid, uid, newrole: role });
  revalidatePath(`/communities/${cid}`);
  return error?.message ?? null;
}

export async function removeMember(cid: string, uid: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("remove_community_member", { cid, uid });
  revalidatePath(`/communities/${cid}`);
  return error?.message ?? null;
}
