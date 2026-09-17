"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
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
  Wrench,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type NcrSeverity =
  | "COSMETIC_SURFACE_MINOR"
  | "FUNCTIONAL_MAJOR"
  | "CRITICAL_STRUCTURAL_HOLD"
  | "COMMERCIAL_BACKCHARGE";

export type NcrStatus =
  | "OPEN_INVESTIGATION"
  | "CAPA_SUBMITTED"
  | "RECTIFICATION_IN_PROGRESS"
  | "SEOR_VERIFIED_CLOSED"
  | "DEFAULT_BACKCHARGE_DEBITED";

export interface NcrRecord {
  id: string;
  project_id: string;
  ncr_code: string;
  ncr_number?: string | null;
  work_order_ref: string;
  contractor_name: string;
  trade_package: string;
  structural_element: string;
  location_grid: string;
  title: string;
  severity: NcrSeverity;
  defect_category: string;
  description: string;
  remedial_action_required: string;
  root_cause_analysis?: string | null;
  target_closure_date: string;
  rectified_date?: string | null;
  estimated_debit_inr: number;
  backcharge_amount: number;
  enforce_auto_debit: boolean;
  linked_ra_bill_no?: string | null;
  linked_pour_card_ref?: string | null;
  linked_cube_sample_ref?: string | null;
  status: NcrStatus;
  issued_by: string;
  verified_by?: string | null;
  issued_date: string;
  closed_at?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function normalizeNcr(d: any): NcrRecord {
  const estDebit = Number(d?.estimated_debit_inr ?? d?.backcharge_amount ?? 0);
  const actualBackcharge = Number(d?.backcharge_amount ?? estDebit);

  return {
    id: d?.id ?? `ncr-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    ncr_code: d?.ncr_code ?? `NCR-${Date.now().toString().slice(-4)}`,
    ncr_number: d?.ncr_number ?? d?.ncr_code ?? "NCR-001",
    work_order_ref: d?.work_order_ref ?? "WO-01",
    contractor_name: d?.contractor_name ?? d?.assigned_contractor ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    structural_element: d?.structural_element ?? "Reinforced Shear Wall",
    location_grid: d?.location_grid ?? "Site Grid",
    title: d?.title ?? "Non-Conformance Notice Logged",
    severity: (d?.severity as NcrSeverity) ?? "FUNCTIONAL_MAJOR",
    defect_category: d?.defect_category ?? "Workmanship_Defect",
    description: d?.description ?? "Technical non-conformance recorded during physical site quality inspection.",
    remedial_action_required: d?.remedial_action_required ?? "Execute technical remediation in strict accordance with contract specifications.",
    root_cause_analysis: d?.root_cause_analysis ?? null,
    target_closure_date: d?.target_closure_date ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    rectified_date: d?.rectified_date ?? null,
    estimated_debit_inr: estDebit,
    backcharge_amount: actualBackcharge,
    enforce_auto_debit: Boolean(d?.enforce_auto_debit),
    linked_ra_bill_no: d?.linked_ra_bill_no ?? null,
    linked_pour_card_ref: d?.linked_pour_card_ref ?? null,
    linked_cube_sample_ref: d?.linked_cube_sample_ref ?? null,
    status: (d?.status as NcrStatus) ?? "OPEN_INVESTIGATION",
    issued_by: d?.issued_by ?? "Lead QA Inspector",
    verified_by: d?.verified_by ?? null,
    issued_date: d?.issued_date ?? new Date().toISOString().slice(0, 10),
    closed_at: d?.closed_at ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalNcrPage() {
  const { project, role, tier } = useActiveRole();
  const [ncrs, setNcrs] = useState<NcrRecord[]>([]);
  const [selectedNcr, setSelectedNcr] = useState<NcrRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Resident SEOR";
  const isSeorOrDirector =
    roleId === "RESIDENT_SEOR" ||
    roleId === "RESIDENT_ENGINEER" ||
    roleId === "PMC_LEAD" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PROJECT_DIRECTOR" ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Engineer") ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("Director");

  // Form State for Issuing New NCR
  const [ncrNo, setNcrNo] = useState(`NCR-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
  const [title, setTitle] = useState(
    tier === "RESIDENTIAL"
      ? "Joinery Alignment Defect: Master Wardrobe Top Shutter Shadow Gap Rubbing"
      : "Severe Honeycombing & Voids at Level 08 Column-Shear Wall Junction"
  );
  const [woRef, setWoRef] = useState(tier === "RESIDENTIAL" ? "WO-RES-001" : "WO-TWR-101");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [element, setElement] = useState(
    tier === "RESIDENTIAL" ? "Master Bedroom Modular Wardrobe" : "Level 08 Shear Core Wall Junction"
  );
  const [grid, setGrid] = useState(tier === "RESIDENTIAL" ? "First Floor / MB-02" : "Tower A / Level 08 / Grid C3-D5");
  const [severity, setSeverity] = useState<NcrSeverity>(
    tier === "RESIDENTIAL" ? "FUNCTIONAL_MAJOR" : "CRITICAL_STRUCTURAL_HOLD"
  );
  const [category, setCategory] = useState("Workmanship_and_Compaction");
  const [desc, setDesc] = useState(
    tier === "RESIDENTIAL"
      ? "Shutter hinges misaligned, causing edge friction on false ceiling pelmet. Re-leveling and hardware replacement required."
      : "Coarse aggregate segregation and significant honeycombing observed over 1.2 meters of shear wall base upon formwork de-shuttering."
  );
  const [remedialAction, setRemedialAction] = useState(
    tier === "RESIDENTIAL"
      ? "Dismantle defective shutters, re-plumb carcass framing, and reinstall Blum soft-close fittings."
      : "Chip away loose concrete to sound aggregate, air-jet clean, apply polymer bonding agent, and pressure grout with Sika non-shrink structural micro-concrete."
  );
  const [debitAmount, setDebitAmount] = useState<number>(tier === "RESIDENTIAL" ? 2500 : 85000);
  const [closureDate, setClosureDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [targetRaBill, setTargetRaBill] = useState(tier === "RESIDENTIAL" ? "RA-RES-03" : "RA-TWR-06");

  const loadNcrsData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("non_conformance_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("issued_date", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeNcr(d));
        setNcrs(normalized);
        if (!selectedNcr) setSelectedNcr(normalized[0]);
      } else {
        const defaults: NcrRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeNcr({
                  id: "ncr-res-01",
                  project_id: projectId,
                  ncr_code: "NCR-RES-014",
                  ncr_number: "NCR-RES-014",
                  work_order_ref: "WO-RES-001",
                  contractor_name: "Royal Woodworks & Interiors",
                  trade_package: "Custom Joinery & Millwork",
                  structural_element: "Master Bedroom Modular Wardrobe",
                  location_grid: "First Floor / MB-02",
                  title: "Wardrobe Shutter Alignment & Shadow Gap Rubbing Defect",
                  severity: "COMMERCIAL_BACKCHARGE",
                  defect_category: "Workmanship_Defect",
                  description: "Right-hand wardrobe shutter rubs against top shadow gap ceiling trim. Re-alignment and re-screwing required.",
                  remedial_action_required: "Re-level carcass framing, replace warped soft-close hinges, and refinish veneer edge banding.",
                  target_closure_date: "2026-09-20",
                  estimated_debit_inr: 2500,
                  backcharge_amount: 2500,
                  enforce_auto_debit: true,
                  linked_ra_bill_no: "RA-RES-03",
                  status: "OPEN_INVESTIGATION",
                  issued_by: "Principal Architect",
                }),
              ]
            : [
                normalizeNcr({
                  id: "ncr-twr-01",
                  project_id: projectId,
                  ncr_code: "NCR-TWR-104",
                  ncr_number: "NCR-TWR-104",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  structural_element: "Level 08 Lift Core Shear Wall Junction",
                  location_grid: "Tower A / Level 08 / Grid C3-D5",
                  title: "Structural Honeycombing & Aggregate Segregation at Core Base",
                  severity: "CRITICAL_STRUCTURAL_HOLD",
                  defect_category: "Concrete_Compaction_Failure",
                  description: "Extensive voiding and honeycombing over 1.2 m length upon formwork de-shuttering due to inadequate needle vibrator compaction.",
                  remedial_action_required: "Chip loose concrete to sound aggregate, install injection packers, and pressure grout with high-strength non-shrink micro-concrete (Sika Grout 214).",
                  target_closure_date: "2026-09-18",
                  estimated_debit_inr: 85000,
                  backcharge_amount: 85000,
                  enforce_auto_debit: true,
                  linked_ra_bill_no: "RA-TWR-06",
                  linked_pour_card_ref: "PC-TWR-109",
                  status: "RECTIFICATION_IN_PROGRESS",
                  issued_by: "Resident SEOR",
                }),
                normalizeNcr({
                  id: "ncr-twr-02",
                  project_id: projectId,
                  ncr_code: "NCR-TWR-101",
                  ncr_number: "NCR-TWR-101",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Waterproofing",
                  structural_element: "Basement B2 Retaining Wall Cold Joint",
                  location_grid: "Basement B2 / Grid A1-A4",
                  title: "Water Ingress at Construction Cold Joint (Waterstop Puncture)",
                  severity: "FUNCTIONAL_MAJOR",
                  defect_category: "Waterproofing_Failure",
                  description: "Hydrostatic seepage observed along 4.5 meters of horizontal construction joint due to punctured PVC waterstop profile.",
                  remedial_action_required: "Execute polyurethane (PU) hydrophilic pressure injection grouting to arrest water infiltration.",
                  target_closure_date: "2026-08-25",
                  rectified_date: "2026-08-24",
                  estimated_debit_inr: 45000,
                  backcharge_amount: 45000,
                  enforce_auto_debit: false,
                  status: "SEOR_VERIFIED_CLOSED",
                  issued_by: "Resident SEOR",
                  verified_by: "Resident SEOR",
                }),
              ];

        setNcrs(defaults);
        if (!selectedNcr) setSelectedNcr(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedNcr, tier]);

  useEffect(() => {
    void loadNcrsData();

    const channel = supabase
      .channel(`ncr_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "non_conformance_reports" }, () => void loadNcrsData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadNcrsData]);

  const summary = useMemo(() => {
    const totalNcrs = ncrs.length;
    const criticalHolds = ncrs.filter((n) => n.severity === "CRITICAL_STRUCTURAL_HOLD" && n.status !== "SEOR_VERIFIED_CLOSED").length;
    const totalBackchargesInr = ncrs
      .filter((n) => n.enforce_auto_debit || n.status === "DEFAULT_BACKCHARGE_DEBITED")
      .reduce((sum, n) => sum + Number(n.backcharge_amount || 0), 0);
    const closedCount = ncrs.filter((n) => n.status === "SEOR_VERIFIED_CLOSED").length;

    return { totalNcrs, criticalHolds, totalBackchargesInr, closedCount };
  }, [ncrs]);

  const filteredNcrs = useMemo(() => {
    return ncrs.filter((n) => {
      const matchSev = filterSeverity === "ALL" || n.severity === filterSeverity;
      const matchStat = filterStatus === "ALL" || n.status === filterStatus;
      const haystack = `${n.ncr_code} ${n.title} ${n.structural_element} ${n.location_grid} ${n.contractor_name}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchSev && matchStat && matchSearch;
    });
  }, [ncrs, filterSeverity, filterStatus, search]);

  // Enforce Auto-Debit on Contractor's RA Bill (FIDIC 11.4 / CPWD Cl. 14)
  const handleEnforceBackcharge = async (ncr: NcrRecord) => {
    if (!isSeorOrDirector) return;
    setActionInProgress(`debit_${ncr.id}`);

    const updatePayload: Partial<NcrRecord> = {
      enforce_auto_debit: true,
      status: "DEFAULT_BACKCHARGE_DEBITED",
    };

    try {
      await (supabase as any)
        .from("non_conformance_reports")
        .update(updatePayload)
        .eq("id", ncr.id);

      // Push debit onto linked RA Bill if provided
      if (ncr.linked_ra_bill_no) {
        await (supabase as any)
          .from("running_account_bills")
          .update({
            ncr_debit_backcharges_inr: ncr.backcharge_amount,
          })
          .eq("project_id", projectId)
          .eq("bill_number", ncr.linked_ra_bill_no);
      }
    } catch {
      // Local optimistic update
    }

    setNcrs((prev) =>
      prev.map((item) => (item.id === ncr.id ? ({ ...item, ...updatePayload } as NcrRecord) : item))
    );
    if (selectedNcr && selectedNcr.id === ncr.id) {
      setSelectedNcr((prev) => (prev ? ({ ...prev, ...updatePayload } as NcrRecord) : null));
    }

    setFeedbackMessage(`Commercial backcharge of ${formatInr(ncr.backcharge_amount)} enforced against ${ncr.linked_ra_bill_no || "RA Bill"}.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // SEOR Verifies Rectification & Closes NCR
  const handleVerifyCloseNcr = async (ncr: NcrRecord) => {
    if (!isSeorOrDirector) return;
    setActionInProgress(`close_${ncr.id}`);

    const updatePayload: Partial<NcrRecord> = {
      status: "SEOR_VERIFIED_CLOSED",
      verified_by: roleLabel || "Resident SEOR",
      rectified_date: new Date().toISOString().slice(0, 10),
      closed_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("non_conformance_reports")
        .update(updatePayload)
        .eq("id", ncr.id);
    } catch {
      // Local optimistic update
    }

    setNcrs((prev) =>
      prev.map((item) => (item.id === ncr.id ? ({ ...item, ...updatePayload } as NcrRecord) : item))
    );
    if (selectedNcr && selectedNcr.id === ncr.id) {
      setSelectedNcr((prev) => (prev ? ({ ...prev, ...updatePayload } as NcrRecord) : null));
    }

    setFeedbackMessage(`NCR ${ncr.ncr_code} verified and officially closed by ${roleLabel}.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Issue New NCR Entry
  const handleCreateNcr = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_ncr");

    const newDbRecord: Omit<NcrRecord, "id"> = {
      project_id: projectId,
      ncr_code: ncrNo.trim(),
      ncr_number: ncrNo.trim(),
      work_order_ref: woRef.trim(),
      contractor_name: contractor.trim(),
      trade_package: tradePackage.trim(),
      structural_element: element.trim(),
      location_grid: grid.trim(),
      title: title.trim(),
      severity,
      defect_category: category.trim(),
      description: desc.trim(),
      remedial_action_required: remedialAction.trim(),
      target_closure_date: closureDate,
      estimated_debit_inr: Number(debitAmount),
      backcharge_amount: Number(debitAmount),
      enforce_auto_debit: severity === "COMMERCIAL_BACKCHARGE",
      linked_ra_bill_no: targetRaBill.trim() || null,
      status: "OPEN_INVESTIGATION",
      issued_by: roleLabel || "Resident SEOR",
      issued_date: new Date().toISOString().slice(0, 10),
    };

    try {
      const { data, error } = await (supabase as any)
        .from("non_conformance_reports")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeNcr(data);
        setNcrs((prev) => [normalized, ...prev]);
        setSelectedNcr(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeNcr({ ...newDbRecord, id: `ncr-${Date.now()}` });
      setNcrs((prev) => [fallback, ...prev]);
      setSelectedNcr(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory CPWD Form 14 / Notice to Correct Print
  const handlePrintForm14 = (ncr: NcrRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Non-Conformance Notice to Correct (CPWD Form 14 / FIDIC Cl. 7.6 &amp; 15.1) — ${ncr.ncr_code}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .hold { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
    .closed { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-top: 14px; background: #fafafa; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 40px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD GCC Clause 14 / FIDIC Red Book Clause 7.6 &amp; 15.1</div>
      <h1 class="title">Statutory Non-Conformance Notice to Correct</h1>
      <div class="meta">Notice Ref: ${ncr.ncr_code} · Issue Date: ${ncr.issued_date} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${ncr.status === "SEOR_VERIFIED_CLOSED" ? "closed" : "hold"}">${ncr.severity.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Defaulting Contractor</th><td><strong>${ncr.contractor_name}</strong></td><th>Parent Work Order Ref</th><td><strong>${ncr.work_order_ref}</strong></td></tr>
    <tr><th>Structural Element</th><td><strong>${ncr.structural_element}</strong></td><th>Location Grid Coordinate</th><td>${ncr.location_grid}</td></tr>
    <tr><th>Defect Category</th><td>${ncr.defect_category}</td><th>Mandatory Closure SLA</th><td><strong>${ncr.target_closure_date}</strong></td></tr>
    <tr><th>Associated RA Bill Debit</th><td><strong>${ncr.linked_ra_bill_no || "Next IPC"}</strong></td><th>Commercial Backcharge Exposure</th><td class="tar" style="color: #b91c1c; font-weight: bold; font-size: 13px;">₹${ncr.backcharge_amount.toLocaleString("en-IN")}</td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Factual Non-Conformance Description &amp; Technical Deviation</div>
    <div>${ncr.description}</div>
  </div>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Mandated Corrective &amp; Preventive Action (CAPA)</div>
    <div>${ncr.remedial_action_required}</div>
  </div>

  <div class="box" style="background: #fef2f2; border-color: #fca5a5;">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #991b1b; margin-bottom: 4px;">
      FIDIC 11.4 / CPWD Clause 14 Statutory Failure Notice
    </div>
    <div style="font-size: 11px; line-height: 1.5; color: #b91c1c;">
      Notice is hereby served. If the Contractor fails to rectify the non-conforming works by <strong>${ncr.target_closure_date}</strong>, the Employer shall execute the remediation via third-party agencies at the Contractor's sole risk and expense, enforcing an automatic debit of <strong>₹${ncr.backcharge_amount.toLocaleString("en-IN")}</strong> from the contractor's Running Account payment.
    </div>
  </div>

  <div class="footer">
    <div>
      <div>Issuing QA / Quality Engineer</div>
      <div style="color: #64748b;">${ncr.issued_by}</div>
      <div class="sig">QA Inspection Seal</div>
    </div>
    <div>
      <div>Contractor Acknowledgment</div>
      <div style="color: #64748b;">${ncr.contractor_name}</div>
      <div class="sig">Contractor Receipt Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">${ncr.verified_by || "Statutory Action Authorized"}</div>
      <div class="sig">Engineer Sanction Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedNcr) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING NON-CONFORMANCE REPORTS (NCR) &amp; COMMERCIAL BACKCHARGE ENGINE...
      </div>
    );
  }

  const isClosed = selectedNcr.status === "SEOR_VERIFIED_CLOSED";
  const isDebited = selectedNcr.status === "DEFAULT_BACKCHARGE_DEBITED" || selectedNcr.enforce_auto_debit;
  const isHold = selectedNcr.severity === "CRITICAL_STRUCTURAL_HOLD" && !isClosed;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Quality Governance · CPWD GCC Clause 14 / FIDIC Red Book Clause 7.6 &amp; 11.4</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Non-Conformance Reports &amp; Commercial Backcharge Ledger
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Quality defect and default enforcement clearinghouse. Tracks technical non-conformances, mandates root cause analysis (CAPA), halts critical structural pours, and transfers unrectified backcharges directly into contractor RA bill debits.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintForm14(selectedNcr)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form 14 Notice</span>
            </button>
            <Link
              href="/finance/ra-bills"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Receipt className="w-3.5 h-3.5 text-cyan-400" />
              <span>RA Bills Clearinghouse</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setNcrNo(`NCR-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Issue NCR Notice</span>
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
              <span>Commercial Backcharges</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.totalBackchargesInr > 0 ? "text-rose-400" : "text-zinc-400"}`}>
              {formatInr(summary.totalBackchargesInr)}
            </div>
            <div className="text-[11px] text-rose-500/80 mt-1">Debited on contractor RA bills</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Critical Structural Holds</span>
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.criticalHolds > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {summary.criticalHolds} Holds
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Freezes pre-pour stage-gates</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Rectified &amp; Closed NCRs</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {summary.closedCount} Rectified
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">SEOR inspected and verified</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Non-Conformance Log</span>
              <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.totalNcrs} Notices
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CPWD Form 14 quality notices</div>
          </div>
        </div>

        {/* CRITICAL HOLD ALERT CALLOUT */}
        {isHold && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <strong className="text-rose-200 text-xs uppercase tracking-wider block">
                  Critical Structural Quality Hold Active: Pour Stage-Gate Frozen
                </strong>
                <span className="text-xs text-rose-300/80 font-sans">
                  Notice {selectedNcr.ncr_code} constitutes a critical structural breach at {selectedNcr.location_grid}. Pre-pour authorizations and concrete batching are halted until structural remediation is inspected and certified by the Resident SEOR.
                </span>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-800 text-xs font-bold shrink-0">
              STRUCTURAL HOLD
            </span>
          </div>
        )}

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Notices (${ncrs.length})` },
              { key: "OPEN_INVESTIGATION", label: "Open" },
              { key: "RECTIFICATION_IN_PROGRESS", label: "In Rectification" },
              { key: "DEFAULT_BACKCHARGE_DEBITED", label: "Backcharge Debited" },
              { key: "SEOR_VERIFIED_CLOSED", label: "Closed (Pass)" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition ${
                  filterStatus === tab.key
                    ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-400 font-mono"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL_STRUCTURAL_HOLD">Critical Structural Hold</option>
              <option value="COMMERCIAL_BACKCHARGE">Commercial Backcharge</option>
              <option value="FUNCTIONAL_MAJOR">Functional Major</option>
              <option value="COSMETIC_SURFACE_MINOR">Cosmetic Minor</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search NCR, element, grid..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: NCR ROSTER (7 cols) vs CAPA & BACKCHARGE DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: NCR LISTING (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  CPWD Form 14 Non-Conformance Registry
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Quality Non-Conformance Notices</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredNcrs.length} Notices</span>
            </div>

            <div className="space-y-3">
              {filteredNcrs.map((ncr) => {
                const isSelected = selectedNcr.id === ncr.id;
                const isCriticalHold = ncr.severity === "CRITICAL_STRUCTURAL_HOLD" && ncr.status !== "SEOR_VERIFIED_CLOSED";
                const isClosedNotice = ncr.status === "SEOR_VERIFIED_CLOSED";

                return (
                  <div
                    key={ncr.id}
                    onClick={() => setSelectedNcr(ncr)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {ncr.ncr_code}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isCriticalHold
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                            : ncr.severity === "COMMERCIAL_BACKCHARGE"
                            ? "bg-purple-950 text-purple-400 border border-purple-800/50"
                            : "bg-zinc-800 text-zinc-300"
                        }`}>
                          {ncr.severity.replace(/_/g, " ")}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isClosedNotice
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : ncr.status === "DEFAULT_BACKCHARGE_DEBITED"
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {ncr.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className={`text-xs font-bold ${ncr.backcharge_amount > 0 ? "text-rose-400" : "text-zinc-400"}`}>
                          {ncr.backcharge_amount > 0 ? `-${formatInr(ncr.backcharge_amount)}` : "No Debit"}
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Due: {ncr.target_closure_date}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{ncr.title}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        {ncr.structural_element} &bull; Grid: <strong className="text-zinc-200">{ncr.location_grid}</strong> &bull; {ncr.contractor_name}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Category: <strong className="text-zinc-300">{ncr.defect_category}</strong></span>
                      <span>Target Bill: <strong className="text-cyan-300">{ncr.linked_ra_bill_no || "Next IPC"}</strong></span>
                      <span>SEOR Sign: <strong className={ncr.verified_by ? "text-emerald-400" : "text-amber-400"}>{ncr.verified_by ? "Closed" : "Pending"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: CAPA INSPECTION & BACKCHARGE DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Quality Remediation Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedNcr.ncr_code}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isClosed
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : isHold
                  ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                  : "bg-amber-950 text-amber-400 border border-amber-800/50"
              }`}>
                {selectedNcr.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Defect Title:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedNcr.title}</strong>
              </div>

              <div className="pt-2 border-t border-zinc-800/60">
                <span className="text-zinc-500 text-[10px] uppercase block">Technical Non-Conformance Description:</span>
                <p className="text-zinc-200 font-sans text-xs mt-1 leading-relaxed">{selectedNcr.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Structural Element:</span>
                  <span className="text-white font-bold">{selectedNcr.structural_element}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Location Grid:</span>
                  <span className="text-cyan-300 font-bold">{selectedNcr.location_grid}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Defaulting Contractor:</span>
                  <span className="text-white font-sans">{selectedNcr.contractor_name}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Closure SLA:</span>
                  <span className="text-amber-400 font-bold">{selectedNcr.target_closure_date}</span>
                </div>
              </div>
            </div>

            {/* MANDATED CAPA & COMMERCIAL BACKCHARGE WATERFALL */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Remedial Mandate &amp; Financial Liability:
              </span>

              <p className="text-zinc-200 font-sans text-xs leading-relaxed">
                {selectedNcr.remedial_action_required}
              </p>

              <div className="pt-2 border-t border-zinc-800 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Assessed Third-Party Remedial Cost:</span>
                  <span className="text-rose-400 font-bold">{formatInr(selectedNcr.backcharge_amount)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Target RA Bill for Debit:</span>
                  <span className="text-cyan-300 font-bold">{selectedNcr.linked_ra_bill_no || "Next Interim Certificate"}</span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-zinc-800">
                  <span>Auto-Debit Enforcement Status:</span>
                  <span className={`font-bold ${isDebited ? "text-rose-400" : "text-zinc-300"}`}>
                    {isDebited ? "DEBIT ENFORCED ON RA BILL" : "PENDING RECTIFICATION"}
                  </span>
                </div>
              </div>
            </div>

            {/* ACTION STAGE BUTTONS */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Statutory Quality Gate Actions:
              </span>

              {/* Action 1: Enforce Third-Party Backcharge Debit */}
              {!isClosed && !isDebited && selectedNcr.backcharge_amount > 0 && (
                <button
                  type="button"
                  disabled={!isSeorOrDirector || actionInProgress === `debit_${selectedNcr.id}`}
                  onClick={() => handleEnforceBackcharge(selectedNcr)}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/50 font-mono disabled:opacity-50"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>Enforce Third-Party Backcharge Debit (FIDIC 11.4 / CPWD Cl. 14)</span>
                </button>
              )}

              {/* Action 2: SEOR Verifies Rectification & Closes NCR */}
              {!isClosed && (
                <button
                  type="button"
                  disabled={!isSeorOrDirector || actionInProgress === `close_${selectedNcr.id}`}
                  onClick={() => handleVerifyCloseNcr(selectedNcr)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Rectification &amp; Seal NCR Closed (Resident SEOR)</span>
                </button>
              )}

              {isClosed && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Non-Conformance Inspected &amp; Formally Cleared</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Certified on {selectedNcr.closed_at ? new Date(selectedNcr.closed_at).toLocaleDateString("en-IN") : "Today"} by {selectedNcr.verified_by || "Resident SEOR"}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD Form 14 &amp; FIDIC Clause 7.6 / 11.4 Quality Protocol
            </div>
          </div>

        </div>

        {/* ISSUE NEW NCR MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Issue Non-Conformance Notice (Form 14)
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

              <form onSubmit={handleCreateNcr} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">NCR Code</label>
                    <input
                      type="text"
                      required
                      value={ncrNo}
                      onChange={(e) => setNcrNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Severity Level</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as NcrSeverity)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="CRITICAL_STRUCTURAL_HOLD">Critical Structural Hold</option>
                      <option value="COMMERCIAL_BACKCHARGE">Commercial Backcharge</option>
                      <option value="FUNCTIONAL_MAJOR">Functional Major</option>
                      <option value="COSMETIC_SURFACE_MINOR">Cosmetic Minor</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Defect Headline</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Structural Element</label>
                    <input
                      type="text"
                      required
                      value={element}
                      onChange={(e) => setElement(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Location Grid</label>
                    <input
                      type="text"
                      required
                      value={grid}
                      onChange={(e) => setGrid(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Contractor Name</label>
                    <input
                      type="text"
                      required
                      value={contractor}
                      onChange={(e) => setContractor(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
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
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Technical Description of Defect</label>
                  <textarea
                    rows={2}
                    required
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Mandated CAPA Remediation Action</label>
                  <textarea
                    rows={2}
                    required
                    value={remedialAction}
                    onChange={(e) => setRemedialAction(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Estimated Debit Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={debitAmount}
                      onChange={(e) => setDebitAmount(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Closure Target Date</label>
                    <input
                      type="date"
                      required
                      value={closureDate}
                      onChange={(e) => setClosureDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
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
                    disabled={actionInProgress === "creating_ncr"}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-md shadow-rose-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Issue Notice to Correct</span>
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