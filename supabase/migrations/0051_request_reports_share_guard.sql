-- 0051: two deferred hardening items.
--
-- (a) Requests were shipped (0039) without a report path — report_target
-- lacked a value for them. Add it and teach mod_remove_content; requests have
-- no `removed` flag, they are lightweight wants, so moderator removal deletes
-- the row outright.
--
-- (b) subscription_members' "owner or self update" policy lets a member
-- rewrite their own share_amount via a direct API call (RLS is row-level;
-- the app UI only offers it to the owner). Guard the column with a trigger:
-- only the pool owner may change share_amount.

alter type report_target add value if not exists 'request';

create or replace function mod_remove_content(ttype text, tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare mod_college uuid;
begin
  select college_id into mod_college from profiles where id = auth.uid() and is_moderator;
  if mod_college is null then raise exception 'not a moderator'; end if;
  if ttype = 'listing' then update listings set removed = true where id = tid and college_id = mod_college;
  elsif ttype = 'post' then update posts set removed = true where id = tid and college_id = mod_college;
  elsif ttype = 'group_order' then update group_orders set removed = true where id = tid and college_id = mod_college;
  elsif ttype = 'request' then delete from requests where id = tid and college_id = mod_college;
  end if;
end;
$$;

create or replace function guard_share_amount()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.share_amount is distinct from old.share_amount then
    if not exists (
      select 1 from subscriptions s
      where s.id = new.subscription_id and s.owner_id = auth.uid()
    ) then
      raise exception 'only the pool owner can change shares';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists subscription_members_share_guard on subscription_members;
create trigger subscription_members_share_guard
  before update on subscription_members
  for each row execute function guard_share_amount();
