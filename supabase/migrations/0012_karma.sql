-- Phase 16: karma & badge tiers. One trust number per user, earned by good
-- behavior, displayed wherever identity shows.
--
-- KARMA POINTS (config — keep in sync with modules/karma/tiers.ts):
--   +10  completed transaction (each party)
--   +5   receiving a 4–5 star rating
--   +15  a "found" post you authored is marked resolved
--   +3   organizing a group-buy that completes
-- BADGE TIERS: 0 New · 50 Active · 150 Trusted · 400 Campus Legend

alter table profiles add column karma int not null default 0;

create table karma_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  college_id uuid not null references colleges(id),
  points int not null,
  reason text not null,
  ref_type text,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create index karma_events_user_idx on karma_events (user_id, created_at desc);

alter table karma_events enable row level security;
-- Read your own log; only triggers (security definer) insert.
create policy "karma_events: own read" on karma_events
  for select to authenticated using (user_id = auth.uid());

create or replace function karma_tier(pts int)
returns text language sql immutable as $$
  select case
    when pts >= 400 then 'Campus Legend'
    when pts >= 150 then 'Trusted'
    when pts >= 50  then 'Active'
    else 'New' end
$$;

-- append-only helper
create or replace function award_karma(uid uuid, cid uuid, pts int, why text, rtype text, rid uuid)
returns void language sql security definer set search_path = public as $$
  insert into karma_events (user_id, college_id, points, reason, ref_type, ref_id)
  values (uid, cid, pts, why, rtype, rid)
$$;

-- Sync trigger: karma_events insert → bump profiles.karma, notify on tier-up.
create or replace function apply_karma_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  old_karma int;
  new_karma int;
begin
  select karma into old_karma from profiles where id = new.user_id;
  new_karma := old_karma + new.points;
  update profiles set karma = new_karma where id = new.user_id;
  if karma_tier(new_karma) <> karma_tier(old_karma) and new_karma > old_karma then
    perform notify(new.user_id, new.college_id, 'karma',
      '🏅 You reached ' || karma_tier(new_karma) || ' — ' || new_karma || ' karma', '/profile');
  end if;
  return new;
end;
$$;
create trigger trg_apply_karma_event
  after insert on karma_events
  for each row execute function apply_karma_event();

-- ── Award sources ───────────────────────────────────────────────────────────

-- +10 each party on a completed transaction
create or replace function karma_on_transaction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform award_karma(new.party_a, new.college_id, 10, 'completed_transaction', 'transaction', new.id);
  perform award_karma(new.party_b, new.college_id, 10, 'completed_transaction', 'transaction', new.id);
  return new;
end;
$$;
create trigger trg_karma_on_transaction
  after insert on transactions
  for each row execute function karma_on_transaction();

-- +5 for receiving a 4–5 star rating
create or replace function karma_on_rating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stars >= 4 then
    perform award_karma(new.ratee_id, new.college_id, 5, 'good_rating', 'rating', new.id);
  end if;
  return new;
end;
$$;
create trigger trg_karma_on_rating
  after insert on ratings
  for each row execute function karma_on_rating();

-- +15 when a "found" post is marked resolved (finder did a good deed)
create or replace function karma_on_found_resolved()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'resolved' and old.status = 'open' and new.type = 'found' then
    perform award_karma(new.author_id, new.college_id, 15, 'found_resolved', 'post', new.id);
  end if;
  return new;
end;
$$;
create trigger trg_karma_on_found_resolved
  after update on posts
  for each row execute function karma_on_found_resolved();

-- +3 for organizing a group-buy that completes
create or replace function karma_on_group_complete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    perform award_karma(new.organizer_id, new.college_id, 3, 'group_buy_organized', 'group_order', new.id);
  end if;
  return new;
end;
$$;
create trigger trg_karma_on_group_complete
  after update on group_orders
  for each row execute function karma_on_group_complete();
