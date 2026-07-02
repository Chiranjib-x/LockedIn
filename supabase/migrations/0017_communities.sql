-- Communities: official clubs + interest groups (F1, football, Valorant…) in
-- one system. Anyone proposes; the founder (is_moderator) approves; the
-- proposer becomes first community moderator; moderators post updates/events
-- via the existing posts rails. Group chat lands with Phase 34.

create type community_category as enum ('club', 'sports', 'gaming', 'hobby', 'other');

create table communities (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  created_by uuid not null references profiles(id) on delete cascade,
  name text not null,
  emoji text not null default '🎯',
  category community_category not null default 'other',
  description text,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index communities_college_idx on communities (college_id, is_approved);

create table community_members (
  community_id uuid not null references communities(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

alter table communities enable row level security;
alter table community_members enable row level security;

-- App-level moderator (the founder) — reused for approvals.
create or replace function is_app_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_moderator from profiles where id = auth.uid()), false)
$$;

create or replace function is_community_moderator(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from community_members
                 where community_id = cid and user_id = auth.uid() and role = 'moderator')
$$;

-- Approved communities are college-visible; pending ones only to their
-- proposer and the founder.
create policy "communities: college read" on communities
  for select to authenticated
  using (
    college_id = get_my_college_id()
    and (is_approved or created_by = auth.uid() or is_app_moderator())
  );

create policy "communities: propose" on communities
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and college_id = get_my_college_id()
    and is_approved = false
    and not is_banned()
  );

create policy "communities: founder manages" on communities
  for update to authenticated using (is_app_moderator());

create policy "communities: founder or proposer delete" on communities
  for delete to authenticated
  using (is_app_moderator() or (created_by = auth.uid() and not is_approved));

create policy "community_members: college read" on community_members
  for select to authenticated
  using (exists (select 1 from communities c
                 where c.id = community_id and c.college_id = get_my_college_id()));

-- Open self-join (as member) once approved.
create policy "community_members: self join" on community_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and role = 'member'
    and exists (select 1 from communities c where c.id = community_id and c.is_approved)
  );

create policy "community_members: leave or founder remove" on community_members
  for delete to authenticated
  using (user_id = auth.uid() or is_app_moderator());

-- Role changes: founder or an existing community moderator promotes/demotes.
create or replace function set_community_role(cid uuid, uid uuid, newrole text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if newrole not in ('member', 'moderator') then raise exception 'bad role'; end if;
  if not (is_app_moderator() or is_community_moderator(cid)) then
    raise exception 'not allowed';
  end if;
  update community_members set role = newrole where community_id = cid and user_id = uid;
end;
$$;

-- On approval: proposer becomes moderator + gets notified.
create or replace function on_community_approved()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_approved and not old.is_approved then
    insert into community_members (community_id, user_id, role)
    values (new.id, new.created_by, 'moderator')
    on conflict (community_id, user_id) do update set role = 'moderator';
    perform notify(new.created_by, new.college_id, 'community',
      '🎉 “' || new.name || '” is approved — you’re its first moderator', '/communities/' || new.id);
  end if;
  return new;
end;
$$;
create trigger trg_community_approved
  after update on communities
  for each row execute function on_community_approved();

-- Community updates/events ride the posts rails; only moderators post as one.
alter table posts add column community_id uuid references communities(id);
create index posts_community_idx on posts (community_id) where community_id is not null;

drop policy "posts: insert own in my college" on posts;
create policy "posts: insert own in my college" on posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and college_id = get_my_college_id()
    and not is_banned()
    and (community_id is null or is_community_moderator(community_id))
  );
