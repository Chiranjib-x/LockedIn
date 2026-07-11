-- Phase 34: study groups per course + the app's first multi-party chats.
-- Course codes stay plain text (Phase 23's courses table was skipped).
-- Group lifecycle lives in definer RPCs: creating wires the group, its
-- conversation, membership, and chat participation atomically; joining is
-- capacity-checked (same recursion-safe pattern as claim_pickup).

create table study_groups (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  course_code text not null,
  title text not null,
  description text,
  capacity int not null default 6 check (capacity between 2 and 50),
  meet_info text,
  creator_id uuid not null references profiles(id) on delete cascade,
  conversation_id uuid references conversations(id),
  created_at timestamptz not null default now()
);

create index study_groups_course_idx on study_groups (college_id, course_code);

create table study_group_members (
  group_id uuid not null references study_groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table study_groups enable row level security;
alter table study_group_members enable row level security;

create policy "study_groups: same-college read" on study_groups
  for select to authenticated using (college_id = get_my_college_id());

create policy "study_group_members: same-college read" on study_group_members
  for select to authenticated
  using (exists (select 1 from study_groups g
                 where g.id = group_id and g.college_id = get_my_college_id()));

-- Writes only through the RPCs below (definer bypasses RLS).

create or replace function create_study_group(
  p_course text, p_title text, p_desc text, p_capacity int, p_meet text
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  cid uuid := get_my_college_id();
  gid uuid;
  conv uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into study_groups (college_id, course_code, title, description, capacity, meet_info, creator_id)
  values (cid, upper(replace(p_course, ' ', '')), p_title, nullif(p_desc, ''), coalesce(p_capacity, 6), nullif(p_meet, ''), auth.uid())
  returning id into gid;

  insert into conversations (college_id, context_type, context_id)
  values (cid, 'study_group', gid)
  returning id into conv;

  update study_groups set conversation_id = conv where id = gid;
  insert into study_group_members (group_id, user_id) values (gid, auth.uid());
  insert into conversation_participants (conversation_id, user_id) values (conv, auth.uid());
  insert into messages (conversation_id, sender_id, body)
  values (conv, auth.uid(), '📚 Group created — drop your doubts here.');
  return gid;
end;
$$;

-- Returns null on success, else a user-facing reason.
create or replace function join_study_group(gid uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  g record;
  member_count int;
begin
  select * into g from study_groups where id = gid and college_id = get_my_college_id();
  if g is null then return 'Group not found.'; end if;
  if exists (select 1 from study_group_members where group_id = gid and user_id = auth.uid()) then
    return 'You''re already in.';
  end if;
  select count(*) into member_count from study_group_members where group_id = gid;
  if member_count >= g.capacity then return 'Group''s full.'; end if;

  insert into study_group_members (group_id, user_id) values (gid, auth.uid());
  insert into conversation_participants (conversation_id, user_id) values (g.conversation_id, auth.uid());
  insert into messages (conversation_id, sender_id, body)
  values (g.conversation_id, auth.uid(),
          '👋 ' || coalesce((select name from profiles where id = auth.uid()), 'Someone') || ' joined — say hi!');
  return null;
end;
$$;

create or replace function leave_study_group(gid uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  conv uuid;
begin
  select conversation_id into conv from study_groups where id = gid;
  delete from study_group_members where group_id = gid and user_id = auth.uid();
  delete from conversation_participants where conversation_id = conv and user_id = auth.uid();
end;
$$;
