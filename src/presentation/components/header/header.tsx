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

export function Header({ weekStart, theme, onPreviousWeek, onNextWeek, onToggleTheme }: HeaderProps) {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px",
      backgroundColor: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border)" }}>
      <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-accent)" }}>BLOCK6</h1>
      <WeekNavigator weekStart={weekStart} onPreviousWeek={onPreviousWeek} onNextWeek={onNextWeek} />
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  );
}
