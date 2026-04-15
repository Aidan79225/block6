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
  onTitleClick: () => void;
}

export function Header({
  weekStart,
  theme,
  userEmail,
  onPreviousWeek,
  onNextWeek,
  onToggleTheme,
  onSignOut,
  onTitleClick,
}: HeaderProps) {
  return (
    <header
      className="app-header"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 16px",
        backgroundColor: "var(--color-bg-secondary)",
        borderBottom: "1px solid var(--color-border)",
        gap: "8px",
        minWidth: 0,
      }}
    >
      <button
        type="button"
        onClick={onTitleClick}
        aria-label="About The Block 6"
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "var(--color-accent)",
          whiteSpace: "nowrap",
          flexShrink: 0,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          font: "inherit",
        }}
      >
        The Block 6
      </button>
      <WeekNavigator
        weekStart={weekStart}
        onPreviousWeek={onPreviousWeek}
        onNextWeek={onNextWeek}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        {userEmail ? (
          <>
            <span
              className="desktop-only"
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
