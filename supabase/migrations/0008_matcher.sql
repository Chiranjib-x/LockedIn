-- Phases 10+11: Matcher — preferences questionnaire + connect requests.
-- Run in Supabase SQL editor.

create type sleep_schedule as enum ('early', 'normal', 'late');
create type study_style as enum ('quiet', 'group');
create type looking_for as enum ('roommate', 'study_buddy', 'both');
create type match_request_status as enum ('pending', 'mutual', 'declined');

create table match_prefs (
  user_id uuid primary key references profiles(id) on delete cascade,
  college_id uuid not null references colleges(id),
  sleep_schedule sleep_schedule not null default 'normal',
  cleanliness int not null default 3 check (cleanliness between 1 and 5),
  study_style study_style not null default 'quiet',
  noise_tolerance int not null default 3 check (noise_tolerance between 1 and 5),
  food_pref text not null default 'any',
  smoking boolean not null default false,
  looking_for looking_for not null default 'both',
  bio text,
  is_opted_in boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table match_prefs enable row level security;

-- Own row always; others only when they opted in (and same college).
create policy "match_prefs: own or opted-in same-college" on match_prefs
  for select to authenticated
  using (
    user_id = auth.uid()
    or (is_opted_in and college_id = get_my_college_id())
  );

create policy "match_prefs: own insert" on match_prefs
  for insert to authenticated
  with check (user_id = auth.uid() and college_id = get_my_college_id());

create policy "match_prefs: own update" on match_prefs
  for update to authenticated using (user_id = auth.uid());

create table match_requests (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  requester_id uuid not null references profiles(id) on delete cascade,
  target_id uuid not null references profiles(id) on delete cascade,
  status match_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (requester_id, target_id),
  check (requester_id <> target_id)
);

alter table match_requests enable row level security;

create policy "match_requests: involved read" on match_requests
  for select to authenticated
  using (requester_id = auth.uid() or target_id = auth.uid());

create policy "match_requests: requester insert" on match_requests
  for insert to authenticated
  with check (requester_id = auth.uid() and college_id = get_my_college_id());

create policy "match_requests: involved update" on match_requests
  for update to authenticated
  using (requester_id = auth.uid() or target_id = auth.uid());
