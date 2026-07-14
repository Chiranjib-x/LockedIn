-- 0040: security hardening (audit 2026-07-14).
--
-- FIX 1 — PRIVILEGE ESCALATION + TENANCY ESCAPE (critical).
-- `profiles: own update` only checks `id = auth.uid()`, and the authenticated
-- role held blanket UPDATE on every column. RLS is row-level, not column-level,
-- so a user could PATCH their OWN row via the REST API and set:
--   college_id   -> jump into another college and read its entire directory
--   is_moderator -> grant themselves moderator powers (ban/remove content)
--   is_banned    -> unban themselves
--   karma        -> fake their trust score
-- Fix at the privilege layer (the only column-level control Postgres gives):
-- drop blanket UPDATE, re-grant ONLY the columns a user may legitimately edit.
-- karma/is_banned/college_id are still written by SECURITY DEFINER functions
-- (apply_karma_event, mod_ban_user, handle_new_user), which run as the function
-- owner and are unaffected by these grants.
revoke update on profiles from authenticated, anon;
grant update (name, batch, hostel_block, room, avatar_url, username)
  on profiles to authenticated;

-- FIX 2 — BLOCK BYPASS (high).
-- Blocks were only checked in find_or_create_dm (conversation CREATION). Once a
-- DM existed, "messages: participant send" checked participant + not-banned and
-- never consulted `blocks` — so blocking someone you'd already chatted with did
-- nothing: they kept sending, and you kept getting realtime + push notifications.
-- Enforce it on every send. Scoped to 1:1 DMs on purpose: one member blocking
-- you should not silence you in a whole study-group thread.
create or replace function dm_blocked(conv uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select (select count(*) from conversation_participants where conversation_id = conv) = 2
    and exists (
      select 1
      from conversation_participants p
      join blocks b
        on (b.blocker_id = auth.uid() and b.blocked_id = p.user_id)
        or (b.blocker_id = p.user_id and b.blocked_id = auth.uid())
      where p.conversation_id = conv
        and p.user_id <> auth.uid()
    )
$$;

drop policy "messages: participant send" on messages;
create policy "messages: participant send" on messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and is_conversation_participant(conversation_id)
    and not is_banned()
    and not dm_blocked(conversation_id)
  );
