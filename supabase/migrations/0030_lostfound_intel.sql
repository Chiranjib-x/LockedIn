-- Phase 30: lost&found intelligence — claim verification + auto-matching.
-- Karma for found-resolved already exists (0012 karma_on_found_resolved).

alter type post_status add value if not exists 'claim_pending';

-- Optional verification question the finder sets ("what's engraved on it?").
alter table posts add column claim_question text;

create table post_claims (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  post_id uuid not null references posts(id) on delete cascade,
  claimant_id uuid not null references profiles(id) on delete cascade,
  answer text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (post_id, claimant_id)
);

alter table post_claims enable row level security;

-- Claimants file one claim per found post (not their own post); answers are
-- PRIVATE: visible only to the claimant and the post's author.
create policy "post_claims: claimant insert" on post_claims
  for insert to authenticated
  with check (
    claimant_id = auth.uid()
    and college_id = get_my_college_id()
    and exists (
      select 1 from posts p
      where p.id = post_id and p.type = 'found' and p.status = 'open'
        and p.author_id <> auth.uid() and p.college_id = get_my_college_id()
    )
  );

create policy "post_claims: claimant or post author read" on post_claims
  for select to authenticated
  using (
    claimant_id = auth.uid()
    or exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid())
  );

create policy "post_claims: post author decides" on post_claims
  for update to authenticated
  using (exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()));

-- ── Auto-matching (pg_trgm, conservative threshold) ─────────────────────────
-- TODO: swap for embedding-based matching when quality demands it.
create or replace function match_lost_found()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  hay text := lower(coalesce(new.title,'') || ' ' || coalesce(new.description,'') || ' ' || coalesce(new.location,''));
  r record;
begin
  if new.type = 'found' then
    -- tell owners of recent open LOST posts that their item may have surfaced
    for r in
      select p.author_id from posts p
      where p.college_id = new.college_id and p.type = 'lost' and p.status = 'open'
        and p.author_id <> new.author_id
        and p.created_at > now() - interval '30 days'
        and similarity(hay, lower(coalesce(p.title,'') || ' ' || coalesce(p.description,'') || ' ' || coalesce(p.location,''))) > 0.3
      limit 3
    loop
      perform notify(r.author_id, new.college_id, 'board',
        'A found item may match yours: ' || new.title, '/board/' || new.id);
    end loop;
  elsif new.type = 'lost' then
    -- point the fresh lost-poster at recent found posts that look similar
    for r in
      select p.id, p.title from posts p
      where p.college_id = new.college_id and p.type = 'found' and p.status = 'open'
        and p.author_id <> new.author_id
        and p.created_at > now() - interval '30 days'
        and similarity(hay, lower(coalesce(p.title,'') || ' ' || coalesce(p.description,'') || ' ' || coalesce(p.location,''))) > 0.3
      limit 3
    loop
      perform notify(new.author_id, new.college_id, 'board',
        'Already found, maybe: ' || r.title, '/board/' || r.id);
    end loop;
  end if;
  return new;
end;
$$;

create trigger trg_match_lost_found
  after insert on posts
  for each row execute function match_lost_found();
