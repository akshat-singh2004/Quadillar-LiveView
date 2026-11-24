"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  syncStatus: "supabase" | "edge_fallback" | "local";
  setMode: (mode: "stress-test" | "compliant") => void;
  patchInput: (patch: Partial<MolecularInput>) => void;
  reset: () => void;
}

const STORAGE_KEY = "quadillar_governor_state_v2";
const GovernorContext = createContext<GovernorContextValue | null>(null);

export function GovernorProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<GovernorMode>("stress-test");
  const [input, setInput] = useState<MolecularInput>(EXTREME_TG03_FIXTURE);
  const [syncStatus, setSyncStatus] = useState<"supabase" | "edge_fallback" | "local">("local");

  const localRevRef = useRef<number>(0);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistLocal = useCallback((nextMode: GovernorMode, nextInput: MolecularInput, revision: number) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: nextMode, input: nextInput, revision }));
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  const pushToCloud = useCallback((nextMode: GovernorMode, nextInput: MolecularInput, revision: number) => {
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSyncStatus("local");
        return;
      }
      fetch("/api/governor/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: nextInput.projectId,
          mode: nextMode,
          revision,
          input: nextInput,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.storageMode === "supabase" || data?.storageMode === "edge_fallback") {
            setSyncStatus(data.storageMode);
          }
        })
        .catch(() => setSyncStatus("local"));
    }, 250);
  }, []);

  // Hydrate from sessionStorage first, then sync with cross-device cloud ledger
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          mode?: GovernorMode;
          input?: MolecularInput;
          revision?: number;
        };
        if (parsed.mode && parsed.input) {
          setModeState(parsed.mode);
          setInput(parsed.input);
          localRevRef.current = Number(parsed.revision || 0);
        }
      }
    } catch {
      // Ignore storage errors
    }

    const pullRemote = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSyncStatus("local");
        return;
      }
      fetch(`/api/governor/state?projectId=${encodeURIComponent(EXTREME_TG03_FIXTURE.projectId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          if (data.storageMode === "supabase" || data.storageMode === "edge_fallback") {
            setSyncStatus(data.storageMode);
          }
          const remoteRev = Number(data.revision || 0);
          if (remoteRev > localRevRef.current && data.input) {
            localRevRef.current = remoteRev;
            const remoteMode = (data.mode as GovernorMode) || "custom";
            setModeState(remoteMode);
            setInput(data.input as MolecularInput);
            persistLocal(remoteMode, data.input as MolecularInput, remoteRev);
          }
        })
        .catch(() => {});
    };

    pullRemote();
    const interval = setInterval(pullRemote, 4000);
    window.addEventListener("focus", pullRemote);
    window.addEventListener("online", pullRemote);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", pullRemote);
      window.removeEventListener("online", pullRemote);
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [persistLocal]);

  const setMode = useCallback(
    (nextMode: "stress-test" | "compliant") => {
      const rev = Date.now();
      localRevRef.current = rev;
      const base: MolecularInput = {
        ...(nextMode === "compliant" ? COMPLIANT_TG03_FIXTURE : EXTREME_TG03_FIXTURE),
        recordedAtUtc: new Date().toISOString(),
      };
      setModeState(nextMode);
      setInput(base);
      persistLocal(nextMode, base, rev);
      pushToCloud(nextMode, base, rev);
    },
    [persistLocal, pushToCloud]
  );

  const patchInput = useCallback(
    (patch: Partial<MolecularInput>) => {
      const rev = Date.now();
      localRevRef.current = rev;
      setInput((prev) => {
        const next: MolecularInput = { ...prev, ...patch, recordedAtUtc: new Date().toISOString() };
        setModeState("custom");
        persistLocal("custom", next, rev);
        pushToCloud("custom", next, rev);
        return next;
      });
    },
    [persistLocal, pushToCloud]
  );

  const reset = useCallback(() => setMode("stress-test"), [setMode]);
  const snapshot = useMemo(() => evaluateMolecularGovernor(input), [input]);

  const value = useMemo(
    () => ({ mode, input, snapshot, syncStatus, setMode, patchInput, reset }),
    [mode, input, snapshot, syncStatus, setMode, patchInput, reset]
  );

  return <GovernorContext.Provider value={value}>{children}</GovernorContext.Provider>;
}

export function useGovernor() {
  const ctx = useContext(GovernorContext);
  if (!ctx) throw new Error("useGovernor must be used inside GovernorProvider");
  return ctx;
}
