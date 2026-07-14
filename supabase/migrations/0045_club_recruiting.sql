-- 0045: club "recruiting" mode. A club flags itself as actively recruiting
-- (e.g. during Quanta); recruiting clubs get surfaced prominently in the
-- communities list and search so booth traffic converts to members.

alter table communities add column if not exists recruiting boolean not null default false;

-- Community moderators (or the app founder) toggle it. A plain RLS update policy
-- can't restrict WHICH columns a community moderator may change, so this
-- definer function scopes them to just this flag.
create or replace function set_recruiting(cid uuid, on_flag boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (is_app_moderator() or is_community_moderator(cid)) then
    raise exception 'not allowed';
  end if;
  update communities set recruiting = on_flag where id = cid;
end;
$$;
