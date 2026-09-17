"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface DemoContextValue {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  setDemoMode: (enabled: boolean) => void;
}

const defaultDemoContext: DemoContextValue = {
  isDemoMode: false,
  toggleDemoMode: () => undefined,
  setDemoMode: () => undefined,
};

const DemoContext = createContext<DemoContextValue>(defaultDemoContext);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("quadillar-demo-mode");
      if (stored === "true") setIsDemoMode(true);
      if (stored === "false") setIsDemoMode(false);
    } catch {
      // no-op in restricted environments
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("quadillar-demo-mode", String(isDemoMode));
    } catch {
      // no-op in restricted environments
    }
    window.dispatchEvent(new CustomEvent("quadillar-demo-mode-changed", { detail: { isDemoMode } }));
  }, [isDemoMode]);

  const value = useMemo<DemoContextValue>(
    () => ({
      isDemoMode,
      toggleDemoMode: () => setIsDemoMode((current) => !current),
      setDemoMode: setIsDemoMode,
    }),
    [isDemoMode],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemoContext() {
  return useContext(DemoContext);
}
