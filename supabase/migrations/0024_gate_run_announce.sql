-- "I'm heading to the gate": a runner announces a run; requesters with OPEN
-- requests at that gate expected within the next 90 minutes (user picked
-- option b) get one notification. Rate-limited to one announce per runner
-- per 30 minutes, tracked in gate_runs.

create table gate_runs (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  runner_id uuid not null references profiles(id) on delete cascade,
  gate text not null,
  created_at timestamptz not null default now()
);

create index gate_runs_runner_idx on gate_runs (runner_id, created_at desc);

alter table gate_runs enable row level security;

-- THE TENANCY RULE: college-scoped read (future "runner heading out" banner);
-- writes happen only inside announce_gate_run() (security definer).
create policy "gate_runs: same-college read" on gate_runs
  for select to authenticated using (college_id = get_my_college_id());

-- Returns: -1 rate-limited, else number of requesters notified.
create or replace function announce_gate_run(g text)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  cid uuid;
  notified int;
begin
  cid := get_my_college_id();

  if exists (select 1 from gate_runs
             where runner_id = auth.uid()
               and created_at > now() - interval '30 minutes') then
    return -1;
  end if;

  insert into gate_runs (college_id, runner_id, gate) values (cid, auth.uid(), g);

  with targets as (
    select distinct r.requester_id
    from pickup_requests r
    where r.college_id = cid
      and r.status = 'open'
      and r.gate = g
      and r.requester_id <> auth.uid()
      and r.expected_at between now() - interval '15 minutes'
                            and now() + interval '90 minutes'
  )
  select count(*) into notified
  from targets t,
       lateral notify(t.requester_id, cid, 'gate',
         'A runner is heading to ' || g || ' — your parcel might get grabbed 🏃',
         '/gate');

  return notified;
end;
$$;
