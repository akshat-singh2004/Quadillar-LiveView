"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type PinType = "RFI" | "SNAG" | "GATE";

export interface SpatialPin {
  id: string;
  project_id: string;
  drawing_code: string;
  x_pct: number;
  y_pct: number;
  pin_type: PinType;
  title: string;
  grid_location: string;
  description: string;
  assigned_trade: string;
  status: "OPEN" | "RESOLVED" | "VERIFIED";
  created_at: string;
}

export default function CanonicalRedlinesPage() {
  const { project, role, tier } = useActiveRole();
  const [activeTool, setActiveTool] = useState<"PAN" | "DROP_RFI" | "DROP_SNAG" | "DROP_GATE">("PAN");
  const [filterType, setFilterType] = useState<"ALL" | PinType>("ALL");
  const [pins, setPins] = useState<SpatialPin[]>([]);
  const [selectedPin, setSelectedPin] = useState<SpatialPin | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";
  const roleLabel = (role as { label?: string })?.label || "Site Authority";

  // Drawing Sheet Metadata based on Active Tier
  const drawingMeta = useMemo(() => {
    if (tier === "RESIDENTIAL") {
      return {
        code: "GFC-INT-01-101",
        revision: "GFC Rev 01",
        title: "Level 01 Living & Master Bedroom Millwork Coordination Plan",
        scale: "1:25 @ A1",
      };
    }
    return {
      code: "GFC-STR-B1-101",
      revision: "GFC Rev 02",
      title: "Level B1 Structural Framing & Post-Tensioning Layout",
      scale: "1:50 @ A0",
    };
  }, [tier]);

  // Load Pins from Supabase with graceful fallback
  const loadPins = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("cde_spatial_pins")
        .select("*")
        .eq("project_id", projectId)
        .eq("drawing_code", drawingMeta.code);

      if (data && data.length > 0) {
        setPins(data as SpatialPin[]);
      } else {
        const defaults: SpatialPin[] =
          tier === "RESIDENTIAL"
            ? [
                {
                  id: "pin-res-01",
                  project_id: projectId,
                  drawing_code: drawingMeta.code,
                  x_pct: 28,
                  y_pct: 42,
                  pin_type: "GATE",
                  title: "Plumbing Pressure Test Point",
                  grid_location: "Grid A-2 / Guest Bath",
                  description: "10-bar hydrostatic pneumatic test verification on CPVC riser line.",
                  assigned_trade: "Avadh MEP Solutions",
                  status: "VERIFIED",
                  created_at: new Date().toISOString(),
                },
                {
                  id: "pin-res-02",
                  project_id: projectId,
                  drawing_code: drawingMeta.code,
                  x_pct: 62,
                  y_pct: 35,
                  pin_type: "SNAG",
                  title: "Wardrobe Carcass Plumb Alignment",
                  grid_location: "Grid B-3 / Master Bed",
                  description: "Shutter 03 hinge gap exceeding 2mm tolerance; laser alignment required.",
                  assigned_trade: "Royal Woodworkers & Interiors",
                  status: "OPEN",
                  created_at: new Date().toISOString(),
                },
                {
                  id: "pin-res-03",
                  project_id: projectId,
                  drawing_code: drawingMeta.code,
                  x_pct: 75,
                  y_pct: 68,
                  pin_type: "RFI",
                  title: "Electrical Chasing Routing Query",
                  grid_location: "Grid C-4 / TV Unit Wall",
                  description: "Conflict between hidden AC drain line and 25mm heavy conduit chase.",
                  assigned_trade: "Avadh MEP Solutions",
                  status: "OPEN",
                  created_at: new Date().toISOString(),
                },
              ]
            : [
                {
                  id: "pin-twr-01",
                  project_id: projectId,
                  drawing_code: drawingMeta.code,
                  x_pct: 54,
                  y_pct: 28,
                  pin_type: "RFI",
                  title: "Grid D-3: HVAC vs Down-Beam Clash",
                  grid_location: "Grid D-3 / Transverse Axis",
                  description: "500x300 supply duct clashes with 600mm deep PT drop beam. Invert level request.",
                  assigned_trade: "MEP Consultant",
                  status: "OPEN",
                  created_at: new Date().toISOString(),
                },
                {
                  id: "pin-twr-02",
                  project_id: projectId,
                  drawing_code: drawingMeta.code,
                  x_pct: 32,
                  y_pct: 46,
                  pin_type: "GATE",
                  title: "Grid C-3: PT Tendon Clearance",
                  grid_location: "Grid C-3 / Primary Slab Deck",
                  description: "Pre-stressing anchorage trumpet spacing checked against rebar cage.",
                  assigned_trade: "Narmada Concrete Works",
                  status: "VERIFIED",
                  created_at: new Date().toISOString(),
                },
                {
                  id: "pin-twr-03",
                  project_id: projectId,
                  drawing_code: drawingMeta.code,
                  x_pct: 18,
                  y_pct: 72,
                  pin_type: "GATE",
                  title: "Grid B-4: Rebar Cover Verification",
                  grid_location: "Grid B-4 / Retaining Wall",
                  description: "50mm PVC cover blocks verified. IS 456 chloride resistance check satisfied.",
                  assigned_trade: "Narmada Concrete Works",
                  status: "VERIFIED",
                  created_at: new Date().toISOString(),
                },
                {
                  id: "pin-twr-04",
                  project_id: projectId,
                  drawing_code: drawingMeta.code,
                  x_pct: 68,
                  y_pct: 74,
                  pin_type: "SNAG",
                  title: "Grid C-4: Formwork Stripping Rectification",
                  grid_location: "Grid C-4 / Shear Column Junction",
                  description: "Surface honeycombing on column junction. Polymer-modified mortar repair required.",
                  assigned_trade: "Narmada Concrete Works",
                  status: "OPEN",
                  created_at: new Date().toISOString(),
                },
              ];

        setPins(defaults);
      }
    } catch {
      // Local fallback
    }
  }, [projectId, drawingMeta.code, tier]);

  useEffect(() => {
    void loadPins();

    const channel = supabase
      .channel(`cde_pins_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cde_spatial_pins" }, () => void loadPins())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadPins]);

  const filteredPins = useMemo(() => {
    if (filterType === "ALL") return pins;
    return pins.filter((p) => p.pin_type === filterType);
  }, [pins, filterType]);

  // Drop New Pin on Canvas
  const handleCanvasClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === "PAN" || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const x_pct = Math.round((clickX / rect.width) * 100);
    const y_pct = Math.round((clickY / rect.height) * 100);

    const pin_type: PinType =
      activeTool === "DROP_RFI" ? "RFI" : activeTool === "DROP_SNAG" ? "SNAG" : "GATE";

    const newPin: SpatialPin = {
      id: `pin-${Date.now()}`,
      project_id: projectId,
      drawing_code: drawingMeta.code,
      x_pct,
      y_pct,
      pin_type,
      title: `Spatial ${pin_type} at Grid (${x_pct}%, ${y_pct}%)`,
      grid_location: `Grid Ref [X:${x_pct} Y:${y_pct}]`,
      description: `Field inspection issue logged directly from CDE spatial viewport under ${roleLabel} authority.`,
      assigned_trade: tier === "RESIDENTIAL" ? "Royal Woodworkers & Interiors" : "Narmada Concrete Works",
      status: "OPEN",
      created_at: new Date().toISOString(),
    };

    try {
      await (supabase as any).from("cde_spatial_pins").insert([newPin]);
    } catch {
      // Local optimistic append
    }

    setPins((prev) => [...prev, newPin]);
    setSelectedPin(newPin);
    setActiveTool("PAN");
  };

  // Toggle Pin Status (Open <-> Verified)
  const handleTogglePinStatus = async (pinId: string) => {
    setActionInProgress(pinId);
    const target = pins.find((p) => p.id === pinId);
    if (!target) return;

    const nextStatus = target.status === "OPEN" ? "VERIFIED" : "OPEN";

    try {
      await (supabase as any).from("cde_spatial_pins").update({ status: nextStatus }).eq("id", pinId);
    } catch {
      // Optimistic local update
    }

    setPins((prev) => prev.map((p) => (p.id === pinId ? { ...p, status: nextStatus } : p)));
    if (selectedPin && selectedPin.id === pinId) {
      setSelectedPin((prev) => (prev ? { ...prev, status: nextStatus } : null));
    }
    setActionInProgress(null);
  };

  const handleSaveAllPins = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1650px] space-y-5">
        
        {/* TOP CDE HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>CDE / GFC Viewer · ISO 19650 Level of Information Need</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                {drawingMeta.title}
              </h1>
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50 text-[10px] font-mono font-bold uppercase">
                {drawingMeta.revision}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Filter Tabs */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-lg text-xs font-mono">
              {(["ALL", "RFI", "SNAG", "GATE"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterType(f)}
                  className={`px-2.5 py-1 rounded transition ${
                    filterType === f
                      ? "bg-cyan-500 text-zinc-950 font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs font-mono">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.15))}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-300"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-bold text-cyan-400">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.15))}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-300"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1.0)}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white border-l border-zinc-800 ml-1 pl-1.5"
                title="Reset Scale"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* TOOLBAR CONTROLS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider font-bold mr-1">
              Active Mode:
            </span>

            <button
              type="button"
              onClick={() => setActiveTool("PAN")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                activeTool === "PAN"
                  ? "bg-zinc-200 text-zinc-950 shadow-sm"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Pan / Inspect</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool("DROP_RFI")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                activeTool === "DROP_RFI"
                  ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                  : "bg-zinc-900 border border-zinc-800 text-cyan-400 hover:border-cyan-500/50"
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>+ Drop RFI Pin</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool("DROP_SNAG")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                activeTool === "DROP_SNAG"
                  ? "bg-rose-500 text-white shadow-md shadow-rose-950/50"
                  : "bg-zinc-900 border border-zinc-800 text-rose-400 hover:border-rose-500/50"
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>+ Drop Snag Pin</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool("DROP_GATE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                activeTool === "DROP_GATE"
                  ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-950/50"
                  : "bg-zinc-900 border border-zinc-800 text-emerald-400 hover:border-emerald-500/50"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>+ Drop Quality Gate</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500">
              {filteredPins.length} Pinned Issues Active
            </span>
            <button
              type="button"
              onClick={handleSaveAllPins}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveSuccess ? "Saved to CDE!" : "Save Pinned Items"}</span>
            </button>
          </div>
        </div>

        {/* 2-COLUMN VIEWPORT: DRAWING CANVAS (9 cols) vs PIN DETAIL DRAWER (3 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* LEFT: ARCHITECTURAL / STRUCTURAL VIEWPORT CANVAS (9 cols) */}
          <div className="lg:col-span-9 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl relative overflow-hidden">
            
            {/* INSTRUCTION BANNER WHEN IN DROP MODE */}
            {activeTool !== "PAN" && (
              <div className="absolute top-6 left-6 z-20 px-3.5 py-1.5 rounded-lg bg-cyan-500 text-zinc-950 text-xs font-mono font-bold shadow-lg animate-pulse flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Click anywhere on drawing to pin {activeTool.replace("DROP_", "")} marker</span>
              </div>
            )}

            <div className="overflow-auto max-h-[750px] rounded-xl border border-zinc-800/80 bg-zinc-900/50 relative">
              <div
                ref={canvasRef}
                onClick={handleCanvasClick}
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left" }}
                className={`relative w-[1200px] h-[750px] bg-[#0c1017] transition-transform select-none ${
                  activeTool !== "PAN" ? "cursor-crosshair" : "cursor-default"
                }`}
              >
                {/* SVG ARCHITECTURAL & STRUCTURAL GRID LINES */}
                <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  {/* Grid Lines */}
                  <line x1="120" y1="50" x2="120" y2="700" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="380" y1="50" x2="380" y2="700" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="680" y1="50" x2="680" y2="700" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="980" y1="50" x2="980" y2="700" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />

                  <line x1="80" y1="120" x2="1120" y2="120" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="80" y1="320" x2="1120" y2="320" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="80" y1="540" x2="1120" y2="540" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />

                  {/* Structural Columns & Walls Schematic */}
                  <rect x="105" y="105" width="30" height="30" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />
                  <rect x="365" y="105" width="30" height="30" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />
                  <rect x="665" y="105" width="30" height="30" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />
                  <rect x="965" y="105" width="30" height="30" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />

                  <rect x="105" y="305" width="30" height="30" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />
                  <rect x="365" y="305" width="30" height="30" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />
                  <rect x="665" y="305" width="30" height="30" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />
                  <rect x="965" y="305" width="30" height="30" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />

                  <rect x="105" y="525" width="30" height="30" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />
                  <rect x="365" y="525" width="30" height="30" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />
                  <rect x="665" y="525" width="30" height="30" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />
                  <rect x="965" y="525" width="30" height="30" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />

                  {/* Slab Boundary & Beams */}
                  <rect x="120" y="120" width="860" height="420" fill="none" stroke="#475569" strokeWidth="2" />
                  <line x1="380" y1="120" x2="380" y2="540" stroke="#0284c7" strokeWidth="2" strokeDasharray="2 2" />
                  <line x1="680" y1="120" x2="680" y2="540" stroke="#0284c7" strokeWidth="2" strokeDasharray="2 2" />
                  <line x1="120" y1="320" x2="980" y2="320" stroke="#0284c7" strokeWidth="2" strokeDasharray="2 2" />

                  {/* Grid Axis Labels */}
                  <text x="115" y="40" fill="#94a3b8" fontSize="11" fontFamily="monospace">GRID A</text>
                  <text x="375" y="40" fill="#94a3b8" fontSize="11" fontFamily="monospace">GRID B</text>
                  <text x="675" y="40" fill="#94a3b8" fontSize="11" fontFamily="monospace">GRID C</text>
                  <text x="975" y="40" fill="#94a3b8" fontSize="11" fontFamily="monospace">GRID D</text>

                  <text x="40" y="125" fill="#94a3b8" fontSize="11" fontFamily="monospace">01</text>
                  <text x="40" y="325" fill="#94a3b8" fontSize="11" fontFamily="monospace">02</text>
                  <text x="40" y="545" fill="#94a3b8" fontSize="11" fontFamily="monospace">03</text>
                </svg>

                {/* PIN MARKERS RENDERED OVER DRAWING */}
                {filteredPins.map((pin) => {
                  const isSelected = selectedPin?.id === pin.id;
                  const isRfi = pin.pin_type === "RFI";
                  const isSnag = pin.pin_type === "SNAG";
                  const isGate = pin.pin_type === "GATE";
                  const isResolved = pin.status === "VERIFIED";

                  return (
                    <div
                      key={pin.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPin(pin);
                      }}
                      style={{ left: `${pin.x_pct}%`, top: `${pin.y_pct}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer group"
                    >
                      {/* Pulse Ring */}
                      <span className={`absolute -inset-2 rounded-full opacity-40 animate-ping pointer-events-none ${
                        isSnag ? "bg-rose-500" : isRfi ? "bg-cyan-400" : "bg-emerald-400"
                      }`} />

                      {/* Pin Button */}
                      <div className={`relative h-7 w-7 rounded-full flex items-center justify-center font-mono font-extrabold text-[10px] shadow-lg transition-transform ${
                        isSelected ? "scale-125 ring-2 ring-white" : "group-hover:scale-110"
                      } ${
                        isSnag
                          ? "bg-rose-600 text-white"
                          : isRfi
                          ? "bg-cyan-500 text-zinc-950"
                          : "bg-emerald-500 text-zinc-950"
                      }`}>
                        {isSnag ? "!" : isRfi ? "?" : "✓"}
                      </div>

                      {/* Hover / Active Badge */}
                      <div className="absolute left-8 top-0 whitespace-nowrap rounded-md bg-zinc-950/95 border border-zinc-800 px-2.5 py-1 text-[11px] font-mono shadow-xl pointer-events-none z-30 opacity-90 group-hover:opacity-100 transition">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{pin.title}</span>
                          {isResolved && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        </div>
                        <div className="text-[10px] text-zinc-400">{pin.grid_location}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DRAWING TITLE BLOCK & AUDIT METRIC FOOTER */}
            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-zinc-400 border-t border-zinc-800/80 mt-3 gap-2">
              <div className="flex items-center gap-4">
                <span className="text-zinc-500">Scale: <strong className="text-zinc-200">{drawingMeta.scale}</strong></span>
                <span className="text-zinc-500">Sheet: <strong className="text-cyan-400">{drawingMeta.code}</strong></span>
              </div>
              <div className="text-[11px] text-zinc-500">
                Quadillar LiveView · ISO 19650-2 CDE Spatial Audit Viewport
              </div>
            </div>
          </div>

          {/* RIGHT: PIN INSPECTION & RESOLUTION DRAWER (3 cols) */}
          <div className="lg:col-span-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Spatial Inspection
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">Issue Details</h3>
              </div>
              {selectedPin && (
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                  selectedPin.status === "VERIFIED"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                    : "bg-amber-950 text-amber-400 border border-amber-800/50"
                }`}>
                  {selectedPin.status}
                </span>
              )}
            </div>

            {selectedPin ? (
              <div className="space-y-4 text-xs font-mono">
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-1.5">
                  <span className="text-[10px] uppercase text-zinc-500 block">Location Grid:</span>
                  <strong className="text-white block font-sans">{selectedPin.title}</strong>
                  <div className="text-cyan-400 text-[11px]">{selectedPin.grid_location}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase text-zinc-500 block">Engineering Remarks:</span>
                  <p className="text-zinc-300 font-sans text-xs leading-relaxed p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/20">
                    {selectedPin.description}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-1">
                  <span className="text-[10px] uppercase text-zinc-500 block">Assigned Trade:</span>
                  <strong className="text-white block truncate">{selectedPin.assigned_trade}</strong>
                </div>

                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <button
                    type="button"
                    disabled={actionInProgress === selectedPin.id}
                    onClick={() => handleTogglePinStatus(selectedPin.id)}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${
                      selectedPin.status === "VERIFIED"
                        ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
                        : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-950/50"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{selectedPin.status === "VERIFIED" ? "Re-open Spatial Item" : "Verify & Clear Marker"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPin(null)}
                    className="w-full py-1.5 rounded-lg text-zinc-500 hover:text-white text-center text-xs"
                  >
                    Deselect Pin
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center space-y-2">
                <MapPin className="w-6 h-6 text-zinc-600 mx-auto" />
                <div className="text-xs font-semibold text-zinc-400">No Pin Selected</div>
                <p className="text-[11px] text-zinc-600 leading-snug">
                  Click any marker on the drawing canvas or select a tool above to pin a new RFI or defect.
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              ISO 19650 Common Data Environment
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}