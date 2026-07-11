-- Sealed vouching: invites replace the search-a-name vouch flow.
-- Why: the old AddMember UI had members search the whole college's profiles
-- by name — a directory-browsing surface the space feature never needed.
-- Now a member generates a single-use, 7-day invite link and shares it
-- out-of-band (exactly how these WhatsApp groups actually grow). The token
-- is a random uuid: unguessable capability, stateful so it's one-shot,
-- revocable-by-expiry, and auditable (who invited whom, when).

create table space_invites (
  token uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  college_id uuid not null references colleges(id),
  inviter_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  redeemed_by uuid references profiles(id),
  redeemed_at timestamptz
);

create index space_invites_space_idx on space_invites (space_id, created_at desc);

alter table space_invites enable row level security;

-- Inviters can review their own invites; everything else goes through RPCs.
create policy "space_invites: own read" on space_invites
  for select to authenticated using (inviter_id = auth.uid());

-- Member-only invite creation (the invariant the old INSERT policy held).
create or replace function create_space_invite(sid uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  t uuid;
begin
  if not is_space_member(sid) then
    raise exception 'not a member of this space';
  end if;
  insert into space_invites (space_id, college_id, inviter_id)
  select sid, s.college_id, auth.uid() from spaces s where s.id = sid
  returning token into t;
  return t;
end;
$$;

-- Returns jsonb: { "space_id": uuid } on success, { "error": text } otherwise.
-- (The redeemer can't SELECT the invite row under RLS, so success must carry
-- the space_id out through the function itself.)
create or replace function redeem_space_invite(t uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  inv record;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Log in first.');
  end if;
  select * into inv from space_invites where token = t;
  if inv is null then
    return jsonb_build_object('error', 'This invite doesn''t exist.');
  end if;
  if inv.redeemed_at is not null then
    return jsonb_build_object('error', 'This invite was already used — ask for a fresh one.');
  end if;
  if inv.expires_at < now() then
    return jsonb_build_object('error', 'This invite expired — ask for a fresh one.');
  end if;
  if inv.college_id <> get_my_college_id() then
    return jsonb_build_object('error', 'This invite is for a different college.');
  end if;
  if not exists (select 1 from space_members
                 where space_id = inv.space_id and user_id = inv.inviter_id) then
    return jsonb_build_object('error', 'The inviter is no longer a member.');
  end if;
  if exists (select 1 from space_members
             where space_id = inv.space_id and user_id = auth.uid()) then
    return jsonb_build_object('error', 'You''re already in this space.');
  end if;

  insert into space_members (space_id, user_id, added_by)
  values (inv.space_id, auth.uid(), inv.inviter_id);
  update space_invites set redeemed_by = auth.uid(), redeemed_at = now()
  where token = t;
  return jsonb_build_object('space_id', inv.space_id);
end;
$$;

-- The open vouch-by-insert path is what made the directory search necessary;
-- invites own the transition now.
drop policy "space_members: members vouch new members" on space_members;
