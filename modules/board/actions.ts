"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { openChat } from "@/modules/chat/actions";

const TYPES = ["lost", "found", "notice", "event"] as const;
export type PostType = (typeof TYPES)[number];

export async function createPost(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const type = String(formData.get("type") ?? "") as PostType;
  const title = String(formData.get("title") ?? "").trim();
  const eventDateRaw = String(formData.get("event_date") ?? "").trim();

  // Events are created from /events/new; everything else from /board/new.
  const backTo = type === "event" ? "/events/new" : "/board/new";
  if (!TYPES.includes(type) || !title) {
    redirect(backTo + "?error=" + encodeURIComponent("Pick a type and add a title."));
  }
  if (type === "event" && !eventDateRaw) {
    redirect(backTo + "?error=" + encodeURIComponent("Events need a date."));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("college_id")
    .eq("id", user.id)
    .single();

  const communityId = String(formData.get("community_id") ?? "").trim() || null;

  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    college_id: profile?.college_id, // server-side stamp; RLS double-checks
    type,
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    event_date: type === "event" ? new Date(eventDateRaw).toISOString() : null,
    images: JSON.parse(String(formData.get("images") ?? "[]")),
    community_id: communityId, // RLS: moderators only when set
    claim_question:
      type === "found" ? String(formData.get("claim_question") ?? "").trim() || null : null,
  });

  if (error) redirect(backTo + "?error=" + encodeURIComponent(error.message));

  if (communityId) {
    revalidatePath(`/communities/${communityId}`);
    redirect(`/communities/${communityId}`);
  }
  if (type === "event") {
    revalidatePath("/events");
    redirect("/events");
  }
  revalidatePath("/board");
  redirect("/board");
}

export async function submitClaim(postId: string, answer: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles").select("college_id").eq("id", user.id).single();
  // RLS enforces: found+open post, same college, not the author, one per user.
  const { error } = await supabase.from("post_claims").insert({
    post_id: postId,
    claimant_id: user.id,
    college_id: profile?.college_id,
    answer: answer.trim(),
  });
  revalidatePath(`/board/${postId}`);
  return error ? "Couldn't send the claim — maybe you already claimed this." : null;
}

export async function decideClaim(claimId: string, postId: string, accept: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS: only the post author can update claims on their post.
  const { data: claim } = await supabase
    .from("post_claims")
    .update({ status: accept ? "accepted" : "rejected" })
    .eq("id", claimId)
    .select("claimant_id, college_id")
    .single();
  if (!claim) return "Couldn't update the claim.";

  if (accept) {
    await supabase.from("posts").update({ status: "claim_pending" }).eq("id", postId);
    await supabase.rpc("notify", {
      uid: claim.claimant_id,
      cid: claim.college_id,
      ntype: "board",
      msg: "Your claim was accepted — coordinate the handover in chat 🎉",
      nlink: `/board/${postId}`,
    });
    // open the finder<->claimant chat and land the author in it
    await openChat(claim.claimant_id, "post", postId);
  }
  revalidatePath(`/board/${postId}`);
  return null;
}

export async function resolvePost(id: string, resolved: boolean) {
  const supabase = await createClient();
  // RLS restricts updates to the author.
  await supabase.from("posts").update({ status: resolved ? "resolved" : "open" }).eq("id", id);
  revalidatePath("/board");
  revalidatePath(`/board/${id}`);
}

export async function deletePost(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: p } = await supabase.from("posts").select("type").eq("id", id).single();
  // RLS "posts: author delete" restricts this to the author.
  await supabase.from("posts").delete().eq("id", id);
  revalidatePath("/board");
  revalidatePath("/events");
  redirect(p?.type === "event" ? "/events" : "/board");
}
