"use client";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { demoData, demoAnalysis } from "@/lib/demo";
import {
  analysisSchema,
  workspaceSchema,
  mutationSchema,
  type Mutation,
  type WorkspaceData,
} from "@/lib/domain";
import { dictionaries, type Language } from "@/lib/i18n";
const storageKey = "leadpilot.demo.v2";
type ContextValue = {
  data: WorkspaceData;
  mode: "demo" | "live";
  language: Language;
  t: typeof dictionaries.tr;
  loading: boolean;
  error: string;
  notice: string;
  mutate: (input: Mutation) => Promise<void>;
  analyze: (lead_id: string, message: string) => Promise<void>;
  setLanguage: (language: Language) => void;
  reset: () => void;
  dismiss: () => void;
};
const Context = createContext<ContextValue | null>(null);
export function WorkspaceProvider({
  mode,
  children,
}: {
  mode: "demo" | "live";
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [data, setData] = useState<WorkspaceData>(
    mode === "demo"
      ? structuredClone(demoData)
      : {
          role: "member",
          leads: [],
          tasks: [],
          suggestions: [],
          activities: [],
          members: [],
          memberships: [],
          organization: { id: "", name: "", retention_days: 365 },
          profile: { full_name: "", language: "tr" },
        },
  );
  const [language, setLanguageState] = useState<Language>("tr");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const t = dictionaries[language];
  const refresh = useCallback(async () => {
    const response = await fetch("/api/workspace", { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    if (!response.ok) throw new Error("Workspace unavailable");
    const next = workspaceSchema.parse(await response.json());
    setData(next);
    let preferred: string | null = null;
    try {
      preferred = localStorage.getItem("leadpilot.language");
    } catch {
      /* Optional. */
    }
    setLanguageState(
      preferred === "tr" || preferred === "en"
        ? preferred
        : next.profile.language,
    );
  }, [router]);
  useEffect(() => {
    async function load() {
      try {
        let lang: string | null = null;
        try {
          lang = localStorage.getItem("leadpilot.language");
        } catch {
          /* Preferences must not block live access. */
        }
        if (lang === "tr" || lang === "en") setLanguageState(lang);
        if (mode === "demo") {
          const saved = sessionStorage.getItem(storageKey);
          if (saved) {
            const next = workspaceSchema.parse(JSON.parse(saved));
            if (
              Array.isArray(next.leads) &&
              Array.isArray(next.tasks) &&
              next.organization
            )
              setData(next);
          }
        } else await refresh();
      } catch {
        setError(dictionaries.tr.error);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [mode, refresh]);
  useEffect(() => {
    if (!loading && mode === "demo") {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(data));
      } catch {
        /* Storage is optional, in-memory demo still works. */
      }
    }
  }, [data, mode, loading]);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const setLanguage = (value: Language) => {
    setLanguageState(value);
    try {
      localStorage.setItem("leadpilot.language", value);
    } catch {
      /* Optional preference persistence. */
    }
  };
  async function mutate(input: Mutation) {
    setError("");
    setNotice("");
    try {
      const change = mutationSchema.parse(input);
      if (mode === "live") {
        const response = await fetch("/api/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(change),
        });
        if (!response.ok) throw new Error("Mutation failed");
        await refresh();
      } else {
        setData((previous) => {
          const next = structuredClone(previous);
          const now = new Date().toISOString();
          const id = crypto.randomUUID();
          switch (change.action) {
            case "lead.create":
              next.leads.unshift({ ...change.data, id, created_at: now });
              break;
            case "lead.update":
              next.leads = next.leads.map((lead) =>
                lead.id === change.id ? { ...lead, ...change.data } : lead,
              );
              break;
            case "lead.delete":
              next.leads = next.leads.filter((lead) => lead.id !== change.id);
              next.tasks = next.tasks.filter(
                (task) => task.lead_id !== change.id,
              );
              next.suggestions = next.suggestions.filter(
                (s) => s.lead_id !== change.id,
              );
              break;
            case "task.create":
              next.tasks.unshift({ ...change.data, id, created_at: now });
              break;
            case "task.toggle":
              next.tasks = next.tasks.map((task) =>
                task.id === change.id
                  ? { ...task, completed: change.completed }
                  : task,
              );
              break;
            case "task.delete":
              next.tasks = next.tasks.filter((task) => task.id !== change.id);
              break;
            case "profile.update":
              next.profile = {
                full_name: change.full_name,
                language: change.language,
              };
              break;
            case "organization.update":
              next.organization = {
                ...next.organization,
                name: change.name,
                retention_days: change.retention_days,
              };
              break;
            case "suggestion.approve": {
              const s = next.suggestions.find((s) => s.id === change.id);
              if (s && !s.approved_at) {
                s.analysis.reply = change.reply;
                s.approved_at = now;
                if (change.create_task)
                  next.tasks.unshift({
                    id,
                    title: s.analysis.follow_up,
                    lead_id: s.lead_id,
                    completed: false,
                    due_at: new Date(Date.now() + 86400000).toISOString(),
                    created_at: now,
                  });
              }
              break;
            }
            case "retention.purge": {
              const expired = new Set(
                next.leads
                  .filter(
                    (l) =>
                      Date.parse(l.created_at) <
                      Date.now() - next.organization.retention_days * 86400000,
                  )
                  .map((l) => l.id),
              );
              next.leads = next.leads.filter((l) => !expired.has(l.id));
              next.tasks = next.tasks.filter(
                (v) => !v.lead_id || !expired.has(v.lead_id),
              );
              next.suggestions = next.suggestions.filter(
                (v) => !expired.has(v.lead_id),
              );
              break;
            }
          }
          next.activities.unshift({
            id: crypto.randomUUID(),
            action: change.action,
            created_at: now,
          });
          return next;
        });
      }
      setNotice(t.saved);
    } catch {
      setError(t.error);
      throw new Error("Operation failed");
    }
  }
  async function analyze(lead_id: string, message: string) {
    setError("");
    try {
      if (mode === "demo") {
        const analysis = analysisSchema.parse(demoAnalysis(language));
        setData((d) => ({
          ...d,
          suggestions: [
            {
              id: crypto.randomUUID(),
              lead_id,
              analysis,
              approved_at: null,
              created_at: new Date().toISOString(),
            },
            ...d.suggestions,
          ],
        }));
      } else {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead_id, message, language }),
        });
        if (!response.ok)
          throw new Error(response.status === 429 ? "limit" : "analysis");
        await refresh();
      }
    } catch (e) {
      setError(
        e instanceof Error && e.message === "limit"
          ? language === "tr"
            ? "AI kullanım sınırına ulaşıldı. Daha sonra deneyin."
            : "AI usage limit reached. Try again later."
          : t.error,
      );
    }
  }
  return (
    <Context.Provider
      value={{
        data,
        mode,
        language,
        t,
        loading,
        error,
        notice,
        mutate,
        analyze,
        setLanguage,
        reset: () => {
          setData(structuredClone(demoData));
        },
        dismiss: () => {
          setError("");
          setNotice("");
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("Workspace provider missing");
  return value;
}
