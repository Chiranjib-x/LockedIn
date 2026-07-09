-- Phase 22: public share-preview RPCs.
-- The public preview pages (/p/listing/[id], /p/post/[id]) serve
-- unauthenticated visitors, so they cannot read RLS-guarded tables. RLS stays
-- intact: these security definer functions expose ONLY the whitelisted fields
-- below — no seller/author identity, no contact info, no description body.
-- UUIDs are unguessable, so a preview link leaks exactly what its card shows.
-- Soft-deleted (removed) content is excluded — moderation wins over sharing.

create or replace function public_listing_preview(lid uuid)
returns table (
  id uuid, title text, price numeric, category text,
  image text, status text, college_name text
)
language sql stable security definer set search_path = public
as $$
  select l.id, l.title, l.price, l.category,
         (l.images)[1], l.status::text, c.name
  from listings l
  join colleges c on c.id = l.college_id
  where l.id = lid and not l.removed
$$;

create or replace function public_post_preview(pid uuid)
returns table (
  id uuid, title text, type text, location text,
  image text, status text, event_date timestamptz, college_name text
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.title, p.type::text, p.location,
         (p.images)[1], p.status::text, p.event_date, c.name
  from posts p
  join colleges c on c.id = p.college_id
  where p.id = pid and not p.removed
$$;
