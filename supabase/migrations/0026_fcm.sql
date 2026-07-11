-- Phase 21b: native FCM joins the pipeline.
-- push_subscriptions.kind='fcm' rows store the FCM device token in `endpoint`
-- (keys stays null). The dispatch trigger now fans out every kind and tags
-- each sub so the route can branch (web-push vs firebase-admin).

-- 3-arg replacement; drop the 2-arg first or the pair is ambiguous to callers.
drop function if exists save_push_subscription(text, jsonb);
create or replace function save_push_subscription(
  p_endpoint text, p_keys jsonb, p_kind text default 'webpush'
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
  insert into push_subscriptions (user_id, college_id, endpoint, keys, kind)
  values (auth.uid(), get_my_college_id(), p_endpoint, p_keys, p_kind);
end;
$$;

create or replace function push_dispatch()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  subs jsonb;
begin
  select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'keys', keys, 'kind', kind))
    into subs
  from push_subscriptions
  where user_id = new.user_id;

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
