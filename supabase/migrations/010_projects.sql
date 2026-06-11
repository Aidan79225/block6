-- GTD projects: standalone projects with an ordered step checklist

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  key_result_id uuid null references key_results(id) on delete set null,
  status text not null default 'active',
  position int not null check (position >= 0),
  created_at timestamptz not null default now()
);

create index projects_user_id_idx on projects (user_id);

create table project_steps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  position int not null check (position >= 0),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index project_steps_project_id_idx on project_steps (project_id);

-- RLS: a user can only touch their own projects and their steps.
alter table projects enable row level security;

create policy "Users manage own projects"
  on projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table project_steps enable row level security;

create policy "Users manage own project steps"
  on project_steps for all
  using (
    project_id in (select id from projects where user_id = auth.uid())
  )
  with check (
    project_id in (select id from projects where user_id = auth.uid())
  );
