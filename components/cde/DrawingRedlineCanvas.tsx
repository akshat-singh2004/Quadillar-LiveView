"use client";

import React, { useState, useRef } from "react";
import {
  Pen,
  Type,
  Square,
  Undo2,
  Redo2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Send,
  Save,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export type MarkupTool = "pen" | "text" | "cloud";
export type StatutoryColor = "red" | "green" | "yellow";

interface MarkupElement {
  id: string;
  type: MarkupTool;
  color: StatutoryColor;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  points?: { x: number; y: number }[];
}

export interface DrawingRedlineCanvasProps {
  activeDrawingRef?: string;
  className?: string;
}

const STATUTORY_COLORS: {
  key: StatutoryColor;
  label: string;
  meaning: string;
  cssColor: string;
  btnBg: string;
}[] = [
  {
    key: "red",
    label: "Solid Red",
    meaning: "Defect / Reject",
    cssColor: "#ef4444",
    btnBg: "bg-red-600",
  },
  {
    key: "green",
    label: "Solid Green",
    meaning: "Approved",
    cssColor: "#10b981",
    btnBg: "bg-emerald-600",
  },
  {
    key: "yellow",
    label: "Solid Yellow",
    meaning: "Information",
    cssColor: "#eab308",
    btnBg: "bg-amber-400",
  },
];

export function DrawingRedlineCanvas({
  activeDrawingRef = "ARCH-GFC-101",
  className = "",
}: DrawingRedlineCanvasProps) {
  const [activeTool, setActiveTool] = useState<MarkupTool>("cloud");
  const [activeColor, setActiveColor] = useState<StatutoryColor>("red");

  const [elements, setElements] = useState<MarkupElement[]>([
    {
      id: "mk-1",
      type: "cloud",
      color: "red",
      x: 320,
      y: 180,
      width: 220,
      height: 140,
      text: "Defect: Column C04 reinforcement clash with HVAC sleeve. Relocate sleeve 150mm south.",
    },
    {
      id: "mk-2",
      type: "text",
      color: "yellow",
      x: 580,
      y: 130,
      text: "INFO: Verify structural expansion joint detail against GFC Rev 2.",
    },
    {
      id: "mk-3",
      type: "cloud",
      color: "green",
      x: 140,
      y: 350,
      width: 180,
      height: 110,
      text: "Approved: Grid A1-B3 partition layout confirmed.",
    },
  ]);

  const [redoStack, setRedoStack] = useState<MarkupElement[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Undo Handler
  const handleUndo = () => {
    if (elements.length === 0) return;
    const last = elements[elements.length - 1];
    setRedoStack((prev) => [...prev, last]);
    setElements((prev) => prev.slice(0, -1));
  };

  // Redo Handler
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setElements((prev) => [...prev, next]);
  };

  // Canvas Click Handler: Place a synthetic markup
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const newElement: MarkupElement = {
      id: `mk-${Date.now()}`,
      type: activeTool,
      color: activeColor,
      x: Math.round(clickX - 60),
      y: Math.round(clickY - 40),
      width: activeTool === "cloud" ? 160 : undefined,
      height: activeTool === "cloud" ? 100 : undefined,
      text:
        activeTool === "text"
          ? activeColor === "red"
            ? "DEFECT: Non-compliance with CPWD Annexure B"
            : activeColor === "green"
            ? "APPROVED: Cleared by Principal Architect"
            : "INFO: Field verification required"
          : undefined,
    };

    setElements((prev) => [...prev, newElement]);
    setRedoStack([]);
  };

  // Save Draft Action
  const handleSaveDraft = () => {
    setNotification("Draft saved to ISO 19650 WIP container successfully.");
    setTimeout(() => setNotification(null), 3500);
  };

  // Issue Revision Action
  const handleIssueRevision = () => {
    setNotification(
      `Revision R3 Issued & Transmittal broadcasted to Lead Contractor for ${activeDrawingRef}.`
    );
    setTimeout(() => setNotification(null), 4500);
  };

  return (
    <div
      className={`relative w-full h-full bg-zinc-800 flex items-center justify-center overflow-hidden select-none ${className}`}
    >
      {/* ===================================================================
          FLOATING MATTE TOOLBAR (Absolute Top-Center)
          =================================================================== */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-zinc-900 border border-zinc-800 shadow-2xl p-2 flex items-center gap-2">
        {/* Tool: Pen */}
        <button
          type="button"
          onClick={() => setActiveTool("pen")}
          title="Freehand Pen Tool"
          className={`p-2 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTool === "pen"
              ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          <Pen className="h-4 w-4" />
          <span className="hidden sm:inline">Pen</span>
        </button>

        {/* Tool: Type / Text */}
        <button
          type="button"
          onClick={() => setActiveTool("text")}
          title="Text Annotation Tool"
          className={`p-2 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTool === "text"
              ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          <Type className="h-4 w-4" />
          <span className="hidden sm:inline">Text</span>
        </button>

        {/* Tool: Square (Cloud) */}
        <button
          type="button"
          onClick={() => setActiveTool("cloud")}
          title="Revision Cloud Tool"
          className={`p-2 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTool === "cloud"
              ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          <Square className="h-4 w-4" />
          <span className="hidden sm:inline">Square (Cloud)</span>
        </button>

        {/* Divider */}
        <div className="h-5 w-[1px] bg-zinc-800 mx-1" />

        {/* Undo */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={elements.length === 0}
          title="Undo Last Markup"
          className="p-2 text-zinc-400 hover:text-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Undo2 className="h-4 w-4" />
        </button>

        {/* Redo */}
        <button
          type="button"
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          title="Redo Markup"
          className="p-2 text-zinc-400 hover:text-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Redo2 className="h-4 w-4" />
        </button>

        {/* Divider */}
        <div className="h-5 w-[1px] bg-zinc-800 mx-1" />

        {/* Strict Statutory Color Picker */}
        <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-2 py-1">
          {STATUTORY_COLORS.map((col) => {
            const isSelected = activeColor === col.key;
            return (
              <button
                key={col.key}
                type="button"
                onClick={() => setActiveColor(col.key)}
                title={`${col.label}: ${col.meaning}`}
                className={`h-5 w-5 rounded-none transition-all flex items-center justify-center cursor-pointer ${
                  col.btnBg
                } ${
                  isSelected
                    ? "ring-2 ring-zinc-100 scale-110"
                    : "opacity-80 hover:opacity-100"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* ===================================================================
          MOCK DRAWING IMAGE / PDF BLUEPRINT PLACEHOLDER
          =================================================================== */}
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="relative w-[920px] h-[640px] bg-zinc-900 border border-zinc-700/60 shadow-2xl cursor-crosshair overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(to right, #27272a 1px, transparent 1px),
            linear-gradient(to bottom, #27272a 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      >
        {/* Drawing Architectural Blueprint Elements (Simulated CAD Lines) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* External Building Envelope */}
          <rect
            x="48"
            y="48"
            width="824"
            height="544"
            fill="none"
            stroke="#52525b"
            strokeWidth="2"
          />

          {/* Grid Axes: Vertical Lines */}
          {[120, 240, 360, 480, 600, 720].map((x, i) => (
            <g key={`v-${x}`}>
              <line
                x1={x}
                y1="48"
                x2={x}
                y2="592"
                stroke="#3f3f46"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
              <circle cx={x} cy="36" r="10" fill="#18181b" stroke="#71717a" strokeWidth="1" />
              <text
                x={x}
                y="40"
                fill="#a1a1aa"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {i + 1}
              </text>
            </g>
          ))}

          {/* Grid Axes: Horizontal Lines */}
          {[120, 240, 360, 480].map((y, i) => (
            <g key={`h-${y}`}>
              <line
                x1="48"
                y1={y}
                x2="872"
                y2={y}
                stroke="#3f3f46"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
              <circle cx="36" cy={y} r="10" fill="#18181b" stroke="#71717a" strokeWidth="1" />
              <text
                x="36"
                y={y + 4}
                fill="#a1a1aa"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {String.fromCharCode(65 + i)}
              </text>
            </g>
          ))}

          {/* Structural Core & Shear Walls */}
          <rect
            x="360"
            y="240"
            width="120"
            height="120"
            fill="#18181b"
            stroke="#71717a"
            strokeWidth="2"
          />
          <text
            x="420"
            y="305"
            fill="#71717a"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="middle"
          >
            LIFT CORE &amp; DUCT
          </text>

          {/* Rooms / Partition Layout */}
          <rect x="120" y="120" width="240" height="240" fill="none" stroke="#52525b" strokeWidth="1.5" />
          <text x="240" y="240" fill="#a1a1aa" fontSize="11" fontFamily="monospace" textAnchor="middle">
            CONFERENCE SUITE A
          </text>

          <rect x="480" y="120" width="240" height="120" fill="none" stroke="#52525b" strokeWidth="1.5" />
          <text x="600" y="180" fill="#a1a1aa" fontSize="11" fontFamily="monospace" textAnchor="middle">
            EXECUTIVE BOARDROOM
          </text>

          <rect x="480" y="360" width="240" height="120" fill="none" stroke="#52525b" strokeWidth="1.5" />
          <text x="600" y="420" fill="#a1a1aa" fontSize="11" fontFamily="monospace" textAnchor="middle">
            OPEN PLAN WORKSPACE
          </text>

          {/* Formal CPWD Title Block in Bottom-Right Corner */}
          <g transform="translate(612, 492)">
            <rect width="260" height="100" fill="#09090b" stroke="#71717a" strokeWidth="1.5" />
            <line x1="0" y1="25" x2="260" y2="25" stroke="#3f3f46" strokeWidth="1" />
            <line x1="0" y1="50" x2="260" y2="50" stroke="#3f3f46" strokeWidth="1" />
            <line x1="0" y1="75" x2="260" y2="75" stroke="#3f3f46" strokeWidth="1" />
            <line x1="130" y1="50" x2="130" y2="100" stroke="#3f3f46" strokeWidth="1" />

            <text x="130" y="17" fill="#e4e4e7" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              CENTRAL PUBLIC WORKS DEPARTMENT
            </text>
            <text x="10" y="40" fill="#a1a1aa" fontSize="9" fontFamily="monospace">
              PROJECT: GOMTI NAGAR PH-1
            </text>
            <text x="10" y="66" fill="#a1a1aa" fontSize="8" fontFamily="monospace">
              DRG: {activeDrawingRef}
            </text>
            <text x="140" y="66" fill="#10b981" fontSize="8" fontFamily="monospace" fontWeight="bold">
              REV: R02 (GFC)
            </text>
            <text x="10" y="90" fill="#71717a" fontSize="8" fontFamily="monospace">
              SCALE: 1:100 @ A1
            </text>
            <text x="140" y="90" fill="#71717a" fontSize="8" fontFamily="monospace">
              DATE: 2026-09-18
            </text>
          </g>
        </svg>

        {/* Dynamic User Markup Renderings */}
        {elements.map((el) => {
          const strokeColor =
            el.color === "red"
              ? "#ef4444"
              : el.color === "green"
              ? "#10b981"
              : "#eab308";
          const bgColor =
            el.color === "red"
              ? "rgba(239, 68, 68, 0.15)"
              : el.color === "green"
              ? "rgba(16, 185, 129, 0.15)"
              : "rgba(234, 179, 8, 0.15)";

          return (
            <div
              key={el.id}
              style={{
                position: "absolute",
                left: `${el.x}px`,
                top: `${el.y}px`,
                width: el.width ? `${el.width}px` : "auto",
                height: el.height ? `${el.height}px` : "auto",
              }}
              className="pointer-events-none"
            >
              {el.type === "cloud" && (
                <div
                  className="w-full h-full border-2 border-dashed p-2 font-mono text-[10px] leading-tight"
                  style={{
                    borderColor: strokeColor,
                    backgroundColor: bgColor,
                    color: strokeColor,
                    boxShadow: `0 0 12px ${bgColor}`,
                  }}
                >
                  <div className="font-bold uppercase tracking-wider text-[9px] mb-1">
                    {el.color === "red"
                      ? "DEFECT / REJECT CLOUD"
                      : el.color === "green"
                      ? "APPROVED DETAIL"
                      : "INFORMATION NOTE"}
                  </div>
                  {el.text}
                </div>
              )}

              {el.type === "text" && (
                <div
                  className="px-2 py-1 font-mono text-[10px] font-bold border"
                  style={{
                    borderColor: strokeColor,
                    backgroundColor: "#09090b",
                    color: strokeColor,
                  }}
                >
                  {el.text}
                </div>
              )}

              {el.type === "pen" && (
                <div
                  className="w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center font-mono text-[9px]"
                  style={{ borderColor: strokeColor, color: strokeColor }}
                >
                  !
                </div>
              )}
            </div>
          );
        })}

        {/* Overlay Notification Toast */}
        {notification && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-zinc-950 border border-emerald-500/80 px-4 py-2 font-mono text-xs text-emerald-400 flex items-center gap-2 shadow-2xl">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* ===================================================================
          ACTION FOOTER (Absolute Bottom-Right)
          =================================================================== */}
      <div className="absolute bottom-4 right-4 z-30 flex items-center gap-3">
        {/* Button 1: Save Draft */}
        <button
          type="button"
          onClick={handleSaveDraft}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 font-mono text-xs px-4 py-2.5 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Save className="h-3.5 w-3.5 text-zinc-400" />
          <span>Save Draft</span>
        </button>

        {/* Button 2: Issue Revision & Notify Contractor */}
        <button
          type="button"
          onClick={handleIssueRevision}
          className="bg-rose-600 hover:bg-rose-500 text-zinc-100 uppercase tracking-wide font-bold font-mono text-xs px-5 py-2.5 transition-colors flex items-center gap-2 cursor-pointer shadow-none"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Issue Revision &amp; Notify Contractor</span>
        </button>
      </div>
    </div>
  );
}

export default DrawingRedlineCanvas;
