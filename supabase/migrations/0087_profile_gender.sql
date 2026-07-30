-- An optional, self-described gender on the profile.
--
-- THIS REVERSES A STATED DESIGN DECISION, so it says so out loud. 0004 reads:
-- "No gender is stored anywhere; entry is by member vouch, like the WhatsApp
-- groups this replaces." That was deliberate, and it is what made Her Circle and
-- His Circle safe to build without holding anyone's gender.
--
-- This column does NOT change that. It is profile information the owner types
-- about themselves, and it is deliberately NOT wired to space membership:
--   * nothing reads it to grant or deny access to anything
--   * space entry stays vouch-and-invite based (0004, 0070, 0081, 0082)
-- Gating a women-only space on a self-declared text field would be weaker than a
-- vouch, not stronger, and it would leave non-binary students with no space at
-- all. If that is ever wanted, it needs a product decision, not a column.
--
-- Inclusivity is why there is no CHECK on the VALUES. A fixed enum means someone
-- eventually does not fit it and has to pick a wrong answer. The UI offers common
-- options plus a free-text box; the only constraint here is a length cap, which
-- exists to stop the field being used as a bio.
--
-- Not required, and never prompted for. Null is a first-class answer.

alter table profiles
  add column if not exists gender text;

alter table profiles
  drop constraint if exists profiles_gender_len;
alter table profiles
  add constraint profiles_gender_len
  check (gender is null or char_length(btrim(gender)) between 1 and 40);

comment on column profiles.gender is
  'Optional self-described gender, free text. Read by nothing except the owner''s own profile page — in particular it does NOT govern access to any space.';

-- profiles uses COLUMN-level grants, so a new column needs both. UPDATE alone
-- yields "permission denied for table profiles" the moment anything reads it
-- back, which is how 0074's gate_alerts broke.
grant update (gender) on profiles to authenticated;
grant select (gender) on profiles to authenticated;

-- my_profile() gains a column, and create-or-replace cannot change a return type.
-- Rebuilt from the 0042 definition — NOT 0041, which the profile page's comment
-- points at and which predates roll_number. Rebuilding from 0041 would silently
-- drop that column from the owner's own view.
drop function if exists my_profile();
create or replace function my_profile()
returns table (
  id uuid, name text, username text, verified_name text,
  batch text, hostel_block text, room text, roll_number text, karma int,
  gender text
)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.username, p.verified_name,
         p.batch, p.hostel_block, p.room, p.roll_number, p.karma,
         p.gender
  from profiles p
  where p.id = auth.uid()
$$;

grant execute on function my_profile() to authenticated;
