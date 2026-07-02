-- Phase 9.5: Gate Runner — deliveries stop at the gate; students already
-- walking there collect parcels for others for a small reward.
-- Run in Supabase SQL editor.

create type pickup_status as enum ('open', 'claimed', 'delivered', 'cancelled');

create table pickup_requests (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  requester_id uuid not null references profiles(id) on delete cascade,
  runner_id uuid references profiles(id),
  runner_upi text, -- runner's UPI, set at claim time, for the reward
  platform text not null,          -- Zomato / Swiggy / Amazon / …
  item_desc text not null,         -- "black bag, order #1234"
  gate text not null default 'Main Gate',
  drop_location text not null,     -- "K Block, room 214"
  expected_at timestamptz not null,
  reward numeric(10, 2) not null default 0,
  status pickup_status not null default 'open',
  created_at timestamptz not null default now()
);

create index pickup_requests_college_idx on pickup_requests (college_id, status, expected_at);

alter table pickup_requests enable row level security;

-- THE TENANCY RULE
create policy "pickups: same-college read" on pickup_requests
  for select to authenticated using (college_id = get_my_college_id());

create policy "pickups: requester insert" on pickup_requests
  for insert to authenticated
  with check (requester_id = auth.uid() and college_id = get_my_college_id());

-- Requester manages own; runner can update rows they claimed (e.g. unclaim).
create policy "pickups: requester or runner update" on pickup_requests
  for update to authenticated
  using (requester_id = auth.uid() or runner_id = auth.uid());

create policy "pickups: requester delete" on pickup_requests
  for delete to authenticated using (requester_id = auth.uid());

-- Claiming an OPEN request is a race — do it atomically in a security definer
-- function so the update policy above doesn't need to allow strangers.
create or replace function claim_pickup(rid uuid, upi text default null)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  updated int;
begin
  update pickup_requests
  set runner_id = auth.uid(), runner_upi = upi, status = 'claimed'
  where id = rid
    and status = 'open'
    and college_id = get_my_college_id()
    and requester_id <> auth.uid();
  get diagnostics updated = row_count;
  return updated = 1;
end;
$$;
