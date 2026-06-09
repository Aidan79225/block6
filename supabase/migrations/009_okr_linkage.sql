-- OKR linkage: attach blocks and weekly tasks to key results.
-- ON DELETE SET NULL: deleting a key result detaches linked rows without deleting them.

alter table blocks
  add column key_result_id uuid references key_results(id) on delete set null;

create index blocks_key_result_id_idx on blocks (key_result_id);

alter table weekly_tasks
  add column key_result_id uuid references key_results(id) on delete set null;

create index weekly_tasks_key_result_id_idx on weekly_tasks (key_result_id);
