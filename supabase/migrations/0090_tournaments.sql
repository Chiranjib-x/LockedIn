-- Tournaments — the app as the place a campus competition is organised.
--
-- The point is distribution: a Valorant bracket is a reason for a WhatsApp group
-- to open the app, and unlike "check out my app" it asks nothing of anyone. The
-- public preview page is the actual mechanism — the link has to work on people
-- who do not have an account yet, or it cannot travel.
--
-- NOTHING HERE IS VALORANT-SHAPED. `game` is free text and `team_size` is a
-- number, so the next one can be chess or FIFA without a migration. And the home
-- banner is driven by `is_featured` ON THE TOURNAMENT ITSELF rather than by a
-- separate banners table: stopping means un-featuring the last row, and the
-- banner disappears with nothing left behind to tidy up.

create table if not exists tournaments (
  id            uuid primary key default gen_random_uuid(),
  college_id    uuid not null references colleges(id),
  created_by    uuid references profiles(id) on delete set null,
  game          text not null,
  title         text not null,
  tagline       text,
  details       text,
  team_size     int  not null default 1 check (team_size between 1 and 10),
  starts_at     timestamptz,
  reg_closes_at timestamptz,
  status        text not null default 'open'
                check (status in ('draft', 'open', 'closed', 'done')),
  is_featured   boolean not null default false,
  prize         text,
  contact       text,
  created_at    timestamptz not null default now()
);

-- One banner at a time per college. Schema-level, so the UI cannot produce two.
create unique index if not exists tournaments_one_featured
  on tournaments (college_id) where is_featured;

create table if not exists tournament_teams (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  college_id    uuid not null references colleges(id),
  name          text not null check (char_length(btrim(name)) between 2 and 40),
  captain_id    uuid not null references profiles(id) on delete cascade,
  created_at    timestamptz not null default now()
);

create unique index if not exists tournament_teams_name_uniq
  on tournament_teams (tournament_id, lower(btrim(name)));

