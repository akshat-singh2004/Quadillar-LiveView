"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  Award,
  BadgeCheck,
  Banknote,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  FileLock2,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  FolderArchive,
  HardHat,
  Hash,
  IndianRupee,
  Info,
  Key,
  Layers,
  LayoutDashboard,
  Link2,
  Lock,
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
  Star,
  Tag,
  TrendingDown,
  TrendingUp,
  Unlock,
  UserCheck,
  UserX,
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
  fetchClientFinalLedger,
  fetchClientRetentionReleases,
  fetchClientPhaseBillings,
  updateClientSettlementStatus,
  releaseRetentionTranche,
  fallbackClientFinalLedgers,
  fallbackClientRetentionReleases,
  fallbackClientPhaseBillingRecords,
  isDemoModeEnabled,
} from "@/app/lib/services";
import type {
  ClientFinalLedger,
  ClientRetentionRelease,
  ClientPhaseBillingRecord,
  ClientSettlementStatus,
  RetentionTrancheStatus,
} from "@/types/construction";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function fmtINR(val: number): string {
  const abs = Math.abs(val || 0);
  if (abs >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)} Cr`;
  if (abs >= 100_000) return `₹${(val / 100_000).toFixed(2)} L`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
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

function daysUntil(targetDate?: string | null): number | null {
  if (!targetDate) return null;
  const target = new Date(targetDate).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ClientLedgerCloseoutPage() {
  const roleContext = useActiveRole() as any;
  const activeProject = roleContext?.project;
  const activeRole = roleContext?.role;
  const activeTier = roleContext?.tier || activeProject?.tier || "COMMERCIAL";

  const projectId = activeProject?.project_id || activeProject?.id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = activeProject?.project_name || activeProject?.name || "Tower A Core & Shell Commercial Complex";
  const roleId = (activeRole as any)?.id || "";
  const roleLabel = (activeRole as any)?.label ?? (typeof activeRole === "string" ? activeRole : "Project Director");

  // State
  const [activeTab, setActiveTab] = useState<"balancesheet" | "retention" | "settlement">("balancesheet");
  const [ledger, setLedger] = useState<ClientFinalLedger | null>(() =>
    fallbackClientFinalLedgers.find((l: any) => l.projectId === projectId) || fallbackClientFinalLedgers[0]
  );
  const [retentionReleases, setRetentionReleases] = useState<ClientRetentionRelease[]>(() =>
    fallbackClientRetentionReleases.filter((r: any) => r.projectId === projectId || r.projectId === "GOMTI-NAGAR-PH1-FITOUT")
  );
  const [phaseBillings, setPhaseBillings] = useState<ClientPhaseBillingRecord[]>(() =>
    fallbackClientPhaseBillingRecords.filter((b: any) => b.projectId === projectId || b.projectId === "GOMTI-NAGAR-PH1-FITOUT")
  );
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Modals
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [selectedRetention, setSelectedRetention] = useState<ClientRetentionRelease | null>(null);
  const [selectedTrancheNumber, setSelectedTrancheNumber] = useState<1 | 2>(1);
  const [utrInput, setUtrInput] = useState("");

  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalRoleType, setApprovalRoleType] = useState<"DIRECTOR" | "ACCOUNTS">("DIRECTOR");
  const [approvalRemarks, setApprovalRemarks] = useState("");

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ledgerData, retData, phaseData] = await Promise.all([
        fetchClientFinalLedger(projectId),
        fetchClientRetentionReleases(projectId),
        fetchClientPhaseBillings(projectId),
      ]);
      if (ledgerData) setLedger(ledgerData);
      setRetentionReleases(retData);
      setPhaseBillings(phaseData);
    } catch (err: any) {
      console.error("Error loading client ledger:", err);
      setFeedback({ type: "error", text: "Failed to fetch live database records. Using synchronized state." });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Clear feedback after 5 seconds
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Calculations
  const activeRetention = retentionReleases[0] || null;

  const totalSanctionedPhase = useMemo(
    () => phaseBillings.reduce((sum, p) => sum + p.sanctionedAmountInr, 0),
    [phaseBillings]
  );
  const totalBilledPhase = useMemo(
    () => phaseBillings.reduce((sum, p) => sum + p.billedAmountInr, 0),
    [phaseBillings]
  );
  const totalReceivedPhase = useMemo(
    () => phaseBillings.reduce((sum, p) => sum + p.receivedAmountInr, 0),
    [phaseBillings]
  );
  const phaseRealizationPct = totalBilledPhase > 0 ? (totalReceivedPhase / totalBilledPhase) * 100 : 100;

  // Chart Data
  const phaseChartData = useMemo(() => {
    return phaseBillings.map((p: any) => ({
      name: p.phaseCode,
      sanctioned: p.sanctionedAmountInr / 100000,
      billed: p.billedAmountInr / 100000,
      received: p.receivedAmountInr / 100000,
      fullName: p.phaseName,
    }));
  }, [phaseBillings]);

  // Handle Tranche Release
  const handleOpenReleaseModal = (ret: ClientRetentionRelease, trancheNo: 1 | 2) => {
    setSelectedRetention(ret);
    setSelectedTrancheNumber(trancheNo);
    setUtrInput(`UTR-${Date.now().toString().slice(-6)}`);
    setReleaseModalOpen(true);
  };

  const handleConfirmTrancheRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRetention || !utrInput.trim()) return;
    try {
      const success = await releaseRetentionTranche(selectedRetention.id, selectedTrancheNumber, utrInput.trim());
      if (success) {
        setFeedback({
          type: "success",
          text: `Retention Tranche ${selectedTrancheNumber} (₹${(
            (selectedTrancheNumber === 1
              ? selectedRetention.tranche1AmountInr
              : selectedRetention.tranche2AmountInr) / 100000
          ).toFixed(2)} L) released via Bank UTR [${utrInput.trim()}].`,
        });
        setRetentionReleases((prev) =>
          prev.map((r: any) => {
            if (r.id === selectedRetention.id) {
              const trancheAmt =
                selectedTrancheNumber === 1 ? r.tranche1AmountInr : r.tranche2AmountInr;
              return {
                ...r,
                ...(selectedTrancheNumber === 1
                  ? {
                      tranche1Status: "RELEASED",
                      tranche1ReleasedDate: new Date().toISOString().slice(0, 10),
                      tranche1UtrRef: utrInput.trim(),
                    }
                  : {
                      tranche2Status: "RELEASED",
                      tranche2ReleasedDate: new Date().toISOString().slice(0, 10),
                      tranche2UtrRef: utrInput.trim(),
                    }),
                netRetentionReleasedInr: r.netRetentionReleasedInr + trancheAmt,
                retentionBalanceRemainingInr: Math.max(0, r.retentionBalanceRemainingInr - trancheAmt),
              };
            }
            return r;
          })
        );
        setReleaseModalOpen(false);
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to release tranche." });
    }
  };

  // Handle Settlement Approval
  const handleOpenApprovalModal = (roleType: "DIRECTOR" | "ACCOUNTS") => {
    setApprovalRoleType(roleType);
    setApprovalRemarks(
      roleType === "DIRECTOR"
        ? "Verified site practical completion, defect rectification, and liquidated damage deductions."
        : "Reconciled all RA invoices, statutory TDS/GST deposits, and final escrow balance."
    );
    setApprovalModalOpen(true);
  };

  const handleConfirmApproval = async () => {
    if (!ledger) return;
    try {
      let nextStatus: ClientSettlementStatus = ledger.finalSettlementStatus;
      if (approvalRoleType === "DIRECTOR") {
        nextStatus = ledger.accountsApproved ? "FINALLY_SETTLED" : "PENDING_ACCOUNTS_APPROVAL";
      } else if (approvalRoleType === "ACCOUNTS") {
        nextStatus = ledger.directorApproved ? "FINALLY_SETTLED" : "PENDING_DIRECTOR_APPROVAL";
      }

      const success = await updateClientSettlementStatus(
        ledger.id,
        nextStatus,
        approvalRoleType,
        roleLabel,
        approvalRemarks
      );

      if (success) {
        setFeedback({
          type: "success",
          text: `Approval successfully stamped by ${roleLabel}. Status advanced to ${nextStatus}.`,
        });
        setLedger((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            finalSettlementStatus: nextStatus,
            ...(approvalRoleType === "DIRECTOR"
              ? {
                  directorApproved: true,
                  directorName: roleLabel,
                  directorApprovedAt: new Date().toISOString(),
                  directorRemarks: approvalRemarks,
                }
              : {
                  accountsApproved: true,
                  accountsLeadName: roleLabel,
                  accountsApprovedAt: new Date().toISOString(),
                  accountsRemarks: approvalRemarks,
                }),
          };
          if (nextStatus === "FINALLY_SETTLED") {
            updated.noDuesCertificateNumber = `NODUES/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;
            updated.noDuesIssuedDate = new Date().toISOString().slice(0, 10);
          }
          return updated;
        });
        setApprovalModalOpen(false);
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to approve settlement." });
    }
  };

  // Helper status badge
  const renderSettlementBadge = (status: ClientSettlementStatus) => {
    switch (status) {
      case "FINALLY_SETTLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-950">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Finally Settled &amp; Cleared
          </span>
        );
      case "PENDING_ACCOUNTS_APPROVAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950/90 text-amber-300 border border-amber-500/50">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Pending Accounts Sign-Off
          </span>
        );
      case "PENDING_DIRECTOR_APPROVAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-950/90 text-purple-300 border border-purple-500/50">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            Pending Director Sign-Off
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
            <Lock className="w-3.5 h-3.5 text-zinc-400" />
            Archived Record
          </span>
        );
      case "DRAFT":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
            Draft Statement
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-24">
      {/* ── TOP BREADCRUMB & HEADER STRIP ───────────────────────────────────── */}
      <div className="border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md sticky top-14 z-30 px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-[1650px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              <span>Closeout &amp; Governance</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              <span className="text-cyan-400 font-semibold">Client Financial Closeout</span>
              <span className="ml-2 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px]">
                CPWD GCC &bull; FIDIC Cl. 14.11-14
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1 flex items-center gap-2.5">
              <Wallet className="w-6 h-6 text-cyan-400" />
              <span>Client Financial Closeout &amp; Retention Release Ledger</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 max-w-3xl">
              Employer balance sheet reconciliation, phase billing realization, automated 50/50 retention escrow releases
              (TOC &amp; post-DLP), two-tier executive approval chain, and official No-Dues Financial Clearance Certificate.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
              <span>Refresh Ledger</span>
            </button>

            <Link
              href="/closeout/vendor-archive"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span>Vendor Archive</span>
            </Link>

            <Link
              href="/closeout/subcontractor-settlement"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>Subcontractor Settlement</span>
            </Link>

            <Link
              href="/closeout/as-built-vault"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <FolderArchive className="w-3.5 h-3.5 text-cyan-400" />
              <span>As-Built Vault</span>
            </Link>

            <Link
              href="/closeout/escrow-reserve"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Escrow &amp; Reserve</span>
            </Link>

            <Link
              href="/closeout/audit-vault"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <FileLock2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Audit Vault</span>
            </Link>

            <Link
              href="/closeout/command-center"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
              <span>Command Center</span>
            </Link>

            <button
              type="button"
              onClick={() => setCertificateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/60 font-mono"
            >
              <Printer className="w-4 h-4" />
              <span>Official Client Statement &amp; No-Dues Cert</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ── FEEDBACK NOTIFICATION BANNER ───────────────────────────────────── */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl text-xs font-mono flex items-center justify-between gap-3 border shadow-lg transition animate-in fade-in ${
              feedback.type === "success"
                ? "bg-emerald-950/80 border-emerald-800 text-emerald-200"
                : feedback.type === "error"
                ? "bg-rose-950/80 border-rose-800 text-rose-200"
                : "bg-cyan-950/80 border-cyan-800 text-cyan-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {feedback.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
              {feedback.type === "info" && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
              <span>{feedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 hover:bg-zinc-800/60 rounded text-zinc-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── KPI METRICS RIBBON ─────────────────────────────────────────────── */}
        {ledger && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
            {/* Sanctioned vs Adjusted Value */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 relative overflow-hidden backdrop-blur-sm group hover:border-zinc-700 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span className="uppercase tracking-wider">Gross Contract Value</span>
                <Receipt className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white mt-1.5 tracking-tight">
                {fmtINR(ledger.grossContractValue)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2">
                <span>Sanctioned LOA:</span>
                <span className="font-bold text-zinc-200">{fmtINR(ledger.totalContractSum)}</span>
              </div>
            </div>

            {/* Funds Realized */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 relative overflow-hidden backdrop-blur-sm group hover:border-zinc-700 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span className="uppercase tracking-wider">Funds Received</span>
                <Banknote className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-1.5 tracking-tight">
                {fmtINR(ledger.totalFundsReceived)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2">
                <span>Certified Billings:</span>
                <span className="font-bold text-cyan-300">{fmtINR(ledger.totalCertifiedPayouts)}</span>
              </div>
            </div>

            {/* Outstanding Balance Receivable / Payable */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 relative overflow-hidden backdrop-blur-sm group hover:border-zinc-700 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span className="uppercase tracking-wider">Net Balance Receivable</span>
                <Scale className="w-4 h-4 text-amber-400" />
              </div>
              <div
                className={`text-2xl font-black mt-1.5 tracking-tight ${
                  ledger.netBalanceReceivablePayable > 0 ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {ledger.netBalanceReceivablePayable > 0
                  ? fmtINR(ledger.netBalanceReceivablePayable)
                  : "₹0.00 Reconciled"}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2">
                <span>Liquidated Damages:</span>
                <span className="font-bold text-rose-400">
                  {ledger.liquidatedDamagesApplied > 0 ? `-${fmtINR(ledger.liquidatedDamagesApplied)}` : "₹0"}
                </span>
              </div>
            </div>

            {/* Retention Escrow Account */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 relative overflow-hidden backdrop-blur-sm group hover:border-zinc-700 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span className="uppercase tracking-wider">Retention Escrow</span>
                <ShieldCheck className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-400 mt-1.5 tracking-tight">
                {activeRetention ? fmtINR(activeRetention.totalRetentionRetainedInr) : "₹0"}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2">
                <span>Released:</span>
                <span className="font-bold text-emerald-400">
                  {activeRetention ? fmtINR(activeRetention.netRetentionReleasedInr) : "₹0"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── TABS NAVIGATION ────────────────────────────────────────────────── */}
        <div className="border-b border-zinc-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("balancesheet")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === "balancesheet"
                  ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Phase Balance Sheet</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-zinc-800 text-[10px] text-zinc-300">
                {phaseBillings.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("retention")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === "retention"
                  ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Retention Escrow (50% TOC / 50% DLP)</span>
              {activeRetention && activeRetention.retentionBalanceRemainingInr > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-950 text-[10px] text-amber-400 border border-amber-500/30">
                  {fmtINR(activeRetention.retentionBalanceRemainingInr)} Held
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settlement")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === "settlement"
                  ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Executive Sign-Off &amp; Settlement Gate</span>
              {ledger && renderSettlementBadge(ledger.finalSettlementStatus)}
            </button>
          </div>
        </div>

        {/* ── TAB 1: PHASE BALANCE SHEET ─────────────────────────────────────── */}
        {activeTab === "balancesheet" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Visual Realization Meter */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-zinc-400 font-mono uppercase">Cumulative Fund Realization</div>
                <div className="text-lg font-black text-white mt-0.5 flex items-baseline gap-2 font-mono">
                  <span>{fmtINR(totalReceivedPhase)}</span>
                  <span className="text-xs text-zinc-400 font-normal">of {fmtINR(totalBilledPhase)} Billed</span>
                  <span className="text-emerald-400 font-bold text-xs bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                    {phaseRealizationPct.toFixed(1)}% Realized
                  </span>
                </div>
                <div className="w-full sm:w-96 h-2 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                    style={{ width: `${Math.min(100, phaseRealizationPct)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs text-right">
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500 uppercase">Sanctioned Budget</div>
                  <div className="font-bold text-white mt-0.5">{fmtINR(totalSanctionedPhase)}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500 uppercase">Net Cost Delta</div>
                  <div className="font-bold text-amber-400 mt-0.5">
                    {fmtINR(totalBilledPhase - totalSanctionedPhase)}
                  </div>
                </div>
              </div>
            </div>

            {/* Recharts Bar Comparison */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    Phase-Wise Financial Comparison (₹ Lakhs)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Sanctioned baseline vs. Certified billings vs. Realized client payments across project heads
                  </p>
                </div>
              </div>
              <div className="h-64 w-full font-mono text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={phaseChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                    <YAxis stroke="#71717a" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#09090b",
                        borderColor: "#27272a",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(val: any) => [`₹${val} L`, ""]}
                    />
                    <Legend />
                    <Bar dataKey="sanctioned" fill="#6366f1" radius={[4, 4, 0, 0]} name="Sanctioned" />
                    <Bar dataKey="billed" fill="#22d3ee" radius={[4, 4, 0, 0]} name="Billed to Client" />
                    <Bar dataKey="received" fill="#34d399" radius={[4, 4, 0, 0]} name="Received Funds" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Phase Ledger Table */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-900/90 text-zinc-400 border-b border-zinc-800 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3.5">Phase Code &amp; Milestone</th>
                      <th className="py-3 px-3 text-right">Sanctioned (INR)</th>
                      <th className="py-3 px-3 text-right">Billed (INR)</th>
                      <th className="py-3 px-3 text-right">Received (INR)</th>
                      <th className="py-3 px-3 text-right">Cost Delta</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3">Milestone Date</th>
                      <th className="py-3 px-3">Audit Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {phaseBillings.map((p: any) => (
                      <tr key={p.id} className="hover:bg-zinc-900/60 transition group">
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-white group-hover:text-cyan-400 transition">
                            {p.phaseName}
                          </div>
                          <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Tag className="w-3 h-3 text-zinc-600" />
                            <span>{p.phaseCode}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-300">
                          {fmtINR(p.sanctionedAmountInr)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-cyan-300">
                          {fmtINR(p.billedAmountInr)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-400">
                          {fmtINR(p.receivedAmountInr)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          <span
                            className={
                              p.varianceInr > 0
                                ? "text-amber-400 font-semibold"
                                : p.varianceInr < 0
                                ? "text-emerald-400 font-semibold"
                                : "text-zinc-500"
                            }
                          >
                            {p.varianceInr > 0 ? "+" : ""}
                            {fmtINR(p.varianceInr)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.phaseStatus === "SETTLED"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : p.phaseStatus === "RECONCILED"
                                ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                                : "bg-amber-950 text-amber-400 border border-amber-800"
                            }`}
                          >
                            {p.phaseStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-zinc-400">{fmtDate(p.completionDate)}</td>
                        <td className="py-3 px-3 text-[11px] text-zinc-400 max-w-xs truncate">
                          {p.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: RETENTION ESCROW & RELEASE TRACKER ───────────────────────── */}
        {activeTab === "retention" && activeRetention && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Escrow Account Overview Card */}
            <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <div className="text-xs font-mono text-cyan-400 uppercase font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Statutory Escrow Account
                  </div>
                  <h3 className="text-lg font-black text-white mt-0.5">
                    {activeRetention.escrowBankName}
                  </h3>
                  <div className="text-xs font-mono text-zinc-400 mt-0.5">
                    Escrow A/C: <span className="text-zinc-200">{activeRetention.retentionAccountNumber}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-right">
                    <div className="text-[10px] text-zinc-500 uppercase">Total 5% Retained</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {fmtINR(activeRetention.totalRetentionRetainedInr)}
                    </div>
                  </div>
                  <div className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-right">
                    <div className="text-[10px] text-zinc-500 uppercase">Escrow Balance Held</div>
                    <div className="text-sm font-bold text-amber-400 mt-0.5">
                      {fmtINR(activeRetention.retentionBalanceRemainingInr)}
                    </div>
                  </div>
                </div>
              </div>

              {/* 50/50 Tranche Dual Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Tranche 1 (TOC) */}
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-3 font-mono text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-bold">
                        Tranche 1 &bull; 50%
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1.5">
                        Taking-Over Certificate (TOC) Release
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Released upon Practical Completion and zero Category A snags.
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-white">
                        {fmtINR(activeRetention.tranche1AmountInr)}
                      </div>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          activeRetention.tranche1Status === "RELEASED"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-amber-950 text-amber-400 border border-amber-800"
                        }`}
                      >
                        {activeRetention.tranche1Status}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800/80 space-y-1 text-[11px] text-zinc-400">
                    <div className="flex justify-between">
                      <span>Release Date:</span>
                      <span className="text-zinc-200">{fmtDate(activeRetention.tranche1ReleasedDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bank UTR Ref:</span>
                      <span className="text-cyan-400 font-bold">
                        {activeRetention.tranche1UtrRef || "—"}
                      </span>
                    </div>
                  </div>

                  {activeRetention.tranche1Status !== "RELEASED" && (
                    <button
                      type="button"
                      onClick={() => handleOpenReleaseModal(activeRetention, 1)}
                      className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold transition text-xs shadow-md shadow-cyan-950"
                    >
                      Release Tranche 1
                    </button>
                  )}
                </div>

                {/* Tranche 2 (DLP Expiry) */}
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-3 font-mono text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800 text-[10px] font-bold">
                        Tranche 2 &bull; 50%
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1.5">
                        Defects Liability Period (DLP) Expiry
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Released upon expiry of 12-month DLP &amp; issuance of Final Performance Certificate.
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-white">
                        {fmtINR(activeRetention.tranche2AmountInr)}
                      </div>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          activeRetention.tranche2Status === "RELEASED"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-amber-950 text-amber-400 border border-amber-800"
                        }`}
                      >
                        {activeRetention.tranche2Status}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800/80 space-y-1 text-[11px] text-zinc-400">
                    <div className="flex justify-between">
                      <span>DLP Expiry Date:</span>
                      <span className="text-zinc-200">{fmtDate(activeRetention.dlpExpiryDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Maturity Countdown:</span>
                      <span className="text-amber-400 font-bold">
                        {daysUntil(activeRetention.dlpExpiryDate) !== null && daysUntil(activeRetention.dlpExpiryDate)! > 0
                          ? `${daysUntil(activeRetention.dlpExpiryDate)} Days Remaining`
                          : "Matured / Eligible for Release"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bank UTR Ref:</span>
                      <span className="text-cyan-400 font-bold">
                        {activeRetention.tranche2UtrRef || "Pending Maturity"}
                      </span>
                    </div>
                  </div>

                  {activeRetention.tranche2Status !== "RELEASED" ? (
                    <button
                      type="button"
                      onClick={() => handleOpenReleaseModal(activeRetention, 2)}
                      className="w-full py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-zinc-950 font-bold transition text-xs shadow-md shadow-purple-950"
                    >
                      Authorize Post-DLP Release
                    </button>
                  ) : (
                    <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800 text-center text-emerald-400 font-bold text-[11px]">
                      ✓ Fully Disbursed &amp; Discharged
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: EXECUTIVE SETTLEMENT & APPROVAL GATE ─────────────────────── */}
        {activeTab === "settlement" && ledger && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Approval Workflow Stepper */}
            <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase">
                    Two-Tier Statutory Settlement Approval Chain
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    FIDIC Red Book Clause 14.12 &bull; CPWD GCC Final Account Discharge Protocol
                  </p>
                </div>
                {renderSettlementBadge(ledger.finalSettlementStatus)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
                {/* Stage 1: Project Director */}
                <div
                  className={`p-4.5 rounded-xl border ${
                    ledger.directorApproved
                      ? "border-emerald-800/80 bg-emerald-950/20"
                      : "border-zinc-800 bg-zinc-950/60"
                  } space-y-3`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          ledger.directorApproved
                            ? "bg-emerald-500 text-zinc-950"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        1
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">Project Director Sign-Off</div>
                        <div className="text-[10px] text-zinc-400">Technical &amp; Milestone Verification</div>
                      </div>
                    </div>
                    {ledger.directorApproved ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                        Approved
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold">
                        Awaiting Action
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/80 space-y-1.5 text-[11px] text-zinc-400">
                    <div className="flex justify-between">
                      <span>Signatory:</span>
                      <span className="text-zinc-200">{ledger.directorName || "Er. Rajeshwar Nath Tripathi"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Approval Stamp:</span>
                      <span className="text-zinc-200">{fmtDate(ledger.directorApprovedAt)}</span>
                    </div>
                    {ledger.directorRemarks && (
                      <div className="pt-1.5 border-t border-zinc-800 text-zinc-300">
                        &ldquo;{ledger.directorRemarks}&rdquo;
                      </div>
                    )}
                  </div>

                  {!ledger.directorApproved && (
                    <button
                      type="button"
                      onClick={() => handleOpenApprovalModal("DIRECTOR")}
                      className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition text-xs shadow-md shadow-emerald-950"
                    >
                      Stamp Director Approval
                    </button>
                  )}
                </div>

                {/* Stage 2: Accounts / Commercial Lead */}
                <div
                  className={`p-4.5 rounded-xl border ${
                    ledger.accountsApproved
                      ? "border-emerald-800/80 bg-emerald-950/20"
                      : "border-zinc-800 bg-zinc-950/60"
                  } space-y-3`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          ledger.accountsApproved
                            ? "bg-emerald-500 text-zinc-950"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        2
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">Accounts &amp; Commercial Sign-Off</div>
                        <div className="text-[10px] text-zinc-400">Financial Audit &amp; Tax Reconciliations</div>
                      </div>
                    </div>
                    {ledger.accountsApproved ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                        Approved
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold">
                        Awaiting Action
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/80 space-y-1.5 text-[11px] text-zinc-400">
                    <div className="flex justify-between">
                      <span>Signatory:</span>
                      <span className="text-zinc-200">{ledger.accountsLeadName || "Alok Saxena"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Approval Stamp:</span>
                      <span className="text-zinc-200">{fmtDate(ledger.accountsApprovedAt)}</span>
                    </div>
                    {ledger.accountsRemarks && (
                      <div className="pt-1.5 border-t border-zinc-800 text-zinc-300">
                        &ldquo;{ledger.accountsRemarks}&rdquo;
                      </div>
                    )}
                  </div>

                  {!ledger.accountsApproved && (
                    <button
                      type="button"
                      onClick={() => handleOpenApprovalModal("ACCOUNTS")}
                      className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold transition text-xs shadow-md shadow-cyan-950"
                    >
                      Stamp Accounts Clearance
                    </button>
                  )}
                </div>
              </div>

              {/* No-Dues Certificate Status Banner */}
              {ledger.finalSettlementStatus === "FINALLY_SETTLED" && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <BadgeCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">
                        Official No-Dues Financial Clearance Certificate Active
                      </div>
                      <div className="text-[11px] text-emerald-400/90 mt-0.5">
                        Certificate #{ledger.noDuesCertificateNumber} issued on {fmtDate(ledger.noDuesIssuedDate)}.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCertificateModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition"
                  >
                    View / Print Certificate
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: RETENTION TRANCHE RELEASE ─────────────────────────────────── */}
      {releaseModalOpen && selectedRetention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl text-zinc-100 font-sans space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  Authorize Tranche {selectedTrancheNumber} Retention Escrow Release
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReleaseModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmTrancheRelease} className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Escrow Account:</span>
                  <span className="text-white">{selectedRetention.retentionAccountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Tranche Amount:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {fmtINR(
                      selectedTrancheNumber === 1
                        ? selectedRetention.tranche1AmountInr
                        : selectedRetention.tranche2AmountInr
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Bank Remittance UTR Reference:</label>
                <input
                  type="text"
                  required
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  placeholder="e.g. SBIN426058912301"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReleaseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono transition shadow-lg shadow-cyan-950"
                >
                  Confirm &amp; Disburse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: APPROVAL REMARKS ─────────────────────────────────────────── */}
      {approvalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl text-zinc-100 font-sans space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Stamp {approvalRoleType === "DIRECTOR" ? "Project Director" : "Accounts Lead"} Clearance
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApprovalModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-zinc-400 mb-1">Executive Audit Remarks:</label>
                <textarea
                  rows={3}
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono focus:border-cyan-500"
                />
              </div>

              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
                Approving Persona: <strong className="text-zinc-200">{roleLabel}</strong>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setApprovalModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmApproval()}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono transition shadow-lg shadow-emerald-950"
              >
                Sign &amp; Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: OFFICIAL CLIENT STATEMENT & NO-DUES CLEARANCE CERTIFICATE ─── */}
      {certificateModalOpen && ledger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl text-zinc-100 font-sans space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  Official Final Client Statement &amp; No-Dues Clearance Certificate
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold font-mono transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCertificateModalOpen(false)}
                  className="p-1 text-zinc-400 hover:text-white rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* PRINTABLE CONTAINER */}
            <div className="p-8 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-6 text-zinc-200 font-sans print:bg-white print:text-black print:border-none print:p-0">
              {/* Header */}
              <div className="border-b-2 border-zinc-700 pb-4 text-center">
                <div className="font-mono text-[10px] tracking-widest text-cyan-400 uppercase font-black print:text-zinc-600">
                  QUADILLAR LIVEVIEW &bull; CDE FINANCIAL CLOSEOUT ENGINE
                </div>
                <h2 className="text-xl font-black text-white mt-1 print:text-black uppercase">
                  Final Client Statement &amp; No-Dues Financial Clearance Certificate
                </h2>
                <div className="text-xs text-zinc-400 mt-1 font-mono print:text-zinc-600">
                  Issued under CPWD GCC Financial Standards &bull; FIDIC Red Book Clause 14.11 &amp; 14.14
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono border-b border-zinc-800 pb-4">
                <div>
                  <span className="text-zinc-400">Client / Employer:</span>
                  <div className="font-bold text-white print:text-black">{ledger.clientName}</div>
                  <div className="text-[11px] text-zinc-500">Org Code: {ledger.clientOrgCode}</div>
                </div>
                <div>
                  <span className="text-zinc-400">Certificate Reference:</span>
                  <div className="font-bold text-cyan-400 print:text-zinc-800">
                    {ledger.noDuesCertificateNumber || "NODUES/PROV/2026/01"}
                  </div>
                  <div className="text-[11px] text-zinc-500">Date: {fmtDate(ledger.noDuesIssuedDate || new Date().toISOString())}</div>
                </div>
                <div>
                  <span className="text-zinc-400">Project Title:</span>
                  <div className="font-bold text-white print:text-black">{ledger.projectTitle}</div>
                  <div className="text-[11px] text-zinc-500">Contract Code: {ledger.contractCode}</div>
                </div>
                <div>
                  <span className="text-zinc-400">Agreement Date:</span>
                  <div className="font-bold text-white print:text-black">{fmtDate(ledger.agreementDate)}</div>
                  <div className="text-[11px] text-zinc-500">Status: {ledger.finalSettlementStatus}</div>
                </div>
              </div>

              {/* Financial Balance Sheet Summary */}
              <div>
                <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-2 print:text-zinc-800">
                  Final Balance Sheet Reconciliation
                </h4>
                <table className="w-full text-xs font-mono border border-zinc-800 divide-y divide-zinc-800">
                  <tbody className="divide-y divide-zinc-800">
                    <tr className="bg-zinc-950/40">
                      <td className="p-2 text-zinc-400">1. Original Sanctioned Contract Sum (LOA)</td>
                      <td className="p-2 text-right font-bold text-white print:text-black">
                        {fmtINR(ledger.totalContractSum)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-zinc-400">2. Authorized Net Variations (+ / -)</td>
                      <td className="p-2 text-right font-bold text-white print:text-black">
                        {fmtINR(ledger.authorizedVariations)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-zinc-400">3. Price Adjustment / Escalation (Clause 13.8)</td>
                      <td className="p-2 text-right font-bold text-white print:text-black">
                        {fmtINR(ledger.priceAdjustmentInr)}
                      </td>
                    </tr>
                    <tr className="bg-zinc-950/60 font-bold">
                      <td className="p-2 text-cyan-300 print:text-black">4. Gross Adjusted Contract Value</td>
                      <td className="p-2 text-right text-cyan-300 print:text-black">
                        {fmtINR(ledger.grossContractValue)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-zinc-400">5. Liquidated Damages (Schedule Default Credit)</td>
                      <td className="p-2 text-right text-rose-400 print:text-red-700">
                        -{fmtINR(ledger.liquidatedDamagesApplied)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-zinc-400">6. Cumulative Certified Payouts</td>
                      <td className="p-2 text-right text-emerald-400 print:text-green-700">
                        {fmtINR(ledger.totalCertifiedPayouts)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-zinc-400">7. Total Funds Realized / Received</td>
                      <td className="p-2 text-right text-emerald-400 print:text-green-700">
                        {fmtINR(ledger.totalFundsReceived)}
                      </td>
                    </tr>
                    <tr className="bg-zinc-950 font-black text-sm">
                      <td className="p-2.5 text-amber-400 print:text-black">
                        8. Net Final Settlement Balance Due
                      </td>
                      <td className="p-2.5 text-right text-amber-300 print:text-black">
                        {fmtINR(ledger.netBalanceReceivablePayable)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Legal Declaration */}
              <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 space-y-1.5 print:bg-zinc-100 print:text-zinc-800">
                <div className="font-bold text-white print:text-black uppercase">
                  FIDIC Clause 14.14 Cessation of Employer&apos;s Liability &amp; No-Dues Undertaking
                </div>
                <p>
                  This official statement confirms that all certified measurements, variation orders, statutory tax
                  deductions (Section 194C TDS, GST TDS, Labour Cess), and retention escrow accounts have been
                  verified and formally balanced.
                </p>
                <p>
                  Neither party holds any outstanding claims, counter-claims, or disputes against the other in
                  connection with this Contract.
                </p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-zinc-800 text-xs font-mono">
                <div className="border-t border-zinc-700 pt-2 text-center">
                  <div className="font-bold text-white print:text-black">
                    {ledger.directorName || "Project Director"}
                  </div>
                  <div className="text-[10px] text-zinc-400">Quadillar PMC Lead</div>
                  <div className="text-[9px] text-emerald-400 mt-1">[Digital Signature Verified &bull; TOC Approved]</div>
                </div>

                <div className="border-t border-zinc-700 pt-2 text-center">
                  <div className="font-bold text-white print:text-black">
                    {ledger.accountsLeadName || "Accounts & Commercial Lead"}
                  </div>
                  <div className="text-[10px] text-zinc-400">Quadillar Commercial Directorate</div>
                  <div className="text-[9px] text-cyan-400 mt-1">[Accounts Audit Stamped &bull; Escrow Reconciled]</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
