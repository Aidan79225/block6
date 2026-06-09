-- OKR foundation: cycles, objectives, key_results

create table okr_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

create index okr_cycles_user_id_idx on okr_cycles (user_id);

create table objectives (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references okr_cycles(id) on delete cascade,
  title text not null,
  description text not null default '',
  position int not null check (position >= 0),
  created_at timestamptz not null default now()
);

create index objectives_cycle_id_idx on objectives (cycle_id);

create table key_results (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references objectives(id) on delete cascade,
  title text not null,
  unit text not null default '',
  target_value numeric not null check (target_value > 0),
  current_value numeric not null default 0 check (current_value >= 0),
  position int not null check (position >= 0),
  created_at timestamptz not null default now()
);

create index key_results_objective_id_idx on key_results (objective_id);

-- RLS: a user can only touch OKR rows belonging to their own cycles.
alter table okr_cycles enable row level security;

create policy "Users manage own okr cycles"
  on okr_cycles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table objectives enable row level security;

create policy "Users manage own objectives"
  on objectives for all
  using (
    cycle_id in (select id from okr_cycles where user_id = auth.uid())
  )
  with check (
    cycle_id in (select id from okr_cycles where user_id = auth.uid())
  );

alter table key_results enable row level security;

create policy "Users manage own key results"
  on key_results for all
  using (
    objective_id in (
      select o.id from objectives o
      join okr_cycles c on c.id = o.cycle_id
      where c.user_id = auth.uid()
    )
  )
  with check (
    objective_id in (
      select o.id from objectives o
      join okr_cycles c on c.id = o.cycle_id
      where c.user_id = auth.uid()
    )
  );
