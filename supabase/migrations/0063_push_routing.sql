-- 0063 (Suite Phase 1): app-aware push routing. With multiple suite apps
-- installed, each notification should land in the app that owns the feature —
-- gate pings open GateRunner, community pings open CampusClubs — falling back
-- to ANY of the user's subscriptions when the preferred app isn't installed.
-- Without this, a two-app user gets double pushes (or the wrong app opens).

alter table push_subscriptions
  add column if not exists app text not null default 'lockedin';

-- 4-arg replacement; deployed clients still call the 3-arg shape, which the
-- default fills — zero version skew. Drop the old signature first (ambiguity).
drop function if exists save_push_subscription(text, jsonb, text);
create or replace function save_push_subscription(
  p_endpoint text, p_keys jsonb, p_kind text default 'webpush', p_app text default 'lockedin'
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_kind not in ('webpush', 'fcm') then
    raise exception 'bad kind';
  end if;
  delete from push_subscriptions where endpoint = p_endpoint;
  insert into push_subscriptions (user_id, college_id, endpoint, keys, kind, app)
  values (auth.uid(), get_my_college_id(), p_endpoint, p_keys, p_kind, coalesce(nullif(trim(p_app), ''), 'lockedin'));
end;
$$;

-- Routed fan-out: notification type -> preferred app; fall back to all of the
-- user's subs when the preferred app has none. 'clubs'/'trade' are listed now
-- so those apps route correctly the day they ship (fallback covers today).
create or replace function push_dispatch()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  subs jsonb;
  preferred text;
begin
  preferred := case
    when new.type = 'gate' then 'gaterunner'
    when new.type in ('community', 'event') then 'clubs'
    else 'lockedin'
  end;

  select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'keys', keys, 'kind', kind))
    into subs
  from push_subscriptions
  where user_id = new.user_id and app = preferred;

  if subs is null then
    select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'keys', keys, 'kind', kind))
      into subs
    from push_subscriptions
    where user_id = new.user_id;
  end if;

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
