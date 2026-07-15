-- 0056 (Wave F / T4): team operations — task board, pinned resources,
-- inventory register. Member activity insights need no table (computed from
-- meeting_attendance + event_checkins the leads already read).
-- is_community_member() / is_community_moderator() come from earlier migrations.

-- ── Task board ───────────────────────────────────────────────────────────────
create table community_tasks (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  college_id uuid not null references colleges(id),
  title text not null,
  assignee_id uuid references profiles(id) on delete set null,
  due_date date,
  status text not null default 'open' check (status in ('open', 'done')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table community_tasks enable row level security;

-- Members see the board; leads create/delete; the assignee OR a lead can flip
-- status (so "mark done" works for the person doing the work).
create policy "tasks: member read" on community_tasks
  for select to authenticated
  using (is_community_member(community_id) or is_app_moderator());
create policy "tasks: lead insert" on community_tasks
  for insert to authenticated
  with check (college_id = get_my_college_id() and (is_app_moderator() or is_community_moderator(community_id)));
create policy "tasks: assignee or lead update" on community_tasks
  for update to authenticated
  using (assignee_id = auth.uid() or is_app_moderator() or is_community_moderator(community_id))
  with check (assignee_id = auth.uid() or is_app_moderator() or is_community_moderator(community_id));
create policy "tasks: lead delete" on community_tasks
  for delete to authenticated
  using (is_app_moderator() or is_community_moderator(community_id));

-- ── Pinned resources ─────────────────────────────────────────────────────────
create table community_resources (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  college_id uuid not null references colleges(id),
  label text not null,
  url text not null,
  added_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table community_resources enable row level security;

create policy "resources: member read" on community_resources
  for select to authenticated
  using (is_community_member(community_id) or is_app_moderator());
create policy "resources: lead insert" on community_resources
  for insert to authenticated
  with check (college_id = get_my_college_id() and (is_app_moderator() or is_community_moderator(community_id)));
create policy "resources: lead delete" on community_resources
  for delete to authenticated
  using (is_app_moderator() or is_community_moderator(community_id));

-- ── Inventory register ───────────────────────────────────────────────────────
create table community_inventory (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  college_id uuid not null references colleges(id),
  item text not null,
  holder_id uuid references profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
alter table community_inventory enable row level security;

create policy "inventory: member read" on community_inventory
  for select to authenticated
  using (is_community_member(community_id) or is_app_moderator());
create policy "inventory: lead insert" on community_inventory
  for insert to authenticated
  with check (college_id = get_my_college_id() and (is_app_moderator() or is_community_moderator(community_id)));
create policy "inventory: lead update" on community_inventory
  for update to authenticated
  using (is_app_moderator() or is_community_moderator(community_id))
  with check (is_app_moderator() or is_community_moderator(community_id));
create policy "inventory: lead delete" on community_inventory
  for delete to authenticated
  using (is_app_moderator() or is_community_moderator(community_id));
