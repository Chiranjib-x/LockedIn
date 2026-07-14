-- 0047: club roster export. A moderator-gated function returning members +
-- interested students WITH emails (from auth.users, otherwise unreadable via
-- the API) for CSV export. Interested rows exclude people who are already
-- members, so no one is listed twice.
create or replace function club_roster_export(cid uuid)
returns table (name text, email text, status text, since timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not (is_app_moderator() or is_community_moderator(cid)) then
    raise exception 'not allowed';
  end if;
  return query
    select p.name, u.email::text, cm.role, cm.joined_at
    from community_members cm
    join profiles p on p.id = cm.user_id
    join auth.users u on u.id = cm.user_id
    where cm.community_id = cid
    union all
    select p.name, u.email::text, 'interested', ci.created_at
    from community_interests ci
    join profiles p on p.id = ci.user_id
    join auth.users u on u.id = ci.user_id
    where ci.community_id = cid
      and not exists (
        select 1 from community_members cm
        where cm.community_id = cid and cm.user_id = ci.user_id
      )
    order by 3 desc, 4 asc;  -- moderators, members, then interested; oldest first
end;
$$;
