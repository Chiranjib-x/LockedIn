-- Phase 27: global search.
-- Full-text (generated tsvector + GIN) over the three content tables;
-- trigram index for people-by-name. All queries run through the authed
-- client, so college scoping is inherited from RLS — the indexes just make
-- it fast. No courses index: Phase 23's courses table was deliberately
-- skipped (course codes are plain text on timetable entries only).

create extension if not exists pg_trgm;

alter table listings add column fts tsvector
  generated always as (to_tsvector('english', title || ' ' || coalesce(description, ''))) stored;
create index listings_fts_idx on listings using gin (fts);

alter table posts add column fts tsvector
  generated always as (to_tsvector('english', title || ' ' || coalesce(description, ''))) stored;
create index posts_fts_idx on posts using gin (fts);

alter table group_orders add column fts tsvector
  generated always as (to_tsvector('english', title || ' ' || coalesce(description, ''))) stored;
create index group_orders_fts_idx on group_orders using gin (fts);

create index profiles_name_trgm_idx on profiles using gin (name gin_trgm_ops);
