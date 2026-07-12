-- Phase 35: group-buy lifecycle + fee splitting.
-- Lifecycle grows to open -> closed -> ordered -> arrived -> collecting ->
-- completed (cancelled as a side exit). Fee shares are computed at DISPLAY
-- time from delivery_fee + split_mode (like cab fare splits) — no stored
-- recalc to drift. Organizer karma on completion already exists (0012).

alter type group_order_status add value if not exists 'ordered';
alter type group_order_status add value if not exists 'arrived';
alter type group_order_status add value if not exists 'cancelled';

alter table group_orders add column pickup_location text;
alter table group_orders add column delivery_fee numeric(10, 2);
alter table group_orders add column split_mode text not null default 'even'
  check (split_mode in ('even', 'proportional'));

-- Full lifecycle notification map (replaces the 0010 version; 'arrived'
-- carries the pickup location — the push that matters most).
create or replace function notify_group_order_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  msg text;
  i record;
begin
  if new.status = old.status then return new; end if;
  msg := case new.status::text
    when 'closed' then 'Joining locked for "' || new.title || '" — order goes in next'
    when 'ordered' then '"' || new.title || '" has been ordered 📦'
    when 'arrived' then '"' || new.title || '" has arrived — collect from ' || coalesce(new.pickup_location, 'the organizer')
    when 'collecting' then 'Time to pay your share for "' || new.title || '"'
    when 'completed' then '"' || new.title || '" is done — thanks for pooling 🎉'
    when 'cancelled' then '"' || new.title || '" was cancelled'
    else null
  end;
  if msg is null then return new; end if;
  for i in select distinct user_id from group_order_items where order_id = new.id loop
    perform notify(i.user_id, new.college_id, 'group_buy', msg, '/group-buy/' || new.id);
  end loop;
  return new;
end;
$$;

-- Completion records organizer<->participant transactions (0011 rating rails).
create or replace function group_complete_transactions()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  i record;
begin
  if new.status = 'completed' and old.status <> 'completed' then
    for i in
      select distinct user_id from group_order_items
      where order_id = new.id and user_id <> new.organizer_id
    loop
      if not exists (
        select 1 from transactions
        where context_type = 'group_buy' and context_id = new.id
          and party_a = new.organizer_id and party_b = i.user_id
      ) then
        insert into transactions (college_id, context_type, context_id, party_a, party_b)
        values (new.college_id, 'group_buy', new.id, new.organizer_id, i.user_id);
      end if;
    end loop;
  end if;
  return new;
end;
$$;

create trigger trg_group_complete_transactions
  after update on group_orders
  for each row execute function group_complete_transactions();
