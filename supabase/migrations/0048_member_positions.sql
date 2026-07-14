-- 0048: official club positions. Moderators tag members with a title (e.g.
-- "President", "Events Head", "Management Head"); tagged members are shown
-- publicly as the club's team. community_members has no general UPDATE policy,
-- so this definer function is the only write path (moderator-gated).
alter table community_members add column if not exists position text;

create or replace function set_member_position(cid uuid, uid uuid, pos text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (is_app_moderator() or is_community_moderator(cid)) then
    raise exception 'not allowed';
  end if;
  update community_members
    set position = nullif(btrim(pos), '')
    where community_id = cid and user_id = uid;
end;
$$;
