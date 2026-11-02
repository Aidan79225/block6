-- Version the rhythm.
--
-- 012 kept a single rhythm per user and only projected it onto the current
-- and future weeks, so once a week ended every rhythm cell nobody had touched
-- vanished from it — and from its weekly review. Projecting the one rhythm
-- backwards instead would let a later change rewrite weeks already lived.
--
-- A rhythm is now a series of versions. Each governs every week from
-- effective_from (a Monday) until a later version takes over, so a week keeps
-- the rhythm it was planned under for good.

create table rhythm_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_from date not null check (extract(isodow from effective_from) = 1),
  created_at timestamptz not null default now(),
  unique(user_id, effective_from)
);

alter table rhythm_versions enable row level security;

create policy "Users can manage own rhythm versions"
  on rhythm_versions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Every existing rhythm becomes a first version, effective from the week it
-- was set.
alter table rhythm_slots
  add column version_id uuid references rhythm_versions(id) on delete cascade;

insert into rhythm_versions (user_id, effective_from)
  select user_id, date_trunc('week', min(created_at))::date
  from rhythm_slots
  group by user_id;

update rhythm_slots s
  set version_id = v.id
  from rhythm_versions v
  where v.user_id = s.user_id;

alter table rhythm_slots alter column version_id set not null;

-- Slots now belong to a version, which carries the owner.
drop policy "Users can manage own rhythm slots" on rhythm_slots;
alter table rhythm_slots drop constraint rhythm_slots_user_id_day_of_week_slot_key;
alter table rhythm_slots drop column user_id;
alter table rhythm_slots add unique (version_id, day_of_week, slot);

create policy "Users can manage own rhythm slots"
  on rhythm_slots for all
  using (version_id in (select id from rhythm_versions where user_id = auth.uid()))
  with check (version_id in (select id from rhythm_versions where user_id = auth.uid()));

-- Adopt a rhythm version in one transaction. Versions starting on or after it
-- are replaced (adopting twice before it takes effect keeps the last one), and
-- a failure part-way leaves the previous rhythm intact.
create or replace function replace_rhythm(
  p_id uuid,
  p_effective_from date,
  p_slots jsonb
)
returns void
language plpgsql
security invoker
as $$
begin
  delete from rhythm_versions
    where user_id = auth.uid() and effective_from >= p_effective_from;

  insert into rhythm_versions (id, user_id, effective_from)
    values (p_id, auth.uid(), p_effective_from);

  insert into rhythm_slots
    (version_id, day_of_week, slot, block_type_id, title, description)
  select
    p_id,
    (s ->> 'day_of_week')::smallint,
    (s ->> 'slot')::smallint,
    (s ->> 'block_type_id')::int,
    coalesce(s ->> 'title', ''),
    coalesce(s ->> 'description', '')
  from jsonb_array_elements(p_slots) as s;
end;
$$;
