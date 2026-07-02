-- Phase 3: Marketplace listings + image storage. Run in Supabase SQL editor.

create type listing_status as enum ('available', 'sold');

create table listings (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  seller_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric(10, 2) not null default 0,
  category text not null,
  condition text,
  images text[] not null default '{}',
  status listing_status not null default 'available',
  created_at timestamptz not null default now()
);

create index listings_college_created_idx on listings (college_id, created_at desc);

alter table listings enable row level security;

-- THE TENANCY RULE: college-scoped reads, seller-only writes, college stamped
-- server-side via the insert policy's WITH CHECK (client cannot forge it).
create policy "listings: same-college read" on listings
  for select to authenticated using (college_id = get_my_college_id());

create policy "listings: insert own in my college" on listings
  for insert to authenticated
  with check (seller_id = auth.uid() and college_id = get_my_college_id());

create policy "listings: seller update" on listings
  for update to authenticated using (seller_id = auth.uid());

create policy "listings: seller delete" on listings
  for delete to authenticated using (seller_id = auth.uid());

-- Storage bucket for listing images (public-read; writes gated by policy).
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- Any authenticated student may upload; only into their own {uid}/... folder.
create policy "listing-images: authed upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing-images: public read" on storage.objects
  for select to public using (bucket_id = 'listing-images');

create policy "listing-images: owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
