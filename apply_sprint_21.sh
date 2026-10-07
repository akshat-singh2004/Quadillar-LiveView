#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Applying Sprint 21: Viewport-Pinned 2-Pane Shell & Zero-Scroll Layout...\033[0m"

# -----------------------------------------------------------------------------
# 1. FIX: components/layout/Sidebar.tsx (Pinned Fixed Left Pane)
# -----------------------------------------------------------------------------
cat << 'COMP_SIDEBAR' > components/layout/Sidebar.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  ShieldCheck,
  Clock,
  Calendar,
  Award,
  Calculator,
  Scale,
  Briefcase,
  MinusCircle,
  FileDiff,
  PackageCheck,
  Landmark,
  TrendingUp,
  Boxes,
  Receipt,
  ClipboardCheck,
  FileCheck2,
  FileSpreadsheet,
  Fingerprint,
  ChevronDown,
  Camera,
  Activity,
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
      { label: 'GFC Spatial Blueprint', href: '/drawings/gfc-canvas', icon: Compass },
      { label: '360° Site Reality Tour', href: '/site/360-tour', icon: Camera },
    ],
  },
  {
    title: '2. Field Telemetry & Labor',
    items: [
      { label: 'Daily Progress Report (DPR)', href: '/site/dpr', icon: FileText },
      { label: "Gate Inward & Weighbridge", href: "/site/gate-inward", icon: Truck },
      { label: "Plant & Machinery (P&M)", href: "/operations/plant-machinery", icon: Wrench },
      { label: 'Biometric Turnstiles (BOCW)', href: '/site/labor', icon: Users },
      { label: 'Permit to Work (PTW)', href: '/safety/ptw', icon: HardHat },
      { label: "Hindrance Register & EOT", href: "/commercial/hindrance-eot", icon: Clock },
      { label: "Master Schedule (CPM)", href: "/schedule/gantt", icon: Calendar },
      { label: "EVM S-Curve Cashflow", href: "/executive/evm-scurve", icon: TrendingUp },
      { label: "Governed Milestones", href: "/milestones", icon: Award },
      { label: "BOCW HSE Compliance", href: "/safety/hse-compliance", icon: ShieldCheck },
    ],
  },
  {
    title: '3. Structural Quality & Materials',
    items: [
      { label: 'Pour Cards & IS 516 Cubes', href: '/quality/pour-cards', icon: FlaskConical },
      { label: "ITP Stage-Gate Matrix", href: "/quality/itp", icon: Layers },
      { label: "Visual Defect AI", href: "/quality/vision-ai", icon: Camera },
      { label: 'Concrete Maturity & Stripping', href: '/engineering/concrete-maturity', icon: Thermometer },
      { label: 'NCR Quality Debit Liens', href: '/quality/ncr', icon: ShieldAlert },
      { label: 'Fitout Finishes Matrix', href: '/interiors/fitout-matrix', icon: Layers },
      { label: 'Material Recon (Cl. 42)', href: '/materials/reconciliation', icon: PackageCheck },
      { label: "Advances & Form 31", href: "/commercial/advances-recoveries", icon: Landmark },
      { label: "Price Escalation (Cl. 10CC)", href: "/commercial/price-escalation", icon: TrendingUp },
      { label: "Secured Advance (Form 10A)", href: "/finance/secured-advance", icon: Boxes },
    ],
  },
  {
    title: '4. Commercial & Legal Handover',
    items: [
      { label: 'Digital Measurement Book (e-MB)', href: '/finance/measurement-book', icon: Calculator },
      { label: "Subcontractor Work Orders", href: "/contracts/work-orders", icon: Briefcase },
      { label: "Tender Packages (RFP)", href: "/procurement/tenders", icon: FileSpreadsheet },
      { label: "Comparative Statement (CST)", href: "/procurement/tender-evaluation", icon: Scale },
      { label: "Vendor Directory", href: "/procurement/vendors", icon: Users },
      { label: "Material Recon (Cl. 42)", href: "/operations/material-recon", icon: Scale },
      { label: "Contra-Charges & Backcharges", href: "/finance/backcharges", icon: MinusCircle },
      { label: "Subcontractor IPCs", href: "/finance/subcontractors", icon: Users },
      { label: 'Potential Change Orders (PCO)', href: '/finance/change-orders', icon: FileDiff },
      { label: "Contract Variations (VO)", href: "/contracts/variations", icon: FileDiff },
      { label: "Claims & Dispute Board (DAB)", href: "/contracts/claims-disputes", icon: Scale },
      { label: 'Running Account (RA) Billing', href: '/finance/ra-bills', icon: Receipt },
      { label: 'TOC & Snag Clearance', href: '/handover/punch-list', icon: ClipboardCheck },
      { label: 'Final Bill & PBG Release', href: '/finance/final-bill', icon: FileCheck2 },
      { label: 'Section 65B Audit Vault', href: '/closeout/audit-vault', icon: Fingerprint },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className="fixed top-0 bottom-0 left-0 z-40 w-72 bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen select-none font-mono text-xs shadow-2xl">
      {/* Brand Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-950">
        <div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">QUADILLAR OS</div>
          <div className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 mt-0.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LiveView.OS Core</span>
          </div>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 font-bold uppercase">
          v2.4-PROD
        </span>
      </div>

      {/* Nav Accordions */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
        {NAVIGATION_SECTIONS.map((sec) => {
          const isCollapsed = collapsedSections[sec.title];
          return (
            <div key={sec.title} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleSection(sec.title)}
                className="w-full flex items-center justify-between text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-300 py-1 px-2 tracking-wider cursor-pointer"
              >
                <span>{sec.title}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>

              {!isCollapsed && (
                <div className="space-y-0.5">
                  {sec.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded transition ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30'
                            : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer System Telemetry */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950 text-[10px] text-zinc-500 flex justify-between items-center shrink-0">
        <span>SECURITY: RLS ACTIVE</span>
        <span className="text-emerald-400 font-bold">GROUND TRUTH STRICT</span>
      </div>
    </aside>
  );
}

export default Sidebar;
COMP_SIDEBAR

# -----------------------------------------------------------------------------
# 2. FIX: components/layout/SidebarAwareLayout.tsx (Guaranteed 2-Pane Shell)
# -----------------------------------------------------------------------------
cat << 'COMP_SIDEBAR_LAYOUT' > components/layout/SidebarAwareLayout.tsx
'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';

interface SidebarAwareLayoutProps {
  children: React.ReactNode;
}

export function SidebarAwareLayout({ children }: SidebarAwareLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Pinned Left Sidebar */}
      <Sidebar />

      {/* Right Main Content Pane: Exactly offset by w-72 (288px) */}
      <div className="flex-1 w-full pl-72 transition-all duration-200 min-h-screen flex flex-col">
        <main className="w-full flex-1 relative">
          {children}
        </main>
      </div>
    </div>
  );
}

export default SidebarAwareLayout;
COMP_SIDEBAR_LAYOUT

# -----------------------------------------------------------------------------
# 3. FIX: components/layout/AppShell.tsx (Coordinates Header & Pinned Sidebar)
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
        <div className="flex h-[calc(100vh-140px)] w-full items-center justify-center p-6 font-mono">
          <div className="max-w-xl w-full bg-zinc-900/90 border border-rose-900/60 rounded p-6 shadow-2xl space-y-4">
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

            <p className="text-xs text-zinc-300">
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
                className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 hover:text-white text-xs font-bold uppercase rounded flex items-center gap-2 transition cursor-pointer"
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
# 4. COMPACT REFACTOR: app/page.tsx (Master Command Center Zero-Gap Viewport)
# -----------------------------------------------------------------------------
cat << 'PAGE_ROOT' > app/page.tsx
import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteStreamPlayer } from "@/components/site/SiteStreamPlayer";
import {
  ShieldCheck,
  Video,
  FileCheck2,
  Clock,
  Activity,
  Layers,
  AlertCircle,
  TrendingUp,
  Receipt,
  FileText,
} from "lucide-react";

function formatInr(val: number): string {
  if (!val || val === 0) return "₹0.00";
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

export default async function RealityCommandRootPage() {
  const supabase = await createClient();

  // 1. Resolve Active Project Context from Database
  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name, contract_value")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";
  const contractBudget = Number(projectRow?.contract_value) || 450000000;

  // 2. Verified Measurement Book Turnover
  const { data: mbRows } = await supabase
    .from("digital_measurement_book_entries")
    .select("measured_quantity")
    .eq("project_id", projectId)
    .eq("consultant_qs_verified", true);

  const certifiedMbLines = mbRows?.length || 0;

  // 3. Certified RA Bills (Interim Payment Certificates)
  const { data: bills } = await supabase
    .from("running_account_bills")
    .select("net_payable_certified, retention_amount, status")
    .eq("project_id", projectId);

  const certifiedNetDisbursed = (bills || [])
    .filter((b) => b.status === "SEOR_CERTIFIED_IPC" || b.status === "FINANCE_DISBURSED")
    .reduce((sum, b) => sum + (Number(b.net_payable_certified) || 0), 0);

  const totalRetentionEscrow = (bills || []).reduce(
    (sum, b) => sum + (Number(b.retention_amount) || 0),
    0
  );

  // 4. Quality Withholding Liens (NCRs)
  const { data: ncrs } = await supabase
    .from("quality_ncr_register")
    .select("withholding_amount_inr, status")
    .eq("project_id", projectId)
    .neq("status", "CLOSED");

  const totalNcrDebits = (ncrs || []).reduce(
    (sum, r) => sum + (Number(r.withholding_amount_inr) || 0),
    0
  );

  // 5. Contemporaneous Hindrances & Delay Float
  const { data: hindrances } = await supabase
    .from("site_hindrance_register")
    .select("days_hindered, status")
    .eq("project_id", projectId)
    .eq("status", "OPEN_CRITICAL_DELAY");

  const delayDays = (hindrances || []).reduce(
    (sum, r) => sum + (Number(r.days_hindered) || 0),
    0
  );

  // 6. Section 65B Immutable Audit Trail
  const { data: auditLogs } = await supabase
    .from("immutable_audit_logs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(4);

  const logs = auditLogs || [];

  return (
    <div className="w-full bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-5">
      {/* HEADER BAR */}
      <header className="border-b border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>STATUTORY PROJECT GOVERNANCE • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase mt-0.5">
            Master Command Center
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Contract Baseline: <strong className="text-zinc-200">{formatInr(contractBudget)}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-emerald-400 font-bold uppercase text-[10px]">
            POSTGRES RLS LIVE
          </div>
        </div>
      </header>

      {/* 5 EXECUTIVE TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] uppercase text-zinc-500 block font-bold">Total Contract Baseline</span>
          <div className="text-lg font-bold text-white tabular-nums">{formatInr(contractBudget)}</div>
          <span className="text-[10px] text-zinc-500 block">Sanctioned BOQ Value</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] uppercase text-zinc-500 block font-bold">Certified e-MB Measure</span>
          <div className="text-lg font-bold text-cyan-400 tabular-nums">
            {certifiedMbLines > 0 ? `${certifiedMbLines} Verified Lines` : "0 Lines Verified"}
          </div>
          <span className="text-[10px] text-zinc-500 block">Assistant Engineer Test-Checked</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] uppercase text-zinc-500 block font-bold">Retained Escrow (5%)</span>
          <div className="text-lg font-bold text-amber-400 tabular-nums">{formatInr(totalRetentionEscrow)}</div>
          <span className="text-[10px] text-zinc-500 block">CPWD Cl. 1A / FIDIC 14.3</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] uppercase text-zinc-500 block font-bold">Active NCR Liens</span>
          <div className={`text-lg font-bold tabular-nums ${totalNcrDebits > 0 ? "text-rose-400" : "text-zinc-300"}`}>
            {formatInr(totalNcrDebits)}
          </div>
          <span className="text-[10px] text-zinc-500 block">{ncrs?.length || 0} Open Quality Holds</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl space-y-1 col-span-2 lg:col-span-1">
          <span className="text-[10px] uppercase text-zinc-500 block font-bold">Critical Path Float</span>
          <div className={`text-lg font-bold tabular-nums ${delayDays > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {delayDays > 0 ? `+${delayDays} Days Delay` : "On Baseline (0d)"}
          </div>
          <span className="text-[10px] text-zinc-500 block">Clause 5 EOT Register</span>
        </div>
      </div>

      {/* SURVEILLANCE & OPERATIONS FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* SURVEILLANCE & REALITY CAPTURE (7 COLS) */}
        <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white uppercase">Site Reality Capture &amp; Stream</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold">GATEWAY ONLINE</span>
          </div>

          <div className="w-full rounded-xl overflow-hidden border border-zinc-800">
            <SiteStreamPlayer />
          </div>

          {/* QUICK GATES */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <Link href="/quality/pour-cards" className="p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition rounded-xl block">
              <span className="text-[10px] text-zinc-500 uppercase block">Pour Cards</span>
              <span className="font-bold text-zinc-200 mt-0.5 block text-[11px]">IS 456 Clearance &rarr;</span>
            </Link>
            <Link href="/finance/ra-bills" className="p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition rounded-xl block">
              <span className="text-[10px] text-zinc-500 uppercase block">RA Bills</span>
              <span className="font-bold text-zinc-200 mt-0.5 block text-[11px]">IPC Certification &rarr;</span>
            </Link>
            <Link href="/handover/punch-list" className="p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition rounded-xl block">
              <span className="text-[10px] text-zinc-500 uppercase block">Taking-Over</span>
              <span className="font-bold text-zinc-200 mt-0.5 block text-[11px]">TOC Snag Check &rarr;</span>
            </Link>
          </div>
        </div>

        {/* SECTION 65B AUDIT STREAM (5 COLS) */}
        <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <span className="font-bold text-white uppercase">Section 65B Notarized Audit Stream</span>
            <span className="text-[10px] text-zinc-500">HERMES MERKLE SEAL</span>
          </div>

          <div className="space-y-2.5">
            {logs.length === 0 ? (
              <div className="py-16 text-center text-zinc-600">
                Zero transactions notarized yet. Actions across pour cards and billing will stream here.
              </div>
            ) : (
              logs.map((log: any) => (
                <div key={log.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-zinc-200 font-bold text-xs">{log.action_title || log.action_category}</span>
                    <span className="text-[10px] text-zinc-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">{log.details || log.action_description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
PAGE_ROOT

# -----------------------------------------------------------------------------
# 5. VERIFY COMPILATION HEALTH
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Running 'npx tsc --noEmit' to verify compilation health...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Sprint 21 applied cleanly! Viewport layout pinned, scrolling defect eliminated, and build verified.\033[0m"
