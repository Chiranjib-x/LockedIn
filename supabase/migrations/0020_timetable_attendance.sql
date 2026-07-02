-- Timetable + attendance (Phases 24-25, pulled forward as the daily-open
-- anchor). Freeform weekly entries — no rigid per-college slot_config;
-- students already know their own class times, so a start/end time picker
-- covers FFCS-style and generic-hourly colleges alike without seed data.
-- course_code is plain text, not FK'd to a shared courses table (that's
-- Phase 23, for crowd-sourced marketplace tagging — unrelated goal, skip
-- until it's actually needed).

alter table colleges add column attendance_threshold int not null default 75;

create table timetable_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  college_id uuid not null references colleges(id),
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  starts_at time not null,
  ends_at time not null,
  course_code text not null,
  title text not null,
  venue text,
  min_attendance int, -- per-course override of colleges.attendance_threshold
  created_at timestamptz not null default now()
);

create index timetable_entries_user_idx on timetable_entries (user_id, day_of_week);

create type attendance_status as enum ('present', 'absent', 'cancelled');

create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  college_id uuid not null references colleges(id),
  course_code text not null,
  date date not null,
  status attendance_status not null,
  created_at timestamptz not null default now(),
  unique (user_id, course_code, date)
);

create index attendance_records_user_idx on attendance_records (user_id, course_code);

alter table timetable_entries enable row level security;
alter table attendance_records enable row level security;

-- Fully private, per-user data (not browsed by others) — still tenancy-tagged
-- per THE TENANCY RULE, but scoping is owner-only, not college-shared.
create policy "timetable_entries: owner only" on timetable_entries
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and college_id = get_my_college_id());

create policy "attendance_records: owner only" on attendance_records
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and college_id = get_my_college_id());
