# Long-Term Direction — Design Spec

**Date:** 2026-10-21
**Status:** Implemented
**Backlog item:** `docs/product-core.md` §九 #5 (長期方向：三行字 + 累積視圖 + 52 週)

## Summary

OKR asked people to declare goals and keep numbers up to date by hand. The
need under it — a long-term direction — is real, but the answer is to *show
the trajectory the 42 blocks already trace*, not to ask for a second plan.

## Decisions

| Topic | Decision |
|-------|----------|
| Direction | At most three lines of text (`directions`, migration 016). No numbers, no deadlines; editing or clearing a line is not failing it. |
| How blocks count | A direction owns activity titles (`direction_titles`). A block counts toward the direction its title belongs to; every other block is "未標". |
| Why titles, not rhythm slots | The doc says to bind directions to the rhythm, tagged once. Tagging the rhythm's *activities* keeps that: it is one decision per activity (typically 5–10), not per slot (up to 42), the titles offered first are the rhythm's, and nothing is asked week by week. It also lets past weeks — and this week's exceptions that reuse a known activity — count without any input. |
| Where it is set | `/direction`: the three lines, then each activity (rhythm titles first, then recently used ones) assigned to a line or to none. Saved as a whole through `replace_directions`, keeping ids so a week's focus survives renaming. |
| 累積視圖 | `/direction` shows the last 12 weeks as stacked bars of blocks per direction plus 未標, against the 42-block week. Each week counts its stored blocks plus the rhythm version it was planned under, read in one range query. |
| 52 週 | The same page shows the year as 52 (or 53) squares; lived weeks take the color of the direction that got the most blocks, and it says how many weeks are left. |
| ④ → ① | The review ends with "下週想把哪個方向的格數拉回來？". The pick is saved as next week's focus (`week_focus`), and that week's dashboard shows it with this week's and last week's block counts. |
| Guests | Directions and focus live in localStorage; the trajectory is computed from the in-memory weeks. |

## Out of scope

- Preselecting the focus direction's activities when planning (the banner
  only reports progress).
- Dropping the old OKR tables.
