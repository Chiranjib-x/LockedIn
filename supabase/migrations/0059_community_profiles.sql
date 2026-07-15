-- 0059: make chapters a distinct type, and give every club/chapter/team a
-- real profile — logo, editable description, and an achievements list.

alter type community_category add value if not exists 'chapter';

alter table communities add column if not exists logo_url text;

-- Leads edit their own community's presentation (never is_official/is_approved/
-- category — those stay founder-controlled). Definer so we don't have to open
-- the row-level UPDATE policy, which would expose the protected columns.
create or replace function update_community_profile(
  cid uuid, p_name text, p_emoji text, p_logo_url text, p_description text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not (is_app_moderator() or is_community_moderator(cid)) then
    raise exception 'not allowed';
  end if;
  update communities set
    name        = coalesce(nullif(trim(p_name), ''), name),      -- name can't be blanked
    emoji       = coalesce(nullif(trim(p_emoji), ''), emoji),
    logo_url    = nullif(trim(coalesce(p_logo_url, '')), ''),     -- clearable
    description = nullif(trim(coalesce(p_description, '')), '')    -- clearable
  where id = cid;
end;
$$;
revoke all on function update_community_profile(uuid, text, text, text, text) from public, anon;
grant execute on function update_community_profile(uuid, text, text, text, text) to authenticated;

-- Achievements — a public wall on the community page (prizes, milestones).
create table community_achievements (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  college_id uuid not null references colleges(id),
  title text not null,
  detail text,
  year text,                       -- freeform: "2024", "2023-24"
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table community_achievements enable row level security;

-- Visible to the whole college (the community page is college-visible).
create policy "achievements: college read" on community_achievements
  for select to authenticated using (college_id = get_my_college_id());
create policy "achievements: lead insert" on community_achievements
  for insert to authenticated
  with check (college_id = get_my_college_id() and (is_app_moderator() or is_community_moderator(community_id)));
create policy "achievements: lead delete" on community_achievements
  for delete to authenticated
  using (is_app_moderator() or is_community_moderator(community_id));
