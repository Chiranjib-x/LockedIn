-- 0036: verified_name — real name derived server-side from the college email.
-- Users can nickname themselves in profiles.name, but verified_name is set
-- only by the signup trigger (and this backfill); no UPDATE path exposes it,
-- so it can't be faked. Format assumed: firstname.lastname2024@domain →
-- "Firstname Lastname" (digits stripped, dots → spaces, title-cased).

alter table profiles add column if not exists verified_name text;

create or replace function derive_verified_name(email text)
returns text
language sql immutable
as $$
  select nullif(
    btrim(regexp_replace(
      initcap(replace(regexp_replace(split_part(email, '@', 1), '\d+', '', 'g'), '.', ' ')),
      '\s+', ' ', 'g'
    )),
    ''
  )
$$;

-- Backfill everyone who already signed up.
update profiles p
set verified_name = derive_verified_name(u.email)
from auth.users u
where u.id = p.id and p.verified_name is null;

-- Pin the column: the "own update" RLS policy covers every column, so without
-- this a user could PATCH verified_name via the API. Any UPDATE keeps the old
-- value. (Admin correction path: drop trigger, fix, recreate.)
create or replace function protect_verified_name()
returns trigger
language plpgsql
as $$
begin
  new.verified_name := old.verified_name;
  return new;
end;
$$;

create trigger keep_verified_name
  before update on profiles
  for each row
  when (new.verified_name is distinct from old.verified_name)
  execute function protect_verified_name();

-- New signups: same trigger that stamps college_id now stamps verified_name.
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  cid uuid;
begin
  select id into cid from colleges
    where email_domain = lower(split_part(new.email, '@', 2));
  if cid is null then
    raise exception 'Signups are restricted to registered college email domains';
  end if;
  insert into profiles (id, college_id, name, verified_name)
  values (
    new.id,
    cid,
    coalesce(new.raw_user_meta_data->>'name', ''),
    derive_verified_name(new.email)
  );
  return new;
end;
$$;
