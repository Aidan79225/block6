# 待重構與已知問題

Code review 找到、但超出單次修正範圍的項目。修掉一項就把它刪掉。

## 待重構

- **`app-state-provider.tsx` 過大（約 2000 行）且直接呼叫 `database.ts`。**
  區塊的複製、套用範本、節奏格實體化（`materializeBlock`）、訪客資料遷移都繞過
  repository 介面，違反 CLAUDE.md 的分層規則。方向：把這些寫入搬進
  `BlockRepository` 與對應的 use case，provider 只保留狀態與樂觀更新；
  順便依功能（區塊、節奏、日記）拆成幾個 provider。
- **provider 沒有測試環境。** 刪除、移動、複製、遷移這些跨多次寫入的流程
  目前只能靠純函式（`planBlockMove`、`rhythmSlotsForWeek`…）覆蓋決策部分，
  寫入順序與失敗回復沒有測試。上一項完成後，可用 in-memory repository 測。

## 已知問題

- **OKR / Projects 的資料表還在。** 程式碼已移除，但 `okr_cycles`、`objectives`、
  `key_results`、`projects`、`project_steps` 與 `blocks.key_result_id`、
  `blocks.project_id`、`weekly_tasks.key_result_id` 都保留，以免刪掉使用者的資料。
  確認資料不再需要（或已匯出）後，再加一個 drop 的 migration。

- **訪客無法拖曳移動或交換區塊。** `moveBlock`／`swapBlocks` 只更新登入狀態
  的 `supaBlocks`，訪客的 localStorage 沒有對應寫入，所以拖曳後什麼都沒變。
  早於節奏功能就存在。
