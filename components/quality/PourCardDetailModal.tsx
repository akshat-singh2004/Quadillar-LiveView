"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, X, Printer, ShieldCheck, Clock, FileCheck } from "lucide-react";
import { supabase } from "@/app/lib/supabase";

export interface ConcretePourCardRecord {
  id: string;
  project_id: string;
  pour_number: string;
  location: string;
  grade: string;
  poured_volume_m3: number;
  batch_tag: string;
  design_slump_mm: number;
  actual_slump_mm: number;
  batching_plant_departure: string;
  discharge_chute_at: string;
  rebar_cleared: boolean;
  formwork_cleared: boolean;
  mep_cleared: boolean;
  cover_blocks_cleared: boolean;
  status: "Hold" | "Cleared" | "Poured" | "Rejected";
  contractor_name: string;
}

interface Props {
  pour: ConcretePourCardRecord | null;
  onClose: () => void;
  onUpdated: (pour: ConcretePourCardRecord) => void;
}

export function PourCardDetailModal({ pour, onClose, onUpdated }: Props) {
  const [draft, setDraft] = useState<ConcretePourCardRecord | null>(pour);
  const [saving, setSaving] = useState(false);

  if (!pour || !draft) return null;

  const slumpDiff = draft.actual_slump_mm - draft.design_slump_mm;
  const isSlumpCompliant = draft.design_slump_mm === 0 || Math.abs(slumpDiff) <= 25;
  const allClearancesPassed = draft.rebar_cleared && draft.formwork_cleared && draft.mep_cleared && draft.cover_blocks_cleared;

  const handleToggleClearance = (key: "rebar_cleared" | "formwork_cleared" | "mep_cleared" | "cover_blocks_cleared") => {
    setDraft({ ...draft, [key]: !draft[key] });
  };

  const handleSave = async () => {
    setSaving(true);
    const nextStatus = allClearancesPassed && isSlumpCompliant ? "Cleared" : "Hold";
    const updated = { ...draft, status: nextStatus };

    await supabase
      .from("pour_cards")
      .update({
        design_slump_mm: updated.design_slump_mm,
        actual_slump_mm: updated.actual_slump_mm,
        rebar_cleared: updated.rebar_cleared,
        formwork_cleared: updated.formwork_cleared,
        mep_cleared: updated.mep_cleared,
        cover_blocks_cleared: updated.cover_blocks_cleared,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updated.id);

    onUpdated(updated as ConcretePourCardRecord);
    setSaving(false);
    onClose();
  };

  const handlePrintProtocol = () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(draft.batch_tag)}`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`<!doctype html>
<html>
<head>
  <title>${draft.pour_number} Concrete Protocol</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 28px; color: #09090b; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 20px; }
    .stamp { display: inline-block; padding: 8px 16px; border: 2px solid ${allClearancesPassed && isSlumpCompliant ? '#15803d' : '#b91c1c'}; color: ${allClearancesPassed && isSlumpCompliant ? '#15803d' : '#b91c1c'}; font-weight: 800; text-transform: uppercase; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #e4e4e7; padding: 8px; text-align: left; font-size: 12px; }
    th { background: #f4f4f5; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0;">Quadillar LiveView · IS 456 Pour Protocol</h2>
    <div style="font-size: 12px; color: #52525b; margin-top: 4px;">Ref: ${draft.pour_number} · Location: ${draft.location}</div>
  </div>
  <div class="stamp">${allClearancesPassed && isSlumpCompliant ? "CLEARED FOR EXECUTION" : "HOLD POINT ACTIVE"}</div>
  <table>
    <tr><th>Specification Grade</th><td>${draft.grade}</td></tr>
    <tr><th>Design vs Actual Slump</th><td>${draft.design_slump_mm}mm / ${draft.actual_slump_mm}mm (${isSlumpCompliant ? 'IS 456 Compliant' : 'Out of Tolerance'})</td></tr>
    <tr><th>Rebar Reinforcement Clearance</th><td>${draft.rebar_cleared ? 'PASSED' : 'PENDING'}</td></tr>
    <tr><th>Formwork Stability & Level</th><td>${draft.formwork_cleared ? 'PASSED' : 'PENDING'}</td></tr>
    <tr><th>MEP Sleeve & Box Embedments</th><td>${draft.mep_cleared ? 'PASSED' : 'PENDING'}</td></tr>
    <tr><th>Cover Blocks (Min 40mm)</th><td>${draft.cover_blocks_cleared ? 'PASSED' : 'PENDING'}</td></tr>
  </table>
  <div style="margin-top: 24px; display: flex; align-items: center; gap: 14px;">
    <img src="${qrUrl}" width="100" height="100" alt="Batch QR"/>
    <div style="font-size: 11px; font-family: monospace;">Batch ID: ${draft.batch_tag}<br/>Contractor: ${draft.contractor_name}</div>
  </div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5">
        
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-cyan-400">
                {draft.pour_number}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                allClearancesPassed && isSlumpCompliant
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                  : "bg-rose-950 text-rose-400 border border-rose-800/60"
              }`}>
                {allClearancesPassed && isSlumpCompliant ? "Ready for Pour" : "Hold Active"}
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              {draft.location}
            </h3>
            <div className="text-xs text-zinc-500 mt-0.5 font-mono">
              Grade: {draft.grade} · Batch: {draft.batch_tag}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 MANDATORY PRE-CONCRETING CLEARANCES */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
            Mandatory Hold-Point Check Items
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {[
              { key: "rebar_cleared" as const, label: "Rebar Spacing, Laps & Chairs" },
              { key: "formwork_cleared" as const, label: "Shuttering Tightness & Line Level" },
              { key: "mep_cleared" as const, label: "Conduiting & Sleeve Embedments" },
              { key: "cover_blocks_cleared" as const, label: "Cover Blocks Placed & Fixed" },
            ].map((check) => (
              <button
                key={check.key}
                type="button"
                onClick={() => handleToggleClearance(check.key)}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                  draft[check.key]
                    ? "border-emerald-900/60 bg-emerald-950/20 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900/40 text-zinc-400"
                }`}
              >
                <span>{check.label}</span>
                <span className="font-mono text-[10px] font-bold">
                  {draft[check.key] ? "PASS" : "HOLD"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* IS 456 SLUMP VALIDATOR (Only applies if design slump > 0) */}
        {draft.design_slump_mm > 0 && (
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-xs">
            <div>
              <label className="block text-zinc-400 text-[11px] mb-1">Design Slump (mm)</label>
              <input
                type="number"
                value={draft.design_slump_mm}
                onChange={(e) => setDraft({ ...draft, design_slump_mm: Number(e.target.value) })}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-[11px] mb-1">Actual Slump on Chute (mm)</label>
              <input
                type="number"
                value={draft.actual_slump_mm}
                onChange={(e) => setDraft({ ...draft, actual_slump_mm: Number(e.target.value) })}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-white font-mono"
              />
            </div>
            <div className="col-span-2 flex items-center justify-between text-[11px] font-mono pt-1">
              <span className="text-zinc-500">IS 456 allowable tolerance: ±25mm</span>
              <span className={`font-bold ${isSlumpCompliant ? "text-emerald-400" : "text-rose-400"}`}>
                {isSlumpCompliant ? "Slump Compliant" : `Out of Spec (${slumpDiff >= 0 ? '+' : ''}${slumpDiff}mm)`}
              </span>
            </div>
          </div>
        )}

        {/* ACTIONS FOOTER */}
        <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
          <button
            type="button"
            onClick={handlePrintProtocol}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Pour Protocol</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition shadow-sm"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Update Hold-Point Status</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}