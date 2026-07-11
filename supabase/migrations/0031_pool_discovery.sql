-- Phase 31: subscription pools become a discoverable marketplace.

alter table subscriptions add column is_discoverable boolean not null default false;
alter table subscriptions add column open_seats int not null default 0 check (open_seats >= 0);

-- Discoverable pools are browsable college-wide; private pools stay
-- owner+members only (0006 behavior).
-- owner_id checked directly (not via is_subscription_member) so that
-- INSERT ... RETURNING passes: the definer subquery can't see the row being
-- inserted in the same statement, a plain column comparison can.
drop policy "subscriptions: owner or member read" on subscriptions;
create policy "subscriptions: member or discoverable read" on subscriptions
  for select to authenticated
  using (
    college_id = get_my_college_id()
    and (owner_id = auth.uid() or is_discoverable or is_subscription_member(id))
  );

create table sub_join_requests (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  requester_id uuid not null references profiles(id) on delete cascade,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  unique (subscription_id, requester_id)
);

alter table sub_join_requests enable row level security;

create policy "sub_join_requests: requester insert" on sub_join_requests
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and college_id = get_my_college_id()
    and exists (
      select 1 from subscriptions s
      where s.id = subscription_id and s.college_id = get_my_college_id()
        and s.is_discoverable and s.open_seats > 0 and s.owner_id <> auth.uid()
    )
    and not exists (
      select 1 from subscription_members m
      where m.subscription_id = sub_join_requests.subscription_id and m.user_id = auth.uid()
    )
  );

create policy "sub_join_requests: requester or owner read" on sub_join_requests
  for select to authenticated
  using (
    requester_id = auth.uid()
    or exists (select 1 from subscriptions s
               where s.id = subscription_id and s.owner_id = auth.uid())
  );

create policy "sub_join_requests: owner decides" on sub_join_requests
  for update to authenticated
  using (exists (select 1 from subscriptions s
                 where s.id = subscription_id and s.owner_id = auth.uid()));

-- Seat freed -> nudge the owner to open it for discovery.
create or replace function nudge_on_member_leave()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  s record;
begin
  select id, owner_id, college_id, service_name into s
  from subscriptions where id = old.subscription_id;
  if s.id is not null and old.user_id <> s.owner_id then
    perform notify(s.owner_id, s.college_id, 'subscription',
      'A seat just freed up on ' || s.service_name || ' — open it for discovery?',
      '/subscriptions/' || s.id);
  end if;
  return old;
end;
$$;

create trigger trg_nudge_on_member_leave
  after delete on subscription_members
  for each row execute function nudge_on_member_leave();
