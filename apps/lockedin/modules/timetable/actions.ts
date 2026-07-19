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
  const { data: profile } = await supabase.from("profiles").select("college_id").eq("id", user.id).single();
  return { supabase, user, collegeId: profile?.college_id };
}

export async function addEntry(formData: FormData) {
  const { supabase, user, collegeId } = await ctx();

  const dayOfWeek = Number(formData.get("day_of_week"));
  const startsAt = String(formData.get("starts_at") ?? "").trim();
  const endsAt = String(formData.get("ends_at") ?? "").trim();
  const courseCode = String(formData.get("course_code") ?? "").trim().toUpperCase();
  const title = String(formData.get("title") ?? "").trim();
  if (!startsAt || !endsAt || !courseCode || !title) {
    redirect("/timetable?error=" + encodeURIComponent("Time, course code, and title are required."));
  }

  const minAttendanceRaw = String(formData.get("min_attendance") ?? "").trim();
  const { error } = await supabase.from("timetable_entries").insert({
    user_id: user.id,
    college_id: collegeId,
    day_of_week: dayOfWeek,
    starts_at: startsAt,
    ends_at: endsAt,
    course_code: courseCode,
    title,
    venue: String(formData.get("venue") ?? "").trim() || null,
    min_attendance: minAttendanceRaw ? Number(minAttendanceRaw) : null,
  });
  if (error) redirect("/timetable?error=" + encodeURIComponent(error.message));

  revalidatePath("/timetable");
  redirect("/timetable");
}

export async function deleteEntry(id: string) {
  const { supabase, user } = await ctx();
  await supabase.from("timetable_entries").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/timetable");
}

// Upserts one attendance record for (course_code, date) — re-tapping edits it.
export async function markAttendance(courseCode: string, date: string, status: "present" | "absent" | "cancelled") {
  const { supabase, user, collegeId } = await ctx();
  await supabase
    .from("attendance_records")
    .upsert(
      { user_id: user.id, college_id: collegeId, course_code: courseCode, date, status },
      { onConflict: "user_id,course_code,date" }
    );
  revalidatePath("/timetable");
  revalidatePath(`/timetable/${encodeURIComponent(courseCode)}`);
}
