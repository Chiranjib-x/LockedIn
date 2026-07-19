-- 0064 (Suite Phase 2): lightweight runner→requester coordination for
-- GateRunner. One optional note from the claimed runner ("blue shirt, gate 2,
-- 5 min away") shown on the requester's card + pushed as a gate notification
-- (which 0063 routes to the GateRunner app when installed).

alter table pickup_requests add column if not exists runner_note text;

create or replace function set_runner_note(rid uuid, note text)
returns void language plpgsql security definer set search_path = public as $$
declare req record;
begin
  select * into req from pickup_requests where id = rid;
  if req is null then raise exception 'not found'; end if;
  if req.runner_id is distinct from auth.uid() then raise exception 'not your pickup'; end if;
  if req.status <> 'claimed' then raise exception 'not active'; end if;
  update pickup_requests set runner_note = nullif(trim(coalesce(note, '')), '') where id = rid;
  if nullif(trim(coalesce(note, '')), '') is not null then
    perform notify(req.requester_id, req.college_id, 'gate',
      '📝 Your runner: ' || left(trim(note), 120), '/gate');
  end if;
end;
$$;
revoke all on function set_runner_note(uuid, text) from public, anon;
grant execute on function set_runner_note(uuid, text) to authenticated;
