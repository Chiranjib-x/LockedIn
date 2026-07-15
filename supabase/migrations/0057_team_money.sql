-- 0057 (Wave F / T5): dues tracker + event fund split. Both are "who owes
-- what, who's paid" ledgers; payment itself is the existing UPI copy-pay
-- helper (LockedIn never touches money). A collection has a UPI VPA to pay to
-- and a set of per-member line items the leads mark paid.

create table community_collections (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  college_id uuid not null references colleges(id),
  title text not null,                       -- "Term dues" / "Fest fund"
  kind text not null default 'dues' check (kind in ('dues', 'fund')),
  amount numeric not null check (amount >= 0), -- per-member ask
  upi_id text,                                 -- collector's VPA (copy-pay)
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table collection_dues (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references community_collections(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  college_id uuid not null references colleges(id),
  amount numeric not null check (amount >= 0),
  paid boolean not null default false,
  paid_at timestamptz,
  unique (collection_id, user_id)
);
alter table community_collections enable row level security;
alter table collection_dues enable row level security;

-- Members see collections + their own/all dues for their community.
create policy "collections: member read" on community_collections
  for select to authenticated
  using (is_community_member(community_id) or is_app_moderator());
create policy "collections: lead insert" on community_collections
  for insert to authenticated
  with check (college_id = get_my_college_id() and (is_app_moderator() or is_community_moderator(community_id)));
create policy "collections: lead delete" on community_collections
  for delete to authenticated
  using (is_app_moderator() or is_community_moderator(community_id));

create policy "dues: member read" on collection_dues
  for select to authenticated
  using (exists (select 1 from community_collections c where c.id = collection_id and is_community_member(c.community_id)));
create policy "dues: lead insert" on collection_dues
  for insert to authenticated
  with check (
    college_id = get_my_college_id()
    and exists (select 1 from community_collections c where c.id = collection_id
                and (is_app_moderator() or is_community_moderator(c.community_id)))
  );
create policy "dues: lead update" on collection_dues
  for update to authenticated
  using (exists (select 1 from community_collections c where c.id = collection_id
                 and (is_app_moderator() or is_community_moderator(c.community_id))))
  with check (exists (select 1 from community_collections c where c.id = collection_id
                 and (is_app_moderator() or is_community_moderator(c.community_id))));
create policy "dues: lead delete" on collection_dues
  for delete to authenticated
  using (exists (select 1 from community_collections c where c.id = collection_id
                 and (is_app_moderator() or is_community_moderator(c.community_id))));

-- Create a collection and fan out a due row per current member in one call.
-- 'fund' splits the amount across members; 'dues' charges amount each.
create or replace function create_collection(cid uuid, p_title text, p_kind text, p_amount numeric, p_upi text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  coll_id uuid;
  mem_college uuid;
  member_count int;
  per_member numeric;
begin
  if not (is_app_moderator() or is_community_moderator(cid)) then
    raise exception 'not allowed';
  end if;
  if p_kind not in ('dues', 'fund') then raise exception 'bad kind'; end if;
  select college_id into mem_college from communities where id = cid;
  select count(*) into member_count from community_members where community_id = cid;
  if member_count = 0 then raise exception 'no members'; end if;
  per_member := case when p_kind = 'fund' then ceil(p_amount / member_count) else p_amount end;

  insert into community_collections (community_id, college_id, title, kind, amount, upi_id, created_by)
  values (cid, mem_college, p_title, p_kind, per_member, nullif(p_upi, ''), auth.uid())
  returning id into coll_id;

  insert into collection_dues (collection_id, user_id, college_id, amount)
  select coll_id, cm.user_id, mem_college, per_member
  from community_members cm where cm.community_id = cid;

  return coll_id;
end;
$$;
revoke all on function create_collection(uuid, text, text, numeric, text) from public, anon;
grant execute on function create_collection(uuid, text, text, numeric, text) to authenticated;
