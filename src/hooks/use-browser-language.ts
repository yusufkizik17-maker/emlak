"use client";
import { useEffect, useSyncExternalStore } from "react";
import type { Language } from "@/lib/i18n";
function subscribe(callback: () => void) {
  window.addEventListener("leadpilot-language", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("leadpilot-language", callback);
    window.removeEventListener("storage", callback);
  };
}
let memoryLanguage: Language = "tr";
function snapshot(): Language {
  try {
    const saved = localStorage.getItem("leadpilot.language");
    return saved === "en" || saved === "tr" ? saved : memoryLanguage;
  } catch {
    return memoryLanguage;
  }
}
export function useBrowserLanguage() {
  const language = useSyncExternalStore(
    subscribe,
    snapshot,
    () => "tr" as Language,
  );
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return [
    language,
    (next: Language) => {
      memoryLanguage = next;
      try {
        localStorage.setItem("leadpilot.language", next);
      } catch {
        /* Optional preference. */
      }
      window.dispatchEvent(new Event("leadpilot-language"));
    },
  ] as const;
}
