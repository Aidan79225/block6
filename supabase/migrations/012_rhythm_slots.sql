-- Rhythm-first planning.
--
-- Most of a week never changes (see docs/product-core.md): the recurring
-- rhythm is the default, and a week stores only what differs from it. A brand
-- new week therefore costs zero writes — it is projected from rhythm_slots.

create table rhythm_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  slot smallint not null check (slot between 1 and 6),
  block_type_id int not null references block_types(id),
  title text not null default '',
  description text not null default '',
  created_at timestamptz not null default now(),
  unique(user_id, day_of_week, slot)
);

alter table rhythm_slots enable row level security;

create policy "Users can manage own rhythm slots"
  on rhythm_slots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- A slot the user deliberately emptied for one week. Without this there is no
-- way to say "I'm off on Wednesday" — the rhythm would just refill the cell.
alter table blocks
  add column suppressed boolean not null default false;
