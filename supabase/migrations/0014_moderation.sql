-- Phase 17: report, block & moderation. Also adds is_moderator (Clubs/Deals
-- reuse it) and is_banned, plus soft-delete on content.

alter table profiles add column is_moderator boolean not null default false;
alter table profiles add column is_banned boolean not null default false;

-- Soft-delete flags — content renders as "removed" everywhere instead of vanishing.
alter table listings add column removed boolean not null default false;
alter table posts add column removed boolean not null default false;
alter table group_orders add column removed boolean not null default false;

create type report_target as enum ('user', 'listing', 'post', 'group_order', 'subscription');
create type report_status as enum ('open', 'dismissed', 'actioned');

create table reports (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_type report_target not null,
  target_id uuid not null,
  reason text not null,
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);

create index reports_status_idx on reports (college_id, status, created_at desc);

alter table reports enable row level security;

-- Reporter sees own reports; moderators see their college's queue.
create policy "reports: reporter or moderator read" on reports
  for select to authenticated
  using (
    reporter_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator and p.college_id = reports.college_id)
  );

create policy "reports: any student files" on reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and college_id = get_my_college_id());

create policy "reports: moderator updates" on reports
  for update to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator and p.college_id = reports.college_id));

create table blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table blocks enable row level security;
create policy "blocks: own read" on blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy "blocks: own insert" on blocks
  for insert to authenticated with check (blocker_id = auth.uid());
create policy "blocks: own delete" on blocks
  for delete to authenticated using (blocker_id = auth.uid());

-- ── Server-side enforcement (banned users can't create; content stays hidden) ──

-- Banned check reused by insert policies. security definer to read the flag.
create or replace function is_banned()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_banned from profiles where id = auth.uid()), false)
$$;

-- Fold "not banned" + "not removed" into content read/write. Rebuild the
-- listings/posts/group_orders policies to respect both.
drop policy "listings: same-college read" on listings;
create policy "listings: same-college read" on listings
  for select to authenticated
  using (
    college_id = get_my_college_id()
    and not removed
    and (space_id is null or is_space_member(space_id))
  );

drop policy "listings: insert own in my college" on listings;
create policy "listings: insert own in my college" on listings
  for insert to authenticated
  with check (
    seller_id = auth.uid() and college_id = get_my_college_id() and not is_banned()
    and (space_id is null or is_space_member(space_id))
  );

drop policy "posts: same-college read" on posts;
create policy "posts: same-college read" on posts
  for select to authenticated
  using (college_id = get_my_college_id() and not removed);

drop policy "posts: insert own in my college" on posts;
create policy "posts: insert own in my college" on posts
  for insert to authenticated
  with check (author_id = auth.uid() and college_id = get_my_college_id() and not is_banned());

drop policy "group_orders: same-college read" on group_orders;
create policy "group_orders: same-college read" on group_orders
  for select to authenticated
  using (college_id = get_my_college_id() and not removed);

drop policy "group_orders: organizer insert" on group_orders;
create policy "group_orders: organizer insert" on group_orders
  for insert to authenticated
  with check (organizer_id = auth.uid() and college_id = get_my_college_id() and not is_banned());

-- Moderator actions: soft-delete content, ban users. security definer so a
-- moderator can update rows they don't own, scoped to their college.
create or replace function mod_remove_content(ttype text, tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare mod_college uuid;
begin
  select college_id into mod_college from profiles where id = auth.uid() and is_moderator;
  if mod_college is null then raise exception 'not a moderator'; end if;
  if ttype = 'listing' then update listings set removed = true where id = tid and college_id = mod_college;
  elsif ttype = 'post' then update posts set removed = true where id = tid and college_id = mod_college;
  elsif ttype = 'group_order' then update group_orders set removed = true where id = tid and college_id = mod_college;
  end if;
end;
$$;

create or replace function mod_ban_user(uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare mod_college uuid;
begin
  select college_id into mod_college from profiles where id = auth.uid() and is_moderator;
  if mod_college is null then raise exception 'not a moderator'; end if;
  update profiles set is_banned = true where id = uid and college_id = mod_college;
end;
$$;
