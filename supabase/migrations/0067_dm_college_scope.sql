-- FINDINGS F5 (P0, /hunt B3): find_or_create_dm (0015) stamped the conversation
-- with the CALLER's college but never checked the other participant's college.
-- A caller holding a foreign user's uuid could open a DM across colleges and
-- deliver a message into it — probed: VIT user -> Demo College user, message
-- delivered. Breaks the tenancy rule ("everything stays inside your campus —
-- enforced at the database") that every other table upholds.
--
-- Reachability was limited (profiles are RLS-scoped and find_by_username is
-- college-scoped, so foreign uuids are not easily harvested) but this function
-- IS the trust boundary for chat and it failed open.
--
-- Fix: require both participants in the same college. Same-college DMs are
-- unaffected; the only behaviour that changes is the cross-college case, which
-- was never intended to work.
create or replace function find_or_create_dm(other uuid, ctype text, ctx uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_college uuid;
  conv uuid;
begin
  if other = me then raise exception 'cannot dm yourself'; end if;
  select college_id into my_college from profiles where id = me;

  -- TENANCY: the other participant must be in the caller's college.
  if not exists (
    select 1 from profiles where id = other and college_id = my_college
  ) then
    raise exception 'that person is not at your college';
  end if;

  if exists (
    select 1 from blocks
    where (blocker_id = me and blocked_id = other)
       or (blocker_id = other and blocked_id = me)
  ) then
    raise exception 'blocked';
  end if;

  select c.id into conv
  from conversations c
  join conversation_participants p1 on p1.conversation_id = c.id and p1.user_id = me
  join conversation_participants p2 on p2.conversation_id = c.id and p2.user_id = other
  where c.context_type is not distinct from ctype
    and c.context_id is not distinct from ctx
    and (select count(*) from conversation_participants where conversation_id = c.id) = 2
  limit 1;

  if conv is not null then return conv; end if;

  insert into conversations (college_id, context_type, context_id)
  values (my_college, ctype, ctx) returning id into conv;
  insert into conversation_participants (conversation_id, user_id) values (conv, me), (conv, other);
  return conv;
end;
$$;
