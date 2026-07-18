-- 0061: box management for teams — named boxes, each holding a list of items
-- with quantities leads bump up/down as things go in and out. Separate from
-- the flat community_inventory (0056). Same access model: members read, leads
-- write. is_community_member/is_community_moderator come from earlier migrations.

create table community_boxes (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  college_id uuid not null references colleges(id),
  name text not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table community_box_items (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references community_boxes(id) on delete cascade,
  community_id uuid not null references communities(id) on delete cascade, -- denormalized for RLS
  college_id uuid not null references colleges(id),
  name text not null,
  quantity int not null default 1 check (quantity >= 0),
  created_at timestamptz not null default now()
);
alter table community_boxes enable row level security;
alter table community_box_items enable row level security;

-- ── Boxes ────────────────────────────────────────────────────────────────────
create policy "boxes: member read" on community_boxes
  for select to authenticated
  using (is_community_member(community_id) or is_app_moderator());
create policy "boxes: lead insert" on community_boxes
  for insert to authenticated
  with check (college_id = get_my_college_id() and (is_app_moderator() or is_community_moderator(community_id)));
create policy "boxes: lead update" on community_boxes
  for update to authenticated
  using (is_app_moderator() or is_community_moderator(community_id))
  with check (is_app_moderator() or is_community_moderator(community_id));
create policy "boxes: lead delete" on community_boxes
  for delete to authenticated
  using (is_app_moderator() or is_community_moderator(community_id));

-- ── Box items ────────────────────────────────────────────────────────────────
create policy "box_items: member read" on community_box_items
  for select to authenticated
  using (is_community_member(community_id) or is_app_moderator());
create policy "box_items: lead insert" on community_box_items
  for insert to authenticated
  with check (college_id = get_my_college_id() and (is_app_moderator() or is_community_moderator(community_id)));
create policy "box_items: lead update" on community_box_items
  for update to authenticated
  using (is_app_moderator() or is_community_moderator(community_id))
  with check (is_app_moderator() or is_community_moderator(community_id));
create policy "box_items: lead delete" on community_box_items
  for delete to authenticated
  using (is_app_moderator() or is_community_moderator(community_id));
