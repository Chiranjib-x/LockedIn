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

// Set or clear your own in-game name after joining. Guarded in the RPC (0095):
// you must already be entered, it caps length, and it stops once the tournament
// is over — probed: a non-entrant is refused.
export async function setMyIgn(tournamentId: string, ign: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("set_my_tournament_ign", {
    p_tournament: tournamentId,
    p_ign: ign,
  });
  revalidatePath(`/tournaments/${tournamentId}`);
  return error ? error.message : null;
}
