-- POLISH J3-1: a pending offer on a sold listing was a dead end.
--
-- Found by walking the buy/sell journey as a buyer. The rules today:
--   * offers only ever surface on the listing detail page — there is no
--     "my offers" screen, so a buyer cannot review their outstanding offers.
--   * nothing resolves an offer when the listing is marked sold. listings has
--     one trigger (trg_match_saved_searches_listing) and offers has one
--     (trg_enforce_offer_transition, 0068); neither touches this.
--
-- So: buyer offers -> seller sells to someone else -> the offer stays 'pending'
-- forever, the buyer is never told, and the only way to discover it is to
-- revisit that exact listing and notice a live offer on a sold item. That is a
-- state with no legal next action, which is precisely what the journey audit
-- looks for.
--
-- Fix at the DB, not in the app: three forks each own a marketplace surface, and
-- setSold() is a plain table update in all of them. A trigger closes the hole
-- once for every caller, including PostgREST direct writes.

create or replace function close_offers_on_sold()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o record;
begin
  -- Only the moment it becomes sold. Re-listing (sold -> available) must NOT
  -- resurrect declined offers: the buyer was already told it was closed.
  if new.status <> 'sold' or old.status is not distinct from new.status then
    return new;
  end if;

  for o in
    select id, buyer_id, amount
      from offers
     where listing_id = new.id
       and status in ('pending', 'countered')
  loop
    -- pending|countered -> declined is permitted by enforce_offer_transition
    -- (0068): the row is not closed yet, and 'declined' is neither the
    -- seller-only 'countered' nor the guarded 'accepted'.
    update offers set status = 'declined' where id = o.id;

    perform notify(
      o.buyer_id, new.college_id, 'offer',
      '“' || new.title || '” was sold — your ₹' || trim(to_char(o.amount, 'FM999999990')) ||
        ' offer is closed.',
      '/marketplace/' || new.id::text
    );
  end loop;

  return new;
end $$;

drop trigger if exists trg_close_offers_on_sold on listings;
create trigger trg_close_offers_on_sold
  after update on listings
  for each row execute function close_offers_on_sold();
