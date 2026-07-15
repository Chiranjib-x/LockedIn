-- 0052: Teams (VIT student teams — competition/project squads) as a
-- first-class community category, plus the lead-run role management the
-- Communities engine was missing. Everything else teams need (positions
-- 0048, recruiting 0045, analytics 0046, roster export 0047, broadcast 0044)
-- already works per-community and applies unchanged.

alter type community_category add value if not exists 'team';

-- 0017's set_community_role had two gaps: it let the last moderator demote
-- themselves (orphaning the group — nobody can post/recruit/appoint again),
-- and it "promoted" people who weren't members (silent 0-row update). Rewrite
-- with both guards. Same auth rule: founder or a current community moderator.
create or replace function set_community_role(cid uuid, uid uuid, newrole text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if newrole not in ('member', 'moderator') then raise exception 'bad role'; end if;
  if not (is_app_moderator() or is_community_moderator(cid)) then
    raise exception 'not allowed';
  end if;
  if not exists (select 1 from community_members where community_id = cid and user_id = uid) then
    raise exception 'not a member';
  end if;
  if newrole = 'member'
     and exists (select 1 from community_members where community_id = cid and user_id = uid and role = 'moderator')
     and (select count(*) from community_members where community_id = cid and role = 'moderator') <= 1 then
    raise exception 'a team needs at least one lead — promote someone else first';
  end if;
  update community_members set role = newrole where community_id = cid and user_id = uid;
end;
$$;

-- Leads can remove members (0017 allowed only self-leave or the founder).
-- Removing a fellow moderator requires another moderator to remain, so the
-- last lead can never be removed. Self-removal stays the "leave" flow.
create or replace function remove_community_member(cid uuid, uid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (is_app_moderator() or is_community_moderator(cid)) then
    raise exception 'not allowed';
  end if;
  if uid = auth.uid() then
    raise exception 'use leave instead';
  end if;
  if exists (select 1 from community_members where community_id = cid and user_id = uid and role = 'moderator')
     and (select count(*) from community_members where community_id = cid and role = 'moderator') <= 1 then
    raise exception 'a team needs at least one lead';
  end if;
  delete from community_members where community_id = cid and user_id = uid;
end;
$$;

revoke all on function set_community_role(uuid, uuid, text) from public, anon;
grant execute on function set_community_role(uuid, uuid, text) to authenticated;
revoke all on function remove_community_member(uuid, uuid) from public, anon;
grant execute on function remove_community_member(uuid, uuid) to authenticated;
