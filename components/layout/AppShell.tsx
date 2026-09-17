"use client";

import React, { ReactNode } from "react";
import { UnifiedHeader } from "@/components/layout/UnifiedHeader";
import ConnectionStatusBanner from "@/components/liveview/ConnectionStatusBanner";
import { OfflineSyncBanner } from "@/components/layout/OfflineSyncBanner";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <OfflineSyncBanner />
      <UnifiedHeader />
      <ConnectionStatusBanner />
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}