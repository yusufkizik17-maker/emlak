"use client";
import { useTheme } from "next-themes";
import { Monitor, Sun, Moon } from "lucide-react";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
export function ThemeToggle({ language = "tr" }: { language?: "tr" | "en" }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <div className="relative flex h-8 w-28 items-center gap-1 rounded-md border bg-card px-2 text-muted-foreground">
      {mounted && theme === "dark" ? (
        <Moon className="size-3.5 shrink-0" aria-hidden="true" />
      ) : mounted && theme === "light" ? (
        <Sun className="size-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <Monitor className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      <select
        className="w-full min-w-0 bg-card text-xs text-foreground outline-none"
        aria-label={language === "tr" ? "Tema" : "Theme"}
        value={mounted ? theme || "system" : "system"}
        disabled={!mounted}
        onChange={(e) => setTheme(e.target.value)}
      >
        <option value="light">{language === "tr" ? "Açık" : "Light"}</option>
        <option value="dark">{language === "tr" ? "Koyu" : "Dark"}</option>
        <option value="system">
          {language === "tr" ? "Sistem" : "System"}
        </option>
      </select>
    </div>
  );
}
