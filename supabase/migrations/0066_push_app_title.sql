-- Pass the routed app ('preferred') into the dispatch payload so /api/push/
-- dispatch can title each push with its app's name instead of always "LockedIn".
-- Additive: one extra field in the outbound body, no table/column change.
-- 'preferred' already exists (0063); this only adds it to the http_post body.
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
        'message', new.message, 'link', new.link, 'nid', new.id, 'app', preferred, 'subs', subs
      ),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  end if;
  return new;
end;
$$;
