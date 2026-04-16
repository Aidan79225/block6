-- Plan change log: append-only record of reasons for modifying today's plan

create table plan_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_key date not null,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  slot smallint not null check (slot between 1 and 6),
  block_title_snapshot text not null,
  action text not null check (action in ('edit', 'move', 'add')),
  reason text not null,
  created_at timestamptz not null default now()
);

create index plan_changes_user_week_idx on plan_changes (user_id, week_key);

alter table plan_changes enable row level security;

create policy plan_changes_select_own on plan_changes
  for select using (auth.uid() = user_id);

create policy plan_changes_insert_own on plan_changes
  for insert with check (auth.uid() = user_id);
