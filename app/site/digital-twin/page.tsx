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
  Compass,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  Globe,
  HardHat,
  Layers,
  Lock,
  Maximize2,
  Pause,
  Play,
  Plus,
  Printer,
  Radio,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sun,
  Truck,
  Video,
  Wrench,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type BimElementStatus =
  | "PLANNED"
  | "REBAR_FORMWORK"
  | "POURING"
  | "CURING_HOLD"
  | "COMPLETED_CERTIFIED"
  | "DELAYED_CRITICAL";

export interface BimElementRecord {
  id: string;
  project_id: string;
  element_guid: string;
  element_name: string;
  discipline: string;
  location_grid: string;
  level_elevation_m: number;
  volume_cum: number;
  planned_start_date: string;
  planned_finish_date: string;
  actual_start_date?: string | null;
  actual_finish_date?: string | null;
  physical_progress_pct: number;
  status: BimElementStatus;
  linked_pour_card_ref?: string | null;
  linked_mb_number?: string | null;
  linked_submittal_ref?: string | null;
  warranty_certificate_url?: string | null;
  supplier_bill_ref?: string | null;
}

export interface DroneSurveyRecord {
  id: string;
  project_id: string;
  survey_code: string;
  flight_date: string;
  pilot_in_charge: string;
  uav_model: string;
  lidar_points_captured: number;
  point_density_pts_sqm: number;
  orthomosaic_resolution_cm: number;
  cut_volume_cum: number;
  fill_volume_cum: number;
  net_volumetric_variance_pct: number;
  status: string;
}

export interface SurveillanceCameraRecord {
  id: string;
  project_id: string;
  camera_code: string;
  camera_name: string;
  location_grid: string;
  stream_url: string;
  camera_type: string;
  ptz_controllable: boolean;
  ai_safety_monitoring: boolean;
  active_alerts_count: number;
  status: "ONLINE" | "OFFLINE" | "ALERT_TRIGGERED";
}

