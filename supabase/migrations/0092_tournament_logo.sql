-- Optional artwork for a tournament.
--
-- A game's logo is its publisher's trademark, so it is not shipped in this repo:
-- the organiser supplies a URL if they want the official mark, and that is their
-- call to make rather than one baked into the code. When it is empty the app
-- falls back to a built-in geometric mark per game, so the page is never bare.
alter table tournaments add column if not exists logo_url text;

comment on column tournaments.logo_url is
  'Optional game artwork supplied by the organiser. Falls back to a built-in geometric mark.';

-- Both readers gain the column.
drop function if exists featured_tournament();
create or replace function featured_tournament()
returns table (
  id uuid, game text, title text, tagline text, team_size int,
  starts_at timestamptz, reg_closes_at timestamptz, status text,
  logo_url text, team_count bigint, player_count bigint, i_am_in boolean
)
language sql stable security definer set search_path = public as $$
  select t.id, t.game, t.title, t.tagline, t.team_size,
         t.starts_at, t.reg_closes_at, t.status, t.logo_url,
         (select count(*) from tournament_teams x where x.tournament_id = t.id),
         (select count(*) from tournament_members m
           join tournament_teams x on x.id = m.team_id where x.tournament_id = t.id),
         exists (select 1 from tournament_members m
                  join tournament_teams x on x.id = m.team_id
                  where x.tournament_id = t.id and m.user_id = auth.uid())
  from tournaments t
  where t.is_featured and t.status in ('open','closed')
    and t.college_id = (select college_id from profiles where id = auth.uid())
  limit 1
$$;

drop function if exists public_tournament_preview(uuid);
create or replace function public_tournament_preview(tid uuid)
returns table (
  id uuid, game text, title text, tagline text, details text,
  team_size int, starts_at timestamptz, reg_closes_at timestamptz,
  status text, prize text, logo_url text,
  team_count bigint, player_count bigint, college_name text
)
language sql stable security definer set search_path = public as $$
  select t.id, t.game, t.title, t.tagline, t.details, t.team_size,
         t.starts_at, t.reg_closes_at, t.status, t.prize, t.logo_url,
         (select count(*) from tournament_teams x where x.tournament_id = t.id),
         (select count(*) from tournament_members m
           join tournament_teams x on x.id = m.team_id where x.tournament_id = t.id),
         g.name
  from tournaments t join colleges g on g.id = t.college_id
  where t.id = tid and t.status <> 'draft'
$$;

drop function if exists admin_list_tournaments();
create or replace function admin_list_tournaments()
returns table (
  id uuid, game text, title text, tagline text, details text,
  team_size int, starts_at timestamptz, reg_closes_at timestamptz,
  status text, is_featured boolean, prize text, contact text, logo_url text,
  team_count bigint, player_count bigint
)
language sql stable security definer set search_path = public as $$
  select t.id, t.game, t.title, t.tagline, t.details, t.team_size,
         t.starts_at, t.reg_closes_at, t.status, t.is_featured, t.prize, t.contact, t.logo_url,
         (select count(*) from tournament_teams x where x.tournament_id = t.id),
         (select count(*) from tournament_members m
           join tournament_teams x on x.id = m.team_id where x.tournament_id = t.id)
  from tournaments t
  where t.college_id = (select college_id from profiles where id = auth.uid() and is_moderator)
  order by t.is_featured desc, t.created_at desc
$$;

create or replace function admin_save_tournament(
  p_id uuid, p_game text, p_title text, p_tagline text, p_details text,
  p_team_size int, p_starts_at timestamptz, p_reg_closes_at timestamptz,
  p_status text, p_prize text, p_contact text, p_logo_url text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid; out_id uuid;
begin
  select college_id into cid from profiles where id = auth.uid() and is_moderator;
  if cid is null then raise exception 'Only a college moderator can manage tournaments.'; end if;
  if btrim(coalesce(p_title,'')) = '' or btrim(coalesce(p_game,'')) = '' then
    raise exception 'A tournament needs a game and a title.'; end if;
  if p_team_size is null or p_team_size < 1 or p_team_size > 10 then
    raise exception 'Team size must be between 1 and 10.'; end if;
  if p_status not in ('draft','open','closed','done') then raise exception 'Unknown status.'; end if;
  if p_starts_at is not null and p_reg_closes_at is not null and p_reg_closes_at > p_starts_at then
    raise exception 'Registration would close after the tournament starts.'; end if;

  if p_id is null then
    insert into tournaments (college_id, created_by, game, title, tagline, details,
      team_size, starts_at, reg_closes_at, status, prize, contact, logo_url)
    values (cid, auth.uid(), btrim(p_game), btrim(p_title),
      nullif(btrim(coalesce(p_tagline,'')),''), nullif(btrim(coalesce(p_details,'')),''),
      p_team_size, p_starts_at, p_reg_closes_at, p_status,
      nullif(btrim(coalesce(p_prize,'')),''), nullif(btrim(coalesce(p_contact,'')),''),
      nullif(btrim(coalesce(p_logo_url,'')),''))
    returning id into out_id;
  else
    update tournaments set game=btrim(p_game), title=btrim(p_title),
      tagline=nullif(btrim(coalesce(p_tagline,'')),''),
      details=nullif(btrim(coalesce(p_details,'')),''),
      team_size=p_team_size, starts_at=p_starts_at, reg_closes_at=p_reg_closes_at,
      status=p_status, prize=nullif(btrim(coalesce(p_prize,'')),''),
      contact=nullif(btrim(coalesce(p_contact,'')),''),
      logo_url=nullif(btrim(coalesce(p_logo_url,'')),'')
    where id=p_id and college_id=cid returning id into out_id;
    if out_id is null then raise exception 'That tournament belongs to another college.'; end if;
  end if;
  return out_id;
end $$;

grant execute on function featured_tournament()           to authenticated;
grant execute on function admin_list_tournaments()        to authenticated;
grant execute on function public_tournament_preview(uuid) to anon, authenticated;
grant execute on function admin_save_tournament(uuid, text, text, text, text, int, timestamptz, timestamptz, text, text, text, text) to authenticated;
