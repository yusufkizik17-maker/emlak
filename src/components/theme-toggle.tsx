"use client";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useSyncExternalStore } from "react";
function subscribe(callback: () => void) {
  window.addEventListener("leadpilot-theme", callback);
  return () => window.removeEventListener("leadpilot-theme", callback);
}
export function ThemeToggle({ language = "tr" }: { language?: "tr" | "en" }) {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("leadpilot.theme");
    } catch {
      /* Preferences remain optional. */
    }
    document.documentElement.classList.toggle(
      "dark",
      saved === "dark" ||
        (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches),
    );
    window.dispatchEvent(new Event("leadpilot-theme"));
  }, []);
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={
        language === "tr"
          ? dark
            ? "Açık temaya geç"
            : "Koyu temaya geç"
          : dark
            ? "Switch to light theme"
            : "Switch to dark theme"
      }
      onClick={() => {
        const next = !document.documentElement.classList.contains("dark");
        document.documentElement.classList.toggle("dark", next);
        try {
          localStorage.setItem("leadpilot.theme", next ? "dark" : "light");
        } catch {
          /* Optional. */
        }
        window.dispatchEvent(new Event("leadpilot-theme"));
      }}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