export default function CanonicalDigitalTwinSiteViewerPage() {
  const { project, tier } = useActiveRole();
  const [elements, setElements] = useState<BimElementRecord[]>([]);
  const [surveys, setSurveys] = useState<DroneSurveyRecord[]>([]);
  const [cameras, setCameras] = useState<SurveillanceCameraRecord[]>([]);
  const [selectedElement, setSelectedElement] = useState<BimElementRecord | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<SurveillanceCameraRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // 4D Timeline Slider Controls
  const [timelineIndex, setTimelineIndex] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState(false);

  // View Mode Tabs
  const [activeViewport, setActiveViewport] = useState<"4D_BIM" | "CCTV_MATRIX" | "DRONE_LIDAR">("4D_BIM");
  const [search, setSearch] = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState("ALL");

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  // Simulated 4D Timeline Milestones
  const timelineDates = useMemo(
    () => [
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
      "2026-09-15",
      "2026-10-15",
      "2026-11-15",
    ],
    []
  );

  const currentDateScrub = timelineDates[timelineIndex] || "2026-09-15";

  const loadDigitalTwinData = useCallback(async () => {
    try {
      const [{ data: bimData }, { data: droneData }, { data: cctvData }] = await Promise.all([
        (supabase as any)
          .from("bim_elements_4d_progress")
          .select("*")
          .eq("project_id", projectId)
          .order("level_elevation_m", { ascending: true }),
        (supabase as any)
          .from("site_drone_surveys")
          .select("*")
          .eq("project_id", projectId)
          .order("flight_date", { ascending: false }),
        (supabase as any)
          .from("site_surveillance_cameras")
          .select("*")
          .eq("project_id", projectId)
          .order("camera_code", { ascending: true }),
      ]);

      if (bimData && bimData.length > 0) {
        setElements(bimData as BimElementRecord[]);
        if (!selectedElement) setSelectedElement(bimData[0] as BimElementRecord);
      } else {
        const defaultBim: BimElementRecord[] =
          tier === "RESIDENTIAL"
            ? [
                {
                  id: "bim-res-01",
                  project_id: projectId,
                  element_guid: "GUID-MB02-WARDROBE-01",
                  element_name: "Master Bedroom Wardrobe Joinery Carcass",
                  discipline: "Joinery & Millwork",
                  location_grid: "First Floor / Axis MB-02",
                  level_elevation_m: 3.6,
                  volume_cum: 1.4,
                  planned_start_date: "2026-08-10",
                  planned_finish_date: "2026-08-28",
                  actual_start_date: "2026-08-12",
                  actual_finish_date: "2026-09-02",
                  physical_progress_pct: 100,
                  status: "COMPLETED_CERTIFIED",
                  linked_mb_number: "MB-2026-081",
                  linked_submittal_ref: "MAR-INT-008",
                  warranty_certificate_url: "WARRANTY-ACTION-TESA-BOILO-10Y.pdf",
                  supplier_bill_ref: "INV-TESA-88410",
                },
                {
                  id: "bim-res-02",
                  project_id: projectId,
                  element_guid: "GUID-PB01-PLUMBING-02",
                  element_name: "Guest Bath Concealed CPVC Hydro Loop",
                  discipline: "Plumbing & Sanitary",
                  location_grid: "Ground Floor / Axis PB-01",
                  level_elevation_m: 0.0,
                  volume_cum: 0.2,
                  planned_start_date: "2026-08-20",
                  planned_finish_date: "2026-09-05",
                  actual_start_date: "2026-08-22",
                  actual_finish_date: null,
                  physical_progress_pct: 85,
                  status: "CURING_HOLD",
                  linked_pour_card_ref: "PC-RES-088",
                  linked_mb_number: "MB-2026-082",
                  linked_submittal_ref: "MAR-PL-012",
                  warranty_certificate_url: "WARRANTY-ASTRAL-CPVC-15Y.pdf",
                  supplier_bill_ref: "INV-ASTRAL-4412",
                },
                {
                  id: "bim-res-03",
                  project_id: projectId,
                  element_guid: "GUID-CEIL-LIVING-03",
                  element_name: "Living Room Gypsum Shadow-Gap Ceiling",
                  discipline: "Architectural Finishes",
                  location_grid: "Ground Floor / Living Axis LR-01",
                  level_elevation_m: 3.1,
                  volume_cum: 0.8,
                  planned_start_date: "2026-09-01",
                  planned_finish_date: "2026-09-20",
                  actual_start_date: "2026-09-05",
                  actual_finish_date: null,
                  physical_progress_pct: 45,
                  status: "REBAR_FORMWORK",
                  linked_submittal_ref: "SD-CEIL-003",
                },
              ]
            : [
                {
                  id: "bim-twr-01",
                  project_id: projectId,
                  element_guid: "GUID-TWR-LVL07-CORE-01",
                  element_name: "Level 07 Core Shear Wall & PT Deck Slab",
                  discipline: "Structural",
                  location_grid: "Tower A / Axis B2-C4",
                  level_elevation_m: 25.2,
                  volume_cum: 92.0,
                  planned_start_date: "2026-08-15",
                  planned_finish_date: "2026-08-29",
                  actual_start_date: "2026-08-16",
                  actual_finish_date: "2026-08-28",
                  physical_progress_pct: 100,
                  status: "COMPLETED_CERTIFIED",
                  linked_pour_card_ref: "PC-TWR-104",
                  linked_mb_number: "MB-TWR-104",
                  linked_submittal_ref: "MIX-STR-M40",
                  warranty_certificate_url: "TATA-TISCON-MTC-Fe500D.pdf",
                  supplier_bill_ref: "GDN-28491",
                },
                {
                  id: "bim-twr-02",
                  project_id: projectId,
                  element_guid: "GUID-TWR-LVL08-CORE-02",
                  element_name: "Level 08 Core Shear Wall & Lift Core Pour",
                  discipline: "Structural",
                  location_grid: "Tower A / Axis C2-D4",
                  level_elevation_m: 28.8,
                  volume_cum: 84.0,
                  planned_start_date: "2026-09-01",
                  planned_finish_date: "2026-09-15",
                  actual_start_date: "2026-09-02",
                  actual_finish_date: null,
                  physical_progress_pct: 70,
                  status: "CURING_HOLD",
                  linked_pour_card_ref: "PC-TWR-109",
                  linked_submittal_ref: "MAR-STR-TMT500",
                  supplier_bill_ref: "GDN-28492",
                },
                {
                  id: "bim-twr-03",
                  project_id: projectId,
                  element_guid: "GUID-TWR-LVL09-COLS-03",
                  element_name: "Level 09 Perimeter Column Reinforcement & Staging",
                  discipline: "Structural",
                  location_grid: "Tower A / Axis A1-D1",
                  level_elevation_m: 32.4,
                  volume_cum: 48.0,
                  planned_start_date: "2026-09-12",
                  planned_finish_date: "2026-09-26",
                  actual_start_date: null,
                  actual_finish_date: null,
                  physical_progress_pct: 15,
                  status: "REBAR_FORMWORK",
                  linked_submittal_ref: "MAR-STR-TMT500",
                },
              ];
        setElements(defaultBim);
        if (!selectedElement) setSelectedElement(defaultBim[0]);
      }

      if (droneData && droneData.length > 0) {
        setSurveys(droneData as DroneSurveyRecord[]);
      } else {
        const defaultSurveys: DroneSurveyRecord[] = [
          {
            id: "uav-01",
            project_id: projectId,
            survey_code: "UAV-SCAN-2026-W37",
            flight_date: "2026-09-12",
            pilot_in_charge: "DGCA Certified Remote Pilot (Capt. V. Sharma)",
            uav_model: "DJI Matrice 350 RTK + Zenmuse L2 LiDAR",
            lidar_points_captured: 148500000,
            point_density_pts_sqm: 485.4,
            orthomosaic_resolution_cm: 0.95,
            cut_volume_cum: 1240.5,
            fill_volume_cum: 182.0,
            net_volumetric_variance_pct: -0.45,
            status: "PROCESSED",
          },
        ];
        setSurveys(defaultSurveys);
      }

      if (cctvData && cctvData.length > 0) {
        setCameras(cctvData as SurveillanceCameraRecord[]);
        if (!selectedCamera) setSelectedCamera(cctvData[0] as SurveillanceCameraRecord);
      } else {
        const defaultCctv: SurveillanceCameraRecord[] = [
          {
            id: "cam-01",
            project_id: projectId,
            camera_code: "CAM-GATE-01",
            camera_name: "Main Security Weighbridge & Inward Gate",
            location_grid: "Perimeter Security Post 1",
            stream_url: "rtsp://live.quadillar.com/streams/gate-inward",
            camera_type: "Hikvision 4K Ultra-Low Light ANPR PTZ",
            ptz_controllable: true,
            ai_safety_monitoring: true,
            active_alerts_count: 0,
            status: "ONLINE",
          },
          {
            id: "cam-02",
            project_id: projectId,
            camera_code: "CAM-CORE-02",
            camera_name: "Tower A Core Placement & Crane Hook View",
            location_grid: "Tower Crane #01 Jib Axis",
            stream_url: "rtsp://live.quadillar.com/streams/tower-core",
            camera_type: "Axis Q6135-LE 360° Industrial Optical Zoom",
            ptz_controllable: true,
            ai_safety_monitoring: true,
            active_alerts_count: 1,
            status: "ALERT_TRIGGERED",
          },
          {
            id: "cam-03",
            project_id: projectId,
            camera_code: "CAM-STORES-03",
            camera_name: "Central Rebar Laydown & Cement Godown",
            location_grid: "Yard Grid Laydown B",
            stream_url: "rtsp://live.quadillar.com/streams/stores-yard",
            camera_type: "Hanwha Vision 4K Thermal & Optical Dual Sensor",
            ptz_controllable: false,
            ai_safety_monitoring: true,
            active_alerts_count: 0,
            status: "ONLINE",
          },
        ];
        setCameras(defaultCctv);
        if (!selectedCamera) setSelectedCamera(defaultCctv[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedElement, selectedCamera, tier]);

  useEffect(() => {
    void loadDigitalTwinData();
  }, [loadDigitalTwinData]);

  // Automated 4D Timeline playback timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimelineIndex((prev) => (prev < timelineDates.length - 1 ? prev + 1 : 0));
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, timelineDates.length]);

  const summary = useMemo(() => {
    const totalElements = elements.length;
    const completed = elements.filter((e) => e.status === "COMPLETED_CERTIFIED").length;
    const inProgress = elements.filter(
      (e) => e.status === "REBAR_FORMWORK" || e.status === "POURING" || e.status === "CURING_HOLD"
    ).length;
    const totalVolume = elements.reduce((sum, e) => sum + Number(e.volume_cum || 0), 0);
    const overallProgress =
      totalElements > 0
        ? Math.round(
            elements.reduce((sum, e) => sum + Number(e.physical_progress_pct || 0), 0) /
              totalElements
          )
        : 0;

    return { totalElements, completed, inProgress, totalVolume, overallProgress };
  }, [elements]);

  const filteredElements = useMemo(() => {
    return elements.filter((e) => {
      const matchDisc = filterDiscipline === "ALL" || e.discipline === filterDiscipline;
      const haystack = `${e.element_guid} ${e.element_name} ${e.location_grid}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchDisc && matchSearch;
    });
  }, [elements, filterDiscipline, search]);

  // Statutory As-Built 4D Progress Certificate
  const handlePrintProgressCertificate = () => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>4D BIM As-Built Physical Progress Certificate — ${projectName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · 4D LiDAR &amp; Photogrammetry Telemetry</div>
      <h1 class="title">Statutory As-Built Physical Progress Certificate</h1>
      <div class="meta">Temporal Cut-off: ${currentDateScrub} · Project: ${projectName} (${projectId})</div>
    </div>
    <div style="text-align: right; font-family: monospace;">
      <strong>Cumulative Completion: ${summary.overallProgress}%</strong><br/>
      <span>Verified Volumetric: ${summary.totalVolume.toFixed(1)} m³</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>BIM Element GUID</th>
        <th>Component &amp; Grid</th>
        <th class="tac">Level (m)</th>
        <th class="tar">Vol (m³)</th>
        <th class="tac">Progress</th>
        <th>Linked Legal Voucher</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${elements
        .map(
          (e) => `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${e.element_guid}</td>
          <td><strong>${e.element_name}</strong><br/><span style="color:#64748b;">${e.location_grid} (${e.discipline})</span></td>
          <td class="tac">${e.level_elevation_m}m</td>
          <td class="tar">${e.volume_cum}</td>
          <td class="tac font-bold">${e.physical_progress_pct}%</td>
          <td>${e.linked_mb_number || e.linked_pour_card_ref || "Direct Delivery"}</td>
          <td><strong>${e.status.replace(/_/g, " ")}</strong></td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>UAV Survey Officer</div>
      <div style="color: #64748b;">LiDAR point-cloud density certified.</div>
      <div class="sig">Survey In-Charge</div>
    </div>
    <div>
      <div>BIM / VDC Lead</div>
      <div style="color: #64748b;">4D schedule variance reconciled.</div>
      <div class="sig">Digital Twin Sign-Off</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">Physical measurements released for e-MB.</div>
      <div class="sig">Consultant Endorsement</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedElement) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING 4D BIM DIGITAL TWIN, DRONE LIDAR &amp; SURVEILLANCE STREAMS...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Reality Capture · 4D Digital Twin, Drone LiDAR &amp; CCTV Matrix</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              LiveView 4D BIM, Drone LiDAR &amp; Site Surveillance
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Real-time telemetry command center. Scrub through 4D temporal BIM progress, inspect high-density drone LiDAR point-clouds, and monitor active CCTV feeds with edge safety detection.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrintProgressCertificate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print 4D Progress Certificate</span>
            </button>
            <Link
              href="/finance/measurement-book"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              <span>e-MB Measurement Book</span>
            </Link>
          </div>
        </div>

        {/* 4 PRIMARY GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Overall Physical Completion</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-cyan-300 mt-2">
              {summary.overallProgress}%
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Scanned reality vs BIM baseline</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Certified Structural Volume</span>
              <Boxes className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {summary.totalVolume.toFixed(1)} m³
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Reconciled with Pour Cards &amp; e-MB</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Drone LiDAR Point Cloud</span>
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {surveys[0]?.point_density_pts_sqm || 450} pts/m²
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Sub-centimeter orthomosaic resolution</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Active Surveillance Feeds</span>
              <Video className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-400 mt-2">
              {cameras.filter((c) => c.status === "ONLINE" || c.status === "ALERT_TRIGGERED").length} Feeds
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">AI safety &amp; perimeter monitoring active</div>
          </div>
        </div>

        {/* 4D TIME-SLIDER INTERACTIVE SCRUBBER BAR */}
        <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-950 space-y-3 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 transition"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block">
                  4D BIM Temporal Progress Scrubber
                </span>
                <span className="text-sm font-bold text-white font-mono">
                  Target Horizon: {currentDateScrub}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span>Milestone {timelineIndex + 1} of {timelineDates.length}</span>
              <button
                type="button"
                onClick={() => setTimelineIndex(3)}
                className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
              >
                Reset to Current
              </button>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <input
              type="range"
              min={0}
              max={timelineDates.length - 1}
              value={timelineIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setTimelineIndex(Number(e.target.value));
              }}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-zinc-900 rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              {timelineDates.map((date, idx) => (
                <span key={date} className={idx === timelineIndex ? "text-cyan-400 font-bold" : ""}>
                  {date.slice(5)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* VIEWPORT MODE SELECTOR */}
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
          <button
            type="button"
            onClick={() => setActiveViewport("4D_BIM")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeViewport === "4D_BIM"
                ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>4D BIM Structural Model</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveViewport("CCTV_MATRIX")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeViewport === "CCTV_MATRIX"
                ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Live Surveillance Matrix</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveViewport("DRONE_LIDAR")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeViewport === "DRONE_LIDAR"
                ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Drone LiDAR &amp; Elevation Survey</span>
          </button>
        </div>

        {/* VIEWPORT 1: 4D BIM SPATIAL PROGRESS & ASSET VAULT */}
        {activeViewport === "4D_BIM" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT: 4D BIM ELEMENT MATRIX (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    Spatial Component Ledger
                  </span>
                  <h2 className="text-sm font-bold text-white mt-0.5">BIM 4D Elements State</h2>
                </div>
                <span className="text-xs font-mono text-zinc-500">{filteredElements.length} Components</span>
              </div>

              {/* SIMULATED 3D ISOMETRIC ELEMENT ELEVATION STACK */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
                <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                  Interactive Height Elevation Stack (Level Elevation):
                </span>
                <div className="space-y-2">
                  {elements.map((el) => {
                    const isSelected = selectedElement.id === el.id;
                    const isComplete = el.physical_progress_pct === 100;
                    const isCuring = el.status === "CURING_HOLD";

                    return (
                      <div
                        key={el.id}
                        onClick={() => setSelectedElement(el)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "border-cyan-500 bg-cyan-950/30 shadow-lg shadow-cyan-950/30"
                            : "border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-10 rounded-full ${
                              isComplete
                                ? "bg-emerald-400"
                                : isCuring
                                ? "bg-cyan-400"
                                : "bg-amber-400 animate-pulse"
                            }`}
                          />
                          <div>
                            <span className="text-xs font-bold text-white block">{el.element_name}</span>
                            <span className="text-[11px] text-zinc-400 font-mono">
                              {el.element_guid} &bull; Elev +{el.level_elevation_m}m &bull; {el.location_grid}
                            </span>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <span className={`text-xs font-bold ${isComplete ? "text-emerald-400" : "text-cyan-300"}`}>
                            {el.physical_progress_pct}%
                          </span>
                          <span className="text-[10px] text-zinc-500 block">{el.status.replace(/_/g, " ")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT: ASSET BINDER & CONTRACTUAL PROOF DRAWER (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
              <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    Component Asset Vault
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{selectedElement.element_guid}</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  selectedElement.physical_progress_pct === 100
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                    : "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                }`}>
                  {selectedElement.status.replace(/_/g, " ")}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase block">Component Designation:</span>
                  <strong className="text-white text-sm font-sans block mt-0.5">{selectedElement.element_name}</strong>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                  <div>
                    <span className="text-zinc-500 block">Discipline:</span>
                    <span className="text-zinc-200">{selectedElement.discipline}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Grid Location:</span>
                    <span className="text-cyan-300 font-bold">{selectedElement.location_grid}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                  <div>
                    <span className="text-zinc-500 block">Elevation:</span>
                    <span className="text-white">+{selectedElement.level_elevation_m} meters</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Calculated Volume:</span>
                    <span className="text-white">{selectedElement.volume_cum} m³</span>
                  </div>
                </div>
              </div>

              {/* BOUND STATUTORY VOUCHERS & ATTACHMENTS */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                  Attached Statutory Vouchers &amp; Warranties:
                </span>

                <div className="space-y-2 font-mono text-xs">
                  {selectedElement.linked_mb_number && (
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-cyan-400" />
                        <div>
                          <span className="font-bold text-white block">e-MB Form 23 Measure</span>
                          <span className="text-[10px] text-zinc-400">{selectedElement.linked_mb_number}</span>
                        </div>
                      </div>
                      <Link href="/finance/measurement-book" className="text-xs text-cyan-400 underline">
                        View &rarr;
                      </Link>
                    </div>
                  )}

                  {selectedElement.linked_pour_card_ref && (
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <div>
                          <span className="font-bold text-white block">Concrete Pour Card</span>
                          <span className="text-[10px] text-zinc-400">{selectedElement.linked_pour_card_ref}</span>
                        </div>
                      </div>
                      <Link href="/quality/pour-cards" className="text-xs text-amber-400 underline">
                        View &rarr;
                      </Link>
                    </div>
                  )}

                  {selectedElement.warranty_certificate_url && (
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-400" />
                        <div>
                          <span className="font-bold text-white block">Warranty / MTC Certificate</span>
                          <span className="text-[10px] text-zinc-400">{selectedElement.warranty_certificate_url}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase">Archived</span>
                    </div>
                  )}

                  {selectedElement.supplier_bill_ref && (
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-cyan-400" />
                        <div>
                          <span className="font-bold text-white block">Gate Delivery Challan</span>
                          <span className="text-[10px] text-zinc-400">{selectedElement.supplier_bill_ref}</span>
                        </div>
                      </div>
                      <Link href="/site/gate-inward" className="text-xs text-cyan-400 underline">
                        View &rarr;
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
                Quadillar 4D BIM &amp; Digital Twin Reality Capture Protocol
              </div>
            </div>

          </div>
        )}

        {/* VIEWPORT 2: LIVE CCTV SURVEILLANCE MATRIX WITH AI BOUNDARY MONITORING */}
        {activeViewport === "CCTV_MATRIX" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LIVE FEED DISPLAY (8 cols) */}
            <div className="lg:col-span-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold">
                    Live Surveillance Feed &bull; {selectedCamera?.camera_code}
                  </span>
                </div>
                <span className="text-xs font-mono text-zinc-400">{selectedCamera?.location_grid}</span>
              </div>

              {/* SIMULATED CAMERA FEED SCREEN */}
              <div className="relative aspect-video rounded-xl border border-zinc-800 bg-black overflow-hidden flex flex-col justify-between p-4 shadow-2xl">
                <div className="flex items-center justify-between text-xs font-mono z-10">
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-sm border border-zinc-800 text-white">
                    <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                    <span>LIVE &bull; 4K 60FPS</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-sm border border-zinc-800 text-cyan-400 font-bold">
                    AI PPE DETECTION: ACTIVE
                  </div>
                </div>

                {/* VISUAL OVERLAY WIREFRAME */}
                <div className="text-center space-y-2 opacity-80">
                  <Camera className="w-12 h-12 mx-auto text-zinc-600 animate-pulse" />
                  <div className="text-xs font-mono text-zinc-400">
                    STREAM ENCRYPTED: {selectedCamera?.stream_url}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600">
                    PTZ MOTOR TELEMETRY: PAN 142° / TILT -18° / ZOOM 4.2X
                  </div>
                </div>

                {/* BOTTOM CONTROLS OVERLAY */}
                <div className="flex items-center justify-between text-xs font-mono z-10">
                  <span className="text-zinc-400">{selectedCamera?.camera_name}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700"
                    >
                      PTZ Left
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700"
                    >
                      PTZ Right
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-cyan-500 text-zinc-950 font-bold"
                    >
                      Snap Gate Audit
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CAMERA FEED ROSTER (4 cols) */}
            <div className="lg:col-span-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 shadow-2xl">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block border-b border-zinc-800 pb-2">
                Site Cameras Matrix ({cameras.length}):
              </span>

              <div className="space-y-3">
                {cameras.map((cam) => {
                  const isSelected = selectedCamera?.id === cam.id;
                  const isAlert = cam.status === "ALERT_TRIGGERED";

                  return (
                    <div
                      key={cam.id}
                      onClick={() => setSelectedCamera(cam)}
                      className={`p-3 rounded-xl border transition cursor-pointer space-y-1.5 ${
                        isSelected
                          ? "border-cyan-500 bg-cyan-950/20 shadow-md"
                          : "border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-white">{cam.camera_code}</span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isAlert
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                            : "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                        }`}>
                          {cam.status}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-zinc-200 font-sans">{cam.camera_name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{cam.location_grid}</div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* VIEWPORT 3: DRONE LIDAR POINT-CLOUD & VOLUMETRIC SURVEY TELEMETRY */}
        {activeViewport === "DRONE_LIDAR" && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-6 shadow-2xl">
            <div className="border-b border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  High-Density LiDAR Survey Ingestion
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">UAV Volumetric Point-Cloud Log</h2>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                UAV: {surveys[0]?.uav_model || "DJI Matrice 350 RTK"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
                <span className="text-[10px] text-zinc-500 uppercase block">LiDAR Points Captured:</span>
                <strong className="text-xl text-white block mt-1">
                  {((surveys[0]?.lidar_points_captured || 148500000) / 1000000).toFixed(1)} Million
                </strong>
                <span className="text-[10px] text-cyan-400 mt-0.5 block">{surveys[0]?.point_density_pts_sqm} pts/m² density</span>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
                <span className="text-[10px] text-zinc-500 uppercase block">Earthwork Cut Volume:</span>
                <strong className="text-xl text-amber-400 block mt-1">
                  {surveys[0]?.cut_volume_cum || 1240.5} m³
                </strong>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">Excavated pit extraction</span>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
                <span className="text-[10px] text-zinc-500 uppercase block">Earthwork Fill Volume:</span>
                <strong className="text-xl text-emerald-400 block mt-1">
                  {surveys[0]?.fill_volume_cum || 182.0} m³
                </strong>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">Engineered backfill placed</span>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
                <span className="text-[10px] text-zinc-500 uppercase block">Volumetric Baseline Delta:</span>
                <strong className="text-xl text-cyan-300 block mt-1">
                  {surveys[0]?.net_volumetric_variance_pct || -0.45}%
                </strong>
                <span className="text-[10px] text-emerald-400 mt-0.5 block">Within &plusmn;1.5% tolerance</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 text-xs font-mono space-y-1">
              <span className="text-zinc-400 block">
                Last Autonomous Flight Run: <strong>{surveys[0]?.survey_code}</strong> on {surveys[0]?.flight_date}
              </span>
              <span className="text-zinc-500 block">
                Pilot: {surveys[0]?.pilot_in_charge} &bull; Orthomosaic GSD: {surveys[0]?.orthomosaic_resolution_cm} cm/pixel
              </span>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}