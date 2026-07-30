-- Close a cross-college read leak on the founder-curated tables.
--
-- 0018 gave showcase_items and merchants a second policy for writes:
--
--   for all to authenticated
--   using (is_app_moderator())                                    -- no college
--   with check (is_app_moderator() and college_id = get_my_college_id())
--
-- `for all` includes SELECT, and permissive policies are OR'd, so a moderator's
-- effective read was
--   (college_id = get_my_college_id() and ...) or is_app_moderator()
-- which drops the tenancy check entirely. The WITH CHECK was scoped correctly, so
-- writes were always confined — only reads leaked.
--
-- Latent since 0018 because both tables held almost nothing. Seeding the Toolbox
-- in 0085 surfaced it immediately: Demo College's moderator could read all 67
-- rows across 2 colleges, and every tool rendered twice on /toolbox.
--
-- Verified before this migration, as that moderator: total 67, distinct_urls 34,
-- distinct colleges visible 2.
--
-- The four other `for all` policies in the schema were swept at the same time and
-- are fine: they scope on `user_id = auth.uid()`, which is inherently one college.

drop policy if exists "showcase_items: founder writes" on showcase_items;
create policy "showcase_items: founder writes" on showcase_items
  for all to authenticated
  using (is_app_moderator() and college_id = get_my_college_id())
  with check (is_app_moderator() and college_id = get_my_college_id());

drop policy if exists "merchants: founder writes" on merchants;
create policy "merchants: founder writes" on merchants
  for all to authenticated
  using (is_app_moderator() and college_id = get_my_college_id())
  with check (is_app_moderator() and college_id = get_my_college_id());
