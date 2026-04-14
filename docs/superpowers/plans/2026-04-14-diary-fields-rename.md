# Diary Fields Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the diary fields from `line_1/2/3` to `bad/good/next` across DB, domain, data layer, state, and UI, and reorder the UI to show Bad → Good → Next.

**Architecture:** Pure rename. SQL `ALTER TABLE ... RENAME COLUMN` keeps existing data in place. Types and property names change in lock-step from entity to UI. localStorage data gets auto-migrated on load to tolerate both old and new shapes.

**Tech Stack:** TypeScript (strict), Supabase, Next.js, Vitest + RTL.

---

## File Structure

```
supabase/migrations/006_rename_diary_fields.sql                        (new)

src/
  domain/
    entities/
      diary-entry.ts                                                   (modify)
    usecases/
      write-diary.ts                                                   (modify)
  infrastructure/
    supabase/
      database.ts                                                      (modify)
  presentation/
    providers/
      app-state-provider.tsx                                           (modify)
    components/
      side-panel/
        diary-form.tsx                                                 (modify)
      review/
        diary-week-view.tsx                                            (modify)
  app/
    page.tsx                                                           (modify)
    review/
      page.tsx                                                         (modify)

src/__tests__/
  domain/
    entities/
      diary-entry.test.ts                                              (modify)
    usecases/
      write-diary.test.ts                                              (modify)
  presentation/
    components/
      diary-form.test.tsx                                              (modify)
      diary-week-view.test.tsx                                         (modify)
```

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/006_rename_diary_fields.sql`

- [ ] **Step 1: Write migration**

Create `supabase/migrations/006_rename_diary_fields.sql`:

```sql
alter table diary_entries rename column line_1 to bad;
alter table diary_entries rename column line_2 to good;
alter table diary_entries rename column line_3 to next;
```

- [ ] **Step 2: Ask user to run**

Tell user: "Open Supabase Dashboard → SQL Editor → paste the file contents → Run. Expected: `Success. No rows returned.`"

**Important: Do NOT merge the PR before running this migration.** If code deploys with the new column names while the DB still has the old ones, queries will fail. Since this is a solo project with no CI-gated deploys beyond Vercel, the sequence is: run the SQL → merge PR → Vercel deploys new code.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_rename_diary_fields.sql
git commit -m "feat: rename diary_entries columns to bad/good/next"
```

---

## Task 2: Rename Fields in DiaryEntry Entity (TDD)

**Files:**
- Modify: `src/domain/entities/diary-entry.ts`
- Modify: `src/__tests__/domain/entities/diary-entry.test.ts`

- [ ] **Step 1: Update the test**

Replace `src/__tests__/domain/entities/diary-entry.test.ts` entirely with:

```typescript
import { describe, it, expect } from "vitest";
import { createDiaryEntry } from "@/domain/entities/diary-entry";

describe("DiaryEntry", () => {
  it("creates a diary entry with bad/good/next", () => {
    const entry = createDiaryEntry({
      id: "diary-1",
      userId: "user-1",
      entryDate: new Date("2026-04-13"),
      bad: "分心了好幾次",
      good: "完成專案",
      next: "明天早點開始",
      createdAt: new Date(),
    });
    expect(entry.bad).toBe("分心了好幾次");
    expect(entry.good).toBe("完成專案");
    expect(entry.next).toBe("明天早點開始");
  });

  it("rejects empty fields", () => {
    expect(() =>
      createDiaryEntry({
        id: "diary-1",
        userId: "user-1",
        entryDate: new Date("2026-04-13"),
        bad: "",
        good: "Line 2",
        next: "Line 3",
        createdAt: new Date(),
      }),
    ).toThrow("All three diary fields are required");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test -- src/__tests__/domain/entities/diary-entry.test.ts
```

Expected: FAIL — `bad`/`good`/`next` don't exist yet.

- [ ] **Step 3: Update the entity**

Replace `src/domain/entities/diary-entry.ts` entirely with:

