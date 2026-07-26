-- FINDINGS F7 (P1): a space with zero members is permanently unreachable —
-- seeing it, being vouched into it, and minting an invite ALL require an
-- existing member, and there is no moderator bypass. VIT Vellore's Girls'
-- Closet and Boys' Den shipped with 0 members, so both were dead on arrival
-- (Demo College was seeded by hand in 0004, which is why testing never caught it).
--
-- Fix: let a college's app moderator (the founder) mint ONE founding invite for
-- an EMPTY space in their own college. Deliberately an invite, not a direct
-- insert: the recipient still opts in by redeeming, so nobody is placed into a
-- gendered, members-only space without consent, and no student directory has to
-- be browsed. Once the first member redeems, the space is non-empty and every
-- rule below reverts to the normal member-vouches-member path.

-- Member-only invite creation, PLUS the founder bootstrap for an empty space.
create or replace function create_space_invite(sid uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  t uuid;
begin
  if not is_space_member(sid) then
    -- Bootstrap is scoped three ways: app moderator, own college, empty space.
    if not (
      is_app_moderator()
      and exists (select 1 from spaces s where s.id = sid and s.college_id = get_my_college_id())
      and not exists (select 1 from space_members where space_id = sid)
    ) then
      raise exception 'not a member of this space';
    end if;
  end if;
  insert into space_invites (space_id, college_id, inviter_id)
  select sid, s.college_id, auth.uid() from spaces s where s.id = sid
  returning token into t;
  return t;
end;
$$;

-- Redemption: the "inviter is still a member" rule must not reject a founding
-- invite, whose inviter is a moderator who was never a member.
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
  if exists (select 1 from space_members
             where space_id = inv.space_id and user_id = auth.uid()) then
    return jsonb_build_object('error', 'You''re already in this space.');
  end if;
  if not exists (select 1 from space_members
                 where space_id = inv.space_id and user_id = inv.inviter_id)
     and not (
       -- Founding invite: moderator of this college, space still empty.
       exists (select 1 from profiles p
               where p.id = inv.inviter_id and p.is_moderator and p.college_id = inv.college_id)
       and not exists (select 1 from space_members where space_id = inv.space_id)
     ) then
    return jsonb_build_object('error', 'The inviter is no longer a member.');
  end if;

  insert into space_members (space_id, user_id, added_by)
  values (inv.space_id, auth.uid(), inv.inviter_id);
  update space_invites set redeemed_by = auth.uid(), redeemed_at = now()
  where token = t;
  return jsonb_build_object('space_id', inv.space_id);
end;
$$;
