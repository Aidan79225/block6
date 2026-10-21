-- "Which blocks weren't worth it?" — the weekly review's closing question
-- (docs/product-core.md §五). The answer lives on the block it is about, and
-- feeds next week: copying a week skips regretted blocks.

alter table blocks
  add column regretted boolean not null default false;
