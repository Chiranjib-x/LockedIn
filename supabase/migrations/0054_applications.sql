-- 0054 (Wave F / T2): recruitment applications. Leads define questions; when
-- any exist, joining becomes apply -> lead review -> accept/reject (accept
-- auto-joins). No questions = the old instant self-join stays. Answers are
-- snapshotted into the application (prompts get edited over time).

create table community_questions (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  college_id uuid not null references colleges(id),
  prompt text not null,
  ord int not null default 0,
  created_at timestamptz not null default now()
);

create table community_applications (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  college_id uuid not null references colleges(id),
  answers jsonb not null,               -- [{"q": prompt, "a": answer}]
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
-- One live application per person per community; rejected people may re-apply.
create unique index community_applications_one_pending
  on community_applications (community_id, user_id) where status = 'pending';

alter table community_questions enable row level security;
alter table community_applications enable row level security;

-- Anyone in the college can read the form for an approved community.
create policy "cq: college read" on community_questions
  for select to authenticated
  using (college_id = get_my_college_id());

create policy "cq: moderator write" on community_questions
  for insert to authenticated
  with check (college_id = get_my_college_id() and (is_app_moderator() or is_community_moderator(community_id)));

create policy "cq: moderator delete" on community_questions
  for delete to authenticated
  using (is_app_moderator() or is_community_moderator(community_id));

-- Applicant sees their own; the community's leads see all of that community's.
create policy "ca: own or lead read" on community_applications
  for select to authenticated
  using (user_id = auth.uid() or is_app_moderator() or is_community_moderator(community_id));

create policy "ca: self apply" on community_applications
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and college_id = get_my_college_id()
    and not is_banned()
    and exists (select 1 from communities c where c.id = community_id and c.is_approved)
  );

-- Withdraw while pending.
create policy "ca: self withdraw" on community_applications
  for delete to authenticated
  using (user_id = auth.uid() and status = 'pending');

-- Decisions go through the definer RPC so accept can insert the membership
-- atomically; there is deliberately NO update policy.
create or replace function decide_application(app_id uuid, accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare app record;
begin
  select * into app from community_applications where id = app_id and status = 'pending';
  if app is null then raise exception 'no pending application'; end if;
  if not (is_app_moderator() or is_community_moderator(app.community_id)) then
    raise exception 'not allowed';
  end if;
  update community_applications
     set status = case when accept then 'accepted' else 'rejected' end, decided_at = now()
   where id = app_id;
  if accept then
    insert into community_members (community_id, user_id, role)
    values (app.community_id, app.user_id, 'member')
    on conflict (community_id, user_id) do nothing;
  end if;
  perform notify(app.user_id, app.college_id, 'community',
    case when accept
      then '🎉 You''re in — your application to ' || (select name from communities where id = app.community_id) || ' was accepted'
      else 'Your application to ' || (select name from communities where id = app.community_id) || ' wasn''t accepted this time'
    end,
    '/communities/' || app.community_id);
end;
$$;

revoke all on function decide_application(uuid, boolean) from public, anon;
grant execute on function decide_application(uuid, boolean) to authenticated;

-- New pending application -> ping every lead of that community.
create or replace function on_application_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare lead record;
begin
  for lead in select user_id from community_members where community_id = new.community_id and role = 'moderator' loop
    perform notify(lead.user_id, new.college_id, 'community',
      '📩 New application to ' || (select name from communities where id = new.community_id),
      '/communities/' || new.community_id);
  end loop;
  return new;
end;
$$;
create trigger trg_application_created
  after insert on community_applications
  for each row execute function on_application_created();
