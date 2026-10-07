"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SidebarContextType {
  isExpanded: boolean;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isExpanded: true,
  setIsExpanded: () => {},
  toggleSidebar: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("quadillar_sidebar_expanded");
      if (stored !== null) {
        setIsExpanded(stored === "true");
      }
    } catch {
      // Ignore in restricted environments
    }
  }, []);

  const toggleSidebar = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("quadillar_sidebar_expanded", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{ isExpanded, setIsExpanded, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
