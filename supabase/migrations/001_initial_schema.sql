-- BLOCK6 Time Manager - Initial Schema

-- Block types lookup table
create table block_types (
  id serial primary key,
  name text not null unique
);

insert into block_types (name) values ('core'), ('rest'), ('buffer');

-- Week plans
create table week_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  created_at timestamptz not null default now(),
  unique(user_id, week_start)
);

-- Blocks (42 per week plan max)
create table blocks (
  id uuid primary key default gen_random_uuid(),
  week_plan_id uuid not null references week_plans(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  slot smallint not null check (slot between 1 and 6),
  block_type_id int not null references block_types(id),
  title text,
  description text,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'skipped')),
  unique(week_plan_id, day_of_week, slot)
);

-- Diary entries (one per user per day)
create table diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  line_1 text not null,
  line_2 text not null,
  line_3 text not null,
  created_at timestamptz not null default now(),
  unique(user_id, entry_date)
);

-- Week reviews (one per week plan)
create table week_reviews (
  id uuid primary key default gen_random_uuid(),
  week_plan_id uuid not null references week_plans(id) on delete cascade unique,
  reflection text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security policies
-- Users can only access their own data

alter table week_plans enable row level security;
alter table blocks enable row level security;
alter table diary_entries enable row level security;
alter table week_reviews enable row level security;

-- week_plans: users can CRUD their own
create policy "Users can manage own week plans"
  on week_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- blocks: users can CRUD blocks in their own week plans
create policy "Users can manage own blocks"
  on blocks for all
  using (week_plan_id in (select id from week_plans where user_id = auth.uid()))
  with check (week_plan_id in (select id from week_plans where user_id = auth.uid()));

-- diary_entries: users can CRUD their own
create policy "Users can manage own diary entries"
  on diary_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- week_reviews: users can CRUD reviews for their own week plans
create policy "Users can manage own week reviews"
  on week_reviews for all
  using (week_plan_id in (select id from week_plans where user_id = auth.uid()))
  with check (week_plan_id in (select id from week_plans where user_id = auth.uid()));

-- block_types is read-only for everyone
alter table block_types enable row level security;
create policy "Block types are readable by all"
  on block_types for select
  using (true);
