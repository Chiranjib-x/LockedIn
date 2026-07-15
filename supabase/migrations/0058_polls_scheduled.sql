-- 0058 (Wave F / T6): member polls + scheduled announcements.

-- ── Polls ────────────────────────────────────────────────────────────────────
create table community_polls (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  college_id uuid not null references colleges(id),
  question text not null,
  options text[] not null,           -- ordered choice labels
  closes_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table poll_votes (
  poll_id uuid not null references community_polls(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  college_id uuid not null references colleges(id),
  choice int not null,               -- index into options[]
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)     -- one vote per member; changing re-upserts
);
alter table community_polls enable row level security;
alter table poll_votes enable row level security;

create policy "polls: member read" on community_polls
  for select to authenticated
  using (is_community_member(community_id) or is_app_moderator());
create policy "polls: lead insert" on community_polls
  for insert to authenticated
  with check (college_id = get_my_college_id() and (is_app_moderator() or is_community_moderator(community_id)));
create policy "polls: lead delete" on community_polls
  for delete to authenticated
  using (is_app_moderator() or is_community_moderator(community_id));

-- Members read all votes of polls in their community (results are public to
-- the group); each writes only their own row.
create policy "votes: member read" on poll_votes
  for select to authenticated
  using (exists (select 1 from community_polls p where p.id = poll_id and is_community_member(p.community_id)));
create policy "votes: self insert" on poll_votes
  for insert to authenticated
  with check (
    user_id = auth.uid() and college_id = get_my_college_id()
    and exists (select 1 from community_polls p where p.id = poll_id and is_community_member(p.community_id)
                and (p.closes_at is null or p.closes_at > now()))
  );
create policy "votes: self change" on poll_votes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "votes: self delete" on poll_votes
  for delete to authenticated using (user_id = auth.uid());

-- ── Scheduled announcements ──────────────────────────────────────────────────
-- A community post (0044 notify_community_post fires on insert) written now,
-- inserted later. Stored here until publish_time, then a cron flips it into
-- posts. college_id + author travel with it so the broadcast trigger behaves
-- exactly as an immediate post would.
create table scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  college_id uuid not null references colleges(id),
  author_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  publish_at timestamptz not null,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table scheduled_posts enable row level security;

create policy "scheduled: lead read" on scheduled_posts
  for select to authenticated
  using (is_app_moderator() or is_community_moderator(community_id));
create policy "scheduled: lead insert" on scheduled_posts
  for insert to authenticated
  with check (
    college_id = get_my_college_id() and author_id = auth.uid()
    and (is_app_moderator() or is_community_moderator(community_id))
  );
create policy "scheduled: lead delete" on scheduled_posts
  for delete to authenticated
  using (is_app_moderator() or is_community_moderator(community_id));

-- Cron target: publish anything due. security definer so the post insert
-- carries the original author/college and the 0044 broadcast trigger fires.
create or replace function publish_due_posts()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select * from scheduled_posts where not published and publish_at <= now() loop
    insert into posts (author_id, college_id, type, title, description, community_id)
    values (r.author_id, r.college_id, 'notice', r.title, r.body, r.community_id);
    update scheduled_posts set published = true where id = r.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Run every 5 minutes (pg_cron installed since the push phase).
select cron.schedule('publish-scheduled-posts', '*/5 * * * *', 'select publish_due_posts()');
