-- Individually invited people, for addresses outside a registered college domain.
--
-- handle_new_user() (0001) refuses any signup whose email domain is not in
-- `colleges`. That guard is why the app can promise "every person here is a
-- verified student of your college", and it is what keeps a gendered space
-- meaningful — so it is not being relaxed.
--
-- The problem it cannot express is a single named person: a collaborator, a
-- designer, an alum. The two ways round it were both bad. Adding gmail.com to
-- `colleges` would let anyone on earth sign up as a VIT student. Disabling the
-- trigger for one INSERT leaves a live database with no record of why an
-- off-domain account exists, and no way to answer "who let them in".
--
-- So: an allowlist of exact addresses, each pinned to the college it grants and
-- stamped with who granted it. The domain rule still runs first and still refuses
-- everyone else. Deleting a row here does NOT remove an existing account — it
-- only stops a future signup — so revoking access means deleting the user.

create table if not exists access_grants (
  email        text primary key,
  college_id   uuid not null references colleges(id),
  granted_by   uuid references profiles(id) on delete set null,
  reason       text,
  created_at   timestamptz not null default now()
);

comment on table access_grants is
  'Exact email addresses allowed to sign up despite not matching a college email domain. Every row is a deliberate exception to the rule in handle_new_user().';

alter table access_grants enable row level security;

-- Readable only by a moderator of the college the grant is for. No INSERT or
-- UPDATE policy: rows are created out-of-band, deliberately, not by the app.
drop policy if exists "access_grants: moderator reads own college" on access_grants;
create policy "access_grants: moderator reads own college" on access_grants
  for select to authenticated
  using (is_app_moderator() and college_id = get_my_college_id());

-- Same guard, one extra clause.
--
-- REBUILT FROM 0037, NOT 0001. The first draft of this migration was rebuilt from
-- 0001 and silently dropped everything 0037 added — username derivation, the
-- de-duplication loop, and verified_name — which broke signup for everyone. The
-- lesson is already in STATE twice (0077, 0082): grepping a function name finds
-- the FIRST definition, not the live one. Check for later redefinitions first.
-- Live definition chain: 0001 -> 0036 -> 0037. 0040 only mentions it in a comment.
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

  -- Not a college domain: the only other way in is an explicit, recorded invite.
  if cid is null then
    select college_id into cid from access_grants
      where email = lower(new.email);
  end if;

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
