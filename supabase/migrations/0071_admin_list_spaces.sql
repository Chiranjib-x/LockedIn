-- FINDINGS F7, part 2: the founder is deliberately NOT a member of any space,
-- so `spaces: members only` (0004) hides every space from them — including the
-- empty ones they need to bootstrap. This definer helper lets a college's app
-- moderator see the spaces in their own college and, crucially, WHICH ARE EMPTY.
--
-- It exposes exactly three fields plus a count. No rosters, no member ids, no
-- listings: the founder gains the ability to open a door, not to look inside.
create or replace function admin_list_spaces()
returns table (id uuid, name text, emoji text, member_count int)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.emoji,
         (select count(*)::int from space_members m where m.space_id = s.id)
  from spaces s
  where s.college_id = get_my_college_id()
    and coalesce((select p.is_moderator from profiles p where p.id = auth.uid()), false)
  order by s.name
$$;

revoke all on function admin_list_spaces() from public, anon;
grant execute on function admin_list_spaces() to authenticated;
