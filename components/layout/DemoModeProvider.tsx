"use client";

import { DemoProvider, useDemoContext } from "@/context/DemoContext";
import type { ReactNode } from "react";

export function DemoModeProvider({ children }: { children: ReactNode }) {
  return <DemoProvider>{children}</DemoProvider>;
}

export function useDemoMode() {
  const { isDemoMode, setDemoMode } = useDemoContext();
  return { enabled: isDemoMode, setEnabled: setDemoMode };
}
