-- Let the two people on a gate pickup message each other.
--
-- "Which counter is it?", "it's the big Amazon box, not the small one",
-- "I'm at the gate now" — every one of those currently has to happen somewhere
-- that is not this app, which is the whole thing GateRunner exists to remove.
--
-- WHY THIS NEEDS A NEW BRANCH. 0078's rule is "the TARGET owns the named
-- context", checked against a single owner column. A pickup has TWO parties and
-- neither owns it in that sense: the requester posted it, the runner claimed it,
-- and either may need to speak first. So the check here is symmetric.
--
-- It stays as tight as the others, and the constraint the user set
-- ("I don't want people texting anyone by searching their name") still holds:
--   * only the two parties named on that exact row can open it, and
--   * only once runner_id is set — before a claim there is no counterparty,
--     so a pickup id is not a way to reach whoever posted it.
-- Everyone else still needs the @username.

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
      -- Symmetric, and only after a claim: the pair must be exactly this
      -- pickup's requester and runner, in either direction.
      when 'pickup'       then exists (
        select 1 from pickup_requests p
        where p.id = ctx
          and p.runner_id is not null
          and (
            (p.requester_id = me    and p.runner_id = other) or
            (p.runner_id    = me    and p.requester_id = other)
          )
      )
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
