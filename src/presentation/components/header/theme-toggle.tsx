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
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
