-- 0042: event check-in. Events already exist as posts(type='event'); this adds
-- an attendance roster an organizer (post author) or a moderator builds by
-- scanning attendee ID-card barcodes. The scanned value ("code") is just the
-- attendance key — works even if it is not a roll number. If an attendee has
-- linked that code to their account (profiles.roll_number), the check-in
-- resolves to their name; otherwise it is recorded as a bare code.

-- Optional, PRIVATE ID link. New column is NOT in 0041's SELECT grant, so it is
-- unreadable through the API by anyone (like room). Owner may set their own
-- (grant UPDATE on just this column; the "own update" RLS policy scopes it to
-- their row) and read it back via my_profile().
alter table profiles add column if not exists roll_number text;
grant update (roll_number) on profiles to authenticated;
create unique index if not exists profiles_roll_per_college on profiles (college_id, roll_number)
  where roll_number is not null;

create table if not exists event_checkins (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  college_id uuid not null references colleges(id),
  code text not null,                              -- scanned barcode value
  attendee_id uuid references profiles(id),        -- resolved iff code == a linked roll_number
  checked_in_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (post_id, code)                           -- idempotent: re-scanning is a no-op
);

create index if not exists event_checkins_post_idx on event_checkins (post_id, created_at desc);

alter table event_checkins enable row level security;

drop policy if exists "event_checkins: organizer or moderator read" on event_checkins;
-- Only the event organizer or a same-college moderator reads the roster.
-- No INSERT policy: rows are created solely by record_checkin() (security
-- definer), so clients cannot forge check-ins.
create policy "event_checkins: organizer or moderator read" on event_checkins
  for select to authenticated
  using (
    exists (
      select 1 from posts p
      where p.id = event_checkins.post_id
        and (
          p.author_id = auth.uid()
          or exists (select 1 from profiles m
                     where m.id = auth.uid() and m.is_moderator
                       and m.college_id = event_checkins.college_id)
        )
    )
  );

-- Record a scan. Authorizes caller (organizer/mod), stamps college server-side,
-- resolves the attendee by their linked roll_number, and is idempotent.
-- Returns the resolved name (null if unlinked) and whether this was a new scan.
create or replace function record_checkin(p_post_id uuid, p_code text)
returns table (attendee_name text, is_new boolean)
language plpgsql security definer set search_path = public as $$
declare
  my_college uuid;
  post_college uuid;
  post_author uuid;
  att uuid;
  affected int;
begin
  p_code := btrim(p_code);
  if p_code = '' then raise exception 'empty code'; end if;

  select college_id into my_college from profiles where id = auth.uid();
  select college_id, author_id into post_college, post_author
    from posts where id = p_post_id and type = 'event';
  if post_college is null then raise exception 'not an event'; end if;
  if post_college <> my_college then raise exception 'wrong college'; end if;
  if not (
    post_author = auth.uid()
    or exists (select 1 from profiles where id = auth.uid()
               and is_moderator and college_id = post_college)
  ) then
    raise exception 'not authorized to check in for this event';
  end if;

  select id into att from profiles
    where roll_number = p_code and college_id = post_college;

  insert into event_checkins (post_id, college_id, code, attendee_id, checked_in_by)
  values (p_post_id, post_college, p_code, att, auth.uid())
  on conflict (post_id, code) do nothing;
  get diagnostics affected = row_count;

  return query select
    (select name from profiles where id = att),
    (affected = 1);
end;
$$;

-- Expose the owner's own roll_number (rebuild my_profile from 0041 + this col).
-- Drop first: adding a return column changes the signature, which
-- create-or-replace cannot do.
drop function if exists my_profile();
create or replace function my_profile()
returns table (
  id uuid, name text, username text, verified_name text,
  batch text, hostel_block text, room text, roll_number text, karma int
)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.username, p.verified_name,
         p.batch, p.hostel_block, p.room, p.roll_number, p.karma
  from profiles p
  where p.id = auth.uid()
$$;
