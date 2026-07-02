"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

  if (!TYPES.includes(type) || !title) {
    redirect("/board/new?error=" + encodeURIComponent("Pick a type and add a title."));
  }
  if (type === "event" && !eventDateRaw) {
    redirect("/board/new?error=" + encodeURIComponent("Events need a date."));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("college_id")
    .eq("id", user.id)
    .single();

  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    college_id: profile?.college_id, // server-side stamp; RLS double-checks
    type,
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    event_date: type === "event" ? new Date(eventDateRaw).toISOString() : null,
    images: JSON.parse(String(formData.get("images") ?? "[]")),
  });

  if (error) redirect("/board/new?error=" + encodeURIComponent(error.message));

  revalidatePath("/board");
  redirect("/board");
}
