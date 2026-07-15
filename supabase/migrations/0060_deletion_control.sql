-- 0060: community deletion is app-founder-only. Creators/leads can only
-- REQUEST deletion; the founder acts on it.

-- Deletion request state lives on the row (at most one open request each).
alter table communities
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_requested_by uuid references profiles(id) on delete set null,
  add column if not exists deletion_reason text;

-- A community can now be deleted even if it has posted updates/events: its
-- posts survive as ordinary board posts (community_id nulled), not destroyed.
alter table posts drop constraint if exists posts_community_id_fkey;
alter table posts add constraint posts_community_id_fkey
  foreign key (community_id) references communities(id) on delete set null;

-- Only the app founder may delete. 0017 also let a proposer delete their own
-- unapproved row — that's removed now (not even creators can delete).
drop policy if exists "communities: founder or proposer delete" on communities;
create policy "communities: founder delete" on communities
  for delete to authenticated using (is_app_moderator());

-- Creator or a current lead files a deletion request; every college founder is
-- notified. Definer because leads have no UPDATE grant on communities.
create or replace function request_community_deletion(cid uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare comm record; m record;
begin
  select * into comm from communities where id = cid;
  if comm is null then raise exception 'not found'; end if;
  if not (is_community_moderator(cid) or comm.created_by = auth.uid()) then
    raise exception 'not allowed';
  end if;
  update communities set
    deletion_requested_at = now(),
    deletion_requested_by = auth.uid(),
    deletion_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = cid;
  for m in select id from profiles where college_id = comm.college_id and is_moderator loop
    perform notify(m.id, comm.college_id, 'community',
      '🗑️ Deletion requested for "' || comm.name || '"', '/communities');
  end loop;
end;
$$;
revoke all on function request_community_deletion(uuid, text) from public, anon;
grant execute on function request_community_deletion(uuid, text) to authenticated;
