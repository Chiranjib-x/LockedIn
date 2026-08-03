-- Set or change your in-game name after you have already joined.
--
-- 0090 stores `ign` on tournament_members and join_tournament_team() takes it as
-- an optional argument, so it could only ever be set in the one second you
-- joined. Anyone who entered without it — or typed it wrong, or changed their
-- Riot tag — had no way to fix it, and the organiser cannot run a bracket
-- without it. There is no UPDATE policy on tournament_members either, so this
-- has to be a definer RPC.
--
-- Deliberately still editable AFTER registration closes: the organiser needs
-- correct IGNs right up to the first match, and someone realising at 8pm that
-- they typed their tag wrong should be able to fix it. It stops only once the
-- tournament itself is over.

create or replace function set_my_tournament_ign(p_tournament uuid, p_ign text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  t record;
  cleaned text;
  team uuid;
begin
  select college_id into cid from profiles where id = auth.uid();
  select * into t from tournaments where id = p_tournament;
  if t is null or t.college_id <> cid then
    raise exception 'That tournament is not at your college.';
  end if;
  if t.status = 'done' then
    raise exception 'That tournament is over.';
  end if;

  -- Which of this tournament's teams am I in? A player is in at most one.
  select m.team_id into team
  from tournament_members m
  join tournament_teams x on x.id = m.team_id
  where x.tournament_id = p_tournament and m.user_id = auth.uid();

  if team is null then
    raise exception 'You have not entered this tournament.';
  end if;

  cleaned := nullif(btrim(coalesce(p_ign, '')), '');
  if cleaned is not null and char_length(cleaned) > 40 then
    raise exception 'That in-game name is too long.';
  end if;

  update tournament_members set ign = cleaned
  where team_id = team and user_id = auth.uid();

  return coalesce(cleaned, '');
end $$;

grant execute on function set_my_tournament_ign(uuid, text) to authenticated;
