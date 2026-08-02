"use server";

import { createClient } from "@suite/auth/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Every guard lives in the RPCs (0090) and was probed: a second entry, an
// over-full team, a duplicate team name, entering a closed tournament, and a
// non-moderator featuring one are all refused at the database.

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase };
}

export async function createTeam(tournamentId: string, name: string, ign: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("create_tournament_team", {
    p_tournament: tournamentId,
    p_name: name,
    p_ign: ign?.trim() || null,
  });
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/home");
  return error ? error.message : null;
}

export async function joinTeam(tournamentId: string, teamId: string, ign: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("join_tournament_team", {
    p_team: teamId,
    p_ign: ign?.trim() || null,
  });
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/home");
  return error ? error.message : null;
}

export async function leaveTeam(tournamentId: string, teamId: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("leave_tournament_team", { p_team: teamId });
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/home");
  return error ? error.message : null;
}
