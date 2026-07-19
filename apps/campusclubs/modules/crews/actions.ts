"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createCrew(formData: FormData) {
  const { supabase } = await me();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/crews/new?error=" + encodeURIComponent("Give your crew a name."));
  const { data, error } = await supabase.rpc("create_crew", { p_name: name });
  if (error) redirect("/crews/new?error=" + encodeURIComponent(error.message));
  redirect(`/crews/${data}`);
}

export async function addCrewMember(crewId: string, userId: string) {
  const { supabase, user } = await me();
  // RLS: adder must be a member, target must be same-college. Ignore duplicates.
  await supabase.from("crew_members").insert({ crew_id: crewId, user_id: userId, added_by: user.id });
  revalidatePath(`/crews/${crewId}`);
}

export async function leaveCrew(crewId: string) {
  const { supabase, user } = await me();
  await supabase.from("crew_members").delete().eq("crew_id", crewId).eq("user_id", user.id);
  redirect("/crews");
}

export async function addNote(crewId: string, body: string) {
  const { supabase, user } = await me();
  const text = body.trim();
  if (!text) return;
  const { data: profile } = await supabase.from("profiles").select("college_id").eq("id", user.id).single();
  await supabase.from("crew_notes").insert({
    crew_id: crewId,
    college_id: profile?.college_id,
    author_id: user.id,
    body: text,
  });
  revalidatePath(`/crews/${crewId}`);
}

export async function setNoteStatus(noteId: string, crewId: string, resolved: boolean) {
  const { supabase, user } = await me();
  // RLS: any crew member may flip status.
  await supabase
    .from("crew_notes")
    .update({
      status: resolved ? "resolved" : "pending",
      resolved_by: resolved ? user.id : null,
      resolved_at: resolved ? new Date().toISOString() : null,
    })
    .eq("id", noteId);
  revalidatePath(`/crews/${crewId}`);
}

export async function deleteNote(noteId: string, crewId: string) {
  const { supabase } = await me();
  await supabase.from("crew_notes").delete().eq("id", noteId); // RLS: author only
  revalidatePath(`/crews/${crewId}`);
}
