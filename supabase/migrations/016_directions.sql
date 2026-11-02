-- Long-term directions (docs/product-core.md §七), in place of OKR: up to
-- three lines of text, no targets, no deadlines. A direction owns the
-- activity titles that move it forward; blocks with those titles count
-- toward it, so the weeks show its trajectory without any tagging per week.

create table directions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position smallint not null check (position between 0 and 2),
  text text not null check (length(trim(text)) > 0),
  created_at timestamptz not null default now()
);

alter table directions enable row level security;

create policy "Users can manage own directions"
  on directions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table direction_titles (
  direction_id uuid not null references directions(id) on delete cascade,
  title text not null,
  primary key (direction_id, title)
);

alter table direction_titles enable row level security;

create policy "Users can manage own direction titles"
  on direction_titles for all
  using (direction_id in (select id from directions where user_id = auth.uid()))
  with check (direction_id in (select id from directions where user_id = auth.uid()));

-- The direction a week sets out to give more time to: the weekly review's
-- answer to "下週想把哪個方向的格數拉回來？".
create table week_focus (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  direction_id uuid not null references directions(id) on delete cascade,
  primary key (user_id, week_start)
);

alter table week_focus enable row level security;

create policy "Users can manage own week focus"
  on week_focus for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Save a user's directions as a whole, in one transaction. Directions left
-- out are deleted (with their titles and week focus); the rest keep their
-- ids, so a week's focus survives renaming its direction.
create or replace function replace_directions(p_directions jsonb)
returns void
language plpgsql
security invoker
as $$
begin
  delete from directions
    where user_id = auth.uid()
      and id not in (
        select (d ->> 'id')::uuid from jsonb_array_elements(p_directions) d
      );

  insert into directions (id, user_id, position, text)
    select (d ->> 'id')::uuid, auth.uid(), (d ->> 'position')::smallint, d ->> 'text'
    from jsonb_array_elements(p_directions) d
  on conflict (id) do update
    set position = excluded.position, text = excluded.text;

  delete from direction_titles
    where direction_id in (select id from directions where user_id = auth.uid());

  insert into direction_titles (direction_id, title)
    select (d ->> 'id')::uuid, t
    from jsonb_array_elements(p_directions) d,
         jsonb_array_elements_text(d -> 'titles') t;
end;
$$;
