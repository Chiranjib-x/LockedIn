-- 0044: club marketing engine.
-- Quanta bans WhatsApp groups + phone-number collection; these give clubs the
-- compliant in-app equivalents: broadcast-to-members and interest leads.

-- ── Feature 1: broadcast a club post to every member ───────────────────────
-- When a moderator posts an update/event for a community, notify all its
-- members (except the author). This is the WhatsApp-group replacement. Fires
-- on every post insert but no-ops for non-community posts.
create or replace function notify_community_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cname text;
  cemoji text;
begin
  if new.community_id is null then return new; end if;
  select name, emoji into cname, cemoji from communities where id = new.community_id;
  perform notify(
    m.user_id, new.college_id, 'community',
    cemoji || ' ' || cname || ': ' ||
      case when new.type = 'event' then 'New event — ' else '' end || new.title,
    '/board/' || new.id
  )
  from community_members m
  where m.community_id = new.community_id and m.user_id <> new.author_id;
  return new;
end;
$$;

drop trigger if exists trg_notify_community_post on posts;
create trigger trg_notify_community_post
  after insert on posts
  for each row execute function notify_community_post();

-- ── Feature 4: interest leads ──────────────────────────────────────────────
-- A soft "I'm interested" at the booth — a lead the club follows up with,
-- distinct from full membership (no phone numbers exchanged). Moderators see
-- the list; students manage their own row.
create table if not exists community_interests (
  community_id uuid not null references communities(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

alter table community_interests enable row level security;

drop policy if exists "community_interests: own or club mod read" on community_interests;
create policy "community_interests: own or club mod read" on community_interests
  for select to authenticated
  using (user_id = auth.uid() or is_community_moderator(community_id) or is_app_moderator());

drop policy if exists "community_interests: self insert" on community_interests;
create policy "community_interests: self insert" on community_interests
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not is_banned()
    and exists (
      select 1 from communities c
      where c.id = community_id and c.is_approved and c.college_id = get_my_college_id()
    )
  );

drop policy if exists "community_interests: self delete" on community_interests;
create policy "community_interests: self delete" on community_interests
  for delete to authenticated using (user_id = auth.uid());
