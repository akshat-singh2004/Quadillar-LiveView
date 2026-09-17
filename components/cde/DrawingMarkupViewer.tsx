"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { 
  AlertOctagon, 
  CheckCircle2, 
  HelpCircle, 
  Maximize2, 
  Minus, 
  Plus, 
  RotateCcw, 
  ShieldAlert, 
  Layers, 
  Filter,
  PlusCircle
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import type { CdeItem } from "@/types/construction";

export interface SpatialPin {
  id: string;
  project_id: string;
  sheet_no: string;
  x_pct: number;
  y_pct: number;
  pin_type: "RFI" | "SNAG" | "QUALITY_GATE";
  label: string;
  description?: string;
  grid_reference?: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED";
}

interface Props {
  drawing?: CdeItem | null;
}

export function DrawingMarkupViewer({ drawing }: Props) {
  const { project } = useActiveRole();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [pins, setPins] = useState<SpatialPin[]>([]);
  const [selectedPin, setSelectedPin] = useState<SpatialPin | null>(null);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "RFI" | "SNAG" | "QUALITY_GATE">("ALL");
  const [activeTool, setActiveTool] = useState<"PAN" | "PIN_RFI" | "PIN_SNAG" | "PIN_QUALITY">("PAN");

  // Pan & Zoom Transform Engine
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const sheetNo =
    (drawing as any)?.code ??
    (drawing as any)?.drawing_number ??
    (drawing as any)?.item_code ??
    "GFC-STR-02-101";

  // Fetch Spatial Pins from Supabase
  const loadPins = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("drawing_spatial_pins")
      .select("*")
      .eq("project_id", projectId);

    if (data && data.length > 0) {
      setPins(data as SpatialPin[]);
    } else {
      // Seed initial local pins if database is fresh
      setPins([
        { id: "1", project_id: projectId, sheet_no: sheetNo, x_pct: 35, y_pct: 42, pin_type: "QUALITY_GATE", label: "Rebar Cover Verification", grid_reference: "Grid B-2", status: "OPEN" },
        { id: "2", project_id: projectId, sheet_no: sheetNo, x_pct: 62, y_pct: 28, pin_type: "RFI", label: "HVAC Sleeve Penetration Clash", grid_reference: "Grid D-3", status: "OPEN" },
        { id: "3", project_id: projectId, sheet_no: sheetNo, x_pct: 74, y_pct: 64, pin_type: "SNAG", label: "Formwork Honeycombing Rectification", grid_reference: "Grid C-4", status: "IN_REVIEW" },
      ]);
    }
  }, [projectId, sheetNo]);

  useEffect(() => {
    void loadPins();

    const channel = supabase
      .channel(`pins_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "drawing_spatial_pins" }, () => {
        void loadPins();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadPins]);

  // Pan Gestures without triggering misfire clicks
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    hasMoved.current = false;
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    hasMoved.current = true;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(3.5, Math.max(0.6, Number((prev * factor).toFixed(2)))));
  };

  // Canvas Click (Adds Pin only if Tool is Selected & Not Panning)
  const handleCanvasClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasMoved.current || activeTool === "PAN") return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - offset.x) / zoom;
    const clickY = (e.clientY - rect.top - offset.y) / zoom;

    const x_pct = Math.round((clickX / rect.width) * 100);
    const y_pct = Math.round((clickY / rect.height) * 100);

    if (x_pct < 0 || x_pct > 100 || y_pct < 0 || y_pct > 100) return;

    const pinType = activeTool === "PIN_RFI" ? "RFI" : activeTool === "PIN_SNAG" ? "SNAG" : "QUALITY_GATE";
    const label = prompt("Enter tag annotation title:", pinType === "RFI" ? "Sleeve Query" : "Defect Snag");
    if (!label) return;

    const newPin: SpatialPin = {
      id: `local-${Date.now()}`,
      project_id: projectId,
      sheet_no: sheetNo,
      x_pct,
      y_pct,
      pin_type: pinType,
      label,
      grid_reference: `Grid ${(x_pct / 20).toFixed(0)}-${(y_pct / 20).toFixed(0)}`,
      status: "OPEN",
    };

    setPins((prev) => [...prev, newPin]);
    setActiveTool("PAN");

    // Push to Supabase
    await (supabase as any).from("drawing_spatial_pins").insert([{
      project_id: projectId,
      sheet_no: sheetNo,
      x_pct,
      y_pct,
      pin_type: pinType,
      label,
      grid_reference: newPin.grid_reference,
      status: "OPEN"
    }]);
  };

  const visiblePins = pins.filter((p) => activeFilter === "ALL" || p.pin_type === activeFilter);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl">
      
      {/* CDE SHEET HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-3 border-b border-zinc-800/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white tracking-wider">
                {sheetNo}
              </span>
              <span className="rounded bg-emerald-950/80 border border-emerald-700/60 px-1.5 py-0.2 text-[9px] font-mono text-emerald-400 font-bold uppercase">
                STATUS: GFC REV-C
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {drawing?.title ?? "Level 02 Structural Framing & Post-Tensioning Layout"}
            </p>
          </div>
        </div>

        {/* View Controls & Filter Pill */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          
          {/* Tag Filter */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-[11px]">
            {(["ALL", "RFI", "SNAG", "QUALITY_GATE"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`px-2 py-1 rounded font-semibold transition ${
                  activeFilter === filter
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {filter === "QUALITY_GATE" ? "Gates" : filter}
              </button>
            ))}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(1))))}
              className="p-1.5 hover:bg-zinc-800 text-zinc-300 rounded"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-bold text-zinc-300">{zoom.toFixed(1)}x</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.2).toFixed(1))))}
              className="p-1.5 hover:bg-zinc-800 text-zinc-300 rounded"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}
              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded border-l border-zinc-800"
              title="Reset Viewport"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

        </div>
      </div>

      {/* MARKUP TOOLBAR */}
      <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800/80 rounded-lg px-3 py-1.5 mb-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
            Mode:
          </span>
          <button
            type="button"
            onClick={() => setActiveTool("PAN")}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
              activeTool === "PAN" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Pan / Inspect
          </button>
          <button
            type="button"
            onClick={() => setActiveTool("PIN_RFI")}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition flex items-center gap-1.5 ${
              activeTool === "PIN_RFI" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-zinc-400 hover:text-amber-400"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Drop RFI Pin
          </button>
          <button
            type="button"
            onClick={() => setActiveTool("PIN_SNAG")}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition flex items-center gap-1.5 ${
              activeTool === "PIN_SNAG" ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : "text-zinc-400 hover:text-rose-400"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Drop Snag Pin
          </button>
          <button
            type="button"
            onClick={() => setActiveTool("PIN_QUALITY")}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition flex items-center gap-1.5 ${
              activeTool === "PIN_QUALITY" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "text-zinc-400 hover:text-emerald-400"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Drop Quality Gate
          </button>
        </div>

        <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">
          {activeTool === "PAN" ? "Drag to pan · Scroll to zoom" : "Click anywhere on vector sheet to place pin"}
        </span>
      </div>

      {/* THE DRAWING CANVAS VIEWPORT */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
        className={`relative h-[560px] w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#070b14] select-none ${
          activeTool === "PAN" ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-crosshair"
        }`}
      >
        {/* TRANSFORMED CANVAS CONTAINER */}
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.08s ease-out",
          }}
          className="absolute inset-0 h-full w-full"
        >
          {/* ARCHITECTURAL VECTOR LAYER (Real CAD Sheet Coordinates) */}
          <svg
            viewBox="0 0 1000 700"
            className="h-full w-full pointer-events-none stroke-zinc-700/60 fill-none"
          >
            <defs>
              <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="1000" height="700" fill="url(#grid)" />

            {/* Outer Perimeter Slab Boundary */}
            <rect x="100" y="80" width="800" height="540" stroke="#38bdf8" strokeWidth="2.5" strokeOpacity="0.8" />
            
            {/* Structural Core & Shear Walls */}
            <rect x="420" y="240" width="160" height="220" stroke="#f43f5e" strokeWidth="3" fill="rgba(244,63,94,0.06)" />
            <path d="M 420 350 L 580 350" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 4" />
            <text x="445" y="340" fill="#fda4af" fontSize="12" fontFamily="monospace">CORE / LIFTS</text>

            {/* Structural Columns (Concrete Pours C1-C8) */}
            {[
              [100, 80], [500, 80], [900, 80],
              [100, 350], [900, 350],
              [100, 620], [500, 620], [900, 620]
            ].map(([cx, cy], idx) => (
              <g key={idx}>
                <rect x={cx - 15} y={cy - 15} width="30" height="30" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
                <text x={cx - 10} y={cy + 5} fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace">
                  C{idx + 1}
                </text>
              </g>
            ))}

            {/* Post-Tensioning Cable Bands / Tendon Runs */}
            <path d="M 120 180 L 880 180" stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="6 3" strokeOpacity="0.7" />
            <path d="M 120 280 L 420 280 M 580 280 L 880 280" stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="6 3" strokeOpacity="0.7" />
            <path d="M 120 480 L 420 480 M 580 480 L 880 480" stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="6 3" strokeOpacity="0.7" />

            {/* Grid Line Labels */}
            <g fill="#94a3b8" fontSize="11" fontFamily="monospace" fontWeight="bold">
              <circle cx="100" cy="50" r="14" fill="#0f172a" stroke="#475569" />
              <text x="96" y="54">A</text>
              <circle cx="500" cy="50" r="14" fill="#0f172a" stroke="#475569" />
              <text x="496" y="54">B</text>
              <circle cx="900" cy="50" r="14" fill="#0f172a" stroke="#475569" />
              <text x="896" y="54">C</text>

              <circle cx="60" cy="80" r="14" fill="#0f172a" stroke="#475569" />
              <text x="56" y="84">1</text>
              <circle cx="60" cy="350" r="14" fill="#0f172a" stroke="#475569" />
              <text x="56" y="354">2</text>
              <circle cx="60" cy="620" r="14" fill="#0f172a" stroke="#475569" />
              <text x="56" y="624">3</text>
            </g>

            {/* ISO 19650 Official Title Block Stamp in Corner */}
            <g transform="translate(710, 520)">
              <rect width="180" height="90" fill="#090d16" stroke="#334155" strokeWidth="1.5" />
              <text x="12" y="24" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">QUADILLAR CDE</text>
              <text x="12" y="42" fill="#e2e8f0" fontSize="9" fontFamily="sans-serif">DWG: {sheetNo}</text>
              <text x="12" y="58" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">SCALE: 1:100 @ A1</text>
              <text x="12" y="74" fill="#34d399" fontSize="8" fontWeight="bold" fontFamily="monospace">STATUS: ISSUED FOR CONST</text>
            </g>
          </svg>

          {/* SPATIAL INTERACTIVE PINS */}
          {visiblePins.map((pin) => {
            const isSelected = selectedPin?.id === pin.id;
            const pinColor = 
              pin.pin_type === "QUALITY_GATE" 
                ? "bg-emerald-500 border-emerald-200 text-emerald-400"
                : pin.pin_type === "RFI"
                ? "bg-amber-500 border-amber-200 text-amber-400"
                : "bg-rose-500 border-rose-200 text-rose-400";

            return (
              <div
                key={pin.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPin(pin);
                }}
                style={{ left: `${pin.x_pct}%`, top: `${pin.y_pct}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              >
                {/* Visual Pin Pulse Ring */}
                <span className={`absolute -inset-2 rounded-full opacity-40 animate-ping ${pinColor.split(" ")[0]}`} />

                {/* Solid Pin Anchor */}
                <div className={`relative h-6 w-6 rounded-full border-2 shadow-lg flex items-center justify-center transition-transform hover:scale-125 ${
                  isSelected ? "scale-125 ring-4 ring-white" : ""
                } ${pinColor.split(" ")[0]} ${pinColor.split(" ")[1]}`}>
                  {pin.pin_type === "QUALITY_GATE" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" />
                  ) : pin.pin_type === "RFI" ? (
                    <HelpCircle className="w-3.5 h-3.5 text-zinc-950" />
                  ) : (
                    <AlertOctagon className="w-3.5 h-3.5 text-zinc-950" />
                  )}
                </div>

                {/* Tooltip Tag */}
                <div className="pointer-events-none absolute left-1/2 bottom-full mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900/95 border border-zinc-700 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xl">
                  {pin.grid_reference} · {pin.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* ACTIVE PIN DETAIL CARD (Floats when pin is clicked) */}
        {selectedPin && (
          <div className="absolute right-4 bottom-4 z-20 w-80 rounded-xl border border-zinc-700 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                selectedPin.pin_type === "QUALITY_GATE"
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                  : selectedPin.pin_type === "RFI"
                  ? "bg-amber-950 text-amber-300 border border-amber-700"
                  : "bg-rose-950 text-rose-300 border border-rose-700"
              }`}>
                {selectedPin.pin_type}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPin(null)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <h2 className="text-sm font-bold text-white mt-1">
              {selectedPin.label}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Location: <span className="text-zinc-200 font-mono font-semibold">{selectedPin.grid_reference}</span> on Sheet {selectedPin.sheet_no}
            </p>

            <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
              <span className="text-[11px] text-zinc-400">
                Status: <strong className="text-white">{selectedPin.status}</strong>
              </span>
              <button
                type="button"
                onClick={() => alert(`Navigating to resolution desk for ${selectedPin.label}`)}
                className="rounded bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-xs font-semibold text-white transition"
              >
                Open Record
              </button>
            </div>
          </div>
        )}

      </div>

      {/* FOOTER LEGEND */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400 px-1">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Quality Hold-Gate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Technical Query (RFI)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Site Defect (Snag)
          </span>
        </div>
        <span className="font-mono text-[10px] text-zinc-400">
          Total Pinned Items: {pins.length}
        </span>
      </div>

    </div>
  );
}