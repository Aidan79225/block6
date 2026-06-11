-- Attach a block to a project. ON DELETE SET NULL: deleting a project detaches
-- its blocks without deleting them.
alter table blocks
  add column project_id uuid null references projects(id) on delete set null;

create index blocks_project_id_idx on blocks (project_id);
