import { ThemeToggle } from "./theme-toggle";
import { WeekNavigator } from "./week-navigator";
import type { Theme } from "@/presentation/hooks/use-theme";

interface HeaderProps {
  weekStart: Date;
  theme: Theme;
  userEmail: string | null;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToggleTheme: () => void;
  onSignOut?: () => void;
}

export function Header({
  weekStart,
  theme,
  userEmail,
  onPreviousWeek,
  onNextWeek,
  onToggleTheme,
  onSignOut,
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
        gap: "12px",
      }}
    >
      <h1
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "var(--color-accent)",
          whiteSpace: "nowrap",
        }}
      >
        The Block 6
      </h1>
      <WeekNavigator
        weekStart={weekStart}
        onPreviousWeek={onPreviousWeek}
        onNextWeek={onNextWeek}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {userEmail ? (
          <>
            <span
              style={{
                color: "var(--color-text-secondary)",
                fontSize: "12px",
                maxWidth: "120px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {userEmail}
            </span>
            <button
              onClick={onSignOut}
              style={{
                background: "none",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-secondary)",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              登出
            </button>
          </>
        ) : (
          <a
            href="/login"
            style={{
              color: "var(--color-accent)",
              fontSize: "13px",
              whiteSpace: "nowrap",
            }}
          >
            登入
          </a>
        )}
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
