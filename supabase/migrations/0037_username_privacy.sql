-- 0037: unique usernames + drop contact_pref (privacy pass, user directive 2026-07-13).
-- People are found ONLY by exact username — name-based people search is removed
-- in the app. contact_pref (WhatsApp number sharing) is removed outright; chat
-- is the only contact channel.

-- ── Usernames ──────────────────────────────────────────────────────────────
alter table profiles add column if not exists username text;

-- Format: 3-20 chars, lowercase letters/digits/underscore. Stored lowercase,
-- so a plain unique index is case-insensitive in practice.
alter table profiles add constraint username_format
  check (username ~ '^[a-z0-9_]{3,20}$');

create unique index if not exists profiles_username_key on profiles (username);

-- Derive a valid candidate from an email local part: strip non-alnum to '_',
-- trim to 20, pad short ones. Collisions get a numeric suffix by the caller.
create or replace function derive_username(email text)
returns text language sql immutable as $$
  select left(
    -- rpad only when too short; underscores collapse to one
    case when length(base) < 3 then rpad(base, 3, '0') else base end,
    20
  ) from (
    select regexp_replace(
      regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9_]+', '_', 'g'),
      '_{2,}', '_', 'g'
    ) as base
  ) s
$$;

-- Backfill existing users; suffix on collision.
do $$
declare
  r record;
  cand text;
  n int;
begin
  for r in
    select p.id, u.email from profiles p join auth.users u on u.id = p.id
    where p.username is null
  loop
    cand := derive_username(r.email);
    n := 1;
    while exists (select 1 from profiles where username = cand) loop
      cand := left(derive_username(r.email), 20 - length(n::text)) || n::text;
      n := n + 1;
    end loop;
    update profiles set username = cand where id = r.id;
  end loop;
end;
$$;

alter table profiles alter column username set not null;

-- New signups get one automatically (same collision-suffix scheme).
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  cid uuid;
  cand text;
  n int := 1;
begin
  select id into cid from colleges
    where email_domain = lower(split_part(new.email, '@', 2));
  if cid is null then
    raise exception 'Signups are restricted to registered college email domains';
  end if;
  cand := derive_username(new.email);
  while exists (select 1 from profiles where username = cand) loop
    cand := left(derive_username(new.email), 20 - length(n::text)) || n::text;
    n := n + 1;
  end loop;
  insert into profiles (id, college_id, name, verified_name, username)
  values (
    new.id,
    cid,
    coalesce(new.raw_user_meta_data->>'name', ''),
    derive_verified_name(new.email),
    cand
  );
  return new;
end;
$$;

-- Exact-username lookup, college-scoped. Used by search instead of name ilike
-- so you can only contact someone whose username you already know.
create or replace function find_by_username(uname text)
returns table (id uuid, name text, verified_name text, username text, hostel_block text, karma int)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.verified_name, p.username, p.hostel_block, p.karma
  from profiles p
  where p.username = lower(trim(uname))
    and p.college_id = get_my_college_id()
    and not p.is_banned
$$;

-- ── WhatsApp-number sharing: retire, don't drop (yet) ──────────────────────
-- New code stops reading and writing contact_pref, so the feature is gone at
-- the app layer. The COLUMN stays until every deployed build is on this code —
-- dropping it while an old build still `select`s it makes those queries error
-- and every listing/post detail page 404s ("Nothing here"). Drop it in a
-- follow-up migration AFTER prod is deployed on the new build.
