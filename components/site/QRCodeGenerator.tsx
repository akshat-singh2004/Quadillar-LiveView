"use client";

import React, { useState } from "react";
import { Printer, QrCode, Plus, Sparkles, CheckCircle2 } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import type { SiteQrRecord } from "./QRScannerModal";

export type SiteQrEntityType = "GRID_LOCATION" | "POUR_BATCH" | "ASSET_AIM" | "SNAG_DEFECT";

interface Props {
  onTagCreated: (newTag: SiteQrRecord) => void;
}

export function QRCodeGenerator({ onTagCreated }: Props) {
  const { project, tier } = useActiveRole();
  const [tagCode, setTagCode] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [entityType, setEntityType] = useState<SiteQrEntityType>("GRID_LOCATION");
  const [saving, setSaving] = useState(false);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagCode.trim() || !title.trim()) return;

    setSaving(true);
    const newRecord = {
      project_id: projectId,
      qr_code: tagCode.trim().toUpperCase(),
      entity_type: entityType,
      entity_id: tagCode.trim().toUpperCase(),
      title: title.trim(),
      location_reference: location.trim() || "Field Zone",
      metadata: {
        created_by: "Field Engineer",
        tier,
      },
      scanned_count: 0,
      last_scanned_at: new Date().toISOString(),
    };

    const { data } = await (supabase as any)
      .from("site_qr_tags")
      .insert([newRecord])
      .select()
      .single();

    if (data) {
      onTagCreated(data as SiteQrRecord);
      setTagCode("");
      setTitle("");
      setLocation("");
    }
    setSaving(false);
  };

  const handlePrintSticker = (tag: { code: string; title: string; loc: string }) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(tag.code)}`;
    const printWin = window.open("", "_blank", "width=600,height=600");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Quadillar Field Tag — ${tag.code}</title>
  <style>
    @page { size: 100mm 100mm; margin: 0; }
    body { margin: 0; padding: 12mm; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 76mm; box-sizing: border-box; }
    .brand { font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7; }
    .title { font-size: 14px; font-weight: 800; text-align: center; margin: 4px 0; color: #09090b; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; text-align: center; }
    .footer { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; border-top: 1px solid #e4e4e7; width: 100%; text-align: center; padding-top: 4px; }
  </style>
</head>
<body>
  <div style="text-align: center;">
    <div class="brand">Quadillar LiveView · ISO 19650</div>
    <div class="title">${tag.title}</div>
    <div class="meta">${tag.loc}</div>
  </div>
  <img src="${qrUrl}" width="140" height="140" alt="${tag.code}" style="margin: 6px 0;"/>
  <div class="footer">DO NOT REMOVE OR OBSTRUCT · TAG ID: ${tag.code}</div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
            Hardware Sticker Dispatch
          </span>
          <h2 className="text-sm font-bold text-white mt-0.5">
            Generate Laminated Field QR Tag
          </h2>
        </div>
        <span className="text-xs font-mono text-zinc-500">100mm &times; 100mm Field Label</span>
      </div>

      <form onSubmit={handleCreateTag} className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-zinc-400 text-[11px] mb-1">Tag Serial ID</label>
            <input
              type="text"
              required
              placeholder={tier === "RESIDENTIAL" ? "QL-TAG-BED-WDB-01" : "QL-TAG-L03-COL-C4"}
              value={tagCode}
              onChange={(e) => setTagCode(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-white font-mono uppercase outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-zinc-400 text-[11px] mb-1">Target Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as SiteQrEntityType)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-white outline-none focus:border-cyan-400"
            >
              <option value="GRID_LOCATION">Grid Coordinate / Column</option>
              <option value="POUR_BATCH">RMC Pour Transit Mixer</option>
              <option value="ASSET_AIM">AIM Commissioned Equipment</option>
              <option value="SNAG_DEFECT">Snag Defect Anchor</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-zinc-400 text-[11px] mb-1">Label Title</label>
          <input
            type="text"
            required
            placeholder="e.g. Column C4 Rebar & Formwork Hold Point"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-white outline-none focus:border-cyan-400"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-[11px] mb-1">Spatial Location Reference</label>
          <input
            type="text"
            required
            placeholder="e.g. Level 03 / Grid C-4"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-white outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => handlePrintSticker({ 
              code: tagCode || "QL-TAG-SAMPLE", 
              title: title || "Sample Hold Tag", 
              loc: location || "Level 03 / Grid C-4" 
            })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Label</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register in Schema</span>
          </button>
        </div>
      </form>
    </div>
  );
}