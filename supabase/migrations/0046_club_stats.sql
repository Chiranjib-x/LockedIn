-- 0046: club analytics. One gated function returns a moderator's dashboard
-- numbers; SECURITY DEFINER so it can aggregate across tables (check-ins,
-- interests) the caller can't necessarily read row-by-row, but scoped to
-- club/app moderators only.
create or replace function club_stats(cid uuid)
returns table (
  members int,
  new_members_7d int,
  interested int,
  events int,
  checkins int,
  updates int
)
language plpgsql security definer set search_path = public as $$
begin
  if not (is_app_moderator() or is_community_moderator(cid)) then
    raise exception 'not allowed';
  end if;
  return query select
    (select count(*)::int from community_members where community_id = cid),
    (select count(*)::int from community_members where community_id = cid and joined_at >= now() - interval '7 days'),
    (select count(*)::int from community_interests where community_id = cid),
    (select count(*)::int from posts where community_id = cid and type = 'event'),
    (select count(*)::int from event_checkins ec join posts p on p.id = ec.post_id where p.community_id = cid),
    (select count(*)::int from posts where community_id = cid and type <> 'event');
end;
$$;
