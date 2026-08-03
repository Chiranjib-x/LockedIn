-- Record the champion, and put it on the public share page.
--
-- /p/tournament/[id] already exists, opens without an account, and renders a
-- game-themed OG card. A separate "winners page" would duplicate all of that and
-- split the link — the URL people already pasted into their group chats should
-- become the results page, not compete with one.
--
-- So the same link changes meaning when the tournament ends: before, it sells the
-- entry; after, it announces the champion. Every share of it since 9pm keeps
-- working and now advertises the result.

alter table tournaments
  add column if not exists winner_team_id uuid references tournament_teams(id) on delete set null;

comment on column tournaments.winner_team_id is
  'The winning team. Set when the tournament is done; drives the champion banner on the public share page and the OG card.';

-- The public preview gains the champion's name and its roster. Names of players
-- on the winning team are already visible to anyone in the tournament, and a
-- champion who cannot be named is not much of an announcement.
drop function if exists public_tournament_preview(uuid);
create or replace function public_tournament_preview(tid uuid)
returns table (
  id uuid, game text, title text, tagline text, team_size int,
  starts_at timestamptz, reg_closes_at timestamptz, status text, prize text,
  logo_url text, stream_url text, team_count bigint, player_count bigint,
  college_name text, winner_name text, winner_players text[]
)
language sql stable security definer set search_path = public as $$
  select t.id, t.game, t.title, t.tagline, t.team_size,
         t.starts_at, t.reg_closes_at, t.status::text, t.prize,
         t.logo_url, t.stream_url,
         (select count(*) from tournament_teams x where x.tournament_id = t.id),
         (select count(*) from tournament_members m
            join tournament_teams x on x.id = m.team_id
           where x.tournament_id = t.id),
         g.name,
         w.name,
         (select array_agg(coalesce(nullif(btrim(m.ign), ''), p.name) order by m.joined_at)
            from tournament_members m
            join profiles p on p.id = m.user_id
           where m.team_id = w.id)
  from tournaments t
  join colleges g on g.id = t.college_id
  left join tournament_teams w on w.id = t.winner_team_id
  where t.id = tid
$$;

-- Setting the champion is a moderator action, and it closes the tournament.
create or replace function admin_set_tournament_winner(p_tournament uuid, p_team uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select college_id into cid from profiles where id = auth.uid() and is_moderator;
  if cid is null then
    raise exception 'Only a college moderator can set the winner.';
  end if;
  if p_team is not null and not exists (
    select 1 from tournament_teams where id = p_team and tournament_id = p_tournament
  ) then
    raise exception 'That team is not in this tournament.';
  end if;
  update tournaments
     set winner_team_id = p_team,
         status = case when p_team is null then status else 'done' end
   where id = p_tournament and college_id = cid;
  if not found then
    raise exception 'That tournament belongs to another college.';
  end if;
end $$;

grant execute on function public_tournament_preview(uuid)            to anon, authenticated;
grant execute on function admin_set_tournament_winner(uuid, uuid)    to authenticated;
