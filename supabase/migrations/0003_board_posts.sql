-- Phase 5: Lost & Found + Notices — posts table + image bucket.
-- Run in Supabase SQL editor.

create type post_type as enum ('lost', 'found', 'notice', 'event');
create type post_status as enum ('open', 'resolved');

create table posts (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  author_id uuid not null references profiles(id) on delete cascade,
  type post_type not null,
  title text not null,
  description text,
  images text[] not null default '{}',
  location text,
  event_date timestamptz,
  status post_status not null default 'open',
  created_at timestamptz not null default now()
);

create index posts_college_created_idx on posts (college_id, created_at desc);
create index posts_college_type_idx on posts (college_id, type);

alter table posts enable row level security;

-- THE TENANCY RULE
create policy "posts: same-college read" on posts
  for select to authenticated using (college_id = get_my_college_id());

-- TODO: gate type in ('notice','event') to an is_moderator/role flag on
-- profiles once Phase 17 adds it. Open to all for MVP.
create policy "posts: insert own in my college" on posts
  for insert to authenticated
  with check (author_id = auth.uid() and college_id = get_my_college_id());

create policy "posts: author update" on posts
  for update to authenticated using (author_id = auth.uid());

create policy "posts: author delete" on posts
  for delete to authenticated using (author_id = auth.uid());

-- Image bucket, same policy shape as listing-images.
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy "post-images: authed upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post-images: public read" on storage.objects
  for select to public using (bucket_id = 'post-images');

create policy "post-images: owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
