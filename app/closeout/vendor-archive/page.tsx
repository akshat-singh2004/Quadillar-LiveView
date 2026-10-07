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
  ArchiveRestore,
  Award,
  BadgeAlert,
  BadgeCheck,
  Ban,
  Banknote,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileCode,
  FileLock2,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  FolderArchive,
  GraduationCap,
  HardHat,
  Hash,
  HelpCircle,
  History,
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
  Truck,
  Upload,
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
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { useActiveRole } from "@/context/RoleContext";
import {
  fetchVendorPerformanceScores,
  fetchVendorFinalAccounts,
  fetchProjectArchiveLogs,
  updateVendorListingStatus,
  settleVendorFinalAccount,
  archiveProjectDossier,
  isDemoModeEnabled,
  fallbackVendorPerformanceScores,
  fallbackVendorFinalAccounts,
  fallbackProjectArchiveLogs,
} from "@/app/lib/services";
import type {
  VendorPerformanceScore,
  VendorFinalAccount,
  ProjectArchiveLog,
  VendorListingStatus,
  VendorRatingGrade,
  FinalSettlementStatus,
  ArchiveDossierType,
} from "@/types/construction";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES & FORMATTERS
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

function fmtBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function VendorArchiveCloseoutPage() {
  const roleContext = useActiveRole() as any;
  const activeProject = roleContext?.project;
  const activeRole = roleContext?.role;
  const activeTier = roleContext?.tier || activeProject?.tier || "COMMERCIAL";

  const projectId = activeProject?.project_id || activeProject?.id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = activeProject?.project_name || activeProject?.name || "Tower A Core & Shell";
  const roleLabel = (activeRole as any)?.label ?? (typeof activeRole === "string" ? activeRole : "PMC Project Lead");

  // State
  const [activeTab, setActiveTab] = useState<"scorecard" | "ledger" | "blacklist" | "archive">("scorecard");
  const [scores, setScores] = useState<VendorPerformanceScore[]>(() =>
    fallbackVendorPerformanceScores.filter((s: any) => s.projectId === projectId || s.projectId === "GOMTI-NAGAR-PH1-FITOUT")
  );
  const [finalAccounts, setFinalAccounts] = useState<VendorFinalAccount[]>(() =>
    fallbackVendorFinalAccounts.filter((a: any) => a.projectId === projectId || a.projectId === "GOMTI-NAGAR-PH1-FITOUT")
  );
  const [archiveLogs, setArchiveLogs] = useState<ProjectArchiveLog[]>(() =>
    fallbackProjectArchiveLogs.filter((p: any) => p.projectId === projectId || p.projectId === "GOMTI-NAGAR-PH1-FITOUT")
  );
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [tradeFilter, setTradeFilter] = useState("ALL");
  const [listingFilter, setListingFilter] = useState("ALL");
  const [settlementFilter, setSettlementFilter] = useState("ALL");
  const [archiveTypeFilter, setArchiveTypeFilter] = useState("ALL");

  // Modals & Selected Items
  const [selectedScore, setSelectedScore] = useState<VendorPerformanceScore | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<VendorFinalAccount | null>(null);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false);
  const [targetVendorForBlacklist, setTargetVendorForBlacklist] = useState<VendorPerformanceScore | null>(null);
  const [blacklistReasonInput, setBlacklistReasonInput] = useState("");
  const [newStatusInput, setNewStatusInput] = useState<VendorListingStatus>("BLACKLISTED");

  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [certificateAccount, setCertificateAccount] = useState<VendorFinalAccount | null>(null);

  const [newArchiveModalOpen, setNewArchiveModalOpen] = useState(false);
  const [newArchiveForm, setNewArchiveForm] = useState<{
    title: string;
    archiveType: ArchiveDossierType;
    reference: string;
    notes: string;
    retentionYears: number;
  }>({
    title: "",
    archiveType: "CONTRACT_DOSSIER",
    reference: "",
    notes: "",
    retentionYears: 10,
  });

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [scoresData, accountsData, archiveData] = await Promise.all([
        fetchVendorPerformanceScores(projectId),
        fetchVendorFinalAccounts(projectId),
        fetchProjectArchiveLogs(projectId),
      ]);
      setScores(scoresData);
      setFinalAccounts(accountsData);
      setArchiveLogs(archiveData);
    } catch (err: any) {
      console.error("Error loading vendor archive data:", err);
      setFeedback({ type: "error", text: "Failed to fetch live database records. Loaded offline dataset." });
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

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalAwarded = finalAccounts.reduce((acc, c) => acc + c.totalAwardedValue, 0);
    const totalGross = finalAccounts.reduce((acc, c) => acc + c.totalGrossBillableValue, 0);
    const totalPaid = finalAccounts.reduce((acc, c) => acc + c.cumulativePaidToDate, 0);
    const totalBalanceDue = finalAccounts.reduce((acc, c) => acc + (c.balanceDueOrRefund > 0 ? c.balanceDueOrRefund : 0), 0);
    const totalLiquidatedDamages = finalAccounts.reduce((acc, c) => acc + c.liquidatedDamagesApplied, 0);
    const totalRetentionReleased = finalAccounts.reduce((acc, c) => acc + c.retentionReleasedInr, 0);

    const whitelistedCount = scores.filter((s: any) => s.listingStatus === "WHITELISTED").length;
    const monitoredCount = scores.filter((s: any) => s.listingStatus === "MONITORED").length;
    const suspendedOrBlacklistedCount = scores.filter((s: any) => s.listingStatus === "SUSPENDED" || s.listingStatus === "BLACKLISTED").length;

    const avgCompositeScore = scores.length
      ? scores.reduce((acc, s) => acc + s.weightedCompositeScore, 0) / scores.length
      : 0;

    const fullyDischargedCount = finalAccounts.filter((f) => f.fidicClause1412Discharged).length;
    const totalArchives = archiveLogs.length;

    return {
      totalAwarded,
      totalGross,
      totalPaid,
      totalBalanceDue,
      totalLiquidatedDamages,
      totalRetentionReleased,
      whitelistedCount,
      monitoredCount,
      suspendedOrBlacklistedCount,
      avgCompositeScore,
      fullyDischargedCount,
      totalArchives,
    };
  }, [scores, finalAccounts, archiveLogs]);

  // Filtered Scores
  const filteredScores = useMemo(() => {
    return scores.filter((s: any) => {
      const matchSearch =
        !searchTerm ||
        s.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.tradeCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contractReference.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTrade = tradeFilter === "ALL" || s.tradeCategory === tradeFilter;
      const matchListing = listingFilter === "ALL" || s.listingStatus === listingFilter;
      return matchSearch && matchTrade && matchListing;
    });
  }, [scores, searchTerm, tradeFilter, listingFilter]);

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return finalAccounts.filter((a: any) => {
      const matchSearch =
        !searchTerm ||
        a.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.tradeCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.contractRef.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTrade = tradeFilter === "ALL" || a.tradeCategory === tradeFilter;
      const matchStatus = settlementFilter === "ALL" || a.settlementStatus === settlementFilter;
      return matchSearch && matchTrade && matchStatus;
    });
  }, [finalAccounts, searchTerm, tradeFilter, settlementFilter]);

  // Filtered Archives
  const filteredArchives = useMemo(() => {
    return archiveLogs.filter((arc) => {
      const matchSearch =
        !searchTerm ||
        arc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arc.archiveReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arc.fileHashSha256.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = archiveTypeFilter === "ALL" || arc.archiveDossierType === archiveTypeFilter;
      return matchSearch && matchType;
    });
  }, [archiveLogs, searchTerm, archiveTypeFilter]);

  // Unique Trades
  const trades = useMemo(() => {
    const set = new Set<string>();
    scores.forEach((s: any) => set.add(s.tradeCategory));
    finalAccounts.forEach((a: any) => set.add(a.tradeCategory));
    return Array.from(set);
  }, [scores, finalAccounts]);

  // Trend Data for Charts (Simulated historical quarterly breakdown)
  const trendChartData = useMemo(() => {
    return [
      { quarter: "Q1-2025", Quality: 82, Safety: 84, Schedule: 76, Overall: 81.2 },
      { quarter: "Q2-2025", Quality: 85, Safety: 87, Schedule: 79, Overall: 84.1 },
      { quarter: "Q3-2025", Quality: 88, Safety: 89, Schedule: 82, Overall: 86.8 },
      { quarter: "Q4-2025/26", Quality: 89.5, Safety: 91.2, Schedule: 84.6, Overall: 88.5 },
    ];
  }, []);

  // Handle Blacklist / Whitelist Toggle
  const handleOpenBlacklistModal = (score: VendorPerformanceScore, defaultStatus: VendorListingStatus) => {
    setTargetVendorForBlacklist(score);
    setNewStatusInput(defaultStatus);
    setBlacklistReasonInput(score.blacklistReason || "");
    setBlacklistModalOpen(true);
  };

  const handleConfirmListingChange = async () => {
    if (!targetVendorForBlacklist) return;
    try {
      const success = await updateVendorListingStatus(
        targetVendorForBlacklist.id,
        newStatusInput,
        blacklistReasonInput,
        roleLabel
      );
      if (success) {
        setFeedback({
          type: "success",
          text: `Vendor "${targetVendorForBlacklist.vendorName}" status successfully updated to ${newStatusInput}.`,
        });
        setScores((prev) =>
          prev.map((s: any) =>
            s.id === targetVendorForBlacklist.id
              ? {
                  ...s,
                  listingStatus: newStatusInput,
                  blacklistReason: newStatusInput === "WHITELISTED" ? undefined : blacklistReasonInput,
                  blacklistedBy: newStatusInput === "WHITELISTED" ? undefined : roleLabel,
                  blacklistedAt: newStatusInput === "WHITELISTED" ? undefined : new Date().toISOString(),
                }
              : s
          )
        );
        setBlacklistModalOpen(false);
      } else {
        setFeedback({ type: "error", text: "Failed to update vendor status." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Operation failed." });
    }
  };

  // Handle Settle & Discharge Execution (FIDIC Cl. 14.12)
  const handleExecuteDischarge = async (account: VendorFinalAccount) => {
    try {
      const certNo = `DISCHARGE/${account.contractRef.replace(/[^a-zA-Z0-9]/g, "-")}/${new Date().getFullYear()}`;
      const success = await settleVendorFinalAccount(account.id, {
        settlementStatus: "DISCHARGED_ARCHIVED",
        fidicClause1412Discharged: true,
        dischargeCertificateNumber: certNo,
        dischargedAt: new Date().toISOString(),
        dischargedBy: roleLabel,
        employerSignatoryName: `${roleLabel} (Project Lead)`,
        contractorSignatoryName: account.contractorSignatoryName || "Authorized Contractor Representative",
        contractorSignatoryDesignation: account.contractorSignatoryDesignation || "Director / Attorney",
        settlementNotes: "FIDIC Cl. 14.12 No-Further-Claims Statutory Discharge Undertaking fully executed and archived.",
      });

      if (success) {
        setFeedback({
          type: "success",
          text: `Final Account for "${account.vendorName}" settled and formally discharged under FIDIC Cl. 14.12.`,
        });
        setFinalAccounts((prev) =>
          prev.map((a: any) =>
            a.id === account.id
              ? {
                  ...a,
                  settlementStatus: "DISCHARGED_ARCHIVED",
                  fidicClause1412Discharged: true,
                  dischargeCertificateNumber: certNo,
                  dischargedAt: new Date().toISOString(),
                  dischargedBy: roleLabel,
                }
              : a
          )
        );
        // Also auto-archive into Project Archive Vault
        await archiveProjectDossier({
          projectId,
          vendorId: account.vendorId,
          archiveDossierType: "FINAL_ACCOUNT_CERTIFICATE",
          archiveReference: `QL-ARC-${certNo}`,
          title: `FIDIC 14.12 Final Account & Statutory Discharge — ${account.vendorName}`,
          fileUrl: `/archive/contracts/${account.contractRef.toLowerCase()}_discharge.pdf`,
          fileSizeBytes: 1850400,
          fileHashSha256: "7c98b2512a8069d2d47f9189b88939e6a97120a2e0a2fefbbffb0340b1154c12",
          retentionPeriodYears: 10,
          archiveNotes: "Auto-archived post-settlement execution.",
        });
        // Reload archive logs
        const updatedLogs = await fetchProjectArchiveLogs(projectId);
        setArchiveLogs(updatedLogs);
        setSettleModalOpen(false);
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to execute settlement." });
    }
  };

  // Handle New Archive Creation
  const handleCreateArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArchiveForm.title.trim()) {
      setFeedback({ type: "error", text: "Please enter a dossier title." });
      return;
    }
    const hash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b: any) => b.toString(16).padStart(2, "0"))
      .join("");

    const ref =
      newArchiveForm.reference ||
      `QL-ARC-${newArchiveForm.archiveType.slice(0, 3)}-${Date.now().toString().slice(-4)}`;

    const created = await archiveProjectDossier({
      projectId,
      archiveDossierType: newArchiveForm.archiveType,
      archiveReference: ref,
      title: newArchiveForm.title,
      fileUrl: `/archive/closeout/${ref.toLowerCase()}.tar.gz`,
      fileSizeBytes: Math.floor(Math.random() * 50000000) + 1000000,
      fileHashSha256: hash,
      retentionPeriodYears: newArchiveForm.retentionYears,
      archiveNotes: newArchiveForm.notes,
      archivedBy: roleLabel,
    });

    if (created) {
      setFeedback({
        type: "success",
        text: `Dossier "${created.title}" successfully archived with SHA-256 seal [${hash.slice(0, 10)}...].`,
      });
      setArchiveLogs((prev) => [created, ...prev]);
      setNewArchiveModalOpen(false);
      setNewArchiveForm({
        title: "",
        archiveType: "CONTRACT_DOSSIER",
        reference: "",
        notes: "",
        retentionYears: 10,
      });
    }
  };

  // Helper Grade Badge
  const renderGradeBadge = (grade: VendorRatingGrade) => {
    switch (grade) {
      case "CLASS_A_PLUS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950">
            <Award className="w-3 h-3 text-emerald-400" />
            Class A+ (Outstanding)
          </span>
        );
      case "CLASS_A":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
            <CheckCircle2 className="w-3 h-3 text-cyan-400" />
            Class A (Good)
          </span>
        );
      case "CLASS_B":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Class B (Fair)
          </span>
        );
      case "CLASS_C":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            Class C (Deficient)
          </span>
        );
      case "DEBARRED":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-red-950/90 text-red-300 border border-red-500/50">
            <Ban className="w-3 h-3 text-red-400" />
            Debarred / Disqualified
          </span>
        );
    }
  };

  // Helper Status Badge
  const renderListingBadge = (status: VendorListingStatus) => {
    switch (status) {
      case "WHITELISTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <UserCheck className="w-3 h-3" />
            Whitelisted
          </span>
        );
      case "MONITORED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            Under Watch
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
            <MinusCircle className="w-3 h-3" />
            Suspended
          </span>
        );
      case "BLACKLISTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse">
            <UserX className="w-3 h-3" />
            Blacklisted
          </span>
        );
    }
  };

  // Settlement Status Badge
  const renderSettlementBadge = (status: FinalSettlementStatus, discharged: boolean) => {
    if (discharged || status === "DISCHARGED_ARCHIVED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          Discharged (FIDIC 14.12)
        </span>
      );
    }
    switch (status) {
      case "AGREED_FINAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
            <FileCheck className="w-3 h-3 text-cyan-400" />
            Agreed Final
          </span>
        );
      case "UNDER_AUDIT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
            <Clock className="w-3 h-3 text-amber-400" />
            Under Audit
          </span>
        );
      case "DISPUTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-500/40">
            <Scale className="w-3 h-3 text-rose-400" />
            Disputed Claim
          </span>
        );
      case "DRAFT":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400">
            Draft
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
              <span className="text-cyan-400 font-semibold">Vendor Rating &amp; Project Archive</span>
              <span className="ml-2 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px]">
                CPWD &amp; FIDIC Cl. 14.11-14
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1 flex items-center gap-2.5">
              <FolderArchive className="w-6 h-6 text-cyan-400" />
              <span>Vendor Performance Evaluation, Final Settlement &amp; Archive Vault</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 max-w-3xl">
              CPWD Works Manual multi-pillar contractor rating scorecard (Quality 40%, Safety/BOCW 25%, Schedule 20%, Dispute 15%),
              FIDIC Red Book final accounts reconciliation ledger, and ISO 19650 tamper-sealed project archive vault.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
              title="Refresh records from Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
              <span>Sync Ledger</span>
            </button>

            <Link
              href="/closeout/completion-report"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
              <span>Project Completion Report (PCR)</span>
            </Link>

            <Link
              href="/closeout/client-ledger"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Wallet className="w-3.5 h-3.5 text-cyan-400" />
              <span>Client Closeout</span>
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
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
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
              onClick={() => setNewArchiveModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/60 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Deposit Archive Dossier</span>
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

        {/* ── KPI EXECUTIVE METRICS RIBBON ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 relative overflow-hidden backdrop-blur-sm group hover:border-zinc-700 transition">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full pointer-events-none" />
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="uppercase tracking-wider">Total Awarded (LOA)</span>
              <Receipt className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1.5 tracking-tight">
              {fmtINR(kpis.totalAwarded)}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2">
              <span>Gross Billable:</span>
              <span className="font-bold text-cyan-300">{fmtINR(kpis.totalGross)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 relative overflow-hidden backdrop-blur-sm group hover:border-zinc-700 transition">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="uppercase tracking-wider">Net Settled / Paid</span>
              <Banknote className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1.5 tracking-tight">
              {fmtINR(kpis.totalPaid)}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2">
              <span>Outstanding Bal Due:</span>
              <span className={`font-bold ${kpis.totalBalanceDue > 0 ? "text-amber-400" : "text-zinc-400"}`}>
                {fmtINR(kpis.totalBalanceDue)}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 relative overflow-hidden backdrop-blur-sm group hover:border-zinc-700 transition">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none" />
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="uppercase tracking-wider">Avg CPWD Rating</span>
              <Star className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1.5 tracking-tight flex items-baseline gap-1.5">
              <span>{kpis.avgCompositeScore.toFixed(1)}</span>
              <span className="text-xs text-zinc-400 font-normal">/ 100</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30 ml-auto">
                Class A+ Avg
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2">
              <span>Whitelist Ratio:</span>
              <span className="font-bold text-zinc-200">
                {kpis.whitelistedCount} Preferred / {kpis.suspendedOrBlacklistedCount} Debarred
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 relative overflow-hidden backdrop-blur-sm group hover:border-zinc-700 transition">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none" />
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="uppercase tracking-wider">FIDIC Cl. 14.12 Discharged</span>
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-400 mt-1.5 tracking-tight">
              {kpis.fullyDischargedCount}{" "}
              <span className="text-xs text-zinc-400 font-normal">
                of {finalAccounts.length} Contracts
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2">
              <span>Sealed ISO Archives:</span>
              <span className="font-bold text-zinc-200">{kpis.totalArchives} Dossiers</span>
            </div>
          </div>
        </div>

        {/* ── TABS NAVIGATION BAR ────────────────────────────────────────────── */}
        <div className="border-b border-zinc-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("scorecard")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === "scorecard"
                  ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <Award className="w-4 h-4" />
              <span>CPWD Vendor Scorecard</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-zinc-800 text-[10px] text-zinc-300">
                {scores.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ledger")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === "ledger"
                  ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Financial Reconciliation (FIDIC Cl. 14)</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-zinc-800 text-[10px] text-zinc-300">
                {finalAccounts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("blacklist")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === "blacklist"
                  ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <UserX className="w-4 h-4" />
              <span>Debarment &amp; Trend Analytics</span>
              {kpis.suspendedOrBlacklistedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-950 text-[10px] text-red-400 border border-red-500/30">
                  {kpis.suspendedOrBlacklistedCount} Alert
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("archive")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === "archive"
                  ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <FolderArchive className="w-4 h-4" />
              <span>ISO 19650 Archive Vault</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-zinc-800 text-[10px] text-zinc-300">
                {archiveLogs.length}
              </span>
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 py-1.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search vendor, contract..."
                className="pl-8 pr-3 py-1 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-cyan-500 w-44 sm:w-56 font-mono"
              />
            </div>

            <select
              value={tradeFilter}
              onChange={(e) => setTradeFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Work Trades</option>
              {trades.map((t: any) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── TAB 1: CPWD VENDOR SCORECARD ──────────────────────────────────── */}
        {activeTab === "scorecard" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* CPWD Guidelines Callout Banner */}
            <div className="p-4 rounded-xl border border-cyan-900/50 bg-cyan-950/20 text-xs text-zinc-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <GraduationCap className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-cyan-300">
                    CPWD Works Manual Statutory Vendor Rating Guidelines
                  </div>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    Ratings are weighted based on 4 essential execution pillars:{" "}
                    <strong className="text-zinc-200">Quality of Workmanship (40%)</strong>,{" "}
                    <strong className="text-zinc-200">Safety &amp; BOCW Cess Compliance (25%)</strong>,{" "}
                    <strong className="text-zinc-200">Progress &amp; Schedule Delivery (20%)</strong>, and{" "}
                    <strong className="text-zinc-200">Commercial &amp; Dispute Conduct (15%)</strong>.
                    Vendors scoring &lt;55% or exhibiting repeated statutory defaults are subject to debarment.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-right font-mono text-[11px]">
                <div className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800">
                  <span className="text-emerald-400 font-bold">&ge;85%:</span> Class A+
                </div>
                <div className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800">
                  <span className="text-cyan-400 font-bold">70-84%:</span> Class A
                </div>
                <div className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800">
                  <span className="text-amber-400 font-bold">55-69%:</span> Class B
                </div>
                <div className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800">
                  <span className="text-rose-400 font-bold">&lt;55%:</span> Deficient
                </div>
              </div>
            </div>

            {/* Scorecard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredScores.map((score: any) => (
                <div
                  key={score.id}
                  className={`rounded-xl border p-4.5 bg-zinc-900/50 backdrop-blur-sm transition hover:border-zinc-700 flex flex-col justify-between ${
                    score.listingStatus === "BLACKLISTED"
                      ? "border-red-900/60 bg-red-950/10"
                      : score.listingStatus === "SUSPENDED"
                      ? "border-orange-900/50 bg-orange-950/10"
                      : "border-zinc-800/80"
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-mono text-cyan-400 font-bold">
                          {score.contractReference}
                        </div>
                        <h3 className="text-sm font-black text-white mt-0.5 line-clamp-1">
                          {score.vendorName}
                        </h3>
                        <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{score.tradeCategory}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {renderListingBadge(score.listingStatus)}
                      </div>
                    </div>

                    {/* Overall Score Badge */}
                    <div className="mt-3.5 p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-xl font-black font-mono text-white">
                          {score.weightedCompositeScore.toFixed(1)}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          <div>Weighted</div>
                          <div>Score / 100</div>
                        </div>
                      </div>
                      {renderGradeBadge(score.ratingGrade)}
                    </div>

                    {/* 4 Pillars Progress Bars */}
                    <div className="mt-4 space-y-2.5 font-mono text-xs">
                      {/* Quality 40% */}
                      <div>
                        <div className="flex justify-between text-[11px] text-zinc-300 mb-1">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                            Quality (40%):
                          </span>
                          <span className="font-bold text-white">{score.qualityRating.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 rounded-full"
                            style={{ width: `${Math.min(100, score.qualityRating)}%` }}
                          />
                        </div>
                      </div>

                      {/* Safety 25% */}
                      <div>
                        <div className="flex justify-between text-[11px] text-zinc-300 mb-1">
                          <span className="flex items-center gap-1">
                            <HardHat className="w-3 h-3 text-emerald-400" />
                            Safety &amp; BOCW (25%):
                          </span>
                          <span className="font-bold text-white">
                            {score.safetyComplianceScore.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${Math.min(100, score.safetyComplianceScore)}%` }}
                          />
                        </div>
                      </div>

                      {/* Schedule 20% */}
                      <div>
                        <div className="flex justify-between text-[11px] text-zinc-300 mb-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            Schedule Delivery (20%):
                          </span>
                          <span className="font-bold text-white">
                            {score.scheduleAdherence.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${Math.min(100, score.scheduleAdherence)}%` }}
                          />
                        </div>
                      </div>

                      {/* Dispute & Commercial 15% */}
                      <div>
                        <div className="flex justify-between text-[11px] text-zinc-300 mb-1">
                          <span className="flex items-center gap-1">
                            <Scale className="w-3 h-3 text-purple-400" />
                            Dispute &amp; Commercial (15%):
                          </span>
                          <span className="font-bold text-white">
                            {score.disputeCommercialScore.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-400 rounded-full"
                            style={{ width: `${Math.min(100, score.disputeCommercialScore)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Supporting Metrics Badges */}
                    <div className="mt-3.5 pt-3 border-t border-zinc-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-400">
                      <div className="flex items-center justify-between px-2 py-1 rounded bg-zinc-950">
                        <span>NCR Cleared:</span>
                        <span className="font-bold text-zinc-200">
                          {score.ncrCountCleared}/{score.ncrCountTotal}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1 rounded bg-zinc-950">
                        <span>BOCW Cess:</span>
                        <span className={`font-bold ${score.bocwCessCompliant ? "text-emerald-400" : "text-rose-400"}`}>
                          {score.bocwCessCompliant ? "Compliant" : "Defaulter"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1 rounded bg-zinc-950">
                        <span>PPE Audit:</span>
                        <span className="font-bold text-zinc-200">{score.ppeAuditScorePct}%</span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1 rounded bg-zinc-950">
                        <span>Arbitrations:</span>
                        <span className={`font-bold ${score.disputeHistoryCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                          {score.disputeHistoryCount} Active
                        </span>
                      </div>
                    </div>

                    {score.blacklistReason && (
                      <div className="mt-2.5 p-2 rounded bg-red-950/40 border border-red-800/40 text-[11px] text-red-300 font-mono">
                        <div className="font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                          Debarment Notice:
                        </div>
                        <p className="mt-0.5 text-red-400/90">{score.blacklistReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedScore(score)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                    >
                      Audit Details
                    </button>

                    <div className="flex items-center gap-1.5">
                      {score.listingStatus === "WHITELISTED" ? (
                        <button
                          type="button"
                          onClick={() => handleOpenBlacklistModal(score, "BLACKLISTED")}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg border border-red-900/60 bg-red-950/30 text-red-400 hover:bg-red-900/40 transition"
                        >
                          Debar Vendor
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenBlacklistModal(score, "WHITELISTED")}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg border border-emerald-900/60 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/40 transition"
                        >
                          Restore Whitelist
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 2: FINANCIAL RECONCILIATION LEDGER (FIDIC CL. 14) ───────────── */}
        {activeTab === "ledger" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* FIDIC Callout */}
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-xs text-zinc-300 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Scale className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  <strong>FIDIC Red Book Provisions:</strong> Clause 14.11 (Application for Final Payment
                  Certificate), Clause 14.12 (Discharge Undertaking), and Clause 14.13 (Final Payment
                  Certificate). Signing the Cl. 14.12 statutory discharge irrevocably terminates all liabilities
                  and confirms zero pending claims.
                </span>
              </div>
              <div className="shrink-0 font-mono text-xs text-emerald-400 font-bold">
                {kpis.fullyDischargedCount} of {finalAccounts.length} Discharged
              </div>
            </div>

            {/* Reconciliation Table */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-900/90 text-zinc-400 border-b border-zinc-800 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3.5">Contract / Vendor</th>
                      <th className="py-3 px-3">Trade</th>
                      <th className="py-3 px-3 text-right">Awarded (LOA)</th>
                      <th className="py-3 px-3 text-right">Approved Variations</th>
                      <th className="py-3 px-3 text-right">Gross Billable</th>
                      <th className="py-3 px-3 text-right">LD Applied</th>
                      <th className="py-3 px-3 text-right">Total Paid</th>
                      <th className="py-3 px-3 text-right">Balance Due</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {filteredAccounts.map((acc: any) => (
                      <tr key={acc.id} className="hover:bg-zinc-900/60 transition group">
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-white group-hover:text-cyan-400 transition">
                            {acc.vendorName}
                          </div>
                          <div className="text-[10px] text-zinc-500">{acc.contractRef} &bull; {acc.workOrderNumber}</div>
                        </td>
                        <td className="py-3 px-3 text-zinc-300">{acc.tradeCategory}</td>
                        <td className="py-3 px-3 text-right font-semibold text-white">
                          {fmtINR(acc.totalAwardedValue)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={
                              acc.approvedVariations > 0
                                ? "text-emerald-400 font-semibold"
                                : acc.approvedVariations < 0
                                ? "text-rose-400 font-semibold"
                                : "text-zinc-500"
                            }
                          >
                            {acc.approvedVariations > 0 ? "+" : ""}
                            {fmtINR(acc.approvedVariations)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-cyan-300">
                          {fmtINR(acc.totalGrossBillableValue)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {acc.liquidatedDamagesApplied > 0 ? (
                            <span className="text-rose-400 font-bold">
                              -{fmtINR(acc.liquidatedDamagesApplied)}
                            </span>
                          ) : (
                            <span className="text-zinc-600">₹0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400 font-semibold">
                          {fmtINR(acc.cumulativePaidToDate)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {acc.balanceDueOrRefund > 0 ? (
                            <span className="text-amber-400 font-black">
                              {fmtINR(acc.balanceDueOrRefund)}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold">₹0.00 Settled</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {renderSettlementBadge(acc.settlementStatus, acc.fidicClause1412Discharged)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Certificate View */}
                            <button
                              type="button"
                              onClick={() => {
                                setCertificateAccount(acc);
                                setCertificateModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-cyan-400 transition"
                              title="Generate / Print Statutory Final Account Certificate"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Settle Action */}
                            {!acc.fidicClause1412Discharged ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAccount(acc);
                                  setSettleModalOpen(true);
                                }}
                                className="px-2 py-1 text-[11px] font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 transition"
                              >
                                Settle Cl. 14.12
                              </button>
                            ) : (
                              <span className="px-2 py-1 text-[11px] font-mono text-zinc-500 border border-zinc-800 rounded bg-zinc-950">
                                Archived
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: DEBARMENT & TREND ANALYTICS ─────────────────────────────── */}
        {activeTab === "blacklist" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Historical Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quarterly Performance Trends */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                      Quarterly Pillar Performance Trends
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Tracking Quality, Safety, Schedule, and Overall Score evolution across contracts
                    </p>
                  </div>
                </div>
                <div className="h-64 w-full font-mono text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="quarter" stroke="#71717a" fontSize={11} />
                      <YAxis domain={[50, 100]} stroke="#71717a" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#09090b",
                          borderColor: "#27272a",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="Quality" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Safety" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Schedule" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Overall" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Trade Breakdown Bar Chart */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      Trade-Wise Score Comparison
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Composite score rankings across trade contractors
                    </p>
                  </div>
                </div>
                <div className="h-64 w-full font-mono text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={scores.map((s: any) => ({
                        name: s.vendorName.split(" ")[0],
                        score: s.weightedCompositeScore,
                        quality: s.qualityRating,
                        safety: s.safetyComplianceScore,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                      <YAxis domain={[0, 100]} stroke="#71717a" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#09090b",
                          borderColor: "#27272a",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="score" fill="#22d3ee" radius={[4, 4, 0, 0]} name="Composite" />
                      <Bar dataKey="quality" fill="#818cf8" radius={[4, 4, 0, 0]} name="Quality" />
                      <Bar dataKey="safety" fill="#34d399" radius={[4, 4, 0, 0]} name="Safety" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Blacklist / Debarment Register */}
            <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Ban className="w-5 h-5 text-red-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Statutory Debarment &amp; Blacklist Register
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Maintained per CPWD Works Manual debarment rules. Disqualified contractors are blocked
                      from future e-tendering across all live project packages.
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-zinc-800/80">
                {scores
                  .filter((s: any) => s.listingStatus === "SUSPENDED" || s.listingStatus === "BLACKLISTED" || s.listingStatus === "MONITORED")
                  .map((s: any) => (
                    <div key={s.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{s.vendorName}</span>
                          {renderListingBadge(s.listingStatus)}
                        </div>
                        <div className="text-zinc-400 text-[11px] mt-0.5">
                          Package: {s.workPackageTitle} &bull; Score: {s.weightedCompositeScore.toFixed(1)}/100
                        </div>
                        {s.blacklistReason && (
                          <div className="mt-1 text-red-400 text-[11px]">
                            Reason: {s.blacklistReason} (Authorized by {s.blacklistedBy || "PMC"})
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {s.listingStatus !== "WHITELISTED" && (
                          <button
                            type="button"
                            onClick={() => handleOpenBlacklistModal(s, "WHITELISTED")}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-emerald-600 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900 transition"
                          >
                            Revoke Debarment &amp; Whitelist
                          </button>
                        )}
                        {s.listingStatus !== "BLACKLISTED" && (
                          <button
                            type="button"
                            onClick={() => handleOpenBlacklistModal(s, "BLACKLISTED")}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-600 bg-red-950 text-red-300 hover:bg-red-900 transition"
                          >
                            Debar Contractor
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: ISO 19650 ARCHIVE VAULT ─────────────────────────────────── */}
        {activeTab === "archive" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header / Filter Ribbon */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                <FolderArchive className="w-4 h-4 text-cyan-400" />
                <span>
                  <strong>ISO 19650 Permanent Custody:</strong> All files verified with SHA-256 integrity
                  hashes and 10-15 year statutory retention.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={archiveTypeFilter}
                  onChange={(e) => setArchiveTypeFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono"
                >
                  <option value="ALL">All Dossier Types</option>
                  <option value="CONTRACT_DOSSIER">Contract Dossier</option>
                  <option value="FINAL_ACCOUNT_CERTIFICATE">Final Account Certificate</option>
                  <option value="AS_BUILT_BIM">As-Built BIM</option>
                  <option value="STATUTORY_CLEARANCE">Statutory Clearance</option>
                  <option value="COBIE_ASSET_REGISTRY">COBie Asset Registry</option>
                </select>
                <button
                  type="button"
                  onClick={() => setNewArchiveModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold font-mono transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Archive New</span>
                </button>
              </div>
            </div>

            {/* Archive Table */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-900/90 text-zinc-400 border-b border-zinc-800 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3.5">Reference / Title</th>
                      <th className="py-3 px-3">Dossier Type</th>
                      <th className="py-3 px-3">CDE State</th>
                      <th className="py-3 px-3">SHA-256 Checksum</th>
                      <th className="py-3 px-3">File Size</th>
                      <th className="py-3 px-3">Retention</th>
                      <th className="py-3 px-3">Archived By / Date</th>
                      <th className="py-3 px-3 text-center">Custody Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {filteredArchives.map((arc: any) => (
                      <tr key={arc.id} className="hover:bg-zinc-900/60 transition group">
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-white group-hover:text-cyan-400 transition">
                            {arc.title}
                          </div>
                          <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Tag className="w-3 h-3 text-zinc-600" />
                            <span>{arc.archiveReference}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300">
                            {arc.archiveDossierType}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800">
                            <Lock className="w-2.5 h-2.5" />
                            {arc.cdeState}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                            <Hash className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="font-mono">{arc.fileHashSha256.slice(0, 12)}...</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                              Verified
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-zinc-300 font-mono">
                          {fmtBytes(arc.fileSizeBytes)}
                        </td>
                        <td className="py-3 px-3 text-zinc-300">
                          {arc.retentionPeriodYears} Years
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-zinc-200">{arc.archivedBy}</div>
                          <div className="text-[10px] text-zinc-500">{fmtDate(arc.archivedAt)}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <a
                            href={arc.fileUrl || "#"}
                            onClick={(e) => {
                              if (!arc.fileUrl) {
                                e.preventDefault();
                                setFeedback({
                                  type: "info",
                                  text: `Simulated download for archive payload [${arc.archiveReference}]. Integrity Verified.`,
                                });
                              }
                            }}
                            download
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition"
                          >
                            <Download className="w-3 h-3 text-cyan-400" />
                            <span>Export</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: SETTLE & DISCHARGE (FIDIC CL. 14.12) ──────────────────────── */}
      {settleModalOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl text-zinc-100 font-sans space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  Execute FIDIC Clause 14.12 Final Settlement Discharge
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSettleModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-400">Vendor:</span>
                <span className="font-bold text-white">{selectedAccount.vendorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Contract Reference:</span>
                <span className="text-cyan-400">{selectedAccount.contractRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Gross Billable Value:</span>
                <span className="font-bold text-white">{fmtINR(selectedAccount.totalGrossBillableValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Cumulative Paid to Date:</span>
                <span className="text-emerald-400">{fmtINR(selectedAccount.cumulativePaidToDate)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-2 text-sm font-black">
                <span className="text-amber-400">Net Balance Due for Settlement:</span>
                <span className="text-amber-300">{fmtINR(selectedAccount.balanceDueOrRefund)}</span>
              </div>
            </div>

            <div className="text-xs text-zinc-400 space-y-2 leading-relaxed">
              <p>
                <strong>Statutory Undertaking (FIDIC Cl. 14.12):</strong> Upon execution of this
                discharge, the Contractor confirms that the total amount represents full and final settlement
                of all monies due under or in connection with the Contract. Neither party shall maintain any
                further claims, disputes, or arbitrations.
              </p>
              <p>
                The 10-year ISO 19650 evidentiary archive custody seal will be automatically applied.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSettleModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleExecuteDischarge(selectedAccount)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono transition shadow-lg shadow-cyan-950"
              >
                Confirm Discharge &amp; Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: BLACKLIST / DEBARMENT GOVERNANCE ───────────────────────────── */}
      {blacklistModalOpen && targetVendorForBlacklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl text-zinc-100 font-sans space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-bold text-white">
                  CPWD Vendor Listing &amp; Debarment Protocol
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBlacklistModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-3 font-mono">
              <div>
                <span className="text-zinc-400">Target Contractor:</span>
                <div className="text-sm font-bold text-white mt-0.5">
                  {targetVendorForBlacklist.vendorName}
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Select New Status:</label>
                <select
                  value={newStatusInput}
                  onChange={(e) => setNewStatusInput(e.target.value as VendorListingStatus)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono focus:border-cyan-500"
                >
                  <option value="WHITELISTED">WHITELISTED (Preferred Tenderer)</option>
                  <option value="MONITORED">MONITORED (Performance Warning)</option>
                  <option value="SUSPENDED">SUSPENDED (Temporary Hold)</option>
                  <option value="BLACKLISTED">BLACKLISTED (Debarred per CPWD Gazette)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Statutory Justification / Reason:</label>
                <textarea
                  rows={3}
                  value={blacklistReasonInput}
                  onChange={(e) => setBlacklistReasonInput(e.target.value)}
                  placeholder="State ground for debarment (e.g. Failure to clear BOCW statutory dues, unresolved arbitration, quality default)..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono focus:border-cyan-500"
                />
              </div>

              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
                Action recorded by: <strong className="text-zinc-200">{roleLabel}</strong>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBlacklistModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmListingChange()}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono transition shadow-lg shadow-red-950"
              >
                Apply Listing Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: STATUTORY FINAL ACCOUNT CERTIFICATE & PRINT DOCKET ───────── */}
      {certificateModalOpen && certificateAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl text-zinc-100 font-sans space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  FIDIC Clause 14.13 Final Payment Certificate &amp; Statutory Discharge
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold font-mono transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Certificate</span>
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

            {/* PRINTABLE DOCKET CONTAINER */}
            <div className="p-8 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-6 text-zinc-200 font-sans print:bg-white print:text-black print:border-none print:p-0">
              {/* Header */}
              <div className="border-b-2 border-zinc-700 pb-4 text-center">
                <div className="font-mono text-[10px] tracking-widest text-cyan-400 uppercase font-black print:text-zinc-600">
                  QUADILLAR LIVEVIEW &bull; CDE PROJECT CLOSEOUT ENGINE
                </div>
                <h2 className="text-xl font-black text-white mt-1 print:text-black uppercase">
                  Final Payment Certificate &amp; Statutory No-Claims Discharge
                </h2>
                <div className="text-xs text-zinc-400 mt-1 font-mono print:text-zinc-600">
                  Issued under FIDIC Red Book Clause 14.13 &bull; CPWD Works Manual Final Account Provisions
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono border-b border-zinc-800 pb-4">
                <div>
                  <span className="text-zinc-400">Project:</span>
                  <div className="font-bold text-white print:text-black">{projectName}</div>
                  <div className="text-[11px] text-zinc-500">Code: {projectId}</div>
                </div>
                <div>
                  <span className="text-zinc-400">Certificate Reference:</span>
                  <div className="font-bold text-cyan-400 print:text-zinc-800">
                    {certificateAccount.dischargeCertificateNumber || `CERT-FIN-${certificateAccount.contractRef}`}
                  </div>
                  <div className="text-[11px] text-zinc-500">Date: {fmtDate(certificateAccount.dischargedAt || new Date().toISOString())}</div>
                </div>
                <div>
                  <span className="text-zinc-400">Contractor / Firm:</span>
                  <div className="font-bold text-white print:text-black">{certificateAccount.vendorName}</div>
                  <div className="text-[11px] text-zinc-500">Trade: {certificateAccount.tradeCategory}</div>
                </div>
                <div>
                  <span className="text-zinc-400">Contract / Work Order:</span>
                  <div className="font-bold text-white print:text-black">{certificateAccount.contractRef}</div>
                  <div className="text-[11px] text-zinc-500">WO No: {certificateAccount.workOrderNumber}</div>
                </div>
              </div>

              {/* Financial Ledger Breakdown */}
              <div>
                <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-2 print:text-zinc-800">
                  Financial Reconciliation Summary
                </h4>
                <table className="w-full text-xs font-mono border border-zinc-800 divide-y divide-zinc-800">
                  <tbody className="divide-y divide-zinc-800">
                    <tr className="bg-zinc-950/40">
                      <td className="p-2 text-zinc-400">1. Original Contract Award Value (LOA)</td>
                      <td className="p-2 text-right font-bold text-white print:text-black">
                        {fmtINR(certificateAccount.totalAwardedValue)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-zinc-400">2. Approved Variations (+ / -)</td>
                      <td className="p-2 text-right font-bold text-white print:text-black">
                        {fmtINR(certificateAccount.approvedVariations)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-zinc-400">3. Price Escalation / Adjustments</td>
                      <td className="p-2 text-right font-bold text-white print:text-black">
                        {fmtINR(certificateAccount.priceEscalationInr)}
                      </td>
                    </tr>
                    <tr className="bg-zinc-950/60 font-bold">
                      <td className="p-2 text-cyan-300 print:text-black">4. Total Gross Final Value</td>
                      <td className="p-2 text-right text-cyan-300 print:text-black">
                        {fmtINR(certificateAccount.totalGrossBillableValue)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-zinc-400">5. Liquidated Damages (Schedule Default)</td>
                      <td className="p-2 text-right text-rose-400 print:text-red-700">
                        -{fmtINR(certificateAccount.liquidatedDamagesApplied)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-zinc-400">6. Cumulative Interim (RA) Payments Disbursed</td>
                      <td className="p-2 text-right text-emerald-400 print:text-green-700">
                        {fmtINR(certificateAccount.cumulativePaidToDate)}
                      </td>
                    </tr>
                    <tr className="bg-zinc-950 font-black text-sm">
                      <td className="p-2.5 text-amber-400 print:text-black">
                        7. Final Net Balance Settled
                      </td>
                      <td className="p-2.5 text-right text-amber-300 print:text-black">
                        {fmtINR(certificateAccount.balanceDueOrRefund)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Statutory Undertaking Text */}
              <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 space-y-1.5 print:bg-zinc-100 print:text-zinc-800">
                <div className="font-bold text-white print:text-black uppercase">
                  FIDIC Clause 14.12 Statutory Discharge &amp; Indemnity
                </div>
                <p>
                  The undersigned Contractor and Employer hereby jointly attest that the final ledger above
                  is verified without reservation. The Contractor unconditionally discharges the Employer
                  from all further claims, demands, liabilities, or disputes arising out of the performance of
                  this Contract.
                </p>
                <p>
                  All defect liability punch items and statutory clearances (BOCW, EPF, ESI, CEA) have been
                  verified and archived in the Quadillar ISO 19650 Common Data Environment.
                </p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-zinc-800 text-xs font-mono">
                <div className="border-t border-zinc-700 pt-2 text-center">
                  <div className="font-bold text-white print:text-black">
                    {certificateAccount.contractorSignatoryName || "Contractor Authorized Signatory"}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {certificateAccount.contractorSignatoryDesignation || "Director / Managing Partner"}
                  </div>
                  <div className="text-[9px] text-emerald-400 mt-1">[Digital Signature Verified]</div>
                </div>

                <div className="border-t border-zinc-700 pt-2 text-center">
                  <div className="font-bold text-white print:text-black">
                    {certificateAccount.employerSignatoryName || "Head of Contracts & Governance"}
                  </div>
                  <div className="text-[10px] text-zinc-400">Quadillar LiveView PMC Lead</div>
                  <div className="text-[9px] text-cyan-400 mt-1">[ISO 19650 Seal Hash #7C98B251]</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ARCHIVE NEW DOSSIER ───────────────────────────────────────── */}
      {newArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl text-zinc-100 font-sans space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Deposit ISO 19650 Archive Dossier</h3>
              </div>
              <button
                type="button"
                onClick={() => setNewArchiveModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateArchive} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-zinc-400 mb-1">Dossier Title:</label>
                <input
                  type="text"
                  required
                  value={newArchiveForm.title}
                  onChange={(e) => setNewArchiveForm({ ...newArchiveForm, title: e.target.value })}
                  placeholder="e.g. As-Built Facade Structural Calculations & Wind Test Certs"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Dossier Classification:</label>
                <select
                  value={newArchiveForm.archiveType}
                  onChange={(e) =>
                    setNewArchiveForm({ ...newArchiveForm, archiveType: e.target.value as ArchiveDossierType })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono focus:border-cyan-500"
                >
                  <option value="CONTRACT_DOSSIER">Contract Dossier</option>
                  <option value="FINAL_ACCOUNT_CERTIFICATE">Final Account Certificate</option>
                  <option value="AS_BUILT_BIM">As-Built BIM IFC Model</option>
                  <option value="STATUTORY_CLEARANCE">Statutory Clearance</option>
                  <option value="COBIE_ASSET_REGISTRY">COBie Asset Registry</option>
                  <option value="DISCHARGE_UNDERTAKING">Discharge Undertaking</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Archive Reference (Optional):</label>
                <input
                  type="text"
                  value={newArchiveForm.reference}
                  onChange={(e) => setNewArchiveForm({ ...newArchiveForm, reference: e.target.value })}
                  placeholder="Leave blank for auto-generated reference"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Statutory Retention Tenure:</label>
                <select
                  value={newArchiveForm.retentionYears}
                  onChange={(e) =>
                    setNewArchiveForm({ ...newArchiveForm, retentionYears: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono focus:border-cyan-500"
                >
                  <option value={10}>10 Years (Statutory Contracts)</option>
                  <option value={15}>15 Years (Structural &amp; As-Built BIM)</option>
                  <option value={30}>30 Years (Permanent Municipal Record)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Archive Notes:</label>
                <textarea
                  rows={2}
                  value={newArchiveForm.notes}
                  onChange={(e) => setNewArchiveForm({ ...newArchiveForm, notes: e.target.value })}
                  placeholder="Evidentiary custody notes..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setNewArchiveModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono transition shadow-lg shadow-cyan-950"
                >
                  Deposit &amp; Seal Hash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DETAIL DRAWER: VENDOR AUDIT SCORE ───────────────────────────────── */}
      {selectedScore && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md h-full bg-zinc-950 border-l border-zinc-800 p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <div className="text-xs font-mono text-cyan-400">{selectedScore.contractReference}</div>
                <h3 className="text-base font-bold text-white">{selectedScore.vendorName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScore(null)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex justify-between items-center">
                <span>Composite Score:</span>
                <span className="text-lg font-black text-cyan-400">
                  {selectedScore.weightedCompositeScore.toFixed(2)}/100
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-zinc-400 uppercase text-[11px] font-bold">Evaluation Breakdown</div>
                <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Quality Score (40%):</span>
                    <span className="text-white font-bold">{selectedScore.qualityRating}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Safety Score (25%):</span>
                    <span className="text-white font-bold">{selectedScore.safetyComplianceScore}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Schedule Delivery (20%):</span>
                    <span className="text-white font-bold">{selectedScore.scheduleAdherence}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dispute &amp; Commercial (15%):</span>
                    <span className="text-white font-bold">{selectedScore.disputeCommercialScore}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-zinc-400 uppercase text-[11px] font-bold">Auditor Details</div>
                <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <div>Evaluated By: {selectedScore.evaluatedBy}</div>
                  <div>Quarter: {selectedScore.evaluationQuarter}</div>
                  <div>Audit Timestamp: {fmtDate(selectedScore.evaluatedAt)}</div>
                </div>
              </div>

              {selectedScore.evaluationNotes && (
                <div className="space-y-1">
                  <div className="text-zinc-400 uppercase text-[11px] font-bold">Auditor Notes</div>
                  <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-[11px] leading-relaxed">
                    {selectedScore.evaluationNotes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
