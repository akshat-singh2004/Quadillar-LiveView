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
  FileCheck,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  HelpCircle,
  Layers,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  Scale,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  Wrench,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type RfiPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL_BLOCKER";

export type RfiStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "ANSWERED"
  | "CLOSED_CONCURRED"
  | "REJECTED_OUT_OF_SCOPE";

export interface RfiRecord {
  id: string;
  project_id: string;
  rfi_number: string;
  title: string;
  discipline: string;
  location_grid: string;
  drawing_reference: string;
  specification_clause?: string | null;
  contractor_entity: string;
  question_text: string;
  suggested_solution?: string | null;
  response_text?: string | null;
  priority: RfiPriority;
  status: RfiStatus;
  cost_impact: boolean;
  schedule_impact: boolean;
  potential_variation_inr: number;
  potential_delay_days: number;
  linked_hindrance_number?: string | null;
  linked_variation_number?: string | null;
  sla_target_date: string;
  response_date?: string | null;
  assigned_consultant: string;
  responded_by?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function normalizeRfi(d: any): RfiRecord {
  const number = d?.rfi_number ?? `RFI-${Date.now().toString().slice(-4)}`;

  return {
    id: d?.id ?? `rfi-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    rfi_number: number,
    title: d?.title ?? "Technical Query Logged",
    discipline: d?.discipline ?? "Structural",
    location_grid: d?.location_grid ?? "Site Grid",
    drawing_reference: d?.drawing_reference ?? "GFC-01",
    specification_clause: d?.specification_clause ?? null,
    contractor_entity: d?.contractor_entity ?? "Executing Contractor",
    question_text: d?.question_text ?? "Technical design clarification requested.",
    suggested_solution: d?.suggested_solution ?? null,
    response_text: d?.response_text ?? null,
    priority: (d?.priority as RfiPriority) ?? "HIGH",
    status: (d?.status as RfiStatus) ?? "OPEN",
    cost_impact: Boolean(d?.cost_impact),
    schedule_impact: Boolean(d?.schedule_impact),
    potential_variation_inr: Number(d?.potential_variation_inr ?? 0),
    potential_delay_days: Number(d?.potential_delay_days ?? 0),
    linked_hindrance_number: d?.linked_hindrance_number ?? null,
    linked_variation_number: d?.linked_variation_number ?? null,
    sla_target_date: d?.sla_target_date ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    response_date: d?.response_date ?? null,
    assigned_consultant: d?.assigned_consultant ?? "Resident SEOR",
    responded_by: d?.responded_by ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalRfiPage() {
  const { project, role, tier } = useActiveRole();
  const [rfis, setRfis] = useState<RfiRecord[]>([]);
  const [selectedRfi, setSelectedRfi] = useState<RfiRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Response form inside audit desk
  const [responseText, setResponseText] = useState("");

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Resident SEOR";
  const isConsultantOrEngineer =
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleId === "RESIDENT_ENGINEER" ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Engineer") ||
    roleLabel.includes("Director") ||
    roleLabel.includes("Lead");

  // Form State for Creating New RFI
  const [rfiNumber, setRfiNumber] = useState(
    `RFI-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [rfiTitle, setRfiTitle] = useState(
    tier === "RESIDENTIAL"
      ? "Plumbing Core Penetration Clash with Balcony Upstand Beam"
      : "Chiller Riser Core Penstock Rebar Clash with Main Tension Steels"
  );
  const [discipline, setDiscipline] = useState(tier === "RESIDENTIAL" ? "MEP / Plumbing" : "Structural / Civil");
  const [locationGrid, setLocationGrid] = useState(
    tier === "RESIDENTIAL" ? "Balcony Deck FB-01" : "Tower A / Level 08 / Axis C2-D4"
  );
  const [drawingRef, setDrawingRef] = useState(
    tier === "RESIDENTIAL" ? "GFC-PL-FB01-REV02" : "GFC-STR-LVL08-REV03"
  );
  const [specClause, setSpecClause] = useState("IS 456 Cl. 26.4 / MEP Specs Section 15");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Avadh MEP Solutions" : "Narmada Concrete Works"
  );
  const [priority, setPriority] = useState<RfiPriority>("CRITICAL_BLOCKER");
  const [questionText, setQuestionText] = useState(
    tier === "RESIDENTIAL"
      ? "110mm soil pipe penetration conflicts with 250mm wide RC kerb. Requesting approval to sleeve through or cast a localized step."
      : "Chiller riser opening directly shears main column tension laps per Rev-03. Concrete pour card PC-TWR-109 is on hold until resolved."
  );
  const [suggestedSolution, setSuggestedSolution] = useState(
    tier === "RESIDENTIAL"
      ? "Sleeve with heavy-duty PVC pipe and add 2 nos 12mm diagonal trim rebars."
      : "Shift core penetration 350mm east towards unconfined shear wall web zone per detail SK-STR-88."
  );
  const [costImpact, setCostImpact] = useState(true);
  const [scheduleImpact, setScheduleImpact] = useState(true);
  const [potentialVariation, setPotentialVariation] = useState<number>(tier === "RESIDENTIAL" ? 8500 : 85000);
  const [potentialDelay, setPotentialDelay] = useState<number>(tier === "RESIDENTIAL" ? 3 : 5);

  const loadRfis = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("requests_for_information")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeRfi(d));
        setRfis(normalized);
        if (!selectedRfi) setSelectedRfi(normalized[0]);
      } else {
        const defaults: RfiRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeRfi({
                  id: "rfi-res-01",
                  project_id: projectId,
                  rfi_number: "RFI-RES-014",
                  title: "Profile Lighting Recess Depth vs False Ceiling Framing",
                  discipline: "Electrical & Interiors",
                  location_grid: "Master Bedroom / MB-02",
                  drawing_reference: "GFC-INT-MB02-REV03",
                  specification_clause: "Interiors Section 09200",
                  contractor_entity: "Royal Woodworks & Interiors",
                  question_text: "Specified 35mm deep magnetic track profile clashes with perimeter GI ceiling cross-channel.",
                  suggested_solution: "Use 20mm slimline architectural channel with high-efficiency diffused LED tape.",
                  response_text: "Approved slimline 20mm profile. Contractor to submit physical mock-up prior to mass installation.",
                  priority: "HIGH",
                  status: "ANSWERED",
                  cost_impact: false,
                  schedule_impact: false,
                  sla_target_date: "2026-09-12",
                  response_date: "2026-09-11",
                  assigned_consultant: "Principal Architect",
                  responded_by: "Principal Architect",
                }),
                normalizeRfi({
                  id: "rfi-res-02",
                  project_id: projectId,
                  rfi_number: "RFI-RES-015",
                  title: "Concealed Diverter Depth in AAC Block Wall",
                  discipline: "Plumbing & Sanitary",
                  location_grid: "Guest Bath / PB-01",
                  drawing_reference: "GFC-PL-PB01-REV01",
                  specification_clause: "CPWD Specs Section 19",
                  contractor_entity: "Avadh MEP Solutions",
                  question_text: "Kohler body diverter requires 75mm cavity depth, leaving only 25mm block web thickness behind niche.",
                  suggested_solution: "Construct localized 75mm brick backing or apply chicken mesh reinforced plaster.",
                  priority: "CRITICAL_BLOCKER",
                  status: "OPEN",
                  cost_impact: true,
                  schedule_impact: true,
                  potential_variation_inr: 4500,
                  potential_delay_days: 3,
                  sla_target_date: "2026-09-18",
                  assigned_consultant: "Principal Architect",
                }),
              ]
            : [
                normalizeRfi({
                  id: "rfi-twr-01",
                  project_id: projectId,
                  rfi_number: "RFI-TWR-104",
                  title: "Chiller Riser Core Penetration Conflict with Shear Wall Tension Steels",
                  discipline: "Structural / MEP Interface",
                  location_grid: "Tower A / Level 08 / Axis C2-D4",
                  drawing_reference: "GFC-STR-LVL08-REV03",
                  specification_clause: "IS 456 Cl. 26.4 / SP 34",
                  contractor_entity: "Narmada Concrete Works",
                  question_text: "600x400mm chiller riser opening cuts directly through 8 nos 25mm Fe500D main shear wall vertical bars.",
                  suggested_solution: "Shift penetration 350mm east towards unconfined web zone per sketch SK-STR-88.",
                  priority: "CRITICAL_BLOCKER",
                  status: "OPEN",
                  cost_impact: true,
                  schedule_impact: true,
                  potential_variation_inr: 85000,
                  potential_delay_days: 5,
                  sla_target_date: "2026-09-15",
                  assigned_consultant: "Resident SEOR",
                }),
                normalizeRfi({
                  id: "rfi-twr-02",
                  project_id: projectId,
                  rfi_number: "RFI-TWR-102",
                  title: "PT Strand Anchorage Pocket Clear Cover Clarification",
                  discipline: "Post-Tensioned Superstructure",
                  location_grid: "Tower A / Level 07 PT Deck Slab",
                  drawing_reference: "GFC-PT-LVL07-REV02",
                  specification_clause: "IS 1343:2012 Cl. 12",
                  contractor_entity: "Narmada Concrete Works",
                  question_text: "Dead-end anchorage block pocket conflicts with edge beam stirrup arrangement.",
                  suggested_solution: "Reduce anchor block edge chamfer by 15mm while maintaining 40mm cover.",
                  response_text: "Concurred per amended sketch SK-PT-14. Ensure non-shrink high-strength grout (fck 50 MPa) applied to pocket.",
                  priority: "HIGH",
                  status: "CLOSED_CONCURRED",
                  cost_impact: false,
                  schedule_impact: false,
                  sla_target_date: "2026-08-27",
                  response_date: "2026-08-26",
                  assigned_consultant: "Resident SEOR",
                  responded_by: "Resident SEOR",
                }),
              ];

        setRfis(defaults);
        if (!selectedRfi) setSelectedRfi(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedRfi, tier]);

  useEffect(() => {
    void loadRfis();

    const channel = supabase
      .channel(`rfis_realtime_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "requests_for_information" }, () => void loadRfis())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadRfis]);

  // Metric Summaries
  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const totalCount = rfis.length;
    const openCount = rfis.filter((r) => r.status === "OPEN" || r.status === "UNDER_REVIEW").length;
    const criticalCount = rfis.filter(
      (r) => r.priority === "CRITICAL_BLOCKER" && r.status !== "CLOSED_CONCURRED"
    ).length;
    const overdueCount = rfis.filter(
      (r) => (r.status === "OPEN" || r.status === "UNDER_REVIEW") && r.sla_target_date < today
    ).length;

    return { totalCount, openCount, criticalCount, overdueCount };
  }, [rfis]);

  const filteredRfis = useMemo(() => {
    return rfis.filter((r) => {
      const matchStatus = filterStatus === "ALL" || r.status === filterStatus;
      const matchPriority = filterPriority === "ALL" || r.priority === filterPriority;
      const haystack = `${r.rfi_number} ${r.title} ${r.location_grid} ${r.drawing_reference} ${r.contractor_entity}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchPriority && matchSearch;
    });
  }, [rfis, filterStatus, filterPriority, search]);

  // Submit Official Engineering Determination
  const handleAnswerRfi = async () => {
    if (!selectedRfi || !responseText.trim() || !isConsultantOrEngineer) return;
    setActionInProgress(`answer_${selectedRfi.id}`);

    const updatePayload: Partial<RfiRecord> = {
      response_text: responseText.trim(),
      response_date: new Date().toISOString().slice(0, 10),
      status: "ANSWERED",
      responded_by: roleLabel || "Resident SEOR",
    };

    try {
      await (supabase as any)
        .from("requests_for_information")
        .update(updatePayload)
        .eq("id", selectedRfi.id);
    } catch {
      // Local optimistic update
    }

    setRfis((prev) =>
      prev.map((r) => (r.id === selectedRfi.id ? ({ ...r, ...updatePayload } as RfiRecord) : r))
    );
    setSelectedRfi((prev) => (prev ? ({ ...prev, ...updatePayload } as RfiRecord) : null));
    setResponseText("");
    setFeedbackMessage(`Official technical determination issued for ${selectedRfi.rfi_number}.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Close Concurred
  const handleCloseRfi = async (rfiId: string) => {
    setActionInProgress(rfiId);
    const updatePayload: Partial<RfiRecord> = { status: "CLOSED_CONCURRED" };

    try {
      await (supabase as any)
        .from("requests_for_information")
        .update(updatePayload)
        .eq("id", rfiId);
    } catch {
      // Local optimistic update
    }

    setRfis((prev) =>
      prev.map((r) => (r.id === rfiId ? ({ ...r, ...updatePayload } as RfiRecord) : r))
    );
    if (selectedRfi && selectedRfi.id === rfiId) {
      setSelectedRfi((prev) => (prev ? ({ ...prev, ...updatePayload } as RfiRecord) : null));
    }
    setActionInProgress(null);
  };

  // 1-Click Escalation into DPR Hindrance Register
  const handleEscalateToHindrance = async (rfi: RfiRecord) => {
    setActionInProgress(`hindrance_${rfi.id}`);
    const hindranceNo = `HND-${rfi.rfi_number.replace("RFI-", "")}`;

    try {
      await (supabase as any).from("site_hindrance_register").insert([
        {
          project_id: projectId,
          hindrance_number: hindranceNo,
          category: "GFC_DRAWING_DELAY",
          description: `Delayed technical determination on ${rfi.rfi_number}: ${rfi.title}`,
          affected_grid_element: rfi.location_grid,
          start_date: rfi.sla_target_date,
          days_hindered: rfi.potential_delay_days || 4,
          critical_path_impact: true,
          status: "OPEN",
          remedial_measures: `Notice served per FIDIC Cl. 1.9 / CPWD. Escalated to ${rfi.assigned_consultant}.`,
        },
      ]);

      await (supabase as any)
        .from("requests_for_information")
        .update({ linked_hindrance_number: hindranceNo })
        .eq("id", rfi.id);

      setRfis((prev) =>
        prev.map((r) => (r.id === rfi.id ? { ...r, linked_hindrance_number: hindranceNo } : r))
      );
      if (selectedRfi && selectedRfi.id === rfi.id) {
        setSelectedRfi((prev) => (prev ? { ...prev, linked_hindrance_number: hindranceNo } : null));
      }

      setFeedbackMessage(`SLA delay notice logged in Statutory Hindrance Register (${hindranceNo}). Defends EOT claim.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch {
      setFeedbackMessage("Failed to log hindrance entry in database.");
      setTimeout(() => setFeedbackMessage(null), 4000);
    }

    setActionInProgress(null);
  };

  // 1-Click Bridge to Contract Variations
  const handlePromoteToVariation = async (rfi: RfiRecord) => {
    setActionInProgress(`variation_${rfi.id}`);
    const voNo = `VO-${rfi.rfi_number.replace("RFI-", "")}`;

    try {
      await (supabase as any).from("contract_variations").insert([
        {
          project_id: projectId,
          variation_number: voNo,
          title: `Scope Alteration: ${rfi.title}`,
          classification: "EXTRA_NON_BOQ_ITEM",
          contractor_entity: rfi.contractor_entity,
          trade_package: rfi.discipline,
          schedule_item_ref: `SOR-${rfi.rfi_number}`,
          scope_description: `Instruction resulting from ${rfi.rfi_number}: ${rfi.response_text || rfi.question_text}`,
          technical_justification: `Engineering determination issued by ${rfi.assigned_consultant}.`,
          revised_sanctioned_qty: 1,
          unit: "Item",
          analyzed_unit_rate_inr: rfi.potential_variation_inr,
          net_cost_impact_inr: rfi.potential_variation_inr,
          basic_material_cost_inr: Math.round(rfi.potential_variation_inr * 0.65),
          direct_labour_cost_inr: Math.round(rfi.potential_variation_inr * 0.2),
          water_charges_pct: 1.0,
          contractor_profit_overhead_pct: 15.0,
          eot_days_claimed: rfi.potential_delay_days,
          eot_days_granted: 0,
          status: "DRAFT",
        },
      ]);

      await (supabase as any)
        .from("requests_for_information")
        .update({ linked_variation_number: voNo })
        .eq("id", rfi.id);

      setRfis((prev) =>
        prev.map((r) => (r.id === rfi.id ? { ...r, linked_variation_number: voNo } : r))
      );
      if (selectedRfi && selectedRfi.id === rfi.id) {
        setSelectedRfi((prev) => (prev ? { ...prev, linked_variation_number: voNo } : null));
      }

      setFeedbackMessage(`Draft Variation Order (${voNo}) generated in Variations Ledger.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch {
      setFeedbackMessage("Failed to generate Variation Order.");
      setTimeout(() => setFeedbackMessage(null), 4000);
    }

    setActionInProgress(null);
  };

  // Create New RFI
  const handleCreateRfi = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_rfi");

    const newDbRecord: Omit<RfiRecord, "id"> = {
      project_id: projectId,
      rfi_number: rfiNumber.trim(),
      title: rfiTitle.trim(),
      discipline: discipline.trim(),
      location_grid: locationGrid.trim(),
      drawing_reference: drawingRef.trim(),
      specification_clause: specClause.trim(),
      contractor_entity: contractor.trim(),
      question_text: questionText.trim(),
      suggested_solution: suggestedSolution.trim(),
      priority,
      status: "OPEN",
      cost_impact: costImpact,
      schedule_impact: scheduleImpact,
      potential_variation_inr: Number(potentialVariation),
      potential_delay_days: Number(potentialDelay),
      sla_target_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      assigned_consultant: tier === "RESIDENTIAL" ? "Principal Architect" : "Resident SEOR",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("requests_for_information")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeRfi(data);
        setRfis((prev) => [normalized, ...prev]);
        setSelectedRfi(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeRfi({ ...newDbRecord, id: `rfi-${Date.now()}` });
      setRfis((prev) => [fallback, ...prev]);
      setSelectedRfi(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Printable CPWD / FIDIC RFI Dossier
  const handlePrintRfi = (rfi: RfiRecord) => {
    const printWin = window.open("", "_blank", "width=1000,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Request for Information (RFI) — ${rfi.rfi_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 10px; }
    .critical { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
    .answered { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-top: 14px; background: #fafafa; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 40px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · FIDIC Cl. 1.9 / CPWD Works Manual Section 2</div>
      <h1 class="title">Request for Information &amp; Technical Instruction (RFI)</h1>
      <div class="meta">RFI Number: ${rfi.rfi_number} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${rfi.status === "ANSWERED" || rfi.status === "CLOSED_CONCURRED" ? "answered" : "critical"}">
      ${rfi.status.replace(/_/g, " ")}
    </span>
  </div>

  <table>
    <tr><th>Executing Contractor</th><td><strong>${rfi.contractor_entity}</strong></td><th>Technical Discipline</th><td>${rfi.discipline}</td></tr>
    <tr><th>Structural / Room Grid</th><td><strong>${rfi.location_grid}</strong></td><th>Target Drawing Reference</th><td><strong>${rfi.drawing_reference}</strong></td></tr>
    <tr><th>Specification Clause</th><td>${rfi.specification_clause || "Standard CPWD / IS Codes"}</td><th>Assigned Consultant</th><td><strong>${rfi.assigned_consultant}</strong></td></tr>
    <tr><th>SLA Response Target Date</th><td><strong>${rfi.sla_target_date}</strong></td><th>Priority Ranking</th><td><strong>${rfi.priority.replace(/_/g, " ")}</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Factual Technical Query / Clashing Ambiguity</div>
    <div>${rfi.question_text}</div>
  </div>

  ${rfi.suggested_solution ? `
  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Proposed Contractor Resolution</div>
    <div>${rfi.suggested_solution}</div>
  </div>` : ""}

  <div class="box" style="background: ${rfi.response_text ? "#f0fdf4" : "#fef2f2"}; border-color: ${rfi.response_text ? "#86efac" : "#fca5a5"};">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: ${rfi.response_text ? "#166534" : "#991b1b"}; margin-bottom: 4px;">
      Official Consultant Technical Determination / Instruction
    </div>
    <div style="font-size: 12px; font-weight: 500;">
      ${rfi.response_text || "Awaiting formal engineering determination from assigned consultant."}
    </div>
    ${rfi.response_date ? `<div style="margin-top: 6px; font-size: 10px; color: #64748b;">Issued on ${rfi.response_date} by ${rfi.responded_by || rfi.assigned_consultant}</div>` : ""}
  </div>

  <div class="footer">
    <div>
      <div>Subcontractor Lead Engineer</div>
      <div style="color: #64748b;">${rfi.contractor_entity}</div>
      <div class="sig">Contractor Originator Sign</div>
    </div>
    <div>
      <div>Resident SEOR / Principal Architect</div>
      <div style="color: #64748b;">${rfi.responded_by || rfi.assigned_consultant}</div>
      <div class="sig">Engineering Determination Seal</div>
    </div>
    <div>
      <div>PMC Project Director</div>
      <div style="color: #64748b;">Variation &amp; Schedule impact verified.</div>
      <div class="sig">Client Acknowledgment</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedRfi) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING REQUESTS FOR INFORMATION &amp; ENGINEERING QUERY REGISTER...
      </div>
    );
  }

  const isAnswered = selectedRfi.status === "ANSWERED" || selectedRfi.status === "CLOSED_CONCURRED";
  const isOverdue =
    (selectedRfi.status === "OPEN" || selectedRfi.status === "UNDER_REVIEW") &&
    selectedRfi.sla_target_date < new Date().toISOString().slice(0, 10);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Engineering Governance · FIDIC Cl. 1.9 / CPWD Section 2</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Requests for Information (RFI) &amp; Design Instructions
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Strict design clarification tracking. Response delays automatically bridge into the Statutory Hindrance Register to legally substantiate Extension of Time (EOT) claims.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintRfi(selectedRfi)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print RFI Sheet</span>
            </button>
            <Link
              href="/operations/dpr"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>Audit Hindrances</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setRfiNumber(`RFI-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Log Technical Query (RFI)</span>
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

        {/* 4 PRIMARY METRIC GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total RFIs Recorded</span>
              <FileQuestion className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {summary.totalCount} Queries
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Managed under FIDIC Clause 1.9</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Pending Clarification</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-400 mt-2">
              {summary.openCount} Under Review
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Awaiting consultant determination</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Critical Pour Blockers</span>
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold font-mono mt-2 ${summary.criticalCount > 0 ? "text-rose-400" : "text-zinc-400"}`}>
              {summary.criticalCount} Critical
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Blocks active Pour Card sign-off</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Overdue SLA Breaches</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold font-mono mt-2 ${summary.overdueCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {summary.overdueCount > 0 ? `${summary.overdueCount} Breached` : "Zero Delays"}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Directly feeds Hindrance Register EOT</div>
          </div>
        </div>

        {/* SLA BREACH CALLOUT BANNER */}
        {summary.overdueCount > 0 && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <strong className="text-rose-200 text-xs uppercase tracking-wider block font-mono">
                  FIDIC Clause 1.9 SLA Breach: Delayed Drawings / Instructions
                </strong>
                <span className="text-xs text-rose-300/80">
                  {summary.overdueCount} RFIs have breached their contractual response SLA. Click below to escalate these items into the Statutory Hindrance Register to substantiate the project Extension of Time (EOT) claim.
                </span>
              </div>
            </div>
            <Link
              href="/operations/dpr"
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 transition font-mono"
            >
              Open Hindrance Register
            </Link>
          </div>
        )}

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All RFIs (${rfis.length})` },
              { key: "OPEN", label: "Open Intake" },
              { key: "ANSWERED", label: "Answered" },
              { key: "CLOSED_CONCURRED", label: "Closed & Concurred" },
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
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL_BLOCKER">Critical Blocker</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search RFI, drawing, grid..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: RFI ROSTER (7 cols) vs TECHNICAL DETERMINATION DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: RFI REGISTRY (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Technical Clarification Ledger
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">RFI Inward &amp; Review Schedule</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredRfis.length} Queries</span>
            </div>

            <div className="space-y-3">
              {filteredRfis.map((rfi) => {
                const isSelected = selectedRfi.id === rfi.id;
                const isCritical = rfi.priority === "CRITICAL_BLOCKER";
                const isItemAnswered = rfi.status === "ANSWERED" || rfi.status === "CLOSED_CONCURRED";
                const itemOverdue =
                  (rfi.status === "OPEN" || rfi.status === "UNDER_REVIEW") &&
                  rfi.sla_target_date < new Date().toISOString().slice(0, 10);

                return (
                  <div
                    key={rfi.id}
                    onClick={() => setSelectedRfi(rfi)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {rfi.rfi_number}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isCritical
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                            : rfi.priority === "HIGH"
                            ? "bg-amber-950 text-amber-400 border border-amber-800/50"
                            : "bg-zinc-800 text-zinc-300"
                        }`}>
                          {rfi.priority.replace(/_/g, " ")}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isItemAnswered
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : itemOverdue
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                            : "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                        }`}>
                          {rfi.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <span className={`text-xs font-mono font-bold ${itemOverdue ? "text-rose-400" : "text-zinc-400"}`}>
                        SLA: {rfi.sla_target_date} {itemOverdue && "[BREACHED]"}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{rfi.title}</div>
                      <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{rfi.question_text}</div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Ref: <strong className="text-zinc-300">{rfi.drawing_reference}</strong></span>
                      <span>Grid: <strong className="text-zinc-300">{rfi.location_grid}</strong></span>
                      <span>Discipline: <strong className="text-cyan-300">{rfi.discipline}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: TECHNICAL DETERMINATION AUDIT DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Technical Clarification Sheet
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedRfi.rfi_number}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isAnswered
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : isOverdue
                  ? "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                  : "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
              }`}>
                {selectedRfi.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Query Subject:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedRfi.title}</strong>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Drawing Reference:</span>
                  <span className="text-cyan-300 font-bold">{selectedRfi.drawing_reference}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Location Grid:</span>
                  <span className="text-zinc-200">{selectedRfi.location_grid}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/60">
                <span className="text-zinc-500 text-[10px] uppercase block">Contractor Technical Query:</span>
                <p className="text-zinc-200 font-sans text-xs mt-1 leading-relaxed">{selectedRfi.question_text}</p>
              </div>

              {selectedRfi.suggested_solution && (
                <div className="pt-2 border-t border-zinc-800/60">
                  <span className="text-zinc-500 text-[10px] uppercase block">Contractor Proposed Solution:</span>
                  <p className="text-zinc-300 font-sans text-xs mt-1 leading-relaxed">{selectedRfi.suggested_solution}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Assigned Consultant:</span>
                  <span className="text-white font-bold">{selectedRfi.assigned_consultant}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Target SLA Date:</span>
                  <span className={isOverdue ? "text-rose-400 font-bold" : "text-zinc-200"}>
                    {selectedRfi.sla_target_date}
                  </span>
                </div>
              </div>
            </div>

            {/* OFFICIAL CONSULTANT DETERMINATION BOX */}
            {selectedRfi.response_text ? (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span>Official Engineering Determination</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-zinc-200 font-sans text-xs leading-relaxed pt-1">
                  {selectedRfi.response_text}
                </p>
                <div className="text-[10px] text-zinc-400 pt-1 border-t border-emerald-900/60">
                  Issued by {selectedRfi.responded_by || selectedRfi.assigned_consultant} on {selectedRfi.response_date}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-zinc-400 text-xs font-mono">
                  Issue Consultant Technical Determination (SEOR / Architect):
                </label>
                <textarea
                  rows={3}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Provide definitive engineering instruction, sketch reference, or approved deviation..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white text-xs outline-none focus:border-cyan-400 font-sans resize-none"
                />
                <button
                  type="button"
                  disabled={!responseText.trim() || !isConsultantOrEngineer || actionInProgress === `answer_${selectedRfi.id}`}
                  onClick={handleAnswerRfi}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Issue Official Determination</span>
                </button>
              </div>
            )}

            {/* STATUTORY CROSS-MODULE BRIDGES */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Statutory Interlock Actions:
              </span>

              {/* Bridge 1: Escalate to Hindrance Register */}
              {!selectedRfi.linked_hindrance_number ? (
                <button
                  type="button"
                  disabled={actionInProgress === `hindrance_${selectedRfi.id}`}
                  onClick={() => handleEscalateToHindrance(selectedRfi)}
                  className="w-full py-2 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 text-rose-400 border border-rose-800/50 text-xs font-bold transition flex items-center justify-center gap-1.5 font-mono"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Log Delay in Hindrance Register (EOT)</span>
                </button>
              ) : (
                <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 font-mono text-xs flex items-center justify-between">
                  <span>Linked Hindrance: {selectedRfi.linked_hindrance_number}</span>
                  <Link href="/operations/dpr" className="text-[10px] text-rose-400 underline">
                    View in DPR &rarr;
                  </Link>
                </div>
              )}

              {/* Bridge 2: Promote to Variation Order */}
              {selectedRfi.cost_impact && !selectedRfi.linked_variation_number && (
                <button
                  type="button"
                  disabled={actionInProgress === `variation_${selectedRfi.id}`}
                  onClick={() => handlePromoteToVariation(selectedRfi)}
                  className="w-full py-2 rounded-xl bg-cyan-950/30 hover:bg-cyan-950/50 text-cyan-400 border border-cyan-800/50 text-xs font-bold transition flex items-center justify-center gap-1.5 font-mono"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Promote Instruction to Variation Order (VO)</span>
                </button>
              )}

              {selectedRfi.linked_variation_number && (
                <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 font-mono text-xs flex items-center justify-between">
                  <span>Linked Variation: {selectedRfi.linked_variation_number}</span>
                  <Link href="/contracts/variations" className="text-[10px] text-cyan-400 underline">
                    View in Variations &rarr;
                  </Link>
                </div>
              )}

              {/* Concurrence Final Button */}
              {selectedRfi.status === "ANSWERED" && (
                <button
                  type="button"
                  disabled={actionInProgress === selectedRfi.id}
                  onClick={() => handleCloseRfi(selectedRfi.id)}
                  className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 font-mono"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Close RFI &bull; Contractor Concurred</span>
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              FIDIC Clause 1.9 &amp; CPWD Section 2 Engineering Protocol
            </div>
          </div>

        </div>

        {/* LOG NEW RFI MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileQuestion className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Log Request for Information (RFI)
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

              <form onSubmit={handleCreateRfi} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">RFI Number</label>
                    <input
                      type="text"
                      required
                      value={rfiNumber}
                      onChange={(e) => setRfiNumber(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Priority Level</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as RfiPriority)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="CRITICAL_BLOCKER">Critical Blocker</option>
                      <option value="HIGH">High Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="LOW">Low Priority</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">RFI Title</label>
                  <input
                    type="text"
                    required
                    value={rfiTitle}
                    onChange={(e) => setRfiTitle(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Discipline</label>
                    <input
                      type="text"
                      required
                      value={discipline}
                      onChange={(e) => setDiscipline(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Location Grid</label>
                    <input
                      type="text"
                      required
                      value={locationGrid}
                      onChange={(e) => setLocationGrid(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Drawing Reference</label>
                    <input
                      type="text"
                      required
                      value={drawingRef}
                      onChange={(e) => setDrawingRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Specification Clause</label>
                    <input
                      type="text"
                      value={specClause}
                      onChange={(e) => setSpecClause(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
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

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Factual Question / Ambiguity</label>
                  <textarea
                    rows={2}
                    required
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Contractor Suggested Solution</label>
                  <textarea
                    rows={2}
                    value={suggestedSolution}
                    onChange={(e) => setSuggestedSolution(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>

                {/* IMPACT TOGGLES */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 font-mono text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-200">
                    <input
                      type="checkbox"
                      checked={costImpact}
                      onChange={(e) => setCostImpact(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-800 text-cyan-500 focus:ring-0"
                    />
                    <span>Potential Cost Impact</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-200">
                    <input
                      type="checkbox"
                      checked={scheduleImpact}
                      onChange={(e) => setScheduleImpact(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-800 text-rose-500 focus:ring-0"
                    />
                    <span>Critical Schedule Impact</span>
                  </label>
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
                    disabled={actionInProgress === "creating_rfi"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit RFI Notice</span>
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