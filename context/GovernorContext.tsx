"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  COMPLIANT_TG03_FIXTURE,
  EXTREME_TG03_FIXTURE,
  evaluateMolecularGovernor,
  type GovernorSnapshot,
  type MolecularInput,
} from "@/lib/engines/molecularGovernor";

export type GovernorMode = "stress-test" | "compliant" | "custom";

interface GovernorContextValue {
  mode: GovernorMode;
  input: MolecularInput;
  snapshot: GovernorSnapshot;
  setMode: (mode: "stress-test" | "compliant") => void;
  patchInput: (patch: Partial<MolecularInput>) => void;
  reset: () => void;
}

const STORAGE_KEY = "quadillar_governor_state_v1";
const GovernorContext = createContext<GovernorContextValue | null>(null);

export function GovernorProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<GovernorMode>("stress-test");
  const [input, setInput] = useState<MolecularInput>(EXTREME_TG03_FIXTURE);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { mode?: GovernorMode; input?: MolecularInput };
        if (parsed.mode && parsed.input) {
          setModeState(parsed.mode);
          setInput(parsed.input);
        }
      }
    } catch {
      // Ignore storage errors in restricted environments
    }
  }, []);

  const persist = useCallback((nextMode: GovernorMode, nextInput: MolecularInput) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: nextMode, input: nextInput }));
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  const setMode = useCallback(
    (nextMode: "stress-test" | "compliant") => {
      const base = nextMode === "compliant" ? COMPLIANT_TG03_FIXTURE : EXTREME_TG03_FIXTURE;
      setModeState(nextMode);
      setInput(base);
      persist(nextMode, base);
    },
    [persist]
  );

  const patchInput = useCallback(
    (patch: Partial<MolecularInput>) => {
      setInput((prev) => {
        const next = { ...prev, ...patch, recordedAtUtc: new Date().toISOString() };
        setModeState("custom");
        persist("custom", next);
        return next;
      });
    },
    [persist]
  );

  const reset = useCallback(() => setMode("stress-test"), [setMode]);

  const snapshot = useMemo(() => evaluateMolecularGovernor(input), [input]);

  const value = useMemo(
    () => ({ mode, input, snapshot, setMode, patchInput, reset }),
    [mode, input, snapshot, setMode, patchInput, reset]
  );

  return <GovernorContext.Provider value={value}>{children}</GovernorContext.Provider>;
}

export function useGovernor() {
  const ctx = useContext(GovernorContext);
  if (!ctx) throw new Error("useGovernor must be used inside GovernorProvider");
  return ctx;
}
