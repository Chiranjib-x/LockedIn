-- POLISH J5-1: only ONE person could run check-in for a club event.
--
-- record_checkin() (0042) authorises `post_author = auth.uid()` OR a
-- same-college app moderator. Nobody else — including the club's own leads.
--
-- Why that breaks the launch plan: docs/LAUNCH.md makes Gravitas the launch
-- vehicle and barcode check-in the differentiated feature ("nothing else on
-- campus does this"). At a real fest the person on the door is a volunteer or a
-- co-lead, not whoever happened to tap "post event". Today they cannot scan
-- anyone, so the club either hands one phone around all evening or the single
-- author has to stand at the door for the whole event. Delegation is the entire
-- point of a club tool.
--
-- Fix: a lead of the event's OWN community can also check in and read the
-- roster. Deliberately `role = 'moderator'` (the lead role) and NOT every
-- member — a rank-and-file member must not be able to mark attendance. Events
-- with no community_id are unchanged: author or app-moderator only.

-- NOTE: rebuilt from 0043, NOT 0042. 0043 widened the return to add
-- attendee_id + email, so replacing 0042's narrower body here would fail with
-- "cannot change return type of existing function".
create or replace function record_checkin(p_post_id uuid, p_code text)
returns table (attendee_id uuid, attendee_name text, email text, is_new boolean)
language plpgsql security definer set search_path = public as $$
declare
  my_college uuid;
  post_college uuid;
  post_author uuid;
  post_community uuid;
  att uuid;
  affected int;
begin
  p_code := btrim(p_code);
  if p_code = '' then raise exception 'empty code'; end if;

  select college_id into my_college from profiles where id = auth.uid();
  select college_id, author_id, community_id
    into post_college, post_author, post_community
    from posts where id = p_post_id and type = 'event';
  if post_college is null then raise exception 'not an event'; end if;
  if post_college <> my_college then raise exception 'wrong college'; end if;

  if not (
    post_author = auth.uid()
    or exists (select 1 from profiles where id = auth.uid()
               and is_moderator and college_id = post_college)
    -- NEW: a lead of the community this event belongs to.
    or (post_community is not null and exists (
         select 1 from community_members cm
         where cm.community_id = post_community
           and cm.user_id = auth.uid()
           and cm.role = 'moderator'
       ))
  ) then
    raise exception 'not authorized to check in for this event';
  end if;

  select id into att from profiles
    where roll_number = p_code and college_id = post_college;

  insert into event_checkins (post_id, college_id, code, attendee_id, checked_in_by)
  values (p_post_id, post_college, p_code, att, auth.uid())
  on conflict (post_id, code) do nothing;
  get diagnostics affected = row_count;

  return query select
    att,
    (select p.name from profiles p where p.id = att),
    (select u.email::text from auth.users u where u.id = att),
    (affected = 1);
end;
$$;

-- event_roster() (0043) carries the identical guard. A co-lead who can scan but
-- cannot see who has arrived is only half-delegated, so it gets the same clause.
create or replace function event_roster(p_post_id uuid)
returns table (code text, attendee_id uuid, name text, email text)
language plpgsql security definer set search_path = public as $$
declare
  post_college uuid;
  post_author uuid;
  post_community uuid;
begin
  select college_id, author_id, community_id
    into post_college, post_author, post_community
    from posts where id = p_post_id and type = 'event';
  if post_college is null then raise exception 'not an event'; end if;
  if not (
    post_author = auth.uid()
    or exists (select 1 from profiles where id = auth.uid()
               and is_moderator and college_id = post_college)
    or (post_community is not null and exists (
         select 1 from community_members cm
         where cm.community_id = post_community
           and cm.user_id = auth.uid()
           and cm.role = 'moderator'
       ))
  ) then
    raise exception 'not authorized';
  end if;

  return query
    select ec.code, ec.attendee_id, p.name, u.email::text
    from event_checkins ec
    left join profiles p on p.id = ec.attendee_id
    left join auth.users u on u.id = ec.attendee_id
    where ec.post_id = p_post_id
    order by ec.created_at desc;
end;
$$;

-- The table policy has the same blind spot as the two functions above.
drop policy if exists "event_checkins: organizer or moderator read" on event_checkins;
create policy "event_checkins: organizer or moderator read" on event_checkins
  for select to authenticated
  using (
    exists (
      select 1 from posts p
      where p.id = event_checkins.post_id
        and (
          p.author_id = auth.uid()
          or exists (select 1 from profiles m
                     where m.id = auth.uid() and m.is_moderator
                       and m.college_id = event_checkins.college_id)
          or (p.community_id is not null and exists (
               select 1 from community_members cm
               where cm.community_id = p.community_id
                 and cm.user_id = auth.uid()
                 and cm.role = 'moderator'
             ))
        )
    )
  );
