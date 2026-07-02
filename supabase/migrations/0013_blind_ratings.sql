-- Adjustment to Phase 15: ratings are BLIND to the ratee. Honest feedback needs
-- the rater shielded from retaliation, so a ratee must not be able to read the
-- individual rows about themselves (comment or rater identity) — only their
-- aggregate. Enforced at the DB, not just the UI.

-- Ratee can no longer read rating rows about themselves. Third parties (and the
-- rater viewing their own given rating) still can — for social proof and the
-- "already rated?" check.
drop policy "ratings: same-college read" on ratings;
create policy "ratings: same-college read (not own received)" on ratings
  for select to authenticated
  using (college_id = get_my_college_id() and ratee_id <> auth.uid());

-- Aggregate summary bypasses that RLS (security definer) so a user still sees
-- their OWN average + count, and badges work uniformly regardless of viewer.
create or replace function rating_summary(uid uuid)
returns table(avg numeric, cnt int)
language sql stable security definer set search_path = public as $$
  select coalesce(round(avg(stars)::numeric, 1), 0), count(*)::int
  from ratings where ratee_id = uid
$$;
