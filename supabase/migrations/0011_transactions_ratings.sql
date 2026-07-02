-- Phase 15: transactions + ratings — deals complete TO a person, both sides
-- rate, ratings show on profiles.

create type transaction_context as enum ('marketplace', 'group_buy', 'subscription', 'pickup');

create table transactions (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  context_type transaction_context not null,
  context_id uuid not null,
  party_a uuid not null references profiles(id) on delete cascade, -- provider: seller / organizer / runner
  party_b uuid not null references profiles(id) on delete cascade, -- receiver: buyer / member / requester
  completed_at timestamptz not null default now(),
  check (party_a <> party_b)
);

create index transactions_party_idx on transactions (party_a, party_b);

alter table transactions enable row level security;

create policy "transactions: involved read" on transactions
  for select to authenticated
  using (party_a = auth.uid() or party_b = auth.uid());

-- Marketplace: the seller records the completion (sold TO someone).
-- Pickup transactions come from the trigger below (security definer).
create policy "transactions: provider insert" on transactions
  for insert to authenticated
  with check (party_a = auth.uid() and college_id = get_my_college_id());

-- who bought it, for the sold-to flow
alter table listings add column sold_to_id uuid references profiles(id);

create table ratings (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  transaction_id uuid not null references transactions(id) on delete cascade,
  rater_id uuid not null references profiles(id) on delete cascade,
  ratee_id uuid not null references profiles(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (transaction_id, rater_id)
);

create index ratings_ratee_idx on ratings (ratee_id);

alter table ratings enable row level security;

-- College-scoped reads (stars show on profiles/listings); a rater can insert
-- only for a transaction they were party to, rating the other party.
create policy "ratings: same-college read" on ratings
  for select to authenticated using (college_id = get_my_college_id());

create policy "ratings: party insert" on ratings
  for insert to authenticated
  with check (
    rater_id = auth.uid()
    and college_id = get_my_college_id()
    and exists (
      select 1 from transactions t
      where t.id = transaction_id
        and ((t.party_a = auth.uid() and t.party_b = ratee_id)
          or (t.party_b = auth.uid() and t.party_a = ratee_id))
    )
  );

-- Delivered gate pickups become transactions automatically (runner ↔ requester).
create or replace function pickup_to_transaction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'delivered' and old.status = 'claimed' and old.runner_id is not null then
    insert into transactions (college_id, context_type, context_id, party_a, party_b)
    values (new.college_id, 'pickup', new.id, old.runner_id, new.requester_id);
  end if;
  return new;
end;
$$;
create trigger trg_pickup_to_transaction
  after update on pickup_requests
  for each row execute function pickup_to_transaction();

-- Both parties get nudged to rate (rides the Phase 12 notification rails).
create or replace function notify_rate_transaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  a_name text; b_name text;
begin
  select name into a_name from profiles where id = new.party_a;
  select name into b_name from profiles where id = new.party_b;
  perform notify(new.party_a, new.college_id, 'rating',
    '⭐ How was your deal with ' || b_name || '? Leave a rating', '/rate/' || new.id);
  perform notify(new.party_b, new.college_id, 'rating',
    '⭐ How was your deal with ' || a_name || '? Leave a rating', '/rate/' || new.id);
  return new;
end;
$$;
create trigger trg_notify_rate_transaction
  after insert on transactions
  for each row execute function notify_rate_transaction();
