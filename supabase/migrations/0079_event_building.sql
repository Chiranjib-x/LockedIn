-- QUEUE A34: let an event point at a place on the campus map.
--
-- The deterministic half of the decision recorded for POLISH A11: fuzzy-matching
-- a free-text venue ("SJT Auditorium") onto a building was rejected because a
-- confidently-wrong pin is worse than no pin — the same reasoning that makes
-- coords_verified default false. The organiser knows the venue, so they pick it.
--
-- VIT Compass already honours /?b=<building id> (it flies to the pin and opens
-- its sheet), and global search already resolves buildings (POLISH J2-1). This
-- is the last link in that chain: docs/LAUNCH.md G-2w/G0 has clubs pushing
-- Gravitas event pages to their members, and "where is this actually happening"
-- is the first question every attendee asks.
--
-- Additive and nullable on purpose: `location` stays the source of truth for
-- off-campus venues and room-level detail ("Room 214, K Block"), which a
-- building id cannot express. A building is an optional pin, not a replacement.

alter table posts
  add column if not exists building_id uuid references campus_buildings(id) on delete set null;

comment on column posts.building_id is
  'Optional campus building this event happens in, chosen by the organiser — never inferred from the free-text location. Deep-links to VIT Compass /?b=<id>.';

-- Only events ever carry one, and only a handful per college, so the index is
-- partial: it stays tiny and still serves "which events are in this building".
create index if not exists posts_building_idx
  on posts (building_id) where building_id is not null;
