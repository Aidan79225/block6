import type { PlanChange } from "@/domain/entities/plan-change";

interface PlanChangesLogProps {
  changes: PlanChange[];
}

const ACTION_LABEL: Record<PlanChange["action"], string> = {
  edit: "編輯",
  move: "移動",
  add: "新增",
};

const ACTION_COLOR: Record<PlanChange["action"], string> = {
  edit: "var(--color-block-core)",
  move: "var(--color-block-rest)",
  add: "var(--color-block-general)",
};

const DAY_LABEL = ["日", "一", "二", "三", "四", "五", "六", "日"];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function PlanChangesLog({ changes }: PlanChangesLogProps) {
  const byDay = new Map<number, PlanChange[]>();
  for (const c of changes) {
    const list = byDay.get(c.dayOfWeek) ?? [];
    list.push(c);
    byDay.set(c.dayOfWeek, list);
  }
  const days = Array.from(byDay.keys()).sort((a, b) => a - b);

  return (
    <section
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "16px",
      }}
    >
      <h2
        style={{
          fontSize: "16px",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          marginBottom: "12px",
        }}
      >
        計畫變更紀錄
      </h2>

      {changes.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
          本週沒有計畫變更。
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {days.map((dow) => (
            <div key={dow}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  marginBottom: "4px",
                }}
              >
                週{DAY_LABEL[dow]}
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {(byDay.get(dow) ?? []).map((c) => (
                  <li
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      fontSize: "14px",
                    }}
                  >
                    <span
                      style={{
                        background: ACTION_COLOR[c.action],
                        color: "var(--color-bg-primary)",
                        borderRadius: "var(--radius-sm)",
                        padding: "2px 6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {ACTION_LABEL[c.action]}
                    </span>
                    <span style={{ fontWeight: 600, flexShrink: 0 }}>
                      {c.blockTitleSnapshot || "(untitled)"}
                    </span>
                    <span
                      style={{
                        color: "var(--color-text-secondary)",
                        flex: 1,
                        wordBreak: "break-word",
                      }}
                    >
                      — {c.reason}
                    </span>
                    <span
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: "12px",
                        flexShrink: 0,
                      }}
                    >
                      {formatTime(c.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
