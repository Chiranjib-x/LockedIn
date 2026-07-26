-- QUEUE A9 (Launch Gate #11): index review across the shared DB.
--
-- Five apps now hit one Postgres, so a missing index costs every app at once.
-- The audit found one consistent gap class: membership tables are indexed
-- (thing_id, user_id) — which serves "who is in this thing?" but CANNOT serve
-- "what things is this user in?", because user_id is not a leading column.
-- Those reverse lookups run on every page load (my communities, unread chat
-- count, my RSVPs), so they are the ones that degrade first as rows accumulate.
--
-- All additive: CREATE INDEX IF NOT EXISTS only. No column, policy, or query
-- behaviour changes, so nothing here can break a deployed build (version-skew
-- rule 7). Row counts are small today and Postgres will still correctly choose
-- a seq scan on a 12-row table — these exist for the shape of the data in a
-- year, not for this week.

-- "My communities" — LeaderStrip, home shelves, every membership check.
create index if not exists community_members_user_idx
  on community_members (user_id);

-- Unread chat badge: conversation_participants scanned by user on every page.
create index if not exists conversation_participants_user_idx
  on conversation_participants (user_id);

-- "My spaces" on home (Girls' Closet / Boys' Den cards).
create index if not exists space_members_user_idx
  on space_members (user_id);

-- "Events I RSVP'd to".
create index if not exists event_rsvps_user_idx
  on event_rsvps (user_id);

-- Push dispatch (0063) selects by user AND app; user_id alone was indexed.
create index if not exists push_subscriptions_user_app_idx
  on push_subscriptions (user_id, app);

-- Pool discovery: `is_discoverable = true and open_seats > 0`, college-scoped
-- by RLS. subscriptions had NO index but its primary key.
create index if not exists subscriptions_discover_idx
  on subscriptions (college_id, is_discoverable)
  where is_discoverable;

-- Marketplace browse filters on status; the existing index leads with
-- created_at, so status was not usable as a leading predicate.
create index if not exists listings_college_status_idx
  on listings (college_id, status);

-- Club/chapter/team shelves filter by category within a college.
create index if not exists communities_college_category_idx
  on communities (college_id, category);
