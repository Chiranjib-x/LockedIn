-- Phase 12: unified in-app notifications.
-- Emission is done by DB triggers on the actual module events — no app-side
-- emit calls, nothing forgeable from a client. In-app only; push lands in
-- Phase 21 (FCM in the Android wrapper, web push fallback).

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  college_id uuid not null references colleges(id),
  type text not null,
  message text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, read, created_at desc);

alter table notifications enable row level security;

-- Owner-only. No insert policy: only the security definer triggers write.
create policy "notifications: own read" on notifications
  for select to authenticated using (user_id = auth.uid());

create policy "notifications: own update" on notifications
  for update to authenticated using (user_id = auth.uid());

create policy "notifications: own delete" on notifications
  for delete to authenticated using (user_id = auth.uid());

-- helper used by all triggers
create or replace function notify(uid uuid, cid uuid, ntype text, msg text, nlink text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, college_id, type, message, link)
  values (uid, cid, ntype, msg, nlink)
$$;

-- 1) Group-buy status changes → every participant
create or replace function notify_group_order_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  msg text;
begin
  if new.status = old.status then return new; end if;
  msg := case new.status
    when 'closed' then 'Joining closed for “' || new.title || '” — order is being placed'
    when 'collecting' then '💸 Time to pay your share for “' || new.title || '”'
    when 'completed' then '“' || new.title || '” is complete 🎉'
    else null end;
  if msg is null then return new; end if;
  perform notify(i.user_id, new.college_id, 'group_buy', msg, '/group-buy/' || new.id)
  from group_order_items i
  where i.order_id = new.id and i.user_id <> new.organizer_id;
  return new;
end;
$$;
create trigger trg_notify_group_order_status
  after update on group_orders
  for each row execute function notify_group_order_status();

-- 2) Match requests → target (pending) / both (mutual)
create or replace function notify_match_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requester_name text;
begin
  select name into requester_name from profiles where id = new.requester_id;
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform notify(new.target_id, new.college_id, 'match',
      requester_name || ' wants to connect with you', '/matches');
  elsif tg_op = 'INSERT' and new.status = 'mutual' then
    perform notify(new.target_id, new.college_id, 'match',
      '🎉 You and ' || requester_name || ' matched — contacts unlocked', '/matches');
  elsif tg_op = 'UPDATE' and new.status = 'mutual' and old.status = 'pending' then
    perform notify(new.requester_id, new.college_id, 'match',
      '🎉 It’s mutual — contacts unlocked', '/matches');
  end if;
  return new;
end;
$$;
create trigger trg_notify_match_request
  after insert or update on match_requests
  for each row execute function notify_match_request();

-- 3) Gate pickups: claimed / reopened → requester; delivered → runner
create or replace function notify_pickup_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  runner_name text;
begin
  if new.status = 'claimed' and old.status = 'open' then
    select name into runner_name from profiles where id = new.runner_id;
    perform notify(new.requester_id, new.college_id, 'gate',
      '🏃 ' || coalesce(runner_name, 'Someone') || ' is grabbing your ' || new.platform || ' delivery',
      '/gate');
  elsif new.status = 'open' and old.status = 'claimed' then
    perform notify(new.requester_id, new.college_id, 'gate',
      'Your runner backed out — “' || new.item_desc || '” is open again', '/gate');
  elsif new.status = 'delivered' and old.status = 'claimed' and old.runner_id is not null then
    perform notify(old.runner_id, new.college_id, 'gate',
      '✅ Receipt confirmed for the ' || new.platform || ' pickup' ||
      case when new.reward > 0 then ' — ₹' || new.reward::int || ' reward heading your way' else '' end,
      '/gate');
  end if;
  return new;
end;
$$;
create trigger trg_notify_pickup_status
  after update on pickup_requests
  for each row execute function notify_pickup_status();

-- 4) Space vouches → the vouched-in member
create or replace function notify_space_add()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  sp record;
begin
  if new.added_by is null or new.added_by = new.user_id then return new; end if;
  select name, emoji, college_id into sp from spaces where id = new.space_id;
  perform notify(new.user_id, sp.college_id, 'space',
    sp.emoji || ' You’ve been vouched into ' || sp.name, '/spaces/' || new.space_id);
  return new;
end;
$$;
create trigger trg_notify_space_add
  after insert on space_members
  for each row execute function notify_space_add();

-- 5) Subscription pool adds → the added member
create or replace function notify_subscription_add()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  sub record;
begin
  select s.service_name, s.college_id, p.name as owner_name
    into sub
  from subscriptions s join profiles p on p.id = s.owner_id
  where s.id = new.subscription_id;
  perform notify(new.user_id, sub.college_id, 'subscription',
    sub.owner_name || ' added you to the ' || sub.service_name || ' pool — your share is ₹' || new.share_amount::int,
    '/subscriptions/' || new.subscription_id);
  return new;
end;
$$;
create trigger trg_notify_subscription_add
  after insert on subscription_members
  for each row execute function notify_subscription_add();
