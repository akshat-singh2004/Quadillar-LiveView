"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type LiveviewThemeMode = "obsidian-dark" | "claude-light";

interface LiveviewThemeContextValue {
  theme: LiveviewThemeMode;
  isLight: boolean;
  setThemeMode: (mode: LiveviewThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "quadillar-liveview-theme";

const LiveviewThemeContext = createContext<LiveviewThemeContextValue>({
  theme: "obsidian-dark",
  isLight: false,
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export function LiveviewThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<LiveviewThemeMode>("obsidian-dark");

  const applyThemeToDocument = useCallback((mode: LiveviewThemeMode) => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", mode);
    document.documentElement.style.colorScheme = mode === "claude-light" ? "light" : "dark";
    window.dispatchEvent(new CustomEvent("liveview-theme-change", { detail: mode }));
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LiveviewThemeMode | null;
      if (saved === "claude-light" || saved === "obsidian-dark") {
        setTheme(saved);
        applyThemeToDocument(saved);
      } else {
        applyThemeToDocument("obsidian-dark");
      }
    } catch (e) {
      applyThemeToDocument("obsidian-dark");
    }
  }, [applyThemeToDocument]);

  const setThemeMode = useCallback(
    (mode: LiveviewThemeMode) => {
      setTheme(mode);
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch (e) {}
      applyThemeToDocument(mode);
    },
    [applyThemeToDocument]
  );

  const toggleTheme = useCallback(() => {
    setThemeMode(theme === "obsidian-dark" ? "claude-light" : "obsidian-dark");
  }, [theme, setThemeMode]);

  return (
    <LiveviewThemeContext.Provider
      value={{
        theme,
        isLight: theme === "claude-light",
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </LiveviewThemeContext.Provider>
  );
}

export function useLiveviewTheme() {
  return useContext(LiveviewThemeContext);
}
