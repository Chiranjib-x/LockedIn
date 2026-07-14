-- 0039: Requests — the inverse of a listing. Students post what they NEED
-- (e.g. "lehenga for a wedding, size M") in the marketplace or inside a Space
-- (Girls' Closet / Boys' Den). Anyone who has the item messages the requester
-- via the existing chat (find_or_create_dm, context 'request').
--
-- Separate table, not a listings.kind flag: a want has no price/images/sold
-- state/offers, so overloading listings would need guards on every query.
-- RLS mirrors listings exactly — same college + space-membership scoping.

create table requests (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  requester_id uuid not null references profiles(id) on delete cascade,
  space_id uuid references spaces(id),        -- null = whole-college marketplace
  title text not null,
  description text,
  category text not null,
  budget numeric(10, 2),                       -- optional: max willing to pay
  status text not null default 'open',         -- open | fulfilled
  created_at timestamptz not null default now()
);

create index requests_college_created_idx on requests (college_id, created_at desc);
create index requests_space_idx on requests (space_id) where space_id is not null;

alter table requests enable row level security;

-- Read: same college; space requests only for members (unreachable otherwise).
create policy "requests: same-college read" on requests
  for select to authenticated
  using (
    college_id = get_my_college_id()
    and (space_id is null or is_space_member(space_id))
  );

-- Insert: own row, own college (stamped server-side), space membership if set,
-- not banned.
create policy "requests: insert own in my college" on requests
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and college_id = get_my_college_id()
    and not is_banned()
    and (space_id is null or is_space_member(space_id))
  );

create policy "requests: requester update" on requests
  for update to authenticated using (requester_id = auth.uid());

create policy "requests: requester delete" on requests
  for delete to authenticated using (requester_id = auth.uid());
