"use client";
import { useCallback, useSyncExternalStore } from "react";
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (fn: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", fn);
      return () => media.removeEventListener("change", fn);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
export function useSidebarPreference() {
  const subscribe = useCallback((fn: () => void) => {
    window.addEventListener("leadpilot-sidebar", fn);
    return () => window.removeEventListener("leadpilot-sidebar", fn);
  }, []);
  const collapsed = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem("leadpilot.sidebar") === "collapsed";
      } catch {
        return false;
      }
    },
    () => false,
  );
  return [
    collapsed,
    () => {
      try {
        localStorage.setItem(
          "leadpilot.sidebar",
          collapsed ? "expanded" : "collapsed",
        );
      } catch {
        /* Optional. */
      }
      window.dispatchEvent(new Event("leadpilot-sidebar"));
    },
  ] as const;
}
