"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BadgeAlert,
  BadgeCheck,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileLock2,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  HelpCircle,
  History,
  Info,
  Layers,
  LayoutDashboard,
  Lock,
  LockOpen,
  MinusCircle,
  Percent,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Unlock,
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
  fetchDefectEscrowAccounts,
  fetchWarrantyReserveAllocations,
  fetchEscrowDefectClaims,
  fetchEscrowTransactionLedger,
  logEscrowDefectClaim,
  releaseEscrowTranche,
  fallbackDefectEscrowAccounts,
  fallbackWarrantyReserveAllocations,
  fallbackEscrowDefectClaims,
  fallbackEscrowTransactionLedger,
} from "@/app/lib/services";
import type {
  DefectEscrowAccount,
  WarrantyReserveAllocation,
  EscrowDefectClaim,
  EscrowTransactionLedgerItem,
  EscrowAccountStatus,
  WarrantyTradePackage,
  WarrantyReserveStatus,
  EscrowClaimStatus,
  EscrowTransactionType,
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

function numberToWordsINR(num: number): string {
  if (num === 0) return "Zero Rupees Only";
  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    let str = "";
    if (n > 99) {
      str += a[Math.floor(n / 100)] + "Hundred ";
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + " " + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  }

  let words = "";
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = Math.floor(num);

  if (crore > 0) words += inWords(crore) + "Crore ";
  if (lakh > 0) words += inWords(lakh) + "Lakh ";
  if (thousand > 0) words += inWords(thousand) + "Thousand ";
  if (remainder > 0) words += inWords(remainder);

  return "Rupees " + words.trim() + " Only";
}

const TRADE_COLORS: Record<WarrantyTradePackage, string> = {
  CIVIL_STRUCTURAL: "#3b82f6", // Blue
  MEP_HVAC: "#10b981", // Emerald
  WATERPROOFING_INSULATION: "#06b6d4", // Cyan
  ELEVATORS_ESCALATORS: "#8b5cf6", // Purple
  FIRE_PROTECTION_SAFETY: "#f97316", // Orange
  FACADE_FENESTRATION: "#eab308", // Yellow
  ELECTRICAL_SUBSTATION: "#ec4899", // Pink
};

const TRADE_LABELS: Record<WarrantyTradePackage, string> = {
  CIVIL_STRUCTURAL: "Civil & RCC Structures",
  MEP_HVAC: "MEP, HVAC & Chilled Water",
  WATERPROOFING_INSULATION: "Waterproofing & Membranes",
  ELEVATORS_ESCALATORS: "Elevators & Escalators",
  FIRE_PROTECTION_SAFETY: "Firefighting & Sprinklers",
  FACADE_FENESTRATION: "Facade & Glazing",
  ELECTRICAL_SUBSTATION: "Substation & Transformers",
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function DefectEscrowReservePage() {
  const { role } = useActiveRole();

  // State
  const [projectId, setProjectId] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<
    "overview" | "allocations" | "claims" | "ledger" | "analytics"
  >("overview");
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Data
  const [accounts, setAccounts] = useState<DefectEscrowAccount[]>([]);
  const [allocations, setAllocations] = useState<WarrantyReserveAllocation[]>([]);
  const [claims, setClaims] = useState<EscrowDefectClaim[]>([]);
  const [ledger, setLedger] = useState<EscrowTransactionLedgerItem[]>([]);

  // Filters & Searches
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTradeFilter, setSelectedTradeFilter] = useState<string>("ALL");
  const [selectedClaimStatusFilter, setSelectedClaimStatusFilter] = useState<string>("ALL");

  // Modals
  const [isClaimModalOpen, setIsClaimModalOpen] = useState<boolean>(false);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);

  // Form State: Claim
  const [claimForm, setClaimForm] = useState<{
    escrowAccountId: string;
    projectId: string;
    claimNumber: string;
    originalContractor: string;
    tradePackage: WarrantyTradePackage;
    defectDescription: string;
    locationTag: string;
    incidentDate: string;
    rectificationNoticeRef: string;
    noticeServedDate: string;
    noticePeriodDays: number;
    contractorResponse: string;
    rectificationCostInr: number;
    thirdPartyContractor: string;
    thirdPartyWorkOrderRef: string;
    thirdPartyInvoiceRef: string;
    authorizedBy: string;
    evidencePhotosCount: number;
    notes: string;
  }>({
    escrowAccountId: "escrow-lko-001",
    projectId: "GOMTI-NAGAR-PH1-FITOUT",
    claimNumber: `CLM/LKO/ESC-${Math.floor(100 + Math.random() * 900)}`,
    originalContractor: "HydroSeal Specialized Membranes",
    tradePackage: "WATERPROOFING_INSULATION",
    defectDescription: "",
    locationTag: "",
    incidentDate: new Date().toISOString().split("T")[0],
    rectificationNoticeRef: `NOT/DLP/CPWD-17/${Math.floor(10 + Math.random() * 90)}`,
    noticeServedDate: new Date(Date.now() - 15 * 86400000).toISOString().split("T")[0],
    noticePeriodDays: 14,
    contractorResponse: "Failed to respond within statutory 14-day window under CPWD Clause 17.",
    rectificationCostInr: 250000,
    thirdPartyContractor: "Apex Leakage Remediation Services LLP",
    thirdPartyWorkOrderRef: `WO/EMG/${Math.floor(100 + Math.random() * 900)}`,
    thirdPartyInvoiceRef: `INV/EMG/${Math.floor(1000 + Math.random() * 9000)}`,
    authorizedBy: role?.label?.includes("Engineer") ? "Project Resident Engineer" : "Er. Rajesh Srivastava (Project Director)",
    evidencePhotosCount: 4,
    notes: "Emergency debit authorized per CPWD Clause 17 & 14.",
  });

  // Form State: Release
  const [releaseForm, setReleaseForm] = useState<{
    accountId: string;
    trancheNumber: 1 | 2;
    releaseAmount: number;
    voucherRef: string;
    authorizedBy: string;
    notes: string;
  }>({
    accountId: "escrow-lko-001",
    trancheNumber: 2,
    releaseAmount: 3500000,
    voucherRef: `VCHR/REL/TR2-${Math.floor(100 + Math.random() * 900)}`,
    authorizedBy: "Dr. K. N. Verma (PMC Lead) & Bank Trustee",
    notes: "Post-DLP 12-Month Zero Defect Handover Certificate verified.",
  });

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, allocs, clms, ldgr] = await Promise.all([
        fetchDefectEscrowAccounts(projectId),
        fetchWarrantyReserveAllocations(projectId),
        fetchEscrowDefectClaims(projectId),
        fetchEscrowTransactionLedger(projectId),
      ]);
      setAccounts(accs);
      setAllocations(allocs);
      setClaims(clms);
      setLedger(ldgr);
    } catch {
      setAccounts(fallbackDefectEscrowAccounts);
      setAllocations(fallbackWarrantyReserveAllocations);
      setClaims(fallbackEscrowDefectClaims);
      setLedger(fallbackEscrowTransactionLedger);
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

  // Metrics Calculation
  const metrics = useMemo(() => {
    const totalRetained = accounts.reduce((acc, a) => acc + a.totalRetainedValueInr, 0);
    const totalReleased = accounts.reduce((acc, a) => acc + a.releasedAmountInr, 0);
    const totalCurrentBalance = accounts.reduce((acc, a) => acc + a.currentBalanceInr, 0);
    const totalInterest = accounts.reduce((acc, a) => acc + a.accruedInterestInr, 0);
    const totalClaimsDebited = claims
      .filter((c) => c.claimStatus === "EXECUTED_DEBITED")
      .reduce((acc, c) => acc + c.rectificationCostInr, 0);

    const activeAccountsCount = accounts.filter((a) => a.accountStatus === "ACTIVE").length;
    const avgSnagClearance =
      accounts.length > 0
        ? accounts.reduce((acc, a) => acc + a.snagClearancePct, 0) / accounts.length
        : 0;

    return {
      totalRetained,
      totalReleased,
      totalCurrentBalance,
      totalInterest,
      totalClaimsDebited,
      activeAccountsCount,
      avgSnagClearance,
    };
  }, [accounts, claims]);

  // Filtered Allocations
  const filteredAllocations = useMemo(() => {
    return allocations.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.contractorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.workOrderRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
        TRADE_LABELS[item.tradePackage].toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTrade =
        selectedTradeFilter === "ALL" || item.tradePackage === selectedTradeFilter;
      return matchesSearch && matchesTrade;
    });
  }, [allocations, searchQuery, selectedTradeFilter]);

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const matchesSearch =
        searchQuery === "" ||
        c.claimNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.originalContractor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.thirdPartyContractor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.defectDescription.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        selectedClaimStatusFilter === "ALL" || c.claimStatus === selectedClaimStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [claims, searchQuery, selectedClaimStatusFilter]);

  // Selected Account for Overview / Audit
  const currentAccount = useMemo(() => {
    if (projectId === "GOMTI-NAGAR-PH1-FITOUT") {
      return accounts.find((a) => a.projectId === "GOMTI-NAGAR-PH1-FITOUT") || accounts[0];
    }
    return accounts.find((a) => a.projectId === "GOMTI-NAGAR-PH1-FITOUT") || accounts[0] || null;
  }, [accounts, projectId]);

  // Handle Log Claim Submission
  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await logEscrowDefectClaim({
        escrowAccountId: claimForm.escrowAccountId,
        projectId: claimForm.projectId,
        claimNumber: claimForm.claimNumber,
        originalContractor: claimForm.originalContractor,
        tradePackage: claimForm.tradePackage,
        defectDescription: claimForm.defectDescription,
        locationTag: claimForm.locationTag,
        incidentDate: claimForm.incidentDate,
        rectificationNoticeRef: claimForm.rectificationNoticeRef,
        noticeServedDate: claimForm.noticeServedDate,
        noticePeriodDays: claimForm.noticePeriodDays,
        contractorResponse: claimForm.contractorResponse,
        rectificationCostInr: Number(claimForm.rectificationCostInr),
        thirdPartyContractor: claimForm.thirdPartyContractor,
        thirdPartyWorkOrderRef: claimForm.thirdPartyWorkOrderRef,
        thirdPartyInvoiceRef: claimForm.thirdPartyInvoiceRef,
        claimStatus: "EXECUTED_DEBITED",
        authorizedBy: claimForm.authorizedBy,
        debitDate: new Date().toISOString().split("T")[0],
        evidencePhotosCount: claimForm.evidencePhotosCount,
        notes: claimForm.notes,
      });
      showToast(`Claim ${claimForm.claimNumber} logged and debited ${fmtINR(claimForm.rectificationCostInr)} from escrow!`);
      setIsClaimModalOpen(false);
      loadData();
    } catch {
      showToast("Error logging emergency defect claim.");
    }
  };

  // Handle Tranche Release Submission
  const handleReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await releaseEscrowTranche(
        releaseForm.accountId,
        releaseForm.trancheNumber,
        Number(releaseForm.releaseAmount),
        releaseForm.authorizedBy,
        releaseForm.voucherRef
      );
      showToast(`Tranche ${releaseForm.trancheNumber} released successfully (${fmtINR(releaseForm.releaseAmount)})!`);
      setIsReleaseModalOpen(false);
      loadData();
    } catch {
      showToast("Error releasing tranche funds.");
    }
  };

  // Charts Data
  const chartAllocationData = useMemo(() => {
    return allocations.map((a) => ({
      name: TRADE_LABELS[a.tradePackage].split(" ")[0],
      package: TRADE_LABELS[a.tradePackage],
      allocated: a.allocatedReserveInr / 100000,
      debited: a.claimedAmountInr / 100000,
      balance: a.remainingBalanceInr / 100000,
    }));
  }, [allocations]);

  const chartFundBreakdown = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: "Liquid Reserve Balance", value: metrics.totalCurrentBalance, color: "#10b981" },
      { name: "Tranche 1 Released", value: metrics.totalReleased, color: "#3b82f6" },
      { name: "3rd-Party Defect Debits", value: metrics.totalClaimsDebited, color: "#ef4444" },
    ];
  }, [metrics]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500/90 text-white font-medium px-4 py-3 rounded-xl shadow-2xl border border-emerald-400 backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP BAR / NAVIGATION */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-400 uppercase">
            <ShieldCheck className="w-4 h-4" />
            <span>Closeout & Handover Framework • CPWD GCC Clause 17 & FIDIC Red Book Clause 11</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1 flex items-center gap-3">
            Defect Liability Escrow & Warranty Reserve
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Tripartite Escrow Active
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Real-time fiduciary ledger monitoring retained warranty funds, automated Tranche 1/2 milestone gates, and statutory third-party emergency defect rectification debits.
          </p>
        </div>

        {/* Project Selector & Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
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
            onClick={() => setIsClaimModalOpen(true)}
            className="flex items-center gap-2 bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-lg shadow-rose-950/40 border border-rose-500/40"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Log Emergency Defect Claim</span>
          </button>

          <button
            onClick={() => setIsReleaseModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-lg shadow-emerald-950/40 border border-emerald-500/40"
          >
            <Unlock className="w-4 h-4" />
            <span>Release Tranche</span>
          </button>

          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3.5 py-2 rounded-xl transition border border-slate-700"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Escrow Audit Statement</span>
          </button>
        </div>
      </div>

      {/* CLOSEOUT BREADCRUMB / MODULE SWITCHER */}
      <div className="flex flex-wrap items-center gap-2 mb-6 text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
        <span className="font-semibold text-slate-300">Closeout Modules:</span>
        <Link
          href="/closeout/as-built-vault"
          className="px-2.5 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-1"
        >
          <FileCheck2 className="w-3.5 h-3.5 text-blue-400" /> As-Built & O&M Vault
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
          href="/closeout/client-ledger"
          className="px-2.5 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-1"
        >
          <Coins className="w-3.5 h-3.5 text-amber-400" /> Client Closeout Ledger
        </Link>
        <span className="text-slate-600">•</span>
        <Link
          href="/closeout/vendor-archive"
          className="px-2.5 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-1"
        >
          <Users className="w-3.5 h-3.5 text-emerald-400" /> Vendor Scorecard
        </Link>
        <span className="text-slate-600">•</span>
        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-emerald-400" /> Escrow & Warranty Reserve
        </span>
        <span className="text-slate-600">•</span>
        <Link
          href="/closeout/audit-vault"
          className="px-2.5 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-1"
        >
          <FileLock2 className="w-3.5 h-3.5 text-purple-400" /> Audit Trail & Statutory Vault
        </Link>
        <span className="text-slate-600">•</span>
        <Link
          href="/closeout/command-center"
          className="px-2.5 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-1"
        >
          <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" /> Command Center
        </Link>
      </div>

      {/* FINANCIAL COMMAND CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Card 1: Total Retained Escrow */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition"></div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Total Retained in Escrow</span>
            <Lock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {fmtINR(metrics.totalRetained)}
          </div>
          <div className="text-[11px] text-blue-400/90 mt-1 flex items-center gap-1">
            <span>5% Contract Retention (Cl. 14.9)</span>
          </div>
        </div>

        {/* Card 2: Current Liquid Balance */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition"></div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Liquid Escrow Balance</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 tracking-tight">
            {fmtINR(metrics.totalCurrentBalance)}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1">
            <span>Reconciled & held in bank trust</span>
          </div>
        </div>

        {/* Card 3: 3rd-Party Defect Debits */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/10 transition"></div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Emergency Defect Debits</span>
            <Wrench className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400 tracking-tight">
            {fmtINR(metrics.totalClaimsDebited)}
          </div>
          <div className="text-[11px] text-rose-400/80 mt-1 flex items-center gap-1">
            <span>{claims.length} Defaults (CPWD Cl. 17 & 14)</span>
          </div>
        </div>

        {/* Card 4: Accrued Escrow Interest */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition"></div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Accrued Interest Yield</span>
            <Percent className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-400 tracking-tight">
            {fmtINR(metrics.totalInterest)}
          </div>
          <div className="text-[11px] text-cyan-400/80 mt-1 flex items-center gap-1">
            <span>@ ~6.50% p.a. trust deposit</span>
          </div>
        </div>

        {/* Card 5: DLP Expiry & Gate Progress */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition"></div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Avg Snag Clearance</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 tracking-tight">
            {metrics.avgSnagClearance.toFixed(1)}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-amber-400 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, metrics.avgSnagClearance)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* TABS HEADER */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === "overview"
              ? "border-emerald-500 text-emerald-400 bg-slate-900/80"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Escrow Accounts & Tranche Gates</span>
        </button>

        <button
          onClick={() => setActiveTab("allocations")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === "allocations"
              ? "border-emerald-500 text-emerald-400 bg-slate-900/80"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Warranty Reserve Allocations ({allocations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("claims")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === "claims"
              ? "border-emerald-500 text-emerald-400 bg-slate-900/80"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Emergency Defect Claims ({claims.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === "ledger"
              ? "border-emerald-500 text-emerald-400 bg-slate-900/80"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Transaction Audit Ledger ({ledger.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === "analytics"
              ? "border-emerald-500 text-emerald-400 bg-slate-900/80"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Liquidity & Trade Analytics</span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 1: ESCROW OVERVIEW & TRANCHE RELEASE GATES
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden"
            >
              {/* Account Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                    <Banknote className="w-4 h-4" />
                    <span>{acc.escrowBankName} • {acc.escrowBranch}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-0.5">{acc.accountHolderName}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1.5 font-mono">
                    <span>A/C: <span className="text-slate-200">{acc.escrowAccountNumber}</span></span>
                    <span>IFSC: <span className="text-slate-200">{acc.ifscCode}</span></span>
                    <span>Trustee: <span className="text-slate-200">{acc.trusteeAgentName}</span></span>
                    <span className="text-emerald-400 font-sans font-medium">Interest: {acc.interestRatePct}% p.a.</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {acc.accountStatus}
                  </span>
                  <button
                    onClick={() => {
                      setReleaseForm((prev) => ({
                        ...prev,
                        accountId: acc.id,
                        releaseAmount: acc.totalRetainedValueInr * 0.5,
                      }));
                      setIsReleaseModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Manage Release</span>
                  </button>
                </div>
              </div>

              {/* Balance Summary Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 mb-6 text-xs">
                <div>
                  <div className="text-slate-500">Initial Retained Capital</div>
                  <div className="text-base font-bold text-slate-200 mt-0.5">{fmtINR(acc.totalRetainedValueInr)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Cumulative Releases</div>
                  <div className="text-base font-bold text-blue-400 mt-0.5">{fmtINR(acc.releasedAmountInr)}</div>
                </div>
                <div>
                  <div className="text-slate-500">3rd-Party Defect Debits</div>
                  <div className="text-base font-bold text-rose-400 mt-0.5">{fmtINR(acc.pendingClaimsInr)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Net Liquid Escrow Balance</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">{fmtINR(acc.currentBalanceInr)}</div>
                </div>
              </div>

              {/* DUAL TRANCHE GATES (FIDIC Cl. 14.9 / CPWD Cl. 17) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tranche 1 Gate */}
                <div
                  className={`rounded-xl p-5 border transition ${
                    acc.tranche1Released
                      ? "bg-slate-950/70 border-emerald-500/40"
                      : "bg-slate-950/40 border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Tranche 1 (50% Retention Release)
                      </div>
                      <h4 className="text-base font-bold text-white mt-1">
                        Taking-Over Certificate & Punch List Gate
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Requires verified Taking-Over Certificate (TOC) and Punch List snag rectification exceeding 95% threshold.
                      </p>
                    </div>
                    {acc.tranche1Released ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Released
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Pending Gate
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400">Snag Rectification Score</span>
                      <span className={`font-bold ${acc.snagClearancePct >= 95 ? "text-emerald-400" : "text-amber-400"}`}>
                        {acc.snagClearancePct}% (Req: &gt;95%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          acc.snagClearancePct >= 95 ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(100, acc.snagClearancePct)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span>Released Value: <strong className="text-white">{fmtINR(acc.totalRetainedValueInr * 0.5)}</strong></span>
                    <span>Date: <strong className="text-slate-200">{fmtDate(acc.tranche1ReleaseDate)}</strong></span>
                  </div>
                </div>

                {/* Tranche 2 Gate */}
                <div
                  className={`rounded-xl p-5 border transition ${
                    acc.tranche2Released
                      ? "bg-slate-950/70 border-emerald-500/40"
                      : "bg-slate-950/40 border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Tranche 2 (50% Final Release)
                      </div>
                      <h4 className="text-base font-bold text-white mt-1">
                        DLP Expiry & Zero-Defect Handover Gate
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Released upon full {acc.dlpDurationMonths}-month DLP completion and issuance of the Final Zero-Defect Certificate.
                      </p>
                    </div>
                    {acc.tranche2Released ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Released
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> DLP Active
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400">Warranty Period Window</span>
                      <span className="text-slate-300 font-mono">
                        {fmtDate(acc.dlpStartDate)} → {fmtDate(acc.dlpEndDate)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      Remaining Value: <strong className="text-emerald-400">{fmtINR(acc.currentBalanceInr)}</strong> (Net of 3rd-party def. debits)
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span>Final Value: <strong className="text-white">{fmtINR(acc.totalRetainedValueInr * 0.5)}</strong></span>
                    <span>Status: <strong className="text-slate-200">{acc.tranche2Released ? "Settled" : "Held in Escrow"}</strong></span>
                  </div>
                </div>
              </div>

              {/* Notes & Legal Footer */}
              <div className="mt-5 text-xs text-slate-400 flex items-start gap-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Tripartite Trust Oversight:</strong> {acc.notes} Funds are under statutory escrow lien in accordance with CPWD GCC Clause 17 and FIDIC Red Book Clause 14.9.
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 2: WARRANTY RESERVE ALLOCATIONS MATRIX
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "allocations" && (
        <div className="space-y-4">
          {/* Controls & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search contractor, trade package, work order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedTradeFilter}
                onChange={(e) => setSelectedTradeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Trade Packages</option>
                <option value="CIVIL_STRUCTURAL">Civil & RCC Structures</option>
                <option value="MEP_HVAC">MEP, HVAC & Chilled Water</option>
                <option value="WATERPROOFING_INSULATION">Waterproofing & Membranes</option>
                <option value="ELEVATORS_ESCALATORS">Elevators & Escalators</option>
                <option value="FIRE_PROTECTION_SAFETY">Firefighting & Sprinklers</option>
              </select>
            </div>
          </div>

          {/* Allocations Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4">Trade Package</th>
                    <th className="p-4">Contractor & Work Order</th>
                    <th className="p-4 text-right">Allocated Reserve</th>
                    <th className="p-4 text-right">3rd-Party Debits</th>
                    <th className="p-4 text-right">Released Funds</th>
                    <th className="p-4 text-right">Remaining Balance</th>
                    <th className="p-4 text-center">Snag Clearance</th>
                    <th className="p-4 text-center">Warranty End</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredAllocations.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-medium">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: TRADE_COLORS[item.tradePackage] }}
                          ></span>
                          <span>{TRADE_LABELS[item.tradePackage]}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-white">{item.contractorName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.workOrderRef}</div>
                      </td>

                      <td className="p-4 text-right font-medium text-slate-200">
                        {fmtINR(item.allocatedReserveInr)}
                      </td>

                      <td className="p-4 text-right font-medium text-rose-400">
                        {item.claimedAmountInr > 0 ? fmtINR(item.claimedAmountInr) : "—"}
                      </td>

                      <td className="p-4 text-right font-medium text-blue-400">
                        {fmtINR(item.releasedAmountInr)}
                      </td>

                      <td className="p-4 text-right font-bold text-emerald-400">
                        {fmtINR(item.remainingBalanceInr)}
                      </td>

                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-slate-950 font-medium">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.clearancePercentage >= 95 ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                          ></div>
                          <span>{item.clearancePercentage}%</span>
                        </div>
                      </td>

                      <td className="p-4 text-center font-mono text-[11px] text-slate-400">
                        {fmtDate(item.warrantyEndDate)}
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase border ${
                            item.status === "PARTIALLY_RELEASED"
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                              : item.status === "FULLY_RELEASED"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredAllocations.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        No warranty reserve allocations matching your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 3: EMERGENCY DEFECT CLAIMS & 3RD-PARTY DEBIT REGISTRY
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "claims" && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Statutory Default Rectification Ledger (CPWD GCC Clause 17 & 14)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Records of primary contractor rectification defaults following statutory 14-day notice, executed via third-party agencies and debited directly from the escrow account.
              </p>
            </div>

            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-lg shadow-rose-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Log Emergency Defect</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredClaims.map((claim) => (
              <div
                key={claim.id}
                className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-rose-400">
                      <span className="font-bold">{claim.claimNumber}</span>
                      <span>•</span>
                      <span>{fmtDate(claim.incidentDate)}</span>
                      <span>•</span>
                      <span className="text-slate-400">{claim.locationTag}</span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-1">{claim.defectDescription}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span>Defaulted Contractor: <strong className="text-slate-200">{claim.originalContractor}</strong></span>
                      <span>•</span>
                      <span>Package: <strong className="text-slate-200">{TRADE_LABELS[claim.tradePackage]}</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-slate-400">Rectification Debit</span>
                    <span className="text-lg font-bold text-rose-400">{fmtINR(claim.rectificationCostInr)}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {claim.claimStatus.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Default Notice & Third Party Agency Execution Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60 mb-3">
                  <div>
                    <div className="text-slate-500">Statutory Notice Ref</div>
                    <div className="font-mono text-slate-300 mt-0.5">{claim.rectificationNoticeRef}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Served: {fmtDate(claim.noticeServedDate)} (14-day expiry)</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Contractor Default Recital</div>
                    <div className="text-slate-300 mt-0.5 italic">{claim.contractorResponse || "No response received"}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Executing 3rd-Party Agency</div>
                    <div className="font-semibold text-emerald-400 mt-0.5">{claim.thirdPartyContractor}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">Inv: {claim.thirdPartyInvoiceRef}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1">
                  <span>Authorized By: <strong className="text-slate-300">{claim.authorizedBy}</strong> (Debited on {fmtDate(claim.debitDate)})</span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" /> {claim.evidencePhotosCount} Site Photo Evidence Attachments Verified
                  </span>
                </div>
              </div>
            ))}

            {filteredClaims.length === 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                <p>No emergency defect claims or third-party debits recorded.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 4: TRANSACTION AUDIT LEDGER & INTEREST ACCRUAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-400" />
                  Escrow Trust Account Transaction Journal
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete chronological ledger showing capital deposits, milestone releases, emergency debits, and interest credits.
                </p>
              </div>
              <button
                onClick={() => setIsAuditModalOpen(true)}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition"
              >
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span>Print Statement</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Transaction Ref</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Beneficiary / Remitter</th>
                    <th className="p-3.5">Narration & Voucher</th>
                    <th className="p-3.5 text-right">Debit (-)</th>
                    <th className="p-3.5 text-right">Credit (+)</th>
                    <th className="p-3.5 text-right">Running Balance</th>
                    <th className="p-3.5 text-center">Approved By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {ledger.map((item) => {
                    const isDebit =
                      item.transactionType === "TRANCHE_1_RELEASE" ||
                      item.transactionType === "TRANCHE_2_RELEASE" ||
                      item.transactionType === "THIRD_PARTY_DEBIT" ||
                      item.transactionType === "BANK_CHARGES";

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono text-[11px] text-slate-400">
                          {fmtDate(item.transactionDate)}
                        </td>

                        <td className="p-3.5 font-mono text-[11px] text-slate-300">
                          {item.transactionRef}
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              item.transactionType === "DEPOSIT_RETENTION"
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                : item.transactionType === "INTEREST_CREDIT"
                                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                                : item.transactionType === "THIRD_PARTY_DEBIT"
                                ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            }`}
                          >
                            {item.transactionType.replace("_", " ")}
                          </span>
                        </td>

                        <td className="p-3.5 font-medium text-slate-200">
                          {item.beneficiaryOrRemitter}
                        </td>

                        <td className="p-3.5 max-w-xs truncate text-slate-400">
                          <div>{item.narration}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{item.referenceVoucher}</div>
                        </td>

                        <td className="p-3.5 text-right font-medium text-rose-400">
                          {isDebit ? fmtINR(item.amountInr) : "—"}
                        </td>

                        <td className="p-3.5 text-right font-medium text-emerald-400">
                          {!isDebit ? fmtINR(item.amountInr) : "—"}
                        </td>

                        <td className="p-3.5 text-right font-bold text-white font-mono">
                          {fmtINR(item.balanceAfterInr)}
                        </td>

                        <td className="p-3.5 text-center text-[11px] text-slate-400">
                          {item.approvedBy}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 5: LIQUIDITY ANALYTICS & PACKAGE BREAKDOWN
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart: Trade Package Breakdown */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Warranty Reserve Allocation vs Claims (₹ Lakhs)
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Distribution of allocated retention reserves, third-party defect claims, and current net balances across engineering trade packages.
            </p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartAllocationData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(val: any) => [`₹${Number(val).toFixed(2)} L`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Bar dataKey="allocated" name="Allocated (₹ L)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="debited" name="Debited (₹ L)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="balance" name="Net Balance (₹ L)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: Escrow Utilization */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-400" />
              Escrow Retention Capital Utilization Breakdown
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Current breakdown of total retained funds held in escrow trust versus released tranches and third-party emergency default recoveries.
            </p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartFundBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ? name.split(" ")[0] : ""} ${percent != null ? (percent * 100).toFixed(0) : 0}%`
                    }
                    labelLine={false}
                  >
                    {chartFundBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(val: any) => [fmtINR(Number(val)), "Amount"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">Liquid Balance</div>
                <div className="font-bold text-emerald-400 mt-0.5">{fmtINR(metrics.totalCurrentBalance)}</div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">Tranche Released</div>
                <div className="font-bold text-blue-400 mt-0.5">{fmtINR(metrics.totalReleased)}</div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">Defect Debits</div>
                <div className="font-bold text-rose-400 mt-0.5">{fmtINR(metrics.totalClaimsDebited)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 1: EMERGENCY DEFECT CLAIM LOGGING MODAL (CPWD Cl. 17 & 14)
      ───────────────────────────────────────────────────────────────────────────── */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Log Emergency Defect Claim (CPWD Cl. 17 & 14)</h3>
                  <p className="text-xs text-slate-400">Debit defect liability escrow for contractor rectification default</p>
                </div>
              </div>
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClaimSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Target Escrow Account</label>
                  <select
                    value={claimForm.escrowAccountId}
                    onChange={(e) => {
                      const acc = accounts.find((a) => a.id === e.target.value);
                      setClaimForm((prev) => ({
                        ...prev,
                        escrowAccountId: e.target.value,
                        projectId: acc ? acc.projectId : "GOMTI-NAGAR-PH1-FITOUT",
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.escrowBankName} - {a.escrowAccountNumber} ({a.projectId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Trade Package</label>
                  <select
                    value={claimForm.tradePackage}
                    onChange={(e) =>
                      setClaimForm((prev) => ({
                        ...prev,
                        tradePackage: e.target.value as WarrantyTradePackage,
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="WATERPROOFING_INSULATION">Waterproofing & Membranes</option>
                    <option value="MEP_HVAC">MEP, HVAC & Chilled Water</option>
                    <option value="CIVIL_STRUCTURAL">Civil & RCC Structures</option>
                    <option value="ELEVATORS_ESCALATORS">Elevators & Escalators</option>
                    <option value="FIRE_PROTECTION_SAFETY">Firefighting & Sprinklers</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Defaulted Primary Contractor</label>
                  <input
                    type="text"
                    required
                    value={claimForm.originalContractor}
                    onChange={(e) => setClaimForm({ ...claimForm, originalContractor: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Defect Location / Tag</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tower A - B2 Electrical Substation"
                    value={claimForm.locationTag}
                    onChange={(e) => setClaimForm({ ...claimForm, locationTag: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Defect Description & Emergency Urgency</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Detailed engineering defect description..."
                  value={claimForm.defectDescription}
                  onChange={(e) => setClaimForm({ ...claimForm, defectDescription: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">CPWD Cl. 17 Notice Ref</label>
                  <input
                    type="text"
                    required
                    value={claimForm.rectificationNoticeRef}
                    onChange={(e) => setClaimForm({ ...claimForm, rectificationNoticeRef: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Notice Served Date</label>
                  <input
                    type="date"
                    required
                    value={claimForm.noticeServedDate}
                    onChange={(e) => setClaimForm({ ...claimForm, noticeServedDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Notice Period (Days)</label>
                  <input
                    type="number"
                    value={claimForm.noticePeriodDays}
                    readOnly
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Third-Party Rectification Contractor</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Leakage Remediation LLP"
                    value={claimForm.thirdPartyContractor}
                    onChange={(e) => setClaimForm({ ...claimForm, thirdPartyContractor: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Rectification Cost (INR Debit)</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={claimForm.rectificationCostInr}
                    onChange={(e) => setClaimForm({ ...claimForm, rectificationCostInr: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500 font-semibold text-rose-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">3rd-Party Work Order Ref</label>
                  <input
                    type="text"
                    value={claimForm.thirdPartyWorkOrderRef}
                    onChange={(e) => setClaimForm({ ...claimForm, thirdPartyWorkOrderRef: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">3rd-Party Tax Invoice Ref</label>
                  <input
                    type="text"
                    value={claimForm.thirdPartyInvoiceRef}
                    onChange={(e) => setClaimForm({ ...claimForm, thirdPartyInvoiceRef: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-[11px] text-rose-300">
                <strong>Legal Undertaking (CPWD Cl. 17):</strong> The contractor having failed to remedy the stated defect within 14 days of notice, the Engineer-in-Charge hereby authorizes direct debit of {fmtINR(claimForm.rectificationCostInr)} from the contractor&apos;s escrow reserve allocation to settle the emergency contractor invoice.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/40 transition"
                >
                  Confirm & Debit Escrow Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 2: TRANCHE FUND RELEASE MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {isReleaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Execute Escrow Tranche Release</h3>
                  <p className="text-xs text-slate-400">FIDIC Red Book Clause 14.9 Retention Money Release</p>
                </div>
              </div>
              <button
                onClick={() => setIsReleaseModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReleaseSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Select Escrow Account</label>
                <select
                  value={releaseForm.accountId}
                  onChange={(e) => setReleaseForm({ ...releaseForm, accountId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountHolderName} ({fmtINR(a.currentBalanceInr)} available)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Release Tranche Stage</label>
                  <select
                    value={releaseForm.trancheNumber}
                    onChange={(e) =>
                      setReleaseForm({
                        ...releaseForm,
                        trancheNumber: Number(e.target.value) as 1 | 2,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value={1}>Tranche 1 (50% Post-TOC Snag Clearance)</option>
                    <option value={2}>Tranche 2 (50% Final DLP Expiry)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Release Amount (INR)</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={releaseForm.releaseAmount}
                    onChange={(e) => setReleaseForm({ ...releaseForm, releaseAmount: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Release Payment Voucher Reference</label>
                <input
                  type="text"
                  required
                  value={releaseForm.voucherRef}
                  onChange={(e) => setReleaseForm({ ...releaseForm, voucherRef: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Dual Signatories / Authorizing Authorities</label>
                <input
                  type="text"
                  required
                  value={releaseForm.authorizedBy}
                  onChange={(e) => setReleaseForm({ ...releaseForm, authorizedBy: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-[11px] text-emerald-300">
                <strong>Fiduciary Clearance Statement:</strong> Upon execution, instructions will be electronically transmitted to the Escrow Trustee Bank to disburse the retention tranche directly to verified contractor accounts net of debited default contra charges.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReleaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/40 transition"
                >
                  Authorize Tranche Disbursement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 3: AUDIT-READY ESCROW STATEMENT & PRINT LAYOUT
      ───────────────────────────────────────────────────────────────────────────── */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 print:border-none print:shadow-none print:max-h-none print:max-w-none print:bg-white print:text-black">
            {/* Header controls (hidden on print) */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Escrow Trust Account Statutory Audit Statement</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setIsAuditModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Statement Body */}
            <div className="p-8 overflow-y-auto space-y-6 text-xs text-slate-200 print:text-black print:p-0">
              {/* Document Header */}
              <div className="border-b border-slate-700 pb-6 print:border-black">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-bold uppercase tracking-wider text-white print:text-black">
                      QUADILLAR LIVEVIEW INFRASTRUCTURE
                    </h2>
                    <p className="text-xs text-slate-400 print:text-gray-600">
                      DEFECT LIABILITY ESCROW & WARRANTY RESERVE ACCOUNT STATEMENT
                    </p>
                    <p className="text-[11px] text-slate-400 print:text-gray-600">
                      Adhering to CPWD GCC Clause 17 & FIDIC Red Book Clause 11 / 14.9
                    </p>
                  </div>
                  <div className="text-right font-mono text-[11px] text-slate-400 print:text-gray-600">
                    <div>Statement Date: <strong>{new Date().toLocaleDateString("en-IN")}</strong></div>
                    <div>Project Ref: <strong>{currentAccount?.projectId || "GOMTI-NAGAR-PH1-FITOUT"}</strong></div>
                    <div>Status: <span className="text-emerald-400 print:text-black font-bold">ACTIVE & RECONCILED</span></div>
                  </div>
                </div>
              </div>

              {/* Escrow Trustee Information Block */}
              {currentAccount && (
                <div className="grid grid-cols-2 gap-4 bg-slate-900/60 print:bg-gray-100 p-4 rounded-xl border border-slate-800 print:border-gray-300">
                  <div>
                    <div className="text-slate-400 print:text-gray-600 font-semibold mb-1">Escrow Bank & Branch Details</div>
                    <div className="font-bold text-white print:text-black">{currentAccount.escrowBankName}</div>
                    <div>{currentAccount.escrowBranch}</div>
                    <div className="font-mono">Account No: {currentAccount.escrowAccountNumber}</div>
                    <div className="font-mono">IFSC: {currentAccount.ifscCode}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 print:text-gray-600 font-semibold mb-1">Trustee Agent & Tenure</div>
                    <div className="font-bold text-white print:text-black">{currentAccount.trusteeAgentName}</div>
                    <div>Trust Contact: {currentAccount.trusteeContactEmail}</div>
                    <div>DLP Window: {fmtDate(currentAccount.dlpStartDate)} to {fmtDate(currentAccount.dlpEndDate)} ({currentAccount.dlpDurationMonths} Mo.)</div>
                    <div>Accrual Yield: {currentAccount.interestRatePct}% p.a.</div>
                  </div>
                </div>
              )}

              {/* Bank Reconciliation Formula Box */}
              {currentAccount && (
                <div className="border border-slate-800 print:border-gray-300 rounded-xl p-4 bg-slate-900/40 print:bg-transparent">
                  <div className="font-bold text-white print:text-black uppercase text-[11px] mb-2 tracking-wider">
                    Statutory Escrow Balance Reconciliation Statement
                  </div>
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between">
                      <span>(+) Initial 5% Contract Retention Capital Deposit:</span>
                      <strong className="text-white print:text-black">{fmtINR(currentAccount.totalRetainedValueInr)}</strong>
                    </div>
                    <div className="flex justify-between text-blue-400 print:text-black">
                      <span>(-) Tranche 1 (50%) Retention Released post-TOC & Snags:</span>
                      <strong>{fmtINR(currentAccount.releasedAmountInr)}</strong>
                    </div>
                    <div className="flex justify-between text-rose-400 print:text-black">
                      <span>(-) Statutory CPWD Cl. 17 Emergency Defect Debits:</span>
                      <strong>{fmtINR(currentAccount.pendingClaimsInr)}</strong>
                    </div>
                    <div className="flex justify-between text-cyan-400 print:text-black">
                      <span>(+) Cumulative Accrued Escrow Interest Yield:</span>
                      <strong>{fmtINR(currentAccount.accruedInterestInr)}</strong>
                    </div>
                    <div className="border-t border-slate-700 print:border-black pt-2 flex justify-between text-sm font-bold text-emerald-400 print:text-black">
                      <span>Net Closing Liquid Balance in Escrow:</span>
                      <span>{fmtINR(currentAccount.currentBalanceInr)}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 print:text-gray-700 italic pt-1 font-sans">
                      In Words: {numberToWordsINR(currentAccount.currentBalanceInr)}
                    </div>
                  </div>
                </div>
              )}

              {/* Transactions Schedule Table */}
              <div>
                <div className="font-bold text-white print:text-black uppercase text-[11px] mb-2 tracking-wider">
                  Itemized Escrow Audit Transactions
                </div>
                <table className="w-full text-left text-xs border border-slate-800 print:border-gray-300">
                  <thead className="bg-slate-900 print:bg-gray-200 text-slate-400 print:text-black uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border border-slate-800 print:border-gray-300">Date</th>
                      <th className="p-2 border border-slate-800 print:border-gray-300">Txn Ref</th>
                      <th className="p-2 border border-slate-800 print:border-gray-300">Type</th>
                      <th className="p-2 border border-slate-800 print:border-gray-300">Beneficiary / Remitter</th>
                      <th className="p-2 border border-slate-800 print:border-gray-300 text-right">Debit (-)</th>
                      <th className="p-2 border border-slate-800 print:border-gray-300 text-right">Credit (+)</th>
                      <th className="p-2 border border-slate-800 print:border-gray-300 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-gray-300 font-mono text-[11px]">
                    {ledger.map((t) => (
                      <tr key={t.id}>
                        <td className="p-2 border border-slate-800 print:border-gray-300">{fmtDate(t.transactionDate)}</td>
                        <td className="p-2 border border-slate-800 print:border-gray-300">{t.transactionRef}</td>
                        <td className="p-2 border border-slate-800 print:border-gray-300 font-sans">{t.transactionType.replace("_", " ")}</td>
                        <td className="p-2 border border-slate-800 print:border-gray-300 font-sans">{t.beneficiaryOrRemitter}</td>
                        <td className="p-2 border border-slate-800 print:border-gray-300 text-right text-rose-400 print:text-black">
                          {t.transactionType.includes("DEBIT") || t.transactionType.includes("RELEASE") ? fmtINR(t.amountInr) : "—"}
                        </td>
                        <td className="p-2 border border-slate-800 print:border-gray-300 text-right text-emerald-400 print:text-black">
                          {t.transactionType.includes("DEPOSIT") || t.transactionType.includes("INTEREST") ? fmtINR(t.amountInr) : "—"}
                        </td>
                        <td className="p-2 border border-slate-800 print:border-gray-300 text-right font-bold text-white print:text-black">
                          {fmtINR(t.balanceAfterInr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Statutory Sign-Off Block */}
              <div className="pt-8 border-t border-slate-700 print:border-black grid grid-cols-3 gap-6 text-center text-xs">
                <div>
                  <div className="h-14 border-b border-slate-700 print:border-black flex items-end justify-center pb-1">
                    <span className="font-script text-base text-slate-300 print:text-black">Er. Rajesh Srivastava</span>
                  </div>
                  <div className="font-bold text-white print:text-black mt-1.5">Project Director</div>
                  <div className="text-[10px] text-slate-500 print:text-gray-600">Quadillar Infrastructure Projects</div>
                </div>

                <div>
                  <div className="h-14 border-b border-slate-700 print:border-black flex items-end justify-center pb-1">
                    <span className="font-script text-base text-slate-300 print:text-black">Dr. K. N. Verma</span>
                  </div>
                  <div className="font-bold text-white print:text-black mt-1.5">Escrow Bank Trustee Agent</div>
                  <div className="text-[10px] text-slate-500 print:text-gray-600">{currentAccount?.trusteeAgentName || "SBI Cap Trustee Ltd"}</div>
                </div>

                <div>
                  <div className="h-14 border-b border-slate-700 print:border-black flex items-end justify-center pb-1">
                    <span className="font-script text-base text-slate-300 print:text-black">Vikas Bansal, FCA</span>
                  </div>
                  <div className="font-bold text-white print:text-black mt-1.5">Lead Commercial Auditor</div>
                  <div className="text-[10px] text-slate-500 print:text-gray-600">Statutory Closeout Audit Board</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
