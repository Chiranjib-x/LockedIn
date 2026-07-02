-- Fix: subscription create failed because the read policy gated everything
-- (including the owner) behind is_subscription_member(), which doesn't observe
-- the just-inserted row during INSERT ... RETURNING — so create-with-return 403'd.
-- Check owner_id directly first: it evaluates on the NEW row and short-circuits
-- the membership function. Run in Supabase SQL editor (or applied via db url).

drop policy "subscriptions: owner or member read" on subscriptions;
create policy "subscriptions: owner or member read" on subscriptions
  for select to authenticated
  using (
    college_id = get_my_college_id()
    and (owner_id = auth.uid() or is_subscription_member(id))
  );
