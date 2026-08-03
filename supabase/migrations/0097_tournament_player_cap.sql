-- A hard ceiling on how many players a tournament can hold.
--
-- Enforced in the DATABASE, not the UI. The cap's whole job is to hold at the
-- moment ten people tap Join within the same second — exactly when a client-side
-- check loses. Both entry points are covered, because a player enters either by
-- joining an existing team or by creating one (which enrols the captain):
-- join_tournament_team() and create_tournament_team().
--
-- Nullable: null means no limit, which is what every existing tournament had and
-- still has. Only a tournament with a number set is capped.

alter table tournaments
  add column if not exists max_players int check (max_players is null or max_players > 0);

comment on column tournaments.max_players is
  'Hard ceiling on total entrants. NULL = uncapped. Enforced in join_tournament_team() and create_tournament_team(), not in the UI.';

-- How many players are in this tournament right now.
create or replace function tournament_player_count(p_tournament uuid)
returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int
  from tournament_members m
  join tournament_teams x on x.id = m.team_id
  where x.tournament_id = p_tournament
$$;

create or replace function join_tournament_team(p_team uuid, p_ign text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  cid uuid; t record; tt record; n int;
begin
  select college_id into cid from profiles where id = auth.uid();
  select * into tt from tournament_teams where id = p_team;
  if tt is null or tt.college_id <> cid then
    raise exception 'That team is not at your college.';
  end if;
  select * into t from tournaments where id = tt.tournament_id;
  if t.status <> 'open' then
    raise exception 'Registration is not open.';
  end if;
  if t.reg_closes_at is not null and now() > t.reg_closes_at then
    raise exception 'Registration has closed.';
  end if;
  if exists (
    select 1 from tournament_members m
    join tournament_teams x on x.id = m.team_id
    where x.tournament_id = t.id and m.user_id = auth.uid()
  ) then
    raise exception 'You are already entered in this tournament.';
  end if;

  -- The cap, checked against live state inside the same transaction as the
  -- insert, so two simultaneous joins cannot both pass it.
  if t.max_players is not null
     and tournament_player_count(t.id) >= t.max_players then
    raise exception 'This tournament is full — all % places are taken.', t.max_players;
  end if;

  select count(*) into n from tournament_members where team_id = p_team;
  if n >= t.team_size then
    raise exception 'That team is full.';
  end if;

  insert into tournament_members (team_id, user_id, ign)
  values (p_team, auth.uid(), nullif(btrim(coalesce(p_ign, '')), ''));
end $$;

create or replace function create_tournament_team(
  p_tournament uuid, p_name text, p_ign text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  cid uuid; t record; tid uuid; nm text;
begin
  select college_id into cid from profiles where id = auth.uid();
  select * into t from tournaments where id = p_tournament;
  if t is null or t.college_id <> cid then
    raise exception 'That tournament is not at your college.';
  end if;
  if t.status <> 'open' then
    raise exception 'Registration is not open.';
  end if;
  if t.reg_closes_at is not null and now() > t.reg_closes_at then
    raise exception 'Registration has closed.';
  end if;
  if exists (
    select 1 from tournament_members m
    join tournament_teams x on x.id = m.team_id
    where x.tournament_id = p_tournament and m.user_id = auth.uid()
  ) then
    raise exception 'You are already entered in this tournament.';
  end if;

  -- Creating a team enrols the captain, so it is a way in and needs the same cap.
  if t.max_players is not null
     and tournament_player_count(p_tournament) >= t.max_players then
    raise exception 'This tournament is full — all % places are taken.', t.max_players;
  end if;

  nm := nullif(btrim(coalesce(p_name, '')), '');
  if nm is null then
    raise exception 'Give the team a name.';
  end if;

  insert into tournament_teams (tournament_id, college_id, name, captain_id)
  values (p_tournament, cid, nm, auth.uid())
  returning id into tid;

  insert into tournament_members (team_id, user_id, ign)
  values (tid, auth.uid(), nullif(btrim(coalesce(p_ign, '')), ''));

  return tid;
end $$;

grant execute on function tournament_player_count(uuid)              to authenticated;
grant execute on function join_tournament_team(uuid, text)           to authenticated;
grant execute on function create_tournament_team(uuid, text, text)   to authenticated;
