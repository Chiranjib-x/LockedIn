-- FINDINGS F30 (P1, /hunt B6 daily life): three money-pooling tables let the
-- PAYER themselves flip the "organizer/creator/owner confirmed I paid" flag,
-- via a direct table call bypassing the UI (the app only ever renders those
-- controls to the creator/organizer/owner) — same bug class as F6/0068
-- (offers) and the 0051 subscription_members.share_amount guard: an UPDATE
-- policy's USING clause without a WITH CHECK re-checks the NEW row against
-- the SAME "own row OR privileged party" condition, so the payer qualifies
-- as "own row" and can set the privileged-only column too. RLS WITH CHECK
-- cannot see the OLD row, so — per the 0068 precedent — this needs a trigger.
--
-- Probed live (rolled back) before this fix: a non-creator trip_member set
-- their own paid_confirmed=true; a non-organizer group_order_item did the
-- same; a non-owner subscription_member set their own paid_status=true.
-- All three succeeded (VULNERABLE) under the pre-existing RLS alone.
--
-- trip_members.paid_marked and group_order_items.paid_marked stay
-- self-settable — that field IS the payer's own "I've paid" self-report,
-- by design. Only the confirmation step (the other party's word) is guarded.

create or replace function guard_trip_paid_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.paid_confirmed is distinct from old.paid_confirmed then
    if not exists (
      select 1 from trips t where t.id = new.trip_id and t.creator_id = auth.uid()
    ) then
      raise exception 'only the trip creator can confirm payment';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trip_members_paid_confirm_guard on trip_members;
create trigger trip_members_paid_confirm_guard
  before update on trip_members
  for each row execute function guard_trip_paid_confirmed();

create or replace function guard_group_order_paid_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.paid_confirmed is distinct from old.paid_confirmed then
    if not exists (
      select 1 from group_orders o where o.id = new.order_id and o.organizer_id = auth.uid()
    ) then
      raise exception 'only the order organizer can confirm payment';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists group_order_items_paid_confirm_guard on group_order_items;
create trigger group_order_items_paid_confirm_guard
  before update on group_order_items
  for each row execute function guard_group_order_paid_confirmed();

-- subscription_members has one payment field, not a self-report/confirm pair
-- (the app never lets a member mark their own paid_status — only the owner's
-- "Mark paid" button does), so both paid_status and last_paid are owner-only.
create or replace function guard_subscription_paid_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.paid_status is distinct from old.paid_status
     or new.last_paid is distinct from old.last_paid then
    if not exists (
      select 1 from subscriptions s where s.id = new.subscription_id and s.owner_id = auth.uid()
    ) then
      raise exception 'only the pool owner can mark payment';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists subscription_members_paid_guard on subscription_members;
create trigger subscription_members_paid_guard
  before update on subscription_members
  for each row execute function guard_subscription_paid_status();
