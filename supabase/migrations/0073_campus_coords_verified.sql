-- U7: 17 of VIT's 24 building coordinates are estimates, and typing lat/lng into
-- a text field is the wrong interface for "put this pin where the building
-- actually is". This is the DB half of a drag-to-position admin.
--
-- TENANCY: campus_buildings already carries college_id; every function here
-- re-derives the caller's college from profiles and scopes the update to it, so
-- a moderator can never move another college's pin.

alter table campus_buildings
  add column if not exists coords_verified boolean not null default false;

comment on column campus_buildings.coords_verified is
  'True once a human placed this pin on the map (dragged or click-to-placed). '
  'False means seeded/estimated — this is what the admin map lists as "needs checking".';

-- Coordinates-only writer.
--
-- Why not reuse save_campus_building(): it takes every column, so moving a pin
-- through it is a read-modify-write. Its caller passes p_photos => null, and the
-- RPC coalesces that to '{}' — so a drag would silently wipe a building's photos,
-- plus any field the client had not loaded. This touches lat/lng only.
create or replace function set_campus_building_coords(
  p_id uuid, p_lat double precision, p_lng double precision
) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  -- one query both authorizes (moderator) and yields their college.
  select college_id into cid from profiles where id = auth.uid() and is_moderator;
  if cid is null then
    raise exception 'Only a college moderator can edit the campus map.';
  end if;

  -- Explicit null check: 0,0 is a valid-looking coordinate in the Gulf of Guinea,
  -- so never let a missing value fall through as zero.
  if p_lat is null or p_lng is null then
    raise exception 'Both latitude and longitude are required.';
  end if;
  if p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'Coordinates out of range: %, %', p_lat, p_lng;
  end if;

  update campus_buildings
     set lat = p_lat, lng = p_lng, coords_verified = true
   where id = p_id and college_id = cid;

  if not found then
    raise exception 'Building not found in your college.';
  end if;
end $$;

grant execute on function set_campus_building_coords(uuid, double precision, double precision) to authenticated;