```typescript
export interface DiaryEntry {
  readonly id: string;
  readonly userId: string;
  readonly entryDate: Date;
  readonly bad: string;
  readonly good: string;
  readonly next: string;
  readonly createdAt: Date;
}

export interface CreateDiaryEntryInput {
  id: string;
  userId: string;
  entryDate: Date;
  bad: string;
  good: string;
  next: string;
  createdAt: Date;
}

export function createDiaryEntry(input: CreateDiaryEntryInput): DiaryEntry {
  if (!input.bad.trim() || !input.good.trim() || !input.next.trim()) {
    throw new Error("All three diary fields are required");
  }
  return { ...input };
}
```

- [ ] **Step 4: Run tests — expect FAIL elsewhere (other files still use old names)**

```bash
pnpm type-check
```

Expected: FAIL with errors in `write-diary.ts`, `database.ts`, `app-state-provider.tsx`, etc. This is normal. We'll fix them one task at a time.

**Don't commit yet.** The build is broken; we'll unblock it by completing Tasks 3-8 and commit them together at the end.

---

## Task 3: Update WriteDiaryUseCase + Test

**Files:**
- Modify: `src/domain/usecases/write-diary.ts`
- Modify: `src/__tests__/domain/usecases/write-diary.test.ts`

- [ ] **Step 1: Update the use case**

Replace `src/domain/usecases/write-diary.ts` entirely with:

```typescript
import {
  DiaryEntry,
  createDiaryEntry,
} from "@/domain/entities/diary-entry";
import { DiaryRepository } from "@/domain/repositories/diary-repository";

export interface WriteDiaryInput {
  userId: string;
  entryDate: Date;
  bad: string;
  good: string;
  next: string;
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
        bad: input.bad,
        good: input.good,
        next: input.next,
      });
      await this.diaryRepo.update(updated);
      return updated;
    }

    const entry = createDiaryEntry({
      id: crypto.randomUUID(),
      userId: input.userId,
      entryDate: input.entryDate,
      bad: input.bad,
      good: input.good,
      next: input.next,
      createdAt: new Date(),
    });

    await this.diaryRepo.save(entry);
    return entry;
  }
}
```

- [ ] **Step 2: Update the test**

