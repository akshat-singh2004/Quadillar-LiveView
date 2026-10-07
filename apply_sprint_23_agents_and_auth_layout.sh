#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Initializing Sprint 23: Autonomous Agent Constellation & Clean Auth Viewport...\033[0m"

# -----------------------------------------------------------------------------
# 1. AGENT: lib/agents/argus.ts (HSE, Rigging Radar & Environmental Stoppages)
# -----------------------------------------------------------------------------
echo -e "\033[1;33m[*] Creating Agent Argus (HSE & Environmental Sentinel)...\033[0m"

cat << 'AGENT_ARGUS' > lib/agents/argus.ts
import { createClient } from "@supabase/supabase-js";
import { HermesAgent } from "@/lib/agents/hermes";

export interface WeatherCondition {
  windSpeedKmh: number;
  rainfallRateMmh: number;
  temperatureC: number;
}

export interface WeatherEvaluationResult {
  permitted: boolean;
  craneLockout: boolean;
  concretingSuspended: boolean;
  reasons: string[];
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Agent Argus.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export class ArgusAgent {
  /**
   * Evaluates site microclimate against statutory thresholds:
   * - IS 13367 / OSHA: Tower crane slewing locked if wind > 38 km/h
   * - IS 456 Cl. 13.3: Concreting prohibited during continuous heavy rain (> 5 mm/h)
   */
  static evaluateMicroclimate(conditions: WeatherCondition): WeatherEvaluationResult {
    const reasons: string[] = [];
    let craneLockout = false;
    let concretingSuspended = false;

    if (conditions.windSpeedKmh >= 38) {
      craneLockout = true;
      reasons.push(
        `HIGH WIND LOCKOUT (${conditions.windSpeedKmh} km/h >= 38 km/h limit per IS 13367). Hook loads suspended.`
      );
    }

    if (conditions.rainfallRateMmh >= 5.0) {
      concretingSuspended = true;
      reasons.push(
        `ADVERSE WEATHER CONCRETING STOPPAGE (${conditions.rainfallRateMmh} mm/h >= 5 mm/h per IS 456 Cl. 13.3).`
      );
    }

    return {
      permitted: !craneLockout && !concretingSuspended,
      craneLockout,
      concretingSuspended,
      reasons,
    };
  }

  /**
   * Broadcasts an environmental stop-work hold, logs to telemetry,
   * and notarizes via Hermes for contemporaneous delay protection.
   */
  static async issueEnvironmentalStoppage(params: {
    projectId: string;
    sensorLocation: string;
    windSpeedKmh: number;
    rainfallRateMmh: number;
    temperatureC: number;
  }) {
    const supabase = getSupabase();
    const evaluation = this.evaluateMicroclimate({
      windSpeedKmh: params.windSpeedKmh,
      rainfallRateMmh: params.rainfallRateMmh,
      temperatureC: params.temperatureC,
    });

    if (!evaluation.permitted) {
      await supabase.from("site_microclimate_telemetry").insert({
        project_id: params.projectId,
        sensor_location: params.sensorLocation,
        temperature_c: params.temperatureC,
        wind_speed_kmh: params.windSpeedKmh,
        rainfall_rate_mmh: params.rainfallRateMmh,
        humidity_pct: 75,
        stoppage_active: true,
        trigger_reasons: evaluation.reasons,
        recorded_at: new Date().toISOString(),
      });

      await HermesAgent.notarizeTransaction({
        projectId: params.projectId,
        actionTitle: `Argus Safety Lockout: ${evaluation.reasons[0]}`,
        actionCategory: "HSE_WEATHER_STOPPAGE",
        moduleRef: `WEATHER-${new Date().toISOString().slice(0, 10)}`,
        details: { evaluation, conditions: params },
        signatoryName: "Agent Argus (HSE Sentinel)",
        signatoryRole: "Autonomous Safety Officer",
        severity: "severe",
      });
    }

    return evaluation;
  }
}
AGENT_ARGUS

# -----------------------------------------------------------------------------
# 2. AGENT: lib/agents/themis.ts (Statutory RERA, Claims & LD Capping Engine)
# -----------------------------------------------------------------------------
echo -e "\033[1;33m[*] Creating Agent Themis (Statutory & Claims Adjudicator)...\033[0m"

cat << 'AGENT_THEMIS' > lib/agents/themis.ts
import { createClient } from "@supabase/supabase-js";
import { HermesAgent } from "@/lib/agents/hermes";

export interface ClaimTimeBarResult {
  isTimeBarred: boolean;
  daysElapsed: number;
  statutoryLimitDays: number;
  verdict: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Agent Themis.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export class ThemisAgent {
  /**
   * Enforces FIDIC Red Book Clause 20.1 mandatory 28-day notice rule:
   * If notice is submitted > 28 days after the event, the claim is legally discharged.
   */
  static evaluateFidicTimeBar(eventDateIso: string, noticeDateIso: string): ClaimTimeBarResult {
    const eventTime = new Date(eventDateIso).getTime();
    const noticeTime = new Date(noticeDateIso).getTime();
    const daysElapsed = Math.ceil(Math.abs(noticeTime - eventTime) / (1000 * 60 * 60 * 24));
    const isTimeBarred = daysElapsed > 28;

    return {
      isTimeBarred,
      daysElapsed,
      statutoryLimitDays: 28,
      verdict: isTimeBarred
        ? `DISALLOWED (TIME-BARRED): Notice given ${daysElapsed} days after event (> 28 days). Employer legally discharged per FIDIC 20.1 p. 2.`
        : `TIMELY NOTICE: Lodged within ${daysElapsed} days (<= 28-day window). Eligible for Engineer assessment.`,
    };
  }

  /**
   * Computes CPWD GCC Clause 2 Liquidated Damages (LD):
   * 1.0% of contract value per month of unexcused delay, capped strictly at 10.0%.
   */
  static computeLiquidatedDamages(params: {
    contractBaselineInr: number;
    unexcusedDelayDays: number;
    customCapPct?: number;
  }) {
    const capPct = params.customCapPct ?? 10.0;
    const maxLdInr = (params.contractBaselineInr * capPct) / 100;
    const delayMonths = params.unexcusedDelayDays / 30;
    const computedLdInr = Math.min(maxLdInr, (params.contractBaselineInr * 0.01) * delayMonths);

    return {
      computedLdInr: Math.round(computedLdInr),
      maxLdCapInr: maxLdInr,
      isCapReached: computedLdInr >= maxLdInr,
      delayMonths: parseFloat(delayMonths.toFixed(2)),
    };
  }
}
AGENT_THEMIS

# -----------------------------------------------------------------------------
# 3. AGENT: lib/agents/vulcan.ts (Materials Reconciliation & Cl. 42 Penalties)
# -----------------------------------------------------------------------------
echo -e "\033[1;33m[*] Creating Agent Vulcan (Materials & Clause 42 Reconciler)...\033[0m"

cat << 'AGENT_VULCAN' > lib/agents/vulcan.ts
import { createClient } from "@supabase/supabase-js";
import { HermesAgent } from "@/lib/agents/hermes";

export interface MaterialReconResult {
  materialType: "CEMENT" | "STEEL" | "AGGREGATE";
  theoreticalQuantity: number;
  actualQuantityConsumed: number;
  wastageQuantity: number;
  wastagePct: number;
  permissibleTolerancePct: number;
  excessWastageQuantity: number;
  penalDebitInr: number;
  status: "COMPLIANT" | "PENAL_RECOVERY_DEBIT";
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Agent Vulcan.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export class VulcanAgent {
  /**
   * CPWD Clause 42 Material Reconciliation:
   * - Permissible wastage: Cement (+2%), Structural Steel (+3%)
   * - Excess consumption beyond permissible limits incurs double recovery rate penalty.
   */
  static reconcileMaterialCycle(params: {
    projectId: string;
    materialType: "CEMENT" | "STEEL" | "AGGREGATE";
    theoreticalQty: number;
    actualConsumedQty: number;
    basicRateInr: number;
  }): MaterialReconResult {
    const tolerancePct = params.materialType === "CEMENT" ? 2.0 : 3.0;
    const allowedCeilingQty = params.theoreticalQty * (1 + tolerancePct / 100);
    const wastageQty = Math.max(0, params.actualConsumedQty - params.theoreticalQty);
    const wastagePct = params.theoreticalQty > 0 ? (wastageQty / params.theoreticalQty) * 100 : 0;
    const excessWastageQty = Math.max(0, params.actualConsumedQty - allowedCeilingQty);
    
    // CPWD Cl. 42 double-rate penal recovery formula
    const penalDebitInr = excessWastageQty * params.basicRateInr * 2.0;

    return {
      materialType: params.materialType,
      theoreticalQuantity: params.theoreticalQty,
      actualQuantityConsumed: params.actualConsumedQty,
      wastageQuantity: parseFloat(wastageQty.toFixed(2)),
      wastagePct: parseFloat(wastagePct.toFixed(2)),
      permissibleTolerancePct: tolerancePct,
      excessWastageQuantity: parseFloat(excessWastageQty.toFixed(2)),
      penalDebitInr: Math.round(penalDebitInr),
      status: excessWastageQty > 0 ? "PENAL_RECOVERY_DEBIT" : "COMPLIANT",
    };
  }
}
AGENT_VULCAN

# -----------------------------------------------------------------------------
# 4. AGENTS BARREL: lib/agents/index.ts (The Complete Autonomous Council)
# -----------------------------------------------------------------------------
cat << 'BARREL_AGENTS' > lib/agents/index.ts
export { AegisAgent } from "./aegis";
export { HermesAgent } from "./hermes";
export { ChronosAgent } from "./chronos";
export { MidasAgent } from "./midas";
export { ArgusAgent } from "./argus";
export { ThemisAgent } from "./themis";
export { VulcanAgent } from "./vulcan";
BARREL_AGENTS

# -----------------------------------------------------------------------------
# 5. FIX: components/layout/AppShell.tsx (Route-Aware Isolation)
# Suppresses Sidebar, UnifiedHeader, and pl-72 on Auth & Onboarding routes
# -----------------------------------------------------------------------------
echo -e "\033[1;33m[*] Updating components/layout/AppShell.tsx with route isolation...\033[0m"

cat << 'COMP_APP_SHELL' > components/layout/AppShell.tsx
"use client";

import React, { ReactNode, Suspense, Component, ErrorInfo } from "react";
import { usePathname } from "next/navigation";
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

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname() || "";
  
