"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Download,
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
  RefreshCw,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  Wrench,
  X
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type SnagSeverity = "Cosmetic_Snag" | "Functional_Defect" | "Critical_Hold";
export type SnagStatus = "Open" | "Rectified_Submitted" | "Verified_Closed" | "Debited_NCR";

export interface PunchListItem {
  id: string;
  project_id: string;
  snag_code: string;
  room_location: string;
  trade_package: string;
  assigned_contractor: string;
  defect_description: string;
  severity: SnagSeverity;
  rectification_status: SnagStatus;
  photo_url?: string | null;
  rectification_photo_url?: string | null;
  target_rectification_date: string;
  rectified_date?: string | null;
  closed_at?: string | null;
  verified_by?: string | null;
  estimated_debit_inr: number;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function normalizeSnag(s: any, idx = 0): PunchListItem {
  const code = s.snag_code ?? s.snag_number ?? `SNG-${100 + idx}`;
  const status: SnagStatus =
    s.rectification_status === "Closed" || s.rectification_status === "Verified_Closed"
      ? "Verified_Closed"
      : s.rectification_status === "Rectified_Submitted" || s.rectification_status === "Submitted"
      ? "Rectified_Submitted"
      : s.rectification_status === "Debited_NCR" || s.rectification_status === "Debited"
      ? "Debited_NCR"
      : "Open";

  return {
    id: s.id,
    project_id: s.project_id,
    snag_code: code,
    room_location: s.room_location ?? s.location_grid ?? "General Site Area",
    trade_package: s.trade_package ?? "Civil & Finishes",
    assigned_contractor: s.assigned_contractor ?? s.contractor_name ?? "Main Contractor",
    defect_description: s.defect_description ?? s.description ?? "Inspection punch observation logged.",
    severity: (s.severity as SnagSeverity) ?? "Functional_Defect",
    rectification_status: status,
    photo_url: s.photo_url ?? null,
    rectification_photo_url: s.rectification_photo_url ?? null,
    target_rectification_date: s.target_rectification_date ?? new Date().toISOString().slice(0, 10),
    rectified_date: s.rectified_date ?? null,
    closed_at: s.closed_at ?? null,
    verified_by: s.verified_by ?? null,
    estimated_debit_inr: Number(s.estimated_debit_inr ?? s.backcharge_amount ?? 15000),
    created_at: s.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalHandoverPunchListPage() {
  const { project, role, tier } = useActiveRole();
  const [snags, setSnags] = useState<PunchListItem[]>([]);
  const [selectedSnag, setSelectedSnag] = useState<PunchListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "QA Engineer";
  const isConsultantOrLead =
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleId === "RESIDENT_ENGINEER" ||
    roleId === "SITE_FOREMAN" ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Engineer") ||
    roleLabel.includes("Lead") ||
    roleLabel.includes("Director");

  // Form State for Logging New Snag
  const [newCode, setNewCode] = useState(`SNG-${Math.floor(100 + Math.random() * 900)}`);
  const [roomLocation, setRoomLocation] = useState(
    tier === "RESIDENTIAL" ? "Master Bedroom / Dressing Area" : "Level 08 Lift Lobby Corridors"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [severity, setSeverity] = useState<SnagSeverity>("Functional_Defect");
  const [desc, setDesc] = useState(
    tier === "RESIDENTIAL"
      ? "Wardrobe shutter misalignment; soft-close hinge damper binding against HDHMR frame."
      : "Shear wall reveal honeycombing on column junction; plaster debonding noted."
  );
  const [targetDate, setTargetDate] = useState(
    new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10)
  );
  const [estimatedDebit, setEstimatedDebit] = useState<number>(tier === "RESIDENTIAL" ? 8500 : 45000);

  const loadSnags = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("punch_list_items")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any, idx: number) => normalizeSnag(d, idx));
        setSnags(normalized);
        if (!selectedSnag) setSelectedSnag(normalized[0]);
      } else {
        const defaults: PunchListItem[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeSnag(
                  {
                    id: "sng-res-01",
                    project_id: projectId,
                    snag_code: "SNG-RES-014",
                    room_location: "Master Bedroom / Wardrobe MB-02",
                    trade_package: "Custom Joinery & Millwork",
                    assigned_contractor: "Royal Woodworks & Interiors",
                    defect_description:
                      "Wardrobe right-side double shutter rubbing at bottom skirting; hinge leveling bolt requires realignment.",
                    severity: "Functional_Defect",
                    rectification_status: "Open",
                    target_rectification_date: "2026-09-18",
                    estimated_debit_inr: 8500,
                  },
                  1
                ),
                normalizeSnag(
                  {
                    id: "sng-res-02",
                    project_id: projectId,
                    snag_code: "SNG-RES-015",
                    room_location: "Guest Bathroom / PB-01",
                    trade_package: "First-Fix Plumbing & Sanitary",
                    assigned_contractor: "Avadh MEP Solutions",
                    defect_description:
                      "Slight hairline grout weeping at concealed diverter escutcheon plate during 10-bar test.",
                    severity: "Cosmetic_Snag",
                    rectification_status: "Rectified_Submitted",
                    target_rectification_date: "2026-09-15",
                    rectified_date: "2026-09-14",
                    estimated_debit_inr: 4500,
                  },
                  2
                ),
                normalizeSnag(
                  {
                    id: "sng-res-03",
                    project_id: projectId,
                    snag_code: "SNG-RES-016",
                    room_location: "Living & Dining Hall",
                    trade_package: "Surface Finishes & Ceiling",
                    assigned_contractor: "Royal Woodworks & Interiors",
                    defect_description:
                      "Shadow gap perimeter profile waviness (>2mm deflection across 3m span) near AC plenum.",
                    severity: "Critical_Hold",
                    rectification_status: "Verified_Closed",
                    target_rectification_date: "2026-09-12",
                    rectified_date: "2026-09-12",
                    closed_at: "2026-09-13T14:00:00Z",
                    verified_by: "Principal Architect",
                    estimated_debit_inr: 12000,
                  },
                  3
                ),
              ]
            : [
                normalizeSnag(
                  {
                    id: "sng-twr-01",
                    project_id: projectId,
                    snag_code: "SNG-TWR-104",
                    room_location: "Level 08 Lift Lobby Corridor Axis C2",
                    trade_package: "Civil & Superstructure",
                    assigned_contractor: "Narmada Concrete Works",
                    defect_description:
                      "Localized honeycombing and tie-rod hole voids unfilled along shear column kicker junction.",
                    severity: "Critical_Hold",
                    rectification_status: "Open",
                    target_rectification_date: "2026-09-19",
                    estimated_debit_inr: 45000,
                  },
                  1
                ),
                normalizeSnag(
                  {
                    id: "sng-twr-02",
                    project_id: projectId,
                    snag_code: "SNG-TWR-105",
                    room_location: "Basement B2 Pump Room",
                    trade_package: "Civil & Superstructure",
                    assigned_contractor: "Narmada Concrete Works",
                    defect_description:
                      "Surface efflorescence and water seepage dampness at cold joint near drainage sump pit.",
                    severity: "Functional_Defect",
                    rectification_status: "Rectified_Submitted",
                    target_rectification_date: "2026-09-16",
                    rectified_date: "2026-09-15",
                    estimated_debit_inr: 65000,
                  },
                  2
                ),
                normalizeSnag(
                  {
                    id: "sng-twr-03",
                    project_id: projectId,
                    snag_code: "SNG-TWR-106",
                    room_location: "Level 07 Staircase Fire Shaft",
                    trade_package: "Civil & Superstructure",
                    assigned_contractor: "Narmada Concrete Works",
                    defect_description:
                      "Fire door anchor bolt pocket not grouted with non-shrink high-strength mortar.",
                    severity: "Functional_Defect",
                    rectification_status: "Verified_Closed",
                    target_rectification_date: "2026-09-10",
                    rectified_date: "2026-09-10",
                    closed_at: "2026-09-11T16:00:00Z",
                    verified_by: "Resident SEOR",
                    estimated_debit_inr: 35000,
                  },
                  3
                ),
              ];

        setSnags(defaults);
        if (!selectedSnag) setSelectedSnag(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedSnag, tier]);

