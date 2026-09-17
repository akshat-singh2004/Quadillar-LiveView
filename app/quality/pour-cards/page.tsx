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

export type ConcreteGrade =
  | "M20"
  | "M25"
  | "M30"
  | "M35"
  | "M40"
  | "M50"
  | "DESIGN_MIX_SPECIAL";

export type PourCardStatus =
  | "DRAFT_INSPECTION"
  | "CHECKLIST_CLEARED_QC"
  | "SEOR_APPROVED_FOR_POUR"
  | "POUR_IN_PROGRESS"
  | "POUR_COMPLETED_CUBES_CAST"
  | "REJECTED_REWORK";

export interface PourCardRecord {
  id: string;
  project_id: string;
  pour_card_number: string;
  work_order_ref: string;
  contractor_name: string;
  trade_package: string;
  structural_element: string;
  location_grid: string;
  concrete_grade: ConcreteGrade;
  planned_volume_cum: number;
  actual_poured_volume_cum: number;
  planned_pour_date: string;
  pour_start_time?: string | null;
  pour_end_time?: string | null;
  rebar_bbs_checked: boolean;
  cover_blocks_verified: boolean;
  formwork_plumb_staging_verified: boolean;
  mep_sleeves_embedded: boolean;
  construction_joints_treated: boolean;
  air_jetting_cleaned: boolean;
  designed_slump_mm: number;
  measured_slump_mm: number;
  cube_set_reference?: string | null;
  cube_samples_cast_count: number;
  contractor_qc_engineer: string;
  resident_seor_signatory?: string | null;
  approved_at?: string | null;
  status: PourCardStatus;
  pour_notes?: string | null;
  created_at?: string;
}

