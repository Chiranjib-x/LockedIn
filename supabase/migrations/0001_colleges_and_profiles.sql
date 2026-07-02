-- Phase 1: colleges (multi-tenant root), profiles, domain-restricted signup.
-- Run this in the Supabase SQL editor (or `supabase db push`).

create table colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email_domain text not null unique,
  created_at timestamptz not null default now()
);

alter table colleges enable row level security;

-- Anon needs to read colleges so the signup form can validate domains pre-auth.
-- Names + domains are not secrets.
create policy "colleges: readable by all" on colleges
  for select to anon, authenticated using (true);

insert into colleges (name, email_domain) values
  ('VIT Vellore', 'vitstudent.ac.in'),
  ('Demo College', 'gmail.com'); -- ponytail: dev-only seed so you can test with a gmail; delete before launch

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  college_id uuid not null references colleges(id),
  name text not null default '',
  batch text,
  hostel_block text,
  room text,
  avatar_url text,
  contact_pref text, -- e.g. WhatsApp number; revealed on request, never public by default
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- THE TENANCY RULE helper: every college-scoped RLS policy uses this.
-- security definer avoids RLS recursion when policies on profiles call it.
create or replace function get_my_college_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select college_id from profiles where id = auth.uid()
$$;

create policy "profiles: same-college read" on profiles
  for select to authenticated using (college_id = get_my_college_id());

create policy "profiles: own update" on profiles
  for update to authenticated using (id = auth.uid());

-- No insert policy: profiles are created only by the trigger below (security
-- definer bypasses RLS), which stamps college_id server-side from the email
-- domain. Unregistered domains are rejected at the database — the trust boundary.
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  cid uuid;
begin
  select id into cid from colleges
    where email_domain = lower(split_part(new.email, '@', 2));
  if cid is null then
    raise exception 'Signups are restricted to registered college email domains';
  end if;
  insert into profiles (id, college_id, name)
  values (new.id, cid, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
