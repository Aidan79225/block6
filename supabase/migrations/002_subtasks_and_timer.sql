-- Subtasks
create table subtasks (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references blocks(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  position smallint not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique(block_id, position)
);

-- Timer sessions
create table timer_sessions (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references blocks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds int
);

-- Partial index to enforce a single active session per user
create unique index timer_sessions_one_active_per_user
  on timer_sessions (user_id)
  where ended_at is null;

-- RLS for subtasks
alter table subtasks enable row level security;

create policy "Users can manage own subtasks"
  on subtasks for all
  using (
    block_id in (
      select b.id from blocks b
      join week_plans w on w.id = b.week_plan_id
      where w.user_id = auth.uid()
    )
  )
  with check (
    block_id in (
      select b.id from blocks b
      join week_plans w on w.id = b.week_plan_id
      where w.user_id = auth.uid()
    )
  );

-- RLS for timer_sessions
alter table timer_sessions enable row level security;

create policy "Users can manage own timer sessions"
  on timer_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
