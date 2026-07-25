-- Deleting a community now deletes its posts, instead of 0060's SET NULL which
-- orphaned them with a null community_id (invisible "ghost" posts that show up
-- nowhere in a community and render oddly on the events page). Every child FK of
-- posts (event_rsvps/event_checkins/event_feedback/post_claims) is already
-- ON DELETE CASCADE, so the whole chain deletes cleanly. Non-community posts
-- (null community_id) are unaffected. Expand/contract: FK swap only, no column
-- change; nullability is preserved.
alter table posts drop constraint posts_community_id_fkey;
alter table posts
  add constraint posts_community_id_fkey
  foreign key (community_id) references communities(id) on delete cascade;
