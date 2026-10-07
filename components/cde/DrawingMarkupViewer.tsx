// components/cde/DrawingMarkupViewer.tsx
"use client";

import React, { useRef, useState, useEffect, useCallback, useTransition } from "react";
import {
  AlertOctagon,
  CheckCircle2,
  HelpCircle,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Layers,
  FileCheck,
  Save,
  Send,
  Loader2,
  ExternalLink,
  X,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import {
  saveDrawingMarkupDraft,
  issueDrawingRevision,
} from "@/app/actions/cde-actions";

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
  drawing?: any;
  drawingsList?: any[];
  projectId?: string;
}

export function DrawingMarkupViewer({
  drawing,
  drawingsList = [],
  projectId = "GOMTI-NAGAR-PH1-FITOUT",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPending, startTransition] = useTransition();

  const [activeDrawing, setActiveDrawing] = useState<any>(drawing);
  const [pins, setPins] = useState<SpatialPin[]>([]);
  const [selectedPin, setSelectedPin] = useState<SpatialPin | null>(null);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "RFI" | "SNAG" | "QUALITY_GATE">("ALL");
  const [activeTool, setActiveTool] = useState<"PAN" | "PIN_RFI" | "PIN_SNAG" | "PIN_QUALITY">("PAN");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Pin Creation Dialog State
  const [pinDialog, setPinDialog] = useState<{
    open: boolean;
    x_pct: number;
    y_pct: number;
    pin_type: "RFI" | "SNAG" | "QUALITY_GATE";
  } | null>(null);
  const [newPinLabel, setNewPinLabel] = useState("");
  const [newPinDesc, setNewPinDesc] = useState("");

  // Pan & Zoom Transform Engine
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const sheetNo = activeDrawing?.drawing_number || activeDrawing?.code || "ARCH-GFC-101";
  const currentRevision = activeDrawing?.revision || "R2";
  const isPublished = activeDrawing?.status === "GFC_PUBLISHED";

  // Sync state if props change
  useEffect(() => {
    if (drawing) setActiveDrawing(drawing);
  }, [drawing]);

  // Fetch Spatial Pins from Supabase
  const loadPins = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("drawing_spatial_pins")
      .select("*")
      .eq("project_id", projectId)
      .eq("sheet_no", sheetNo);

    if (data && data.length > 0) {
      setPins(data as SpatialPin[]);
    } else {
      setPins([
        {
          id: "pin-01",
          project_id: projectId,
          sheet_no: sheetNo,
          x_pct: 35,
          y_pct: 42,
          pin_type: "QUALITY_GATE",
          label: "Rebar Cover Verification",
          grid_reference: "Grid B-2",
          status: "OPEN",
        },
        {
          id: "pin-02",
          project_id: projectId,
          sheet_no: sheetNo,
          x_pct: 62,
          y_pct: 28,
          pin_type: "RFI",
          label: "HVAC Sleeve Penetration Clash",
          grid_reference: "Grid D-3",
          status: "OPEN",
        },
        {
          id: "pin-03",
          project_id: projectId,
          sheet_no: sheetNo,
          x_pct: 74,
          y_pct: 64,
          pin_type: "SNAG",
          label: "Formwork Honeycombing Rectification",
          grid_reference: "Grid C-4",
          status: "IN_REVIEW",
        },
      ]);
    }
  }, [projectId, sheetNo]);

  useEffect(() => {
    void loadPins();

    const channel = supabase
      .channel(`pins_${projectId}_${sheetNo}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drawing_spatial_pins" },
        () => void loadPins()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, sheetNo, loadPins]);

  // Pan Handlers
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

  // Canvas Click (Triggers In-App Modal instead of prompt)
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasMoved.current || activeTool === "PAN") return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - offset.x) / zoom;
    const clickY = (e.clientY - rect.top - offset.y) / zoom;

    const x_pct = Math.round((clickX / rect.width) * 100);
    const y_pct = Math.round((clickY / rect.height) * 100);

    if (x_pct < 0 || x_pct > 100 || y_pct < 0 || y_pct > 100) return;

    const pinType =
      activeTool === "PIN_RFI"
        ? "RFI"
        : activeTool === "PIN_SNAG"
          ? "SNAG"
          : "QUALITY_GATE";

    setPinDialog({ open: true, x_pct, y_pct, pin_type: pinType });
    setNewPinLabel(
      pinType === "RFI"
        ? "Sleeve Penetration Clarification"
        : pinType === "SNAG"
          ? "Plumbness Tolerance Deviation"
          : "IS:456 Pre-Pour Check"
    );
    setNewPinDesc("");
  };

  const handleConfirmPinCreation = () => {
    if (!pinDialog || !newPinLabel.trim()) return;

    const gridRef = `Grid ${String.fromCharCode(65 + Math.floor(pinDialog.x_pct / 33))}-${Math.floor(pinDialog.y_pct / 33) + 1
      }`;

    const newPin: SpatialPin = {
      id: `pin-${Date.now()}`,
      project_id: projectId,
      sheet_no: sheetNo,
      x_pct: pinDialog.x_pct,
      y_pct: pinDialog.y_pct,
      pin_type: pinDialog.pin_type,
      label: newPinLabel.trim(),
      description: newPinDesc.trim(),
      grid_reference: gridRef,
      status: "OPEN",
    };

    startTransition(async () => {
      await (supabase as any).from("drawing_spatial_pins").insert([newPin]);
      setPins((prev) => [...prev, newPin]);
      setPinDialog(null);
      setActiveTool("PAN");
      setFeedbackMessage(`Spatial ${pinDialog.pin_type} pin added at ${gridRef}.`);
      setTimeout(() => setFeedbackMessage(null), 3000);
    });
  };

  // Toggle Pin Status directly from Inspector
  const handleTogglePinStatus = (pin: SpatialPin) => {
    const nextStatus =
      pin.status === "OPEN"
        ? "IN_REVIEW"
        : pin.status === "IN_REVIEW"
          ? "RESOLVED"
          : "OPEN";

    startTransition(async () => {
      await (supabase as any)
        .from("drawing_spatial_pins")
        .update({ status: nextStatus })
        .eq("id", pin.id);

      setPins((prev) =>
        prev.map((p) => (p.id === pin.id ? { ...p, status: nextStatus } : p))
      );
      setSelectedPin((prev) => (prev && prev.id === pin.id ? { ...prev, status: nextStatus } : prev));
    });
  };

  // Save ISO 19650 Draft
  const handleSaveDraft = () => {
    startTransition(async () => {
      const res = await saveDrawingMarkupDraft({
        drawingId: activeDrawing?.id || sheetNo,
        projectId,
        drawingNumber: sheetNo,
        markupGeoJson: { pinsCount: pins.length, zoom, offset },
      });

      if (res.success) {
        setFeedbackMessage("Draft saved to ISO 19650 WIP container successfully.");
        setTimeout(() => setFeedbackMessage(null), 3500);
      }
    });
  };

  // Issue Official Revision Bump (R1 -> R2, etc.)
  const handleIssueRevision = () => {
    startTransition(async () => {
      const res = await issueDrawingRevision(
        activeDrawing?.id || sheetNo,
        projectId,
        sheetNo,
        currentRevision
      );

      if (res.success) {
        setActiveDrawing((prev: any) => ({
          ...prev,
          revision: res.nextRevision,
          status: "GFC_PUBLISHED",
        }));
        setFeedbackMessage(res?.message ?? null);
        setTimeout(() => setFeedbackMessage(null), 4000);
      } else {
        alert(res.error || "Failed to issue revision.");
      }
    });
  };

  const visiblePins = pins.filter((p) => activeFilter === "ALL" || p.pin_type === activeFilter);

  return (
    <div className="space-y-4 font-sans">
      {/* NOTIFICATION TOAST */}
      {feedbackMessage && (
        <div className="p-3 bg-cyan-950/90 border border-cyan-800 text-cyan-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* WORKBENCH GRID: LEFT DRAWING ROSTER (3 cols) vs RIGHT CANVAS (9 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: GFC DRAWING REGISTER */}
        <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 p-5 space-y-4 font-mono text-xs">
          <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold block">
                ISO 19650-2 CDE Packages
              </span>
              <h2 className="text-sm font-bold text-zinc-100 mt-0.5">Drawing &amp; Revision Log</h2>
            </div>
            <span className="text-[10px] text-zinc-500">{drawingsList.length} Sets</span>
          </div>

          <div className="space-y-2">
            {drawingsList.map((drg) => {
              const isSelected = (drg.drawing_number || drg.id) === sheetNo;
              return (
                <div
                  key={drg.id || drg.drawing_number}
                  onClick={() => {
                    setActiveDrawing(drg);
                    setSelectedPin(null);
                  }}
                  className={`p-3 border transition cursor-pointer space-y-1 ${isSelected
                      ? "bg-cyan-950/30 border-cyan-500/80 text-white shadow-md"
                      : "bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-400">{drg.drawing_number}</span>
                    <span className="px-1.5 py-0.2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-bold">
                      {drg.revision || "R1"}
                    </span>
                  </div>
                  <div className="text-zinc-200 font-sans text-xs font-medium line-clamp-1">
                    {drg.title}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60">
                    <span>{drg.discipline || "Architectural"}</span>
                    <span className="uppercase text-emerald-400 font-bold">
                      {drg.status?.replace(/_/g, " ") || "PUBLISHED"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* STATUTORY ACTIONS */}
          <div className="pt-3 border-t border-zinc-800 space-y-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSaveDraft}
              className="w-full py-2 bg-zinc-950 border border-zinc-700 hover:bg-zinc-800 text-zinc-200 font-bold uppercase text-xs transition flex items-center justify-center gap-1.5"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Draft (WIP Container)</span>
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleIssueRevision}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/50"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Issue Revision &amp; Notify Contractor</span>
            </button>
          </div>
        </div>

        {/* RIGHT: VECTOR CANVAS & MARKUP DESK */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 p-4 shadow-2xl">
            {/* VIEWPORT CONTROLS */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-3 border-b border-zinc-800/80 gap-3 font-mono text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-950 border border-zinc-800 text-cyan-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white tracking-wider">{sheetNo}</span>
                    <span className="bg-emerald-950/80 border border-emerald-700/60 px-1.5 py-0.2 text-[9px] text-emerald-400 font-bold uppercase">
                      STATUS: {isPublished ? `GFC ${currentRevision}` : "WIP DRAFT"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans">{activeDrawing?.title}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-zinc-950 border border-zinc-800 p-0.5 text-[11px]">
                  {(["ALL", "RFI", "SNAG", "QUALITY_GATE"] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setActiveFilter(filter)}
                      className={`px-2 py-0.5 font-semibold transition ${activeFilter === filter
                          ? "bg-zinc-800 text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                      {filter === "QUALITY_GATE" ? "Gates" : filter}
                    </button>
                  ))}
                </div>

                <div className="flex items-center bg-zinc-950 border border-zinc-800 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(1))))}
                    className="p-1 hover:bg-zinc-800 text-zinc-300"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-[11px] font-bold text-zinc-300 tabular-nums">
                    {zoom.toFixed(1)}x
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.2).toFixed(1))))}
                    className="p-1 hover:bg-zinc-800 text-zinc-300"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setOffset({ x: 0, y: 0 });
                    }}
                    className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white border-l border-zinc-800"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* TOOLBAR */}
            <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 px-3 py-1.5 mb-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase text-zinc-500">Mode:</span>
                <button
                  type="button"
                  onClick={() => setActiveTool("PAN")}
                  className={`px-2 py-0.5 text-[11px] font-semibold transition ${activeTool === "PAN"
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                    }`}
                >
                  Pan / Inspect
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool("PIN_RFI")}
                  className={`px-2 py-0.5 text-[11px] font-semibold transition flex items-center gap-1.5 ${activeTool === "PIN_RFI"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "text-zinc-400 hover:text-amber-400"
                    }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Drop RFI Pin
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool("PIN_SNAG")}
                  className={`px-2 py-0.5 text-[11px] font-semibold transition flex items-center gap-1.5 ${activeTool === "PIN_SNAG"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : "text-zinc-400 hover:text-rose-400"
                    }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Drop Snag Pin
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool("PIN_QUALITY")}
                  className={`px-2 py-0.5 text-[11px] font-semibold transition flex items-center gap-1.5 ${activeTool === "PIN_QUALITY"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "text-zinc-400 hover:text-emerald-400"
                    }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Drop Quality Gate
                </button>
              </div>

              <span className="text-[10px] text-zinc-500 hidden sm:inline">
                {activeTool === "PAN"
                  ? "Drag to pan • Scroll to zoom"
                  : "Click anywhere on vector sheet to place pin"}
              </span>
            </div>

            {/* CANVAS CONTAINER */}
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onClick={handleCanvasClick}
              className={`relative h-[560px] w-full overflow-hidden border border-zinc-800 bg-[#070b14] select-none ${activeTool === "PAN"
                  ? isDragging
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : "cursor-crosshair"
                }`}
            >
              <div
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: isDragging ? "none" : "transform 0.08s ease-out",
                }}
                className="absolute inset-0 h-full w-full"
              >
                {/* ARCHITECTURAL VECTOR LAYER */}
                <svg
                  viewBox="0 0 1000 700"
                  className="h-full w-full pointer-events-none stroke-zinc-700/60 fill-none"
                >
                  <defs>
                    <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                      <path
                        d="M 100 0 L 0 0 0 100"
                        fill="none"
                        stroke="rgba(255,255,255,0.03)"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="1000" height="700" fill="url(#grid)" />

                  <rect
                    x="100"
                    y="80"
                    width="800"
                    height="540"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeOpacity="0.8"
                  />
                  <rect
                    x="420"
                    y="240"
                    width="160"
                    height="220"
                    stroke="#f43f5e"
                    strokeWidth="3"
                    fill="rgba(244,63,94,0.06)"
                  />
                  <path d="M 420 350 L 580 350" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 4" />
                  <text x="445" y="340" fill="#fda4af" fontSize="12" fontFamily="monospace">
                    CORE / LIFTS
                  </text>

                  {[
                    [100, 80],
                    [500, 80],
                    [900, 80],
                    [100, 350],
                    [900, 350],
                    [100, 620],
                    [500, 620],
                    [900, 620],
                  ].map(([cx, cy], idx) => (
                    <g key={idx}>
                      <rect
                        x={cx - 15}
                        y={cy - 15}
                        width="30"
                        height="30"
                        fill="#0284c7"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                      />
                      <text
                        x={cx - 10}
                        y={cy + 5}
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        C{idx + 1}
                      </text>
                    </g>
                  ))}

                  <path
                    d="M 120 180 L 880 180"
                    stroke="#fbbf24"
                    strokeWidth="1.2"
                    strokeDasharray="6 3"
                    strokeOpacity="0.7"
                  />
                  <path
                    d="M 120 280 L 420 280 M 580 280 L 880 280"
                    stroke="#fbbf24"
                    strokeWidth="1.2"
                    strokeDasharray="6 3"
                    strokeOpacity="0.7"
                  />

                  {/* ISO 19650 Stamp Block */}
                  <g transform="translate(710, 520)">
                    <rect width="180" height="90" fill="#090d16" stroke="#334155" strokeWidth="1.5" />
                    <text x="12" y="24" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                      QUADILLAR CDE
                    </text>
                    <text x="12" y="42" fill="#e2e8f0" fontSize="9" fontFamily="sans-serif">
                      DWG: {sheetNo}
                    </text>
                    <text x="12" y="58" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">
                      REV: {currentRevision}
                    </text>
                    <text x="12" y="74" fill="#34d399" fontSize="8" fontWeight="bold" fontFamily="monospace">
                      STATUS: {isPublished ? "GFC PUBLISHED" : "WIP CONTAINER"}
                    </text>
                  </g>
                </svg>

                {/* SPATIAL PINS */}
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
                      <span className={`absolute -inset-2 rounded-full opacity-40 animate-ping ${pinColor.split(" ")[0]}`} />
                      <div
                        className={`relative h-6 w-6 rounded-full border-2 shadow-lg flex items-center justify-center transition-transform hover:scale-125 ${isSelected ? "scale-125 ring-4 ring-white" : ""
                          } ${pinColor.split(" ")[0]} ${pinColor.split(" ")[1]}`}
                      >
                        {pin.pin_type === "QUALITY_GATE" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" />
                        ) : pin.pin_type === "RFI" ? (
                          <HelpCircle className="w-3.5 h-3.5 text-zinc-950" />
                        ) : (
                          <AlertOctagon className="w-3.5 h-3.5 text-zinc-950" />
                        )}
                      </div>
                      <div className="pointer-events-none absolute left-1/2 bottom-full mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900/95 border border-zinc-700 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xl font-mono">
                        {pin.grid_reference} • {pin.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DETAIL INSPECTOR CARD */}
              {selectedPin && (
                <div className="absolute right-4 bottom-4 z-20 w-84 rounded border border-zinc-700 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-md font-mono text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${selectedPin.pin_type === "QUALITY_GATE"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                          : selectedPin.pin_type === "RFI"
                            ? "bg-amber-950 text-amber-300 border border-amber-700"
                            : "bg-rose-950 text-rose-300 border border-rose-700"
                        }`}
                    >
                      {selectedPin.pin_type}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedPin(null)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-1 font-sans">{selectedPin.label}</h3>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Location: <strong className="text-zinc-200">{selectedPin.grid_reference}</strong> on Sheet {selectedPin.sheet_no}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
                    <span className="text-[11px] text-zinc-400">
                      Status:{" "}
                      <strong
                        className={
                          selectedPin.status === "RESOLVED"
                            ? "text-emerald-400"
                            : selectedPin.status === "IN_REVIEW"
                              ? "text-amber-400"
                              : "text-rose-400"
                        }
                      >
                        {selectedPin.status}
                      </strong>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleTogglePinStatus(selectedPin)}
                      className="bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-xs font-semibold text-white border border-zinc-700 uppercase"
                    >
                      Advance Status
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: CREATE PIN ON CANVAS */}
      {pinDialog?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="font-bold text-zinc-100 uppercase">
                Drop {pinDialog.pin_type} Spatial Tag
              </h3>
              <button
                type="button"
                onClick={() => setPinDialog(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                Annotation Title *
              </label>
              <input
                type="text"
                required
                value={newPinLabel}
                onChange={(e) => setNewPinLabel(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                Technical Query Description
              </label>
              <textarea
                rows={2}
                value={newPinDesc}
                onChange={(e) => setNewPinDesc(e.target.value)}
                placeholder="Specify clash tolerances or physical defect..."
                className="w-full bg-zinc-950 border border-zinc-800 p-2 text-zinc-100 focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPinDialog(null)}
                className="px-3 py-1.5 border border-zinc-700 text-zinc-300 hover:text-white uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPinCreation}
                className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase"
              >
                Anchor Pin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DrawingMarkupViewer;