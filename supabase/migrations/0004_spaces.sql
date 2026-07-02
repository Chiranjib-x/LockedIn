-- Phase 6.5: members-only Spaces (first instance: Girls' Closet).
-- Security model: space-scoped rows are UNREACHABLE to non-members via RLS —
-- not hidden in the UI, unreachable at the database. No gender is stored
-- anywhere; entry is by member vouch, like the WhatsApp groups this replaces.
-- Run in Supabase SQL editor.

create table spaces (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  name text not null,
  emoji text not null default '👗',
  created_at timestamptz not null default now()
);

create table space_members (
  space_id uuid not null references spaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  added_by uuid references profiles(id),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

-- security definer avoids RLS recursion (policies on space_members query it).
create or replace function is_space_member(sid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from space_members where space_id = sid and user_id = auth.uid()
  )
$$;

alter table spaces enable row level security;
alter table space_members enable row level security;

-- Spaces are invisible to non-members: no browse, no existence leak.
create policy "spaces: members only" on spaces
  for select to authenticated using (is_space_member(id));

create policy "space_members: members see the roster" on space_members
  for select to authenticated using (is_space_member(space_id));

-- Vouching: only an existing member can add someone (from the same college).
create policy "space_members: members vouch new members" on space_members
  for insert to authenticated
  with check (
    is_space_member(space_id)
    and added_by = auth.uid()
    and exists (select 1 from profiles p where p.id = user_id
                and p.college_id = get_my_college_id())
  );

-- Self-removal only. Removing others = Phase 17 moderation.
create policy "space_members: leave" on space_members
  for delete to authenticated using (user_id = auth.uid());

-- Listings can now live inside a space.
alter table listings add column space_id uuid references spaces(id);
create index listings_space_idx on listings (space_id) where space_id is not null;

-- Tighten listing visibility: public listings stay college-wide; space
-- listings require membership.
drop policy "listings: same-college read" on listings;
create policy "listings: same-college read" on listings
  for select to authenticated
  using (
    college_id = get_my_college_id()
    and (space_id is null or is_space_member(space_id))
  );

drop policy "listings: insert own in my college" on listings;
create policy "listings: insert own in my college" on listings
  for insert to authenticated
  with check (
    seller_id = auth.uid()
    and college_id = get_my_college_id()
    and (space_id is null or is_space_member(space_id))
  );

-- ── Seed ────────────────────────────────────────────────────────────────────
-- One Girls' Closet per college. The founding member bootstraps vouching —
-- REPLACE the email below with the real founding member (e.g. a hostel rep)
-- per college before launch. Dev: the test account founds Demo College's.
insert into spaces (college_id, name, emoji)
select id, 'Girls'' Closet', '👗' from colleges;

insert into space_members (space_id, user_id, added_by)
select s.id, p.id, p.id
from spaces s
join profiles p on p.college_id = s.college_id
join auth.users u on u.id = p.id
where s.name = 'Girls'' Closet'
  and u.email = 'lockedin.phase1.test@gmail.com';
