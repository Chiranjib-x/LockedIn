-- Phase 7+8: Group-Buy — pooled orders, joining, UPI payment tracking.
-- Run in Supabase SQL editor.

create type group_order_status as enum ('open', 'closed', 'collecting', 'completed');

create table group_orders (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  organizer_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  category text not null,
  deadline timestamptz not null,
  unit_price numeric(10, 2),
  upi_id text, -- organizer's UPI for collection (Phase 8)
  status group_order_status not null default 'open',
  created_at timestamptz not null default now()
);

create index group_orders_college_idx on group_orders (college_id, status, deadline);

create table group_order_items (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  order_id uuid not null references group_orders(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  note text,
  amount_owed numeric(10, 2) not null default 0,
  paid_marked boolean not null default false,   -- participant says "I've paid"
  paid_confirmed boolean not null default false, -- organizer confirms
  created_at timestamptz not null default now(),
  unique (order_id, user_id)
);

alter table group_orders enable row level security;
alter table group_order_items enable row level security;

-- THE TENANCY RULE on both tables.
create policy "group_orders: same-college read" on group_orders
  for select to authenticated using (college_id = get_my_college_id());

create policy "group_orders: organizer insert" on group_orders
  for insert to authenticated
  with check (organizer_id = auth.uid() and college_id = get_my_college_id());

create policy "group_orders: organizer update" on group_orders
  for update to authenticated using (organizer_id = auth.uid());

create policy "group_orders: organizer delete" on group_orders
  for delete to authenticated using (organizer_id = auth.uid());

create policy "group_order_items: same-college read" on group_order_items
  for select to authenticated using (college_id = get_my_college_id());

create policy "group_order_items: join open orders" on group_order_items
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and college_id = get_my_college_id()
    and exists (select 1 from group_orders o
                where o.id = order_id and o.status = 'open')
  );

-- Participant edits own entry; organizer can update rows (to confirm payment).
create policy "group_order_items: own or organizer update" on group_order_items
  for update to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from group_orders o
               where o.id = order_id and o.organizer_id = auth.uid())
  );

create policy "group_order_items: leave" on group_order_items
  for delete to authenticated using (user_id = auth.uid());
