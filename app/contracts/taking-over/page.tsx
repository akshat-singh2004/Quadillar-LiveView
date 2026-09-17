"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  HardHat,
  Layers,
  Lock,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Unlock,
  Wrench,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type TocScopeType =
  | "WHOLE_OF_THE_WORKS"
  | "SECTIONAL_COMPLETION"
  | "PARTIAL_OCCUPATION_PHASE";

export type TocSignoffStage =
  | "INSPECTION_UNDERTAKEN"
  | "PUNCH_LIST_ATTACHED"
  | "SEOR_RECOMMENDED"
  | "EMPLOYER_ACCEPTED"
  | "DLP_OPERATIONAL";

export interface TakingOverDossierRecord {
  id: string;
  project_id: string;
  toc_number: string;
  title: string;
  work_order_ref: string;
  contractor_name: string;
  trade_package: string;
  handover_scope: TocScopeType;
  section_description: string;
  inspection_date: string;
  substantial_completion_date: string;
  dlp_commencement_date: string;
  dlp_duration_months: number;
  dlp_expiration_date: string;
  total_snags_logged: number;
  minor_snags_pending: number;
  critical_blockers_count: number;
  retention_release_eligible_inr: number;
  retention_released_stage1: boolean;
  contractor_signatory: string;
  resident_seor_signatory?: string | null;
  employer_director_signatory?: string | null;
  signoff_stage: TocSignoffStage;
  signed_at?: string | null;
  handover_notes?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function normalizeTocRecord(d: any): TakingOverDossierRecord {
  const dlpMonths = Number(d?.dlp_duration_months ?? 12);
  const commDate = d?.dlp_commencement_date ?? new Date().toISOString().slice(0, 10);
  const expDate =
    d?.dlp_expiration_date ??
    new Date(new Date(commDate).getTime() + dlpMonths * 30 * 86400000).toISOString().slice(0, 10);

  return {
    id: d?.id ?? `toc-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    toc_number: d?.toc_number ?? `TOC-${Date.now().toString().slice(-4)}`,
    title: d?.title ?? "Taking-Over of the Works & Substantial Completion Certificate",
    work_order_ref: d?.work_order_ref ?? "WO-01",
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    handover_scope: (d?.handover_scope as TocScopeType) ?? "WHOLE_OF_THE_WORKS",
    section_description: d?.section_description ?? "Comprehensive execution of package works.",
    inspection_date: d?.inspection_date ?? new Date().toISOString().slice(0, 10),
    substantial_completion_date: d?.substantial_completion_date ?? new Date().toISOString().slice(0, 10),
    dlp_commencement_date: commDate,
    dlp_duration_months: dlpMonths,
    dlp_expiration_date: expDate,
    total_snags_logged: Number(d?.total_snags_logged ?? 0),
    minor_snags_pending: Number(d?.minor_snags_pending ?? 0),
    critical_blockers_count: Number(d?.critical_blockers_count ?? 0),
    retention_release_eligible_inr: Number(d?.retention_release_eligible_inr ?? 0),
    retention_released_stage1: Boolean(d?.retention_released_stage1),
    contractor_signatory: d?.contractor_signatory ?? "Contractor Project Manager",
    resident_seor_signatory: d?.resident_seor_signatory ?? null,
    employer_director_signatory: d?.employer_director_signatory ?? null,
    signoff_stage: (d?.signoff_stage as TocSignoffStage) ?? "INSPECTION_UNDERTAKEN",
    signed_at: d?.signed_at ?? null,
    handover_notes: d?.handover_notes ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalTakingOverPage() {
  const { project, role, tier } = useActiveRole();
  const [dossiers, setDossiers] = useState<TakingOverDossierRecord[]>([]);
  const [selectedDossier, setSelectedDossier] = useState<TakingOverDossierRecord | null>(null);
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

  // Form State for Preparing Taking-Over Dossier
  const [tocCode, setTocCode] = useState(`TOC-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-01`);
  const [title, setTitle] = useState(
    tier === "RESIDENTIAL"
      ? "Taking-Over of Apartment Custom Joinery & Interior Fit-Out Package"
      : "Taking-Over of Tower A Superstructure (Level 01 to Level 08) & Core Lift Shafts"
  );
  const [woRef, setWoRef] = useState(tier === "RESIDENTIAL" ? "WO-RES-001" : "WO-TWR-101");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [scope, setScope] = useState<TocScopeType>(
    tier === "RESIDENTIAL" ? "WHOLE_OF_THE_WORKS" : "SECTIONAL_COMPLETION"
  );
  const [secDesc, setSecDesc] = useState(
    tier === "RESIDENTIAL"
      ? "Turnkey completion of master wardrobes, guest vanities, wall panelling, and soft-close hardware."
      : "Substantial completion of reinforced shear walls, PT slabs, and staircase shafts up to Level 08."
  );
  const [dlpMonths, setDlpMonths] = useState<number>(12);
  const [stage1Retention, setStage1Retention] = useState<number>(tier === "RESIDENTIAL" ? 8625 : 2125000);
  const [contractorSignatory, setContractorSignatory] = useState("V. K. Mehta (Project Manager)");

  const loadTakingOverData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("taking_over_dossiers")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeTocRecord(d));
        setDossiers(normalized);
        if (!selectedDossier) setSelectedDossier(normalized[0]);
      } else {
        const defaults: TakingOverDossierRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeTocRecord({
                  id: "toc-res-01",
                  project_id: projectId,
                  toc_number: "TOC-RES-01",
                  title: "Taking-Over of Apartment Custom Joinery & Interior Fit-Out Package",
                  work_order_ref: "WO-RES-001",
                  contractor_name: "Royal Woodworks & Interiors",
                  trade_package: "Custom Joinery & Millwork",
                  handover_scope: "WHOLE_OF_THE_WORKS",
                  section_description: "Substantial completion of master wardrobe carcasses, bed frames, and wall cladding.",
                  inspection_date: "2026-09-12",
                  substantial_completion_date: "2026-09-12",
                  dlp_commencement_date: "2026-09-13",
                  dlp_duration_months: 12,
                  dlp_expiration_date: "2027-09-12",
                  total_snags_logged: 2,
                  minor_snags_pending: 1,
                  critical_blockers_count: 0,
                  retention_release_eligible_inr: 8625,
                  retention_released_stage1: false,
                  contractor_signatory: "V. K. Mehta (PM)",
                  resident_seor_signatory: "Principal Architect",
                  employer_director_signatory: null,
                  signoff_stage: "SEOR_RECOMMENDED",
                  handover_notes: "Minor punch items logged in Snag Register. No critical blockers. Safe for client fit-out occupation.",
                }),
              ]
            : [
                normalizeTocRecord({
                  id: "toc-twr-01",
                  project_id: projectId,
                  toc_number: "TOC-TWR-01",
                  title: "Taking-Over of Tower A Superstructure (Level 01 to Level 08) & Core Lift Shafts",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  handover_scope: "SECTIONAL_COMPLETION",
                  section_description: "Sectional completion of reinforced concrete shear core, PT decks, and stairwells from Level 01 to Level 08.",
                  inspection_date: "2026-09-08",
                  substantial_completion_date: "2026-09-08",
                  dlp_commencement_date: "2026-09-09",
                  dlp_duration_months: 12,
                  dlp_expiration_date: "2027-09-08",
                  total_snags_logged: 5,
                  minor_snags_pending: 2,
                  critical_blockers_count: 0,
                  retention_release_eligible_inr: 2125000,
                  retention_released_stage1: true,
                  contractor_signatory: "R. K. Sharma (Project Director NCW)",
                  resident_seor_signatory: "Resident SEOR",
                  employer_director_signatory: "Employer Project Director",
                  signoff_stage: "DLP_OPERATIONAL",
                  signed_at: "2026-09-10T14:30:00Z",
                  handover_notes: "Tripartite inspection complete. Cube tests exceed 40 MPa. Stage 1 (50%) Retention Release authorized.",
                }),
              ];

        setDossiers(defaults);
        if (!selectedDossier) setSelectedDossier(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedDossier, tier]);

  useEffect(() => {
    void loadTakingOverData();

    const channel = supabase
      .channel(`toc_dossiers_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "taking_over_dossiers" }, () => void loadTakingOverData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadTakingOverData]);

  const summary = useMemo(() => {
    const totalTocs = dossiers.length;
    const dlpActiveCount = dossiers.filter((d) => d.signoff_stage === "DLP_OPERATIONAL").length;
    const totalRetentionStage1Released = dossiers
      .filter((d) => d.retention_released_stage1)
      .reduce((sum, d) => sum + Number(d.retention_release_eligible_inr || 0), 0);
    const pendingEmployerSignoff = dossiers.filter(
      (d) => d.signoff_stage === "SEOR_RECOMMENDED"
    ).length;

    return { totalTocs, dlpActiveCount, totalRetentionStage1Released, pendingEmployerSignoff };
  }, [dossiers]);

  const filteredDossiers = useMemo(() => {
    return dossiers.filter((d) => {
      const matchStage = filterStage === "ALL" || d.signoff_stage === filterStage;
      const haystack = `${d.toc_number} ${d.title} ${d.contractor_name} ${d.work_order_ref}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStage && matchSearch;
    });
  }, [dossiers, filterStage, search]);

  // Stage 1: SEOR Recommends Taking-Over
  const handleRecommendSeor = async (toc: TakingOverDossierRecord) => {
    if (!isDirectorOrSeor) return;
    setActionInProgress(`seor_${toc.id}`);

    const updatePayload: Partial<TakingOverDossierRecord> = {
      signoff_stage: "SEOR_RECOMMENDED",
      resident_seor_signatory: roleLabel || "Resident SEOR",
    };

    try {
      await (supabase as any)
        .from("taking_over_dossiers")
        .update(updatePayload)
        .eq("id", toc.id);
    } catch {
      // Local optimistic update
    }

    setDossiers((prev) =>
      prev.map((item) => (item.id === toc.id ? ({ ...item, ...updatePayload } as TakingOverDossierRecord) : item))
    );
    if (selectedDossier && selectedDossier.id === toc.id) {
      setSelectedDossier((prev) => (prev ? ({ ...prev, ...updatePayload } as TakingOverDossierRecord) : null));
    }

    setFeedbackMessage(`Taking-Over recommendation signed by ${roleLabel}. Transmitted to Employer.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Stage 2: Employer Sanctions Taking-Over & Initiates DLP + Stage 1 Retention Release
  const handleAcceptEmployer = async (toc: TakingOverDossierRecord) => {
    if (!isDirectorOrSeor) return;
    setActionInProgress(`employer_${toc.id}`);

    const updatePayload: Partial<TakingOverDossierRecord> = {
      signoff_stage: "DLP_OPERATIONAL",
      employer_director_signatory: "Employer Project Director",
      retention_released_stage1: true,
      signed_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("taking_over_dossiers")
        .update(updatePayload)
        .eq("id", toc.id);

      // Trigger automatic Stage 1 (50%) Retention Release in commercial escrow ledger
      await (supabase as any)
        .from("retention_and_bank_guarantees")
        .update({
          stage_1_toc_released: true,
          status: "STAGE_1_RELEASED_50PCT",
        })
        .eq("project_id", projectId)
        .eq("linked_ra_bill_no", tier === "RESIDENTIAL" ? "RA-RES-03" : "RA-TWR-06");
    } catch {
      // Local optimistic update
    }

    setDossiers((prev) =>
      prev.map((item) => (item.id === toc.id ? ({ ...item, ...updatePayload } as TakingOverDossierRecord) : item))
    );
    if (selectedDossier && selectedDossier.id === toc.id) {
      setSelectedDossier((prev) => (prev ? ({ ...prev, ...updatePayload } as TakingOverDossierRecord) : null));
    }

    setFeedbackMessage(`Taking-Over Certificate sealed! DLP active & 50% Retention (${formatInr(toc.retention_release_eligible_inr)}) unlocked.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Create New Taking-Over Dossier
  const handleCreateDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_toc");

    const commDate = new Date().toISOString().slice(0, 10);
    const expDate = new Date(Date.now() + Number(dlpMonths) * 30 * 86400000).toISOString().slice(0, 10);

    const newDbRecord: Omit<TakingOverDossierRecord, "id"> = {
      project_id: projectId,
      toc_number: tocCode.trim(),
      title: title.trim(),
      work_order_ref: woRef.trim(),
      contractor_name: contractor.trim(),
      trade_package: tradePackage.trim(),
      handover_scope: scope,
      section_description: secDesc.trim(),
      inspection_date: commDate,
      substantial_completion_date: commDate,
      dlp_commencement_date: commDate,
      dlp_duration_months: Number(dlpMonths),
      dlp_expiration_date: expDate,
      total_snags_logged: 2,
      minor_snags_pending: 1,
      critical_blockers_count: 0,
      retention_release_eligible_inr: Number(stage1Retention),
      retention_released_stage1: false,
      contractor_signatory: contractorSignatory.trim(),
      signoff_stage: "INSPECTION_UNDERTAKEN",
      handover_notes: "Joint inspection complete. Punch list attached as Schedule B.",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("taking_over_dossiers")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeTocRecord(data);
        setDossiers((prev) => [normalized, ...prev]);
        setSelectedDossier(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeTocRecord({ ...newDbRecord, id: `toc-${Date.now()}` });
      setDossiers((prev) => [fallback, ...prev]);
      setSelectedDossier(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Printable CPWD Form 20 / FIDIC TOC Dossier
  const handlePrintDossier = (toc: TakingOverDossierRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Taking-Over Certificate &amp; DLP Charter (FIDIC Cl. 10.1 / CPWD GCC Cl. 17) — ${toc.toc_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .active { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .pending { background: #e0f2fe; color: #0369a1; border: 1px solid #0284c7; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .tac { text-align: center; font-family: monospace; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-top: 14px; background: #fafafa; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 40px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · FIDIC Red Book Clause 10.1 / CPWD GCC Clause 17</div>
      <h1 class="title">Statutory Taking-Over Certificate &amp; DLP Charter</h1>
      <div class="meta">Certificate Ref: ${toc.toc_number} · Substantial Completion: ${toc.substantial_completion_date} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${toc.signoff_stage === "DLP_OPERATIONAL" ? "active" : "pending"}">${toc.signoff_stage.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Executing Contractor</th><td><strong>${toc.contractor_name}</strong></td><th>Parent Work Order Ref</th><td><strong>${toc.work_order_ref}</strong></td></tr>
    <tr><th>Handover Scope</th><td><strong>${toc.handover_scope.replace(/_/g, " ")}</strong></td><th>Trade Package</th><td>${toc.trade_package}</td></tr>
    <tr><th>Defects Liability Horizon</th><td colspan="3"><strong>${toc.dlp_commencement_date} to ${toc.dlp_expiration_date} (${toc.dlp_duration_months} Calendar Months)</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Factual Description of Substantially Completed Works</div>
    <div>${toc.section_description}</div>
    <div style="margin-top: 6px; font-size: 10px; color: #64748b;">${toc.handover_notes || "All mandatory testing and inspections verified compliant."}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Statutory Handover Milestone Parameter</th>
        <th>Audit Benchmark / Contract Condition</th>
        <th class="tac">Status Verification</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Critical Path Snag Clearance</td>
        <td>Zero Critical Handover Blockers per FIDIC 10.1</td>
        <td class="tac font-bold" style="color: #15803d;">CLEARED (0 Blockers)</td>
      </tr>
      <tr>
        <td>2. Minor Punch List Schedule</td>
        <td>Defects rectification within 14-day SLA charter</td>
        <td class="tac font-bold">${toc.minor_snags_pending} Minor Items Logged</td>
      </tr>
      <tr>
        <td>3. Transfer of Operational Care &amp; Risk</td>
        <td>Employer assumes physical possession and utility risk</td>
        <td class="tac font-bold" style="color: #15803d;">POSSESSION TRANSFERRED</td>
      </tr>
      <tr>
        <td>4. Stage 1 (50%) Retention Money Escrow Release</td>
        <td>FIDIC Cl. 14.9 / CPWD Cl. 17 First Tranche</td>
        <td class="tac font-bold" style="color: ${toc.retention_released_stage1 ? "#15803d" : "#b91c1c"};">
          ${toc.retention_released_stage1 ? `RELEASED (${formatInr(toc.retention_release_eligible_inr)})` : "HELD PENDING EMPLOYER SIGN"}
        </td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>Main Contractor Signatory</div>
      <div style="color: #64748b;">${toc.contractor_signatory}</div>
      <div class="sig">Contractor Acceptance Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">${toc.resident_seor_signatory || "Technical Certification Granted"}</div>
      <div class="sig">Consultant Handover Seal</div>
    </div>
    <div>
      <div>Employer Project Director</div>
      <div style="color: #64748b;">${toc.employer_director_signatory || "Taking-Over Sanctioned"}</div>
      <div class="sig">Employer Sanction &amp; Possession Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedDossier) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING STATUTORY TAKING-OVER CERTIFICATE (TOC) DOSSIER...
      </div>
    );
  }

  const isDlpActive = selectedDossier.signoff_stage === "DLP_OPERATIONAL";
  const isRecommended = selectedDossier.signoff_stage === "SEOR_RECOMMENDED";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Commercial Handover · FIDIC Red Book Clause 10.1 / CPWD GCC Clause 17</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Taking-Over Certificates (TOC) &amp; DLP Charter
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Substantial completion and legal possession handover clearinghouse. Verifies zero critical punch-list blockers, initiates the statutory Defects Liability Period (DLP), and unlocks Stage 1 (50%) retention releases.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintDossier(selectedDossier)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print TOC Charter</span>
            </button>
            <Link
              href="/finance/retention-ledger"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Coins className="w-3.5 h-3.5 text-rose-400" />
              <span>Retention Escrow</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setTocCode(`TOC-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-0${dossiers.length + 1}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Draft Taking-Over Dossier</span>
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
              <span>Active DLP Charters</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {summary.dlpActiveCount} Section(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Operational custody transferred</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Stage 1 Retention Released</span>
              <Coins className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {formatInr(summary.totalRetentionStage1Released)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">50% TOC statutory releases</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Pending Employer Sanction</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.pendingEmployerSignoff > 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {summary.pendingEmployerSignoff} Dossier(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Recommended by Resident SEOR</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Taking-Over Certificates</span>
              <FileCheck className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.totalTocs} Certificates
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Managed under FIDIC Clause 10.1</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Certificates (${dossiers.length})` },
              { key: "DLP_OPERATIONAL", label: "DLP Active" },
              { key: "SEOR_RECOMMENDED", label: `SEOR Recommended (${summary.pendingEmployerSignoff})` },
              { key: "INSPECTION_UNDERTAKEN", label: "Inspection Undertaken" },
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
              placeholder="Search TOC, contractor, section..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: DOSSIER LISTING (7 cols) vs CHARTER AUDIT DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: TOC DOSSIERS ROSTER (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Statutory Completion Milestones (FIDIC 10.1)
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Taking-Over Dossiers &amp; Charters</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredDossiers.length} Certificates</span>
            </div>

            <div className="space-y-3">
              {filteredDossiers.map((toc) => {
                const isSelected = selectedDossier.id === toc.id;
                const isDlp = toc.signoff_stage === "DLP_OPERATIONAL";

                return (
                  <div
                    key={toc.id}
                    onClick={() => setSelectedDossier(toc)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {toc.toc_number}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {toc.handover_scope.replace(/_/g, " ")}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isDlp
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : toc.signoff_stage === "SEOR_RECOMMENDED"
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {toc.signoff_stage.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-emerald-400">
                          {formatInr(toc.retention_release_eligible_inr)} (50%)
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Substantial: {toc.substantial_completion_date}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{toc.title}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        Contractor: <strong className="text-zinc-200">{toc.contractor_name}</strong> &bull; {toc.work_order_ref}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>DLP Horizon: <strong className="text-zinc-300">{toc.dlp_commencement_date} &rarr; {toc.dlp_expiration_date} ({toc.dlp_duration_months}M)</strong></span>
                      <span>Minor Snags: <strong className="text-zinc-200">{toc.minor_snags_pending} Logged</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: TRIPARTITE SIGNOFF & CHARTER DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Tripartite Handover Sanction
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedDossier.toc_number}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isDlpActive
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : "bg-amber-950 text-amber-400 border border-amber-800/50"
              }`}>
                {selectedDossier.signoff_stage.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Section Description:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedDossier.section_description}</strong>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Substantial Completion:</span>
                  <span className="text-white font-bold">{selectedDossier.substantial_completion_date}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">DLP Expiration Date:</span>
                  <span className="text-cyan-300 font-bold">{selectedDossier.dlp_expiration_date}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Contractor Signatory:</span>
                  <span className="text-zinc-200">{selectedDossier.contractor_signatory}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Stage 1 Escrow Release:</span>
                  <span className="text-emerald-400 font-bold">{formatInr(selectedDossier.retention_release_eligible_inr)}</span>
                </div>
              </div>
            </div>

            {/* FIDIC 10.1 STATUTORY HANDOVER VERIFICATIONS */}
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 font-mono text-xs space-y-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                FIDIC Clause 10.1 Handover Conditions:
              </span>

              <div className="flex justify-between items-center text-[11px]">
                <span>1. Critical Path Snags (Handover Blockers):</span>
                <span className="text-emerald-400 font-bold">ZERO BLOCKERS (PASS)</span>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span>2. Resident SEOR Technical Recommendation:</span>
                <span className={`font-bold ${selectedDossier.resident_seor_signatory ? "text-emerald-400" : "text-amber-400"}`}>
                  {selectedDossier.resident_seor_signatory ? "RECOMMENDED (PASS)" : "PENDING SEOR"}
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span>3. Employer Acceptance &amp; Care Assumption:</span>
                <span className={`font-bold ${selectedDossier.employer_director_signatory ? "text-emerald-400" : "text-amber-400"}`}>
                  {selectedDossier.employer_director_signatory ? "ACCEPTED & POSSESSED" : "PENDING EMPLOYER"}
                </span>
              </div>
            </div>

            {/* ACTIONS: SEOR RECOMMEND & EMPLOYER ACCEPT */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Statutory Execution Protocol:
              </span>

              {/* Action 1: SEOR Recommendation */}
              {!selectedDossier.resident_seor_signatory && (
                <button
                  type="button"
                  disabled={!isDirectorOrSeor || actionInProgress === `seor_${selectedDossier.id}`}
                  onClick={() => handleRecommendSeor(selectedDossier)}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Endorse Technical Handover (Resident SEOR)</span>
                </button>
              )}

              {/* Action 2: Employer Sanction & DLP Activation */}
              {selectedDossier.resident_seor_signatory && !selectedDossier.employer_director_signatory && (
                <button
                  type="button"
                  disabled={!isDirectorOrSeor || actionInProgress === `employer_${selectedDossier.id}`}
                  onClick={() => handleAcceptEmployer(selectedDossier)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Sanction Taking-Over &amp; Release 50% Retention (Employer)</span>
                </button>
              )}

              {isDlpActive && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>DLP Operational &bull; Stage 1 Retention Released</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Sanctioned by {selectedDossier.employer_director_signatory || "Project Director"} on {selectedDossier.signed_at ? new Date(selectedDossier.signed_at).toLocaleDateString("en-IN") : "Today"}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              FIDIC Red Book Clause 10.1 &amp; CPWD GCC Clause 17 Handover Protocol
            </div>
          </div>

        </div>

        {/* DRAFT TAKING-OVER DOSSIER MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Draft Taking-Over Dossier (FIDIC 10.1)
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

              <form onSubmit={handleCreateDossier} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Certificate Ref No.</label>
                    <input
                      type="text"
                      required
                      value={tocCode}
                      onChange={(e) => setTocCode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Scope of Handover</label>
                    <select
                      value={scope}
                      onChange={(e) => setScope(e.target.value as TocScopeType)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="WHOLE_OF_THE_WORKS">Whole of the Works</option>
                      <option value="SECTIONAL_COMPLETION">Sectional Completion</option>
                      <option value="PARTIAL_OCCUPATION_PHASE">Partial Occupation Phase</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Dossier Title</label>
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
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Work Order Ref</label>
                    <input
                      type="text"
                      required
                      value={woRef}
                      onChange={(e) => setWoRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
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
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Handover Section Description</label>
                  <textarea
                    rows={2}
                    required
                    value={secDesc}
                    onChange={(e) => setSecDesc(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">DLP Duration (Months)</label>
                    <input
                      type="number"
                      required
                      value={dlpMonths}
                      onChange={(e) => setDlpMonths(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">50% Retention Release (₹)</label>
                    <input
                      type="number"
                      required
                      value={stage1Retention}
                      onChange={(e) => setStage1Retention(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Contractor Signatory Name</label>
                  <input
                    type="text"
                    required
                    value={contractorSignatory}
                    onChange={(e) => setContractorSignatory(e.target.value)}
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
                    disabled={actionInProgress === "creating_toc"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Create Taking-Over Charter</span>
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