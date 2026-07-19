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

export async function createGroup(formData: FormData) {
  const { supabase } = await ctx();
  const course = String(formData.get("course_code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!course || !title) {
    redirect("/study-groups?error=" + encodeURIComponent("Course code and a title are required."));
  }
  const { data: gid, error } = await supabase.rpc("create_study_group", {
    p_course: course,
    p_title: title,
    p_desc: String(formData.get("description") ?? "").trim(),
    p_capacity: Number(formData.get("capacity") ?? 6) || 6,
    p_meet: String(formData.get("meet_info") ?? "").trim(),
  });
  if (error) redirect("/study-groups?error=" + encodeURIComponent(error.message));
  revalidatePath("/study-groups");
  redirect(`/study-groups?created=${gid}`);
}

export async function joinGroup(gid: string) {
  const { supabase } = await ctx();
  const { data, error } = await supabase.rpc("join_study_group", { gid });
  revalidatePath("/study-groups");
  if (error) return error.message;
  return (data as string | null) ?? null;
}

export async function leaveGroup(gid: string) {
  const { supabase } = await ctx();
  await supabase.rpc("leave_study_group", { gid });
  revalidatePath("/study-groups");
}