  useEffect(() => {
    void loadSnags();

    const channel = supabase
      .channel(`snags_realtime_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "punch_list_items" }, () => void loadSnags())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadSnags]);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalCount = snags.length;
    const openCount = snags.filter((s) => s.rectification_status === "Open").length;
    const submittedCount = snags.filter((s) => s.rectification_status === "Rectified_Submitted").length;
    const closedCount = snags.filter((s) => s.rectification_status === "Verified_Closed").length;
    const totalUnresolved = openCount + submittedCount;
    const totalExposureInr = snags
      .filter((s) => s.rectification_status !== "Verified_Closed")
      .reduce((sum, s) => sum + Number(s.estimated_debit_inr || 0), 0);

    return { totalCount, openCount, submittedCount, closedCount, totalUnresolved, totalExposureInr };
  }, [snags]);

  const filteredSnags = useMemo(() => {
    return snags.filter((s) => {
      const matchStatus = filterStatus === "ALL" || s.rectification_status === filterStatus;
      const matchSeverity = filterSeverity === "ALL" || s.severity === filterSeverity;
      const haystack = `${s.snag_code} ${s.room_location} ${s.assigned_contractor} ${s.defect_description}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchSeverity && matchSearch;
    });
  }, [snags, filterStatus, filterSeverity, search]);

  // Update Status Workflow
  const handleUpdateStatus = async (snagId: string, nextStatus: SnagStatus) => {
    setActionInProgress(snagId);
    const updatePayload: Partial<PunchListItem> = { rectification_status: nextStatus };

    if (nextStatus === "Rectified_Submitted") {
      updatePayload.rectified_date = new Date().toISOString().slice(0, 10);
    } else if (nextStatus === "Verified_Closed") {
      updatePayload.closed_at = new Date().toISOString();
      updatePayload.verified_by = roleLabel || "Resident SEOR";
    }

    try {
      await (supabase as any)
        .from("punch_list_items")
        .update({
          ...updatePayload,
          // Sync with DB column name variants
          status: nextStatus === "Verified_Closed" ? "Closed" : nextStatus,
        })
        .eq("id", snagId);
    } catch {
      // Local optimistic fallback
    }

    setSnags((prev) =>
      prev.map((s) => (s.id === snagId ? ({ ...s, ...updatePayload } as PunchListItem) : s))
    );
    if (selectedSnag && selectedSnag.id === snagId) {
      setSelectedSnag((prev) => (prev ? ({ ...prev, ...updatePayload } as PunchListItem) : null));
    }

    setStatusMessage(`Snag status updated to ${nextStatus.replace(/_/g, " ")}.`);
    setTimeout(() => setStatusMessage(null), 3500);
    setActionInProgress(null);
  };

  // Convert Unrectified Snag to Commercial NCR Backcharge
  const handleEscalateToNcr = async (item: PunchListItem) => {
    setActionInProgress(`ncr_${item.id}`);

    try {
      await (supabase as any).from("non_conformance_reports").insert([
        {
          project_id: projectId,
          ncr_code: `NCR-SNG-${item.snag_code}-${Date.now().toString().slice(-4)}`,
          ncr_number: `NCR-SNG-${item.snag_code}-${Date.now().toString().slice(-4)}`,
          title: `Handover Snag Default: ${item.defect_description.slice(0, 60)}...`,
          structural_element: item.room_location,
          location_grid: item.room_location,
          trade_package: item.trade_package,
          assigned_contractor: item.assigned_contractor,
          remediation_contractor: item.assigned_contractor,
          severity: "COMMERCIAL_BACKCHARGE",
          defect_category: "Contractor_Snag_Abandonment",
          description: `Contractor failed to rectify handover punch item ${item.snag_code} within agreed SLA. Penalty debit note instituted per FIDIC Clause 11.4 / CPWD GCC Clause 17.`,
          remedial_action_required: "Direct deduction against contractor active retention escrow / RA Bill.",
          status: "OPEN_DEBIT_PENDING",
          enforce_auto_debit: true,
          backcharge_amount: item.estimated_debit_inr,
          estimated_debit_inr: item.estimated_debit_inr,
          issued_by: roleLabel || "Principal Consultant",
          issued_date: new Date().toISOString().slice(0, 10),
          rectification_target_date: new Date().toISOString().slice(0, 10),
          created_at: new Date().toISOString(),
        },
      ]);

      await handleUpdateStatus(item.id, "Debited_NCR");
      setStatusMessage(`Snag converted to commercial NCR! ₹${item.estimated_debit_inr.toLocaleString("en-IN")} debit applied.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch {
      setStatusMessage("Failed to escalate to NCR ledger.");
      setTimeout(() => setStatusMessage(null), 4000);
    }

    setActionInProgress(null);
  };

  // Create New Punch Item
  const handleCreateSnag = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating");

    const newDbRecord: Omit<PunchListItem, "id"> = {
      project_id: projectId,
      snag_code: newCode.trim(),
      room_location: roomLocation.trim(),
      trade_package: tradePackage.trim(),
      assigned_contractor: contractor.trim(),
      defect_description: desc.trim(),
      severity,
      rectification_status: "Open",
      target_rectification_date: targetDate,
      estimated_debit_inr: Number(estimatedDebit),
    };

    try {
      const { data, error } = await (supabase as any)
        .from("punch_list_items")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeSnag(data, snags.length);
        setSnags((prev) => [normalized, ...prev]);
        setSelectedSnag(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeSnag({ ...newDbRecord, id: `sng-${Date.now()}` }, snags.length);
      setSnags((prev) => [fallback, ...prev]);
      setSelectedSnag(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory Joint Inspection Punch Sheet Print
  const handlePrintJointInspectionSheet = () => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Joint Inspection Punch List Handover Sheet — ${projectName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .tac { text-align: center; font-family: monospace; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 40px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD Section 29 / FIDIC Clause 10 Taking-Over</div>
      <h1 class="title">Joint Taking-Over Punch List &amp; Defect Audit Sheet</h1>
      <div class="meta">Project: ${projectName} (${projectId}) · Date of Audit: ${new Date().toLocaleDateString("en-IN")}</div>
    </div>
    <div style="text-align: right; font-family: monospace;">
      <strong>Unresolved Snags: ${summary.totalUnresolved}</strong><br/>
      <span style="color: #64748b;">Closed: ${summary.closedCount} / Total: ${summary.totalCount}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Snag Ref</th>
        <th>Room / Grid Location</th>
        <th>Trade Package &amp; Subcontractor</th>
        <th>Factual Defect Description</th>
        <th class="tac">Severity</th>
        <th class="tac">SLA Target</th>
        <th class="tac">Status</th>
      </tr>
    </thead>
    <tbody>
      ${snags
        .map(
          (s) => `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${s.snag_code}</td>
          <td>${s.room_location}</td>
          <td><strong>${s.assigned_contractor}</strong><br/><span style="color:#64748b;">${s.trade_package}</span></td>
          <td>${s.defect_description}</td>
          <td class="tac font-bold">${s.severity.replace(/_/g, " ")}</td>
          <td class="tac">${s.target_rectification_date}</td>
          <td class="tac" style="font-weight: bold; color: ${
            s.rectification_status === "Verified_Closed"
              ? "#15803d"
              : s.rectification_status === "Open"
              ? "#b91c1c"
              : "#b45309"
          };">
            ${s.rectification_status.replace(/_/g, " ")}
          </td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>Executing Subcontractor</div>
      <div style="color: #64748b;">Rectification commitment agreed.</div>
      <div class="sig">Contractor Representative</div>
    </div>
    <div>
      <div>Resident SEOR / Principal Architect</div>
      <div style="color: #64748b;">Taking-over inspection verified.</div>
      <div class="sig">Consultant Endorsement</div>
    </div>
    <div>
      <div>Employer Project Director</div>
      <div style="color: #64748b;">Defects Liability Period (DLP) synchronized.</div>
      <div class="sig">Client Taking-Over Sign-off</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedSnag) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING HANDOVER SNAGGING &amp; DEFECT INSPECTION MATRIX...
      </div>
    );
  }

  const isClosed = selectedSnag.rectification_status === "Verified_Closed";
  const isSubmitted = selectedSnag.rectification_status === "Rectified_Submitted";
  const isOpen = selectedSnag.rectification_status === "Open";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Handover Governance · FIDIC Clause 10 / CPWD Section 29</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Snagging, Punch-List &amp; Taking-Over Clearance
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Strict defect closeout verification. Unrectified snags programmatically lock the 50% DLP Retention Release in the financial ledger and convert to commercial backcharges.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrintJointInspectionSheet}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Joint Snag Sheet</span>
            </button>
            <Link
              href="/finance/retention-ledger"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Audit Retention Lock</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setNewCode(`SNG-${Math.floor(100 + Math.random() * 900)}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Log Punch Item</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {statusMessage && (
          <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* 4 PRIMARY QUALITY & FINANCIAL GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Logged Snags</span>
              <FileCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {summary.totalCount} Defects
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Joint taking-over punch registry</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Active Retention Blockers</span>
              <Lock className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold font-mono mt-2 ${summary.totalUnresolved > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {summary.totalUnresolved > 0 ? `${summary.totalUnresolved} Unresolved` : "Zero Blockers"}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Holding 50% DLP release Tranche 2</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Rectified &amp; Closed</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {summary.closedCount} Cleared
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {summary.totalCount > 0 ? Math.round((summary.closedCount / summary.totalCount) * 100) : 100}% compliance rate
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Backcharge Exposure</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-rose-400 mt-2">
              {formatInr(summary.totalExposureInr)}
            </div>
            <div className="text-[11px] text-rose-500/80 mt-1">Auto-debit liability on contractor</div>
          </div>
        </div>

        {/* RETENTION INTERLOCK CALLOUT BANNER */}
        {summary.totalUnresolved > 0 && (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <strong className="text-amber-200 text-xs uppercase tracking-wider block font-mono">
                  Interlock Active: Tranche 2 Retention Money Frozen
                </strong>
                <span className="text-xs text-amber-300/80">
                  {summary.totalUnresolved} unresolved punch items detected. In compliance with FIDIC Clause 14.9, the 50% DLP release will remain frozen until all snags achieve verified consultant sign-off.
                </span>
              </div>
            </div>
            <Link
              href="/finance/retention-ledger"
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shrink-0 transition font-mono"
            >
              View Retention Schedule
            </Link>
          </div>
        )}

        {/* TOOLBAR: SEARCH & STATUS TABS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All (${snags.length})` },
              { key: "Open", label: `Open (${summary.openCount})` },
              { key: "Rectified_Submitted", label: `Under Review (${summary.submittedCount})` },
              { key: "Verified_Closed", label: `Closed (${summary.closedCount})` },
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
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Severities</option>
              <option value="Critical_Hold">Critical Hold</option>
              <option value="Functional_Defect">Functional Defect</option>
              <option value="Cosmetic_Snag">Cosmetic Snag</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search room, defect, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: SNAG ROSTER (7 cols) vs INSPECTION & ACTION DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: SNAG LISTING (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Taking-Over Snag Register
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Defect Observation List</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredSnags.length} Items</span>
            </div>

            <div className="space-y-3">
              {filteredSnags.map((snag) => {
                const isSelected = selectedSnag.id === snag.id;
                const isItemClosed = snag.rectification_status === "Verified_Closed";
                const isItemSubmitted = snag.rectification_status === "Rectified_Submitted";
                const isCritical = snag.severity === "Critical_Hold";

                return (
                  <div
                    key={snag.id}
                    onClick={() => setSelectedSnag(snag)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/50 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {snag.snag_code}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isCritical
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                            : snag.severity === "Functional_Defect"
                            ? "bg-amber-950 text-amber-400 border border-amber-800/50"
                            : "bg-zinc-800 text-zinc-300"
                        }`}>
                          {snag.severity.replace(/_/g, " ")}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isItemClosed
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : isItemSubmitted
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                            : "bg-rose-950 text-rose-400 border border-rose-800/50"
                        }`}>
                          {snag.rectification_status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <span className="text-xs font-mono font-bold text-zinc-400">
                        SLA: <strong className="text-zinc-200">{snag.target_rectification_date}</strong>
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{snag.room_location}</div>
                      <div className="text-xs text-zinc-300 mt-1 line-clamp-2">{snag.defect_description}</div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Vendor: <strong className="text-zinc-300">{snag.assigned_contractor}</strong></span>
                      <span>Debit Exposure: <strong className="text-rose-400">{formatInr(snag.estimated_debit_inr)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: SNAG INSPECTOR & CLOSURE ACTION DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Defect Inspection Sheet
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedSnag.snag_code}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isClosed
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : isSubmitted
                  ? "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                  : "bg-amber-950 text-amber-400 border border-amber-800/50"
              }`}>
                {selectedSnag.rectification_status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Location Reference:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedSnag.room_location}</strong>
              </div>

              <div className="pt-2 border-t border-zinc-800/60">
                <span className="text-zinc-500 text-[10px] uppercase block">Defect Observation:</span>
                <p className="text-zinc-200 font-sans text-xs mt-1 leading-relaxed">{selectedSnag.defect_description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Trade Package:</span>
                  <span className="text-zinc-200">{selectedSnag.trade_package}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Subcontractor:</span>
                  <span className="text-cyan-400 font-bold">{selectedSnag.assigned_contractor}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Target SLA:</span>
                  <span className="text-zinc-200">{selectedSnag.target_rectification_date}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Potential Backcharge:</span>
                  <span className="text-rose-400 font-bold">{formatInr(selectedSnag.estimated_debit_inr)}</span>
                </div>
              </div>
            </div>

            {/* THREE-PARTY QUALITY SIGN-OFF WORKFLOW */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Quality Stage-Gate Controls:
              </span>

              {isOpen && (
                <button
                  type="button"
                  disabled={actionInProgress === selectedSnag.id}
                  onClick={() => handleUpdateStatus(selectedSnag.id, "Rectified_Submitted")}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono disabled:opacity-50"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Submit Contractor Rectification Proof</span>
                </button>
              )}

              {isSubmitted && (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={actionInProgress === selectedSnag.id || !isConsultantOrLead}
                    onClick={() => handleUpdateStatus(selectedSnag.id, "Verified_Closed")}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify &amp; Close Snag (SEOR / Lead)</span>
                  </button>
                  <button
                    type="button"
                    disabled={actionInProgress === selectedSnag.id || !isConsultantOrLead}
                    onClick={() => handleUpdateStatus(selectedSnag.id, "Open")}
                    className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-bold text-xs transition flex items-center justify-center gap-1.5 font-mono disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject Work &amp; Reopen Snag Notice</span>
                  </button>
                </div>
              )}

              {isClosed && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs font-bold space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Rectification Verified &amp; Closed</span>
                  </div>
                  <div className="text-[10px] text-emerald-500/80 font-sans">
                    Inspected by {selectedSnag.verified_by || "Resident SEOR"} on {selectedSnag.closed_at ? new Date(selectedSnag.closed_at).toLocaleDateString("en-IN") : "Today"}
                  </div>
                </div>
              )}

              {!isClosed && selectedSnag.rectification_status !== "Debited_NCR" && (
                <button
                  type="button"
                  disabled={actionInProgress === `ncr_${selectedSnag.id}` || !isConsultantOrLead}
                  onClick={() => handleEscalateToNcr(selectedSnag)}
                  className="w-full py-2 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 text-rose-400 border border-rose-800/50 text-xs font-bold transition flex items-center justify-center gap-1.5 font-mono disabled:opacity-50"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Escalate to NCR Backcharge (Auto-Debit)</span>
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              FIDIC Clause 10 &amp; CPWD Section 29 Statutory Handover Sheet
            </div>
          </div>

        </div>

        {/* LOG NEW PUNCH ITEM MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Log Handover Punch Item
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

              <form onSubmit={handleCreateSnag} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Snag Ref Code</label>
                    <input
                      type="text"
                      required
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Severity Classification</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as SnagSeverity)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="Cosmetic_Snag">Cosmetic Snag</option>
                      <option value="Functional_Defect">Functional Defect</option>
                      <option value="Critical_Hold">Critical Hold (Blocker)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Room / Location Grid</label>
                  <input
                    type="text"
                    required
                    value={roomLocation}
                    onChange={(e) => setRoomLocation(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Factual Defect Description</label>
                  <textarea
                    rows={2}
                    required
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Trade Package</label>
                    <input
                      type="text"
                      required
                      value={tradePackage}
                      onChange={(e) => setTradePackage(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Assigned Contractor</label>
                    <input
                      type="text"
                      required
                      value={contractor}
                      onChange={(e) => setContractor(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Target SLA Date</label>
                    <input
                      type="date"
                      required
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Estimated Debit (₹)</label>
                    <input
                      type="number"
                      required
                      value={estimatedDebit}
                      onChange={(e) => setEstimatedDebit(Number(e.target.value))}
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
                    disabled={actionInProgress === "creating"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Register Punch Item</span>
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