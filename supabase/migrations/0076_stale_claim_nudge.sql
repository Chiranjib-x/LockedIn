-- POLISH J4-1: a claimed-but-abandoned pickup was invisible to everyone.
--
-- escalate_stale_pickups() (0022) has two branches and BOTH begin
-- `delivered_claimed_at < now() - interval '...'`. When a runner claims a pickup
-- and then never taps "Dropped it off", delivered_claimed_at is NULL, so both
-- comparisons are NULL -> false and neither branch ever fires.
--
-- The result: the request sits status='claimed' forever. Nobody is reminded, no
-- moderator is told, and because it is no longer 'open' NO OTHER RUNNER CAN SEE
-- IT. The requester's parcel is stranded at the gate and the job has silently
-- left the pool. This is the gap that matters most for an app whose whole
-- problem is that too few people run.
--
-- Deliberately NOT auto-releasing the claim back to 'open': the runner may
-- physically hold the parcel and simply not have tapped. Releasing it would
-- invite a second runner to collect something already collected. So this nudges
-- the humans and lets the requester decide — they can already cancel.

alter table pickup_requests
  add column if not exists stale_claim_nudged_at timestamptz;

comment on column pickup_requests.stale_claim_nudged_at is
  'Set once when a claimed pickup passes its expected time with no drop-off, so the nudge is never repeated.';

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

  -- NEW: claimed, past its expected time, and never dropped off. Note this is
  -- the branch the two above cannot reach, because they filter on a
  -- delivered_claimed_at that is still NULL here.
  perform notify(r.runner_id, r.college_id, 'gate',
    'Did you grab the ' || r.platform || ' parcel? Tap “Dropped it off” — or hand it back so someone else can.',
    '/gate')
  from pickup_requests r
  where r.status = 'claimed'
    and r.delivered_claimed_at is null
    and r.runner_id is not null
    and r.expected_at < now() - interval '3 hours'
    and r.stale_claim_nudged_at is null;

  perform notify(r.requester_id, r.college_id, 'gate',
    'Your ' || r.platform || ' pickup was claimed but not collected yet. You can cancel it and repost.',
    '/gate')
  from pickup_requests r
  where r.status = 'claimed'
    and r.delivered_claimed_at is null
    and r.runner_id is not null
    and r.expected_at < now() - interval '3 hours'
    and r.stale_claim_nudged_at is null;

  update pickup_requests set stale_claim_nudged_at = now()
  where status = 'claimed'
    and delivered_claimed_at is null
    and runner_id is not null
    and expected_at < now() - interval '3 hours'
    and stale_claim_nudged_at is null;
end;
$$;
