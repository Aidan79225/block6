-- Deleting a block from a locked day is a change of plan like editing or
-- moving one, so it is logged too.

alter table plan_changes drop constraint plan_changes_action_check;

alter table plan_changes
  add constraint plan_changes_action_check
  check (action in ('edit', 'move', 'add', 'delete'));
