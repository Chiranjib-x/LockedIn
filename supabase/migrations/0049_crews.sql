-- 0049: Crews — private, user-made groups (roommates, friends), separate from
-- official Clubs (communities). Members share "notes" (reminders/to-dos:
-- clean the room, fix the mirror…) that stay PENDING until any member marks
-- them RESOLVED. Private like Spaces: unreachable to non-members via RLS.

create table crews (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  name text not null,
  creator_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table crew_members (
  crew_id uuid not null references crews(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  added_by uuid references profiles(id),
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create table crew_notes (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crews(id) on delete cascade,
  college_id uuid not null references colleges(id),
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  status text not null default 'pending',   -- pending | resolved
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index crew_notes_crew_idx on crew_notes (crew_id, status, created_at desc);
create index crew_members_user_idx on crew_members (user_id);

-- security definer avoids RLS recursion (policies query crew_members).
create or replace function is_crew_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from crew_members where crew_id = cid and user_id = auth.uid())
$$;

alter table crews enable row level security;
alter table crew_members enable row level security;
alter table crew_notes enable row level security;

-- Crews are invisible to non-members. Created only via create_crew() (definer).
create policy "crews: members read" on crews
  for select to authenticated using (is_crew_member(id));
create policy "crews: creator delete" on crews
  for delete to authenticated using (creator_id = auth.uid());

-- Members see the roster; any member adds someone from their college; self-leave.
create policy "crew_members: members read" on crew_members
  for select to authenticated using (is_crew_member(crew_id));
create policy "crew_members: members add same-college" on crew_members
  for insert to authenticated
  with check (
    is_crew_member(crew_id) and added_by = auth.uid()
    and exists (select 1 from profiles p where p.id = user_id and p.college_id = get_my_college_id())
  );
create policy "crew_members: leave" on crew_members
  for delete to authenticated using (user_id = auth.uid());

-- Notes: members read/add; any member flips status; author deletes.
create policy "crew_notes: members read" on crew_notes
  for select to authenticated using (is_crew_member(crew_id));
create policy "crew_notes: members add" on crew_notes
  for insert to authenticated
  with check (
    is_crew_member(crew_id) and author_id = auth.uid()
    and college_id = get_my_college_id() and not is_banned()
  );
create policy "crew_notes: members update" on crew_notes
  for update to authenticated using (is_crew_member(crew_id));
create policy "crew_notes: author delete" on crew_notes
  for delete to authenticated using (author_id = auth.uid());

-- Atomic create: the crew + the creator's membership.
create or replace function create_crew(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  cid uuid := get_my_college_id();
  crew uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if is_banned() then raise exception 'banned'; end if;
  if btrim(coalesce(p_name, '')) = '' then raise exception 'name required'; end if;
  insert into crews (college_id, name, creator_id)
  values (cid, btrim(p_name), auth.uid()) returning id into crew;
  insert into crew_members (crew_id, user_id, added_by) values (crew, auth.uid(), auth.uid());
  return crew;
end;
$$;