Replace `src/__tests__/domain/usecases/write-diary.test.ts` entirely with:

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
      bad: "分心了",
      good: "完成 A",
      next: "明天早點",
    });

    expect(result.bad).toBe("分心了");
    expect(result.good).toBe("完成 A");
    expect(result.next).toBe("明天早點");
    expect(mockRepo.save).toHaveBeenCalledOnce();
  });

  it("updates existing diary entry for same date", async () => {
    const existing = {
      id: "diary-1",
      userId: "user-1",
      entryDate: new Date("2026-04-13"),
      bad: "舊的",
      good: "舊的",
      next: "舊的",
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
      bad: "新 bad",
      good: "新 good",
      next: "新 next",
    });

    expect(result.bad).toBe("新 bad");
    expect(mockRepo.update).toHaveBeenCalledOnce();
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Don't run type-check yet** — it'll still fail at the DB layer.

---

## Task 4: Update Supabase Data Layer

**Files:**
- Modify: `src/infrastructure/supabase/database.ts`

- [ ] **Step 1: Find the diary-related code**

Run:
```bash
grep -n "line_1\|line_2\|line_3\|DiaryLines\|DbDiary\|fetchDiary\|upsertDiary" src/infrastructure/supabase/database.ts
```

- [ ] **Step 2: Rewrite the diary section**

Find the `// --- Diary ---` section. Replace its entire content (including interfaces) with:

```typescript
// --- Diary ---

interface DbDiary {
  id: string;
  entry_date: string;
  bad: string;
  good: string;
  next: string;
}

export interface DiaryLines {
  bad: string;
  good: string;
  next: string;
}

export async function fetchDiary(
  userId: string,
  dateKey: string,
): Promise<DiaryLines | null> {
  const { data } = await supabase
    .from("diary_entries")
    .select("bad, good, next")
    .eq("user_id", userId)
    .eq("entry_date", dateKey)
    .maybeSingle();

  if (!data) return null;
  const d = data as DbDiary;
  return { bad: d.bad, good: d.good, next: d.next };
}

export async function upsertDiary(
  userId: string,
  dateKey: string,
  bad: string,
  good: string,
  next: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("diary_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("entry_date", dateKey)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("diary_entries")
      .update({ bad, good, next })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("diary_entries").insert({
      user_id: userId,
      entry_date: dateKey,
      bad,
      good,
      next,
    });
    if (error) throw new Error(error.message);
  }
}
```

Do **not** commit yet.

---

## Task 5: Update AppStateProvider

**Files:**
- Modify: `src/presentation/providers/app-state-provider.tsx`

- [ ] **Step 1: Find diary-related code**

Run:
```bash
grep -n "line1\|line2\|line3\|DiaryLines\|saveDiary" src/presentation/providers/app-state-provider.tsx
```

- [ ] **Step 2: Update the saveDiary signature and body**

Find the `saveDiary` useCallback. Replace it with:

```typescript
  const saveDiary = useCallback(
    (dateKey: string, bad: string, good: string, next: string) => {
      if (user) {
        setSupaDiary((prev) => ({
          ...prev,
          [dateKey]: { bad, good, next },
        }));
        upsertDiary(user.id, dateKey, bad, good, next).catch((err) => {
          console.error(err);
          notify.error("日記儲存失敗");
        });
      } else {
        const current = loadFromStorage();
        current.diaryEntries[dateKey] = { bad, good, next };
        saveToStorage(current);
      }
    },
    [user, notify],
  );
```

- [ ] **Step 3: Update AppState interface**

Find the `AppState` interface. Change the `saveDiary` signature to:

```typescript
  saveDiary: (
    dateKey: string,
    bad: string,
    good: string,
    next: string,
  ) => void;
```

- [ ] **Step 4: Add localStorage migration helper**

Find the `loadFromStorage` function near the top. Inside the `try` block, after parsing `raw`, add a migration step. Replace the entire `loadFromStorage` function with:

```typescript
function migrateDiaryEntries(
  raw: Record<string, Record<string, string>> | undefined,
): Record<string, DiaryLines> {
  if (!raw) return {};
  const result: Record<string, DiaryLines> = {};
  for (const [date, v] of Object.entries(raw)) {
    if ("bad" in v || "good" in v || "next" in v) {
      result[date] = {
        bad: (v.bad as string) ?? "",
        good: (v.good as string) ?? "",
        next: (v.next as string) ?? "",
      };
    } else {
      result[date] = {
        bad: (v.line1 as string) ?? "",
        good: (v.line2 as string) ?? "",
        next: (v.line3 as string) ?? "",
      };
    }
  }
  return result;
}

function loadFromStorage(): PersistedData {
  if (typeof window === "undefined") return EMPTY_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DATA;
    const parsed = JSON.parse(raw) as PersistedData & {
      diaryEntries?: Record<string, Record<string, string>>;
    };
    const blocks = (parsed.blocks ?? []).map((b) => createBlock(b));
    return {
      blocks,
      diaryEntries: migrateDiaryEntries(parsed.diaryEntries),
      reflection: parsed.reflection ?? "",
    };
  } catch {
    return EMPTY_DATA;
  }
}
```

(The two functions replace the existing `loadFromStorage`. Keep `saveToStorage`, `clearStorage`, `hasLocalData`, `wasMigrated`, `markMigrated` unchanged.)

- [ ] **Step 5: Don't type-check yet** — still waiting for UI updates.

---

## Task 6: Update DiaryForm Component + Test

**Files:**
- Modify: `src/presentation/components/side-panel/diary-form.tsx`
- Modify: `src/__tests__/presentation/components/diary-form.test.tsx`

- [ ] **Step 1: Update the test first**

Replace `src/__tests__/presentation/components/diary-form.test.tsx` entirely with:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiaryForm } from "@/presentation/components/side-panel/diary-form";

