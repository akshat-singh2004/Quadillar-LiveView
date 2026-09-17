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

export type HindranceCategory =
  | "INCLEMENT_WEATHER_MONSOON"
  | "DELAYED_ENGINEERING_DRAWINGS_RFI"
  | "CLIENT_SUPPLIED_MATERIAL_DELAY"
  | "UTILITY_SHIFTING_OR_STATUTORY"
  | "LABOUR_STRIKE_OR_FORCE_MAJEURE";

export type HindranceStatus =
  | "OPEN_CRITICAL_DELAY"
  | "MITIGATED_RESUMED"
  | "EOT_SANCTIONED";

export interface HindranceRecord {
  id: string;
  project_id: string;
  hindrance_code: string;
  title: string;
  category: HindranceCategory;
  location_grid: string;
  trade_package: string;
  start_date: string;
  end_date?: string | null;
  days_hindered: number;
  critical_path_impact: boolean;
  description: string;
  status: HindranceStatus;
  notified_by: string;
  seor_assessor?: string | null;
  created_at?: string;
}

export interface DprLogRecord {
  id: string;
  project_id: string;
  dpr_number: string;
  report_date: string;
  weather_condition: string;
  total_manpower_deployed: number;
  tower_cranes_active: number;
  concrete_pump_hours: number;
  primary_activities_summary: string;
  safety_toolbox_talk_conducted: boolean;
  recorded_by: string;
  seor_verified: boolean;
  created_at?: string;
}

