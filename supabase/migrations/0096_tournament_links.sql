-- A group chat link and a live-stream link, both organiser-managed.
--
-- Two different audiences, on purpose:
--
--   chat_url    a WhatsApp group invite. Shown ONLY to people who have actually
--               entered. A WhatsApp invite link is a bearer token — anyone who
--               can read it can join the group, forever, and forward it. The
--               public preview page is readable by the whole internet, so this
--               must never appear there.
--
--   stream_url  the YouTube live link. Shown to EVERYONE, including on the public
--               preview and the share card, because advertising the broadcast is
--               the entire point of having one.
--
-- Both nullable: a tournament with no stream simply shows no stream.

alter table tournaments
  add column if not exists chat_url   text,
  add column if not exists stream_url text;

comment on column tournaments.chat_url is
  'Group chat invite (e.g. WhatsApp). Entrants only — an invite link is a bearer token, so it is never exposed on the public preview.';
comment on column tournaments.stream_url is
  'Live broadcast URL. Public — shown to everyone, including on the share card.';

-- Same signature plus the two links. Dropped first: return type is unchanged but
-- the argument list is, and Postgres treats that as a different function, which
-- would leave the OLD 12-argument version resolvable alongside it.
drop function if exists admin_save_tournament(uuid, text, text, text, text, int, timestamptz, timestamptz, text, text, text, text);

create or replace function admin_save_tournament(
  p_id uuid, p_game text, p_title text, p_tagline text, p_details text,
  p_team_size int, p_starts_at timestamptz, p_reg_closes_at timestamptz,
  p_status text, p_prize text, p_contact text, p_logo_url text default null,
  p_chat_url text default null, p_stream_url text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  cid uuid; rid uuid;
begin
  select college_id into cid from profiles where id = auth.uid() and is_moderator;
  if cid is null then
    raise exception 'Only a college moderator can manage tournaments.';
  end if;

  if p_id is null then
    insert into tournaments (college_id, created_by, game, title, tagline, details,
                             team_size, starts_at, reg_closes_at, status, prize, contact,
                             logo_url, chat_url, stream_url)
    values (cid, auth.uid(), p_game, p_title, p_tagline, p_details,
            greatest(coalesce(p_team_size, 1), 1), p_starts_at, p_reg_closes_at,
            coalesce(p_status, 'open'), p_prize, p_contact,
            nullif(btrim(coalesce(p_logo_url, '')), ''),
            nullif(btrim(coalesce(p_chat_url, '')), ''),
            nullif(btrim(coalesce(p_stream_url, '')), ''))
    returning id into rid;
  else
    update tournaments set
      game = p_game, title = p_title, tagline = p_tagline, details = p_details,
      team_size = greatest(coalesce(p_team_size, 1), 1),
      starts_at = p_starts_at, reg_closes_at = p_reg_closes_at,
      status = coalesce(p_status, status), prize = p_prize, contact = p_contact,
      logo_url   = nullif(btrim(coalesce(p_logo_url, '')), ''),
      chat_url   = nullif(btrim(coalesce(p_chat_url, '')), ''),
      stream_url = nullif(btrim(coalesce(p_stream_url, '')), '')
    where id = p_id and college_id = cid
    returning id into rid;
    if rid is null then
      raise exception 'That tournament belongs to another college.';
    end if;
  end if;
  return rid;
end $$;

-- The organiser's own list needs both back so the admin form can prefill them.
drop function if exists admin_list_tournaments();
create or replace function admin_list_tournaments()
returns table (
  id uuid, game text, title text, tagline text, details text, team_size int,
  starts_at timestamptz, reg_closes_at timestamptz, status text, prize text,
  contact text, logo_url text, chat_url text, stream_url text,
  is_featured boolean, team_count bigint, player_count bigint
)
language sql stable security definer set search_path = public as $$
  select t.id, t.game, t.title, t.tagline, t.details, t.team_size,
         t.starts_at, t.reg_closes_at, t.status::text, t.prize,
         t.contact, t.logo_url, t.chat_url, t.stream_url, t.is_featured,
         (select count(*) from tournament_teams x where x.tournament_id = t.id),
         (select count(*) from tournament_members m
            join tournament_teams x on x.id = m.team_id
           where x.tournament_id = t.id)
  from tournaments t
  where t.college_id = (select college_id from profiles where id = auth.uid() and is_moderator)
  order by t.starts_at nulls last, t.created_at desc
$$;

-- The PUBLIC preview gains stream_url only. chat_url is deliberately absent:
-- this function is readable without an account.
drop function if exists public_tournament_preview(uuid);
create or replace function public_tournament_preview(tid uuid)
returns table (
  id uuid, game text, title text, tagline text, team_size int,
  starts_at timestamptz, reg_closes_at timestamptz, status text, prize text,
  logo_url text, stream_url text, team_count bigint, player_count bigint,
  college_name text
)
language sql stable security definer set search_path = public as $$
  select t.id, t.game, t.title, t.tagline, t.team_size,
         t.starts_at, t.reg_closes_at, t.status::text, t.prize,
         t.logo_url, t.stream_url,
         (select count(*) from tournament_teams x where x.tournament_id = t.id),
         (select count(*) from tournament_members m
            join tournament_teams x on x.id = m.team_id
           where x.tournament_id = t.id),
         g.name
  from tournaments t
  join colleges g on g.id = t.college_id
  where t.id = tid
$$;

grant execute on function admin_save_tournament(uuid, text, text, text, text, int, timestamptz, timestamptz, text, text, text, text, text, text) to authenticated;
grant execute on function admin_list_tournaments()        to authenticated;
grant execute on function public_tournament_preview(uuid) to anon, authenticated;
