-- Phase 33: make-an-offer on listings.
-- One ACTIVE offer per buyer per listing (partial unique below); visible
-- only to buyer and seller. Deviation from the plan brief: offers render in
-- a panel on the listing page (plus plain-text lines dropped into the DM)
-- rather than as special chat message cards — same negotiation loop, no
-- chat-renderer surgery.

create table offers (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_id uuid not null references profiles(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  counter_amount numeric(10, 2),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'countered')),
  created_at timestamptz not null default now()
);

create unique index offers_one_active_idx on offers (listing_id, buyer_id)
  where status in ('pending', 'countered');

alter table offers enable row level security;

create policy "offers: buyer or seller read" on offers
  for select to authenticated
  using (
    buyer_id = auth.uid()
    or exists (select 1 from listings l where l.id = listing_id and l.seller_id = auth.uid())
  );

create policy "offers: buyer insert" on offers
  for insert to authenticated
  with check (
    buyer_id = auth.uid()
    and college_id = get_my_college_id()
    and exists (
      select 1 from listings l
      where l.id = listing_id and l.status = 'available'
        and l.seller_id <> auth.uid() and l.college_id = get_my_college_id()
    )
  );

-- Seller decides; buyer may also update (withdraw-by-decline / respond to counter).
create policy "offers: parties update" on offers
  for update to authenticated
  using (
    buyer_id = auth.uid()
    or exists (select 1 from listings l where l.id = listing_id and l.seller_id = auth.uid())
  );
