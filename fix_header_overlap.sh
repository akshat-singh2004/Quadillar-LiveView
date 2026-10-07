#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Fixing header overlap and docking UnifiedHeader to normal document flow...\033[0m"

# -----------------------------------------------------------------------------
# 1. PATCH: components/layout/UnifiedHeader.tsx
# Convert fixed positioning to sticky flow so it never overlaps the main content
# -----------------------------------------------------------------------------
if [ -f "components/layout/UnifiedHeader.tsx" ]; then
  node -e '
    const fs = require("fs");
    const file = "components/layout/UnifiedHeader.tsx";
    let content = fs.readFileSync(file, "utf8");

    // Replace any fixed positioning variants with sticky dock classes
    content = content.replace(/className=(["\x27])([^"\x27]*)\bfixed\s+top-0\s+left-0\s+right-0\b([^"\x27]*)\1/g,
      "className=$1$2sticky top-0 z-30 w-full$3$1");
    content = content.replace(/className=(["\x27])([^"\x27]*)\bfixed\s+inset-x-0\s+top-0\b([^"\x27]*)\1/g,
      "className=$1$2sticky top-0 z-30 w-full$3$1");
    content = content.replace(/className=(["\x27])([^"\x27]*)\bfixed\s+top-0\b([^"\x27]*)\1/g,
      "className=$1$2sticky top-0 z-30 w-full$3$1");

    // If pl-72 or left-72 was applied inside the header, normalize it since parent div already has pl-72
    content = content.replace(/\b(pl-72|left-72|md:pl-72|md:left-72)\b/g, "");

    fs.writeFileSync(file, content, "utf8");
    console.log("  ✓ Patched components/layout/UnifiedHeader.tsx to sticky top-0 flow");
  '
fi

# -----------------------------------------------------------------------------
# 2. ALIGN: components/layout/AppShell.tsx
# Ensure the right pane flows the header, banners, and main viewport sequentially
# -----------------------------------------------------------------------------
cat << 'COMP_APP_SHELL' > components/layout/AppShell.tsx
"use client";

import React, { ReactNode, Suspense, Component, ErrorInfo } from "react";
import { UnifiedHeader } from "@/components/layout/UnifiedHeader";
import ConnectionStatusBanner from "@/components/liveview/ConnectionStatusBanner";
import { OfflineSyncBanner } from "@/components/layout/OfflineSyncBanner";
import { Sidebar } from "@/components/layout/Sidebar";
import { AlertOctagon, RefreshCw, Terminal } from "lucide-react";

interface AppShellProps {
  children: ReactNode;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class PageLevelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[LiveView Shell Critical Error Boundary]:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[calc(100vh-140px)] w-full items-center justify-center p-6 font-mono text-xs">
          <div className="max-w-xl w-full bg-zinc-900 border border-rose-900/60 rounded p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-rose-900/40 pb-3">
              <div className="p-2 rounded bg-rose-950 text-rose-400 border border-rose-800">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Module Telemetry Fault
                </h3>
                <span className="text-[10px] text-zinc-500 uppercase">
                  Telemetry Execution Halted • Viewport Preserved
                </span>
              </div>
            </div>

            <p className="text-zinc-300">
              The requested submodule encountered an unhandled exception while mounting or synchronizing with Supabase:
            </p>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded font-mono text-[11px] text-rose-300 overflow-x-auto max-h-40">
              <div className="flex items-center gap-1.5 text-zinc-500 mb-1 text-[10px]">
                <Terminal className="w-3.5 h-3.5" />
                <span>FAULT STACK SUMMARY</span>
              </div>
              <code>{this.state.error?.message || "Unknown runtime fault"}</code>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] text-zinc-500">
                LiveView Shell Active • Global Header &amp; Route Controls Intact
              </span>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 hover:text-white font-bold uppercase rounded flex items-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-Initialize Module</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function PageSuspenseFallback() {
  return (
    <div className="flex h-[calc(100vh-140px)] w-full items-center justify-center p-6 font-mono">
      <div className="flex flex-col items-center space-y-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <span className="text-xs text-zinc-400 tracking-wider uppercase">
          Streaming Module Telemetry...
        </span>
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Pinned Left Sidebar (Fixed 72 = 288px) */}
      <Sidebar />

      {/* Right Content Viewport Area */}
      <div className="flex-1 w-full pl-72 flex flex-col min-h-screen">
        <OfflineSyncBanner />
        <UnifiedHeader />
        <ConnectionStatusBanner />
        <main className="flex-1 w-full relative">
          <PageLevelErrorBoundary>
            <Suspense fallback={<PageSuspenseFallback />}>
              {children}
            </Suspense>
          </PageLevelErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
COMP_APP_SHELL

# -----------------------------------------------------------------------------
# 3. VERIFY COMPILATION HEALTH
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying TypeScript compilation health with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Header repositioned successfully! Zero overlap, zero errors.\033[0m"
