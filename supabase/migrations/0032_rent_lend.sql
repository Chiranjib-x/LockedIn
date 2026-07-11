-- Phase 32: rent & lend listings.
-- Lending mutates the LISTING (lent_to / rental_due / rental_status); the
-- transaction row is created at RETURN time so the 0011 rating nudge fires
-- exactly when the exchange actually completes.

create type listing_kind as enum ('sell', 'rent');
alter table listings add column listing_type listing_kind not null default 'sell';
alter table listings add column price_per_day numeric(10, 2);
alter table listings add column deposit numeric(10, 2);
alter table listings add column rental_status text not null default 'available'
  check (rental_status in ('available', 'lent_out'));
alter table listings add column lent_to uuid references profiles(id);
alter table listings add column rental_due date;

-- Rental history distinguishable in transactions.
alter table transactions add column is_rental boolean not null default false;

-- Overdue nudge: daily, owner gets one ping per overdue rental per day.
create or replace function notify_overdue_rentals()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform notify(l.seller_id, l.college_id, 'marketplace',
    'Rental overdue: ' || l.title || ' was due back ' ||
      to_char(l.rental_due, 'DD Mon') || ' — nudge the borrower',
    '/marketplace/' || l.id)
  from listings l
  where l.listing_type = 'rent'
    and l.rental_status = 'lent_out'
    and l.rental_due < (now() at time zone 'Asia/Kolkata')::date
    and not exists (
      select 1 from notifications n
      where n.user_id = l.seller_id and n.link = '/marketplace/' || l.id
        and n.message like 'Rental overdue%'
        and n.created_at > now() - interval '20 hours'
    );
end;
$$;

do $$
begin
  perform cron.schedule('rental-overdue', '15 3 * * *', 'select notify_overdue_rentals()');
exception when others then
  raise notice 'pg_cron unavailable (%): schedule notify_overdue_rentals() daily by other means', sqlerrm;
end;
$$;
