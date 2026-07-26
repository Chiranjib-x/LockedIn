-- FINDINGS F6 (P1, /hunt B2): the `offers: parties update` policy (0033) has no
-- WITH CHECK, so its USING clause ("I am the buyer OR the listing's seller") is
-- reused for the new row. That let a BUYER set status='accepted' on their own
-- pending offer, and change `amount`, by calling the table directly through
-- PostgREST — bypassing decideOffer(), which does guard this
-- (modules/marketplace/offer-actions.ts:105 "A buyer can't 'accept' their own
-- uncountered offer"). Probed: self-accept ALLOWED, amount raise ALLOWED.
--
-- RLS WITH CHECK cannot see the OLD row, so transition rules need a trigger.
-- This mirrors decideOffer exactly — no legitimate flow changes:
--   seller: pending|countered -> accepted | declined | countered
--   buyer:  countered         -> accepted        (accepting the seller's counter)
--   buyer:  pending|countered -> declined        (withdrawing)
--   nobody: edits a closed (accepted/declined) offer
--   nobody: changes amount / buyer_id / listing_id after insert
create or replace function enforce_offer_transition()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_seller boolean;
begin
  select exists (
    select 1 from listings l where l.id = new.listing_id and l.seller_id = auth.uid()
  ) into is_seller;

  -- Immutable fields: the negotiation moves via status/counter_amount only.
  if new.amount is distinct from old.amount
     or new.buyer_id is distinct from old.buyer_id
     or new.listing_id is distinct from old.listing_id then
    raise exception 'offer amount and parties cannot be changed';
  end if;

  if new.status is distinct from old.status then
    if old.status in ('accepted', 'declined') then
      raise exception 'this offer is already closed';
    end if;
    if new.status = 'countered' and not is_seller then
      raise exception 'only the seller counters';
    end if;
    -- The bypass this migration exists to close.
    if new.status = 'accepted' and not is_seller and old.status <> 'countered' then
      raise exception 'wait for the seller to respond';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_enforce_offer_transition on offers;
create trigger trg_enforce_offer_transition
  before update on offers
  for each row execute function enforce_offer_transition();
