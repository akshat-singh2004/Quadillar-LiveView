"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";

const DesktopCommandWorkspace = dynamic<{ children: ReactNode }>(
  () => import("./DesktopCommandWorkspace"),
  {
    ssr: false,
    loading: () => <div className="min-h-dvh bg-zinc-950 p-6 text-sm text-zinc-400">Loading Command Workspace...</div>,
  }
);

const MobileFieldDock = dynamic(() => import("./MobileFieldDock"), {
  ssr: false,
});

export function useIsMobileField(breakpointPx = 1024) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpointPx]);

  return isMobile;
}

export default function AdaptiveShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobileField();

  if (isMobile === null) {
    return <main className="min-h-dvh bg-zinc-950 text-zinc-100">{children}</main>;
  }

  return isMobile ? (
    <div className="min-h-dvh pb-20 bg-zinc-950 text-zinc-50 select-none">
      <div className="sticky top-0 z-40 flex items-center justify-between px-4 py-2.5 bg-zinc-900/95 border-b border-zinc-800 backdrop-blur">
        <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
          FIELD MODE • 6 ZONES
        </span>
        <span className="text-xs font-mono text-zinc-300">ONLINE • BSA SEC 63</span>
      </div>
      <main className="px-3 py-3">{children}</main>
      <MobileFieldDock />
    </div>
  ) : (
    <DesktopCommandWorkspace>{children}</DesktopCommandWorkspace>
  );
}
