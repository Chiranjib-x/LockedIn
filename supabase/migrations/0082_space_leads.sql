-- One trusted member per space who can manage its roster, so the founder is not
-- the only door.
--
-- The chain so far: 0070 gave any member an invite link, 0081 gave a college
-- moderator direct tap-to-add. Neither scales for a gendered space, because the
-- moderator should not have to be involved in who belongs in Girls' Closet — the
-- people in it know that better than he does.
--
-- A lead can add and REMOVE. Add-only was the literal ask, but a lead who puts
-- the wrong person into a gendered space and then has to wait for a moderator to
-- undo it is a safety problem, not an inconvenience. Removing is the more urgent
-- of the two powers.
--
-- A lead is still a member: they see the space normally, and they cannot promote
-- anyone, demote themselves, or touch another space. Only a college moderator
-- appoints or replaces a lead.

alter table space_members
  add column if not exists is_lead boolean not null default false;

comment on column space_members.is_lead is
  'The one member trusted to manage this space''s roster. Appointed by a college moderator only.';

-- "One person from each space" enforced in the schema, not in the UI: a second
-- lead cannot exist even if something tries to write one.
create unique index if not exists space_members_one_lead_idx
  on space_members (space_id) where is_lead;

-- Is the caller the lead of this space? Used by the guards below.
create or replace function is_space_lead(sid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from space_members
    where space_id = sid and user_id = auth.uid() and is_lead
  )
$$;

-- Moderator appoints (or replaces) the lead. Passing null clears it.
create or replace function admin_set_space_lead(p_space uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  space_name text;
begin
  select college_id into cid from profiles where id = auth.uid() and is_moderator;
  if cid is null then
    raise exception 'Only a college moderator can choose a space lead.';
  end if;

  select s.name into space_name from spaces s where s.id = p_space and s.college_id = cid;
  if space_name is null then
    raise exception 'That space belongs to another college.';
  end if;

  -- Clear first so the partial unique index never sees two leads mid-statement.
  update space_members set is_lead = false where space_id = p_space and is_lead;

  if p_user is null then
    return;
  end if;

  if not exists (select 1 from space_members where space_id = p_space and user_id = p_user) then
    raise exception 'Add them to the space first — a lead has to be a member.';
  end if;

  update space_members set is_lead = true where space_id = p_space and user_id = p_user;

  perform notify(
    p_user, cid, 'space',
    'You can now add and remove members of ' || space_name || '.',
    '/spaces/' || p_space::text
  );
end $$;

-- Extend the 0081 guards: a college moderator OR this space's own lead.
create or replace function admin_add_space_member(p_space uuid, p_user uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  space_college uuid;
  space_name text;
  actor_name text;
  is_mod boolean;
begin
  select (p.is_moderator), p.college_id into is_mod, cid from profiles p where p.id = auth.uid();
  select s.college_id, s.name into space_college, space_name from spaces s where s.id = p_space;
  if space_college is null then
    raise exception 'That space does not exist.';
  end if;

  if not ((is_mod and space_college = cid) or is_space_lead(p_space)) then
    raise exception 'Only a moderator or this space''s lead can add members.';
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

  select coalesce(name, 'Someone') into actor_name from profiles where id = auth.uid();
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
  is_mod boolean;
begin
  select (p.is_moderator), p.college_id into is_mod, cid from profiles p where p.id = auth.uid();
  select s.college_id into space_college from spaces s where s.id = p_space;

  if not ((is_mod and space_college = cid) or is_space_lead(p_space)) then
    raise exception 'Only a moderator or this space''s lead can remove members.';
  end if;

  -- A lead cannot remove themselves and orphan the space's only manager; the
  -- moderator reassigns instead. Leaving normally is still theirs to do.
  if p_user = auth.uid() and is_space_lead(p_space) then
    raise exception 'You are this space''s lead — ask a moderator to reassign it first.';
  end if;

  delete from space_members where space_id = p_space and user_id = p_user;
end $$;

-- Return type gains is_lead, and create-or-replace cannot change a return type
-- ("cannot change return type of existing function"). Same trap record_checkin
-- hit in 0077 — drop first.
drop function if exists admin_space_roster(uuid);
create or replace function admin_space_roster(p_space uuid)
returns table (user_id uuid, name text, username text, is_lead boolean)
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  is_mod boolean;
  space_college uuid;
begin
  select (p.is_moderator), p.college_id into is_mod, cid from profiles p where p.id = auth.uid();
  select s.college_id into space_college from spaces s where s.id = p_space;

  if not ((is_mod and space_college = cid) or is_space_lead(p_space)) then
    raise exception 'Only a moderator or this space''s lead can view this.';
  end if;

  return query
    select p.id, p.name, p.username, m.is_lead
    from space_members m
    join profiles p on p.id = m.user_id
    where m.space_id = p_space
    order by m.is_lead desc, p.name;
end $$;

grant execute on function is_space_lead(uuid)                   to authenticated;
grant execute on function admin_set_space_lead(uuid, uuid)      to authenticated;
grant execute on function admin_add_space_member(uuid, uuid)    to authenticated;
grant execute on function admin_remove_space_member(uuid, uuid) to authenticated;
grant execute on function admin_space_roster(uuid)              to authenticated;
