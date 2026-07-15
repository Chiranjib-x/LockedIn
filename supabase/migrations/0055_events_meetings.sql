-- 0055 (Wave F / T3): event RSVPs + capacity, post-event feedback, team
-- meetings with roll-call, and the privacy-preserving team free-window finder.

-- ── RSVPs ────────────────────────────────────────────────────────────────────
alter table posts add column if not exists capacity int; -- events only; null = unlimited

create table event_rsvps (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  college_id uuid not null references colleges(id),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table event_rsvps enable row level security;

-- College-visible: powers the going-count and the organizer's list alike.
create policy "rsvp: college read" on event_rsvps
  for select to authenticated using (college_id = get_my_college_id());

create policy "rsvp: self going" on event_rsvps
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and college_id = get_my_college_id()
    and not is_banned()
    and exists (select 1 from posts p where p.id = post_id and p.type = 'event')
  );

create policy "rsvp: self ungoing" on event_rsvps
  for delete to authenticated using (user_id = auth.uid());

-- ── Post-event feedback ─────────────────────────────────────────────────────
create table event_feedback (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  college_id uuid not null references colleges(id),
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table event_feedback enable row level security;

-- You see your own; the event's author (and app mods) see everyone's.
create policy "feedback: own or organizer read" on event_feedback
  for select to authenticated
  using (
    user_id = auth.uid()
    or is_app_moderator()
    or exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid())
  );

create policy "feedback: self insert" on event_feedback
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and college_id = get_my_college_id()
    and not is_banned()
    and exists (select 1 from posts p where p.id = post_id and p.type = 'event' and p.event_date < now())
  );

-- ── Team meetings + roll-call ────────────────────────────────────────────────
create table team_meetings (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  college_id uuid not null references colleges(id),
  title text not null,
  meet_at timestamptz not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table meeting_attendance (
  meeting_id uuid not null references team_meetings(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  college_id uuid not null references colleges(id),
  marked_by uuid references profiles(id) on delete set null,
  marked_at timestamptz not null default now(),
  primary key (meeting_id, user_id)
);
alter table team_meetings enable row level security;
alter table meeting_attendance enable row level security;

create or replace function is_community_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from community_members where community_id = cid and user_id = auth.uid())
$$;

create policy "meetings: member read" on team_meetings
  for select to authenticated
  using (is_community_member(community_id) or is_app_moderator());
create policy "meetings: lead write" on team_meetings
  for insert to authenticated
  with check (college_id = get_my_college_id() and (is_app_moderator() or is_community_moderator(community_id)));
create policy "meetings: lead delete" on team_meetings
  for delete to authenticated
  using (is_app_moderator() or is_community_moderator(community_id));

create policy "attendance: member read" on meeting_attendance
  for select to authenticated
  using (exists (select 1 from team_meetings m where m.id = meeting_id and is_community_member(m.community_id)));
create policy "attendance: lead mark" on meeting_attendance
  for insert to authenticated
  with check (
    college_id = get_my_college_id()
    and exists (select 1 from team_meetings m where m.id = meeting_id
                and (is_app_moderator() or is_community_moderator(m.community_id)))
  );
create policy "attendance: lead unmark" on meeting_attendance
  for delete to authenticated
  using (exists (select 1 from team_meetings m where m.id = meeting_id
                 and (is_app_moderator() or is_community_moderator(m.community_id))));

-- ── Team free-window finder ──────────────────────────────────────────────────
-- Members' timetables are owner-only RLS; this definer aggregate never exposes
-- an individual's schedule — only the merged busy union's gaps, for members of
-- the community, within 08:00–21:00 IST wall-clock minutes.
create or replace function team_free_windows(cid uuid, dow int)
returns table (start_min int, end_min int)
language plpgsql stable security definer set search_path = public as $$
declare
  busy record;
  cursor_min int := 8 * 60;
  day_end int := 21 * 60;
begin
  if not (is_community_member(cid) or is_app_moderator()) then
    raise exception 'not allowed';
  end if;
  for busy in
    select (extract(hour from t.starts_at) * 60 + extract(minute from t.starts_at))::int as s,
           (extract(hour from t.ends_at) * 60 + extract(minute from t.ends_at))::int as e
    from timetable_entries t
    join community_members cm on cm.user_id = t.user_id and cm.community_id = cid
    where t.day_of_week = dow
    order by 1
  loop
    if busy.s > cursor_min then
      start_min := cursor_min; end_min := least(busy.s, day_end);
      if end_min > start_min then return next; end if;
    end if;
    cursor_min := greatest(cursor_min, busy.e);
    exit when cursor_min >= day_end;
  end loop;
  if cursor_min < day_end then
    start_min := cursor_min; end_min := day_end; return next;
  end if;
end;
$$;

revoke all on function team_free_windows(uuid, int) from public, anon;
grant execute on function team_free_windows(uuid, int) to authenticated;
