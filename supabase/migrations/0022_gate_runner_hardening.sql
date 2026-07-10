-- Gate Runner hardening (roadmap step 5).
-- Problem: runner delivers, requester never taps "Received it" -> reward stuck
-- forever and runners stop trusting the module. Fix: a runner-side "dropped
-- off" signal, a timed nudge chain (requester reminder at 4h, moderator
-- escalation at 24h), and a cap on concurrent claims so one runner can't
-- hoard the board.

alter table pickup_requests add column delivered_claimed_at timestamptz;
alter table pickup_requests add column confirm_reminded_at timestamptz;
alter table pickup_requests add column escalated_at timestamptz;

-- ── Claim cap ────────────────────────────────────────────────────────────────
-- Contract change: returns text (null = success, else a user-facing reason).
-- Already security definer, so counting the runner's own claims here cannot
-- recurse through RLS (same pattern as trip_seats_taken()).
drop function if exists claim_pickup(uuid, text);
create or replace function claim_pickup(rid uuid, upi text default null)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  updated int;
begin
  -- ponytail: cap of 3 concurrent claims is a constant; make it per-college
  -- config only if a college actually asks.
  if (select count(*) from pickup_requests
      where runner_id = auth.uid() and status = 'claimed') >= 3 then
    return 'You already have 3 active pickups — drop those off first.';
  end if;

  update pickup_requests
  set runner_id = auth.uid(), runner_upi = upi, status = 'claimed'
  where id = rid
    and status = 'open'
    and college_id = get_my_college_id()
    and requester_id <> auth.uid();
  get diagnostics updated = row_count;
  if updated = 1 then
    return null;
  end if;
  return 'Someone else claimed it first.';
end;
$$;

-- ── Lifecycle notifications (reuses notify() from 0010) ─────────────────────
create or replace function notify_pickup_events()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  runner_name text;
begin
  -- claimed: tell the requester someone is on it
  if old.status = 'open' and new.status = 'claimed' then
    select name into runner_name from profiles where id = new.runner_id;
    perform notify(new.requester_id, new.college_id, 'gate',
      coalesce(runner_name, 'Someone') || ' is grabbing your ' || new.platform || ' parcel 🏃',
      '/gate');
  end if;

  -- runner says dropped off: nudge the requester to confirm
  if old.delivered_claimed_at is null and new.delivered_claimed_at is not null then
    perform notify(new.requester_id, new.college_id, 'gate',
      'Your ' || new.platform || ' parcel was dropped off — tap to confirm receipt',
      '/gate');
  end if;

  -- requester confirmed: tell the runner (reward pending if any)
  if old.status = 'claimed' and new.status = 'delivered' and new.runner_id is not null then
    perform notify(new.runner_id, new.college_id, 'gate',
      case when new.reward > 0
        then 'Delivery confirmed — ₹' || trim(to_char(new.reward, '999999')) || ' reward incoming 🎉'
        else 'Delivery confirmed — thanks for running it 🎉' end,
      '/gate');
  end if;

  return new;
end;
$$;

create trigger trg_notify_pickup_events
  after update on pickup_requests
  for each row execute function notify_pickup_events();

-- ── Timed escalation (pg_cron, hourly) ───────────────────────────────────────
-- 4h after drop-off with no confirmation: remind the requester once.
-- 24h: notify the college's moderators once. Wrapped in a DO block so the
-- core schema above still lands if pg_cron is unavailable on this instance —
-- in that case schedule it manually per the notice.
create or replace function escalate_stale_pickups()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  -- reminder at 4h
  perform notify(r.requester_id, r.college_id, 'gate',
    'Still waiting on you: confirm your ' || r.platform || ' pickup so the runner gets closure',
    '/gate')
  from pickup_requests r
  where r.status = 'claimed'
    and r.delivered_claimed_at < now() - interval '4 hours'
    and r.confirm_reminded_at is null;
  update pickup_requests set confirm_reminded_at = now()
  where status = 'claimed'
    and delivered_claimed_at < now() - interval '4 hours'
    and confirm_reminded_at is null;

  -- moderator escalation at 24h
  perform notify(m.id, r.college_id, 'gate',
    'Unconfirmed gate pickup for 24h+: ' || r.platform || ' · ' || r.item_desc,
    '/gate')
  from pickup_requests r
  join profiles m on m.college_id = r.college_id and m.is_moderator
  where r.status = 'claimed'
    and r.delivered_claimed_at < now() - interval '24 hours'
    and r.escalated_at is null;
  update pickup_requests set escalated_at = now()
  where status = 'claimed'
    and delivered_claimed_at < now() - interval '24 hours'
    and escalated_at is null;
end;
$$;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('gate-runner-escalation', '30 * * * *', 'select escalate_stale_pickups()');
exception when others then
  raise notice 'pg_cron unavailable (%): schedule escalate_stale_pickups() hourly by other means', sqlerrm;
end;
$$;
