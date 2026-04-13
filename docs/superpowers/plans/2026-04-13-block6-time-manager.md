# BLOCK6 Time Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based BLOCK6 time manager with weekly planning (42 blocks), daily execution tracking, 3-line emotion diary, and weekly review.

**Architecture:** Clean Architecture with three layers — `domain` (entities, use cases, repository interfaces), `infrastructure` (Supabase implementations), `presentation` (Next.js App Router + React components). Domain layer has zero framework dependencies.

**Tech Stack:** TypeScript (strict), Next.js (App Router), Supabase (PostgreSQL + Auth), Vitest + React Testing Library, ESLint + Prettier, pnpm, GitHub Actions CI

---

## File Structure

```
time_manager/
├── CLAUDE.md
├── .github/
│   └── workflows/
│       └── ci.yml
├── .gitignore
├── .prettierrc
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── docs/
│   └── superpowers/
│       ├── specs/
│       └── plans/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── block.ts              # Block entity + BlockType enum
│   │   │   ├── week-plan.ts          # WeekPlan entity
│   │   │   ├── diary-entry.ts        # DiaryEntry entity
│   │   │   └── week-review.ts        # WeekReview entity
│   │   ├── usecases/
│   │   │   ├── create-week-plan.ts
│   │   │   ├── update-block.ts
│   │   │   ├── update-block-status.ts
│   │   │   ├── write-diary.ts
│   │   │   ├── create-week-review.ts
│   │   │   └── get-week-summary.ts
│   │   └── repositories/
│   │       ├── week-plan-repository.ts
│   │       ├── block-repository.ts
│   │       ├── diary-repository.ts
│   │       └── week-review-repository.ts
│   ├── infrastructure/
│   │   └── supabase/
│   │       ├── client.ts
│   │       ├── supabase-week-plan-repository.ts
│   │       ├── supabase-block-repository.ts
│   │       ├── supabase-diary-repository.ts
│   │       └── supabase-week-review-repository.ts
│   ├── presentation/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Main dashboard
│   │   │   ├── globals.css
│   │   │   ├── theme.css             # CSS custom properties for themes
│   │   │   └── review/
│   │   │       └── page.tsx          # Weekly review page
│   │   ├── components/
│   │   │   ├── header/
│   │   │   │   ├── header.tsx
│   │   │   │   ├── week-navigator.tsx
│   │   │   │   └── theme-toggle.tsx
│   │   │   ├── week-grid/
│   │   │   │   ├── week-grid.tsx
│   │   │   │   └── block-cell.tsx
│   │   │   ├── day-view/
│   │   │   │   ├── day-view.tsx
│   │   │   │   └── block-card.tsx
│   │   │   ├── side-panel/
│   │   │   │   ├── side-panel.tsx
│   │   │   │   ├── block-editor.tsx
│   │   │   │   ├── status-toggle.tsx
│   │   │   │   └── diary-form.tsx
│   │   │   ├── week-overview/
│   │   │   │   └── week-overview.tsx
│   │   │   └── review/
│   │   │       ├── completion-stats.tsx
│   │   │       ├── block-type-breakdown.tsx
│   │   │       └── reflection-editor.tsx
│   │   ├── hooks/
│   │   │   ├── use-week-plan.ts
│   │   │   ├── use-blocks.ts
│   │   │   ├── use-diary.ts
│   │   │   └── use-theme.ts
│   │   └── providers/
│   │       └── dependency-provider.tsx  # DI context for repositories
│   └── __tests__/
│       ├── domain/
│       │   ├── entities/
│       │   │   ├── block.test.ts
│       │   │   ├── week-plan.test.ts
│       │   │   ├── diary-entry.test.ts
│       │   │   └── week-review.test.ts
│       │   └── usecases/
│       │       ├── create-week-plan.test.ts
│       │       ├── update-block.test.ts
│       │       ├── update-block-status.test.ts
│       │       ├── write-diary.test.ts
│       │       ├── create-week-review.test.ts
│       │       └── get-week-summary.test.ts
│       └── presentation/
│           └── components/
│               ├── block-cell.test.tsx
│               ├── week-grid.test.tsx
│               ├── status-toggle.test.tsx
│               ├── diary-form.test.tsx
│               ├── theme-toggle.test.tsx
│               └── week-navigator.test.tsx
```

---

## Task 1: Project Scaffolding & Tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `.prettierrc`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Initialize Next.js project with TypeScript**

```bash
pnpm create next-app@latest . --typescript --eslint --app --src-dir --no-tailwind --import-alias "@/*" --no-turbopack
```

When prompted, accept defaults. This creates `package.json`, `tsconfig.json`, `next.config.ts`, and initial app files.

- [ ] **Step 2: Configure TypeScript strict mode**

Verify `tsconfig.json` has `"strict": true`. If not, add it under `compilerOptions`.

- [ ] **Step 3: Install dev dependencies**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event prettier eslint-config-prettier
```

- [ ] **Step 4: Create Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create `src/__tests__/setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Create Prettier config**

Create `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 80
}
```

- [ ] **Step 6: Update ESLint config to integrate Prettier**

Replace `eslint.config.mjs` with:

```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "prettier",
  ),
];

export default eslintConfig;
```

- [ ] **Step 7: Add scripts to package.json**

Add to `"scripts"` in `package.json`:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "type-check": "tsc --noEmit",
  "format": "prettier --write \"src/**/*.{ts,tsx}\"",
  "format:check": "prettier --check \"src/**/*.{ts,tsx}\""
}
```

- [ ] **Step 8: Create CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test
```

- [ ] **Step 9: Update .gitignore**

Append to `.gitignore`:

```
.superpowers/
```

