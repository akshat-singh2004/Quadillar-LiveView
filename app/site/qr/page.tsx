"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Layers,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  Wrench,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { QRScannerModal, type SiteQrRecord } from "@/components/site/QRScannerModal";
import { QRCodeGenerator } from "@/components/site/QRCodeGenerator";

export default function SiteQrPage() {
  const { project, role, tier } = useActiveRole();
  const [tags, setTags] = useState<SiteQrRecord[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "GRID_LOCATION" | "POUR_BATCH" | "ASSET_AIM">("ALL");

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const loadTags = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("site_qr_tags")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data) setTags(data as SiteQrRecord[]);
    } catch {
      // Fallback gracefully
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadTags();

    const channel = supabase
      .channel(`qr_hub_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_qr_tags" }, () => void loadTags())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadTags]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return tags;
    return tags.filter((t) => (t as any).entity_type === filter);
  }, [tags, filter]);

  const totalScans = tags.reduce((sum, t) => sum + (Number((t as any).scanned_count) || 0), 0);

  const handlePrintBatchSticker = (tag: SiteQrRecord) => {
    const qrIdentifier = (tag as any).qr_code || tag.code || tag.tag_number || tag.id;
    const titleText = tag.title || (tag as any).name || "Field Tag";
    const locRef = (tag as any).location_reference || tag.location || tag.location_grid || "Site Grid";

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrIdentifier)}`;
    const printWin = window.open("", "_blank", "width=600,height=600");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Quadillar Field Tag — ${qrIdentifier}</title>
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
    <div class="title">${titleText}</div>
    <div class="meta">${locRef}</div>
  </div>
  <img src="${qrUrl}" width="140" height="140" alt="${qrIdentifier}" style="margin: 6px 0;"/>
  <div class="footer">DO NOT REMOVE OR OBSTRUCT · TAG ID: ${qrIdentifier}</div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING SPATIAL QR TELEMETRY...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Physical Field Telemetry</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Field QR Dispatch &amp; Optical Scanning
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              100mm laminated physical barcodes linked to CDE drawing coordinates, concrete transit mixer tickets, and AIM plant equipment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-sm"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Launch Field Camera Scanner</span>
            </button>
          </div>
        </div>

        {/* 4 PRIMARY QR METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Active Physical Stickers</span>
              <Tag className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {tags.length} Installed
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Laminated across active zones</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Cumulative Field Scans</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {totalScans} Scans
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Direct mobile site lookups</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>RMC Transit Batch Tags</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-400 mt-2">
              {tags.filter((t) => (t as any).entity_type === "POUR_BATCH").length} Active
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Slump &amp; turnaround verification</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Equipment Digital Twins</span>
              <Wrench className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {tags.filter((t) => (t as any).entity_type === "ASSET_AIM").length} Linked
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">ISO 19650-3 maintenance tags</div>
          </div>
        </div>

        {/* 2-COLUMN SPLIT: ACTIVE QR INVENTORY (LEFT) vs NEW TAG GENERATOR (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: ACTIVE FIELD TAGS TABLE (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs">
                {(["ALL", "GRID_LOCATION", "POUR_BATCH", "ASSET_AIM"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilter(t)}
                    className={`px-2.5 py-1 rounded font-semibold transition ${
                      filter === t ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {t === "ALL" ? "All Tags" : t.replace("_", " ")}
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono text-zinc-500">{filtered.length} Items</span>
            </div>

            <div className="space-y-2.5">
              {filtered.map((tag) => {
                const qrCodeText = (tag as any).qr_code || tag.code || tag.tag_number || tag.id;
                const entityTypeText = (tag as any).entity_type || tag.element_type || "TAG";
                const titleText = tag.title || (tag as any).name || "Field Tag";
                const locRef = (tag as any).location_reference || tag.location || tag.location_grid || "Site Grid";
                const scans = (tag as any).scanned_count ?? 0;

                return (
                  <div
                    key={tag.id}
                    className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 transition flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400">
                          {qrCodeText}
                        </span>
                        <span className="text-[9px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono uppercase">
                          {String(entityTypeText).replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white">
                        {titleText}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        {locRef} · {scans} field scans
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePrintBatchSticker(tag)}
                        className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition"
                        title="Print 100mm Field Label"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScannerOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition"
                      >
                        Simulate Scan
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: HARDWARE STICKER DISPATCHER (5 cols) */}
          <div className="lg:col-span-5">
            <QRCodeGenerator
              onTagCreated={(newTag) => {
                setTags((prev) => [newTag as SiteQrRecord, ...prev]);
              }}
            />
          </div>

        </div>

      </div>

      {/* SCANNER MODAL */}
      <QRScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        availableTags={tags}
        onTagScanned={(scanned: SiteQrRecord) => {
          setTags((prev) => prev.map((t) => (t.id === scanned.id ? scanned : t)));
        }}
      />
    </main>
  );
}