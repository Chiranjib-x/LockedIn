-- Let the founder run a tournament without me touching the database.
--
-- 0090 created the tables but no write path for the organiser — the Valorant Cup
-- was inserted by hand, which does not scale past the first one and leaves the
-- dates permanently un-editable from the app.
--
-- Writes stay in definer RPCs (there is still no INSERT/UPDATE policy on
-- tournaments), so the moderator check lives in one place rather than in the UI.

create or replace function admin_save_tournament(
  p_id            uuid,
  p_game          text,
  p_title         text,
  p_tagline       text,
  p_details       text,
  p_team_size     int,
  p_starts_at     timestamptz,
  p_reg_closes_at timestamptz,
  p_status        text,
  p_prize         text,
  p_contact       text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid; out_id uuid;
begin
  select college_id into cid from profiles where id = auth.uid() and is_moderator;
  if cid is null then
    raise exception 'Only a college moderator can manage tournaments.';
  end if;
  if btrim(coalesce(p_title, '')) = '' or btrim(coalesce(p_game, '')) = '' then
    raise exception 'A tournament needs a game and a title.';
  end if;
  if p_team_size is null or p_team_size < 1 or p_team_size > 10 then
    raise exception 'Team size must be between 1 and 10.';
  end if;
  if p_status not in ('draft', 'open', 'closed', 'done') then
    raise exception 'Unknown status.';
  end if;
  -- Catches the transposed pair before anyone can register into a closed window.
  if p_starts_at is not null and p_reg_closes_at is not null
     and p_reg_closes_at > p_starts_at then
    raise exception 'Registration would close after the tournament starts.';
  end if;

  if p_id is null then
    insert into tournaments (college_id, created_by, game, title, tagline, details,
                             team_size, starts_at, reg_closes_at, status, prize, contact)
    values (cid, auth.uid(), btrim(p_game), btrim(p_title),
            nullif(btrim(coalesce(p_tagline, '')), ''),
            nullif(btrim(coalesce(p_details, '')), ''),
            p_team_size, p_starts_at, p_reg_closes_at, p_status,
            nullif(btrim(coalesce(p_prize, '')), ''),
            nullif(btrim(coalesce(p_contact, '')), ''))
    returning id into out_id;
  else
    update tournaments
       set game = btrim(p_game),
           title = btrim(p_title),
           tagline = nullif(btrim(coalesce(p_tagline, '')), ''),
           details = nullif(btrim(coalesce(p_details, '')), ''),
           team_size = p_team_size,
           starts_at = p_starts_at,
           reg_closes_at = p_reg_closes_at,
           status = p_status,
           prize = nullif(btrim(coalesce(p_prize, '')), ''),
           contact = nullif(btrim(coalesce(p_contact, '')), '')
     where id = p_id and college_id = cid
    returning id into out_id;
    if out_id is null then
      raise exception 'That tournament belongs to another college.';
    end if;
  end if;

  return out_id;
end $$;

-- Deleting takes the teams and rosters with it (ON DELETE CASCADE from 0090), so
-- it is refused once anyone has entered. Un-feature or set it to done instead —
-- withdrawing people's entries silently is not something a stray tap should do.
create or replace function admin_delete_tournament(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid; n int;
begin
  select college_id into cid from profiles where id = auth.uid() and is_moderator;
  if cid is null then
    raise exception 'Only a college moderator can manage tournaments.';
  end if;
  select count(*) into n
    from tournament_teams where tournament_id = p_id;
  if n > 0 then
    raise exception 'Teams have already entered. Set it to done, or un-feature it, instead of deleting.';
  end if;
  delete from tournaments where id = p_id and college_id = cid;
end $$;

-- Everything at this college, drafts included, for the admin list.
create or replace function admin_list_tournaments()
returns table (
  id uuid, game text, title text, tagline text, details text,
  team_size int, starts_at timestamptz, reg_closes_at timestamptz,
  status text, is_featured boolean, prize text, contact text,
  team_count bigint, player_count bigint
)
language sql stable security definer set search_path = public as $$
  select t.id, t.game, t.title, t.tagline, t.details, t.team_size,
         t.starts_at, t.reg_closes_at, t.status, t.is_featured, t.prize, t.contact,
         (select count(*) from tournament_teams x where x.tournament_id = t.id),
         (select count(*) from tournament_members m
           join tournament_teams x on x.id = m.team_id where x.tournament_id = t.id)
  from tournaments t
  where t.college_id = (select college_id from profiles
                         where id = auth.uid() and is_moderator)
  order by t.is_featured desc, t.created_at desc
$$;

grant execute on function admin_save_tournament(uuid, text, text, text, text, int, timestamptz, timestamptz, text, text, text) to authenticated;
grant execute on function admin_delete_tournament(uuid) to authenticated;
grant execute on function admin_list_tournaments()      to authenticated;
