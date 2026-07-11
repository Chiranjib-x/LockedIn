-- Phase 28: saves (bookmarks) + saved-search alerts.
-- "Tell me when it appears": saved searches are matched by trigger the
-- moment new content is inserted; the notification rides the existing
-- notify() -> push pipeline for free. Cap: one alert per search per hour
-- via last_notified_at.

create table saves (
  user_id uuid not null references profiles(id) on delete cascade,
  college_id uuid not null references colleges(id),
  target_type text not null check (target_type in ('listing', 'post', 'group_order')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

alter table saves enable row level security;
create policy "saves: own all" on saves
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  college_id uuid not null references colleges(id),
  module text not null check (module in ('marketplace', 'board')),
  query text,
  filters jsonb not null default '{}',
  created_at timestamptz not null default now(),
  last_notified_at timestamptz
);

create index saved_searches_college_idx on saved_searches (college_id, module);

alter table saved_searches enable row level security;
create policy "saved_searches: own all" on saved_searches
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Matchers ─────────────────────────────────────────────────────────────────
-- Simple by design: fts websearch match on the query (null query = any) plus
-- one filter key per module (category / type). Loop is fine at campus scale;
-- revisit with a batched CTE if saved_searches ever gets big.

create or replace function match_saved_searches_listing()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  r record;
begin
  for r in
    select s.id, s.user_id from saved_searches s
    where s.college_id = new.college_id
      and s.module = 'marketplace'
      and s.user_id <> new.seller_id
      and (s.last_notified_at is null or s.last_notified_at < now() - interval '1 hour')
      and (s.query is null or s.query = ''
           or new.fts @@ websearch_to_tsquery('english', s.query))
      and (s.filters->>'category' is null or s.filters->>'category' = new.category)
  loop
    perform notify(r.user_id, new.college_id, 'saved_search',
      'New on campus: ' || new.title, '/marketplace/' || new.id);
    update saved_searches set last_notified_at = now() where id = r.id;
  end loop;
  return new;
end;
$$;

create trigger trg_match_saved_searches_listing
  after insert on listings
  for each row execute function match_saved_searches_listing();

create or replace function match_saved_searches_post()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  r record;
begin
  for r in
    select s.id, s.user_id from saved_searches s
    where s.college_id = new.college_id
      and s.module = 'board'
      and s.user_id <> new.author_id
      and (s.last_notified_at is null or s.last_notified_at < now() - interval '1 hour')
      and (s.query is null or s.query = ''
           or new.fts @@ websearch_to_tsquery('english', s.query))
      and (s.filters->>'type' is null or s.filters->>'type' = new.type::text)
  loop
    perform notify(r.user_id, new.college_id, 'saved_search',
      'New on the board: ' || new.title, '/board/' || new.id);
    update saved_searches set last_notified_at = now() where id = r.id;
  end loop;
  return new;
end;
$$;

create trigger trg_match_saved_searches_post
  after insert on posts
  for each row execute function match_saved_searches_post();