describe("DiaryForm", () => {
  it("renders 3 input fields with Bad, Good, Next labels in order", () => {
    render(<DiaryForm bad="" good="" next="" onSave={() => {}} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(3);
    // The labels appear in DOM order: Bad, Good, Next
    const textContent = document.body.textContent ?? "";
    const badIdx = textContent.indexOf("Bad");
    const goodIdx = textContent.indexOf("Good");
    const nextIdx = textContent.indexOf("Next");
    expect(badIdx).toBeGreaterThan(-1);
    expect(goodIdx).toBeGreaterThan(badIdx);
    expect(nextIdx).toBeGreaterThan(goodIdx);
  });

  it("calls onSave with bad, good, next values", async () => {
    const user = userEvent.setup();
    let saved: { bad: string; good: string; next: string } | null = null;
    render(
      <DiaryForm
        bad=""
        good=""
        next=""
        onSave={(bad, good, next) => {
          saved = { bad, good, next };
        }}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "分心了");
    await user.type(inputs[1], "完成專案");
    await user.type(inputs[2], "明天早點");
    await user.click(screen.getByRole("button", { name: /save|儲存/i }));

    expect(saved).toEqual({
      bad: "分心了",
      good: "完成專案",
      next: "明天早點",
    });
  });
});
```

- [ ] **Step 2: Update the component**

Replace `src/presentation/components/side-panel/diary-form.tsx` entirely with:

```tsx
"use client";
import { useState } from "react";

interface DiaryFormProps {
  bad: string;
  good: string;
  next: string;
  onSave: (bad: string, good: string, next: string) => void;
}

const FIELD_CONFIG: Array<{
  key: "bad" | "good" | "next";
  label: string;
  placeholder: string;
}> = [
  { key: "bad", label: "Bad", placeholder: "Bad — 今天哪裡不好..." },
  { key: "good", label: "Good", placeholder: "Good — 今天哪裡做得好..." },
  { key: "next", label: "Next", placeholder: "Next — 下一步怎麼調整..." },
];

export function DiaryForm({
  bad: initialBad,
  good: initialGood,
  next: initialNext,
  onSave,
}: DiaryFormProps) {
  const [bad, setBad] = useState(initialBad);
  const [good, setGood] = useState(initialGood);
  const [next, setNext] = useState(initialNext);

  const values = { bad, good, next };
  const setters = { bad: setBad, good: setGood, next: setNext };

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
      {FIELD_CONFIG.map(({ key, label, placeholder }) => (
        <div
          key={key}
          style={{ display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <span
            style={{
              color: "var(--color-text-muted)",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            {label}
          </span>
          <input
            type="text"
            value={values[key]}
            onChange={(e) => setters[key](e.target.value)}
            placeholder={placeholder}
            style={{
              background: "var(--color-bg-tertiary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-primary)",
              padding: "8px",
              fontSize: "14px",
            }}
          />
        </div>
      ))}
      <button
        onClick={() => onSave(bad, good, next)}
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

- [ ] **Step 3: Don't run yet** — SidePanel still passes old props.

---

## Task 7: Update SidePanel to Pass New Props

**Files:**
- Modify: `src/presentation/components/side-panel/side-panel.tsx`

- [ ] **Step 1: Find and update the DiaryForm render**

Find the DiaryForm JSX. Replace the existing:

```tsx
{isToday && (
  <DiaryForm
    key={`diary-${dayOfWeek}`}
    line1={diaryLines?.line1 ?? ""}
    line2={diaryLines?.line2 ?? ""}
    line3={diaryLines?.line3 ?? ""}
    onSave={onSaveDiary}
  />
)}
```

With:

```tsx
{isToday && (
  <DiaryForm
    key={`diary-${dayOfWeek}`}
    bad={diaryLines?.bad ?? ""}
    good={diaryLines?.good ?? ""}
    next={diaryLines?.next ?? ""}
    onSave={onSaveDiary}
  />
)}
```

- [ ] **Step 2: Update the SidePanel `diaryLines` prop type**

Find the `SidePanelProps` interface. Change:

```typescript
  diaryLines: { line1: string; line2: string; line3: string } | null;
```

To:

```typescript
  diaryLines: { bad: string; good: string; next: string } | null;
```

- [ ] **Step 3: Update `onSaveDiary` prop type**

Same file, `SidePanelProps`. Change:

```typescript
  onSaveDiary: (line1: string, line2: string, line3: string) => void;
```

To:

```typescript
  onSaveDiary: (bad: string, good: string, next: string) => void;
```

---

## Task 8: Update Dashboard Page (page.tsx)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update the handleSaveDiary signature**

Find `handleSaveDiary`. Replace with:

```typescript
  const handleSaveDiary = (bad: string, good: string, next: string) => {
    if (!selected) return;
    const dateKey = formatDateKey(weekStart, selected.dayOfWeek);
    saveDiary(dateKey, bad, good, next);
  };
```

(The rest of `page.tsx` doesn't need changes since it just passes `handleSaveDiary` through.)

---

## Task 9: Update DiaryWeekView Component + Test

**Files:**
- Modify: `src/presentation/components/review/diary-week-view.tsx`
- Modify: `src/__tests__/presentation/components/diary-week-view.test.tsx`

- [ ] **Step 1: Update the test**

Replace `src/__tests__/presentation/components/diary-week-view.test.tsx` entirely with:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiaryWeekView } from "@/presentation/components/review/diary-week-view";

describe("DiaryWeekView", () => {
  it("renders 7 day cells", () => {
    render(<DiaryWeekView entries={new Array(7).fill(null)} />);
    expect(screen.getByText("週一")).toBeInTheDocument();
    expect(screen.getByText("週二")).toBeInTheDocument();
    expect(screen.getByText("週日")).toBeInTheDocument();
  });

  it("renders diary content for filled entries with Bad/Good/Next labels", () => {
    render(
      <DiaryWeekView
        entries={[
          {
            dayOfWeek: 1,
            bad: "分心了",
            good: "完成 API",
            next: "明天早點",
          },
          null,
          null,
          null,
          null,
          null,
          null,
        ]}
      />,
    );
    expect(screen.getByText("分心了")).toBeInTheDocument();
    expect(screen.getByText("完成 API")).toBeInTheDocument();
    expect(screen.getByText("明天早點")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Update the component**

Replace `src/presentation/components/review/diary-week-view.tsx` entirely with:

```tsx
interface Entry {
  dayOfWeek: number;
  bad: string;
  good: string;
  next: string;
}

interface Props {
  entries: Array<Entry | null>; // length 7, index 0 = Monday
}

const DAY_LABELS = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];

const FIELDS: Array<{ key: "bad" | "good" | "next"; label: string }> = [
  { key: "bad", label: "Bad" },
  { key: "good", label: "Good" },
  { key: "next", label: "Next" },
];

export function DiaryWeekView({ entries }: Props) {
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
        本週日記
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(130px, 1fr))",
          gap: "8px",
          overflowX: "auto",
        }}
      >
        {DAY_LABELS.map((label, i) => {
          const entry = entries[i] ?? null;
          return (
            <div
              key={label}
              style={{
                background: "var(--color-bg-tertiary)",
                borderRadius: "var(--radius-sm)",
                padding: "8px",
                minHeight: "120px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <span
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {label}
              </span>
              {entry ? (
                FIELDS.map(({ key, label: fieldLabel }) => (
                  <div
                    key={key}
                    style={{ display: "flex", flexDirection: "column", gap: "2px" }}
                  >
                    <span
                      style={{
                        color: "var(--color-text-muted)",
                        fontSize: "10px",
                        fontWeight: 600,
                      }}
                    >
                      {fieldLabel}
                    </span>
                    <span
                      style={{
                        color: "var(--color-text-primary)",
                        fontSize: "12px",
                      }}
                    >
                      {entry[key] || "—"}
                    </span>
                  </div>
                ))
              ) : (
                <span
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: "14px",
                  }}
                >
                  —
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Task 10: Update Review Page Wiring

**Files:**
- Modify: `src/app/review/page.tsx`

- [ ] **Step 1: Find the weekDiaries construction**

Look for the loop that builds `weekDiaries`. It currently does:

```typescript
  const weekDiaries: Array<{
    dayOfWeek: number;
    line1: string;
    line2: string;
    line3: string;
  } | null> = [];
  for (let dow = 1; dow <= 7; dow++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + (dow - 1));
    const dateKey = d.toISOString().split("T")[0];
    const entry = diaryEntries[dateKey];
    weekDiaries.push(entry ? { dayOfWeek: dow, ...entry } : null);
  }
```

Replace with:

```typescript
  const weekDiaries: Array<{
    dayOfWeek: number;
    bad: string;
    good: string;
    next: string;
  } | null> = [];
  for (let dow = 1; dow <= 7; dow++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + (dow - 1));
    const dateKey = d.toISOString().split("T")[0];
    const entry = diaryEntries[dateKey];
    weekDiaries.push(entry ? { dayOfWeek: dow, ...entry } : null);
  }
```

(Only the inline type annotation changes; the loop body is already generic via spread.)

---

## Task 11: Full Quality Check + Commit

**Files:** (all the modified files)

- [ ] **Step 1: Run full checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass. If any fail, the error message will say which file still uses old names.

- [ ] **Step 2: Format**

```bash
pnpm format
```

- [ ] **Step 3: Re-run format check**

```bash
pnpm format:check
```

Expected: PASS.

- [ ] **Step 4: Commit everything together**

```bash
git add -A
git commit -m "feat: rename diary line_1/2/3 to bad/good/next, reorder UI"
```

This is one combined commit because the rename touches multiple layers and the intermediate state is broken.

---

## Task 12: PR

- [ ] **Step 1: Push**

```bash
git push -u origin feature/diary-fields-rename
```

- [ ] **Step 2: Manual smoke test**

```bash
pnpm dev
```

Verify:
- Open a block on today → diary section shows 3 inputs labeled Bad / Good / Next in that order
- Fill in something in each, click 儲存 → reload page → values persist (Supabase if logged in, localStorage otherwise)
- Go to /review → 本週日記 shows the filled day with the three labeled sections
- Existing logged-in user: previous diaries load correctly with `bad / good / next` fields populated from the renamed columns

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "feat: rename diary fields to bad/good/next" --body "$(cat <<'EOF'
## Summary

- Rename `line_1 / line_2 / line_3` to `bad / good / next` across DB, domain, data layer, state, and UI
- Reorder UI to display **Bad → Good → Next** (English labels)
- localStorage diary entries auto-migrate on load (tolerates both shapes)

## Database

Migration `supabase/migrations/006_rename_diary_fields.sql`:
- Three `ALTER TABLE ... RENAME COLUMN` statements; no data movement

⚠️ **Run the SQL migration in Supabase before merging this PR.** Deploying code without the renamed columns will break diary queries.

## Test plan

- [ ] Diary section in side panel shows Bad / Good / Next labels in order
- [ ] Save diary → reload → values persist
- [ ] Review page 本週日記 shows three labeled rows per filled day
- [ ] Existing entries (previously stored as line_1/2/3) load correctly after the SQL rename

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

- DB migration (rename_column) — Task 1 ✓
- Entity update + test — Task 2 ✓
- Use case update + test — Task 3 ✓
- Supabase data layer (DiaryLines, fetchDiary, upsertDiary) — Task 4 ✓
- AppState (saveDiary signature, localStorage migration) — Task 5 ✓
- DiaryForm component + test — Task 6 ✓
- SidePanel prop types + wiring — Task 7 ✓
- Dashboard page handleSaveDiary — Task 8 ✓
- DiaryWeekView component + test — Task 9 ✓
- Review page wiring — Task 10 ✓
- Final quality check + commit + PR — Tasks 11, 12 ✓

### 2. Placeholder scan

No TBD / TODO. All tasks have concrete code or commands.

### 3. Type consistency

- `DiaryLines = { bad, good, next }` used consistently across database.ts (Task 4), app-state (Task 5), SidePanel props (Task 7), DiaryForm props (Task 6).
- `DiaryEntry = { ... bad, good, next }` consistent between entity (Task 2), use case (Task 3), repository (unchanged, operates on DiaryEntry).
- `saveDiary(dateKey, bad, good, next)` consistent across AppState definition (Task 5), Dashboard call (Task 8), SidePanel `onSaveDiary` prop (Task 7), DiaryForm `onSave` prop (Task 6).
- `entry.bad`, `entry.good`, `entry.next` consistent in DiaryWeekView rendering (Task 9) and review page construction (Task 10).
- UI order Bad → Good → Next consistent in DiaryForm FIELD_CONFIG (Task 6) and DiaryWeekView FIELDS (Task 9).

All checks pass.
