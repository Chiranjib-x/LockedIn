-- GateRunner: fix the supply side.
--
-- DIAGNOSIS (live data, 2026-07-27): 38 pickup requests — 13 delivered, 2 open,
-- 23 cancelled. EVERY ONE of the 23 cancelled died with runner_id IS NULL: never
-- claimed by anyone. 13 of the 38 came from real @vitstudent accounts, so the
-- demand is genuine. Average reward ₹20.
--
-- The reward was never the bottleneck. Two things were:
--   1. Posting a request notified NOBODY — there was no trigger on
--      pickup_requests at all. A request went into the void and sat there until
--      it was cancelled. A runner had to already have the app open, at the
--      moment they happened to be walking to the gate, while a request happened
--      to be live. That triple coincidence never lands at this volume.
--   2. The one gate notification that existed ran the WRONG WAY:
--      announce_gate_run (0024) pings *requesters* that a runner is heading out
--      — something the requester can do nothing with, having already posted.
--
-- So: ping the people who can actually act (potential runners), and make the
-- karma reflect who actually did the work.
--
-- CORRECTION worth recording, because grepping the gate migrations for 'karma'
-- returns nothing and invites the wrong conclusion: a delivered pickup ALREADY
-- earned karma, two hops away. trg_pickup_to_transaction (0011) turns a
-- claimed→delivered pickup into a `transactions` row, and trg_karma_on_transaction
-- (0012) then awards +10 to BOTH parties. So runner and requester were paid the
-- same, even though only one of them walked to the gate.
--
-- The +10 below stacks on that, making a completed run worth 20 to the runner
-- and 10 to the requester. The asymmetry is the point: it is the errand, not the
-- asking, that the app is short of.
--
-- NOTED (not fixed here, pre-existing): pickup_to_transaction fires on any
-- claimed→delivered transition, so a status that bounced delivered→claimed→
-- delivered would insert a SECOND transaction and pay +10 again. Not reachable
-- from the UI today. The gate-run award below is explicitly guarded against it.

-- Standing opt-in. Default FALSE deliberately: an unsolicited push is how you
-- lose a campus. Opting in is the "become a runner" action.
alter table profiles add column if not exists gate_alerts boolean not null default false;

comment on column profiles.gate_alerts is
  'Standing opt-in: notify me when someone at my college posts a gate pickup. Default false — never opt a user in implicitly.';

-- Partial index: the notify fan-out only ever scans opted-in users per college.
create index if not exists profiles_gate_alerts_idx
  on profiles (college_id) where gate_alerts;

-- profiles has COLUMN-LEVEL update grants (0040/0041 locked it down so a user
-- cannot write karma/is_moderator/is_banned). A new column is therefore NOT
-- writable by default: without this grant the toggle fails with
-- "permission denied for table profiles" and the opt-in silently never saves.
-- gate_alerts is a self-preference like hostel_block/room, which are granted the
-- same way; the "profiles: own update" policy (USING id = auth.uid()) still
-- restricts it to the caller's own row.
grant update (gate_alerts) on profiles to authenticated;

-- SELECT is a SEPARATE column grant and is just as load-bearing: /gate reads
-- `.select("gate_alerts")` to render the toggle's current position, and the
-- UPDATE ... RETURNING above needs it too. Granting UPDATE alone still fails
-- with "permission denied for table profiles".
grant select (gate_alerts) on profiles to authenticated;

-- 1) A new OPEN request pings opted-in runners at the same college.
create or replace function notify_new_pickup()
returns trigger language plpgsql security definer set search_path = public as $$
declare notified int;
begin
  -- Only open requests recruit; a row created in any other state is not a job.
  if new.status <> 'open' then
    return new;
  end if;

  select count(*) into notified
  from (
    select p.id
    from profiles p
    where p.college_id = new.college_id     -- TENANCY: never cross-college
      and p.gate_alerts                      -- opted in only
      and not p.is_banned
      and p.id <> new.requester_id           -- don't ping the person asking
  ) t,
  lateral notify(
    t.id, new.college_id, 'gate',
    '🏃 ' || new.platform || ' pickup at ' || new.gate ||
      case when new.reward > 0 then ' · ₹' || round(new.reward)::text || ' reward' else '' end,
    '/gate'
  );

  return new;
end $$;

drop trigger if exists pickup_requests_notify_runners on pickup_requests;
create trigger pickup_requests_notify_runners
  after insert on pickup_requests
  for each row execute function notify_new_pickup();

-- 2) Karma for a completed run: +10, matching a completed transaction.
--
-- award_karma() is append-only, NOT idempotent, so the guard is ours: fire only
-- on the transition into 'delivered', and refuse if this pickup already has a
-- karma event. Without the second check a status that ever returned to
-- 'delivered' would pay twice.
create or replace function award_gate_run_karma()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- IS DISTINCT FROM, not coalesce(old.status,''): status is the pickup_status
  -- ENUM, and '' is not one of its values — coercing it raises
  -- "invalid input value for enum pickup_status". This is null-safe without
  -- inventing a literal the type does not have.
  if new.status = 'delivered'
     and old.status is distinct from 'delivered'
     and new.runner_id is not null
     and not exists (
       select 1 from karma_events
       where ref_type = 'gate_run' and ref_id = new.id
     )
  then
    perform award_karma(new.runner_id, new.college_id, 10,
                        'gate_run_delivered', 'gate_run', new.id);
  end if;
  return new;
end $$;

drop trigger if exists pickup_requests_award_karma on pickup_requests;
create trigger pickup_requests_award_karma
  after update on pickup_requests
  for each row execute function award_gate_run_karma();
