-- 0053 (Wave F / T1): official-status flag for communities.
-- The proposer CLAIMS official status at proposal time (INSERT policy lets
-- them set it; is_approved is still forced false). Only the founder can
-- update rows post-insert ("communities: founder manages"), so approval is
-- where the claim gets verified: the founder approves as official or strips
-- the flag. Applies to clubs/chapters AND student teams alike.
alter table communities add column if not exists is_official boolean not null default false;
