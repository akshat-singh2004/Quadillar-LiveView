"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BadgeAlert,
  BadgeCheck,
  Banknote,
  BarChart3,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Coins,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  FileCheck2,
  FileKey,
  FileLock2,
  FileSpreadsheet,
  FileText,
  Filter,
  Fingerprint,
  Flame,
  Globe,
  HardDrive,
  HelpCircle,
  History,
  Info,
  Layers,
  LayoutDashboard,
  Lock,
  MinusCircle,
  Percent,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Scale,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  TrendingDown,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  Wallet,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { useActiveRole } from "@/context/RoleContext";
import {
  fetchProjectCloseoutSummary,
  fetchCloseoutModuleProgressList,
  generateMasterClosureDossier,
  fallbackProjectCloseoutSummaries,
  fallbackCloseoutModuleProgressList,
} from "@/app/lib/services";
import type {
  ProjectCloseoutSummary,
  CloseoutModuleProgress,
  MasterClosureDossierConfig,
  CloseoutStageStatus,
} from "@/types/construction";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES & FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtINR(amount: number): string {
  if (isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Project Closeout Executive Dashboard & Master Command Hub
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectCloseoutCommandCenterPage() {
  const { role } = useActiveRole();
  const roleLabel = (role as any)?.label ?? "Project Director / Executive Engineer";

  // State
  const [projectId, setProjectId] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Data
  const [summary, setSummary] = useState<ProjectCloseoutSummary | null>(null);
  const [modules, setModules] = useState<CloseoutModuleProgress[]>([]);

  // Filters & Tabs
  const [moduleStatusFilter, setModuleStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isDossierModalOpen, setIsDossierModalOpen] = useState<boolean>(false);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState<boolean>(false);

  // Form State: Master Closure Dossier Generator
  const [dossierForm, setDossierForm] = useState<MasterClosureDossierConfig>({
    includePcrSummary: true,
    includeCostVariance: true,
    includeContractorDischarges: true,
    includeClientEscrowLedger: true,
    includeSubcontractorWages: true,
    includeAssetRegisterCobie: true,
    includeAsBuiltDrawings: true,
    includeStatutoryNocs: true,
    includeSha256AuditTrail: true,
    compilerDesignation: "Er. Rajesh Srivastava (Project Director)",
    boardSubmissionDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    notes: "Consolidated Master Closeout Dossier submitted for quarterly Board review and formal contract discharge.",
  });

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, mods] = await Promise.all([
        fetchProjectCloseoutSummary(projectId),
        fetchCloseoutModuleProgressList(projectId),
      ]);
      setSummary(sum || fallbackProjectCloseoutSummaries[0]);
      setModules(mods.length > 0 ? mods : fallbackCloseoutModuleProgressList);
    } catch (err) {
      console.warn("Failed to load closeout summary, using fallbacks:", err);
      setSummary(fallbackProjectCloseoutSummaries[0]);
      setModules(fallbackCloseoutModuleProgressList);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered Modules
  const filteredModules = useMemo(() => {
    return modules.filter((mod) => {
      if (moduleStatusFilter !== "ALL" && mod.status !== moduleStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = mod.title.toLowerCase().includes(q);
        const matchRef = mod.standardRef.toLowerCase().includes(q);
        const matchMetric = mod.keyMetricValue.toLowerCase().includes(q);
        const matchDesc = mod.description.toLowerCase().includes(q);
        if (!matchTitle && !matchRef && !matchMetric && !matchDesc) return false;
      }
      return true;
    });
  }, [modules, moduleStatusFilter, searchQuery]);

  // Visual Analytics Chart Data: Head-wise Cost Variance (INR Crores)
  const costVarianceBarData = useMemo(() => {
    return [
      { name: "Civil Substructure", sanctioned: 5.2, actual: 5.38 },
      { name: "Superstructure", sanctioned: 8.4, actual: 8.62 },
      { name: "Finishes", sanctioned: 3.5, actual: 3.39 },
      { name: "MEP Services", sanctioned: 4.4, actual: 4.35 },
      { name: "External Works", sanctioned: 1.2, actual: 1.32 },
      { name: "Contingency", sanctioned: 1.15, actual: 1.12 },
    ];
  }, []);

  // Visual Analytics Chart Data: Lifecycle Maturity Across Dimensions
  const maturityDimensionsData = useMemo(() => {
    return [
      { dimension: "Financial Settlement", progress: 92, target: 100 },
      { dimension: "Statutory Clearances", progress: 94, target: 100 },
      { dimension: "Facility Asset Handover", progress: 88, target: 100 },
      { dimension: "Defect Rectification", progress: 90, target: 100 },
      { dimension: "Permanent Archiving", progress: 96, target: 100 },
    ];
  }, []);

  // Visual Analytics Chart Data: Warranty Reserve Allocation Breakdown
  const warrantyReservePieData = useMemo(() => {
    return [
      { name: "Civil & Structural", value: 38, color: "#3b82f6" },
      { name: "MEP & HVAC", value: 26, color: "#10b981" },
      { name: "Waterproofing", value: 16, color: "#f59e0b" },
      { name: "Elevators & Escalators", value: 12, color: "#8b5cf6" },
      { name: "Fire Safety", value: 8, color: "#ec4899" },
    ];
  }, []);

  // Submit Handler: Master Closure Dossier
  const handleGenerateDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activeProjId = projectId === "ALL" ? "GOMTI-NAGAR-PH1-FITOUT" : projectId;
      const res = await generateMasterClosureDossier(activeProjId, dossierForm);
      showToast(`Master Closure Dossier compiled successfully! Ref: ${res.dossierRef}`);
      setIsDossierModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast("Error generating Master Closure Dossier.");
    }
  };

  if (!summary) return null;

  const isSavings = summary.costVarianceInr <= 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500/90 text-white font-medium px-4 py-3 rounded-xl shadow-2xl border border-emerald-400 backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP BAR / EXECUTIVE COMMAND SPINE HEADER */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-400 uppercase">
            <LayoutDashboard className="w-4 h-4" />
            <span>Closeout Governance • CPWD Works Manual Chapter VI • FIDIC Red Book Clauses 10, 11 &amp; 14</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1 flex items-center gap-3">
            Project Closeout Command Center &amp; Master KPI Hub
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Executive Oversight Active
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Central command spine synthesizing commercial reconciliations, tripartite escrows, asset handovers, defect rectifications, and statutory clearances across all 10 project lifecycle stages.
          </p>
        </div>

        {/* Action Controls & Project Filter */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Project Selector */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 shadow-inner">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Projects (Consolidated)</option>
              <option value="GOMTI-NAGAR-PH1-FITOUT">Gomti Nagar Commercial Hub (Active Scope)</option>
              
            </select>
          </div>

          <button
            onClick={() => void loadData()}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl transition border border-slate-800 shadow-md"
            title="Refresh Closeout Spine"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            <span>Sync Spine</span>
          </button>

          <button
            onClick={() => setIsDossierModalOpen(true)}
            className="flex items-center gap-2 bg-purple-600/90 hover:bg-purple-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-lg shadow-purple-950/40 border border-purple-500/40"
          >
            <FileArchive className="w-4 h-4" />
            <span>Master Closure Dossier</span>
          </button>

          <button
            onClick={() => setIsBriefingModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-lg shadow-emerald-950/40 border border-emerald-500/40"
          >
            <Printer className="w-4 h-4" />
            <span>Board Executive Briefing</span>
          </button>
        </div>
      </div>

      {/* CLOSEOUT BREADCRUMB / MODULE SWITCHER */}
      <div className="flex flex-wrap items-center gap-2 mb-6 text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
        <span className="font-semibold text-slate-300">Closeout Suite:</span>
        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
          <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" /> Command Hub
        </span>
        <span className="text-slate-600">•</span>
        <Link
          href="/closeout/completion-report"
          className="px-2.5 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-1"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" /> Completion Report
        </Link>
        <span className="text-slate-600">•</span>
        <Link
          href="/closeout/vendor-archive"
          className="px-2.5 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-1"
        >
          <Users className="w-3.5 h-3.5 text-indigo-400" /> Vendor Scorecard
        </Link>
        <span className="text-slate-600">•</span>
        <Link
          href="/closeout/client-ledger"
          className="px-2.5 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-1"
        >
          <Coins className="w-3.5 h-3.5 text-amber-400" /> Client Closeout Ledger
        </Link>
        <span className="text-slate-600">•</span>
        <Link
          href="/closeout/subcontractor-settlement"
          className="px-2.5 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-1"
        >
          <Receipt className="w-3.5 h-3.5 text-purple-400" /> Subcontractor Settlements
        </Link>
        <span className="text-slate-600">•</span>
        <Link
          href="/closeout/as-built-vault"
          className="px-2.5 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-1"
        >
          <FileCheck2 className="w-3.5 h-3.5 text-cyan-400" /> As-Built &amp; O&amp;M Vault
        </Link>
        <span className="text-slate-600">•</span>
        <Link
          href="/closeout/escrow-reserve"
          className="px-2.5 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-1"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400" /> Escrow &amp; Warranty Reserve
        </Link>
        <span className="text-slate-600">•</span>
        <Link
          href="/closeout/audit-vault"
          className="px-2.5 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-1"
        >
          <FileLock2 className="w-3.5 h-3.5 text-rose-400" /> Audit Trail &amp; Statutory Vault
        </Link>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          HIGH-LEVEL EXECUTIVE KPI COMMAND CARDS (4 Primary + 2 Supplementary)
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        {/* Card 1: Total Project Cost Variance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition"></div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Total Cost Variance</span>
            {isSavings ? (
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingUp className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className={`text-xl font-bold tracking-tight ${isSavings ? "text-emerald-400" : "text-rose-400"}`}>
            {isSavings ? "-" : "+"}{fmtINR(Math.abs(summary.costVarianceInr))}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span className={isSavings ? "text-emerald-300 font-semibold" : "text-rose-300 font-semibold"}>
              {Math.abs(summary.costVariancePct).toFixed(2)}% {isSavings ? "Savings" : "Overrun"}
            </span>
            <span className="font-mono text-slate-500">SPI: {summary.spiValue.toFixed(3)}</span>
          </div>
        </div>

        {/* Card 2: Active Defect Count */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition"></div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Active Defect Count</span>
            <Wrench className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {summary.activeDefectsCount} Open Snags
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="text-emerald-400 font-semibold">{summary.defectClearancePct}% Cleared</span>
            <span className="text-slate-500">{summary.clearedDefectsCount}/{summary.totalDefectsCount} Total</span>
          </div>
        </div>

        {/* Card 3: Pending Statutory Clearances */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition"></div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Pending Statutory Clearances</span>
            <FileKey className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {summary.pendingStatutoryClearancesCount} Pending
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="text-cyan-300 font-semibold">{summary.validStatutoryCertsCount} Valid NOCs</span>
            <span className="text-slate-500">{summary.statutoryCompliancePct}% Score</span>
          </div>
        </div>

        {/* Card 4: Net Retention Balance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition"></div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Net Retention Balance</span>
            <Lock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {fmtINR(summary.netRetentionBalanceInr)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="text-blue-300">{fmtINR(summary.releasedRetentionInr)} Released</span>
            <span className="text-slate-500">Tranche 2</span>
          </div>
        </div>

        {/* Card 5: Facility Asset Handover Rate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition"></div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Asset Handover Rate</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {summary.handedOverAssetsCount} / {summary.totalFacilityAssetsCount} Assets
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="text-purple-300 font-semibold">{summary.asBuiltDrawingsCount} As-Builts</span>
            <span className="text-slate-500">{summary.omManualsCount} O&amp;Ms</span>
          </div>
        </div>

        {/* Card 6: Composite Closeout Health Index */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition"></div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Closeout Health Index</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 tracking-tight">
            {summary.closeoutOverallProgressPct}% Complete
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span className={`px-2 py-0.2 rounded font-semibold text-[10px] ${
              summary.overallCloseoutStatus === "COMPLETE"
                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                : "bg-amber-950 text-amber-400 border border-amber-800"
            }`}>
              {summary.overallCloseoutStatus}
            </span>
            <span className="text-slate-500">Board Ready</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          INTERACTIVE PROGRESS TRACKERS FOR ALL 10 CLOSEOUT MODULES
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              10 Closeout Life-Cycle Execution Modules
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              End-to-end contractual transition track aligned with CPWD Works Manual completion workflows and FIDIC Red Book taking-over conditions.
            </p>
          </div>

          {/* Module Filters */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search closeout module..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={moduleStatusFilter}
              onChange={(e) => setModuleStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETE">Complete</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>

        {/* 10 Module Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {filteredModules.map((mod) => {
            const isComplete = mod.status === "COMPLETE";
            const isInReview = mod.status === "IN_REVIEW";

            return (
              <div
                key={mod.moduleId}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition"></div>

                <div>
                  {/* Step & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Step {mod.stepNumber.toString().padStart(2, "0")}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        isComplete
                          ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/60"
                          : isInReview
                          ? "bg-amber-950/80 text-amber-400 border-amber-800/60"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {isComplete && <CheckCircle2 className="w-3 h-3" />}
                      {isInReview && <Clock className="w-3 h-3" />}
                      {!isComplete && !isInReview && <MinusCircle className="w-3 h-3" />}
                      {mod.status}
                    </span>
                  </div>

                  {/* Title & Standard Ref */}
                  <h3 className="text-xs font-bold text-white group-hover:text-emerald-300 transition line-clamp-2 mt-1">
                    {mod.title}
                  </h3>
                  <div className="text-[10px] text-slate-400 font-mono mt-1 truncate">
                    {mod.standardRef}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-400 font-medium">Completion</span>
                      <span className="text-white font-mono font-bold">{mod.progressPct}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isComplete
                            ? "bg-emerald-500"
                            : isInReview
                            ? "bg-amber-500"
                            : "bg-blue-500"
                        }`}
                        style={{ width: `${mod.progressPct}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Key Metric Box */}
                  <div className="mt-3 bg-slate-900/70 p-2 rounded-lg border border-slate-800/80">
                    <div className="text-[10px] text-slate-500">{mod.keyMetricLabel}:</div>
                    <div className="text-xs font-bold text-emerald-400 truncate mt-0.5">
                      {mod.keyMetricValue}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {mod.lastActionDate ? fmtDate(mod.lastActionDate) : "—"}
                  </span>
                  <Link
                    href={mod.routePath}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition"
                  >
                    <span>Inspect</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          EXECUTIVE VISUAL ANALYTICS (RECHARTS)
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Chart 1: Head-wise Final Cost Variance (Sanctioned vs Actual in Cr) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            Head-Wise Final Cost Variance (₹ Crores)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Sanctioned budget vs actual final expenditure across major execution heads
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costVarianceBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-25} textAnchor="end" height={40} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                  formatter={(val: any) => [`₹${val} Cr`, ""]}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="sanctioned" name="Sanctioned (₹ Cr)" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual Final (₹ Cr)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Closeout Lifecycle Maturity Across Dimensions */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Scale className="w-4 h-4 text-cyan-400" />
            Closeout Lifecycle Maturity Index (%)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Operational completion benchmarks across key fiduciary and technical categories
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maturityDimensionsData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                <YAxis dataKey="dimension" type="category" stroke="#94a3b8" fontSize={10} width={110} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                  formatter={(val: any) => [`${val}%`, "Progress"]}
                />
                <Bar dataKey="progress" fill="#06b6d4" radius={[0, 4, 4, 0]}>
                  {maturityDimensionsData.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={idx === 1 ? "#10b981" : idx === 4 ? "#8b5cf6" : "#06b6d4"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Warranty Reserve Allocation Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" />
            Warranty Reserve Allocations by Trade
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            5% contract retention escrow partition across high-risk engineering trades
          </p>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={warrantyReservePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ? name.split(" ")[0] : ""}: ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {warrantyReservePieData.map((entry, index) => (
                    <Cell key={`slice-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                  formatter={(val: any) => [`${val}%`, "Allocation"]}
                />
                <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 1: MASTER PROJECT CLOSURE DOSSIER COMPILER
         ───────────────────────────────────────────────────────────────────────────── */}
      {isDossierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <FileArchive className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Assemble Master Project Closure Dossier</h3>
              </div>
              <button
                onClick={() => setIsDossierModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateDossier} className="p-6 space-y-4 text-xs">
              <p className="text-slate-400">
                Compile all closeout lifecycle records across commercial, statutory, and asset domains into a single immutable master closure bundle (.tar.gz) sealed with SHA-256 HMAC non-repudiation.
              </p>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-white block uppercase tracking-wider text-[11px]">
                  Select Dossier Artifact Components:
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dossierForm.includePcrSummary}
                      onChange={(e) => setDossierForm({ ...dossierForm, includePcrSummary: e.target.checked })}
                      className="rounded border-slate-700 text-purple-600 focus:ring-0"
                    />
                    <span>Project Completion Report (PCR) &amp; TOC</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dossierForm.includeCostVariance}
                      onChange={(e) => setDossierForm({ ...dossierForm, includeCostVariance: e.target.checked })}
                      className="rounded border-slate-700 text-purple-600 focus:ring-0"
                    />
                    <span>Head-wise Cost Variance Reconciliation</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dossierForm.includeContractorDischarges}
                      onChange={(e) => setDossierForm({ ...dossierForm, includeContractorDischarges: e.target.checked })}
                      className="rounded border-slate-700 text-purple-600 focus:ring-0"
                    />
                    <span>FIDIC Cl. 14.12 Final Contractor Discharges</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dossierForm.includeClientEscrowLedger}
                      onChange={(e) => setDossierForm({ ...dossierForm, includeClientEscrowLedger: e.target.checked })}
                      className="rounded border-slate-700 text-purple-600 focus:ring-0"
                    />
                    <span>Client Closeout &amp; Retention Escrow Ledger</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dossierForm.includeSubcontractorWages}
                      onChange={(e) => setDossierForm({ ...dossierForm, includeSubcontractorWages: e.target.checked })}
                      className="rounded border-slate-700 text-purple-600 focus:ring-0"
                    />
                    <span>Subcontractor Settlements &amp; ISMW Wage NOCs</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dossierForm.includeAssetRegisterCobie}
                      onChange={(e) => setDossierForm({ ...dossierForm, includeAssetRegisterCobie: e.target.checked })}
                      className="rounded border-slate-700 text-purple-600 focus:ring-0"
                    />
                    <span>Permanent Asset Register &amp; COBie Metadata</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dossierForm.includeAsBuiltDrawings}
                      onChange={(e) => setDossierForm({ ...dossierForm, includeAsBuiltDrawings: e.target.checked })}
                      className="rounded border-slate-700 text-purple-600 focus:ring-0"
                    />
                    <span>As-Built BIM &amp; Digital O&amp;M Manual Vault</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dossierForm.includeStatutoryNocs}
                      onChange={(e) => setDossierForm({ ...dossierForm, includeStatutoryNocs: e.target.checked })}
                      className="rounded border-slate-700 text-purple-600 focus:ring-0"
                    />
                    <span>Statutory Clearances (BOCW, Fire, Stability)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      checked={dossierForm.includeSha256AuditTrail}
                      onChange={(e) => setDossierForm({ ...dossierForm, includeSha256AuditTrail: e.target.checked })}
                      className="rounded border-slate-700 text-purple-600 focus:ring-0"
                    />
                    <span className="font-semibold text-emerald-400">
                      Cryptographic SHA-256 Audit Trail &amp; Sign-Off Verification Log
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Compiler Officer Designation</label>
                  <input
                    type="text"
                    value={dossierForm.compilerDesignation}
                    onChange={(e) => setDossierForm({ ...dossierForm, compilerDesignation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Board Review Submission Date</label>
                  <input
                    type="date"
                    value={dossierForm.boardSubmissionDate}
                    onChange={(e) => setDossierForm({ ...dossierForm, boardSubmissionDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Executive Notes &amp; Statutory Reminders</label>
                <textarea
                  value={dossierForm.notes}
                  onChange={(e) => setDossierForm({ ...dossierForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 h-16"
                />
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950/60 -mx-6 -mb-6 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">CPWD Works Manual Ch. VI Compliant</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDossierModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-950/40 transition flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Compile &amp; Download Bundle</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 2: EXPORTABLE EXECUTIVE BRIEFING (BOARD REVIEW REPORT)
         ───────────────────────────────────────────────────────────────────────────── */}
      {isBriefingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl my-8">
            {/* Action Bar (Hidden in Print) */}
            <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between print:hidden">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-600" />
                Board of Directors Executive Briefing · CPWD Works Manual Chapter VI &amp; FIDIC Red Book
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Board Report</span>
                </button>
                <button
                  onClick={() => setIsBriefingModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Memorandum Layout */}
            <div className="p-8 md:p-12 space-y-6 text-xs text-slate-800 font-sans">
              {/* Memorandum Header */}
              <div className="text-center border-b-2 border-slate-900 pb-5">
                <div className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                  CONFIDENTIAL · FOR BOARD OF DIRECTORS REVIEW ONLY
                </div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 uppercase mt-1">
                  Executive Briefing: Final Project Closeout &amp; Taking-Over Statement
                </h1>
                <div className="text-xs text-slate-600 font-semibold mt-1">
                  CPWD Works Manual Chapter VI · FIDIC Red Book Clause 10 (Taking-Over) &amp; Clause 14 (Final Account)
                </div>
              </div>

              {/* Project Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 text-[11px]">Project Name:</span>
                  <div className="font-bold text-slate-900">{summary.projectName}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Project Code:</span>
                  <div className="font-mono font-bold text-slate-900">{summary.projectId}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Completion Report Ref:</span>
                  <div className="font-mono text-slate-900">{summary.pcrNumber || "PCR/2026/001"}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Closeout Status:</span>
                  <div className="font-bold text-emerald-700">{summary.overallCloseoutStatus}</div>
                </div>
              </div>

              {/* Section 1: Financial & Commercial Reconciliation */}
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-300 pb-1">
                  I. Commercial &amp; Financial Reconciliation Ledger
                </h2>
                <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2 border-r border-slate-200">Financial Parameter</th>
                      <th className="p-2 border-r border-slate-200 text-right">Sanctioned Budget (INR)</th>
                      <th className="p-2 border-r border-slate-200 text-right">Actual Incurred (INR)</th>
                      <th className="p-2 border-r border-slate-200 text-right">Cost Variance</th>
                      <th className="p-2 text-right">Variance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    <tr>
                      <td className="p-2 border-r border-slate-200 font-sans font-medium text-slate-900">Total Contract Value</td>
                      <td className="p-2 border-r border-slate-200 text-right">{fmtINR(summary.sanctionedBudgetInr)}</td>
                      <td className="p-2 border-r border-slate-200 text-right font-bold text-slate-900">{fmtINR(summary.actualExpenditureInr)}</td>
                      <td className="p-2 border-r border-slate-200 text-right font-bold text-emerald-700">{fmtINR(summary.costVarianceInr)}</td>
                      <td className="p-2 text-right font-bold text-emerald-700">{summary.costVariancePct.toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-slate-200 font-sans font-medium text-slate-900">5% Defect Escrow Retention</td>
                      <td className="p-2 border-r border-slate-200 text-right">{fmtINR(summary.totalRetentionInr)}</td>
                      <td className="p-2 border-r border-slate-200 text-right">{fmtINR(summary.releasedRetentionInr)} (Tranche 1)</td>
                      <td className="p-2 border-r border-slate-200 text-right font-bold text-blue-700">{fmtINR(summary.netRetentionBalanceInr)} (Held)</td>
                      <td className="p-2 text-right text-slate-600">Tranche 2 Post-DLP</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-slate-200 font-sans font-medium text-slate-900">Pending Third-Party Defect Claims</td>
                      <td className="p-2 border-r border-slate-200 text-right">—</td>
                      <td className="p-2 border-r border-slate-200 text-right font-bold text-rose-700">{fmtINR(summary.pendingClaimsInr)}</td>
                      <td className="p-2 border-r border-slate-200 text-right font-bold text-rose-700">Debited per Cl. 17</td>
                      <td className="p-2 text-right text-slate-600">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 2: Closeout Module Progress Matrix */}
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-300 pb-1">
                  II. 10-Stage Lifecycle Closeout Matrix
                </h2>
                <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2 border-r border-slate-200">Step</th>
                      <th className="p-2 border-r border-slate-200">Module Description</th>
                      <th className="p-2 border-r border-slate-200">Standard Framework</th>
                      <th className="p-2 border-r border-slate-200">Status</th>
                      <th className="p-2 border-r border-slate-200 text-right">Progress</th>
                      <th className="p-2">Key Metric</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {modules.map((m) => (
                      <tr key={m.moduleId}>
                        <td className="p-2 border-r border-slate-200 font-mono text-slate-500">{m.stepNumber}</td>
                        <td className="p-2 border-r border-slate-200 font-medium text-slate-900">{m.title}</td>
                        <td className="p-2 border-r border-slate-200 text-slate-600 font-mono text-[10px]">{m.standardRef}</td>
                        <td className="p-2 border-r border-slate-200 font-semibold text-emerald-700">{m.status}</td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono font-bold">{m.progressPct}%</td>
                        <td className="p-2 font-mono text-[10px] text-slate-700">{m.keyMetricValue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Section 3: Statutory Declaration & Board Recommendation */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1 text-slate-700">
                <span className="font-bold text-slate-900 uppercase tracking-wider block mb-1">
                  Statutory Recommendation to Board of Directors
                </span>
                <p className="leading-relaxed">
                  The Project Management Consultant and Engineer-in-Charge certify that the contract works have been executed and measured in compliance with sanctioned specifications. All 18 statutory clearances (BOCW Act labour licenses, fire safety NOC, and structural stability certifications) have been archived into the digital vault. Full and final commercial discharge deeds have been executed under FIDIC Red Book Clause 14.12. It is recommended that the Board formally adopt this report and approve the release of Tranche 1 retention monies.
                </p>
              </div>

              {/* Tripartite Board Sign-Off Block */}
              <div className="grid grid-cols-3 gap-6 pt-10 border-t-2 border-slate-900 text-center text-xs">
                <div>
                  <div className="h-10 border-b border-dashed border-slate-400 mb-2 flex items-end justify-center font-serif italic text-slate-600">
                    Er. Rajesh Srivastava
                  </div>
                  <div className="font-bold text-slate-900">Project Director / SEOR</div>
                  <div className="text-[11px] text-slate-500">Chief Project Engineer</div>
                </div>

                <div>
                  <div className="h-10 border-b border-dashed border-slate-400 mb-2 flex items-end justify-center font-serif italic text-slate-600">
                    Dr. K. N. Verma
                  </div>
                  <div className="font-bold text-slate-900">Statutory Compliance Officer</div>
                  <div className="text-[11px] text-slate-500">PMC Lead Consultant</div>
                </div>

                <div>
                  <div className="h-10 border-b border-dashed border-slate-400 mb-2 flex items-end justify-center font-serif italic text-slate-600">
                    Vikas Bansal, FCA
                  </div>
                  <div className="font-bold text-slate-900">Chief Financial Officer</div>
                  <div className="text-[11px] text-slate-500">Statutory Financial Auditor</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