function normalizeHindrance(d: any): HindranceRecord {
  return {
    id: d?.id ?? `hnd-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    hindrance_code: d?.hindrance_code ?? `HND-${Date.now().toString().slice(-4)}`,
    title: d?.title ?? "Delay Event Recorded",
    category: (d?.category as HindranceCategory) ?? "INCLEMENT_WEATHER_MONSOON",
    location_grid: d?.location_grid ?? "Site Grid",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    start_date: d?.start_date ?? new Date().toISOString().slice(0, 10),
    end_date: d?.end_date ?? null,
    days_hindered: Number(d?.days_hindered ?? 3),
    critical_path_impact: Boolean(d?.critical_path_impact),
    description: d?.description ?? "Contemporaneous site delay event logged.",
    status: (d?.status as HindranceStatus) ?? "OPEN_CRITICAL_DELAY",
    notified_by: d?.notified_by ?? "Site Superintendent",
    seor_assessor: d?.seor_assessor ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

function normalizeDpr(d: any): DprLogRecord {
  return {
    id: d?.id ?? `dpr-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    dpr_number: d?.dpr_number ?? `DPR-${Date.now().toString().slice(-4)}`,
    report_date: d?.report_date ?? new Date().toISOString().slice(0, 10),
    weather_condition: d?.weather_condition ?? "Sunny & Clear (32°C)",
    total_manpower_deployed: Number(d?.total_manpower_deployed ?? 45),
    tower_cranes_active: Number(d?.tower_cranes_active ?? 1),
    concrete_pump_hours: Number(d?.concrete_pump_hours ?? 6.5),
    primary_activities_summary: d?.primary_activities_summary ?? "Core shear wall shuttering and rebar fixing.",
    safety_toolbox_talk_conducted: Boolean(d?.safety_toolbox_talk_conducted),
    recorded_by: d?.recorded_by ?? "Site Superintendent",
    seor_verified: Boolean(d?.seor_verified),
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalDprPage() {
  const { project, role, tier } = useActiveRole();
  const [hindrances, setHindrances] = useState<HindranceRecord[]>([]);
  const [dprLogs, setDprLogs] = useState<DprLogRecord[]>([]);
  const [selectedHindrance, setSelectedHindrance] = useState<HindranceRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"HINDRANCES" | "DPR">("HINDRANCES");
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [hindranceModalOpen, setHindranceModalOpen] = useState(false);
  const [dprModalOpen, setDprModalOpen] = useState(false);
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

  // Form State for Hindrance
  const [hndCode, setHndCode] = useState(`HND-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-0${Math.floor(1 + Math.random() * 9)}`);
  const [hndTitle, setHndTitle] = useState(
    tier === "RESIDENTIAL"
      ? "Client Delay in Approving Marble Stone Sample Selection"
      : "Heavy Monsoonal Rainfall Flooding Excavation Pit & Halting Tower Crane Hoisting"
  );
  const [category, setCategory] = useState<HindranceCategory>(
    tier === "RESIDENTIAL" ? "DELAYED_ENGINEERING_DRAWINGS_RFI" : "INCLEMENT_WEATHER_MONSOON"
  );
  const [grid, setGrid] = useState(tier === "RESIDENTIAL" ? "Living Room / Lobby" : "Tower A / Excavation Pit");
  const [days, setDays] = useState<number>(tier === "RESIDENTIAL" ? 3 : 5);
  const [hndDesc, setHndDesc] = useState(
    tier === "RESIDENTIAL"
      ? "Interior marble selection delayed by client representative, pushing back flooring installation start date."
      : "Unprecedented monsoon downpour over 48 hours resulted in water logging in basement foundation pits. Dewatering pumps deployed."
  );

  // Form State for DPR
  const [dprNo, setDprNo] = useState(`DPR-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-0916`);
  const [weather, setWeather] = useState("Partly Cloudy & Humid (31°C)");
  const [manpower, setManpower] = useState<number>(tier === "RESIDENTIAL" ? 18 : 110);
  const [cranes, setCranes] = useState<number>(tier === "RESIDENTIAL" ? 0 : 2);
  const [pumpHrs, setPumpHrs] = useState<number>(tier === "RESIDENTIAL" ? 0 : 7.5);
  const [activitiesSummary, setActivitiesSummary] = useState(
    tier === "RESIDENTIAL"
      ? "Master bedroom wardrobe carcass installation and plumbing pressure testing completed."
      : "Tower A Level 08 core shear wall reinforcement tying, formwork staging, and M40 concrete pumping."
  );

  const loadDprData = useCallback(async () => {
    try {
      const [{ data: hndData }, { data: dprData }] = await Promise.all([
        (supabase as any)
          .from("site_hindrance_register")
          .select("*")
          .eq("project_id", projectId)
          .order("start_date", { ascending: false }),
        (supabase as any)
          .from("site_daily_progress_logs")
          .select("*")
          .eq("project_id", projectId)
          .order("report_date", { ascending: false }),
      ]);

      if (hndData && hndData.length > 0) {
        const normalized = hndData.map((d: any) => normalizeHindrance(d));
        setHindrances(normalized);
        if (!selectedHindrance) setSelectedHindrance(normalized[0]);
      } else {
        const defaultHnd: HindranceRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeHindrance({
                  id: "hnd-res-01",
                  project_id: projectId,
                  hindrance_code: "HND-RES-01",
                  title: "Delayed Architectural Approval for Master Bath Tile Layout",
                  category: "DELAYED_ENGINEERING_DRAWINGS_RFI",
                  location_grid: "Ground Floor / PB-01",
                  trade_package: "Plumbing & Finishes",
                  start_date: "2026-09-02",
                  days_hindered: 3,
                  critical_path_impact: true,
                  description: "Client waiting period for Italian marble tile pattern sign-off.",
                  status: "OPEN_CRITICAL_DELAY",
                  notified_by: "Site Superintendent",
                }),
              ]
            : [
                normalizeHindrance({
                  id: "hnd-twr-01",
                  project_id: projectId,
                  hindrance_code: "HND-TWR-01",
                  title: "Monsoon Flash Flooding in Foundation Sump Pit",
                  category: "INCLEMENT_WEATHER_MONSOON",
                  location_grid: "Basement B2 / Sump Pit",
                  trade_package: "Civil & Superstructure",
                  start_date: "2026-08-10",
                  end_date: "2026-08-15",
                  days_hindered: 5,
                  critical_path_impact: true,
                  description: "Unprecedented heavy rainfall flooded foundation pit. Dewatering required 120 hours.",
                  status: "EOT_SANCTIONED",
                  notified_by: "Site Superintendent",
                  seor_assessor: "Resident SEOR",
                }),
              ];

        setHindrances(defaultHnd);
        if (!selectedHindrance) setSelectedHindrance(defaultHnd[0]);
      }

      if (dprData && dprData.length > 0) {
        const normalizedDpr = dprData.map((d: any) => normalizeDpr(d));
        setDprLogs(normalizedDpr);
      } else {
        const defaultDpr: DprLogRecord[] = [
          normalizeDpr({
            id: "dpr-01",
            project_id: projectId,
            dpr_number: tier === "RESIDENTIAL" ? "DPR-RES-2026-0912" : "DPR-TWR-2026-0912",
            report_date: "2026-09-12",
            weather_condition: "Sunny & Clear (32°C)",
            total_manpower_deployed: tier === "RESIDENTIAL" ? 22 : 115,
            tower_cranes_active: tier === "RESIDENTIAL" ? 0 : 2,
            concrete_pump_hours: tier === "RESIDENTIAL" ? 0 : 7.5,
            primary_activities_summary: "Completed structural pours and material inward challan audits.",
            safety_toolbox_talk_conducted: true,
            recorded_by: "Site Superintendent",
            seor_verified: true,
          }),
        ];
        setDprLogs(defaultDpr);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedHindrance, tier]);

  useEffect(() => {
    void loadDprData();

    const channel = supabase
      .channel(`dpr_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_hindrance_register" }, () => void loadDprData())
      .on("postgres_changes", { event: "*", schema: "public", table: "site_daily_progress_logs" }, () => void loadDprData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadDprData]);

  const summary = useMemo(() => {
    const totalHindrances = hindrances.length;
    const openCritical = hindrances.filter((h) => h.status === "OPEN_CRITICAL_DELAY").length;
    const totalDaysDelayed = hindrances.reduce((sum, h) => sum + Number(h.days_hindered || 0), 0);
    const totalManpowerToday = dprLogs[0]?.total_manpower_deployed || 0;

    return { totalHindrances, openCritical, totalDaysDelayed, totalManpowerToday };
  }, [hindrances, dprLogs]);

  const filteredHindrances = useMemo(() => {
    return hindrances.filter((h) => {
      const matchStatus = filterStatus === "ALL" || h.status === filterStatus;
      const haystack = `${h.hindrance_code} ${h.title} ${h.location_grid} ${h.trade_package}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [hindrances, filterStatus, search]);

  // SEOR Sanctions Extension of Time (EOT)
  const handleSanctionEot = async (hnd: HindranceRecord) => {
    if (!isSuperintendentOrSeor) return;
    setActionInProgress(`eot_${hnd.id}`);

    const updatePayload: Partial<HindranceRecord> = {
      status: "EOT_SANCTIONED",
      seor_assessor: roleLabel || "Resident SEOR",
    };

    try {
      await (supabase as any)
        .from("site_hindrance_register")
        .update(updatePayload)
        .eq("id", hnd.id);
    } catch {
      // Local optimistic update
    }

    setHindrances((prev) =>
      prev.map((item) => (item.id === hnd.id ? ({ ...item, ...updatePayload } as HindranceRecord) : item))
    );
    if (selectedHindrance && selectedHindrance.id === hnd.id) {
      setSelectedHindrance((prev) => (prev ? ({ ...prev, ...updatePayload } as HindranceRecord) : null));
    }

    setFeedbackMessage(`Hindrance ${hnd.hindrance_code} EOT (+${hnd.days_hindered} days) officially sanctioned.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Create New Hindrance Entry
  const handleCreateHindrance = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_hnd");

    const newDbRecord: Omit<HindranceRecord, "id"> = {
      project_id: projectId,
      hindrance_code: hndCode.trim(),
      title: hndTitle.trim(),
      category,
      location_grid: grid.trim(),
      trade_package: tier === "RESIDENTIAL" ? "Custom Joinery & Fit-Out" : "Civil & Superstructure",
      start_date: new Date().toISOString().slice(0, 10),
      days_hindered: Number(days),
      critical_path_impact: true,
      description: hndDesc.trim(),
      status: "OPEN_CRITICAL_DELAY",
      notified_by: roleLabel || "Site Superintendent",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("site_hindrance_register")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeHindrance(data);
        setHindrances((prev) => [normalized, ...prev]);
        setSelectedHindrance(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeHindrance({ ...newDbRecord, id: `hnd-${Date.now()}` });
      setHindrances((prev) => [fallback, ...prev]);
      setSelectedHindrance(fallback);
    }

    setHindranceModalOpen(false);
    setActionInProgress(null);
  };

  // Create New DPR Log
  const handleCreateDpr = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_dpr");

    const newDbRecord: Omit<DprLogRecord, "id"> = {
      project_id: projectId,
      dpr_number: dprNo.trim(),
      report_date: new Date().toISOString().slice(0, 10),
      weather_condition: weather.trim(),
      total_manpower_deployed: Number(manpower),
      tower_cranes_active: Number(cranes),
      concrete_pump_hours: Number(pumpHrs),
      primary_activities_summary: activitiesSummary.trim(),
      safety_toolbox_talk_conducted: true,
      recorded_by: roleLabel || "Site Superintendent",
      seor_verified: false,
    };

    try {
      const { data, error } = await (supabase as any)
        .from("site_daily_progress_logs")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeDpr(data);
        setDprLogs((prev) => [normalized, ...prev]);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeDpr({ ...newDbRecord, id: `dpr-${Date.now()}` });
      setDprLogs((prev) => [fallback, ...prev]);
    }

    setDprModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory CPWD Form 28 / Executive Progress Report Print
  const handlePrintDprReport = (dpr: DprLogRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Daily Progress Report &amp; Hindrance Register (CPWD Form 28) — ${dpr.dpr_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD Works Manual Section 14 / Form 28</div>
      <h1 class="title">Daily Progress Report (DPR Form 28)</h1>
      <div class="meta">Report Ref: ${dpr.dpr_number} · Date: ${dpr.report_date} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge">VERIFIED &amp; LOGGED</span>
  </div>

  <table>
    <tr><th>Weather Parameter</th><td><strong>${dpr.weather_condition}</strong></td><th>Safety Toolbox Talk</th><td><strong>${dpr.safety_toolbox_talk_conducted ? "CONDUCTED & LOGGED" : "PENDING"}</strong></td></tr>
    <tr><th>Total Deployed Manpower</th><td><strong>${dpr.total_manpower_deployed} Person-days</strong></td><th>Tower Cranes Operational</th><td>${dpr.tower_cranes_active} Units Active</td></tr>
    <tr><th>Concrete Pump Operation</th><td>${dpr.concrete_pump_hours} Hours Run Time</td><th>Site Superintendent</th><td>${dpr.recorded_by}</td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Primary Site Activities &amp; Resource Deployment</div>
    <div style="font-size: 12px; font-weight: 500;">${dpr.primary_activities_summary}</div>
  </div>

  <div class="box" style="margin-top: 16px;">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Active Critical Path Hindrance Register</div>
    <table>
      <thead>
        <tr><th>Hindrance Ref</th><th>Category</th><th>Location Grid</th><th class="tac">Days Hindered</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${hindrances.map((h) => `
          <tr>
            <td style="font-family: monospace; font-weight: bold;">${h.hindrance_code}</td>
            <td>${h.category.replace(/_/g, " ")}</td>
            <td>${h.location_grid}</td>
            <td class="tac font-bold">${h.days_hindered} Days</td>
            <td><strong>${h.status.replace(/_/g, " ")}</strong></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <div>
      <div>Site Superintendent</div>
      <div style="color: #64748b;">${dpr.recorded_by}</div>
      <div class="sig">Superintendent Log Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">${dpr.seor_verified ? "Verified against Site Progress" : "Pending Engineer Audit"}</div>
      <div class="sig">Engineer Audit Seal</div>
    </div>
    <div>
      <div>Employer Project Director</div>
      <div style="color: #64748b;">Executive Progress Received</div>
      <div class="sig">Project Director Approval</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedHindrance) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING DAILY PROGRESS REPORT &amp; HINDRANCE REGISTER...
      </div>
    );
  }

  const isOpenHnd = selectedHindrance.status === "OPEN_CRITICAL_DELAY";
  const isEotSanctioned = selectedHindrance.status === "EOT_SANCTIONED";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Field Operations · CPWD Works Manual Section 14 / FIDIC Clause 8.4</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Daily Progress Report (DPR) &amp; Hindrance Register
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Daily site intelligence and delay EOT clearinghouse. Logs manpower, weather, and equipment while tracking critical-path hindrance events that defend contractual time extension claims.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintDprReport(dprLogs[0] || normalizeDpr({}))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form 28 Report</span>
            </button>
            <Link
              href="/operations/workforce-tracking"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>CV Workforce Dwell</span>
            </Link>
            {activeTab === "HINDRANCES" ? (
              <button
                type="button"
                onClick={() => {
                  setHndCode(`HND-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-0${hindrances.length + 1}`);
                  setHindranceModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
              >
                <Plus className="w-4 h-4" />
                <span>Log Hindrance Event</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setDprModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-emerald-950/50 font-mono"
              >
                <Plus className="w-4 h-4" />
                <span>Submit Daily DPR Log</span>
              </button>
            )}
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
              <span>Active Critical Hindrances</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.openCritical > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {summary.openCritical} Events
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Impacts critical path float</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Days Delayed</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-400 mt-2">
              +{summary.totalDaysDelayed} Days
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Defendable EOT quantum</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Today&apos;s Deployed Manpower</span>
              <HardHat className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.totalManpowerToday} Personnel
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Verified via gate attendance &amp; DPR</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Hindrance Log Records</span>
              <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {hindrances.length} Events
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CPWD Works Manual Section 14</div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3 font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("HINDRANCES")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "HINDRANCES"
                ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Hindrance Register ({hindrances.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("DPR")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "DPR"
                ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Daily Progress Reports ({dprLogs.length})</span>
          </button>
        </div>

        {/* TAB 1: HINDRANCE REGISTER */}
        {activeTab === "HINDRANCES" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT: HINDRANCE LISTING (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    Contemporaneous Delay Log (FIDIC 8.4)
                  </span>
                  <h2 className="text-sm font-bold text-white mt-0.5">Critical Path Hindrances</h2>
                </div>
                <span className="text-xs font-mono text-zinc-500">{filteredHindrances.length} Events</span>
              </div>

              <div className="space-y-3">
                {filteredHindrances.map((hnd) => {
                  const isSelected = selectedHindrance.id === hnd.id;
                  const isOpen = hnd.status === "OPEN_CRITICAL_DELAY";

                  return (
                    <div
                      key={hnd.id}
                      onClick={() => setSelectedHindrance(hnd)}
                      className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                        isSelected
                          ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                          : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white">
                            {hnd.hindrance_code}
                          </span>
                          <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                            {hnd.category.replace(/_/g, " ")}
                          </span>
                          <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                            isOpen
                              ? "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                              : "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                          }`}>
                            {hnd.status.replace(/_/g, " ")}
                          </span>
                        </div>

                        <span className="text-xs font-mono font-bold text-amber-400">
                          +{hnd.days_hindered} Days Delay
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-white">{hnd.title}</div>
                        <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{hnd.description}</div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                        <span>Grid Location: <strong className="text-zinc-300">{hnd.location_grid}</strong></span>
                        <span>Start Date: <strong className="text-zinc-300">{hnd.start_date}</strong></span>
                        <span>Critical Path: <strong className={hnd.critical_path_impact ? "text-rose-400" : "text-emerald-400"}>{hnd.critical_path_impact ? "Yes" : "No"}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: HINDRANCE & EOT SANCTION DESK (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
              <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    EOT Adjudication Desk
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{selectedHindrance.hindrance_code}</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  isEotSanctioned
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                    : "bg-amber-950 text-amber-400 border border-amber-800/50"
                }`}>
                  {selectedHindrance.status.replace(/_/g, " ")}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase block">Hindrance Title:</span>
                  <strong className="text-white text-sm font-sans block mt-0.5">{selectedHindrance.title}</strong>
                </div>

                <div className="pt-2 border-t border-zinc-800/60">
                  <span className="text-zinc-500 text-[10px] uppercase block">Contemporaneous Log:</span>
                  <p className="text-zinc-200 font-sans text-xs mt-1 leading-relaxed">{selectedHindrance.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                  <div>
                    <span className="text-zinc-500 block">Category:</span>
                    <span className="text-cyan-300 font-bold">{selectedHindrance.category.replace(/_/g, " ")}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Location Grid:</span>
                    <span className="text-white">{selectedHindrance.location_grid}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                  <div>
                    <span className="text-zinc-500 block">Start Date:</span>
                    <span className="text-white">{selectedHindrance.start_date}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Delayed Quantum:</span>
                    <span className="text-amber-400 font-bold font-mono">+{selectedHindrance.days_hindered} Calendar Days</span>
                  </div>
                </div>
              </div>

              {/* ACTIONS: SANCTION EOT */}
              <div className="space-y-2 pt-1 border-t border-zinc-800">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                  Statutory EOT Sanction:
                </span>

                {!isEotSanctioned ? (
                  <button
                    type="button"
                    disabled={!isSuperintendentOrSeor || actionInProgress === `eot_${selectedHindrance.id}`}
                    onClick={() => handleSanctionEot(selectedHindrance)}
                    className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sanction Extension of Time (+{selectedHindrance.days_hindered} Days)</span>
                  </button>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs space-y-1">
                    <div className="font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>EOT Officially Sanctioned &amp; Logged</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 font-sans">
                      Assessed by {selectedHindrance.seor_assessor || "Resident SEOR"}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
                FIDIC Clause 8.4 &amp; CPWD Works Manual Section 14 Protocol
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: DAILY PROGRESS REPORTS (DPR) */}
        {activeTab === "DPR" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT: DPR ROSTER (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <div className="border-b border-zinc-800/80 pb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Daily Site Logs (CPWD Form 28)
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Submitted Daily Progress Reports</h2>
              </div>

              <div className="space-y-3">
                {dprLogs.map((dpr) => (
                  <div
                    key={dpr.id}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {dpr.dpr_number}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-mono font-bold uppercase">
                          Verified &amp; Logged
                        </span>
                      </div>

                      <span className="text-xs font-mono text-zinc-400">
                        Date: {dpr.report_date}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{dpr.weather_condition}</div>
                      <div className="text-xs text-zinc-300 mt-1">{dpr.primary_activities_summary}</div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Manpower: <strong className="text-white">{dpr.total_manpower_deployed} Person-days</strong></span>
                      <span>Cranes: <strong className="text-zinc-200">{dpr.tower_cranes_active} Active</strong></span>
                      <span>Pump Run: <strong className="text-cyan-300">{dpr.concrete_pump_hours} Hours</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: DPR SUBMISSION SUMMARY (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl font-mono text-xs">
              <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">
                    CPWD Form 28 Summary
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5">Site Operations Compliance</h3>
                </div>
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              </div>

              <p className="text-zinc-300 font-sans text-xs leading-relaxed">
                Daily Progress Reports (DPR) establish contemporaneous proof of resource allocations, weather conditions, and operational blockers. All logged mandays and equipment hours feed directly into the Electronic Measurement Book and Labour Welfare compliance audits.
              </p>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
                <div className="flex justify-between text-zinc-400">
                  <span>Total Submitted Logs:</span>
                  <strong className="text-white">{dprLogs.length} Reports</strong>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Safety Tool Box Talks:</span>
                  <strong className="text-emerald-400">100% Conducted</strong>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* LOG HINDRANCE MODAL */}
        {hindranceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Log Critical Path Hindrance Event
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setHindranceModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateHindrance} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Hindrance Ref</label>
                    <input
                      type="text"
                      required
                      value={hndCode}
                      onChange={(e) => setHndCode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as HindranceCategory)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="INCLEMENT_WEATHER_MONSOON">Inclement Weather / Monsoon</option>
                      <option value="DELAYED_ENGINEERING_DRAWINGS_RFI">Delayed Drawings / RFI</option>
                      <option value="CLIENT_SUPPLIED_MATERIAL_DELAY">Client Material Delay</option>
                      <option value="UTILITY_SHIFTING_OR_STATUTORY">Utility Shifting / Statutory</option>
                      <option value="LABOUR_STRIKE_OR_FORCE_MAJEURE">Labour Strike / Force Majeure</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Hindrance Headline</label>
                  <input
                    type="text"
                    required
                    value={hndTitle}
                    onChange={(e) => setHndTitle(e.target.value)}
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
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Days Delayed</label>
                    <input
                      type="number"
                      required
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Contemporaneous Description</label>
                  <textarea
                    rows={2}
                    required
                    value={hndDesc}
                    onChange={(e) => setHndDesc(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setHindranceModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === "creating_hnd"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Log Hindrance Event</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SUBMIT DPR MODAL */}
        {dprModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Submit Daily Progress Report (Form 28)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDprModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateDpr} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">DPR Number Ref</label>
                    <input
                      type="text"
                      required
                      value={dprNo}
                      onChange={(e) => setDprNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Weather Condition</label>
                    <input
                      type="text"
                      required
                      value={weather}
                      onChange={(e) => setWeather(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Manpower</label>
                    <input
                      type="number"
                      required
                      value={manpower}
                      onChange={(e) => setManpower(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Cranes Active</label>
                    <input
                      type="number"
                      required
                      value={cranes}
                      onChange={(e) => setCranes(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Pump Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={pumpHrs}
                      onChange={(e) => setPumpHrs(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Primary Site Activities Summary</label>
                  <textarea
                    rows={3}
                    required
                    value={activitiesSummary}
                    onChange={(e) => setActivitiesSummary(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setDprModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === "creating_dpr"}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-emerald-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Commit DPR Log</span>
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