-- Broadcast: one message from a college's moderator to every student at that
-- college, delivered through the notification rails that already exist.
--
-- The founder needs a way to announce updates. Today the only route is a per-row
-- notify() from a trigger, so there is no way to say "the app just got X" to
-- everyone. This adds one, with the guards an irreversible fan-out deserves.
--
-- WHY A TABLE AND NOT JUST A LOOP:
--   * audit — a broadcast cannot be unsent, so who sent what, to how many, and
--     when, has to be answerable afterwards.
--   * rate limit — the fastest way to lose a campus is two pushes in an hour.
--     The 30-minute floor is enforced here, in the same transaction as the send,
--     rather than in a UI that can be bypassed by calling the RPC directly.

create table if not exists broadcasts (
  id          uuid primary key default gen_random_uuid(),
  college_id  uuid not null references colleges(id) on delete cascade,
  sender_id   uuid not null references profiles(id) on delete cascade,
  message     text not null,
  link        text,
  recipients  int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists broadcasts_college_idx on broadcasts (college_id, created_at desc);

alter table broadcasts enable row level security;

-- TENANCY: readable by moderators of that college only. No write policy —
-- inserts happen solely inside the definer function below.
drop policy if exists "broadcasts: moderator read" on broadcasts;
create policy "broadcasts: moderator read" on broadcasts
  for select to authenticated
  using (
    college_id = get_my_college_id()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator)
  );

-- Returns the number of students notified, or raises with a reason.
create or replace function send_broadcast(p_message text, p_link text default null)
returns int
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  msg text := btrim(p_message);
  sent int;
  last_at timestamptz;
begin
  -- One query both authorises (moderator) and yields their college.
  select college_id into cid from profiles where id = auth.uid() and is_moderator;
  if cid is null then
    raise exception 'Only a college moderator can send a broadcast.';
  end if;

  if msg = '' then
    raise exception 'The message is empty.';
  end if;
  if length(msg) > 180 then
    raise exception 'Keep it under 180 characters — this lands as a push notification.';
  end if;

  -- Rate limit, enforced server-side so it cannot be clicked around.
  select max(created_at) into last_at from broadcasts where college_id = cid;
  if last_at is not null and last_at > now() - interval '30 minutes' then
    raise exception 'A broadcast went out less than 30 minutes ago. Give it time.';
  end if;

  -- Fan out. Skips the sender (they know) and anyone banned.
  select count(*) into sent
  from (
    select p.id
    from profiles p
    where p.college_id = cid
      and not p.is_banned
      and p.id <> auth.uid()
  ) t,
  lateral notify(t.id, cid, 'announcement', msg, coalesce(nullif(btrim(p_link), ''), '/home'));

  insert into broadcasts (college_id, sender_id, message, link, recipients)
  values (cid, auth.uid(), msg, nullif(btrim(p_link), ''), sent);

  return sent;
end $$;

grant execute on function send_broadcast(text, text) to authenticated;
