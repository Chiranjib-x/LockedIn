-- Close a privacy leak in the public share preview, and give clubs one.
--
-- THE LEAK: public_listing_preview (0021, Phase 22) is SECURITY DEFINER, so it
-- bypasses RLS by design — that is how a logged-out visitor sees a share card.
-- It was written before spaces existed (0070), and listings.space_id was added
-- underneath it. A members-only Girls' Closet listing was therefore readable by
-- anyone holding the URL, without logging in. Confirmed live as `role anon`
-- before this migration: 2 of 2 space listings returned full rows.
--
-- The app made that reachable rather than theoretical: the listing page renders
-- ShareButton unconditionally, so a member sharing her own space listing got a
-- public link to it. That render is gated in the same commit.
--
-- Rule going forward: any SECURITY DEFINER function that reads a table must be
-- revisited when that table gains a visibility column. Grep for definer
-- functions over `listings` before adding the next one.

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
  where l.id = lid
    and not l.removed
    and l.space_id is null   -- members-only content is never publicly previewable
$$;

-- Clubs get the preview they never had.
--
-- LAUNCH.md puts the whole distribution plan on ~15 club secretaries announcing
-- to their own members. Until now a club page was auth-gated with no public
-- path, so a secretary could not post their club's page anywhere a non-user
-- could open — the one link the plan depends on was the one link that died.
--
-- Whitelisted fields only, mirroring 0021: no member list, no founder identity,
-- no posts. Approved clubs only — a pending proposal is not yet a public fact.
create or replace function public_club_preview(cid uuid)
returns table (
  id uuid, name text, emoji text, description text,
  category text, logo_url text, is_official boolean,
  recruiting boolean, member_count bigint, college_name text
)
language sql stable security definer set search_path = public
as $$
  select x.id, x.name, x.emoji, x.description,
         x.category::text, x.logo_url, x.is_official, x.recruiting,
         (select count(*) from community_members m where m.community_id = x.id),
         g.name
  from communities x
  join colleges g on g.id = x.college_id
  where x.id = cid
    and x.is_approved
    and x.deletion_requested_at is null
$$;

grant execute on function public_club_preview(uuid) to anon, authenticated;
