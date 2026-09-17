"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  FolderArchive,
  HardHat,
  Layers,
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
  TrendingDown,
  TrendingUp,
  Truck,
  Unlock,
  Users,
  Wrench,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type CloseoutStage =
  | "PUNCH_LIST_DE_SNAGGING"
  | "AS_BUILT_DOCUMENTATION_ARCHIVE"
  | "STATUTORY_NOC_HANDOVER"
  | "DLP_MAINTENANCE_ACTIVE"
  | "PROJECT_ARCHIVED_CLOSED";

export interface CloseoutArchiveRecord {
  id: string;
  project_id: string;
  closeout_reference_no: string;
  work_order_ref: string;
  contractor_name: string;
  package_title: string;
  practical_completion_date: string;
  dlp_expiry_date: string;
  zero_category_a_snags: boolean;
  final_emb_reconciled: boolean;
  statutory_oc_received: boolean;
  as_built_drawings_uploaded: boolean;
  om_manuals_archived: boolean;
  stage: CloseoutStage;
  project_director_signatory: string;
  seor_signatory: string;
  client_representative: string;
  archived_at?: string | null;
  audit_remarks?: string | null;
  created_at?: string;
}

function normalizeCloseout(d: any): CloseoutArchiveRecord {
  return {
    id: d?.id ?? `cls-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    closeout_reference_no: d?.closeout_reference_no ?? `CLS-${Date.now().toString().slice(-4)}`,
    work_order_ref: d?.work_order_ref ?? "WO-01",
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    package_title: d?.package_title ?? "Project Closeout Package",
    practical_completion_date: d?.practical_completion_date ?? new Date().toISOString().slice(0, 10),
    dlp_expiry_date: d?.dlp_expiry_date ?? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    zero_category_a_snags: Boolean(d?.zero_category_a_snags),
    final_emb_reconciled: Boolean(d?.final_emb_reconciled),
    statutory_oc_received: Boolean(d?.statutory_oc_received),
    as_built_drawings_uploaded: Boolean(d?.as_built_drawings_uploaded),
    om_manuals_archived: Boolean(d?.om_manuals_archived),
    stage: (d?.stage as CloseoutStage) ?? "PUNCH_LIST_DE_SNAGGING",
    project_director_signatory: d?.project_director_signatory ?? "Project Director",
    seor_signatory: d?.seor_signatory ?? "Resident SEOR",
    client_representative: d?.client_representative ?? "Employer Master Developer",
    archived_at: d?.archived_at ?? null,
    audit_remarks: d?.audit_remarks ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalCloseoutHandoverPage() {
  const { project, role, tier } = useActiveRole();
  const [archives, setArchives] = useState<CloseoutArchiveRecord[]>([]);
  const [selectedArchive, setSelectedArchive] = useState<CloseoutArchiveRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Project Director";
  const isDirectorOrSeor =
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleLabel.includes("Director") ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Lead");

  // Form State for Initiating Closeout Dossier
  const [clsNo, setClsNo] = useState(`CLS-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-01`);
  const [woRef, setWoRef] = useState(tier === "RESIDENTIAL" ? "WO-RES-001" : "WO-TWR-101");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [title, setTitle] = useState(
    tier === "RESIDENTIAL"
      ? "Turnkey Residential Interior Fit-Out Practical Completion & As-Built Archive"
      : "Tower A Superstructure & MEP Infrastructure Handover Closeout Dossier"
  );

  const loadCloseoutData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("project_closeout_archives")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeCloseout(d));
        setArchives(normalized);
        if (!selectedArchive) setSelectedArchive(normalized[0]);
      } else {
        const defaults: CloseoutArchiveRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeCloseout({
                  id: "cls-res-01",
                  project_id: projectId,
                  closeout_reference_no: "CLS-RES-2026-01",
                  work_order_ref: "WO-RES-001",
                  contractor_name: "Royal Woodworks & Interiors",
                  package_title: "Turnkey Residential Interior Fit-Out Practical Completion",
                  practical_completion_date: "2026-09-12",
                  dlp_expiry_date: "2027-09-12",
                  zero_category_a_snags: true,
                  final_emb_reconciled: true,
                  statutory_oc_received: true,
                  as_built_drawings_uploaded: true,
                  om_manuals_archived: true,
                  stage: "DLP_MAINTENANCE_ACTIVE",
                  project_director_signatory: "Project Director",
                  seor_signatory: "Principal Architect",
                  client_representative: "Private Villa Owner",
                  audit_remarks: "All interior joinery de-snagged and O&M manuals handed over. DLP active.",
                }),
              ]
            : [
                normalizeCloseout({
                  id: "cls-twr-01",
                  project_id: projectId,
                  closeout_reference_no: "CLS-TWR-2026-01",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  package_title: "Tower A Superstructure & Core Civil Infrastructure Handover",
                  practical_completion_date: "2026-08-30",
                  dlp_expiry_date: "2027-08-30",
                  zero_category_a_snags: true,
                  final_emb_reconciled: true,
                  statutory_oc_received: true,
                  as_built_drawings_uploaded: true,
                  om_manuals_archived: true,
                  stage: "DLP_MAINTENANCE_ACTIVE",
                  project_director_signatory: "Project Director",
                  seor_signatory: "Resident SEOR",
                  client_representative: "Omaxe Realty Developers Ltd",
                  audit_remarks: "Substantial completion certified under Taking-Over Certificate TOC-TWR-08. DLP active.",
                }),
              ];

        setArchives(defaults);
        if (!selectedArchive) setSelectedArchive(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedArchive, tier]);

  useEffect(() => {
    void loadCloseoutData();

    const channel = supabase
      .channel(`closeout_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_closeout_archives" }, () => void loadCloseoutData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadCloseoutData]);

  const summary = useMemo(() => {
    const totalArchives = archives.length;
    const dlpActiveCount = archives.filter((a) => a.stage === "DLP_MAINTENANCE_ACTIVE").length;
    const fullyClosedCount = archives.filter((a) => a.stage === "PROJECT_ARCHIVED_CLOSED").length;
    const prerequisitesCleared = archives.filter(
      (a) => a.zero_category_a_snags && a.final_emb_reconciled && a.statutory_oc_received && a.as_built_drawings_uploaded
    ).length;

    return { totalArchives, dlpActiveCount, fullyClosedCount, prerequisitesCleared };
  }, [archives]);

  const filteredArchives = useMemo(() => {
    return archives.filter((a) => {
      const matchStage = filterStage === "ALL" || a.stage === filterStage;
      const haystack = `${a.closeout_reference_no} ${a.package_title} ${a.contractor_name} ${a.work_order_ref}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStage && matchSearch;
    });
  }, [archives, filterStage, search]);

  // Stage 1: Toggle Closeout Prerequisite Flag
  const handleTogglePrerequisite = async (key: keyof CloseoutArchiveRecord, currentVal: boolean) => {
    if (!selectedArchive) return;
    const updatePayload = { [key]: !currentVal };

    try {
      await (supabase as any)
        .from("project_closeout_archives")
        .update(updatePayload)
        .eq("id", selectedArchive.id);
    } catch {
      // Local optimistic update
    }

    const updated = { ...selectedArchive, ...updatePayload };
    setSelectedArchive(updated as CloseoutArchiveRecord);
    setArchives((prev) => prev.map((a) => (a.id === selectedArchive.id ? (updated as CloseoutArchiveRecord) : a)));
  };

  // Stage 2: Archive & Close Project
  const handleArchiveProject = async (arch: CloseoutArchiveRecord) => {
    if (!isDirectorOrSeor) return;
    setActionInProgress(`archive_${arch.id}`);

    const updatePayload: Partial<CloseoutArchiveRecord> = {
      stage: "PROJECT_ARCHIVED_CLOSED",
      archived_at: new Date().toISOString(),
      audit_remarks: "Project formally archived. All retention released and DLP successfully concluded.",
    };

    try {
      await (supabase as any)
        .from("project_closeout_archives")
        .update(updatePayload)
        .eq("id", arch.id);
    } catch {
      // Local optimistic update
    }

    setArchives((prev) =>
      prev.map((item) => (item.id === arch.id ? ({ ...item, ...updatePayload } as CloseoutArchiveRecord) : item))
    );
    if (selectedArchive && selectedArchive.id === arch.id) {
      setSelectedArchive((prev) => (prev ? ({ ...prev, ...updatePayload } as CloseoutArchiveRecord) : null));
    }

    setFeedbackMessage(`Project closeout archive ${arch.closeout_reference_no} formally archived and sealed.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Lodge New Closeout Dossier
  const handleCreateArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_cls");

    const newDbRecord: Omit<CloseoutArchiveRecord, "id"> = {
      project_id: projectId,
      closeout_reference_no: clsNo.trim(),
      work_order_ref: woRef.trim(),
      contractor_name: contractor.trim(),
      package_title: title.trim(),
      practical_completion_date: new Date().toISOString().slice(0, 10),
      dlp_expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      zero_category_a_snags: true,
      final_emb_reconciled: true,
      statutory_oc_received: true,
      as_built_drawings_uploaded: true,
      om_manuals_archived: true,
      stage: "DLP_MAINTENANCE_ACTIVE",
      project_director_signatory: roleLabel || "Project Director",
      seor_signatory: "Resident SEOR",
      client_representative: "Employer Master Developer",
      audit_remarks: "Closeout dossier initialized. DLP warranty period active.",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("project_closeout_archives")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeCloseout(data);
        setArchives((prev) => [normalized, ...prev]);
        setSelectedArchive(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeCloseout({ ...newDbRecord, id: `cls-${Date.now()}` });
      setArchives((prev) => [fallback, ...prev]);
      setSelectedArchive(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory Completion Report & Handover Certificate Print
  const handlePrintCompletionReport = (arch: CloseoutArchiveRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Project Completion Report &amp; Handover Certificate (CPWD Section 20 / FIDIC Cl. 10.1) — ${arch.closeout_reference_no}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .active { background: #e0f2fe; color: #0369a1; border: 1px solid #0284c7; }
    .closed { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .tac { text-align: center; font-family: monospace; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-top: 14px; background: #fafafa; }
    .check-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 14px; }
    .check-item { border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px; background: #fff; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 40px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD Works Manual Section 20 / FIDIC Red Book Clause 10.1</div>
      <h1 class="title">Project Completion Report &amp; As-Built Handover Certificate</h1>
      <div class="meta">Closeout Ref: ${arch.closeout_reference_no} · Practical Completion: ${arch.practical_completion_date} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${arch.stage === "PROJECT_ARCHIVED_CLOSED" ? "closed" : "active"}">${arch.stage.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Work Package Title</th><td colspan="3"><strong>${arch.package_title}</strong></td></tr>
    <tr><th>Executing Contractor</th><td><strong>${arch.contractor_name}</strong></td><th>Parent Work Order Ref</th><td><strong>${arch.work_order_ref}</strong></td></tr>
    <tr><th>Practical Completion Date</th><td><strong>${arch.practical_completion_date}</strong></td><th>Defects Liability Period (DLP) Expiry</th><td><strong>${arch.dlp_expiry_date}</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Mandatory Closeout Prerequisites Audit</div>
    <div class="check-grid">
      <div class="check-item">1. Zero Category A Handover Blockers: <strong>${arch.zero_category_a_snags ? "VERIFIED (100% DE-SNAGGED)" : "PENDING"}</strong></div>
      <div class="check-item">2. Final e-MB Quantity Reconciliation: <strong>${arch.final_emb_reconciled ? "RECONCILED & CERTIFIED" : "PENDING"}</strong></div>
      <div class="check-item">3. Statutory Occupancy Certificate (OC): <strong>${arch.statutory_oc_received ? "RECEIVED FROM AUTHORITY" : "PENDING"}</strong></div>
      <div class="check-item">4. As-Built BIM / CAD Drawings Archive: <strong>${arch.as_built_drawings_uploaded ? "UPLOADED TO VAULT" : "PENDING"}</strong></div>
      <div class="check-item">5. Manufacturer O&amp;M Manuals Handover: <strong>${arch.om_manuals_archived ? "ARCHIVED & INDEXED" : "PENDING"}</strong></div>
    </div>
  </div>

  <div class="box" style="margin-top: 14px;">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Executive Closeout Summary &amp; Maintenance Guarantee</div>
    <div>${arch.audit_remarks || "All works executed in accordance with contract specifications. Defects Liability Period (DLP) warranty active for 12 months post practical completion."}</div>
  </div>

  <div class="footer">
    <div>
      <div>Project Director / Employer</div>
      <div style="color: #64748b;">${arch.project_director_signatory}</div>
      <div class="sig">Employer Handover Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">${arch.seor_signatory}</div>
      <div class="sig">Engineer Completion Endorsement</div>
    </div>
    <div>
      <div>Client Representative</div>
      <div style="color: #64748b;">${arch.client_representative}</div>
      <div class="sig">Taking-Over Acceptance Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedArchive) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING PROJECT CLOSEOUT, HANDOVER &amp; AS-BUILT ARCHIVE...
      </div>
    );
  }

  const isClosed = selectedArchive.stage === "PROJECT_ARCHIVED_CLOSED";
  const allPrerequisitesCleared =
    selectedArchive.zero_category_a_snags &&
    selectedArchive.final_emb_reconciled &&
    selectedArchive.statutory_oc_received &&
    selectedArchive.as_built_drawings_uploaded &&
    selectedArchive.om_manuals_archived;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Project Closeout · CPWD Works Manual Section 20 / FIDIC Red Book Clause 10.1</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Project Closeout, Handover &amp; As-Built Archive
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Practical completion and asset archiving clearinghouse. Verifies zero category A snags, reconciles final e-MB quantities, archives as-built BIM models and O&amp;M manuals, and tracks the 12-month Defects Liability Period (DLP).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintCompletionReport(selectedArchive)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Completion Report</span>
            </button>
            <Link
              href="/finance/final-bill"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Receipt className="w-3.5 h-3.5 text-cyan-400" />
              <span>Final Bill &amp; Retention</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setClsNo(`CLS-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-0${archives.length + 1}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Initiate Closeout Dossier</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedbackMessage && (
          <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* 4 PRIMARY GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>DLP Warranty Active</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {summary.dlpActiveCount} Package(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">12-month post-handover warranty</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Prerequisites Cleared</span>
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-cyan-300 mt-2">
              {summary.prerequisitesCleared} / {summary.totalArchives} Dossiers
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">100% de-snagged &amp; as-built archived</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Projects Archived &amp; Closed</span>
              <FolderArchive className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.fullyClosedCount} Closed
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Retention &amp; PBG fully discharged</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Closeout Package Register</span>
              <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.totalArchives} Packages
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CPWD Section 20 completion records</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Archives (${archives.length})` },
              { key: "DLP_MAINTENANCE_ACTIVE", label: `DLP Active (${summary.dlpActiveCount})` },
              { key: "PROJECT_ARCHIVED_CLOSED", label: `Archived (${summary.fullyClosedCount})` },
              { key: "PUNCH_LIST_DE_SNAGGING", label: "De-Snagging" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterStage(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition ${
                  filterStage === tab.key
                    ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search archive ref, title, contractor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: ARCHIVES ROSTER (5 cols) vs PREREQUISITES & CLOSEOUT DESK (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: ARCHIVES LISTING (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  CPWD Section 20 Register
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Closeout &amp; Handover Dossiers</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredArchives.length} Dossiers</span>
            </div>

            <div className="space-y-3">
              {filteredArchives.map((arch) => {
                const isSelected = selectedArchive.id === arch.id;
                const isArchClosed = arch.stage === "PROJECT_ARCHIVED_CLOSED";

                return (
                  <div
                    key={arch.id}
                    onClick={() => setSelectedArchive(arch)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {arch.closeout_reference_no}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isArchClosed
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                        }`}>
                          {arch.stage.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-emerald-400">
                          {arch.practical_completion_date}
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          DLP: {arch.dlp_expiry_date}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{arch.package_title}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        {arch.contractor_name} &bull; Work Order: <strong className="text-zinc-200">{arch.work_order_ref}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Signatory: <strong className="text-zinc-300">{arch.project_director_signatory}</strong></span>
                      <span>Prerequisites: <strong className={arch.zero_category_a_snags && arch.final_emb_reconciled && arch.statutory_oc_received ? "text-emerald-400" : "text-amber-400"}>{arch.zero_category_a_snags && arch.final_emb_reconciled ? "Cleared" : "Pending"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: PREREQUISITES & ARCHIVE CONTROL DESK (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  As-Built Vault &amp; Handover Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedArchive.closeout_reference_no} &mdash; {selectedArchive.package_title}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isClosed
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
              }`}>
                {selectedArchive.stage.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Package Description:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedArchive.package_title}</strong>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Contractor Entity:</span>
                  <span className="text-cyan-300 font-bold font-sans">{selectedArchive.contractor_name}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Work Order Ref:</span>
                  <span className="text-white font-bold">{selectedArchive.work_order_ref}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Practical Completion Date:</span>
                  <span className="text-emerald-400 font-bold">{selectedArchive.practical_completion_date}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">DLP Warranty Expiry:</span>
                  <span className="text-amber-400 font-bold">{selectedArchive.dlp_expiry_date} (12M Period)</span>
                </div>
              </div>
            </div>

            {/* MANDATORY PREREQUISITES CHECKLIST INTERACTIVE MATRIX */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Mandatory Closeout Prerequisites Audit (Click to Toggle):
              </span>

              <div className="space-y-2 text-[11px]">
                {[
                  { key: "zero_category_a_snags", label: "1. Zero Category A Handover Blockers (De-Snagged)", val: selectedArchive.zero_category_a_snags },
                  { key: "final_emb_reconciled", label: "2. Final Electronic Measurement Book (e-MB) Reconciled", val: selectedArchive.final_emb_reconciled },
                  { key: "statutory_oc_received", label: "3. Statutory Occupancy Certificate (OC) Received", val: selectedArchive.statutory_oc_received },
                  { key: "as_built_drawings_uploaded", label: "4. As-Built BIM Models & CAD Drawings Uploaded", val: selectedArchive.as_built_drawings_uploaded },
                  { key: "om_manuals_archived", label: "5. Manufacturer O&M Manuals & Warranties Indexed", val: selectedArchive.om_manuals_archived },
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => handleTogglePrerequisite(item.key as keyof CloseoutArchiveRecord, item.val)}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                      item.val
                        ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="font-bold">{item.val ? "VERIFIED (PASS)" : "PENDING"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTION STAGE BUTTONS */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Closeout &amp; Archiving Authorizations:
              </span>

              {!isClosed && (
                <button
                  type="button"
                  disabled={!allPrerequisitesCleared || !isDirectorOrSeor || actionInProgress === `archive_${selectedArchive.id}`}
                  onClick={() => handleArchiveProject(selectedArchive)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>Seal &amp; Archive Project Closeout (Project Director)</span>
                </button>
              )}

              {isClosed && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Project Formally Archived &amp; Sealed</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Archived on {selectedArchive.archived_at ? new Date(selectedArchive.archived_at).toLocaleDateString("en-IN") : "Today"} by {selectedArchive.project_director_signatory}. All retention and PBG bonds released.
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD Works Manual Section 20 &amp; FIDIC Red Book Clause 10.1 Protocol
            </div>
          </div>

        </div>

        {/* INITIATE CLOSEOUT MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <FolderArchive className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Initiate Project Closeout Dossier
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateArchive} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Closeout Ref Code</label>
                    <input
                      type="text"
                      required
                      value={clsNo}
                      onChange={(e) => setClsNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Work Order Ref</label>
                    <input
                      type="text"
                      required
                      value={woRef}
                      onChange={(e) => setWoRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Package Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Contractor Entity</label>
                  <input
                    type="text"
                    required
                    value={contractor}
                    onChange={(e) => setContractor(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === "creating_cls"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Create Closeout Dossier</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}