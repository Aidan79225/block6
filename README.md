# The Block 6

個人實踐專案，啟發自鄭智荷《6區塊黃金比例時間分配法》。

**Live:** <https://block6.aidan.tw>

---

## 關於

一週 42 個區塊（7 天 × 6 區塊），以「區塊」而非「時、分」為單位來規劃時間，把注意力放在「做什麼、為什麼做」而不是「花了多久」。

區塊類型：

| 類型 | 意義 |
|------|------|
| 核心 (Core) | 今天必須完成、對目標有推進的事 |
| 休息 (Rest) | 刻意留給自己的停頓 |
| 緩衝 (Buffer) | 預留給意外、補救、彈性應變 |
| 一般 (General) | 日常事務，不刻意歸入上述三類（預設類型） |

## 功能

- **週計畫：** 42 格 WeekGrid，點擊編輯；長按拖拉交換位置
- **細項任務：** 每個區塊可配子任務清單，checklist + 拖曳排序 + 點擊編輯
- **計時器：** 每個區塊可記錄實際用時，支援即時計時與手動新增時段；全局單一計時器
- **情緒日記：** 當天 3 行簡短日記
- **週回顧：** 完成率、類型分佈、任務用時排行、本週日記彙整、反思編輯
- **全域週任務清單：** 跨週重複檢核的目標（如「每週運動 3 次」），記錄在哪幾週被勾選
- **雙模式儲存：** 未登入用 localStorage，登入後自動遷移到 Supabase，多裝置同步
- **深/淺色主題**（GitHub 色票）

## 技術棧

- **前端：** Next.js 16 (App Router) + TypeScript (strict) + React 19
- **資料層：** Supabase (PostgreSQL + Auth + RLS)
- **架構：** Clean Architecture（`domain` / `infrastructure` / `presentation` 三層）
- **拖拉：** @dnd-kit
- **測試：** Vitest + React Testing Library
- **CI/CD：** GitHub Actions → Vercel

## 本地開發

```bash
pnpm install
cp .env.local.example .env.local   # 填入 Supabase 設定
pnpm dev
```

環境變數：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

資料庫 schema 依序執行 `supabase/migrations/001_initial_schema.sql` 到最新。

常用指令：

```bash
pnpm dev           # 開發
pnpm lint          # ESLint
pnpm type-check    # TypeScript strict 檢查
pnpm test          # Vitest
pnpm format        # Prettier
pnpm build         # 正式打包
```

## 專案結構

```
src/
  domain/            # 業務邏輯，零框架依賴
    entities/
    usecases/
    repositories/    # 介面定義
  infrastructure/
    supabase/        # Supabase 實作
  presentation/
    app/             # Next.js App Router
    components/
    providers/       # React context (Auth, AppState, Notification)
    hooks/

supabase/migrations/ # 逐版 SQL 遷移
docs/superpowers/    # 每個功能的設計規格 (specs) 和實作計畫 (plans)
```

## 授權

MIT（見 LICENSE，如尚未加入請另行補上）。

本專案為對原書方法論的個人學習與實踐。書的著作權屬原作者／出版社所有；本專案未包含任何原書內文。
