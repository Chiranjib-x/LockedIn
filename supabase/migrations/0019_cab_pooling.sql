-- Cab pooling: creator posts a trip (origin/destination/time/seats), others
-- join up to capacity, fare splits evenly (live-computed, not persisted —
-- stays correct as people join/leave) via the existing UPI helper.

create type trip_status as enum ('open', 'full', 'cancelled', 'completed');

create table trips (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  creator_id uuid not null references profiles(id) on delete cascade,
  origin text not null,
  destination text not null,
  depart_at timestamptz not null,
  seats int not null check (seats > 0),
  notes text,
  fare_total numeric(10, 2),
  upi_id text,
  status trip_status not null default 'open',
  created_at timestamptz not null default now()
);

create index trips_college_idx on trips (college_id, status, depart_at);

create table trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  paid_marked boolean not null default false,
  paid_confirmed boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

alter table trips enable row level security;
alter table trip_members enable row level security;

create policy "trips: same-college read" on trips
  for select to authenticated using (college_id = get_my_college_id());

create policy "trips: creator insert" on trips
  for insert to authenticated
  with check (creator_id = auth.uid() and college_id = get_my_college_id() and not is_banned());

create policy "trips: creator update" on trips
  for update to authenticated using (creator_id = auth.uid());

create policy "trips: creator delete" on trips
  for delete to authenticated using (creator_id = auth.uid());

create policy "trip_members: same-college read" on trip_members
  for select to authenticated
  using (exists (select 1 from trips t where t.id = trip_id and t.college_id = get_my_college_id()));

-- Seats taken, via security definer to dodge RLS self-recursion (a plain
-- subquery on trip_members inside its own INSERT policy triggers "infinite
-- recursion detected in policy" since Postgres re-evaluates trip_members'
-- policies for the inner query).
create or replace function trip_seats_taken(tid uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from trip_members where trip_id = tid
$$;

-- Capacity-enforced join: only into open trips with a free seat.
-- ponytail: two joins racing the last seat could both pass this check before
-- the trigger below flips status to 'full' — fine at campus scale, add
-- select-for-update locking if concurrent joins ever actually collide.
create policy "trip_members: join open trip with room" on trip_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not is_banned()
    and exists (
      select 1 from trips t
      where t.id = trip_id and t.status = 'open'
      and trip_seats_taken(t.id) < t.seats
    )
  );

-- Own row edits (pay marking) or the trip creator (confirm payment).
create policy "trip_members: own or creator update" on trip_members
  for update to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from trips t where t.id = trip_id and t.creator_id = auth.uid())
  );

create policy "trip_members: leave" on trip_members
  for delete to authenticated using (user_id = auth.uid());

-- Auto-flip to 'full' when the last seat fills, back to 'open' on a leave.
create or replace function sync_trip_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  tid uuid := coalesce(new.trip_id, old.trip_id);
  seat_count int;
  taken int;
begin
  select seats into seat_count from trips where id = tid and status in ('open', 'full');
  if seat_count is null then return coalesce(new, old); end if;
  select count(*) into taken from trip_members where trip_id = tid;
  if taken >= seat_count then
    update trips set status = 'full' where id = tid and status = 'open';
  else
    update trips set status = 'open' where id = tid and status = 'full';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger trg_trip_member_sync
  after insert or delete on trip_members
  for each row execute function sync_trip_status();
