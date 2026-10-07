"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  Award,
  BadgeCheck,
  Box,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Compass,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileCode2,
  FileLock2,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  FolderArchive,
  HardHat,
  Hash,
  Info,
  Layers,
  LayoutDashboard,
  Lock,
  MinusCircle,
  PhoneCall,
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
  Tag,
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
  fetchAsBuiltDrawings,
  fetchOmManualRegistry,
  fetchHandoverChecklist,
  uploadAsBuiltDrawing,
  updateDrawingApprovalStatus,
  verifyHandoverChecklistItem,
  registerOmManual,
  fallbackAsBuiltDrawings,
  fallbackOmManualRegistry,
  fallbackDigitalHandoverChecklist,
} from "@/app/lib/services";
import type {
  AsBuiltDrawing,
  OmManualRegistry,
  DigitalHandoverChecklistItem,
  AsBuiltDiscipline,
  DrawingApprovalStatus,
  EquipmentWarrantyStatus,
  HandoverComplianceStatus,
} from "@/types/construction";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES & FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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

function getDaysRemaining(dateStr: string): number {
  if (!dateStr) return 0;
  const target = new Date(dateStr).getTime();
  const now = new Date().getTime();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AsBuiltVaultPage() {
  const { role } = useActiveRole();
  const [projectId, setProjectId] = useState<string>("GOMTI-NAGAR-PH1-FITOUT");
  const [drawings, setDrawings] = useState<AsBuiltDrawing[]>(fallbackAsBuiltDrawings);
  const [omManuals, setOmManuals] = useState<OmManualRegistry[]>(fallbackOmManualRegistry);
  const [checklists, setChecklists] = useState<DigitalHandoverChecklistItem[]>(fallbackDigitalHandoverChecklist);

  const [activeTab, setActiveTab] = useState<"drawings" | "om-manuals" | "compliance" | "analytics">("drawings");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedDrawing, setSelectedDrawing] = useState<AsBuiltDrawing | null>(null);
  const [selectedOmManual, setSelectedOmManual] = useState<OmManualRegistry | null>(null);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showRegisterOmModal, setShowRegisterOmModal] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Upload Form States
  const [newDwgNumber, setNewDwgNumber] = useState<string>("");
  const [newSheetTitle, setNewSheetTitle] = useState<string>("");
  const [newDiscipline, setNewDiscipline] = useState<AsBuiltDiscipline>("STRUCTURAL");
  const [newRevision, setNewRevision] = useState<string>("R1");
  const [newCadUrl, setNewCadUrl] = useState<string>("");
  const [newBimUrl, setNewBimUrl] = useState<string>("");
  const [newPdfUrl, setNewPdfUrl] = useState<string>("");

  // O&M Register Form States
  const [newEqTag, setNewEqTag] = useState<string>("");
  const [newEqName, setNewEqName] = useState<string>("");
  const [newCategory, setNewCategory] = useState<string>("");
  const [newManufacturer, setNewManufacturer] = useState<string>("");
  const [newMakeModel, setNewMakeModel] = useState<string>("");
  const [newLocation, setNewLocation] = useState<string>("");
  const [newWarrantyExpiry, setNewWarrantyExpiry] = useState<string>("");
  const [newSlaHours, setNewSlaHours] = useState<number>(24);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dData, oData, cData] = await Promise.all([
        fetchAsBuiltDrawings(projectId),
        fetchOmManualRegistry(projectId),
        fetchHandoverChecklist(projectId),
      ]);
      setDrawings(dData);
      setOmManuals(oData);
      setChecklists(cData);
      if (dData.length > 0 && !selectedDrawing) setSelectedDrawing(dData[0]);
      if (oData.length > 0 && !selectedOmManual) setSelectedOmManual(oData[0]);
    } catch (err) {
      console.warn("Error loading as-built data:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedDrawing, selectedOmManual]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Drawings
  const filteredDrawings = useMemo(() => {
    return drawings.filter((d) => {
      const matchesSearch =
        d.drawingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.sheetTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesDisc = disciplineFilter === "ALL" || d.discipline === disciplineFilter;
      const matchesStatus = statusFilter === "ALL" || d.consultantApprovalStatus === statusFilter;
      return matchesSearch && matchesDisc && matchesStatus;
    });
  }, [drawings, searchQuery, disciplineFilter, statusFilter]);

  // Filtered O&M Manuals
  const filteredOmManuals = useMemo(() => {
    return omManuals.filter((o) => {
      const matchesSearch =
        o.equipmentTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.manufacturer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || o.warrantyStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [omManuals, searchQuery, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const totalDrawings = drawings.length;
    const approvedDrawings = drawings.filter((d) => d.consultantApprovalStatus === "APPROVED").length;
    const approvalRate = totalDrawings > 0 ? Math.round((approvedDrawings / totalDrawings) * 100) : 100;

    const totalAssets = omManuals.length;
    const expiringSoon = omManuals.filter(
      (o) => o.warrantyStatus === "EXPIRING_SOON" || getDaysRemaining(o.warrantyExpirationDate) <= 90
    ).length;

    const totalChecklist = checklists.length;
    const handedOverChecklist = checklists.filter((c) => c.status === "HANDED_OVER").length;
    const handoverProgress = totalChecklist > 0 ? Math.round((handedOverChecklist / totalChecklist) * 100) : 0;

    return {
      totalDrawings,
      approvedDrawings,
      approvalRate,
      totalAssets,
      expiringSoon,
      totalChecklist,
      handedOverChecklist,
      handoverProgress,
    };
  }, [drawings, omManuals, checklists]);

  // Handlers
  const handleUploadDrawing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDwgNumber || !newSheetTitle) {
      showToast("Please enter a valid drawing number and sheet title.");
      return;
    }
    setLoading(true);
    try {
      const ok = await uploadAsBuiltDrawing({
        projectId,
        drawingNumber: newDwgNumber,
        sheetTitle: newSheetTitle,
        discipline: newDiscipline,
        revisionNumber: newRevision || "R0",
        cdeContainer: `CDE/As-Built/${newDiscipline}`,
        iso19650State: "Published",
        cadDwgUrl: newCadUrl || `/vault/drawings/${newDwgNumber}.dwg`,
        bimModelUrl: newBimUrl || null,
        pdfDrawingUrl: newPdfUrl || `/vault/pdf/${newDwgNumber}.pdf`,
        consultantApprovalStatus: "SUBMITTED",
        tags: ["As-Built", newDiscipline, "Vault Ingested"],
      });
      if (ok) {
        showToast(`As-Built Drawing ${newDwgNumber} uploaded to CDE Vault.`);
        setShowUploadModal(false);
        setNewDwgNumber("");
        setNewSheetTitle("");
        await loadData();
      }
    } catch (err) {
      console.error(err);
      showToast("Error uploading as-built drawing.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterOmManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEqTag || !newEqName) {
      showToast("Please enter equipment tag and name.");
      return;
    }
    setLoading(true);
    try {
      const expiry = newWarrantyExpiry || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
      const ok = await registerOmManual({
        projectId,
        equipmentTag: newEqTag,
        equipmentName: newEqName,
        discipline: newDiscipline,
        assetCategory: newCategory || "Plant Machinery",
        manufacturer: newManufacturer || "OEM Supplier",
        makeModel: newMakeModel || "Standard Model",
        installationLocation: newLocation || "Ground Floor Plant Room",
        warrantyStartDate: new Date().toISOString().slice(0, 10),
        warrantyExpirationDate: expiry,
        warrantyPeriodMonths: 12,
        warrantyStatus: "ACTIVE",
        slaResponseTimeHours: newSlaHours || 24,
      });
      if (ok) {
        showToast(`O&M Equipment ${newEqTag} registered successfully.`);
        setShowRegisterOmModal(false);
        setNewEqTag("");
        setNewEqName("");
        await loadData();
      }
    } catch (err) {
      console.error(err);
      showToast("Error registering O&M manual.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDrawing = async (drawingId: string) => {
    setLoading(true);
    try {
      const auditor = role ? `${role} (Lead Consultant)` : "M/s Tata Consulting Engineers (Structural Auditor)";
      const ok = await updateDrawingApprovalStatus(
        drawingId,
        "APPROVED",
        auditor,
        "Verified against site as-built conditions and NDT test reports."
      );
      if (ok) {
        showToast("As-built drawing approved and stamped for final handover.");
        await loadData();
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to approve drawing.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyChecklistItem = async (itemId: string) => {
    setLoading(true);
    try {
      const pmcEng = role ? `${role} (Resident Engineer)` : "Er. Rajesh Tiwari (Resident Engineer)";
      const ok = await verifyHandoverChecklistItem(
        itemId,
        pmcEng,
        "Er. Mahendra Pratap (Client FM Lead)",
        "HANDED_OVER"
      );
      if (ok) {
        showToast("Handover deliverable verified and accepted by Client FM.");
        await loadData();
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to verify checklist deliverable.");
    } finally {
      setLoading(false);
    }
  };

  // Status helper badges
  const getApprovalBadge = (status: DrawingApprovalStatus) => {
    switch (status) {
      case "APPROVED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>;
      case "SUBMITTED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800"><Clock className="w-3.5 h-3.5" /> Under Review</span>;
      case "REJECTED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800"><AlertCircle className="w-3.5 h-3.5" /> Rejected</span>;
      case "REVISED":
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">Revised</span>;
    }
  };

  const getWarrantyBadge = (status: EquipmentWarrantyStatus, daysLeft: number) => {
    if (status === "EXPIRING_SOON" || (daysLeft > 0 && daysLeft <= 90)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" /> Expiring Soon ({daysLeft}d)
        </span>
      );
    }
    if (status === "EXPIRED" || daysLeft <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800">
          <MinusCircle className="w-3.5 h-3.5" /> Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
        <CheckCircle2 className="w-3.5 h-3.5" /> Active ({daysLeft}d)
      </span>
    );
  };

  // Chart data
  const disciplineChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    drawings.forEach((d) => {
      counts[d.discipline] = (counts[d.discipline] || 0) + 1;
    });
    return Object.entries(counts).map(([disc, count]) => ({
      name: disc,
      drawings: count,
    }));
  }, [drawings]);

  const warrantyPieData = useMemo(() => {
    const active = omManuals.filter((o) => getDaysRemaining(o.warrantyExpirationDate) > 90).length;
    const soon = omManuals.filter((o) => {
      const d = getDaysRemaining(o.warrantyExpirationDate);
      return d > 0 && d <= 90;
    }).length;
    const expired = omManuals.filter((o) => getDaysRemaining(o.warrantyExpirationDate) <= 0).length;

    return [
      { name: "Active Guarantee", value: active, color: "#10b981" },
      { name: "Expiring < 90 Days", value: soon, color: "#f59e0b" },
      { name: "Expired / AMC Required", value: expired, color: "#ef4444" },
    ].filter((d) => d.value > 0);
  }, [omManuals]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6 lg:p-8 font-sans">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900/90 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 text-sm animate-in fade-in slide-in-from-bottom-5">
          <BadgeCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" /> CPWD Works Manual Section 32
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-400 border border-blue-800">
              <Award className="w-3.5 h-3.5" /> FIDIC Red Book Clause 10.1
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-400 border border-purple-800">
              <FolderArchive className="w-3.5 h-3.5" /> ISO 19650-2 CDE Vault
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            As-Built Drawing Repository &amp; Digital O&amp;M Manual Vault
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Permanent ISO 19650 CDE asset archive, consultant approval stamp ledger, and manufacturer warranty tracking for Client FM handover.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
          >
            <option value="GOMTI-NAGAR-PH1-FITOUT">Gomti Nagar Commercial Hub (Active Scope)</option>
            
          </select>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 font-medium transition"
            title="Sync Vault"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/50 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload As-Built Drawing
          </button>

          <button
            onClick={() => setShowRegisterOmModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-950/50 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Register O&amp;M Asset
          </button>
        </div>
      </div>

      {/* Navigation Ribbon for Closeout Suite */}
      <div className="flex flex-wrap items-center gap-2 my-4 text-xs text-zinc-400 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
        <span className="font-semibold text-zinc-300">Closeout Modules:</span>
        <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30 flex items-center gap-1">
          <FileCheck2 className="w-3.5 h-3.5 text-blue-400" /> As-Built & O&amp;M Vault
        </span>
        <span className="text-zinc-600">•</span>
        <Link
          href="/closeout/escrow-reserve"
          className="px-2.5 py-1 rounded-lg hover:bg-zinc-800 hover:text-white transition flex items-center gap-1"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400" /> Escrow &amp; Warranty Reserve
        </Link>
        <span className="text-zinc-600">•</span>
        <Link
          href="/closeout/subcontractor-settlement"
          className="px-2.5 py-1 rounded-lg hover:bg-zinc-800 hover:text-white transition flex items-center gap-1"
        >
          <Receipt className="w-3.5 h-3.5 text-purple-400" /> Subcontractor Settlements
        </Link>
        <span className="text-zinc-600">•</span>
        <Link
          href="/closeout/client-ledger"
          className="px-2.5 py-1 rounded-lg hover:bg-zinc-800 hover:text-white transition flex items-center gap-1"
        >
          <Wallet className="w-3.5 h-3.5 text-amber-400" /> Client Closeout Ledger
        </Link>
        <span className="text-zinc-600">•</span>
        <Link
          href="/closeout/vendor-archive"
          className="px-2.5 py-1 rounded-lg hover:bg-zinc-800 hover:text-white transition flex items-center gap-1"
        >
          <Users className="w-3.5 h-3.5 text-emerald-400" /> Vendor Rating &amp; Final Archive
        </Link>
        <span className="text-zinc-600">•</span>
        <Link
          href="/closeout/audit-vault"
          className="px-2.5 py-1 rounded-lg hover:bg-zinc-800 hover:text-white transition flex items-center gap-1"
        >
          <FileLock2 className="w-3.5 h-3.5 text-cyan-400" /> Audit Trail &amp; Statutory Vault
        </Link>
        <span className="text-zinc-600">•</span>
        <Link
          href="/closeout/command-center"
          className="px-2.5 py-1 rounded-lg hover:bg-zinc-800 hover:text-white transition flex items-center gap-1"
        >
          <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" /> Command Center
        </Link>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 my-6">
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
            <span>As-Built Drawing Sheets</span>
            <FileCode2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white">{metrics.totalDrawings} Sheets</div>
          <div className="text-[11px] text-zinc-500 mt-1">CAD (.dwg), BIM (.ifc), PDF</div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
            <span>Consultant Approved Rate</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-blue-300">{metrics.approvalRate}%</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            {metrics.approvedDrawings} of {metrics.totalDrawings} verified
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
            <span>Active O&amp;M Assets</span>
            <Wrench className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-indigo-300">{metrics.totalAssets} Units</div>
          <div className="text-[11px] text-zinc-500 mt-1">Operating manual &amp; spares vault</div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
            <span>Warranties Expiring &lt; 90d</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-300">{metrics.expiringSoon} Alerts</div>
          <div className="text-[11px] text-amber-400/90 mt-1">Preventative AMC required</div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
            <span>Client FM Handover</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-300">{metrics.handoverProgress}%</div>
          <div className="text-[11px] text-zinc-400 mt-1">
            {metrics.handedOverChecklist} of {metrics.totalChecklist} statutory deliverables
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-800 mb-6 overflow-x-auto gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("drawings")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === "drawings"
                ? "border-emerald-500 text-emerald-400 bg-emerald-950/20"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            As-Built Drawing Repository ({filteredDrawings.length})
          </button>

          <button
            onClick={() => setActiveTab("om-manuals")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === "om-manuals"
                ? "border-blue-500 text-blue-400 bg-blue-950/20"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Wrench className="w-4 h-4" />
            O&amp;M Manuals &amp; Warranties ({filteredOmManuals.length})
          </button>

          <button
            onClick={() => setActiveTab("compliance")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === "compliance"
                ? "border-purple-500 text-purple-400 bg-purple-950/20"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Digital Handover Checklist ({checklists.length})
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === "analytics"
                ? "border-amber-500 text-amber-400 bg-amber-950/20"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            Vault Distribution Charts
          </button>
        </div>

        {/* Quick links to sister modules */}
        <div className="flex items-center gap-2 text-xs text-zinc-400 pr-2">
          <span className="hidden xl:inline text-zinc-500">Related Closeout:</span>
          <Link
            href="/closeout/subcontractor-settlement"
            className="hover:text-emerald-400 flex items-center gap-1 transition px-2 py-1 rounded bg-zinc-900 border border-zinc-800"
          >
            Subcontractor Settlement <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/closeout/client-ledger"
            className="hover:text-emerald-400 flex items-center gap-1 transition px-2 py-1 rounded bg-zinc-900 border border-zinc-800"
          >
            Client Ledger <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      {(activeTab === "drawings" || activeTab === "om-manuals") && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search drawings, tags, equipment or OEM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {activeTab === "drawings" && (
              <>
                <select
                  value={disciplineFilter}
                  onChange={(e) => setDisciplineFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Disciplines</option>
                  <option value="STRUCTURAL">Structural</option>
                  <option value="ARCHITECTURAL">Architectural</option>
                  <option value="MEP">MEP</option>
                  <option value="HVAC">HVAC</option>
                  <option value="FIRE_SAFETY">Fire Safety</option>
                  <option value="INFRASTRUCTURE">Infrastructure</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Approval Statuses</option>
                  <option value="APPROVED">Approved</option>
                  <option value="SUBMITTED">Under Review</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </>
            )}

            {activeTab === "om-manuals" && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Warranty Statuses</option>
                <option value="ACTIVE">Active Guarantee</option>
                <option value="EXPIRING_SOON">Expiring Soon (&lt;90 Days)</option>
                <option value="EXPIRED">Expired</option>
              </select>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: AS-BUILT DRAWING REPOSITORY */}
      {activeTab === "drawings" && (
        <div className="space-y-4">
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-emerald-400" />
                  As-Built Drawings &amp; BIM Models Repository
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  ISO 19650 compliant container records verified by third-party structural &amp; MEP auditors.
                </p>
              </div>
              <span className="text-xs text-zinc-500 font-mono">
                {filteredDrawings.length} sheets listed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Drawing Number &amp; Title</th>
                    <th className="py-3 px-4">Discipline</th>
                    <th className="py-3 px-4">Revision / CDE Container</th>
                    <th className="py-3 px-4">Download Assets</th>
                    <th className="py-3 px-4 text-center">Consultant Status</th>
                    <th className="py-3 px-4 text-center">Client FM Acceptance</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {filteredDrawings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-500">
                        No as-built drawings match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredDrawings.map((d) => (
                      <tr key={d.id} className="hover:bg-zinc-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white font-mono">{d.drawingNumber}</div>
                          <div className="text-zinc-300 font-sans mt-0.5">{d.sheetTitle}</div>
                          <div className="flex gap-1.5 mt-1">
                            {d.tags.map((t, idx) => (
                              <span key={idx} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                                #{t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono text-[11px]">
                            {d.discipline}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-400">
                          <div className="text-zinc-200 font-semibold">{d.revisionNumber}</div>
                          <div className="text-[11px] text-zinc-500">{d.cdeContainer}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {d.cadDwgUrl && (
                              <a
                                href={d.cadDwgUrl}
                                download
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono flex items-center gap-1 transition"
                                title="AutoCAD DWG"
                              >
                                <Download className="w-3 h-3 text-blue-400" /> DWG
                              </a>
                            )}
                            {d.bimModelUrl && (
                              <a
                                href={d.bimModelUrl}
                                download
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono flex items-center gap-1 transition"
                                title="BIM IFC Model"
                              >
                                <Box className="w-3 h-3 text-purple-400" /> IFC
                              </a>
                            )}
                            {d.pdfDrawingUrl && (
                              <a
                                href={d.pdfDrawingUrl}
                                download
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono flex items-center gap-1 transition"
                                title="PDF Drawing Sheet"
                              >
                                <FileText className="w-3 h-3 text-rose-400" /> PDF
                              </a>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-1 font-mono">{fmtBytes(d.fileSizeBytes)}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {getApprovalBadge(d.consultantApprovalStatus)}
                          {d.consultantName && (
                            <div className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-[140px] mx-auto">
                              {d.consultantName}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {d.clientFmAccepted ? (
                            <span className="text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-xs italic">Pending Handover</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedDrawing(d);
                                setShowPreviewModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
                              title="Inspect Drawing Metadata"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {d.consultantApprovalStatus !== "APPROVED" && (
                              <button
                                onClick={() => handleApproveDrawing(d.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition"
                              >
                                Stamp Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: O&M MANUALS & WARRANTY MATRIX */}
      {activeTab === "om-manuals" && (
        <div className="space-y-4">
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-indigo-400" />
                  Plant, Machinery &amp; Equipment O&amp;M Registry
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Manufacturer warranty tracking, preventative servicing schedules, and 24x7 emergency SLA hotlines.
                </p>
              </div>
              <span className="text-xs text-zinc-500 font-mono">
                {filteredOmManuals.length} equipment assets registered
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Equipment Tag &amp; Name</th>
                    <th className="py-3 px-4">Manufacturer / Make</th>
                    <th className="py-3 px-4">Installation Room</th>
                    <th className="py-3 px-4">Warranty Period</th>
                    <th className="py-3 px-4 text-center">Warranty Status</th>
                    <th className="py-3 px-4">Documentation</th>
                    <th className="py-3 px-4 text-right">Service Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {filteredOmManuals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-500">
                        No equipment assets found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOmManuals.map((o) => {
                      const daysLeft = getDaysRemaining(o.warrantyExpirationDate);
                      return (
                        <tr key={o.id} className="hover:bg-zinc-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white font-mono">{o.equipmentTag}</div>
                            <div className="text-zinc-300 font-sans mt-0.5">{o.equipmentName}</div>
                            <div className="text-[11px] text-zinc-500 font-mono">SN: {o.serialNumber || "N/A"}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-zinc-200">{o.manufacturer}</div>
                            <div className="text-[11px] text-indigo-400 font-mono">{o.makeModel}</div>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-400">
                            {o.installationLocation}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-zinc-300">
                            <div>From: {fmtDate(o.warrantyStartDate)}</div>
                            <div>Exp: {fmtDate(o.warrantyExpirationDate)}</div>
                            <div className="text-[10px] text-zinc-500">({o.warrantyPeriodMonths} Months)</div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {getWarrantyBadge(o.warrantyStatus, daysLeft)}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              {o.operationGuideUrl && (
                                <a
                                  href={o.operationGuideUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] flex items-center gap-1 transition"
                                >
                                  <FileText className="w-3 h-3 text-blue-400" /> User Guide
                                </a>
                              )}
                              {o.maintenanceManualUrl && (
                                <a
                                  href={o.maintenanceManualUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] flex items-center gap-1 transition"
                                >
                                  <Wrench className="w-3 h-3 text-amber-400" /> SOP
                                </a>
                              )}
                              {o.warrantyCertificateUrl && (
                                <a
                                  href={o.warrantyCertificateUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] flex items-center gap-1 transition"
                                >
                                  <Award className="w-3 h-3 text-emerald-400" /> Bond
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="text-zinc-300 font-mono text-xs flex items-center justify-end gap-1">
                              <PhoneCall className="w-3 h-3 text-indigo-400" />
                              <span>{o.warrantyProviderContact || "Toll-Free OEM"}</span>
                            </div>
                            <div className="text-[10px] text-zinc-500">SLA: {o.slaResponseTimeHours}h Response</div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DIGITAL HANDOVER COMPLIANCE CHECKLIST */}
      {activeTab === "compliance" && (
        <div className="space-y-4">
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-zinc-800 pb-4 mb-5">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-purple-400" />
                  Statutory Completion &amp; Taking-Over Deliverables Checklist
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  CPWD Works Manual Section 32 &amp; FIDIC Red Book Clause 10.1 facility acceptance ledger.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded bg-purple-950/80 text-purple-300 border border-purple-800 font-mono">
                  {metrics.handedOverChecklist} of {metrics.totalChecklist} Handed Over ({metrics.handoverProgress}%)
                </span>
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-3">
              {checklists.map((item) => {
                const isHandedOver = item.status === "HANDED_OVER";
                const isVerified = item.status === "VERIFIED";

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition ${
                      isHandedOver
                        ? "bg-zinc-900/90 border-emerald-800/40"
                        : isVerified
                        ? "bg-zinc-900/90 border-blue-800/40"
                        : "bg-zinc-950/70 border-zinc-800/80"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-white">{item.itemCode}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            {item.discipline}
                          </span>
                          <span className="text-xs text-zinc-500 font-mono">({item.deliverableCategory})</span>
                        </div>
                        <h3 className="text-sm font-bold text-zinc-100 mt-1">{item.deliverableTitle}</h3>
                        <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                          <span>Statutory Ref: {item.cpwdClauseRef || "CPWD Works Manual"}</span>
                          {item.remarks && <span>· &quot;{item.remarks}&quot;</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          {isHandedOver ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Handed Over
                              </span>
                              <div className="text-[10px] text-zinc-500">Signed: {item.clientFmName}</div>
                            </div>
                          ) : isVerified ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-blue-400 font-semibold">
                                <Clock className="w-3.5 h-3.5" /> PMC Verified
                              </span>
                              <div className="text-[10px] text-zinc-500">Awaiting Client FM Sign-Off</div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" /> Action Pending
                            </span>
                          )}
                        </div>

                        {!isHandedOver && (
                          <button
                            onClick={() => handleVerifyChecklistItem(item.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
                          >
                            Sign-Off Deliverable
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: VAULT ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-zinc-900/70 border border-zinc-800">
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              As-Built Drawing Sheets by Engineering Discipline
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Breakdown of drawing archives deposited across all trade disciplines.
            </p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={disciplineChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <YAxis stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", fontSize: "12px", color: "#f4f4f5" }}
                  />
                  <Bar dataKey="drawings" fill="#10b981" name="Drawing Sheets" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-zinc-900/70 border border-zinc-800">
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-400" />
              Equipment Warranty Status Distribution
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Manufacturer warranty health and preventative AMC scheduling alert posture.
            </p>
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={warrantyPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }: any) => `${name} (${value})`}
                    labelLine={false}
                  >
                    {warrantyPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", fontSize: "12px", color: "#f4f4f5" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD AS-BUILT DRAWING MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  Deposit As-Built Drawing Sheet
                </h3>
                <p className="text-xs text-zinc-400">Ingest to ISO 19650 Common Data Environment (CDE)</p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDrawing} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Drawing Sheet Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AB-STR-LKO-002"
                  value={newDwgNumber}
                  onChange={(e) => setNewDwgNumber(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 p-2.5 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Sheet Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shear Wall Boundary Rebar Detailing"
                  value={newSheetTitle}
                  onChange={(e) => setNewSheetTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 p-2.5 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Discipline</label>
                  <select
                    value={newDiscipline}
                    onChange={(e) => setNewDiscipline(e.target.value as AsBuiltDiscipline)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 p-2.5 rounded-lg focus:outline-none focus:border-emerald-500"
                  >
                    <option value="STRUCTURAL">Structural</option>
                    <option value="ARCHITECTURAL">Architectural</option>
                    <option value="MEP">MEP</option>
                    <option value="HVAC">HVAC</option>
                    <option value="FIRE_SAFETY">Fire Safety</option>
                    <option value="INFRASTRUCTURE">Infrastructure</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Revision Code</label>
                  <input
                    type="text"
                    value={newRevision}
                    onChange={(e) => setNewRevision(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 p-2.5 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">AutoCAD DWG File Path / URL</label>
                <input
                  type="text"
                  placeholder="/vault/drawings/AB-STR-LKO-002.dwg"
                  value={newCadUrl}
                  onChange={(e) => setNewCadUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 p-2.5 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">BIM IFC Model Path / URL</label>
                <input
                  type="text"
                  placeholder="/vault/bim/LKO-TOWER-STR.ifc"
                  value={newBimUrl}
                  onChange={(e) => setNewBimUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 p-2.5 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Save to CDE Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER O&M MANUAL MODAL */}
      {showRegisterOmModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-indigo-400" />
                  Register Plant &amp; Machinery Asset
                </h3>
                <p className="text-xs text-zinc-400">Add equipment O&amp;M manual and warranty tracking</p>
              </div>
              <button
                onClick={() => setShowRegisterOmModal(false)}
                className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterOmManual} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Equipment Tag *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HVAC-CHL-02"
                    value={newEqTag}
                    onChange={(e) => setNewEqTag(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 p-2.5 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Asset Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Centrifugal Chiller"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 p-2.5 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Equipment Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Secondary Chilled Water Circulation Pump"
                  value={newEqName}
                  onChange={(e) => setNewEqName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 p-2.5 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Manufacturer / OEM</label>
                  <input
                    type="text"
                    placeholder="e.g. Grundfos Pumps India"
                    value={newManufacturer}
                    onChange={(e) => setNewManufacturer(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 p-2.5 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Make / Model Number</label>
                  <input
                    type="text"
                    placeholder="e.g. NB 100-250"
                    value={newMakeModel}
                    onChange={(e) => setNewMakeModel(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 p-2.5 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Installation Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Basement 2 Pump Room"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 p-2.5 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Warranty Expiry Date</label>
                  <input
                    type="date"
                    value={newWarrantyExpiry}
                    onChange={(e) => setNewWarrantyExpiry(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 p-2.5 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterOmModal(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Register Equipment Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWING INSPECTION PREVIEW MODAL */}
      {showPreviewModal && selectedDrawing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                  CDE As-Built Drawing Dossier
                </span>
                <h3 className="text-base font-bold text-white">{selectedDrawing.drawingNumber}</h3>
                <p className="text-xs text-zinc-400">{selectedDrawing.sheetTitle}</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <div>
                <span className="text-zinc-500 block">Engineering Discipline:</span>
                <span className="text-white font-semibold">{selectedDrawing.discipline}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Revision Code:</span>
                <span className="text-white font-semibold">{selectedDrawing.revisionNumber}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">CDE Container:</span>
                <span className="text-zinc-300">{selectedDrawing.cdeContainer}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">ISO 19650 State:</span>
                <span className="text-emerald-400 font-semibold">{selectedDrawing.iso19650State}</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-zinc-800/80">
                <span className="text-zinc-500 block text-[10px]">SHA-256 Cryptographic Hash:</span>
                <span className="text-emerald-400 text-[10px] break-all">{selectedDrawing.sha256Hash}</span>
              </div>
            </div>

            {/* Approval Chain */}
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2 text-xs">
              <div className="font-semibold text-white">Consultant Review Log:</div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Auditing Consultant:</span>
                <span className="text-zinc-200">{selectedDrawing.consultantName || "Not assigned"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Status:</span>
                <span>{getApprovalBadge(selectedDrawing.consultantApprovalStatus)}</span>
              </div>
              {selectedDrawing.consultantRemarks && (
                <div className="p-2 rounded bg-zinc-900 text-zinc-400 text-[11px] italic">
                  &quot;{selectedDrawing.consultantRemarks}&quot;
                </div>
              )}
            </div>

            {/* Download Links */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                {selectedDrawing.cadDwgUrl && (
                  <a
                    href={selectedDrawing.cadDwgUrl}
                    download
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" /> CAD (.DWG)
                  </a>
                )}
                {selectedDrawing.bimModelUrl && (
                  <a
                    href={selectedDrawing.bimModelUrl}
                    download
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono flex items-center gap-1.5 transition"
                  >
                    <Box className="w-3.5 h-3.5 text-purple-400" /> BIM (.IFC)
                  </a>
                )}
                {selectedDrawing.pdfDrawingUrl && (
                  <a
                    href={selectedDrawing.pdfDrawingUrl}
                    download
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono flex items-center gap-1.5 transition"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-400" /> PDF Sheet
                  </a>
                )}
              </div>

              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
