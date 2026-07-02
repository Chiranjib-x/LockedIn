-- Phase 18: in-app chat core (Supabase Realtime). 1:1 conversations, first
-- attached to marketplace listings, replacing instant contact-reveal.

create table conversations (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  context_type text,   -- listing | match | group_order | subscription | study_group (nullable)
  context_id uuid,
  created_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index messages_conv_idx on messages (conversation_id, created_at);

alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

-- security definer breaks the participant↔conversation RLS recursion.
create or replace function is_conversation_participant(conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversation_participants
    where conversation_id = conv and user_id = auth.uid()
  )
$$;

create policy "conversations: participant read" on conversations
  for select to authenticated using (is_conversation_participant(id));

create policy "participants: co-participant read" on conversation_participants
  for select to authenticated using (is_conversation_participant(conversation_id));

-- Update only your own participant row (last_read_at).
create policy "participants: own update" on conversation_participants
  for update to authenticated using (user_id = auth.uid());

create policy "messages: participant read" on messages
  for select to authenticated using (is_conversation_participant(conversation_id));

-- Send: must be a participant, sending as self, not banned.
create policy "messages: participant send" on messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and is_conversation_participant(conversation_id)
    and not is_banned()
  );

-- Find-or-create a 1:1 conversation for a context. Enforces blocks both ways.
-- No client insert policy on conversations/participants: only this makes them.
create or replace function find_or_create_dm(other uuid, ctype text, ctx uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_college uuid;
  conv uuid;
begin
  if other = me then raise exception 'cannot dm yourself'; end if;
  select college_id into my_college from profiles where id = me;

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

-- Realtime: broadcast new messages to subscribed participants (RLS-filtered).
alter publication supabase_realtime add table messages;
