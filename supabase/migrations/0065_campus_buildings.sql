-- Phase 5 (VIT Compass): per-college campus map for freshers.
-- TENANCY: college_id FK + writes scoped to get_my_college_id(); reads are
-- INTENTIONALLY PUBLIC (a fresher exploring VIT before they have their college
-- email must still see the map). Buildings are not sensitive data. Writes are
-- moderator-only, via the definer RPCs below (no direct write policy exists).

create table if not exists campus_buildings (
  id            uuid primary key default gen_random_uuid(),
  college_id    uuid not null references colleges(id) on delete cascade,
  name          text not null,
  aka           text,
  category      text not null check (category in ('academic','hostel','mess','sports','admin','landmark')),
  description   text,
  lat           double precision,
  lng           double precision,
  near_landmark text,
  photos        text[] not null default '{}',
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  unique (college_id, name)
);

alter table campus_buildings enable row level security;

-- Public read: anon freshers included. No write policy → writes only via RPCs.
create policy campus_buildings_public_read on campus_buildings
  for select to anon, authenticated using (true);

create index if not exists campus_buildings_college_category_idx
  on campus_buildings (college_id, category);

-- Moderator upsert. p_id null = insert; else update (own college only).
create or replace function save_campus_building(
  p_id uuid, p_name text, p_aka text, p_category text, p_description text,
  p_lat double precision, p_lng double precision, p_near text, p_photos text[]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid; bid uuid;
begin
  -- one query both authorizes (moderator) and yields their college.
  select college_id into cid from profiles where id = auth.uid() and is_moderator;
  if cid is null then
    raise exception 'Only a college moderator can edit the campus map.';
  end if;
  if p_category not in ('academic','hostel','mess','sports','admin','landmark') then
    raise exception 'Unknown category: %', p_category;
  end if;

  if p_id is null then
    insert into campus_buildings (college_id, name, aka, category, description, lat, lng, near_landmark, photos)
      values (cid, p_name, p_aka, p_category, p_description, p_lat, p_lng, p_near, coalesce(p_photos, '{}'))
      returning id into bid;
  else
    update campus_buildings set
      name = p_name, aka = p_aka, category = p_category, description = p_description,
      lat = p_lat, lng = p_lng, near_landmark = p_near, photos = coalesce(p_photos, '{}')
    where id = p_id and college_id = cid
    returning id into bid;
    if bid is null then
      raise exception 'Building not found in your college.';
    end if;
  end if;
  return bid;
end $$;

create or replace function delete_campus_building(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select college_id into cid from profiles where id = auth.uid() and is_moderator;
  if cid is null then
    raise exception 'Only a college moderator can edit the campus map.';
  end if;
  delete from campus_buildings where id = p_id and college_id = cid;
end $$;

grant execute on function save_campus_building(uuid,text,text,text,text,double precision,double precision,text,text[]) to authenticated;
grant execute on function delete_campus_building(uuid) to authenticated;
