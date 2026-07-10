-- Fix: runner "Can't make it" (unclaim) has been a silent no-op since 0007.
-- The pickup_requests UPDATE policy has no WITH CHECK, so Postgres re-checks
-- USING against the NEW row; unclaiming sets runner_id = null, the runner no
-- longer satisfies (requester_id = auth.uid() or runner_id = auth.uid()),
-- and the update matches 0 rows without erroring.
-- Same cure as claiming: do the transition in a security definer function
-- (pattern of claim_pickup / trip_seats_taken) instead of widening the policy.

create or replace function unclaim_pickup(rid uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  updated int;
begin
  update pickup_requests
  set runner_id = null, runner_upi = null, status = 'open',
      delivered_claimed_at = null, confirm_reminded_at = null
  where id = rid
    and status = 'claimed'
    and runner_id = auth.uid();
  get diagnostics updated = row_count;
  return updated = 1;
end;
$$;
