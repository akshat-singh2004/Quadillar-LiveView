#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Implementing dynamic sidebar shifting and withdrawal controls...\033[0m"

mkdir -p context components/layout

# -----------------------------------------------------------------------------
# 1. CONTEXT: context/SidebarContext.tsx (Shared Expansion State)
# -----------------------------------------------------------------------------
cat << 'CONTEXT_SIDEBAR' > context/SidebarContext.tsx
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
      // Ignore localStorage read errors in restricted contexts
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
CONTEXT_SIDEBAR

# -----------------------------------------------------------------------------
# 2. COMPONENT: components/layout/Sidebar.tsx
# Includes Withdrawal/Draw Button & Responsive Dynamic Width (w-72 <-> w-16)
# -----------------------------------------------------------------------------
cat << 'COMP_SIDEBAR' > components/layout/Sidebar.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';
import {
  Compass,
  Layers,
  FileText,
  Users,
  Truck,
  Wrench,
  HardHat,
  FlaskConical,
  Thermometer,
  ShieldAlert,
  Clock,
  Calendar,
  Award,
  Calculator,
  Scale,
  FileDiff,
  PackageCheck,
  Landmark,
  TrendingUp,
  Receipt,
  ClipboardCheck,
  FileSpreadsheet,
  Fingerprint,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Camera,
  Activity,
  Scissors,
  Box,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: any;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: '1. Executive & Spatial CDE',
    items: [
      { label: 'Master Command Center', href: '/', icon: Activity },
      { label: '3D BIM Digital Twin', href: '/site/digital-twin', icon: Box },
      { label: 'Site GIS & Crane Radar', href: '/site/gis', icon: Compass },
      { label: '360° Reality Tour', href: '/site/360-tour', icon: Camera },
    ],
  },
  {
    title: '2. Field Telemetry & Labor',
    items: [
      { label: 'Daily Progress Report (DPR)', href: '/site/dpr', icon: FileText },
      { label: 'Gate Inward & Weighbridge', href: '/site/gate-inward', icon: Truck },
      { label: 'Plant & Machinery (P&M)', href: '/operations/plant-machinery', icon: Wrench },
      { label: 'Biometric Labor Muster', href: '/site/labor', icon: Users },
      { label: 'Permit to Work (PTW)', href: '/safety/ptw', icon: HardHat },
      { label: 'Hindrance Register & EOT', href: '/commercial/hindrance-eot', icon: Clock },
      { label: 'Master Schedule (CPM)', href: '/schedule/gantt', icon: Calendar },
      { label: 'EVM S-Curve Cashflow', href: '/executive/evm-scurve', icon: TrendingUp },
      { label: 'Governed Milestones', href: '/milestones', icon: Award },
    ],
  },
  {
    title: '3. Structural Quality & Materials',
    items: [
      { label: 'Pour Cards & IS 516 Cubes', href: '/quality/pour-cards', icon: FlaskConical },
      { label: 'Rebar BBS & Billet Nesting', href: '/engineering/bbs', icon: Scissors },
      { label: 'Geotechnical & Pile Load', href: '/engineering/geotechnical', icon: Activity },
      { label: 'Concrete Maturity & Stripping', href: '/engineering/concrete-maturity', icon: Thermometer },
      { label: 'NCR Quality Debit Liens', href: '/quality/ncr', icon: ShieldAlert },
      { label: 'Material Recon (Cl. 42)', href: '/materials/reconciliation', icon: PackageCheck },
    ],
  },
  {
    title: '4. Commercial & Legal Handover',
    items: [
      { label: 'Measurement Book (e-MB)', href: '/finance/measurement-book', icon: Calculator },
      { label: 'Running Account (RA) Bills', href: '/finance/ra-bills', icon: Receipt },
      { label: 'Retainage Waterfall Ledger', href: '/finance/payment-applications', icon: Landmark },
      { label: 'Contract Variations (VO)', href: '/contracts/variations', icon: FileDiff },
      { label: 'Claims & Dispute Board (DAB)', href: '/contracts/claims-disputes', icon: Scale },
      { label: 'RERA QPR Form 1 & 2', href: '/compliance/rera', icon: FileSpreadsheet },
      { label: 'TOC & Snag Clearance', href: '/handover/punch-list', icon: ClipboardCheck },
      { label: 'Section 65B Audit Vault', href: '/closeout/audit-vault', icon: Fingerprint },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isExpanded, toggleSidebar } = useSidebar();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-40 bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen select-none font-mono text-xs transition-all duration-300 ease-in-out shadow-2xl ${
        isExpanded ? 'w-72' : 'w-16'
      }`}
    >
      {/* BRAND & WITHDRAWAL BUTTON HEADER */}
      <div
        className={`h-14 border-b border-zinc-800 flex items-center shrink-0 bg-zinc-950 px-3 ${
          isExpanded ? 'justify-between' : 'justify-center'
        }`}
      >
        {isExpanded ? (
          <>
            <div className="flex items-center gap-2 overflow-hidden pl-1">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">QUADILLAR OS</div>
                <div className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate">LiveView.OS Core</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Withdraw Sidebar (Collapse)"
              aria-label="Withdraw Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-cyan-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Draw Sidebar (Expand)"
            aria-label="Draw Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* NAVIGATION ITEMS */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-3.5 scrollbar-thin scrollbar-thumb-zinc-800">
        {NAVIGATION_SECTIONS.map((sec) => {
          const isCollapsed = collapsedSections[sec.title];

          return (
            <div key={sec.title} className="space-y-1">
              {isExpanded ? (
                <button
                  type="button"
                  onClick={() => toggleSection(sec.title)}
                  className="w-full flex items-center justify-between text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-300 py-1 px-2 tracking-wider cursor-pointer"
                >
                  <span className="truncate">{sec.title}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform shrink-0 ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>
              ) : (
                <div className="h-px bg-zinc-850 my-2 mx-1" />
              )}

              {(!isCollapsed || !isExpanded) && (
                <div className="space-y-0.5">
                  {sec.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        className={`flex items-center rounded-xl transition ${
                          isExpanded ? 'gap-2.5 px-3 py-2' : 'justify-center p-2.5'
                        } ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30'
                            : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`}
                        />
                        {isExpanded && <span className="truncate">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER SYSTEM TELEMETRY */}
      <div
        className={`p-3 border-t border-zinc-800 bg-zinc-950 text-[10px] text-zinc-500 flex items-center shrink-0 ${
          isExpanded ? 'justify-between' : 'justify-center'
        }`}
      >
        {isExpanded ? (
          <>
            <span>RLS ACTIVE</span>
            <span className="text-emerald-400 font-bold">LIVEVIEW GROUND TRUTH</span>
          </>
        ) : (
          <span
            className="h-2 w-2 rounded-full bg-emerald-400"
            title="Postgres RLS Active • Strict Ground Truth"
          />
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
COMP_SIDEBAR

# -----------------------------------------------------------------------------
# 3. COMPONENT: components/layout/AppShell.tsx
# Smoothly shifts main container (pl-72 vs pl-16) and completely isolates auth
# -----------------------------------------------------------------------------
cat << 'COMP_APP_SHELL' > components/layout/AppShell.tsx
"use client";

import React, { ReactNode, Suspense, Component, ErrorInfo } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
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
              The requested submodule encountered an unhandled exception while mounting:
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
                LiveView Shell Active • Global Route Controls Intact
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

function AppShellInner({ children }: { children: ReactNode }) {
  const { isExpanded } = useSidebar();
  const pathname = usePathname() || "";

  // Suppress sidebar, header and padding completely on login / onboarding routes
  const isAuthOrOnboarding =
    pathname.includes("/onboarding") ||
    pathname.includes("/auth") ||
    pathname.includes("/login") ||
    pathname.includes("/sign-in");

  if (isAuthOrOnboarding) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col w-full antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <main className="flex-1 w-full relative">
          <PageLevelErrorBoundary>
            <Suspense fallback={<PageSuspenseFallback />}>
              {children}
            </Suspense>
          </PageLevelErrorBoundary>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Pinned Left Sidebar */}
      <Sidebar />

      {/* Right Content Viewport: Dynamically shifts pl-72 vs pl-16, NEVER overlays */}
      <div
        className={`flex-1 w-full transition-all duration-300 ease-in-out flex flex-col min-h-screen ${
          isExpanded ? "pl-72" : "pl-16"
        }`}
      >
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

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppShellInner>{children}</AppShellInner>
    </SidebarProvider>
  );
}

export default AppShell;
COMP_APP_SHELL

# -----------------------------------------------------------------------------
# 4. PATCH: components/layout/UnifiedHeader.tsx
# Adds Header-Level Sidebar Drawer Toggle for instant access anywhere
# -----------------------------------------------------------------------------
echo -e "\033[1;33m[*] Checking components/layout/UnifiedHeader.tsx for sidebar toggle button...\033[0m"

node -e '
const fs = require("fs");
const file = "components/layout/UnifiedHeader.tsx";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  if (!content.includes("useSidebar")) {
    // Add import
    content = content.replace(
      /import\s+React[^\n]*;/,
      "import React from \"react\";\nimport { useSidebar } from \"@/context/SidebarContext\";\nimport { PanelLeftClose, PanelLeftOpen } from \"lucide-react\";"
    );

    // Add hook call inside component
    content = content.replace(
      /export\s+(?:default\s+)?function\s+UnifiedHeader\s*\([^\)]*\)\s*\{/,
      "export function UnifiedHeader() {\n  const { isExpanded, toggleSidebar } = useSidebar();"
    );

    // Add toggle button to the leftmost section
    content = content.replace(
      /(<header[^>]*>\s*<div[^>]*flex[^>]*>)/,
      `$1\n        <button\n          type="button"\n          onClick={toggleSidebar}\n          className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer shrink-0 mr-2"\n          title={isExpanded ? "Withdraw Sidebar" : "Draw Sidebar"}\n          aria-label="Toggle Sidebar"\n        >\n          {isExpanded ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4 text-cyan-400" />}\n        </button>`
    );

    fs.writeFileSync(file, content, "utf8");
    console.log("  ✓ Added top-bar toggle button to components/layout/UnifiedHeader.tsx");
  } else {
    console.log("  ✓ UnifiedHeader already supports useSidebar.");
  }
}
'

# -----------------------------------------------------------------------------
# 5. VERIFY TYPESCRIPT COMPILATION HEALTH
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Shifting sidebar & withdrawal button active! Zero errors detected.\033[0m"
