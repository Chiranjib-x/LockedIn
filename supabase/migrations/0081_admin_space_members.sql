-- Admin: add or remove a space member directly, by tapping their name.
--
-- Until now the ONLY way into a space was an invite (0070) — deliberately, so
-- the person opts in. That is still the right default for students inviting
-- students. But seeding a brand-new gendered space one link at a time does not
-- scale, and the founder needs to do it at launch.
--
-- The consent property is preserved differently: an admin add is NEVER SILENT.
-- The person is notified that they were added, by whom, and told they can leave.
-- Appearing in a members-only space changes who can see you, so being told is
-- the minimum this owes them.
--
-- TENANCY: moderator of the space's own college, and the target must be in that
-- same college. A moderator cannot reach into another college's space or pull in
-- a student from elsewhere.

create or replace function admin_add_space_member(p_space uuid, p_user uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  space_college uuid;
  space_name text;
  actor_name text;
begin
  -- One query both authorises (moderator) and yields their college.
  select college_id into cid from profiles where id = auth.uid() and is_moderator;
  if cid is null then
    raise exception 'Only a college moderator can manage space members.';
  end if;

  select s.college_id, s.name into space_college, space_name from spaces s where s.id = p_space;
  if space_college is null then
    raise exception 'That space does not exist.';
  end if;
  if space_college <> cid then
    raise exception 'That space belongs to another college.';
  end if;

  if not exists (select 1 from profiles where id = p_user and college_id = cid) then
    raise exception 'That student is not at your college.';
  end if;

  if exists (select 1 from space_members where space_id = p_space and user_id = p_user) then
    return 'already';
  end if;

  insert into space_members (space_id, user_id, added_by)
  values (p_space, p_user, auth.uid());

  -- Never silent. Tell them what changed and that leaving is theirs to do.
  select coalesce(name, 'A moderator') into actor_name from profiles where id = auth.uid();
  perform notify(
    p_user, cid, 'space',
    actor_name || ' added you to ' || space_name || ' — a members-only space. You can leave any time.',
    '/spaces/' || p_space::text
  );

  return 'added';
end $$;

create or replace function admin_remove_space_member(p_space uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  space_college uuid;
begin
  select college_id into cid from profiles where id = auth.uid() and is_moderator;
  if cid is null then
    raise exception 'Only a college moderator can manage space members.';
  end if;

  select s.college_id into space_college from spaces s where s.id = p_space;
  if space_college is distinct from cid then
    raise exception 'That space belongs to another college.';
  end if;

  delete from space_members where space_id = p_space and user_id = p_user;
end $$;

-- The picker needs names, and the roster needs to be visible to the admin doing
-- the adding. Both are definer because the founder is NOT a member of these
-- spaces, so `space_members` is invisible to them under RLS.
create or replace function admin_space_roster(p_space uuid)
returns table (user_id uuid, name text, username text)
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
begin
  select college_id into cid from profiles where id = auth.uid() and is_moderator;
  if cid is null then
    raise exception 'Only a college moderator can view this.';
  end if;
  if not exists (select 1 from spaces s where s.id = p_space and s.college_id = cid) then
    raise exception 'That space belongs to another college.';
  end if;

  return query
    select p.id, p.name, p.username
    from space_members m
    join profiles p on p.id = m.user_id
    where m.space_id = p_space
    order by p.name;
end $$;

grant execute on function admin_add_space_member(uuid, uuid)    to authenticated;
grant execute on function admin_remove_space_member(uuid, uuid) to authenticated;
grant execute on function admin_space_roster(uuid)              to authenticated;
