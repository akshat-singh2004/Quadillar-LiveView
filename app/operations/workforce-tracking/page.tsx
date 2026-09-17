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
  Camera,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
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
  Plus,
  Printer,
  Radio,
  Receipt,
  RefreshCw,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  TrendingDown,
  TrendingUp,
  Truck,
  Unlock,
  Users,
  Video,
  Wrench,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type DwellZoneType =
  | "ACTIVE_WORK_FACE"
  | "MATERIAL_STAGING_YARD"
  | "REST_CANTEEN_AREA"
  | "FABRICATION_BENCH"
  | "EXCLUSION_HAZARD_ZONE";

export type DwellStatus =
  | "OBSERVED_STREAMING"
  | "SHIFT_AUDITED_COMPLIANT"
  | "DISCREPANCY_FLAGGED"
  | "RECONCILED_FOR_DPR";

export interface WorkforceDwellRecord {
  id: string;
  project_id: string;
  track_session_code: string;
  worker_name: string;
  trade_role: string;
  contractor_entity: string;
  trade_package: string;
  camera_node_code: string;
  zone_classification: DwellZoneType;
  shift_date: string;
  shift_start_time: string;
  shift_end_time?: string | null;
  total_dwell_minutes: number;
  active_motion_minutes: number;
  idle_break_minutes: number;
  active_work_ratio_pct: number;
  contractor_claimed_hours: number;
  vision_detected_hours: number;
  variance_hours: number;
  exclusion_zone_breaches: number;
  ppe_compliance_pct: number;
  status: DwellStatus;
  supervisor_auditor?: string | null;
  audited_at?: string | null;
  notes?: string | null;
  created_at?: string;
}

function calculateDwellMetrics(
  activeMins: number,
  idleMins: number,
  claimedHours: number
) {
  const totalMins = activeMins + idleMins;
  const visionHours = Number((totalMins / 60).toFixed(2));
  const activeRatio = totalMins > 0 ? Number(((activeMins / totalMins) * 100).toFixed(1)) : 0;
  const variance = Number((visionHours - claimedHours).toFixed(2));

  let status: DwellStatus = "OBSERVED_STREAMING";
  if (Math.abs(variance) > 1.5 || activeRatio < 60.0) {
    status = "DISCREPANCY_FLAGGED";
  } else {
    status = "SHIFT_AUDITED_COMPLIANT";
  }

  return { totalMins, visionHours, activeRatio, variance, status };
}

