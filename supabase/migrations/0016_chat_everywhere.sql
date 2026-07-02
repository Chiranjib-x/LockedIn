-- Phase 19: chat across matcher/group-buy/subscriptions + notifications on new
-- messages. System (icebreaker) messages + a match-chat starter.

alter table messages add column is_system boolean not null default false;

-- Start (or find) a match conversation between the caller and `other`, and seed
-- a one-time icebreaker as a system message. security definer: creates the
-- conversation rows + system message that RLS wouldn't allow a client to.
create or replace function start_match_chat(other uuid, icebreaker text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_college uuid;
  conv uuid;
  has_msgs boolean;
begin
  if other = me then raise exception 'cannot chat yourself'; end if;
  if exists (select 1 from blocks where (blocker_id=me and blocked_id=other) or (blocker_id=other and blocked_id=me)) then
    raise exception 'blocked';
  end if;
  select college_id into my_college from profiles where id = me;

  select c.id into conv
  from conversations c
  join conversation_participants p1 on p1.conversation_id=c.id and p1.user_id=me
  join conversation_participants p2 on p2.conversation_id=c.id and p2.user_id=other
  where c.context_type = 'match'
    and (select count(*) from conversation_participants where conversation_id=c.id)=2
  limit 1;

  if conv is null then
    insert into conversations (college_id, context_type) values (my_college, 'match') returning id into conv;
    insert into conversation_participants (conversation_id, user_id) values (conv, me), (conv, other);
  end if;

  select exists(select 1 from messages where conversation_id=conv) into has_msgs;
  if not has_msgs and icebreaker is not null then
    insert into messages (conversation_id, sender_id, body, is_system) values (conv, me, icebreaker, true);
  end if;
  return conv;
end;
$$;

-- New-message notification, collapsed to one unread per conversation per user
-- (a burst of messages won't stack notifications). markRead clears them.
create or replace function notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  sender_name text;
  cid uuid;
  part record;
  lnk text := '/chats/' || new.conversation_id; -- not "link": collides with notifications.link column
begin
  if new.is_system then return new; end if;
  select name into sender_name from profiles where id = new.sender_id;
  select college_id into cid from conversations where id = new.conversation_id;
  for part in
    select user_id from conversation_participants
    where conversation_id = new.conversation_id and user_id <> new.sender_id
  loop
    delete from notifications where user_id = part.user_id and notifications.link = lnk and read = false;
    perform notify(part.user_id, cid, 'chat', '💬 ' || sender_name || ': ' || left(new.body, 60), lnk);
  end loop;
  return new;
end;
$$;
create trigger trg_notify_new_message
  after insert on messages
  for each row execute function notify_new_message();
