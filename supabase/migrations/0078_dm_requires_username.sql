-- QUEUE A36 / POLISH J6-1: make the @username contact rule real.
--
-- THE CONSTRAINT, verbatim from the founder:
--   "I dont want people to start using this app to text anyone they want by
--    searching their name on it"
--   "to contact them, one should know their unique username"
--
-- The UI honoured it — /search?tab=people is exact-username only (0037) and a
-- name search returns nothing. The DATABASE did not. Probed as a plain student
-- with a real role JWT:
--     select count(*) from profiles            -> 18   (every same-college row)
--     ... where name ilike '%a%'               -> 16   (partial NAME search)
--     find_or_create_dm(<harvested uuid>)      -> ALLOWED, conversation created
-- i.e. open devtools, list everyone by name, take a uuid, start a chat. Exactly
-- the cold-DM-by-name-search the rule exists to prevent.
--
-- FOUNDER'S DECISION (2026-07-28): the username wins EVEN inside a shared
-- community. Being in the same club does not by itself grant the right to DM.
--
-- So a DM may be opened only when one of these holds:
--   1. a conversation between the two already exists (you are mid-thread)
--   2. the caller passes the target's EXACT username
--   3. the target genuinely OWNS the thing being discussed — they listed it,
--      requested it, organised it. Publishing something is an invitation to be
--      contacted about it, and this is the one path that needs no username.
--
-- (3) is verified against the row, NEVER trusted from the argument: ctype/ctx
-- are caller-supplied, so a guard that merely checks "ctype is not null" is
-- security theatre. The caller must name a real object that the TARGET owns.

create or replace function find_or_create_dm(
  other uuid,
  ctype text default null,
  ctx uuid default null,
  uname text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_college uuid;
  convo uuid;
  target_username text;
  owns_context boolean := false;
begin
  if other = me then raise exception 'cannot dm yourself'; end if;
  select college_id into my_college from profiles where id = me;

  -- TENANCY (0067): the other participant must be in the caller's college.
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

  -- (1) Already talking — never re-gate an existing thread.
  select c.id into convo
  from conversations c
  join conversation_participants p1 on p1.conversation_id = c.id and p1.user_id = me
  join conversation_participants p2 on p2.conversation_id = c.id and p2.user_id = other
  where c.context_type is not distinct from ctype
    and c.context_id is not distinct from ctx
    -- Preserved from the original: exactly two participants, so a group
    -- conversation containing both people is never returned as their DM.
    and (select count(*) from conversation_participants where conversation_id = c.id) = 2
  limit 1;
  if convo is not null then
    return convo;
  end if;

  -- (3) Does the TARGET own the named context? Read the row; do not trust ctype.
  if ctype is not null and ctx is not null then
    owns_context := case ctype
      when 'listing'      then exists (select 1 from listings      where id = ctx and seller_id    = other)
      when 'request'      then exists (select 1 from requests      where id = ctx and requester_id = other)
      when 'trip'         then exists (select 1 from trips         where id = ctx and creator_id   = other)
      when 'group_order'  then exists (select 1 from group_orders  where id = ctx and organizer_id = other)
      when 'subscription' then exists (select 1 from subscriptions where id = ctx and owner_id     = other)
      when 'post'         then exists (select 1 from posts         where id = ctx and author_id    = other)
      else false
    end;
  end if;

  -- (2) Exact username. Case-insensitive, @ tolerated, but it must MATCH.
  if not owns_context then
    select username into target_username from profiles where id = other;
    if uname is null
       or target_username is null
       or lower(btrim(uname, '@ ')) <> lower(target_username) then
      raise exception 'you need their @username to start a chat';
    end if;
  end if;

  insert into conversations (college_id, context_type, context_id)
  values (my_college, ctype, ctx)
  returning id into convo;

  insert into conversation_participants (conversation_id, user_id)
  values (convo, me), (convo, other);

  return convo;
end $$;

grant execute on function find_or_create_dm(uuid, text, uuid, text) to authenticated;
