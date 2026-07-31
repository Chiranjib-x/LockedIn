-- "Since you were last here" — the retention primitive.
--
-- 9 of 143 students have ever opened the app on a day after they signed up.
-- Nothing on /home changes between visits unless another person acts, so a
-- second open has no payoff and there is no reason to make one. This column is
-- what lets the app say "3 things happened while you were away" truthfully.
--
-- Deliberately NOT auth.users.last_sign_in_at: that only moves on a fresh
-- sign-in, so a student with a live session who returns daily never bumps it.
-- It is also read-only to us. This is a column we control, written on each visit.
--
-- The value stored is the PREVIOUS visit, not this one. /home has to answer
-- "what changed since I was last here", and if the write happened first the
-- answer would always be "nothing" — the classic off-by-one that makes this kind
-- of feature silently render empty forever.

alter table profiles
  add column if not exists last_seen_at timestamptz;

comment on column profiles.last_seen_at is
  'End of the student''s previous visit. Read first, then advanced — see 0089. Powers the "since you were last here" line on /home.';

-- Column-level grants: profiles is column-granted (0042, 0074, 0087), so a new
-- column needs BOTH or the first read fails with "permission denied for table".
grant select (last_seen_at) on profiles to authenticated;
grant update (last_seen_at) on profiles to authenticated;

-- Returns the PREVIOUS last_seen_at and then advances it, in one statement so a
-- double render cannot lose the window. Definer because the update must be
-- allowed even though a student may only touch their own row.
create or replace function touch_last_seen()
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  prev timestamptz;
begin
  select p.last_seen_at into prev from profiles p where p.id = auth.uid();
  update profiles set last_seen_at = now() where id = auth.uid();
  return prev;  -- null on the very first visit: the caller shows nothing
end $$;

grant execute on function touch_last_seen() to authenticated;
