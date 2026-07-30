-- Ask to join a circle; a human decides.
--
-- Until now the only doors into a members-only space were an invite link (0070)
-- and a moderator adding you directly (0081/0082). Both start with someone who is
-- already inside. A student who is not in either circle and wants to be had no way
-- to say so — they had to know somebody.
--
-- WHY THIS IS NOT A GENDER CHECK. 0087 added profiles.gender, and it would be easy
-- to route requests by it. Deliberately not done:
--   * a self-typed text field is weaker evidence than a person's judgement, so
--     auto-approving on it would make a women-only space LESS safe, not more;
--   * any fixed mapping leaves non-binary students with no circle at all.
-- So anyone may request EITHER circle, nothing here inspects gender, and a
-- moderator (or the space's own lead) approves. That keeps 0004's rule intact:
-- entry is by vouch, and no gender governs access to anything.
--
-- A request is not membership and leaks nothing: a pending row is visible only to
-- the requester and to the people who can decide it.

create table if not exists space_join_requests (
  id          uuid primary key default gen_random_uuid(),
  college_id  uuid not null references colleges(id),
  space_id    uuid not null references spaces(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  note        text check (note is null or char_length(note) <= 280),
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'declined')),
  created_at  timestamptz not null default now(),
  decided_by  uuid references profiles(id) on delete set null,
  decided_at  timestamptz
);

-- One live request per person per space. Decided rows stay as history, so the
-- index is partial rather than a plain unique constraint.
create unique index if not exists space_join_requests_one_pending
  on space_join_requests (space_id, user_id) where status = 'pending';

create index if not exists space_join_requests_pending_idx
  on space_join_requests (college_id, status);

alter table space_join_requests enable row level security;

-- Readable by the requester, by a moderator of that college, and by the space's
-- own lead — exactly the people who are party to the decision.
drop policy if exists "space_join_requests: read own or decidable" on space_join_requests;
create policy "space_join_requests: read own or decidable" on space_join_requests
  for select to authenticated
  using (
    user_id = auth.uid()
    or is_space_lead(space_id)
    or (is_app_moderator() and college_id = get_my_college_id())
  );

-- Writes go exclusively through the definer RPCs below; there is no INSERT or
-- UPDATE policy, so a client cannot self-approve by PATCHing status.

-- Every space at the caller's college, whether they are in it, and whether they
-- already have a request outstanding. `spaces` itself is member-only under RLS,
-- which is why a non-member could not even see what there was to ask for.
create or replace function list_joinable_spaces()
returns table (
  id uuid, name text, emoji text, description text,
  member_count bigint, i_am_member boolean, request_status text
)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.emoji, s.description,
         (select count(*) from space_members m where m.space_id = s.id),
         exists (select 1 from space_members m
                  where m.space_id = s.id and m.user_id = auth.uid()),
         (select r.status from space_join_requests r
           where r.space_id = s.id and r.user_id = auth.uid()
           order by r.created_at desc limit 1)
  from spaces s
  where s.college_id = (select college_id from profiles where id = auth.uid())
  order by s.name
$$;

create or replace function request_space_join(p_space uuid, p_note text default null)
returns text
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  space_college uuid;
  space_name text;
  who text;
begin
  select college_id into cid from profiles where id = auth.uid();
  select s.college_id, s.name into space_college, space_name from spaces s where s.id = p_space;
  if space_college is null or space_college <> cid then
    raise exception 'That space belongs to another college.';
  end if;
  if exists (select 1 from space_members where space_id = p_space and user_id = auth.uid()) then
    return 'already_member';
  end if;
  if exists (select 1 from space_join_requests
              where space_id = p_space and user_id = auth.uid() and status = 'pending') then
    return 'already_pending';
  end if;

  insert into space_join_requests (college_id, space_id, user_id, note)
  values (cid, p_space, auth.uid(), nullif(btrim(coalesce(p_note, '')), ''));

  -- Tell the people who can act on it, so a request is not left sitting unseen.
  select coalesce(name, 'A student') into who from profiles where id = auth.uid();
  perform notify(p.id, cid, 'space',
                 who || ' asked to join ' || space_name || '.',
                 '/admin/spaces')
  from profiles p
  where p.college_id = cid and p.is_moderator and p.id <> auth.uid();

  return 'requested';
end $$;

create or replace function decide_space_join(p_request uuid, p_approve boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r record;
  cid uuid;
  is_mod boolean;
  space_name text;
begin
  select * into r from space_join_requests where id = p_request;
  if r is null then
    raise exception 'That request no longer exists.';
  end if;
  if r.status <> 'pending' then
    raise exception 'That request has already been decided.';
  end if;

  select (p.is_moderator), p.college_id into is_mod, cid from profiles p where p.id = auth.uid();
  if not ((is_mod and r.college_id = cid) or is_space_lead(r.space_id)) then
    raise exception 'Only a moderator or this space''s lead can decide this.';
  end if;

  select s.name into space_name from spaces s where s.id = r.space_id;

  update space_join_requests
     set status = case when p_approve then 'approved' else 'declined' end,
         decided_by = auth.uid(),
         decided_at = now()
   where id = p_request;

  if p_approve then
    insert into space_members (space_id, user_id, added_by)
    values (r.space_id, r.user_id, auth.uid())
    on conflict do nothing;
    perform notify(r.user_id, r.college_id, 'space',
                   'You are in ' || space_name || '. You can leave any time.',
                   '/spaces/' || r.space_id::text);
  else
    -- Say it plainly and without a reason, rather than leaving them wondering.
    perform notify(r.user_id, r.college_id, 'space',
                   'Your request to join ' || space_name || ' was not approved.',
                   '/home');
  end if;
end $$;

-- Pending requests with the requester's name, for whoever can decide them. The
-- founder is not a member of these spaces, so this has to be definer.
create or replace function pending_space_requests()
returns table (
  id uuid, space_id uuid, space_name text, user_id uuid,
  name text, username text, note text, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select r.id, r.space_id, s.name, r.user_id, p.name, p.username, r.note, r.created_at
  from space_join_requests r
  join spaces s   on s.id = r.space_id
  join profiles p on p.id = r.user_id
  where r.status = 'pending'
    and (
      is_space_lead(r.space_id)
      or (is_app_moderator() and r.college_id = get_my_college_id())
    )
  order by r.created_at
$$;

grant select on space_join_requests to authenticated;
grant execute on function list_joinable_spaces()                to authenticated;
grant execute on function request_space_join(uuid, text)        to authenticated;
grant execute on function decide_space_join(uuid, boolean)      to authenticated;
grant execute on function pending_space_requests()              to authenticated;
