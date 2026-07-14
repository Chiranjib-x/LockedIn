-- 0041: read-side privacy (audit 2026-07-14). 0040 fixed the WRITE side; this
-- fixes the READ side.
--
-- PROBLEM: `profiles: same-college read` grants SELECT on EVERY column of EVERY
-- same-college profile. RLS is row-level — it cannot restrict columns. So any
-- student could dump the whole directory in one REST call, including `room`.
-- name/hostel_block/username are already shown publicly on listings, posts and
-- matches, so those are "public within the college" by design. `room` is NOT:
-- it is written only on your own profile form and displayed to nobody. Real
-- name + hostel block + room number = the exact door of any student on campus.
--
-- FIX: column-level SELECT grants (the only column control Postgres offers).
-- `room` and the retired `contact_pref` become unreadable through the API by
-- anyone — including their owner — so the owner reads their own full row via
-- the SECURITY DEFINER my_profile() below instead.
revoke select on profiles from authenticated, anon;
grant select (
  id, college_id, name, username, verified_name,
  batch, hostel_block, avatar_url, karma, is_moderator, is_banned, created_at
) on profiles to authenticated;

-- The owner's own row, including the columns nobody else may read.
-- security definer: runs as the owner of the function, so the column grants
-- above do not apply — but it is hard-scoped to auth.uid(), so it can only
-- ever return the caller's own row.
create or replace function my_profile()
returns table (
  id uuid,
  name text,
  username text,
  verified_name text,
  batch text,
  hostel_block text,
  room text,
  karma int
)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.username, p.verified_name,
         p.batch, p.hostel_block, p.room, p.karma
  from profiles p
  where p.id = auth.uid()
$$;
