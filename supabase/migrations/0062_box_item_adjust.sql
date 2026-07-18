-- 0062: atomic +/- for box items. The UI's take-out/put-in buttons must not
-- send an absolute quantity computed from a possibly-stale client view — two
-- fast taps (or two leads at once) would race and clobber each other. Adjust
-- by a delta in SQL instead: quantity = greatest(0, quantity + delta).
create or replace function adjust_box_item(iid uuid, delta int)
returns void language plpgsql security definer set search_path = public as $$
declare comm uuid;
begin
  select community_id into comm from community_box_items where id = iid;
  if comm is null then raise exception 'not found'; end if;
  if not (is_app_moderator() or is_community_moderator(comm)) then
    raise exception 'not allowed';
  end if;
  update community_box_items set quantity = greatest(0, quantity + delta) where id = iid;
end;
$$;
revoke all on function adjust_box_item(uuid, int) from public, anon;
grant execute on function adjust_box_item(uuid, int) to authenticated;
