-- 0050: account deletion (Play Store requirement — in-app + web deletion).
--
-- PROBLEM: deleting a user should erase them in one cascading delete from
-- auth.users (profiles already cascades from it), but 11 FKs that reference
-- profiles were created without ON DELETE actions, so the cascade would abort
-- whenever the departing user is referenced as a runner/buyer/scanner/etc.
-- Those columns are attribution, not ownership — the right behavior is to
-- keep the row and null the reference (a sold listing stays sold; the sale
-- just no longer names the departed buyer).
--
-- FIX: re-point each FK with ON DELETE SET NULL (dropping NOT NULL where the
-- schema had it), then expose delete_my_account() — SECURITY DEFINER, hard-
-- scoped to auth.uid(), the only way the API can touch auth.users.

alter table space_members drop constraint if exists space_members_added_by_fkey;
alter table space_members add constraint space_members_added_by_fkey
  foreign key (added_by) references profiles(id) on delete set null;

alter table crew_members drop constraint if exists crew_members_added_by_fkey;
alter table crew_members add constraint crew_members_added_by_fkey
  foreign key (added_by) references profiles(id) on delete set null;

alter table pickup_requests drop constraint if exists pickup_requests_runner_id_fkey;
alter table pickup_requests add constraint pickup_requests_runner_id_fkey
  foreign key (runner_id) references profiles(id) on delete set null;

alter table listings drop constraint if exists listings_sold_to_id_fkey;
alter table listings add constraint listings_sold_to_id_fkey
  foreign key (sold_to_id) references profiles(id) on delete set null;

alter table listings drop constraint if exists listings_lent_to_fkey;
alter table listings add constraint listings_lent_to_fkey
  foreign key (lent_to) references profiles(id) on delete set null;

alter table space_invites drop constraint if exists space_invites_redeemed_by_fkey;
alter table space_invites add constraint space_invites_redeemed_by_fkey
  foreign key (redeemed_by) references profiles(id) on delete set null;

alter table crew_notes drop constraint if exists crew_notes_resolved_by_fkey;
alter table crew_notes add constraint crew_notes_resolved_by_fkey
  foreign key (resolved_by) references profiles(id) on delete set null;

alter table showcase_items alter column created_by drop not null;
alter table showcase_items drop constraint if exists showcase_items_created_by_fkey;
alter table showcase_items add constraint showcase_items_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

alter table merchants alter column created_by drop not null;
alter table merchants drop constraint if exists merchants_created_by_fkey;
alter table merchants add constraint merchants_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

alter table event_checkins drop constraint if exists event_checkins_attendee_id_fkey;
alter table event_checkins add constraint event_checkins_attendee_id_fkey
  foreign key (attendee_id) references profiles(id) on delete set null;

alter table event_checkins alter column checked_in_by drop not null;
alter table event_checkins drop constraint if exists event_checkins_checked_in_by_fkey;
alter table event_checkins add constraint event_checkins_checked_in_by_fkey
  foreign key (checked_in_by) references profiles(id) on delete set null;

-- security definer: runs as the function owner, which may delete from
-- auth.users; hard-scoped to auth.uid() so a caller can only ever delete
-- themselves. GoTrue handles SQL-level deletion fine; the JWT keeps "working"
-- until expiry but every RLS check fails closed once the profile row is gone.
create or replace function delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;
