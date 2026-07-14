-- 0043: event organizers (and moderators) can see checked-in attendees' emails.
-- Emails live in auth.users and are unreadable via the API by design; these
-- SECURITY DEFINER functions expose them ONLY to the event's organizer/mod, and
-- ONLY for that event's linked attendees. Guests (unlinked) have no email.
--
-- record_checkin() keeps its attendee_name column (backward compatible with the
-- currently-deployed build) and gains attendee_id + email — additive, so this
-- can be applied before the code deploys without breaking prod check-in.

drop function if exists record_checkin(uuid, text);
create or replace function record_checkin(p_post_id uuid, p_code text)
returns table (attendee_id uuid, attendee_name text, email text, is_new boolean)
language plpgsql security definer set search_path = public as $$
declare
  my_college uuid;
  post_college uuid;
  post_author uuid;
  att uuid;
  affected int;
begin
  p_code := btrim(p_code);
  if p_code = '' then raise exception 'empty code'; end if;

  select college_id into my_college from profiles where id = auth.uid();
  select college_id, author_id into post_college, post_author
    from posts where id = p_post_id and type = 'event';
  if post_college is null then raise exception 'not an event'; end if;
  if post_college <> my_college then raise exception 'wrong college'; end if;
  if not (
    post_author = auth.uid()
    or exists (select 1 from profiles where id = auth.uid()
               and is_moderator and college_id = post_college)
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

-- Full roster for the check-in screen, organizer/moderator only, with emails
-- for linked attendees.
create or replace function event_roster(p_post_id uuid)
returns table (code text, attendee_id uuid, name text, email text)
language plpgsql security definer set search_path = public as $$
declare
  post_college uuid;
  post_author uuid;
begin
  select college_id, author_id into post_college, post_author
    from posts where id = p_post_id and type = 'event';
  if post_college is null then raise exception 'not an event'; end if;
  if not (
    post_author = auth.uid()
    or exists (select 1 from profiles where id = auth.uid()
               and is_moderator and college_id = post_college)
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