function normalizeDwellRecord(d: any): WorkforceDwellRecord {
  const activeMins = Number(d?.active_motion_minutes ?? 360);
  const idleMins = Number(d?.idle_break_minutes ?? 90);
  const claimedHours = Number(d?.contractor_claimed_hours ?? 8.0);
  const metrics = calculateDwellMetrics(activeMins, idleMins, claimedHours);

  return {
    id: d?.id ?? `dwell-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    track_session_code: d?.track_session_code ?? `TRK-${Date.now().toString().slice(-4)}`,
    worker_name: d?.worker_name ?? "Operative Person",
    trade_role: d?.trade_role ?? "Steel Fixer / BBS Operative",
    contractor_entity: d?.contractor_entity ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    camera_node_code: d?.camera_node_code ?? "CAM-CORE-02",
    zone_classification: (d?.zone_classification as DwellZoneType) ?? "ACTIVE_WORK_FACE",
    shift_date: d?.shift_date ?? new Date().toISOString().slice(0, 10),
    shift_start_time: d?.shift_start_time ?? new Date(Date.now() - 7.5 * 3600000).toISOString(),
    shift_end_time: d?.shift_end_time ?? null,
    total_dwell_minutes: Number(d?.total_dwell_minutes ?? metrics.totalMins),
    active_motion_minutes: activeMins,
    idle_break_minutes: idleMins,
    active_work_ratio_pct: Number(d?.active_work_ratio_pct ?? metrics.activeRatio),
    contractor_claimed_hours: claimedHours,
    vision_detected_hours: Number(d?.vision_detected_hours ?? metrics.visionHours),
    variance_hours: Number(d?.variance_hours ?? metrics.variance),
    exclusion_zone_breaches: Number(d?.exclusion_zone_breaches ?? 0),
    ppe_compliance_pct: Number(d?.ppe_compliance_pct ?? 98.5),
    status: (d?.status as DwellStatus) ?? metrics.status,
    supervisor_auditor: d?.supervisor_auditor ?? null,
    audited_at: d?.audited_at ?? null,
    notes: d?.notes ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalWorkforceTrackingPage() {
  const { project, role, tier } = useActiveRole();
  const [dwellRecords, setDwellRecords] = useState<WorkforceDwellRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<WorkforceDwellRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterZone, setFilterZone] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Site Superintendent";
  const isSuperintendentOrSeor =
    roleId === "SITE_FOREMAN" ||
    roleId === "RESIDENT_ENGINEER" ||
    roleId === "RESIDENT_SEOR" ||
    roleId === "PMC_LEAD" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleLabel.includes("Superintendent") ||
    roleLabel.includes("Foreman") ||
    roleLabel.includes("Engineer") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Architect");

  // Form State for Mocking/Injecting New CV Dwell Record
  const [trackCode, setTrackCode] = useState(`TRK-CV-${Math.floor(1000 + Math.random() * 9000)}`);
  const [workerName, setWorkerName] = useState("D. K. Yadav (Gang #03)");
  const [tradeRole, setTradeRole] = useState(
    tier === "RESIDENTIAL" ? "Master Joiner / Shutter Alignment" : "Fe500D Rebar Tying Operative"
  );
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [cameraNode, setCameraNode] = useState(tier === "RESIDENTIAL" ? "CAM-RES-GATE" : "CAM-CORE-02");
  const [zone, setZone] = useState<DwellZoneType>("ACTIVE_WORK_FACE");
  const [activeMins, setActiveMins] = useState<number>(390);
  const [idleMins, setIdleMins] = useState<number>(90);
  const [claimedHours, setClaimedHours] = useState<number>(8.0);
  const [ppeScore, setPpeScore] = useState<number>(98.0);

  const loadDwellData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("site_workforce_dwell_logs")
        .select("*")
        .eq("project_id", projectId)
        .order("shift_start_time", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeDwellRecord(d));
        setDwellRecords(normalized);
        if (!selectedRecord) setSelectedRecord(normalized[0]);
      } else {
        const defaults: WorkforceDwellRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeDwellRecord({
                  id: "trk-res-01",
                  project_id: projectId,
                  track_session_code: "TRK-CV-8812",
                  worker_name: "Ram Kumar (Lead Millworker)",
                  trade_role: "Custom Joiner / Modular Fit-Out",
                  contractor_entity: "Royal Woodworks & Interiors",
                  trade_package: "Custom Joinery & Millwork",
                  camera_node_code: "CAM-RES-GATE",
                  zone_classification: "ACTIVE_WORK_FACE",
                  shift_date: new Date().toISOString().slice(0, 10),
                  active_motion_minutes: 420,
                  idle_break_minutes: 60,
                  contractor_claimed_hours: 8.0,
                  ppe_compliance_pct: 100.0,
                  exclusion_zone_breaches: 0,
                  status: "SHIFT_AUDITED_COMPLIANT",
                  notes: "Continuous joinery carcass alignment observed in Master Suite MB-02 polygon.",
                }),
                normalizeDwellRecord({
                  id: "trk-res-02",
                  project_id: projectId,
                  track_session_code: "TRK-CV-8813",
                  worker_name: "A. K. Sharma (Plumbing Helper)",
                  trade_role: "Pipe Fitter Helper",
                  contractor_entity: "Avadh MEP Solutions",
                  trade_package: "First-Fix Plumbing & Sanitary",
                  camera_node_code: "CAM-RES-GATE",
                  zone_classification: "REST_CANTEEN_AREA",
                  shift_date: new Date().toISOString().slice(0, 10),
                  active_motion_minutes: 180,
                  idle_break_minutes: 300,
                  contractor_claimed_hours: 8.0,
                  ppe_compliance_pct: 92.5,
                  exclusion_zone_breaches: 0,
                  status: "DISCREPANCY_FLAGGED",
                  notes: "Excessive dwell detected in rest zone. Computer vision flags 5.0 hours discrepancy against 8h claim.",
                }),
              ]
            : [
                normalizeDwellRecord({
                  id: "trk-twr-01",
                  project_id: projectId,
                  track_session_code: "TRK-CV-9410",
                  worker_name: "S. N. Yadav (Rebar Gang Lead)",
                  trade_role: "Fe500D Column Cage Tying",
                  contractor_entity: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  camera_node_code: "CAM-CORE-02",
                  zone_classification: "ACTIVE_WORK_FACE",
                  shift_date: new Date().toISOString().slice(0, 10),
                  active_motion_minutes: 410,
                  idle_break_minutes: 70,
                  contractor_claimed_hours: 8.0,
                  ppe_compliance_pct: 99.2,
                  exclusion_zone_breaches: 0,
                  status: "SHIFT_AUDITED_COMPLIANT",
                  notes: "Continuous rebar tying observed at Level 08 shear core junction. Reconciled with Form 28.",
                }),
                normalizeDwellRecord({
                  id: "trk-twr-02",
                  project_id: projectId,
                  track_session_code: "TRK-CV-9411",
                  worker_name: "M. P. Singh (Staging Rigging Helper)",
                  trade_role: "Scaffolding Rigger",
                  contractor_entity: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  camera_node_code: "CAM-CORE-02",
                  zone_classification: "EXCLUSION_HAZARD_ZONE",
                  shift_date: new Date().toISOString().slice(0, 10),
                  active_motion_minutes: 240,
                  idle_break_minutes: 180,
                  contractor_claimed_hours: 8.0,
                  ppe_compliance_pct: 86.0,
                  exclusion_zone_breaches: 2,
                  status: "DISCREPANCY_FLAGGED",
                  notes: "Tower crane hook radius exclusion zone breached twice during concrete bucket hoisting.",
                }),
              ];

        setDwellRecords(defaults);
        if (!selectedRecord) setSelectedRecord(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedRecord, tier]);

  useEffect(() => {
    void loadDwellData();

    const channel = supabase
      .channel(`dwell_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_workforce_dwell_logs" }, () => void loadDwellData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadDwellData]);

  const summary = useMemo(() => {
    const totalTracked = dwellRecords.length;
    const compliantShifts = dwellRecords.filter((d) => d.status === "SHIFT_AUDITED_COMPLIANT").length;
    const flaggedDiscrepancies = dwellRecords.filter((d) => d.status === "DISCREPANCY_FLAGGED").length;
    const avgProductiveRatio =
      totalTracked > 0
        ? Math.round(
            dwellRecords.reduce((sum, d) => sum + Number(d.active_work_ratio_pct || 0), 0) /
              totalTracked
          )
        : 0;

    return { totalTracked, compliantShifts, flaggedDiscrepancies, avgProductiveRatio };
  }, [dwellRecords]);

  const filteredRecords = useMemo(() => {
    return dwellRecords.filter((d) => {
      const matchZone = filterZone === "ALL" || d.zone_classification === filterZone;
      const matchStatus = filterStatus === "ALL" || d.status === filterStatus;
      const haystack = `${d.track_session_code} ${d.worker_name} ${d.trade_role} ${d.camera_node_code}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchZone && matchStatus && matchSearch;
    });
  }, [dwellRecords, filterZone, filterStatus, search]);

  // Push Reconciled Hours to DPR Form 28
  const handleReconcileToDpr = async (rec: WorkforceDwellRecord) => {
    if (!isSuperintendentOrSeor) return;
    setActionInProgress(`dpr_${rec.id}`);

    const updatePayload: Partial<WorkforceDwellRecord> = {
      status: "RECONCILED_FOR_DPR",
      supervisor_auditor: roleLabel || "Site Superintendent",
      audited_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("site_workforce_dwell_logs")
        .update(updatePayload)
        .eq("id", rec.id);
    } catch {
      // Local optimistic update
    }

    setDwellRecords((prev) =>
      prev.map((d) => (d.id === rec.id ? ({ ...d, ...updatePayload } as WorkforceDwellRecord) : d))
    );
    if (selectedRecord && selectedRecord.id === rec.id) {
      setSelectedRecord((prev) => (prev ? ({ ...prev, ...updatePayload } as WorkforceDwellRecord) : null));
    }

    setFeedbackMessage(`Vision dwell hours (${rec.vision_detected_hours}h) locked and reconciled into DPR.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Add Dwell Log Entry
  const handleCreateDwell = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_dwell");

    const metrics = calculateDwellMetrics(Number(activeMins), Number(idleMins), Number(claimedHours));

    const newDbRecord: Omit<WorkforceDwellRecord, "id"> = {
      project_id: projectId,
      track_session_code: trackCode.trim(),
      worker_name: workerName.trim(),
      trade_role: tradeRole.trim(),
      contractor_entity: contractor.trim(),
      trade_package: tradePackage.trim(),
      camera_node_code: cameraNode.trim(),
      zone_classification: zone,
      shift_date: new Date().toISOString().slice(0, 10),
      shift_start_time: new Date(Date.now() - (metrics.totalMins / 60) * 3600000).toISOString(),
      total_dwell_minutes: metrics.totalMins,
      active_motion_minutes: Number(activeMins),
      idle_break_minutes: Number(idleMins),
      active_work_ratio_pct: metrics.activeRatio,
      contractor_claimed_hours: Number(claimedHours),
      vision_detected_hours: metrics.visionHours,
      variance_hours: metrics.variance,
      exclusion_zone_breaches: 0,
      ppe_compliance_pct: Number(ppeScore),
      status: metrics.status,
      notes: "Telemetry ingested from site CCTV edge inference node.",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("site_workforce_dwell_logs")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeDwellRecord(data);
        setDwellRecords((prev) => [normalized, ...prev]);
        setSelectedRecord(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeDwellRecord({ ...newDbRecord, id: `dwell-${Date.now()}` });
      setDwellRecords((prev) => [fallback, ...prev]);
      setSelectedRecord(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  if (loading || !selectedRecord) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING COMPUTER VISION WORKFORCE DWELL TELEMETRY PIPELINE...
      </div>
    );
  }

  const isFlagged = selectedRecord.status === "DISCREPANCY_FLAGGED";
  const isReconciled = selectedRecord.status === "RECONCILED_FOR_DPR";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Computer Vision Telemetry · CCTV Zone Dwell &amp; Shift Auditing</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Workforce Dwell-Time &amp; Camera Shift Verification
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Automated computer vision labor verification. Tracks work-zone dwell times, active-to-idle motion ratios, and flags discrepancies between contractor muster roll claims and camera-detected shift duration.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/operations/dpr"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
              <span>DPR Form 28 Log</span>
            </Link>
            <Link
              href="/compliance/labor"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Labour Wage Audit</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setTrackCode(`TRK-CV-${Math.floor(1000 + Math.random() * 9000)}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Inject Vision Track Log</span>
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

        {/* 4 PRIMARY CV GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Tracked Operative Sessions</span>
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {summary.totalTracked} Operatives
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CCTV ByteTrack edge tracking</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Verified Shift Compliance</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {summary.compliantShifts} Shifts
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Vision hours match claimed mandays</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Shift Dwell Discrepancies</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold font-mono mt-2 ${summary.flaggedDiscrepancies > 0 ? "text-rose-400" : "text-zinc-400"}`}>
              {summary.flaggedDiscrepancies} Flags
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">&gt; 1.5h variance or &lt; 60% active motion</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Avg Active Work Ratio</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-cyan-300 mt-2">
              {summary.avgProductiveRatio}%
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Motion density across work faces</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Tracks (${dwellRecords.length})` },
              { key: "DISCREPANCY_FLAGGED", label: `Discrepancies (${summary.flaggedDiscrepancies})` },
              { key: "SHIFT_AUDITED_COMPLIANT", label: "Compliant" },
              { key: "RECONCILED_FOR_DPR", label: "Locked in DPR" },
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
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-400 font-mono"
            >
              <option value="ALL">All Polygon Zones</option>
              <option value="ACTIVE_WORK_FACE">Active Work Face</option>
              <option value="MATERIAL_STAGING_YARD">Material Staging</option>
              <option value="REST_CANTEEN_AREA">Rest Area</option>
              <option value="FABRICATION_BENCH">Fabrication Bench</option>
              <option value="EXCLUSION_HAZARD_ZONE">Exclusion Hazard Zone</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search worker, trade, camera..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: TRACK ROSTER (7 cols) vs CV DWELL TELEMETRY INSPECTOR (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: TRACK SESSIONS ROSTER (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Camera Edge Stream Telemetry
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Operative Dwell-Time Sessions</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredRecords.length} Sessions</span>
            </div>

            <div className="space-y-3">
              {filteredRecords.map((rec) => {
                const isSelected = selectedRecord.id === rec.id;
                const isFlaggedRecord = rec.status === "DISCREPANCY_FLAGGED";

                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedRecord(rec)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {rec.track_session_code}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {rec.zone_classification.replace(/_/g, " ")}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isFlaggedRecord
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                            : rec.status === "RECONCILED_FOR_DPR"
                            ? "bg-purple-950 text-purple-400 border border-purple-800/50"
                            : "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                        }`}>
                          {rec.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className={`text-xs font-bold ${isFlaggedRecord ? "text-rose-400" : "text-emerald-400"}`}>
                          Vision: {rec.vision_detected_hours}h vs Claim: {rec.contractor_claimed_hours}h
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Active Work Ratio: {rec.active_work_ratio_pct}%
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{rec.worker_name} ({rec.trade_role})</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Contractor: <strong className="text-zinc-200">{rec.contractor_entity}</strong> &bull; Camera: {rec.camera_node_code}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Active: <strong className="text-emerald-400">{rec.active_motion_minutes}m</strong></span>
                      <span>Idle / Rest: <strong className="text-zinc-300">{rec.idle_break_minutes}m</strong></span>
                      <span>PPE Score: <strong className={rec.ppe_compliance_pct < 95 ? "text-rose-400" : "text-zinc-200"}>{rec.ppe_compliance_pct}%</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: DWELL INSPECTOR & DISCREPANCY AUDIT DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Vision Dwell Audit Sheet
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedRecord.track_session_code}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isFlagged
                  ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                  : "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
              }`}>
                {selectedRecord.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Operative Identity:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedRecord.worker_name}</strong>
              </div>
              <div className="pt-2 border-t border-zinc-800/60 flex justify-between text-[11px] text-zinc-400">
                <span>Trade Role:</span>
                <span className="text-white font-bold">{selectedRecord.trade_role}</span>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Contractor Entity:</span>
                <span className="text-zinc-200">{selectedRecord.contractor_entity}</span>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Camera Stream:</span>
                <span className="text-cyan-300 font-bold">{selectedRecord.camera_node_code}</span>
              </div>
            </div>

            {/* COMPUTER VISION MOTION DWELL METRICS */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Camera Dwell &amp; Shift Breakdown:
              </span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Contractor Claimed Shift Hours:</span>
                  <span className="text-white font-bold">{selectedRecord.contractor_claimed_hours} Hours</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Vision-Detected Active Shift:</span>
                  <span className="text-cyan-300 font-bold">{selectedRecord.vision_detected_hours} Hours</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Active Work-Zone Motion Dwell:</span>
                  <span className="text-emerald-400">{selectedRecord.active_motion_minutes} minutes</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Rest / Staging Dwell:</span>
                  <span className="text-zinc-300">{selectedRecord.idle_break_minutes} minutes</span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-zinc-800">
                  <span>Active Motion Density Ratio:</span>
                  <span className={`font-bold ${selectedRecord.active_work_ratio_pct < 60 ? "text-rose-400" : "text-emerald-400"}`}>
                    {selectedRecord.active_work_ratio_pct}% {selectedRecord.active_work_ratio_pct < 60 && "[LOW DENSITY]"}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-zinc-800">
                  <span>Claimed vs Observed Variance:</span>
                  <span className={`font-bold ${Math.abs(selectedRecord.variance_hours) > 1.5 ? "text-rose-400" : "text-zinc-200"}`}>
                    {selectedRecord.variance_hours > 0 ? `+${selectedRecord.variance_hours}h` : `${selectedRecord.variance_hours}h`}
                  </span>
                </div>
              </div>
            </div>

            {/* SAFETY & ZONE INFRACTIONS */}
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 font-mono text-xs space-y-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Camera Boundary &amp; PPE Evaluation:
              </span>

              <div className="flex justify-between items-center text-[11px]">
                <span>PPE Compliance (Helmet &amp; Vest):</span>
                <span className={`font-bold ${selectedRecord.ppe_compliance_pct >= 95 ? "text-emerald-400" : "text-rose-400"}`}>
                  {selectedRecord.ppe_compliance_pct}%
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span>Hazard Zone Breaches:</span>
                <span className={`font-bold ${selectedRecord.exclusion_zone_breaches === 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {selectedRecord.exclusion_zone_breaches} Incident(s)
                </span>
              </div>
            </div>

            {/* ACTIONS: RECONCILE TO DPR OR ESCALATE DISCREPANCY */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Shift Reconciliation Action:
              </span>

              {!isReconciled && (
                <button
                  type="button"
                  disabled={!isSuperintendentOrSeor || actionInProgress === `dpr_${selectedRecord.id}`}
                  onClick={() => handleReconcileToDpr(selectedRecord)}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Lock Dwell Hours into DPR Form 28 (Site Superintendent)</span>
                </button>
              )}

              {isReconciled && (
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-center text-xs space-y-1">
                  <div className="font-bold text-purple-400 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Dwell Hours Locked &amp; Reconciled in Daily DPR</span>
                  </div>
                  <div className="text-[10px]">
                    Verified by {selectedRecord.supervisor_auditor || "Site Superintendent"}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              Computer Vision ByteTrack Edge Telemetry Protocol
            </div>
          </div>

        </div>

        {/* INJECT VISION TRACK MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Inject CV Dwell Telemetry Track
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

              <form onSubmit={handleCreateDwell} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Track Session Ref</label>
                    <input
                      type="text"
                      required
                      value={trackCode}
                      onChange={(e) => setTrackCode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Camera Node</label>
                    <input
                      type="text"
                      required
                      value={cameraNode}
                      onChange={(e) => setCameraNode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Worker Name / Tag</label>
                    <input
                      type="text"
                      required
                      value={workerName}
                      onChange={(e) => setWorkerName(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Trade Role</label>
                    <input
                      type="text"
                      required
                      value={tradeRole}
                      onChange={(e) => setTradeRole(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
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
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Zone Polygon</label>
                    <select
                      value={zone}
                      onChange={(e) => setZone(e.target.value as DwellZoneType)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="ACTIVE_WORK_FACE">Active Work Face</option>
                      <option value="MATERIAL_STAGING_YARD">Material Staging Yard</option>
                      <option value="REST_CANTEEN_AREA">Rest Area</option>
                      <option value="FABRICATION_BENCH">Fabrication Bench</option>
                      <option value="EXCLUSION_HAZARD_ZONE">Exclusion Hazard Zone</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Active Motion (Mins)</label>
                    <input
                      type="number"
                      required
                      value={activeMins}
                      onChange={(e) => setActiveMins(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Idle Break (Mins)</label>
                    <input
                      type="number"
                      required
                      value={idleMins}
                      onChange={(e) => setIdleMins(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Contractor Claim (h)</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={claimedHours}
                      onChange={(e) => setClaimedHours(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">PPE Compliance Score (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={ppeScore}
                    onChange={(e) => setPpeScore(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
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
                    disabled={actionInProgress === "creating_dwell"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Commit Dwell Track</span>
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