  // Isolated routes that must NEVER render the dashboard sidebar or master header
  const isAuthOrOnboarding =
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/sign-in" ||
    pathname.startsWith("/sign-in/");

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
# 6. FIX: components/layout/SidebarAwareLayout.tsx
# Prevent duplicate sidebar if AppShell is already managing it
# -----------------------------------------------------------------------------
echo -e "\033[1;33m[*] Harmonizing components/layout/SidebarAwareLayout.tsx...\033[0m"

cat << 'COMP_SIDEBAR_LAYOUT' > components/layout/SidebarAwareLayout.tsx
'use client';

import React from 'react';

interface SidebarAwareLayoutProps {
  children: React.ReactNode;
}

export function SidebarAwareLayout({ children }: SidebarAwareLayoutProps) {
  // AppShell already coordinates the fixed Sidebar and pl-72 offset at the root level.
  // SidebarAwareLayout passes children through cleanly to avoid duplicate sidebars.
  return <>{children}</>;
}

export default SidebarAwareLayout;
COMP_SIDEBAR_LAYOUT

# -----------------------------------------------------------------------------
# 7. VERIFY COMPILATION HEALTH
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Running 'npx tsc --noEmit' to verify compilation health...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Sprint 23 successfully applied! 7 Autonomous Agents active & Auth/Onboarding isolated with 0 errors.\033[0m"