create table if not exists tournament_members (
  team_id   uuid not null references tournament_teams(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  -- In-game name (Riot ID, chess handle, whatever the game uses). The one piece
  -- of information an organiser genuinely cannot run a bracket without.
  ign       text,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

alter table tournaments        enable row level security;
alter table tournament_teams   enable row level security;
alter table tournament_members enable row level security;

-- A tournament is public within its college. Drafts stay with the organiser.
drop policy if exists "tournaments: college read" on tournaments;
create policy "tournaments: college read" on tournaments
  for select to authenticated
  using (
    college_id = get_my_college_id()
    and (status <> 'draft' or is_app_moderator() or created_by = auth.uid())
  );

-- Rosters are readable college-wide on purpose: knowing who has entered is half
-- the reason anyone enters.
drop policy if exists "tournament_teams: college read" on tournament_teams;
create policy "tournament_teams: college read" on tournament_teams
  for select to authenticated using (college_id = get_my_college_id());

drop policy if exists "tournament_members: college read" on tournament_members;
create policy "tournament_members: college read" on tournament_members
  for select to authenticated
  using (exists (
    select 1 from tournament_teams t
    where t.id = team_id and t.college_id = get_my_college_id()
  ));

-- Writes go through the definer RPCs below; no INSERT/UPDATE policy exists, so a
-- client cannot enter a closed tournament or stuff a team past its size.

create or replace function create_tournament_team(
  p_tournament uuid, p_name text, p_ign text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  cid uuid; t record; new_id uuid;
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
    join tournament_teams tt on tt.id = m.team_id
    where tt.tournament_id = p_tournament and m.user_id = auth.uid()
  ) then
    raise exception 'You are already entered in this tournament.';
  end if;

  insert into tournament_teams (tournament_id, college_id, name, captain_id)
  values (p_tournament, cid, btrim(p_name), auth.uid())
  returning id into new_id;

  insert into tournament_members (team_id, user_id, ign)
  values (new_id, auth.uid(), nullif(btrim(coalesce(p_ign, '')), ''));

  return new_id;
end $$;

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
  select count(*) into n from tournament_members where team_id = p_team;
  if n >= t.team_size then
    raise exception 'That team is full.';
  end if;

  insert into tournament_members (team_id, user_id, ign)
  values (p_team, auth.uid(), nullif(btrim(coalesce(p_ign, '')), ''));

  perform notify(tt.captain_id, cid, 'tournament',
                 coalesce((select name from profiles where id = auth.uid()), 'Someone')
                 || ' joined ' || tt.name || '.',
                 '/tournaments/' || t.id::text);
end $$;

-- Leaving. A captain leaving takes the team with it, otherwise a team can be
-- left with members and nobody able to manage it.
create or replace function leave_tournament_team(p_team uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare tt record;
begin
  select * into tt from tournament_teams where id = p_team;
  if tt is null then return; end if;
  if tt.captain_id = auth.uid() then
    delete from tournament_teams where id = p_team;
  else
    delete from tournament_members where team_id = p_team and user_id = auth.uid();
  end if;
end $$;

-- Moderator-only: which tournament (if any) owns the home banner.
create or replace function set_featured_tournament(p_tournament uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select college_id into cid from profiles where id = auth.uid() and is_moderator;
  if cid is null then
    raise exception 'Only a college moderator can feature a tournament.';
  end if;
  update tournaments set is_featured = false where college_id = cid and is_featured;
  if p_tournament is not null then
    update tournaments set is_featured = true
     where id = p_tournament and college_id = cid;
  end if;
end $$;

-- The banner's source. Returns at most one row, and nothing at all once the
-- organiser stops — which is the "maybe I stop doing this" case.
create or replace function featured_tournament()
returns table (
  id uuid, game text, title text, tagline text, team_size int,
  starts_at timestamptz, reg_closes_at timestamptz, status text,
  team_count bigint, player_count bigint, i_am_in boolean
)
language sql stable security definer set search_path = public as $$
  select t.id, t.game, t.title, t.tagline, t.team_size,
         t.starts_at, t.reg_closes_at, t.status,
         (select count(*) from tournament_teams x where x.tournament_id = t.id),
         (select count(*) from tournament_members m
           join tournament_teams x on x.id = m.team_id where x.tournament_id = t.id),
         exists (select 1 from tournament_members m
                  join tournament_teams x on x.id = m.team_id
                  where x.tournament_id = t.id and m.user_id = auth.uid())
  from tournaments t
  where t.is_featured
    and t.status in ('open', 'closed')
    and t.college_id = (select college_id from profiles where id = auth.uid())
  limit 1
$$;

-- Public preview: the link that gets pasted into a WhatsApp group. Whitelisted
-- fields only — no rosters, no names, no contact details of entrants.
create or replace function public_tournament_preview(tid uuid)
returns table (
  id uuid, game text, title text, tagline text, details text,
  team_size int, starts_at timestamptz, reg_closes_at timestamptz,
  status text, prize text, team_count bigint, player_count bigint,
  college_name text
)
language sql stable security definer set search_path = public as $$
  select t.id, t.game, t.title, t.tagline, t.details,
         t.team_size, t.starts_at, t.reg_closes_at, t.status, t.prize,
         (select count(*) from tournament_teams x where x.tournament_id = t.id),
         (select count(*) from tournament_members m
           join tournament_teams x on x.id = m.team_id where x.tournament_id = t.id),
         g.name
  from tournaments t
  join colleges g on g.id = t.college_id
  where t.id = tid and t.status <> 'draft'
$$;

grant select on tournaments, tournament_teams, tournament_members to authenticated;
grant execute on function create_tournament_team(uuid, text, text) to authenticated;
grant execute on function join_tournament_team(uuid, text)         to authenticated;
grant execute on function leave_tournament_team(uuid)              to authenticated;
grant execute on function set_featured_tournament(uuid)            to authenticated;
grant execute on function featured_tournament()                    to authenticated;
grant execute on function public_tournament_preview(uuid)          to anon, authenticated;
