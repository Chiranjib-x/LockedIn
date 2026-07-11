-- Phase 21a: web push.
-- Pipeline: notifications INSERT (existing notify() triggers) -> pg_net POST
-- to /api/push/dispatch (Vercel) -> web-push to the user's subscriptions.
-- The payload carries only the notification row's own content (message/link),
-- already tenancy-stamped by notify() — the dispatch route never queries.
-- kind='fcm' reserved for Phase 21b (native Android FCM).

create extension if not exists pg_net;

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  college_id uuid not null references colleges(id),
  kind text not null default 'webpush' check (kind in ('webpush', 'fcm')),
  endpoint text not null unique,
  keys jsonb,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

-- Owner-only visibility; writes go through the RPCs below.
create policy "push_subscriptions: own read" on push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "push_subscriptions: own delete" on push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- Subscribe: an endpoint is device-scoped while rows are user-scoped, so a
-- shared phone re-login must STEAL the endpoint from the previous user —
-- hence definer delete-then-insert rather than a plain RLS insert.
create or replace function save_push_subscription(p_endpoint text, p_keys jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from push_subscriptions where endpoint = p_endpoint;
  insert into push_subscriptions (user_id, college_id, endpoint, keys)
  values (auth.uid(), get_my_college_id(), p_endpoint, p_keys);
end;
$$;

-- Prune: the endpoint string is itself the capability (unguessable, and
-- knowing it means you could push to it) — so anon may delete by exact match.
-- Used by the dispatch route on 404/410 and by the client on logout.
create or replace function prune_push_subscription(p_endpoint text)
returns void
language sql security definer set search_path = public
as $$
  delete from push_subscriptions where endpoint = p_endpoint;
$$;

grant execute on function prune_push_subscription(text) to anon;

-- ── Fan-out trigger ──────────────────────────────────────────────────────────
-- ponytail: dispatch URL is the prod deployment, hardcoded — notifications
-- created against this DB from any environment push via prod's VAPID keys.
-- No shared secret v1: a forged POST without real endpoint+keys can push to
-- nobody; harden with Vault + bearer when the app has real stakes.
create or replace function push_dispatch()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  subs jsonb;
begin
  select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'keys', keys))
    into subs
  from push_subscriptions
  where user_id = new.user_id and kind = 'webpush';

  if subs is not null then
    perform net.http_post(
      url := 'https://lockedin-swart-ten.vercel.app/api/push/dispatch',
      body := jsonb_build_object(
        'message', new.message, 'link', new.link, 'nid', new.id, 'subs', subs
      ),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  end if;
  return new;
end;
$$;

create trigger trg_push_dispatch
  after insert on notifications
  for each row execute function push_dispatch();

-- ── The flagship nudge: class in ~30 min while below attendance threshold ───
-- Times in timetable_entries are naive IST (the app's audience); near-midnight
-- window wrap yields no nudge rather than a wrong one.
create or replace function notify_class_nudges()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  now_ist timestamp := (now() at time zone 'Asia/Kolkata');
begin
  perform notify(
    e.user_id, e.college_id, 'timetable',
    e.course_code || ' in ~30 min — you''re at ' || s.pct || '%, attending helps 📈',
    '/timetable/' || e.course_code
  )
  from timetable_entries e
  join lateral (
    select
      round(100.0 * count(*) filter (where a.status = 'present')
        / nullif(count(*) filter (where a.status in ('present','absent')), 0)) as pct
    from attendance_records a
    where a.user_id = e.user_id and a.course_code = e.course_code
  ) s on s.pct is not null
  join profiles pr on pr.id = e.user_id
  join colleges c on c.id = pr.college_id
  where e.day_of_week = extract(dow from now_ist)
    and e.starts_at between (now_ist::time + interval '25 minutes')
                        and (now_ist::time + interval '40 minutes')
    and s.pct < coalesce(e.min_attendance, c.attendance_threshold, 75)
    and not exists (
      select 1 from notifications n
      where n.user_id = e.user_id
        and n.link = '/timetable/' || e.course_code
        and n.created_at > now() - interval '20 hours'
    );
end;
$$;

do $$
begin
  perform cron.schedule('class-nudges', '*/10 * * * *', 'select notify_class_nudges()');
exception when others then
  raise notice 'pg_cron unavailable (%): schedule notify_class_nudges() every 10 min by other means', sqlerrm;
end;
$$;
