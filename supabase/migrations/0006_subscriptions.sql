-- Phase 9: Subscription pooling. Run in Supabase SQL editor.

create type billing_cycle as enum ('monthly', 'yearly');

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  owner_id uuid not null references profiles(id) on delete cascade,
  service_name text not null,
  total_cost numeric(10, 2) not null,
  billing_cycle billing_cycle not null default 'monthly',
  renewal_date date not null,
  seats int not null default 4 check (seats > 0),
  upi_id text,
  created_at timestamptz not null default now()
);

create table subscription_members (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  share_amount numeric(10, 2) not null default 0,
  paid_status boolean not null default false,
  last_paid timestamptz,
  created_at timestamptz not null default now(),
  unique (subscription_id, user_id)
);

alter table subscriptions enable row level security;
alter table subscription_members enable row level security;

-- THE TENANCY RULE. Pool visibility: owner + its members (discovery board is
-- Phase 31 — pools are private until then).
create or replace function is_subscription_member(sub_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from subscription_members
    where subscription_id = sub_id and user_id = auth.uid()
  ) or exists (
    select 1 from subscriptions where id = sub_id and owner_id = auth.uid()
  )
$$;

create policy "subscriptions: owner or member read" on subscriptions
  for select to authenticated
  using (college_id = get_my_college_id() and is_subscription_member(id));

create policy "subscriptions: owner insert" on subscriptions
  for insert to authenticated
  with check (owner_id = auth.uid() and college_id = get_my_college_id());

create policy "subscriptions: owner update" on subscriptions
  for update to authenticated using (owner_id = auth.uid());

create policy "subscriptions: owner delete" on subscriptions
  for delete to authenticated using (owner_id = auth.uid());

create policy "subscription_members: pool read" on subscription_members
  for select to authenticated
  using (college_id = get_my_college_id() and is_subscription_member(subscription_id));

-- Owner adds members (same college).
create policy "subscription_members: owner insert" on subscription_members
  for insert to authenticated
  with check (
    college_id = get_my_college_id()
    and exists (select 1 from subscriptions s
                where s.id = subscription_id and s.owner_id = auth.uid())
    and exists (select 1 from profiles p
                where p.id = user_id and p.college_id = get_my_college_id())
  );

-- Owner manages rows (shares, paid status); members can update their own.
create policy "subscription_members: owner or self update" on subscription_members
  for update to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from subscriptions s
               where s.id = subscription_id and s.owner_id = auth.uid())
  );

-- Owner removes members; members can leave.
create policy "subscription_members: owner or self delete" on subscription_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from subscriptions s
               where s.id = subscription_id and s.owner_id = auth.uid())
  );
