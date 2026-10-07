"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import {
  Compass,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Lock,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  Layers,
  ZoomIn,
  ZoomOut,
  RefreshCw,
} from "lucide-react";

interface SpatialPin {
  id: string;
  pin_type: "RFI" | "NCR_DEFECT" | "POUR_GATE" | "SITE_NOTE";
  grid_location: string;
  title: string;
  description: string;
  coord_x: number;
  coord_y: number;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED";
  created_at: string;
}

export default function InteractiveCdeCanvasPage() {
  const { project } = useActiveRole();
  const activeProjectId = project?.project_id || project?.id || "";

  const [pins, setPins] = useState<SpatialPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Canvas Viewport Transforms
  const [zoomScale, setZoomScale] = useState(1);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // New Pin Placement State
  const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number } | null>(null);
  const [pinType, setPinType] = useState<"RFI" | "NCR_DEFECT" | "POUR_GATE" | "SITE_NOTE">("RFI");
  const [gridLoc, setGridLoc] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Selected Pin for Details Drawer
  const [selectedPin, setSelectedPin] = useState<SpatialPin | null>(null);

  const loadPins = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("cde_spatial_pins")
        .select("*")
        .eq("project_id", activeProjectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPins(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load spatial CDE pins.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPins();

    if (!activeProjectId) return;
    const channel = supabase
      .channel(`cde_pins_sync_${activeProjectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cde_spatial_pins", filter: `project_id=eq.${activeProjectId}` },
        () => void loadPins()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeProjectId]);

  // Click on Canvas to Capture Normalized Percentage Coordinates (0 to 100)
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Number(Math.max(0, Math.min(100, x)).toFixed(2));
    const clampedY = Number(Math.max(0, Math.min(100, y)).toFixed(2));

    setPendingCoords({ x: clampedX, y: clampedY });
    setSelectedPin(null);
  };

  const handleCreatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingCoords || !title.trim() || !gridLoc.trim()) {
      setErrorMsg("Grid location and title remarks are mandatory.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        project_id: activeProjectId,
        drawing_code: "GFC-ARC-01-101",
        pin_type: pinType,
        grid_location: gridLoc.trim(),
        title: title.trim(),
        description: description.trim(),
        coord_x: pendingCoords.x,
        coord_y: pendingCoords.y,
        status: "OPEN",
      };

      const { error } = await (supabase as any)
        .from("cde_spatial_pins")
        .insert([payload]);

      if (error) throw error;

      setPendingCoords(null);
      setTitle("");
      setDescription("");
      setGridLoc("");
      await loadPins();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to drop spatial pin.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolvePin = async (pinId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("cde_spatial_pins")
        .update({
          status: "RESOLVED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", pinId);

      if (error) throw error;
      setSelectedPin(null);
      await loadPins();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resolve pin.");
    }
  };

  const getPinColor = (type: string) => {
    switch (type) {
      case "NCR_DEFECT":
        return "bg-rose-500 text-white border-rose-300 ring-rose-500/50";
      case "POUR_GATE":
        return "bg-emerald-500 text-zinc-950 border-emerald-300 ring-emerald-500/50";
      case "RFI":
        return "bg-cyan-500 text-zinc-950 border-cyan-300 ring-cyan-500/50";
      default:
        return "bg-amber-500 text-zinc-950 border-amber-300 ring-amber-500/50";
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-sans">
      <div className="max-w-[1700px] mx-auto space-y-6">

        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
              COMMON DATA ENVIRONMENT (CDE) • ISO 19650 SPATIAL REDLINES
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Compass className="w-6 h-6 text-cyan-400" />
              <span>GFC Interactive Floor Canvas &amp; Redline Ledger</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Active Sheet: <strong className="text-zinc-200">GFC-ARC-01-101 (Rev 01)</strong> • Click anywhere on the drawing vector canvas to drop field pins, RFIs, and pre-pour inspection hold-gates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1">
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.max(0.7, z - 0.15))}
                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] px-2 font-mono text-zinc-300">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.min(1.8, z + 0.15))}
                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(1)}
                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white border-l border-zinc-800 ml-1"
                title="Reset View"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 2-COLUMN VIEWPORT: INTERACTIVE CANVAS (8 COLS) + ACTION DRAWER (4 COLS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-mono text-xs">

          {/* LEFT: THE INTERACTIVE CANVAS VIEWPORT */}
          <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 p-4 space-y-3">
            <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase border-b border-zinc-850 pb-2">
              <span>Sanctioned Architectural Footprint</span>
              <span>Click Drawing to Drop Spatial Pin</span>
            </div>

            <div className="overflow-auto max-h-[720px] bg-zinc-950 border border-zinc-800 rounded relative select-none">
              <div
                ref={canvasContainerRef}
                onClick={handleCanvasClick}
                style={{ transform: `scale(${zoomScale})`, transformOrigin: "top left" }}
                className="relative w-full h-[620px] min-w-[700px] cursor-crosshair transition-transform duration-150 flex items-center justify-center overflow-hidden"
              >
                {/* SVG Architectural Vector Footprint Background */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 1000 600"
                >
                  <defs>
                    <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#27272a" strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  <rect width="1000" height="600" fill="url(#gridPattern)" />

                  {/* Structural Columns / Centroids */}
                  <g stroke="#06b6d4" strokeWidth="1.5" fill="#083344">
                    <rect x="100" y="80" width="30" height="30" />
                    <rect x="350" y="80" width="30" height="30" />
                    <rect x="600" y="80" width="30" height="30" />
                    <rect x="850" y="80" width="30" height="30" />

                    <rect x="100" y="280" width="30" height="30" />
                    <rect x="350" y="280" width="30" height="30" />
                    <rect x="600" y="280" width="30" height="30" />
                    <rect x="850" y="280" width="30" height="30" />

                    <rect x="100" y="480" width="30" height="30" />
                    <rect x="350" y="480" width="30" height="30" />
                    <rect x="600" y="480" width="30" height="30" />
                    <rect x="850" y="480" width="30" height="30" />
                  </g>

                  {/* Boundary Perimeter Walls */}
                  <path
                    d="M 90 70 L 890 70 L 890 520 L 90 520 Z"
                    fill="none"
                    stroke="#52525b"
                    strokeWidth="3"
                  />
                  {/* Internal Core Walls */}
                  <path
                    d="M 450 200 L 550 200 L 550 360 L 450 360 Z"
                    fill="#18181b"
                    stroke="#a1a1aa"
                    strokeWidth="2"
                  />
                  <text x="465" y="285" fill="#a1a1aa" fontSize="12" fontFamily="monospace">LIFT CORE</text>
                  <text x="110" y="65" fill="#06b6d4" fontSize="11" fontFamily="monospace">AXIS A1</text>
                  <text x="860" y="65" fill="#06b6d4" fontSize="11" fontFamily="monospace">AXIS D1</text>
                </svg>

                {/* RENDER PERSISTED SPATIAL PINS */}
                {pins.map((pin) => {
                  const isSelected = selectedPin?.id === pin.id;
                  const isResolved = pin.status === "RESOLVED";

                  return (
                    <button
                      key={pin.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPin(pin);
                        setPendingCoords(null);
                      }}
                      style={{ left: `${pin.coord_x}%`, top: `${pin.coord_y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-[10px] shadow-lg transition ring-4 ${isSelected ? "scale-125 z-30" : "z-20 hover:scale-110"
                        } ${isResolved
                          ? "bg-zinc-800 text-zinc-500 border-zinc-600 ring-transparent"
                          : getPinColor(pin.pin_type)
                        }`}
                      title={`${pin.pin_type}: ${pin.title}`}
                    >
                      {pin.pin_type === "NCR_DEFECT" ? "!" : pin.pin_type === "POUR_GATE" ? "P" : "?"}
                    </button>
                  );
                })}

                {/* TEMPORARY PENDING PIN PLACEMENT INDICATOR */}
                {pendingCoords && (
                  <div
                    style={{ left: `${pendingCoords.x}%`, top: `${pendingCoords.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-cyan-400 text-zinc-950 font-black flex items-center justify-center text-xs animate-bounce z-40 border-2 border-white shadow-2xl"
                  >
                    +
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: PIN DETAILS OR COMPOSER DRAWER */}
          <div className="lg:col-span-4 space-y-4">

            {/* CASE 1: CREATING A NEW PIN AT CAPTURED COORDS */}
            {pendingCoords ? (
              <form onSubmit={handleCreatePin} className="bg-zinc-900/60 border border-cyan-500/50 p-5 space-y-4 rounded">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <span className="font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    <span>Drop Spatial Pin</span>
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    X: {pendingCoords.x}% | Y: {pendingCoords.y}%
                  </span>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block mb-1">Pin Category</label>
                  <select
                    value={pinType}
                    onChange={(e) => setPinType(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-bold"
                  >
                    <option value="RFI">RFI (Request for Information)</option>
                    <option value="NCR_DEFECT">Quality Defect / Honeycombing Lien</option>
                    <option value="POUR_GATE">Pre-Pour Hold-Gate Anchor</option>
                    <option value="SITE_NOTE">General Site Observation</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block mb-1">Grid Coordinate Anchor</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Axis B-2 / Column C14"
                    value={gridLoc}
                    onChange={(e) => setGridLoc(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block mb-1">Issue / Observation Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Beam rebar lap length verification"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block mb-1">Technical Observation Remarks</label>
                  <textarea
                    rows={3}
                    placeholder="Provide engineering context or corrective mandate..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setPendingCoords(null)}
                    className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white uppercase text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase text-xs flex items-center gap-1.5"
                  >
                    <span>{submitting ? "Anchoring..." : "Anchor Pin to CDE"}</span>
                  </button>
                </div>
              </form>
            ) : selectedPin ? (
              /* CASE 2: SELECTED AN EXISTING PIN */
              <div className="bg-zinc-900/60 border border-zinc-800 p-5 space-y-4 rounded">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <span className="font-bold text-white uppercase text-xs flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${getPinColor(selectedPin.pin_type).split(" ")[0]}`} />
                    <span>{selectedPin.pin_type.replace(/_/g, " ")}</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 uppercase">
                    {selectedPin.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white">{selectedPin.title}</h3>
                  <div className="text-[11px] text-cyan-400 font-mono">Anchor: {selectedPin.grid_location}</div>
                  <p className="text-xs text-zinc-300 font-sans leading-relaxed pt-1 bg-zinc-950 p-3 border border-zinc-850">
                    {selectedPin.description || "No extended engineering remarks provided."}
                  </p>
                </div>

                <div className="pt-2 flex justify-between items-center border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setSelectedPin(null)}
                    className="text-zinc-500 hover:text-zinc-300 uppercase text-[11px]"
                  >
                    Deselect
                  </button>

                  {selectedPin.status !== "RESOLVED" && (
                    <button
                      type="button"
                      onClick={() => handleResolvePin(selectedPin.id)}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase text-xs flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Sign-off &amp; Resolve</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* CASE 3: ZERO SELECTION IDLE HINT */
              <div className="p-6 bg-zinc-900/20 border border-zinc-850 text-center space-y-2 rounded">
                <Compass className="w-8 h-8 text-zinc-600 mx-auto" />
                <h4 className="text-xs font-bold text-zinc-300 uppercase">Interactive Drawing Canvas</h4>
                <p className="text-[11px] text-zinc-500 font-sans">
                  Click any coordinate centroid on the GFC layout to drop an RFI, defect notice, or pre-pour hold-gate.
                </p>
              </div>
            )}

            {/* CHRONOLOGICAL PIN REGISTER */}
            <div className="bg-zinc-900/40 border border-zinc-800 p-4 space-y-3 rounded">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block border-b border-zinc-800 pb-1.5">
                Sheet Pins Register ({pins.length})
              </span>

              <div className="space-y-2 overflow-y-auto max-h-[300px]">
                {pins.length === 0 ? (
                  <div className="text-zinc-600 text-center py-4">No pins on this revision yet.</div>
                ) : (
                  pins.map((pin) => (
                    <button
                      key={pin.id}
                      type="button"
                      onClick={() => {
                        setSelectedPin(pin);
                        setPendingCoords(null);
                      }}
                      className="w-full text-left p-2.5 bg-zinc-950 hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-700 rounded transition flex items-center justify-between"
                    >
                      <div className="truncate pr-2">
                        <span className="text-zinc-200 font-bold block truncate">{pin.title}</span>
                        <span className="text-[10px] text-zinc-500">{pin.grid_location}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold shrink-0 ${pin.status === "RESOLVED" ? "text-zinc-500 bg-zinc-900" : "text-cyan-400 bg-cyan-950 border border-cyan-800"
                        }`}>
                        {pin.status}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}