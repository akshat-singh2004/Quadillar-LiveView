"use client";

import React, { useState, useEffect, useRef } from "react";
import { BimClashRecord, resolveSpatialClash } from "@/app/actions/bim-actions";
import {
  Box,
  Layers,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Eye,
  Maximize2,
} from "lucide-react";

interface Props {
  clashes: BimClashRecord[];
  projectId?: string;
}

export function MinervaSpatialClashViewer({ clashes, projectId = "GOMTI-NAGAR-PH1-FITOUT" }: Props) {
  const [selectedClash, setSelectedClash] = useState<BimClashRecord | null>(clashes[0] || null);
  const [resolving, setResolving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D Isometric Canvas Projection Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Draw 3D Isometric Grid Floor
      ctx.strokeStyle = "#27272a";
      ctx.lineWidth = 1;
      for (let x = -150; x <= 150; x += 30) {
        ctx.beginPath();
        ctx.moveTo(centerX + x - 150, centerY + 100 + x * 0.5);
        ctx.lineTo(centerX + x + 150, centerY + 100 - x * 0.5);
        ctx.stroke();
      }

      // Draw Structural Concrete Beam (Blue/Slate Volume)
      ctx.save();
      ctx.fillStyle = "rgba(59, 130, 246, 0.25)";
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;

      // Isometric box transformation
      const beamW = 180;
      const beamH = 70;
      const beamD = 90;

      // Front Face
      ctx.beginPath();
      ctx.rect(centerX - beamW / 2, centerY - beamH / 2, beamW, beamH);
      ctx.fill();
      ctx.stroke();

      // Top Face
      ctx.beginPath();
      ctx.moveTo(centerX - beamW / 2, centerY - beamH / 2);
      ctx.lineTo(centerX - beamW / 2 + 40, centerY - beamH / 2 - 30);
      ctx.lineTo(centerX + beamW / 2 + 40, centerY - beamH / 2 - 30);
      ctx.lineTo(centerX + beamW / 2, centerY - beamH / 2);
      ctx.closePath();
      ctx.fillStyle = "rgba(96, 165, 250, 0.35)";
      ctx.fill();
      ctx.stroke();

      // Side Face
      ctx.beginPath();
      ctx.moveTo(centerX + beamW / 2, centerY - beamH / 2);
      ctx.lineTo(centerX + beamW / 2 + 40, centerY - beamH / 2 - 30);
      ctx.lineTo(centerX + beamW / 2 + 40, centerY + beamH / 2 - 30);
      ctx.lineTo(centerX + beamW / 2, centerY + beamH / 2);
      ctx.closePath();
      ctx.fillStyle = "rgba(37, 99, 235, 0.3)";
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Draw MEP Penetration Conduit (Crimson Cylinder / Duct passing through)
      ctx.save();
      const isLocked = selectedClash?.pour_card_lock_engaged ?? true;
      const ductColor = isLocked ? "#f43f5e" : "#10b981";
      const ductFill = isLocked ? "rgba(244, 63, 94, 0.45)" : "rgba(16, 185, 129, 0.45)";

      ctx.strokeStyle = ductColor;
      ctx.fillStyle = ductFill;
      ctx.lineWidth = 2;

      // Duct penetrates horizontally through center
      ctx.beginPath();
      ctx.rect(centerX - 40, centerY - 120, 80, 220);
      ctx.fill();
      ctx.stroke();

      // Collision Intersection Highlight (Pulsing Diamond)
      if (isLocked) {
        const pulse = 6 + Math.sin(angle) * 3;
        ctx.strokeStyle = "#fb7185";
        ctx.fillStyle = "rgba(255, 0, 80, 0.8)";
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "#f43f5e";
        ctx.fillText("COLLISION: PENETRATION 120mm", centerX + 18, centerY - 10);
      }
      ctx.restore();

      angle += 0.05;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [selectedClash]);

  const handleResolve = async (type: "SEOR_SLEEVED" | "REROUTED") => {
    if (!selectedClash) return;
    setResolving(true);
    try {
      const res = await resolveSpatialClash(selectedClash.id, type);
      if (res.success && res.data) {
        setSelectedClash(res.data as BimClashRecord);
      }
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 3D VIEWPORT CANVAS */}
      <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-cyan-400" />
            <span className="font-bold uppercase text-white text-xs">
              Minerva 3D Spatial Coordination Viewport
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono text-[9px]">
            ISO 19650-2 • LOD 400
          </span>
        </div>

        {/* CANVAS */}
        <div className="relative my-4 flex items-center justify-center bg-zinc-950/80 border border-zinc-850 rounded-xl overflow-hidden h-72">
          <canvas ref={canvasRef} width={500} height={280} className="w-full h-full object-contain" />
          <div className="absolute bottom-2 left-3 flex gap-3 text-[9px] font-mono text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-blue-500/40 border border-blue-400 inline-block" />
              <span>Structural Concrete</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-500/40 border border-rose-400 inline-block" />
              <span>MEP Service Conduit</span>
            </span>
          </div>
        </div>

        {/* STATUS FOOTER */}
        <div className="flex justify-between items-center pt-2 text-[10px] text-zinc-400 border-t border-zinc-800">
          <span>Target Grid: <strong className="text-zinc-200">{selectedClash?.grid_location || "SW-02"}</strong></span>
          <span className={selectedClash?.pour_card_lock_engaged ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
            {selectedClash?.pour_card_lock_engaged ? "⚠️ PRE-POUR CARD LOCKED" : "✓ PRE-POUR PERMIT AUTHORIZED"}
          </span>
        </div>
      </div>

      {/* INSPECTION & RESOLUTION PANEL */}
      <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between space-y-4">
        <div>
          <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold block mb-1">
            BIM Clash Forensics
          </span>
          <h3 className="text-sm font-bold text-white uppercase">
            {selectedClash?.clash_code || "Select Interference"}
          </h3>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            Interference detected between structural member and MEP utility line.
          </p>

          {selectedClash && (
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Structural Member:</span>
                  <strong className="text-zinc-200">{selectedClash.structural_element}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">MEP Service:</span>
                  <strong className="text-amber-400">{selectedClash.mep_service_element}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Penetration Depth:</span>
                  <strong className="text-rose-400 font-mono">{selectedClash.penetration_depth_mm} mm</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">SEOR Stamp:</span>
                  <strong className="text-cyan-400 font-mono">{selectedClash.seor_waiver_status}</strong>
                </div>
              </div>

              {/* SEOR RESOLUTION ACTIONS */}
              {selectedClash.pour_card_lock_engaged ? (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] text-zinc-400 block font-bold uppercase">
                    SEOR Regulatory Action (Sign &amp; Release Hold):
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={resolving}
                      onClick={() => handleResolve("SEOR_SLEEVED")}
                      className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold uppercase text-[10px] transition cursor-pointer flex items-center justify-center gap-1 shadow-lg shadow-emerald-950/40"
                    >
                      {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      <span>Approve Sleeve Detail</span>
                    </button>
                    <button
                      type="button"
                      disabled={resolving}
                      onClick={() => handleResolve("REROUTED")}
                      className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold uppercase text-[10px] transition cursor-pointer flex items-center justify-center gap-1 shadow-lg shadow-indigo-950/40"
                    >
                      {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                      <span>Enforce Reroute</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-950/50 border border-emerald-800 rounded-xl text-emerald-300 flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Hold cleared by SEOR. Pour card unblocked with Section 65B Merkle seal.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CLASH REGISTER THUMBNAILS */}
        <div className="border-t border-zinc-800 pt-3">
          <span className="text-[9px] text-zinc-500 uppercase font-bold block mb-1.5">
            Active Spatial Queue:
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {clashes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClash(c)}
                className={`p-2 rounded-lg border text-left shrink-0 w-36 transition cursor-pointer ${
                  selectedClash?.id === c.id
                    ? "bg-zinc-850 border-cyan-500"
                    : "bg-zinc-950 border-zinc-800 hover:bg-zinc-900"
                }`}
              >
                <span className="font-bold block text-white text-[10px] truncate">{c.clash_code}</span>
                <span className="text-[9px] text-zinc-400 block truncate">{c.grid_location}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
