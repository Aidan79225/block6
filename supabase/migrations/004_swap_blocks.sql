alter table blocks
  drop constraint blocks_week_plan_id_day_of_week_slot_key;

alter table blocks
  add constraint blocks_week_plan_id_day_of_week_slot_key
  unique (week_plan_id, day_of_week, slot)
  deferrable initially deferred;

create or replace function swap_blocks(block_a uuid, block_b uuid)
returns void
language plpgsql
security invoker
as $$
declare
  a_week_plan uuid;
  a_day smallint;
  a_slot smallint;
  b_week_plan uuid;
  b_day smallint;
  b_slot smallint;
begin
  select week_plan_id, day_of_week, slot
    into a_week_plan, a_day, a_slot
    from blocks where id = block_a;

  select week_plan_id, day_of_week, slot
    into b_week_plan, b_day, b_slot
    from blocks where id = block_b;

  if a_week_plan is null or b_week_plan is null then
    raise exception 'One or both blocks not found';
  end if;

  if a_week_plan <> b_week_plan then
    raise exception 'Blocks must belong to the same week plan';
  end if;

  update blocks set day_of_week = b_day, slot = b_slot where id = block_a;
  update blocks set day_of_week = a_day, slot = a_slot where id = block_b;
end;
$$;
