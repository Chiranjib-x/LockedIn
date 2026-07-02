-- Toolbox + Deals: founder-curated showcase content on one admin rail.
-- Toolbox = apps/sites/tools worth knowing about. Deals = local merchant
-- offers. Both are read-only to students; only is_app_moderator() (the
-- founder) can add/edit/deactivate. Deals stays unpaid — no sponsored slot
-- or impression tracking yet (that's Phase 40, once traffic justifies it).

create table showcase_items (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  created_by uuid not null references profiles(id),
  name text not null,
  url text not null,
  tagline text,
  category text not null default 'other',
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table merchants (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  created_by uuid not null references profiles(id),
  name text not null,
  category text not null default 'other',
  logo_url text,
  offer_text text not null,
  details text,
  link_or_contact text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index showcase_items_college_idx on showcase_items (college_id, is_active);
create index merchants_college_idx on merchants (college_id, is_active);

alter table showcase_items enable row level security;
alter table merchants enable row level security;

create policy "showcase_items: college read" on showcase_items
  for select to authenticated
  using (college_id = get_my_college_id() and (is_active or is_app_moderator()));

create policy "showcase_items: founder writes" on showcase_items
  for all to authenticated
  using (is_app_moderator())
  with check (is_app_moderator() and college_id = get_my_college_id());

create policy "merchants: college read" on merchants
  for select to authenticated
  using (college_id = get_my_college_id() and (is_active or is_app_moderator()));

create policy "merchants: founder writes" on merchants
  for all to authenticated
  using (is_app_moderator())
  with check (is_app_moderator() and college_id = get_my_college_id());

insert into storage.buckets (id, name, public)
values ('showcase-images', 'showcase-images', true)
on conflict (id) do nothing;

create policy "showcase-images: moderators upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'showcase-images' and is_app_moderator());

create policy "showcase-images: public read" on storage.objects
  for select to public using (bucket_id = 'showcase-images');

create policy "showcase-images: moderators delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'showcase-images' and is_app_moderator());