- [ ] **Step 10: Verify everything works**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: All pass (test will show "no tests found" — that's OK for now).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with TypeScript, ESLint, Prettier, Vitest, CI"
```

---

## Task 2: Theme System (CSS Custom Properties)

**Files:**
- Create: `src/presentation/app/theme.css`
- Modify: `src/presentation/app/globals.css`
- Modify: `src/presentation/app/layout.tsx`

- [ ] **Step 1: Create theme.css**

Create `src/presentation/app/theme.css`:

```css
:root,
[data-theme="dark"] {
  --color-bg-primary: #1a1a2e;
  --color-bg-secondary: #16213e;
  --color-bg-tertiary: #0f3460;
  --color-text-primary: #e8e8e8;
  --color-text-secondary: #a8b8d8;
  --color-text-muted: #556680;
  --color-accent: #e94560;
  --color-block-core: #4ecca3;
  --color-block-rest: #ffd369;
  --color-block-buffer: #e94560;
  --color-status-completed: #4ecca3;
  --color-status-in-progress: #e94560;
  --color-status-planned: #0f3460;
  --color-status-skipped: #556680;
  --color-border: #2a3a5e;
  --color-panel-bg: #16213e;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

[data-theme="light"] {
  --color-bg-primary: #f5f5f5;
  --color-bg-secondary: #ffffff;
  --color-bg-tertiary: #e8edf4;
  --color-text-primary: #1a1a2e;
  --color-text-secondary: #4a5568;
  --color-text-muted: #a0aec0;
  --color-accent: #e94560;
  --color-block-core: #38b2ac;
  --color-block-rest: #d69e2e;
  --color-block-buffer: #e53e3e;
  --color-status-completed: #38b2ac;
  --color-status-in-progress: #e53e3e;
  --color-status-planned: #e8edf4;
  --color-status-skipped: #a0aec0;
  --color-border: #e2e8f0;
  --color-panel-bg: #ffffff;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

- [ ] **Step 2: Replace globals.css with baseline reset**

Replace `src/presentation/app/globals.css` with:

```css
@import "./theme.css";

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
  font-family: system-ui, -apple-system, sans-serif;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  transition: background-color 0.2s, color 0.2s;
}

a {
  color: inherit;
  text-decoration: none;
}
```

- [ ] **Step 3: Update layout.tsx to set data-theme**

Replace `src/presentation/app/layout.tsx` (note: Next.js scaffolding places files in `src/app/` — move them to `src/presentation/app/` first, and update `next.config.ts` if needed. Alternatively, keep `src/app/` and adjust paths. See step 3 details below):

Since Next.js App Router expects files in `src/app/` by default, we keep the app directory at `src/app/` but it acts as the presentation layer entry point. Rename the scaffolded `src/app/` contents.

Update `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BLOCK6 Time Manager",
  description: "6區塊黃金比例時間分配法",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" data-theme="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify dev server shows dark theme**

```bash
pnpm dev
```

Open `http://localhost:3000`. Page should have dark background (`#1a1a2e`).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/theme.css src/app/layout.tsx
git commit -m "feat: add theme system with CSS custom properties (dark/light)"
```

---

## Task 3: Domain Entities

**Files:**
- Create: `src/domain/entities/block.ts`
- Create: `src/domain/entities/week-plan.ts`
- Create: `src/domain/entities/diary-entry.ts`
- Create: `src/domain/entities/week-review.ts`
- Create: `src/__tests__/domain/entities/block.test.ts`
- Create: `src/__tests__/domain/entities/week-plan.test.ts`
- Create: `src/__tests__/domain/entities/diary-entry.test.ts`
- Create: `src/__tests__/domain/entities/week-review.test.ts`

- [ ] **Step 1: Write Block entity test**

Create `src/__tests__/domain/entities/block.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  Block,
  BlockType,
  BlockStatus,
  createBlock,
} from "@/domain/entities/block";

describe("Block", () => {
  it("creates a block with required fields", () => {
    const block = createBlock({
      id: "block-1",
      weekPlanId: "wp-1",
      dayOfWeek: 1,
      slot: 1,
      blockType: BlockType.Core,
      title: "專案開發",
      description: "完成 API 設計",
      status: BlockStatus.Planned,
    });

    expect(block.id).toBe("block-1");
    expect(block.weekPlanId).toBe("wp-1");
    expect(block.dayOfWeek).toBe(1);
    expect(block.slot).toBe(1);
    expect(block.blockType).toBe(BlockType.Core);
    expect(block.title).toBe("專案開發");
    expect(block.description).toBe("完成 API 設計");
    expect(block.status).toBe(BlockStatus.Planned);
  });

  it("rejects invalid dayOfWeek", () => {
    expect(() =>
      createBlock({
        id: "block-1",
        weekPlanId: "wp-1",
        dayOfWeek: 0,
        slot: 1,
        blockType: BlockType.Core,
        title: "Test",
        description: "",
        status: BlockStatus.Planned,
      }),
    ).toThrow("dayOfWeek must be between 1 and 7");
  });

  it("rejects invalid slot", () => {
    expect(() =>
      createBlock({
        id: "block-1",
        weekPlanId: "wp-1",
        dayOfWeek: 1,
        slot: 7,
        blockType: BlockType.Core,
        title: "Test",
        description: "",
        status: BlockStatus.Planned,
      }),
    ).toThrow("slot must be between 1 and 6");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/domain/entities/block.test.ts
```

Expected: FAIL — cannot resolve `@/domain/entities/block`.

- [ ] **Step 3: Implement Block entity**

Create `src/domain/entities/block.ts`:

```typescript
export enum BlockType {
  Core = "core",
  Rest = "rest",
  Buffer = "buffer",
}

export enum BlockStatus {
  Planned = "planned",
  InProgress = "in_progress",
  Completed = "completed",
  Skipped = "skipped",
}

export interface Block {
  readonly id: string;
  readonly weekPlanId: string;
  readonly dayOfWeek: number;
  readonly slot: number;
  readonly blockType: BlockType;
  readonly title: string;
  readonly description: string;
  readonly status: BlockStatus;
}

export interface CreateBlockInput {
  id: string;
  weekPlanId: string;
  dayOfWeek: number;
  slot: number;
  blockType: BlockType;
  title: string;
  description: string;
  status: BlockStatus;
}

export function createBlock(input: CreateBlockInput): Block {
  if (input.dayOfWeek < 1 || input.dayOfWeek > 7) {
    throw new Error("dayOfWeek must be between 1 and 7");
  }
  if (input.slot < 1 || input.slot > 6) {
    throw new Error("slot must be between 1 and 6");
  }
  return { ...input };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/domain/entities/block.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Write WeekPlan entity test**

Create `src/__tests__/domain/entities/week-plan.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createWeekPlan } from "@/domain/entities/week-plan";

describe("WeekPlan", () => {
  it("creates a week plan with required fields", () => {
    const plan = createWeekPlan({
      id: "wp-1",
      userId: "user-1",
      weekStart: new Date("2026-04-13"),
      createdAt: new Date(),
    });

    expect(plan.id).toBe("wp-1");
    expect(plan.userId).toBe("user-1");
    expect(plan.weekStart).toEqual(new Date("2026-04-13"));
  });

  it("rejects weekStart that is not a Monday", () => {
    expect(() =>
      createWeekPlan({
        id: "wp-1",
        userId: "user-1",
        weekStart: new Date("2026-04-14"), // Tuesday
        createdAt: new Date(),
      }),
    ).toThrow("weekStart must be a Monday");
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/domain/entities/week-plan.test.ts
```

Expected: FAIL.

- [ ] **Step 7: Implement WeekPlan entity**

Create `src/domain/entities/week-plan.ts`:

```typescript
export interface WeekPlan {
  readonly id: string;
  readonly userId: string;
  readonly weekStart: Date;
  readonly createdAt: Date;
}

export interface CreateWeekPlanInput {
  id: string;
  userId: string;
  weekStart: Date;
  createdAt: Date;
}

export function createWeekPlan(input: CreateWeekPlanInput): WeekPlan {
  if (input.weekStart.getUTCDay() !== 1) {
    throw new Error("weekStart must be a Monday");
  }
  return { ...input };
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/domain/entities/week-plan.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 9: Write DiaryEntry entity test**

Create `src/__tests__/domain/entities/diary-entry.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createDiaryEntry } from "@/domain/entities/diary-entry";

describe("DiaryEntry", () => {
  it("creates a diary entry with 3 lines", () => {
    const entry = createDiaryEntry({
      id: "diary-1",
      userId: "user-1",
      entryDate: new Date("2026-04-13"),
      line1: "今天很專注",
      line2: "完成度很高",
      line3: "明天繼續加油",
      createdAt: new Date(),
    });

    expect(entry.line1).toBe("今天很專注");
    expect(entry.line2).toBe("完成度很高");
    expect(entry.line3).toBe("明天繼續加油");
  });

  it("rejects empty lines", () => {
    expect(() =>
      createDiaryEntry({
        id: "diary-1",
        userId: "user-1",
        entryDate: new Date("2026-04-13"),
        line1: "",
        line2: "Line 2",
        line3: "Line 3",
        createdAt: new Date(),
      }),
    ).toThrow("All three lines are required");
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/domain/entities/diary-entry.test.ts
```

Expected: FAIL.

- [ ] **Step 11: Implement DiaryEntry entity**

Create `src/domain/entities/diary-entry.ts`:

```typescript
export interface DiaryEntry {
  readonly id: string;
  readonly userId: string;
  readonly entryDate: Date;
  readonly line1: string;
  readonly line2: string;
  readonly line3: string;
  readonly createdAt: Date;
}

export interface CreateDiaryEntryInput {
  id: string;
  userId: string;
  entryDate: Date;
  line1: string;
  line2: string;
  line3: string;
  createdAt: Date;
}

export function createDiaryEntry(input: CreateDiaryEntryInput): DiaryEntry {
  if (!input.line1.trim() || !input.line2.trim() || !input.line3.trim()) {
    throw new Error("All three lines are required");
  }
  return { ...input };
}
```

- [ ] **Step 12: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/domain/entities/diary-entry.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 13: Write WeekReview entity test**

Create `src/__tests__/domain/entities/week-review.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createWeekReview } from "@/domain/entities/week-review";

describe("WeekReview", () => {
  it("creates a week review", () => {
    const review = createWeekReview({
      id: "review-1",
      weekPlanId: "wp-1",
      reflection: "這週完成了大部分的核心任務",
      createdAt: new Date(),
    });

    expect(review.weekPlanId).toBe("wp-1");
    expect(review.reflection).toBe("這週完成了大部分的核心任務");
  });

  it("rejects empty reflection", () => {
    expect(() =>
      createWeekReview({
        id: "review-1",
        weekPlanId: "wp-1",
        reflection: "",
        createdAt: new Date(),
      }),
    ).toThrow("Reflection is required");
  });
});
```

- [ ] **Step 14: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/domain/entities/week-review.test.ts
```

Expected: FAIL.

- [ ] **Step 15: Implement WeekReview entity**

Create `src/domain/entities/week-review.ts`:

```typescript
export interface WeekReview {
  readonly id: string;
  readonly weekPlanId: string;
  readonly reflection: string;
  readonly createdAt: Date;
}

export interface CreateWeekReviewInput {
  id: string;
  weekPlanId: string;
  reflection: string;
  createdAt: Date;
}

export function createWeekReview(input: CreateWeekReviewInput): WeekReview {
  if (!input.reflection.trim()) {
    throw new Error("Reflection is required");
  }
  return { ...input };
}
```

- [ ] **Step 16: Run all entity tests**

```bash
pnpm test -- src/__tests__/domain/entities/
```

Expected: PASS (9 tests across 4 files).

- [ ] **Step 17: Commit**

```bash
git add src/domain/entities/ src/__tests__/domain/entities/
git commit -m "feat: add domain entities — Block, WeekPlan, DiaryEntry, WeekReview"
```

---

## Task 4: Repository Interfaces

**Files:**
- Create: `src/domain/repositories/week-plan-repository.ts`
- Create: `src/domain/repositories/block-repository.ts`
- Create: `src/domain/repositories/diary-repository.ts`
- Create: `src/domain/repositories/week-review-repository.ts`

- [ ] **Step 1: Create WeekPlanRepository interface**

Create `src/domain/repositories/week-plan-repository.ts`:

```typescript
import { WeekPlan } from "@/domain/entities/week-plan";

export interface WeekPlanRepository {
  findByUserAndWeek(userId: string, weekStart: Date): Promise<WeekPlan | null>;
  save(plan: WeekPlan): Promise<void>;
}
```

- [ ] **Step 2: Create BlockRepository interface**

Create `src/domain/repositories/block-repository.ts`:

```typescript
import { Block } from "@/domain/entities/block";

export interface BlockRepository {
  findByWeekPlan(weekPlanId: string): Promise<Block[]>;
  findById(id: string): Promise<Block | null>;
  save(block: Block): Promise<void>;
  update(block: Block): Promise<void>;
}
```

- [ ] **Step 3: Create DiaryRepository interface**

Create `src/domain/repositories/diary-repository.ts`:

```typescript
import { DiaryEntry } from "@/domain/entities/diary-entry";

export interface DiaryRepository {
  findByUserAndDate(userId: string, date: Date): Promise<DiaryEntry | null>;
  findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DiaryEntry[]>;
  save(entry: DiaryEntry): Promise<void>;
  update(entry: DiaryEntry): Promise<void>;
}
```

- [ ] **Step 4: Create WeekReviewRepository interface**

Create `src/domain/repositories/week-review-repository.ts`:

```typescript
import { WeekReview } from "@/domain/entities/week-review";

export interface WeekReviewRepository {
  findByWeekPlan(weekPlanId: string): Promise<WeekReview | null>;
  save(review: WeekReview): Promise<void>;
  update(review: WeekReview): Promise<void>;
}
```

- [ ] **Step 5: Run type-check**

```bash
pnpm type-check
```

Expected: PASS — all interfaces compile.

- [ ] **Step 6: Commit**

```bash
git add src/domain/repositories/
git commit -m "feat: add repository interfaces for clean architecture DI"
```

---

## Task 5: Domain Use Cases

**Files:**
- Create: `src/domain/usecases/create-week-plan.ts`
- Create: `src/domain/usecases/update-block.ts`
- Create: `src/domain/usecases/update-block-status.ts`
- Create: `src/domain/usecases/write-diary.ts`
- Create: `src/domain/usecases/create-week-review.ts`
- Create: `src/domain/usecases/get-week-summary.ts`
- Create: `src/__tests__/domain/usecases/create-week-plan.test.ts`
- Create: `src/__tests__/domain/usecases/update-block.test.ts`
- Create: `src/__tests__/domain/usecases/update-block-status.test.ts`
- Create: `src/__tests__/domain/usecases/write-diary.test.ts`
- Create: `src/__tests__/domain/usecases/create-week-review.test.ts`
- Create: `src/__tests__/domain/usecases/get-week-summary.test.ts`

- [ ] **Step 1: Write CreateWeekPlan use case test**

Create `src/__tests__/domain/usecases/create-week-plan.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { CreateWeekPlanUseCase } from "@/domain/usecases/create-week-plan";
import { WeekPlanRepository } from "@/domain/repositories/week-plan-repository";

describe("CreateWeekPlanUseCase", () => {
  it("creates a new week plan when none exists", async () => {
    const mockRepo: WeekPlanRepository = {
      findByUserAndWeek: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new CreateWeekPlanUseCase(mockRepo);
    const result = await useCase.execute("user-1", new Date("2026-04-13"));

    expect(result.userId).toBe("user-1");
    expect(result.weekStart).toEqual(new Date("2026-04-13"));
    expect(mockRepo.save).toHaveBeenCalledOnce();
  });

  it("returns existing plan if one already exists", async () => {
    const existingPlan = {
      id: "wp-existing",
      userId: "user-1",
      weekStart: new Date("2026-04-13"),
      createdAt: new Date(),
    };
    const mockRepo: WeekPlanRepository = {
      findByUserAndWeek: vi.fn().mockResolvedValue(existingPlan),
      save: vi.fn(),
    };

    const useCase = new CreateWeekPlanUseCase(mockRepo);
    const result = await useCase.execute("user-1", new Date("2026-04-13"));

    expect(result.id).toBe("wp-existing");
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/domain/usecases/create-week-plan.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement CreateWeekPlan use case**

Create `src/domain/usecases/create-week-plan.ts`:

```typescript
import { WeekPlan, createWeekPlan } from "@/domain/entities/week-plan";
import { WeekPlanRepository } from "@/domain/repositories/week-plan-repository";

export class CreateWeekPlanUseCase {
  constructor(private readonly weekPlanRepo: WeekPlanRepository) {}

  async execute(userId: string, weekStart: Date): Promise<WeekPlan> {
    const existing = await this.weekPlanRepo.findByUserAndWeek(
      userId,
      weekStart,
    );
    if (existing) {
      return existing;
    }

    const plan = createWeekPlan({
      id: crypto.randomUUID(),
      userId,
      weekStart,
      createdAt: new Date(),
    });

    await this.weekPlanRepo.save(plan);
    return plan;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/domain/usecases/create-week-plan.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Write UpdateBlock use case test**

Create `src/__tests__/domain/usecases/update-block.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { UpdateBlockUseCase } from "@/domain/usecases/update-block";
import { BlockRepository } from "@/domain/repositories/block-repository";
import { BlockType, BlockStatus } from "@/domain/entities/block";

describe("UpdateBlockUseCase", () => {
  it("creates a new block when none exists for the slot", async () => {
    const mockRepo: BlockRepository = {
      findByWeekPlan: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(),
    };

    const useCase = new UpdateBlockUseCase(mockRepo);
    const result = await useCase.execute({
      weekPlanId: "wp-1",
      dayOfWeek: 1,
      slot: 1,
      blockType: BlockType.Core,
      title: "專案開發",
      description: "完成 API 設計",
    });

    expect(result.title).toBe("專案開發");
    expect(result.blockType).toBe(BlockType.Core);
    expect(mockRepo.save).toHaveBeenCalledOnce();
  });

  it("updates an existing block", async () => {
    const existingBlock = {
      id: "block-1",
      weekPlanId: "wp-1",
      dayOfWeek: 1,
      slot: 1,
      blockType: BlockType.Core,
      title: "舊任務",
      description: "",
      status: BlockStatus.Planned,
    };
    const mockRepo: BlockRepository = {
      findByWeekPlan: vi.fn().mockResolvedValue([existingBlock]),
      findById: vi.fn().mockResolvedValue(existingBlock),
      save: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new UpdateBlockUseCase(mockRepo);
    const result = await useCase.execute({
      weekPlanId: "wp-1",
      dayOfWeek: 1,
      slot: 1,
      blockType: BlockType.Rest,
      title: "休息",
      description: "午休",
    });

    expect(result.title).toBe("休息");
    expect(result.blockType).toBe(BlockType.Rest);
    expect(mockRepo.update).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/domain/usecases/update-block.test.ts
```

Expected: FAIL.

- [ ] **Step 7: Implement UpdateBlock use case**

Create `src/domain/usecases/update-block.ts`:

```typescript
import { Block, BlockType, BlockStatus, createBlock } from "@/domain/entities/block";
import { BlockRepository } from "@/domain/repositories/block-repository";

export interface UpdateBlockInput {
  weekPlanId: string;
  dayOfWeek: number;
  slot: number;
  blockType: BlockType;
  title: string;
  description: string;
}

export class UpdateBlockUseCase {
  constructor(private readonly blockRepo: BlockRepository) {}

  async execute(input: UpdateBlockInput): Promise<Block> {
    const blocks = await this.blockRepo.findByWeekPlan(input.weekPlanId);
    const existing = blocks.find(
      (b) => b.dayOfWeek === input.dayOfWeek && b.slot === input.slot,
    );

    if (existing) {
      const updated = createBlock({
        ...existing,
        blockType: input.blockType,
        title: input.title,
        description: input.description,
      });
      await this.blockRepo.update(updated);
      return updated;
    }

    const block = createBlock({
      id: crypto.randomUUID(),
      weekPlanId: input.weekPlanId,
      dayOfWeek: input.dayOfWeek,
      slot: input.slot,
      blockType: input.blockType,
      title: input.title,
      description: input.description,
      status: BlockStatus.Planned,
    });

    await this.blockRepo.save(block);
    return block;
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/domain/usecases/update-block.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 9: Write UpdateBlockStatus use case test**

Create `src/__tests__/domain/usecases/update-block-status.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { UpdateBlockStatusUseCase } from "@/domain/usecases/update-block-status";
import { BlockRepository } from "@/domain/repositories/block-repository";
import { BlockType, BlockStatus } from "@/domain/entities/block";

describe("UpdateBlockStatusUseCase", () => {
  it("updates block status", async () => {
    const existingBlock = {
      id: "block-1",
      weekPlanId: "wp-1",
      dayOfWeek: 1,
      slot: 1,
      blockType: BlockType.Core,
      title: "專案開發",
      description: "",
      status: BlockStatus.Planned,
    };
    const mockRepo: BlockRepository = {
      findByWeekPlan: vi.fn(),
      findById: vi.fn().mockResolvedValue(existingBlock),
      save: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new UpdateBlockStatusUseCase(mockRepo);
    const result = await useCase.execute("block-1", BlockStatus.Completed);

    expect(result.status).toBe(BlockStatus.Completed);
    expect(mockRepo.update).toHaveBeenCalledOnce();
  });

  it("throws when block not found", async () => {
    const mockRepo: BlockRepository = {
      findByWeekPlan: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      update: vi.fn(),
    };

    const useCase = new UpdateBlockStatusUseCase(mockRepo);
    await expect(
      useCase.execute("nonexistent", BlockStatus.Completed),
    ).rejects.toThrow("Block not found");
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/domain/usecases/update-block-status.test.ts
```

Expected: FAIL.

- [ ] **Step 11: Implement UpdateBlockStatus use case**

Create `src/domain/usecases/update-block-status.ts`:

```typescript
import { Block, BlockStatus, createBlock } from "@/domain/entities/block";
import { BlockRepository } from "@/domain/repositories/block-repository";

export class UpdateBlockStatusUseCase {
  constructor(private readonly blockRepo: BlockRepository) {}

  async execute(blockId: string, status: BlockStatus): Promise<Block> {
    const block = await this.blockRepo.findById(blockId);
    if (!block) {
      throw new Error("Block not found");
    }

    const updated = createBlock({ ...block, status });
    await this.blockRepo.update(updated);
    return updated;
  }
}
```

- [ ] **Step 12: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/domain/usecases/update-block-status.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 13: Write WriteDiary use case test**

Create `src/__tests__/domain/usecases/write-diary.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { WriteDiaryUseCase } from "@/domain/usecases/write-diary";
import { DiaryRepository } from "@/domain/repositories/diary-repository";

describe("WriteDiaryUseCase", () => {
  it("creates a new diary entry", async () => {
    const mockRepo: DiaryRepository = {
      findByUserAndDate: vi.fn().mockResolvedValue(null),
      findByUserAndDateRange: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(),
    };

    const useCase = new WriteDiaryUseCase(mockRepo);
    const result = await useCase.execute({
      userId: "user-1",
      entryDate: new Date("2026-04-13"),
      line1: "今天很專注",
      line2: "完成度很高",
      line3: "明天繼續加油",
    });

    expect(result.line1).toBe("今天很專注");
    expect(mockRepo.save).toHaveBeenCalledOnce();
  });

  it("updates existing diary entry for same date", async () => {
    const existing = {
      id: "diary-1",
      userId: "user-1",
      entryDate: new Date("2026-04-13"),
      line1: "舊的",
      line2: "舊的",
      line3: "舊的",
      createdAt: new Date(),
    };
    const mockRepo: DiaryRepository = {
      findByUserAndDate: vi.fn().mockResolvedValue(existing),
      findByUserAndDateRange: vi.fn(),
      save: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new WriteDiaryUseCase(mockRepo);
    const result = await useCase.execute({
      userId: "user-1",
      entryDate: new Date("2026-04-13"),
      line1: "新的一行",
      line2: "新的二行",
      line3: "新的三行",
    });

    expect(result.line1).toBe("新的一行");
    expect(mockRepo.update).toHaveBeenCalledOnce();
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 14: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/domain/usecases/write-diary.test.ts
```

Expected: FAIL.

- [ ] **Step 15: Implement WriteDiary use case**

Create `src/domain/usecases/write-diary.ts`:

```typescript
import {
  DiaryEntry,
  createDiaryEntry,
} from "@/domain/entities/diary-entry";
import { DiaryRepository } from "@/domain/repositories/diary-repository";

export interface WriteDiaryInput {
  userId: string;
  entryDate: Date;
  line1: string;
  line2: string;
  line3: string;
}

export class WriteDiaryUseCase {
  constructor(private readonly diaryRepo: DiaryRepository) {}

  async execute(input: WriteDiaryInput): Promise<DiaryEntry> {
    const existing = await this.diaryRepo.findByUserAndDate(
      input.userId,
      input.entryDate,
    );

    if (existing) {
      const updated = createDiaryEntry({
        ...existing,
        line1: input.line1,
        line2: input.line2,
        line3: input.line3,
      });
      await this.diaryRepo.update(updated);
      return updated;
    }

    const entry = createDiaryEntry({
      id: crypto.randomUUID(),
      userId: input.userId,
      entryDate: input.entryDate,
      line1: input.line1,
      line2: input.line2,
      line3: input.line3,
      createdAt: new Date(),
    });

    await this.diaryRepo.save(entry);
    return entry;
  }
}
```

- [ ] **Step 16: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/domain/usecases/write-diary.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 17: Write CreateWeekReview use case test**

Create `src/__tests__/domain/usecases/create-week-review.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { CreateWeekReviewUseCase } from "@/domain/usecases/create-week-review";
import { WeekReviewRepository } from "@/domain/repositories/week-review-repository";

describe("CreateWeekReviewUseCase", () => {
  it("creates a new week review", async () => {
    const mockRepo: WeekReviewRepository = {
      findByWeekPlan: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(),
    };

    const useCase = new CreateWeekReviewUseCase(mockRepo);
    const result = await useCase.execute("wp-1", "這週完成了大部分核心任務");

    expect(result.weekPlanId).toBe("wp-1");
    expect(result.reflection).toBe("這週完成了大部分核心任務");
    expect(mockRepo.save).toHaveBeenCalledOnce();
  });

  it("updates existing review", async () => {
    const existing = {
      id: "review-1",
      weekPlanId: "wp-1",
      reflection: "舊的反思",
      createdAt: new Date(),
    };
    const mockRepo: WeekReviewRepository = {
      findByWeekPlan: vi.fn().mockResolvedValue(existing),
      save: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new CreateWeekReviewUseCase(mockRepo);
    const result = await useCase.execute("wp-1", "新的反思");

    expect(result.reflection).toBe("新的反思");
    expect(mockRepo.update).toHaveBeenCalledOnce();
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 18: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/domain/usecases/create-week-review.test.ts
```

Expected: FAIL.

- [ ] **Step 19: Implement CreateWeekReview use case**

Create `src/domain/usecases/create-week-review.ts`:

```typescript
import {
  WeekReview,
  createWeekReview,
} from "@/domain/entities/week-review";
import { WeekReviewRepository } from "@/domain/repositories/week-review-repository";

export class CreateWeekReviewUseCase {
  constructor(private readonly reviewRepo: WeekReviewRepository) {}

  async execute(weekPlanId: string, reflection: string): Promise<WeekReview> {
    const existing = await this.reviewRepo.findByWeekPlan(weekPlanId);

    if (existing) {
      const updated = createWeekReview({
        ...existing,
        reflection,
      });
      await this.reviewRepo.update(updated);
      return updated;
    }

    const review = createWeekReview({
      id: crypto.randomUUID(),
      weekPlanId,
      reflection,
      createdAt: new Date(),
    });

    await this.reviewRepo.save(review);
    return review;
  }
}
```

- [ ] **Step 20: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/domain/usecases/create-week-review.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 21: Write GetWeekSummary use case test**

Create `src/__tests__/domain/usecases/get-week-summary.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import {
  GetWeekSummaryUseCase,
  WeekSummary,
} from "@/domain/usecases/get-week-summary";
import { BlockRepository } from "@/domain/repositories/block-repository";
import { BlockType, BlockStatus } from "@/domain/entities/block";

describe("GetWeekSummaryUseCase", () => {
  it("calculates completion stats for a week plan", async () => {
    const blocks = [
      {
        id: "b1",
        weekPlanId: "wp-1",
        dayOfWeek: 1,
        slot: 1,
        blockType: BlockType.Core,
        title: "A",
        description: "",
        status: BlockStatus.Completed,
      },
      {
        id: "b2",
        weekPlanId: "wp-1",
        dayOfWeek: 1,
        slot: 2,
        blockType: BlockType.Rest,
        title: "B",
        description: "",
        status: BlockStatus.Completed,
      },
      {
        id: "b3",
        weekPlanId: "wp-1",
        dayOfWeek: 1,
        slot: 3,
        blockType: BlockType.Buffer,
        title: "C",
        description: "",
        status: BlockStatus.Planned,
      },
      {
        id: "b4",
        weekPlanId: "wp-1",
        dayOfWeek: 2,
        slot: 1,
        blockType: BlockType.Core,
        title: "D",
        description: "",
        status: BlockStatus.Skipped,
      },
    ];

    const mockRepo: BlockRepository = {
      findByWeekPlan: vi.fn().mockResolvedValue(blocks),
      findById: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    };

    const useCase = new GetWeekSummaryUseCase(mockRepo);
    const result: WeekSummary = await useCase.execute("wp-1");

    expect(result.totalBlocks).toBe(4);
    expect(result.completedBlocks).toBe(2);
    expect(result.completionRate).toBeCloseTo(0.5);
    expect(result.byType).toEqual({
      core: { total: 2, completed: 1 },
      rest: { total: 1, completed: 1 },
      buffer: { total: 1, completed: 0 },
    });
  });

  it("handles empty week plan", async () => {
    const mockRepo: BlockRepository = {
      findByWeekPlan: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    };

    const useCase = new GetWeekSummaryUseCase(mockRepo);
    const result = await useCase.execute("wp-1");

    expect(result.totalBlocks).toBe(0);
    expect(result.completedBlocks).toBe(0);
    expect(result.completionRate).toBe(0);
  });
});
```

- [ ] **Step 22: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/domain/usecases/get-week-summary.test.ts
```

Expected: FAIL.

- [ ] **Step 23: Implement GetWeekSummary use case**

Create `src/domain/usecases/get-week-summary.ts`:

```typescript
import { BlockStatus, BlockType } from "@/domain/entities/block";
import { BlockRepository } from "@/domain/repositories/block-repository";

export interface TypeStats {
  total: number;
  completed: number;
}

export interface WeekSummary {
  totalBlocks: number;
  completedBlocks: number;
  completionRate: number;
  byType: Record<BlockType, TypeStats>;
}

export class GetWeekSummaryUseCase {
  constructor(private readonly blockRepo: BlockRepository) {}

  async execute(weekPlanId: string): Promise<WeekSummary> {
    const blocks = await this.blockRepo.findByWeekPlan(weekPlanId);

    const totalBlocks = blocks.length;
    const completedBlocks = blocks.filter(
      (b) => b.status === BlockStatus.Completed,
    ).length;

    const byType: Record<BlockType, TypeStats> = {
      [BlockType.Core]: { total: 0, completed: 0 },
      [BlockType.Rest]: { total: 0, completed: 0 },
      [BlockType.Buffer]: { total: 0, completed: 0 },
    };

    for (const block of blocks) {
      byType[block.blockType].total++;
      if (block.status === BlockStatus.Completed) {
        byType[block.blockType].completed++;
      }
    }

    return {
      totalBlocks,
      completedBlocks,
      completionRate: totalBlocks === 0 ? 0 : completedBlocks / totalBlocks,
      byType,
    };
  }
}
```

- [ ] **Step 24: Run all use case tests**

```bash
pnpm test -- src/__tests__/domain/usecases/
```

Expected: PASS (10 tests across 5 files).

- [ ] **Step 25: Commit**

```bash
git add src/domain/usecases/ src/__tests__/domain/usecases/
git commit -m "feat: add domain use cases — CreateWeekPlan, UpdateBlock, UpdateBlockStatus, WriteDiary, CreateWeekReview, GetWeekSummary"
```

---

## Task 6: Dependency Injection Provider

**Files:**
- Create: `src/presentation/providers/dependency-provider.tsx`

- [ ] **Step 1: Create DI context provider**

Create `src/presentation/providers/dependency-provider.tsx`:

```tsx
"use client";

import { createContext, useContext, useMemo } from "react";
import { WeekPlanRepository } from "@/domain/repositories/week-plan-repository";
import { BlockRepository } from "@/domain/repositories/block-repository";
import { DiaryRepository } from "@/domain/repositories/diary-repository";
import { WeekReviewRepository } from "@/domain/repositories/week-review-repository";
import { CreateWeekPlanUseCase } from "@/domain/usecases/create-week-plan";
import { UpdateBlockUseCase } from "@/domain/usecases/update-block";
import { UpdateBlockStatusUseCase } from "@/domain/usecases/update-block-status";
import { WriteDiaryUseCase } from "@/domain/usecases/write-diary";
import { CreateWeekReviewUseCase } from "@/domain/usecases/create-week-review";
import { GetWeekSummaryUseCase } from "@/domain/usecases/get-week-summary";

export interface UseCases {
  createWeekPlan: CreateWeekPlanUseCase;
  updateBlock: UpdateBlockUseCase;
  updateBlockStatus: UpdateBlockStatusUseCase;
  writeDiary: WriteDiaryUseCase;
  createWeekReview: CreateWeekReviewUseCase;
  getWeekSummary: GetWeekSummaryUseCase;
}

interface Repositories {
  weekPlanRepo: WeekPlanRepository;
  blockRepo: BlockRepository;
  diaryRepo: DiaryRepository;
  weekReviewRepo: WeekReviewRepository;
}

const UseCaseContext = createContext<UseCases | null>(null);

export function DependencyProvider({
  repositories,
  children,
}: {
  repositories: Repositories;
  children: React.ReactNode;
}) {
  const useCases = useMemo<UseCases>(
    () => ({
      createWeekPlan: new CreateWeekPlanUseCase(repositories.weekPlanRepo),
      updateBlock: new UpdateBlockUseCase(repositories.blockRepo),
      updateBlockStatus: new UpdateBlockStatusUseCase(repositories.blockRepo),
      writeDiary: new WriteDiaryUseCase(repositories.diaryRepo),
      createWeekReview: new CreateWeekReviewUseCase(
        repositories.weekReviewRepo,
      ),
      getWeekSummary: new GetWeekSummaryUseCase(repositories.blockRepo),
    }),
    [repositories],
  );

  return (
    <UseCaseContext.Provider value={useCases}>
      {children}
    </UseCaseContext.Provider>
  );
}

export function useUseCases(): UseCases {
  const context = useContext(UseCaseContext);
  if (!context) {
    throw new Error("useUseCases must be used within DependencyProvider");
  }
  return context;
}
```

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/providers/
git commit -m "feat: add DependencyProvider for clean architecture DI"
```

---

## Task 7: Theme Toggle & Header Components

**Files:**
- Create: `src/presentation/hooks/use-theme.ts`
- Create: `src/presentation/components/header/theme-toggle.tsx`
- Create: `src/presentation/components/header/week-navigator.tsx`
- Create: `src/presentation/components/header/header.tsx`
- Create: `src/__tests__/presentation/components/theme-toggle.test.tsx`
- Create: `src/__tests__/presentation/components/week-navigator.test.tsx`

- [ ] **Step 1: Write useTheme hook**

Create `src/presentation/hooks/use-theme.ts`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";

export type Theme = "dark" | "light";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("block6-theme") as Theme | null;
    const initial = stored ?? "dark";
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("block6-theme", newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme };
}
```

- [ ] **Step 2: Write ThemeToggle test**

Create `src/__tests__/presentation/components/theme-toggle.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/presentation/components/header/theme-toggle";

describe("ThemeToggle", () => {
  it("renders a toggle button", () => {
    render(<ThemeToggle theme="dark" onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /theme/i })).toBeInTheDocument();
  });

  it("calls onToggle when clicked", async () => {
    const user = userEvent.setup();
    let called = false;
    render(<ThemeToggle theme="dark" onToggle={() => { called = true; }} />);

    await user.click(screen.getByRole("button", { name: /theme/i }));
    expect(called).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/presentation/components/theme-toggle.test.tsx
```

Expected: FAIL.

- [ ] **Step 4: Implement ThemeToggle**

Create `src/presentation/components/header/theme-toggle.tsx`:

```tsx
import type { Theme } from "@/presentation/hooks/use-theme";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      style={{
        background: "var(--color-bg-tertiary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        color: "var(--color-text-primary)",
        padding: "6px 12px",
        cursor: "pointer",
        fontSize: "16px",
      }}
    >
      {theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}
    </button>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/presentation/components/theme-toggle.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 6: Write WeekNavigator test**

Create `src/__tests__/presentation/components/week-navigator.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeekNavigator } from "@/presentation/components/header/week-navigator";

describe("WeekNavigator", () => {
  it("displays the week range", () => {
    render(
      <WeekNavigator
        weekStart={new Date("2026-04-13")}
        onPreviousWeek={() => {}}
        onNextWeek={() => {}}
      />,
    );
    expect(screen.getByText(/4\/13/)).toBeInTheDocument();
    expect(screen.getByText(/4\/19/)).toBeInTheDocument();
  });

  it("calls onPreviousWeek when left arrow clicked", async () => {
    const user = userEvent.setup();
    let called = false;
    render(
      <WeekNavigator
        weekStart={new Date("2026-04-13")}
        onPreviousWeek={() => { called = true; }}
        onNextWeek={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(called).toBe(true);
  });

  it("calls onNextWeek when right arrow clicked", async () => {
    const user = userEvent.setup();
    let called = false;
    render(
      <WeekNavigator
        weekStart={new Date("2026-04-13")}
        onPreviousWeek={() => {}}
        onNextWeek={() => { called = true; }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(called).toBe(true);
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/presentation/components/week-navigator.test.tsx
```

Expected: FAIL.

- [ ] **Step 8: Implement WeekNavigator**

Create `src/presentation/components/header/week-navigator.tsx`:

```tsx
interface WeekNavigatorProps {
  weekStart: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function WeekNavigator({
  weekStart,
  onPreviousWeek,
  onNextWeek,
}: WeekNavigatorProps) {
  const weekEnd = addDays(weekStart, 6);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <button
        onClick={onPreviousWeek}
        aria-label="Previous week"
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-primary)",
          cursor: "pointer",
          fontSize: "18px",
          padding: "4px 8px",
        }}
      >
        &larr;
      </button>
      <span
        style={{
          color: "var(--color-text-primary)",
          fontSize: "16px",
          fontWeight: 600,
          minWidth: "140px",
          textAlign: "center",
        }}
      >
        {formatDate(weekStart)} &ndash; {formatDate(weekEnd)}
      </span>
      <button
        onClick={onNextWeek}
        aria-label="Next week"
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-primary)",
          cursor: "pointer",
          fontSize: "18px",
          padding: "4px 8px",
        }}
      >
        &rarr;
      </button>
    </div>
  );
}
```

- [ ] **Step 9: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/presentation/components/week-navigator.test.tsx
```

Expected: PASS (3 tests).

- [ ] **Step 10: Implement Header**

Create `src/presentation/components/header/header.tsx`:

```tsx
import { ThemeToggle } from "./theme-toggle";
import { WeekNavigator } from "./week-navigator";
import type { Theme } from "@/presentation/hooks/use-theme";

interface HeaderProps {
  weekStart: Date;
  theme: Theme;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToggleTheme: () => void;
}

export function Header({
  weekStart,
  theme,
  onPreviousWeek,
  onNextWeek,
  onToggleTheme,
}: HeaderProps) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 24px",
        backgroundColor: "var(--color-bg-secondary)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <h1
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "var(--color-accent)",
        }}
      >
        BLOCK6
      </h1>
      <WeekNavigator
        weekStart={weekStart}
        onPreviousWeek={onPreviousWeek}
        onNextWeek={onNextWeek}
      />
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  );
}
```

- [ ] **Step 11: Run all component tests**

```bash
pnpm test -- src/__tests__/presentation/
```

Expected: PASS (5 tests).

- [ ] **Step 12: Commit**

```bash
git add src/presentation/hooks/use-theme.ts src/presentation/components/header/ src/__tests__/presentation/
git commit -m "feat: add Header with WeekNavigator and ThemeToggle components"
```

---

## Task 8: WeekGrid & BlockCell Components

**Files:**
- Create: `src/presentation/components/week-grid/block-cell.tsx`
- Create: `src/presentation/components/week-grid/week-grid.tsx`
- Create: `src/__tests__/presentation/components/block-cell.test.tsx`
- Create: `src/__tests__/presentation/components/week-grid.test.tsx`

- [ ] **Step 1: Write BlockCell test**

Create `src/__tests__/presentation/components/block-cell.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BlockCell } from "@/presentation/components/week-grid/block-cell";
import { BlockType, BlockStatus } from "@/domain/entities/block";

describe("BlockCell", () => {
  it("renders block title and type color", () => {
    render(
      <BlockCell
        block={{
          id: "b1",
          weekPlanId: "wp-1",
          dayOfWeek: 1,
          slot: 1,
          blockType: BlockType.Core,
          title: "專案開發",
          description: "",
          status: BlockStatus.Planned,
        }}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("專案開發")).toBeInTheDocument();
  });

  it("renders empty cell when no block", () => {
    render(<BlockCell block={null} onClick={() => {}} />);
    expect(screen.getByText("+")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(
      <BlockCell
        block={null}
        onClick={() => { clicked = true; }}
      />,
    );

    await user.click(screen.getByText("+"));
    expect(clicked).toBe(true);
  });

  it("shows completion indicator for completed blocks", () => {
    render(
      <BlockCell
        block={{
          id: "b1",
          weekPlanId: "wp-1",
          dayOfWeek: 1,
          slot: 1,
          blockType: BlockType.Core,
          title: "Done",
          description: "",
          status: BlockStatus.Completed,
        }}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("\u2713")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/presentation/components/block-cell.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement BlockCell**

Create `src/presentation/components/week-grid/block-cell.tsx`:

```tsx
import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus } from "@/domain/entities/block";

interface BlockCellProps {
  block: Block | null;
  onClick: () => void;
}

const typeColorMap: Record<BlockType, string> = {
  [BlockType.Core]: "var(--color-block-core)",
  [BlockType.Rest]: "var(--color-block-rest)",
  [BlockType.Buffer]: "var(--color-block-buffer)",
};

const statusIcon: Record<BlockStatus, string> = {
  [BlockStatus.Planned]: "",
  [BlockStatus.InProgress]: "\u25B6",
  [BlockStatus.Completed]: "\u2713",
  [BlockStatus.Skipped]: "\u2013",
};

export function BlockCell({ block, onClick }: BlockCellProps) {
  if (!block) {
    return (
      <button
        onClick={onClick}
        style={{
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-muted)",
          cursor: "pointer",
          padding: "8px",
          minHeight: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
        }}
      >
        +
      </button>
    );
  }

  const borderColor = typeColorMap[block.blockType];
  const icon = statusIcon[block.status];

  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--color-bg-secondary)",
        borderLeft: `3px solid ${borderColor}`,
        borderTop: "1px solid var(--color-border)",
        borderRight: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
        color: "var(--color-text-primary)",
        cursor: "pointer",
        padding: "6px 8px",
        minHeight: "60px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        textAlign: "left",
        fontSize: "12px",
        opacity: block.status === BlockStatus.Skipped ? 0.5 : 1,
      }}
    >
      <span style={{ fontWeight: 500, fontSize: "11px" }}>{block.title}</span>
      {icon && (
        <span
          style={{
            alignSelf: "flex-end",
            fontSize: "12px",
            color: borderColor,
          }}
        >
          {icon}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/presentation/components/block-cell.test.tsx
```

Expected: PASS (4 tests).

- [ ] **Step 5: Write WeekGrid test**

Create `src/__tests__/presentation/components/week-grid.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeekGrid } from "@/presentation/components/week-grid/week-grid";

describe("WeekGrid", () => {
  it("renders 7 day columns with labels", () => {
    render(<WeekGrid blocks={[]} onBlockClick={() => {}} />);
    expect(screen.getByText("一")).toBeInTheDocument();
    expect(screen.getByText("二")).toBeInTheDocument();
    expect(screen.getByText("三")).toBeInTheDocument();
    expect(screen.getByText("四")).toBeInTheDocument();
    expect(screen.getByText("五")).toBeInTheDocument();
    expect(screen.getByText("六")).toBeInTheDocument();
    expect(screen.getByText("日")).toBeInTheDocument();
  });

  it("renders 42 cells (7 days x 6 slots)", () => {
    render(<WeekGrid blocks={[]} onBlockClick={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(42);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/presentation/components/week-grid.test.tsx
```

Expected: FAIL.

- [ ] **Step 7: Implement WeekGrid**

Create `src/presentation/components/week-grid/week-grid.tsx`:

```tsx
import type { Block } from "@/domain/entities/block";
import { BlockCell } from "./block-cell";

interface WeekGridProps {
  blocks: Block[];
  onBlockClick: (dayOfWeek: number, slot: number, block: Block | null) => void;
}

const DAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const SLOTS = [1, 2, 3, 4, 5, 6];

export function WeekGrid({ blocks, onBlockClick }: WeekGridProps) {
  function findBlock(day: number, slot: number): Block | null {
    return (
      blocks.find((b) => b.dayOfWeek === day && b.slot === slot) ?? null
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: "4px",
        flex: 1,
      }}
    >
      {DAY_LABELS.map((label, i) => (
        <div
          key={`header-${i}`}
          style={{
            textAlign: "center",
            color: "var(--color-text-secondary)",
            fontSize: "13px",
            fontWeight: 600,
            padding: "8px 0",
          }}
        >
          {label}
        </div>
      ))}
      {SLOTS.map((slot) =>
        DAY_LABELS.map((_, dayIndex) => {
          const dayOfWeek = dayIndex + 1;
          const block = findBlock(dayOfWeek, slot);
          return (
            <BlockCell
              key={`${dayOfWeek}-${slot}`}
              block={block}
              onClick={() => onBlockClick(dayOfWeek, slot, block)}
            />
          );
        }),
      )}
    </div>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/presentation/components/week-grid.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add src/presentation/components/week-grid/ src/__tests__/presentation/components/block-cell.test.tsx src/__tests__/presentation/components/week-grid.test.tsx
git commit -m "feat: add WeekGrid and BlockCell components"
```

---

## Task 9: SidePanel Components (BlockEditor, StatusToggle, DiaryForm)

**Files:**
- Create: `src/presentation/components/side-panel/side-panel.tsx`
- Create: `src/presentation/components/side-panel/block-editor.tsx`
- Create: `src/presentation/components/side-panel/status-toggle.tsx`
- Create: `src/presentation/components/side-panel/diary-form.tsx`
- Create: `src/__tests__/presentation/components/status-toggle.test.tsx`
- Create: `src/__tests__/presentation/components/diary-form.test.tsx`

- [ ] **Step 1: Write StatusToggle test**

Create `src/__tests__/presentation/components/status-toggle.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusToggle } from "@/presentation/components/side-panel/status-toggle";
import { BlockStatus } from "@/domain/entities/block";

describe("StatusToggle", () => {
  it("renders all status options", () => {
    render(
      <StatusToggle status={BlockStatus.Planned} onChange={() => {}} />,
    );
    expect(screen.getByText("planned")).toBeInTheDocument();
    expect(screen.getByText("in_progress")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("skipped")).toBeInTheDocument();
  });

  it("highlights current status", () => {
    render(
      <StatusToggle status={BlockStatus.Completed} onChange={() => {}} />,
    );
    const completedButton = screen.getByText("completed");
    expect(completedButton).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onChange when a status is clicked", async () => {
    const user = userEvent.setup();
    let newStatus: BlockStatus | null = null;
    render(
      <StatusToggle
        status={BlockStatus.Planned}
        onChange={(s) => { newStatus = s; }}
      />,
    );

    await user.click(screen.getByText("completed"));
    expect(newStatus).toBe(BlockStatus.Completed);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/presentation/components/status-toggle.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement StatusToggle**

Create `src/presentation/components/side-panel/status-toggle.tsx`:

```tsx
import { BlockStatus } from "@/domain/entities/block";

interface StatusToggleProps {
  status: BlockStatus;
  onChange: (status: BlockStatus) => void;
}

const statuses: BlockStatus[] = [
  BlockStatus.Planned,
  BlockStatus.InProgress,
  BlockStatus.Completed,
  BlockStatus.Skipped,
];

const statusColorMap: Record<BlockStatus, string> = {
  [BlockStatus.Planned]: "var(--color-status-planned)",
  [BlockStatus.InProgress]: "var(--color-status-in-progress)",
  [BlockStatus.Completed]: "var(--color-status-completed)",
  [BlockStatus.Skipped]: "var(--color-status-skipped)",
};

export function StatusToggle({ status, onChange }: StatusToggleProps) {
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {statuses.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          aria-pressed={s === status}
          style={{
            padding: "4px 10px",
            borderRadius: "var(--radius-sm)",
            border:
              s === status
                ? `2px solid ${statusColorMap[s]}`
                : "1px solid var(--color-border)",
            background:
              s === status ? statusColorMap[s] : "var(--color-bg-tertiary)",
            color:
              s === status
                ? "var(--color-bg-primary)"
                : "var(--color-text-secondary)",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: s === status ? 600 : 400,
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/presentation/components/status-toggle.test.tsx
```

Expected: PASS (3 tests).

- [ ] **Step 5: Write DiaryForm test**

Create `src/__tests__/presentation/components/diary-form.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiaryForm } from "@/presentation/components/side-panel/diary-form";

describe("DiaryForm", () => {
  it("renders 3 input fields", () => {
    render(<DiaryForm line1="" line2="" line3="" onSave={() => {}} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(3);
  });

  it("calls onSave with all 3 lines", async () => {
    const user = userEvent.setup();
    let saved: { line1: string; line2: string; line3: string } | null = null;
    render(
      <DiaryForm
        line1=""
        line2=""
        line3=""
        onSave={(l1, l2, l3) => { saved = { line1: l1, line2: l2, line3: l3 }; }}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "今天很專注");
    await user.type(inputs[1], "完成度很高");
    await user.type(inputs[2], "明天繼續加油");
    await user.click(screen.getByRole("button", { name: /save|儲存/i }));

    expect(saved).toEqual({
      line1: "今天很專注",
      line2: "完成度很高",
      line3: "明天繼續加油",
    });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/presentation/components/diary-form.test.tsx
```

Expected: FAIL.

- [ ] **Step 7: Implement DiaryForm**

Create `src/presentation/components/side-panel/diary-form.tsx`:

```tsx
"use client";

import { useState } from "react";

interface DiaryFormProps {
  line1: string;
  line2: string;
  line3: string;
  onSave: (line1: string, line2: string, line3: string) => void;
}

export function DiaryForm({
  line1: initialLine1,
  line2: initialLine2,
  line3: initialLine3,
  onSave,
}: DiaryFormProps) {
  const [line1, setLine1] = useState(initialLine1);
  const [line2, setLine2] = useState(initialLine2);
  const [line3, setLine3] = useState(initialLine3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <label
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        情緒日記
      </label>
      <input
        type="text"
        value={line1}
        onChange={(e) => setLine1(e.target.value)}
        placeholder="第一行..."
        style={{
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
          padding: "8px",
          fontSize: "14px",
        }}
      />
      <input
        type="text"
        value={line2}
        onChange={(e) => setLine2(e.target.value)}
        placeholder="第二行..."
        style={{
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
          padding: "8px",
          fontSize: "14px",
        }}
      />
      <input
        type="text"
        value={line3}
        onChange={(e) => setLine3(e.target.value)}
        placeholder="第三行..."
        style={{
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
          padding: "8px",
          fontSize: "14px",
        }}
      />
      <button
        onClick={() => onSave(line1, line2, line3)}
        aria-label="儲存"
        style={{
          background: "var(--color-accent)",
          border: "none",
          borderRadius: "var(--radius-sm)",
          color: "white",
          padding: "8px 16px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 600,
          alignSelf: "flex-end",
        }}
      >
        儲存
      </button>
    </div>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/presentation/components/diary-form.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 9: Implement BlockEditor**

Create `src/presentation/components/side-panel/block-editor.tsx`:

```tsx
"use client";

import { useState } from "react";
import { BlockType } from "@/domain/entities/block";

interface BlockEditorProps {
  title: string;
  description: string;
  blockType: BlockType;
  onSave: (title: string, description: string, blockType: BlockType) => void;
}

const typeOptions: { value: BlockType; label: string; color: string }[] = [
  { value: BlockType.Core, label: "核心", color: "var(--color-block-core)" },
  { value: BlockType.Rest, label: "休息", color: "var(--color-block-rest)" },
  {
    value: BlockType.Buffer,
    label: "緩衝",
    color: "var(--color-block-buffer)",
  },
];

export function BlockEditor({
  title: initialTitle,
  description: initialDescription,
  blockType: initialType,
  onSave,
}: BlockEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [blockType, setBlockType] = useState(initialType);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", gap: "6px" }}>
        {typeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setBlockType(opt.value)}
            style={{
              padding: "4px 12px",
              borderRadius: "var(--radius-sm)",
              border:
                blockType === opt.value
                  ? `2px solid ${opt.color}`
                  : "1px solid var(--color-border)",
              background:
                blockType === opt.value
                  ? opt.color
                  : "var(--color-bg-tertiary)",
              color:
                blockType === opt.value
                  ? "var(--color-bg-primary)"
                  : "var(--color-text-secondary)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: blockType === opt.value ? 600 : 400,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="任務名稱"
        style={{
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
          padding: "8px",
          fontSize: "14px",
        }}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="細項目標..."
        rows={3}
        style={{
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
          padding: "8px",
          fontSize: "14px",
          resize: "vertical",
        }}
      />
      <button
        onClick={() => onSave(title, description, blockType)}
        style={{
          background: "var(--color-accent)",
          border: "none",
          borderRadius: "var(--radius-sm)",
          color: "white",
          padding: "8px 16px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 600,
          alignSelf: "flex-end",
        }}
      >
        儲存
      </button>
    </div>
  );
}
```

- [ ] **Step 10: Implement SidePanel**

Create `src/presentation/components/side-panel/side-panel.tsx`:

```tsx
import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus } from "@/domain/entities/block";
import { BlockEditor } from "./block-editor";
import { StatusToggle } from "./status-toggle";
import { DiaryForm } from "./diary-form";

interface SidePanelProps {
  dayOfWeek: number;
  slot: number;
  block: Block | null;
  diaryLines: { line1: string; line2: string; line3: string } | null;
  isToday: boolean;
  onSaveBlock: (
    title: string,
    description: string,
    blockType: BlockType,
  ) => void;
  onStatusChange: (status: BlockStatus) => void;
  onSaveDiary: (line1: string, line2: string, line3: string) => void;
  onClose: () => void;
}

const DAY_LABELS = ["", "一", "二", "三", "四", "五", "六", "日"];

export function SidePanel({
  dayOfWeek,
  slot,
  block,
  diaryLines,
  isToday,
  onSaveBlock,
  onStatusChange,
  onSaveDiary,
  onClose,
}: SidePanelProps) {
  return (
    <aside
      style={{
        width: "320px",
        background: "var(--color-panel-bg)",
        borderLeft: "1px solid var(--color-border)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            color: "var(--color-text-primary)",
          }}
        >
          週{DAY_LABELS[dayOfWeek]} · 區塊 {slot}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: "18px",
          }}
        >
          &times;
        </button>
      </div>

      <BlockEditor
        title={block?.title ?? ""}
        description={block?.description ?? ""}
        blockType={block?.blockType ?? BlockType.Core}
        onSave={onSaveBlock}
      />

      {block && (
        <>
          <div>
            <label
              style={{
                color: "var(--color-text-secondary)",
                fontSize: "13px",
                fontWeight: 600,
                marginBottom: "6px",
                display: "block",
              }}
            >
              狀態
            </label>
            <StatusToggle
              status={block.status}
              onChange={onStatusChange}
            />
          </div>
        </>
      )}

      {isToday && (
        <DiaryForm
          line1={diaryLines?.line1 ?? ""}
          line2={diaryLines?.line2 ?? ""}
          line3={diaryLines?.line3 ?? ""}
          onSave={onSaveDiary}
        />
      )}
    </aside>
  );
}
```

- [ ] **Step 11: Run all tests**

```bash
pnpm test
```

Expected: All pass.

- [ ] **Step 12: Commit**

```bash
git add src/presentation/components/side-panel/ src/__tests__/presentation/components/status-toggle.test.tsx src/__tests__/presentation/components/diary-form.test.tsx
git commit -m "feat: add SidePanel with BlockEditor, StatusToggle, DiaryForm"
```

---

## Task 10: Main Dashboard Page

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/presentation/hooks/use-week-plan.ts`
- Create: `src/presentation/hooks/use-blocks.ts`
- Create: `src/presentation/hooks/use-diary.ts`

- [ ] **Step 1: Create useWeekPlan hook**

Create `src/presentation/hooks/use-week-plan.ts`:

```typescript
"use client";

import { useState, useCallback } from "react";

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function useWeekPlan() {
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getMonday(new Date()),
  );

  const goToPreviousWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  return { weekStart, goToPreviousWeek, goToNextWeek };
}
```

- [ ] **Step 2: Create useBlocks hook**

Create `src/presentation/hooks/use-blocks.ts`:

```typescript
"use client";

import { useState, useCallback } from "react";
import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus, createBlock } from "@/domain/entities/block";

export function useBlocks() {
  const [blocks, setBlocks] = useState<Block[]>([]);

  const saveBlock = useCallback(
    (
      weekPlanId: string,
      dayOfWeek: number,
      slot: number,
      title: string,
      description: string,
      blockType: BlockType,
    ) => {
      setBlocks((prev) => {
        const existing = prev.find(
          (b) => b.dayOfWeek === dayOfWeek && b.slot === slot,
        );
        if (existing) {
          return prev.map((b) =>
            b.id === existing.id
              ? createBlock({ ...b, title, description, blockType })
              : b,
          );
        }
        const newBlock = createBlock({
          id: crypto.randomUUID(),
          weekPlanId,
          dayOfWeek,
          slot,
          blockType,
          title,
          description,
          status: BlockStatus.Planned,
        });
        return [...prev, newBlock];
      });
    },
    [],
  );

  const updateStatus = useCallback(
    (blockId: string, status: BlockStatus) => {
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId ? createBlock({ ...b, status }) : b,
        ),
      );
    },
    [],
  );

  return { blocks, saveBlock, updateStatus };
}
```

- [ ] **Step 3: Create useDiary hook**

Create `src/presentation/hooks/use-diary.ts`:

```typescript
"use client";

import { useState, useCallback } from "react";

interface DiaryLines {
  line1: string;
  line2: string;
  line3: string;
}

export function useDiary() {
  const [entries, setEntries] = useState<Record<string, DiaryLines>>({});

  const saveDiary = useCallback(
    (dateKey: string, line1: string, line2: string, line3: string) => {
      setEntries((prev) => ({
        ...prev,
        [dateKey]: { line1, line2, line3 },
      }));
    },
    [],
  );

  const getDiary = useCallback(
    (dateKey: string): DiaryLines | null => {
      return entries[dateKey] ?? null;
    },
    [entries],
  );

  return { saveDiary, getDiary };
}
```

- [ ] **Step 4: Wire up the main dashboard page**

Replace `src/app/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Header } from "@/presentation/components/header/header";
import { WeekGrid } from "@/presentation/components/week-grid/week-grid";
import { SidePanel } from "@/presentation/components/side-panel/side-panel";
import { useTheme } from "@/presentation/hooks/use-theme";
import { useWeekPlan } from "@/presentation/hooks/use-week-plan";
import { useBlocks } from "@/presentation/hooks/use-blocks";
import { useDiary } from "@/presentation/hooks/use-diary";
import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus } from "@/domain/entities/block";

interface SelectedCell {
  dayOfWeek: number;
  slot: number;
  block: Block | null;
}

function formatDateKey(weekStart: Date, dayOfWeek: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  return d.toISOString().split("T")[0];
}

function isTodayInWeek(weekStart: Date, dayOfWeek: number): boolean {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export default function DashboardPage() {
  const { theme, toggleTheme } = useTheme();
  const { weekStart, goToPreviousWeek, goToNextWeek } = useWeekPlan();
  const { blocks, saveBlock, updateStatus } = useBlocks();
  const { saveDiary, getDiary } = useDiary();
  const [selected, setSelected] = useState<SelectedCell | null>(null);

  const handleBlockClick = (
    dayOfWeek: number,
    slot: number,
    block: Block | null,
  ) => {
    setSelected({ dayOfWeek, slot, block });
  };

  const handleSaveBlock = (
    title: string,
    description: string,
    blockType: BlockType,
  ) => {
    if (!selected) return;
    saveBlock(
      "local-plan",
      selected.dayOfWeek,
      selected.slot,
      title,
      description,
      blockType,
    );
    const updatedBlock = blocks.find(
      (b) =>
        b.dayOfWeek === selected.dayOfWeek && b.slot === selected.slot,
    );
    setSelected((prev) =>
      prev ? { ...prev, block: updatedBlock ?? prev.block } : null,
    );
  };

  const handleStatusChange = (status: BlockStatus) => {
    if (!selected?.block) return;
    updateStatus(selected.block.id, status);
  };

  const handleSaveDiary = (
    line1: string,
    line2: string,
    line3: string,
  ) => {
    if (!selected) return;
    const dateKey = formatDateKey(weekStart, selected.dayOfWeek);
    saveDiary(dateKey, line1, line2, line3);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      <Header
        weekStart={weekStart}
        theme={theme}
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        onToggleTheme={toggleTheme}
      />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <main style={{ flex: 1, padding: "16px", overflow: "auto" }}>
          <WeekGrid blocks={blocks} onBlockClick={handleBlockClick} />
        </main>
        {selected && (
          <SidePanel
            dayOfWeek={selected.dayOfWeek}
            slot={selected.slot}
            block={
              blocks.find(
                (b) =>
                  b.dayOfWeek === selected.dayOfWeek &&
                  b.slot === selected.slot,
              ) ?? null
            }
            diaryLines={getDiary(
              formatDateKey(weekStart, selected.dayOfWeek),
            )}
            isToday={isTodayInWeek(weekStart, selected.dayOfWeek)}
            onSaveBlock={handleSaveBlock}
            onStatusChange={handleStatusChange}
            onSaveDiary={handleSaveDiary}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Start dev server and verify**

```bash
pnpm dev
```

Open `http://localhost:3000`. Verify:
- Dark themed 7×6 grid with 42 "+" cells
- Week navigator arrows work
- Theme toggle switches dark/light
- Clicking a cell opens side panel
- Can edit block type, title, description and save
- Block appears in grid with correct color
- Can toggle status
- Side panel shows diary form only for today's cells

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/presentation/hooks/
git commit -m "feat: wire up main dashboard page with WeekGrid, SidePanel, hooks"
```

---

## Task 11: Weekly Review Page

**Files:**
- Create: `src/app/review/page.tsx`
- Create: `src/presentation/components/review/completion-stats.tsx`
- Create: `src/presentation/components/review/block-type-breakdown.tsx`
- Create: `src/presentation/components/review/reflection-editor.tsx`

- [ ] **Step 1: Implement CompletionStats**

Create `src/presentation/components/review/completion-stats.tsx`:

```tsx
interface CompletionStatsProps {
  totalBlocks: number;
  completedBlocks: number;
  completionRate: number;
}

export function CompletionStats({
  totalBlocks,
  completedBlocks,
  completionRate,
}: CompletionStatsProps) {
  const percentage = Math.round(completionRate * 100);

  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        borderRadius: "var(--radius-md)",
        padding: "20px",
        border: "1px solid var(--color-border)",
      }}
    >
      <h3
        style={{
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          marginBottom: "12px",
        }}
      >
        完成率
      </h3>
      <div
        style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "var(--color-accent)",
          marginBottom: "8px",
        }}
      >
        {percentage}%
      </div>
      <div
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "13px",
          marginBottom: "12px",
        }}
      >
        {completedBlocks} / {totalBlocks} 區塊完成
      </div>
      <div
        style={{
          background: "var(--color-bg-tertiary)",
          borderRadius: "var(--radius-sm)",
          height: "8px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "var(--color-status-completed)",
            height: "100%",
            width: `${percentage}%`,
            borderRadius: "var(--radius-sm)",
            transition: "width 0.3s",
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement BlockTypeBreakdown**

Create `src/presentation/components/review/block-type-breakdown.tsx`:

```tsx
interface TypeData {
  total: number;
  completed: number;
}

interface BlockTypeBreakdownProps {
  byType: {
    core: TypeData;
    rest: TypeData;
    buffer: TypeData;
  };
}

const typeConfig = [
  { key: "core" as const, label: "核心", color: "var(--color-block-core)" },
  { key: "rest" as const, label: "休息", color: "var(--color-block-rest)" },
  {
    key: "buffer" as const,
    label: "緩衝",
    color: "var(--color-block-buffer)",
  },
];

export function BlockTypeBreakdown({ byType }: BlockTypeBreakdownProps) {
  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        borderRadius: "var(--radius-md)",
        padding: "20px",
        border: "1px solid var(--color-border)",
      }}
    >
      <h3
        style={{
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          marginBottom: "16px",
        }}
      >
        區塊類型分佈
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {typeConfig.map(({ key, label, color }) => {
          const data = byType[key];
          const rate =
            data.total === 0
              ? 0
              : Math.round((data.completed / data.total) * 100);
          return (
            <div key={key}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    color: "var(--color-text-primary)",
                    fontSize: "13px",
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "12px",
                  }}
                >
                  {data.completed}/{data.total} ({rate}%)
                </span>
              </div>
              <div
                style={{
                  background: "var(--color-bg-tertiary)",
                  borderRadius: "var(--radius-sm)",
                  height: "6px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: color,
                    height: "100%",
                    width: `${rate}%`,
                    borderRadius: "var(--radius-sm)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement ReflectionEditor**

Create `src/presentation/components/review/reflection-editor.tsx`:

```tsx
"use client";

import { useState } from "react";

interface ReflectionEditorProps {
  reflection: string;
  onSave: (reflection: string) => void;
}

export function ReflectionEditor({
  reflection: initialReflection,
  onSave,
}: ReflectionEditorProps) {
  const [reflection, setReflection] = useState(initialReflection);

  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        borderRadius: "var(--radius-md)",
        padding: "20px",
        border: "1px solid var(--color-border)",
      }}
    >
      <h3
        style={{
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          marginBottom: "12px",
        }}
      >
        週反思
      </h3>
      <textarea
        value={reflection}
        onChange={(e) => setReflection(e.target.value)}
        placeholder="回顧這一週，記錄你的感想和下週的改進方向..."
        rows={6}
        style={{
          width: "100%",
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
          padding: "12px",
          fontSize: "14px",
          resize: "vertical",
          lineHeight: 1.6,
        }}
      />
      <button
        onClick={() => onSave(reflection)}
        style={{
          marginTop: "12px",
          background: "var(--color-accent)",
          border: "none",
          borderRadius: "var(--radius-sm)",
          color: "white",
          padding: "8px 20px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        儲存反思
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create Weekly Review page**

Create `src/app/review/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { CompletionStats } from "@/presentation/components/review/completion-stats";
import { BlockTypeBreakdown } from "@/presentation/components/review/block-type-breakdown";
import { ReflectionEditor } from "@/presentation/components/review/reflection-editor";

export default function ReviewPage() {
  const [reflection, setReflection] = useState("");

  // Phase A: static placeholder data. Will be replaced with real data
  // from use cases when Supabase is connected.
  const stats = {
    totalBlocks: 0,
    completedBlocks: 0,
    completionRate: 0,
    byType: {
      core: { total: 0, completed: 0 },
      rest: { total: 0, completed: 0 },
      buffer: { total: 0, completed: 0 },
    },
  };

  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--color-accent)",
          }}
        >
          週回顧
        </h1>
        <a
          href="/"
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "14px",
          }}
        >
          &larr; 回到儀表板
        </a>
      </div>

      <CompletionStats
        totalBlocks={stats.totalBlocks}
        completedBlocks={stats.completedBlocks}
        completionRate={stats.completionRate}
      />

      <BlockTypeBreakdown byType={stats.byType} />

      <ReflectionEditor
        reflection={reflection}
        onSave={(text) => setReflection(text)}
      />
    </div>
  );
}
```

- [ ] **Step 5: Start dev server and verify review page**

```bash
pnpm dev
```

Open `http://localhost:3000/review`. Verify:
- Completion stats card shows 0%
- Block type breakdown shows 3 types with empty bars
- Reflection editor has textarea and save button
- "回到儀表板" link works

- [ ] **Step 6: Run all tests**

```bash
pnpm test
```

Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/review/ src/presentation/components/review/
git commit -m "feat: add weekly review page with stats, breakdown, reflection"
```

---

## Task 12: Mobile Day View & Responsive Layout

**Files:**
- Create: `src/presentation/components/day-view/day-view.tsx`
- Create: `src/presentation/components/day-view/block-card.tsx`
- Create: `src/presentation/components/week-overview/week-overview.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Implement BlockCard (mobile block display)**

Create `src/presentation/components/day-view/block-card.tsx`:

```tsx
import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus } from "@/domain/entities/block";

interface BlockCardProps {
  block: Block | null;
  slot: number;
  onClick: () => void;
}

const typeColorMap: Record<BlockType, string> = {
  [BlockType.Core]: "var(--color-block-core)",
  [BlockType.Rest]: "var(--color-block-rest)",
  [BlockType.Buffer]: "var(--color-block-buffer)",
};

const statusLabel: Record<BlockStatus, string> = {
  [BlockStatus.Planned]: "",
  [BlockStatus.InProgress]: "\u25B6 進行中",
  [BlockStatus.Completed]: "\u2713 已完成",
  [BlockStatus.Skipped]: "\u2013 跳過",
};

export function BlockCard({ block, slot, onClick }: BlockCardProps) {
  if (!block) {
    return (
      <button
        onClick={onClick}
        style={{
          background: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: "16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-muted)",
          fontSize: "14px",
          width: "100%",
        }}
      >
        區塊 {slot} — 點擊新增
      </button>
    );
  }

  const borderColor = typeColorMap[block.blockType];

  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--color-bg-secondary)",
        borderLeft: `4px solid ${borderColor}`,
        borderTop: "1px solid var(--color-border)",
        borderRight: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        textAlign: "left",
        opacity: block.status === BlockStatus.Skipped ? 0.5 : 1,
      }}
    >
      <div>
        <div
          style={{
            color: "var(--color-text-primary)",
            fontSize: "15px",
            fontWeight: 500,
          }}
        >
          {block.title}
        </div>
        {block.description && (
          <div
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "12px",
              marginTop: "4px",
            }}
          >
            {block.description}
          </div>
        )}
      </div>
      {statusLabel[block.status] && (
        <span style={{ color: borderColor, fontSize: "12px", flexShrink: 0 }}>
          {statusLabel[block.status]}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Implement DayView**

Create `src/presentation/components/day-view/day-view.tsx`:

```tsx
import type { Block } from "@/domain/entities/block";
import { BlockCard } from "./block-card";

interface DayViewProps {
  dayOfWeek: number;
  blocks: Block[];
  onBlockClick: (dayOfWeek: number, slot: number, block: Block | null) => void;
}

const SLOTS = [1, 2, 3, 4, 5, 6];
const DAY_LABELS = ["", "週一", "週二", "週三", "週四", "週五", "週六", "週日"];

export function DayView({ dayOfWeek, blocks, onBlockClick }: DayViewProps) {
  function findBlock(slot: number): Block | null {
    return blocks.find((b) => b.dayOfWeek === dayOfWeek && b.slot === slot) ?? null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <h2
        style={{
          textAlign: "center",
          color: "var(--color-text-primary)",
          fontSize: "16px",
          fontWeight: 600,
          padding: "8px 0",
        }}
      >
        {DAY_LABELS[dayOfWeek]}
      </h2>
      {SLOTS.map((slot) => {
        const block = findBlock(slot);
        return (
          <BlockCard
            key={slot}
            block={block}
            slot={slot}
            onClick={() => onBlockClick(dayOfWeek, slot, block)}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Implement WeekOverview (mobile simplified grid)**

Create `src/presentation/components/week-overview/week-overview.tsx`:

```tsx
import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus } from "@/domain/entities/block";

interface WeekOverviewProps {
  blocks: Block[];
  onDayClick: (dayOfWeek: number) => void;
}

const DAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const SLOTS = [1, 2, 3, 4, 5, 6];

const typeColorMap: Record<BlockType, string> = {
  [BlockType.Core]: "var(--color-block-core)",
  [BlockType.Rest]: "var(--color-block-rest)",
  [BlockType.Buffer]: "var(--color-block-buffer)",
};

export function WeekOverview({ blocks, onDayClick }: WeekOverviewProps) {
  function findBlock(day: number, slot: number): Block | null {
    return blocks.find((b) => b.dayOfWeek === day && b.slot === slot) ?? null;
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "3px",
        }}
      >
        {DAY_LABELS.map((label, i) => (
          <div
            key={`label-${i}`}
            style={{
              textAlign: "center",
              color: "var(--color-text-secondary)",
              fontSize: "11px",
              padding: "4px 0",
            }}
          >
            {label}
          </div>
        ))}
        {SLOTS.map((slot) =>
          DAY_LABELS.map((_, dayIndex) => {
            const day = dayIndex + 1;
            const block = findBlock(day, slot);
            const bgColor = block
              ? block.status === BlockStatus.Completed
                ? typeColorMap[block.blockType]
                : "var(--color-bg-tertiary)"
              : "var(--color-bg-secondary)";
            const borderColor = block
              ? typeColorMap[block.blockType]
              : "var(--color-border)";
            return (
              <button
                key={`${day}-${slot}`}
                onClick={() => onDayClick(day)}
                style={{
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: "2px",
                  height: "16px",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add responsive CSS to globals.css**

Append to `src/app/globals.css`:

```css
.desktop-only {
  display: block;
}
.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .desktop-only {
    display: none;
  }
  .mobile-only {
    display: block;
  }
}
```

- [ ] **Step 5: Update main page with responsive layout**

Add mobile view to `src/app/page.tsx`. Add imports at the top:

```tsx
import { DayView } from "@/presentation/components/day-view/day-view";
import { WeekOverview } from "@/presentation/components/week-overview/week-overview";
```

Add mobile state after existing useState:

```tsx
const [mobileDay, setMobileDay] = useState<number>(new Date().getDay() || 7);
const [mobileView, setMobileView] = useState<"day" | "overview">("day");
```

Replace the `<main>` section inside the flex container with:

```tsx
<main style={{ flex: 1, padding: "16px", overflow: "auto" }}>
  <div className="desktop-only">
    <WeekGrid blocks={blocks} onBlockClick={handleBlockClick} />
  </div>
  <div className="mobile-only">
    {mobileView === "day" ? (
      <DayView
        dayOfWeek={mobileDay}
        blocks={blocks}
        onBlockClick={handleBlockClick}
      />
    ) : (
      <WeekOverview
        blocks={blocks}
        onDayClick={(day) => {
          setMobileDay(day);
          setMobileView("day");
        }}
      />
    )}
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "16px",
        padding: "12px 0",
        borderTop: "1px solid var(--color-border)",
        marginTop: "16px",
      }}
    >
      <button
        onClick={() => setMobileView("overview")}
        style={{
          background: "none",
          border: "none",
          color:
            mobileView === "overview"
              ? "var(--color-accent)"
              : "var(--color-text-secondary)",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        週總覽
      </button>
      <button
        onClick={() => setMobileView("day")}
        style={{
          background: "none",
          border: "none",
          color:
            mobileView === "day"
              ? "var(--color-accent)"
              : "var(--color-text-secondary)",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        今日
      </button>
      <a
        href="/review"
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "14px",
        }}
      >
        回顧
      </a>
    </div>
  </div>
</main>
```

- [ ] **Step 6: Verify responsive layout**

```bash
pnpm dev
```

Open `http://localhost:3000`:
- Desktop (wide window): shows 7×6 grid
- Mobile (narrow window or DevTools responsive mode at 375px): shows DayView with 6 block cards, bottom nav for switching
- "週總覽" tab shows simplified color grid
- Clicking a day in overview switches to that day's DayView

- [ ] **Step 7: Run all tests**

```bash
pnpm test
```

Expected: All pass.

- [ ] **Step 8: Commit**

```bash
git add src/presentation/components/day-view/ src/presentation/components/week-overview/ src/app/page.tsx src/app/globals.css
git commit -m "feat: add mobile DayView, WeekOverview, responsive layout"
```

---

## Task 13: Final Integration & Cleanup

**Files:**
- Modify: `src/app/page.tsx` (add link to review)
- Cleanup: remove scaffolded `src/app/page.module.css` if present

- [ ] **Step 1: Remove unused scaffolding files**

```bash
rm -f src/app/page.module.css src/app/favicon.ico
```

Remove any imports of `page.module.css` from `page.tsx` if present.

- [ ] **Step 2: Run full quality checks**

```bash
pnpm lint && pnpm type-check && pnpm format:check && pnpm test
```

Expected: All pass.

- [ ] **Step 3: Fix any lint/format issues**

```bash
pnpm format
```

- [ ] **Step 4: Run full checks again after formatting**

```bash
pnpm lint && pnpm type-check && pnpm format:check && pnpm test
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove scaffolding files, fix lint/format"
```

- [ ] **Step 6: Verify complete app in browser**

```bash
pnpm dev
```

Final verification checklist:
- [ ] Dark theme renders correctly
- [ ] Theme toggle switches to light and back
- [ ] 42-block grid displays on desktop
- [ ] Clicking block opens side panel
- [ ] Can set block type, title, description
- [ ] Block appears with correct color in grid
- [ ] Can toggle block status
- [ ] Diary form appears for today's blocks
- [ ] Mobile view shows DayView
- [ ] Mobile "週總覽" shows color grid
- [ ] `/review` page loads with stats and reflection editor
- [ ] No console errors