function normalizePourCard(d: any): PourCardRecord {
  return {
    id: d?.id ?? `pc-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    pour_card_number: d?.pour_card_number ?? `PC-${Date.now().toString().slice(-4)}`,
    work_order_ref: d?.work_order_ref ?? "WO-01",
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    structural_element: d?.structural_element ?? "Shear Core Wall & Lift Shaft",
    location_grid: d?.location_grid ?? "Tower A / Level 08 / Grid C3-D5",
    concrete_grade: (d?.concrete_grade as ConcreteGrade) ?? "M40",
    planned_volume_cum: Number(d?.planned_volume_cum ?? 24.5),
    actual_poured_volume_cum: Number(d?.actual_poured_volume_cum ?? 0),
    planned_pour_date: d?.planned_pour_date ?? new Date().toISOString().slice(0, 10),
    pour_start_time: d?.pour_start_time ?? null,
    pour_end_time: d?.pour_end_time ?? null,
    rebar_bbs_checked: Boolean(d?.rebar_bbs_checked),
    cover_blocks_verified: Boolean(d?.cover_blocks_verified),
    formwork_plumb_staging_verified: Boolean(d?.formwork_plumb_staging_verified),
    mep_sleeves_embedded: Boolean(d?.mep_sleeves_embedded),
    construction_joints_treated: Boolean(d?.construction_joints_treated),
    air_jetting_cleaned: Boolean(d?.air_jetting_cleaned),
    designed_slump_mm: Number(d?.designed_slump_mm ?? 140),
    measured_slump_mm: Number(d?.measured_slump_mm ?? 140),
    cube_set_reference: d?.cube_set_reference ?? `CUBE-${Date.now().toString().slice(-4)}`,
    cube_samples_cast_count: Number(d?.cube_samples_cast_count ?? 6),
    contractor_qc_engineer: d?.contractor_qc_engineer ?? "Contractor QA Lead",
    resident_seor_signatory: d?.resident_seor_signatory ?? null,
    approved_at: d?.approved_at ?? null,
    status: (d?.status as PourCardStatus) ?? "DRAFT_INSPECTION",
    pour_notes: d?.pour_notes ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalPourCardsPage() {
  const { project, role, tier } = useActiveRole();
  const [cards, setCards] = useState<PourCardRecord[]>([]);
  const [selectedCard, setSelectedCard] = useState<PourCardRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Resident SEOR";
  const isSeorOrConsultant =
    roleId === "RESIDENT_SEOR" ||
    roleId === "RESIDENT_ENGINEER" ||
    roleId === "PMC_LEAD" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PROJECT_DIRECTOR" ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Engineer") ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("Consultant");

  // Form State for Initiating New Pour Card
  const [cardNo, setCardNo] = useState(`PC-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
  const [element, setElement] = useState(
    tier === "RESIDENTIAL"
      ? "First Floor Balcony Dropped Slab & Perimeter Kerb"
      : "Tower A Level 08 Shear Core Wall (Grid C3-D5)"
  );
  const [grid, setGrid] = useState(tier === "RESIDENTIAL" ? "First Floor / Grid A1-B2" : "Tower A / Level 08 / Core 02");
  const [grade, setGrade] = useState<ConcreteGrade>(tier === "RESIDENTIAL" ? "M25" : "M40");
  const [volume, setVolume] = useState<number>(tier === "RESIDENTIAL" ? 4.5 : 28.5);
  const [woRef, setWoRef] = useState(tier === "RESIDENTIAL" ? "WO-RES-001" : "WO-TWR-101");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [slump, setSlump] = useState<number>(140);
  const [cubeRef, setCubeRef] = useState(`CUBE-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);

  const loadPourCards = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("concrete_pour_cards")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizePourCard(d));
        setCards(normalized);
        if (!selectedCard) setSelectedCard(normalized[0]);
      } else {
        const defaults: PourCardRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizePourCard({
                  id: "pc-res-01",
                  project_id: projectId,
                  pour_card_number: "PC-RES-088",
                  work_order_ref: "WO-RES-001",
                  contractor_name: "Royal Woodworks & Interiors",
                  trade_package: "Civil & Waterproofing",
                  structural_element: "Balcony Kerb & Sunken Slab Waterproof Coving",
                  location_grid: "First Floor / MB-02 Balcony",
                  concrete_grade: "M25",
                  planned_volume_cum: 3.5,
                  actual_poured_volume_cum: 3.5,
                  rebar_bbs_checked: true,
                  cover_blocks_verified: true,
                  formwork_plumb_staging_verified: true,
                  mep_sleeves_embedded: true,
                  construction_joints_treated: true,
                  air_jetting_cleaned: true,
                  designed_slump_mm: 120,
                  measured_slump_mm: 125,
                  cube_set_reference: "CUBE-RES-088",
                  contractor_qc_engineer: "Lead QA Engineer",
                  resident_seor_signatory: "Principal Architect",
                  approved_at: "2026-09-12T10:00:00Z",
                  status: "POUR_COMPLETED_CUBES_CAST",
                  pour_notes: "Cast with Sika Plastocrete integral waterproofing admixture. 6 cube samples cast.",
                }),
              ]
            : [
                normalizePourCard({
                  id: "pc-twr-01",
                  project_id: projectId,
                  pour_card_number: "PC-TWR-109",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  structural_element: "Level 08 Lift Core Shear Walls & Column Kickers",
                  location_grid: "Tower A / Level 08 / Grid C3-D5",
                  concrete_grade: "M40",
                  planned_volume_cum: 32.0,
                  actual_poured_volume_cum: 32.0,
                  rebar_bbs_checked: true,
                  cover_blocks_verified: true,
                  formwork_plumb_staging_verified: true,
                  mep_sleeves_embedded: true,
                  construction_joints_treated: true,
                  air_jetting_cleaned: true,
                  designed_slump_mm: 140,
                  measured_slump_mm: 145,
                  cube_set_reference: "CUBE-TWR-109",
                  contractor_qc_engineer: "S. K. Verma (QA/QC Head)",
                  resident_seor_signatory: "Resident SEOR",
                  approved_at: "2026-09-08T11:00:00Z",
                  status: "POUR_COMPLETED_CUBES_CAST",
                  pour_notes: "Pumped via Putzmeister stationary boom pump. Reconciled with batching plant docket #8812.",
                }),
                normalizePourCard({
                  id: "pc-twr-02",
                  project_id: projectId,
                  pour_card_number: "PC-TWR-110",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  structural_element: "Level 08 Post-Tensioned (PT) Deck Slab Phase-1",
                  location_grid: "Tower A / Level 08 / Deck Grid A1-D4",
                  concrete_grade: "M40",
                  planned_volume_cum: 78.0,
                  rebar_bbs_checked: true,
                  cover_blocks_verified: true,
                  formwork_plumb_staging_verified: true,
                  mep_sleeves_embedded: true,
                  construction_joints_treated: false,
                  air_jetting_cleaned: false,
                  designed_slump_mm: 140,
                  measured_slump_mm: 140,
                  cube_set_reference: "CUBE-TWR-110",
                  contractor_qc_engineer: "S. K. Verma (QA/QC Head)",
                  status: "DRAFT_INSPECTION",
                  pour_notes: "PT duct profiling inspected. Awaiting final air-jetting cleanout and SEOR sign-off.",
                }),
              ];

        setCards(defaults);
        if (!selectedCard) setSelectedCard(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedCard, tier]);

  useEffect(() => {
    void loadPourCards();

    const channel = supabase
      .channel(`pour_cards_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "concrete_pour_cards" }, () => void loadPourCards())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadPourCards]);

  const summary = useMemo(() => {
    const totalCards = cards.length;
    const approvedToPour = cards.filter(
      (c) => c.status === "SEOR_APPROVED_FOR_POUR" || c.status === "POUR_IN_PROGRESS"
    ).length;
    const completedPours = cards.filter((c) => c.status === "POUR_COMPLETED_CUBES_CAST").length;
    const pendingSeorAudit = cards.filter((c) => c.status === "DRAFT_INSPECTION" || c.status === "CHECKLIST_CLEARED_QC").length;

    return { totalCards, approvedToPour, completedPours, pendingSeorAudit };
  }, [cards]);

  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      const matchStatus = filterStatus === "ALL" || c.status === filterStatus;
      const haystack = `${c.pour_card_number} ${c.structural_element} ${c.location_grid} ${c.contractor_name}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [cards, filterStatus, search]);

  // Toggle Inspection Checklist Item
  const handleToggleChecklist = async (key: keyof PourCardRecord, currentVal: boolean) => {
    if (!selectedCard) return;
    const updatePayload = { [key]: !currentVal };

    try {
      await (supabase as any)
        .from("concrete_pour_cards")
        .update(updatePayload)
        .eq("id", selectedCard.id);
    } catch {
      // Local optimistic update
    }

    const updated = { ...selectedCard, ...updatePayload };
    setSelectedCard(updated);
    setCards((prev) => prev.map((c) => (c.id === selectedCard.id ? updated : c)));
  };

  // Stage 1: Contractor QA Clears Checklist
  const handleQcClear = async (card: PourCardRecord) => {
    setActionInProgress(`qc_${card.id}`);

    const updatePayload: Partial<PourCardRecord> = {
      status: "CHECKLIST_CLEARED_QC",
      contractor_qc_engineer: roleLabel || "Contractor QA Lead",
    };

    try {
      await (supabase as any)
        .from("concrete_pour_cards")
        .update(updatePayload)
        .eq("id", card.id);
    } catch {
      // Local optimistic update
    }

    setCards((prev) => prev.map((c) => (c.id === card.id ? ({ ...c, ...updatePayload } as PourCardRecord) : c)));
    if (selectedCard && selectedCard.id === card.id) {
      setSelectedCard((prev) => (prev ? ({ ...prev, ...updatePayload } as PourCardRecord) : null));
    }

    setFeedbackMessage(`Checklist cleared by QA. Transmitted to SEOR for Pre-Pour authorization.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Stage 2: Resident SEOR Sanctions Pre-Pour Gate
  const handleSeorSanction = async (card: PourCardRecord) => {
    if (!isSeorOrConsultant) return;
    setActionInProgress(`seor_${card.id}`);

    const updatePayload: Partial<PourCardRecord> = {
      status: "SEOR_APPROVED_FOR_POUR",
      resident_seor_signatory: roleLabel || "Resident SEOR",
      approved_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("concrete_pour_cards")
        .update(updatePayload)
        .eq("id", card.id);
    } catch {
      // Local optimistic update
    }

    setCards((prev) => prev.map((c) => (c.id === card.id ? ({ ...c, ...updatePayload } as PourCardRecord) : c)));
    if (selectedCard && selectedCard.id === card.id) {
      setSelectedCard((prev) => (prev ? ({ ...prev, ...updatePayload } as PourCardRecord) : null));
    }

    setFeedbackMessage(`SEOR Pre-Pour Sanction Granted! Batching plant dispatch unlocked.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Stage 3: Complete Pour & Cast Concrete Cubes (IS 516 Binding)
  const handleCompletePour = async (card: PourCardRecord) => {
    setActionInProgress(`complete_${card.id}`);

    const updatePayload: Partial<PourCardRecord> = {
      status: "POUR_COMPLETED_CUBES_CAST",
      actual_poured_volume_cum: card.planned_volume_cum,
      pour_end_time: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("concrete_pour_cards")
        .update(updatePayload)
        .eq("id", card.id);

      // Auto-insert cube test record into quality_cube_tests
      await (supabase as any).from("quality_cube_tests").insert([
        {
          project_id: projectId,
          sample_code: card.cube_set_reference || `CUBE-${card.pour_card_number}`,
          pour_card_ref: card.pour_card_number,
          structural_element: card.structural_element,
          location_grid: card.location_grid,
          concrete_grade: card.concrete_grade,
          sampling_date: new Date().toISOString().slice(0, 10),
          slump_measured_mm: card.measured_slump_mm,
          total_cubes_cast: card.cube_samples_cast_count,
          status: "CURING_IN_TANK",
          sampled_by: roleLabel || "Materials QA",
        },
      ]);
    } catch {
      // Local optimistic update
    }

    setCards((prev) => prev.map((c) => (c.id === card.id ? ({ ...c, ...updatePayload } as PourCardRecord) : c)));
    if (selectedCard && selectedCard.id === card.id) {
      setSelectedCard((prev) => (prev ? ({ ...prev, ...updatePayload } as PourCardRecord) : null));
    }

    setFeedbackMessage(`Pour concluded. Cube sample set (${card.cube_set_reference}) transferred to Curing Tank.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Create New Pour Card
  const handleCreatePourCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_card");

    const newDbRecord: Omit<PourCardRecord, "id"> = {
      project_id: projectId,
      pour_card_number: cardNo.trim(),
      work_order_ref: woRef.trim(),
      contractor_name: contractor.trim(),
      trade_package: tier === "RESIDENTIAL" ? "Civil & Waterproofing" : "Civil & Superstructure",
      structural_element: element.trim(),
      location_grid: grid.trim(),
      concrete_grade: grade,
      planned_volume_cum: Number(volume),
      actual_poured_volume_cum: 0,
      planned_pour_date: new Date().toISOString().slice(0, 10),
      rebar_bbs_checked: false,
      cover_blocks_verified: false,
      formwork_plumb_staging_verified: false,
      mep_sleeves_embedded: false,
      construction_joints_treated: false,
      air_jetting_cleaned: false,
      designed_slump_mm: Number(slump),
      measured_slump_mm: Number(slump),
      cube_set_reference: cubeRef.trim(),
      cube_samples_cast_count: 6,
      contractor_qc_engineer: roleLabel || "Contractor QA Lead",
      status: "DRAFT_INSPECTION",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("concrete_pour_cards")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizePourCard(data);
        setCards((prev) => [normalized, ...prev]);
        setSelectedCard(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizePourCard({ ...newDbRecord, id: `pc-${Date.now()}` });
      setCards((prev) => [fallback, ...prev]);
      setSelectedCard(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Printable CPWD Appendix 18 / Pour Card Dossier
  const handlePrintPourCard = (c: PourCardRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Concrete Pour Card &amp; Pre-Pour Certificate (CPWD Form 18 / IS 456) — ${c.pour_card_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .approved { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .draft { background: #fef3c7; color: #b45309; border: 1px solid #f59e0b; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tac { text-align: center; }
    .tar { text-align: right; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD Works Manual Section 18 / IS 456 Stage Gate</div>
      <h1 class="title">Statutory Concrete Pour Card Protocol (Form 18)</h1>
      <div class="meta">Pour Card Ref: ${c.pour_card_number} · Date: ${c.planned_pour_date} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${c.status === "SEOR_APPROVED_FOR_POUR" || c.status === "POUR_COMPLETED_CUBES_CAST" ? "approved" : "draft"}">${c.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Executing Contractor</th><td><strong>${c.contractor_name}</strong></td><th>Parent Work Order Ref</th><td><strong>${c.work_order_ref}</strong></td></tr>
    <tr><th>Structural Element</th><td><strong>${c.structural_element}</strong></td><th>Location Grid</th><td>${c.location_grid}</td></tr>
    <tr><th>Design Concrete Grade</th><td><strong>${c.concrete_grade}</strong></td><th>Planned Volume</th><td><strong>${c.planned_volume_cum} m³</strong></td></tr>
    <tr><th>Design Slump Requirement</th><td>${c.designed_slump_mm} mm (&plusmn;25 mm)</td><th>IS 516 Cube Set Ref</th><td><strong>${c.cube_set_reference || "Assigned at Pour"}</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Mandatory Six-Point Pre-Pour Structural Verification Gate</div>
    <div class="check-grid">
      <div class="check-item">1. Rebar &amp; BBS Spacing / Laps: <strong>${c.rebar_bbs_checked ? "VERIFIED (PASS)" : "NOT CLEARED"}</strong></div>
      <div class="check-item">2. Cover Blocks (IS 456 Specification): <strong>${c.cover_blocks_verified ? "VERIFIED (PASS)" : "NOT CLEARED"}</strong></div>
      <div class="check-item">3. Formwork Line, Plumb &amp; Staging Stability: <strong>${c.formwork_plumb_staging_verified ? "VERIFIED (PASS)" : "NOT CLEARED"}</strong></div>
      <div class="check-item">4. MEP Sleeves, Conduits &amp; Inserts: <strong>${c.mep_sleeves_embedded ? "VERIFIED (PASS)" : "NOT CLEARED"}</strong></div>
      <div class="check-item">5. Construction Joints Hacking &amp; Slurry: <strong>${c.construction_joints_treated ? "VERIFIED (PASS)" : "NOT CLEARED"}</strong></div>
      <div class="check-item">6. Air-Jetting &amp; Vacuum Cleanout: <strong>${c.air_jetting_cleaned ? "VERIFIED (PASS)" : "NOT CLEARED"}</strong></div>
    </div>
  </div>

  <div class="footer">
    <div>
      <div>Contractor QA/QC Lead</div>
      <div style="color: #64748b;">${c.contractor_qc_engineer}</div>
      <div class="sig">QA Inspection Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">${c.resident_seor_signatory || "Pre-Pour Sanction Granted"}</div>
      <div class="sig">SEOR Approval Seal</div>
    </div>
    <div>
      <div>Batching Plant In-Charge</div>
      <div style="color: #64748b;">Dispatch Authorized</div>
      <div class="sig">Plant Delivery Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedCard) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING CONCRETE POUR CARDS &amp; PRE-POUR STAGE GATE ENGINE...
      </div>
    );
  }

  const isPrePourApproved =
    selectedCard.status === "SEOR_APPROVED_FOR_POUR" ||
    selectedCard.status === "POUR_IN_PROGRESS" ||
    selectedCard.status === "POUR_COMPLETED_CUBES_CAST";
  const allChecklistCleared =
    selectedCard.rebar_bbs_checked &&
    selectedCard.cover_blocks_verified &&
    selectedCard.formwork_plumb_staging_verified &&
    selectedCard.mep_sleeves_embedded &&
    selectedCard.construction_joints_treated &&
    selectedCard.air_jetting_cleaned;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Quality Assurance · IS 456:2000 / CPWD Works Manual Section 18</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Concrete Pour Cards &amp; Pre-Pour Stage Gates
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Pre-pour structural inspection clearinghouse. Enforces mandatory six-point physical checks, mandates tripartite SEOR approval before RMC dispatch, and binds cube test samples under IS 516.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintPourCard(selectedCard)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Pour Card</span>
            </button>
            <Link
              href="/quality/cube-tests"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cube Break Tests</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setCardNo(`PC-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Initiate Pour Card</span>
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
              <span>Approved For Pour</span>
              <Flame className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {summary.approvedToPour} Pour(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">SEOR Pre-pour signed</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Completed Pours (Cubes Cast)</span>
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-cyan-300 mt-2">
              {summary.completedPours} Pours
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">IS 516 test samples curing</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Pending SEOR Inspection</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.pendingSeorAudit > 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {summary.pendingSeorAudit} Cards
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">RMC delivery held</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Pour Card Dockets</span>
              <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.totalCards} Cards
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CPWD Form 18 quality records</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Cards (${cards.length})` },
              { key: "SEOR_APPROVED_FOR_POUR", label: "SEOR Approved" },
              { key: "POUR_COMPLETED_CUBES_CAST", label: "Completed" },
              { key: "CHECKLIST_CLEARED_QC", label: "QC Cleared" },
              { key: "DRAFT_INSPECTION", label: "Draft Inspection" },
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

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search card, element, grid..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: POUR CARDS LISTING (7 cols) vs SIX-POINT CHECKLIST & SEOR GATE (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: POUR CARDS LISTING (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  CPWD Form 18 Pour Register
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Structural Pour Cards</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredCards.length} Pour Cards</span>
            </div>

            <div className="space-y-3">
              {filteredCards.map((card) => {
                const isSelected = selectedCard.id === card.id;
                const isApproved = card.status === "SEOR_APPROVED_FOR_POUR" || card.status === "POUR_COMPLETED_CUBES_CAST";

                return (
                  <div
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {card.pour_card_number}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-cyan-300 font-mono font-bold">
                          {card.concrete_grade}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          card.status === "POUR_COMPLETED_CUBES_CAST"
                            ? "bg-purple-950 text-purple-400 border border-purple-800/50"
                            : isApproved
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : card.status === "CHECKLIST_CLEARED_QC"
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {card.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-white">
                          {card.planned_volume_cum} m³
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Slump: {card.designed_slump_mm}mm
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{card.structural_element}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        Location: <strong className="text-zinc-200">{card.location_grid}</strong> &bull; {card.contractor_name}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Date: <strong className="text-zinc-300">{card.planned_pour_date}</strong></span>
                      <span>Cube Ref: <strong className="text-zinc-300">{card.cube_set_reference || "Assigned at Pour"}</strong></span>
                      <span>SEOR Sign: <strong className={card.resident_seor_signatory ? "text-emerald-400" : "text-amber-400"}>{card.resident_seor_signatory ? "Approved" : "Pending"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: SIX-POINT CHECKLIST & SEOR SANCTION DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Pre-Pour Inspection Gate
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedCard.pour_card_number}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isPrePourApproved
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : "bg-amber-950 text-amber-400 border border-amber-800/50"
              }`}>
                {selectedCard.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Member &amp; Location:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedCard.structural_element}</strong>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Design Concrete Grade:</span>
                  <span className="text-cyan-300 font-bold font-mono">{selectedCard.concrete_grade}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Planned Volume:</span>
                  <span className="text-white font-bold">{selectedCard.planned_volume_cum} m³</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Location Grid:</span>
                  <span className="text-white">{selectedCard.location_grid}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Cube Sample Set:</span>
                  <span className="text-zinc-200 font-bold">{selectedCard.cube_set_reference} (6 Cubes)</span>
                </div>
              </div>
            </div>

            {/* SIX-POINT CHECKLIST INTERACTIVE MATRIX */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                IS 456 Six-Point Physical Verification:
              </span>

              <div className="space-y-2 text-[11px]">
                {[
                  { key: "rebar_bbs_checked", label: "1. Rebar Bar Bending Schedule (BBS) & Laps", val: selectedCard.rebar_bbs_checked },
                  { key: "cover_blocks_verified", label: "2. Cover Blocks (IS 456 Thickness)", val: selectedCard.cover_blocks_verified },
                  { key: "formwork_plumb_staging_verified", label: "3. Formwork Line, Plumb & Staging Density", val: selectedCard.formwork_plumb_staging_verified },
                  { key: "mep_sleeves_embedded", label: "4. MEP Sleeves, Conduits & Box-Outs", val: selectedCard.mep_sleeves_embedded },
                  { key: "construction_joints_treated", label: "5. Construction Joint Hacking & Slurry", val: selectedCard.construction_joints_treated },
                  { key: "air_jetting_cleaned", label: "6. Air-Jetting & Vacuum Cleanout", val: selectedCard.air_jetting_cleaned },
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => handleToggleChecklist(item.key as keyof PourCardRecord, item.val)}
                    className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                      item.val
                        ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="font-bold">{item.val ? "VERIFIED" : "PENDING"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTION STAGE BUTTONS */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Stage-Gate Authorizations:
              </span>

              {/* Action 1: QA Engineer Clears Checklist */}
              {selectedCard.status === "DRAFT_INSPECTION" && (
                <button
                  type="button"
                  disabled={!allChecklistCleared || actionInProgress === `qc_${selectedCard.id}`}
                  onClick={() => handleQcClear(selectedCard)}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono disabled:opacity-50"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Clear Physical Checklist (Contractor QA Lead)</span>
                </button>
              )}

              {/* Action 2: SEOR Pre-Pour Sanction */}
              {selectedCard.status === "CHECKLIST_CLEARED_QC" && (
                <button
                  type="button"
                  disabled={!isSeorOrConsultant || actionInProgress === `seor_${selectedCard.id}`}
                  onClick={() => handleSeorSanction(selectedCard)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Grant Pre-Pour Approval &amp; Dispatch RMC (Resident SEOR)</span>
                </button>
              )}

              {/* Action 3: Complete Pour & Cast Cubes */}
              {selectedCard.status === "SEOR_APPROVED_FOR_POUR" && (
                <button
                  type="button"
                  disabled={actionInProgress === `complete_${selectedCard.id}`}
                  onClick={() => handleCompletePour(selectedCard)}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-purple-950/50 font-mono"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Pour &amp; Cast 6 Compressive Cubes (IS 516)</span>
                </button>
              )}

              {selectedCard.status === "POUR_COMPLETED_CUBES_CAST" && (
                <div className="p-3.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Concrete Poured &bull; Cubes Transferred to Water Tank</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Sample Set <strong className="text-white font-mono">{selectedCard.cube_set_reference}</strong> linked to Cube Break register for 7-day and 28-day testing.
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              IS 456:2000 &amp; CPWD Works Manual Section 18 Protocol
            </div>
          </div>

        </div>

        {/* INITIATE POUR CARD MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Initiate Concrete Pour Card (Form 18)
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

              <form onSubmit={handleCreatePourCard} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Pour Card Ref</label>
                    <input
                      type="text"
                      required
                      value={cardNo}
                      onChange={(e) => setCardNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Concrete Grade</label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value as ConcreteGrade)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="M20">M20 Grade</option>
                      <option value="M25">M25 Grade</option>
                      <option value="M30">M30 Grade</option>
                      <option value="M35">M35 Grade</option>
                      <option value="M40">M40 Grade</option>
                      <option value="M50">M50 High Strength</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Structural Member Description</label>
                  <input
                    type="text"
                    required
                    value={element}
                    onChange={(e) => setElement(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
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
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Planned Volume (m³)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Design Slump (mm)</label>
                    <input
                      type="number"
                      required
                      value={slump}
                      onChange={(e) => setSlump(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Cube Sample Set Ref</label>
                    <input
                      type="text"
                      required
                      value={cubeRef}
                      onChange={(e) => setCubeRef(e.target.value)}
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
                    disabled={actionInProgress === "creating_card"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Create Pour Card Docket</span>
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