-- Global per-user weekly tasks
create table weekly_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  position int not null check (position >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index weekly_tasks_active_position
  on weekly_tasks (user_id, position)
  where is_active = true;

-- Completions: one row per (task, week) when checked
create table weekly_task_completions (
  id uuid primary key default gen_random_uuid(),
  weekly_task_id uuid not null references weekly_tasks(id) on delete cascade,
  week_start date not null,
  completed_at timestamptz not null default now(),
  unique (weekly_task_id, week_start)
);

create index weekly_task_completions_week_start
  on weekly_task_completions (week_start);

-- RLS
alter table weekly_tasks enable row level security;

create policy "Users manage own weekly tasks"
  on weekly_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table weekly_task_completions enable row level security;

create policy "Users manage own task completions"
  on weekly_task_completions for all
  using (
    weekly_task_id in (
      select id from weekly_tasks where user_id = auth.uid()
    )
  )
  with check (
    weekly_task_id in (
      select id from weekly_tasks where user_id = auth.uid()
    )
  );
