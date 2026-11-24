"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface RemoteEvidenceRow {
  id: string;
  project_id?: string;
  projectId?: string;
  zone_id?: string;
  zoneId?: string;
  bim_global_id?: string;
  bimGlobalId?: string;
  sha256: string;
  recorded_at_utc?: string;
  recordedAtUtc?: string;
  qr_payload?: string | null;
  qrPayload?: string | null;
  note_text?: string;
  noteText?: string;
  bandwidth_profile?: string;
  bandwidthProfile?: string;
  media_uploaded?: boolean;
  mediaUploaded?: boolean;
}

export function SyncedEvidenceInbox() {
  const [rows, setRows] = useState<RemoteEvidenceRow[]>([]);
  const [storageMode, setStorageMode] = useState<string>("loading");
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/field-captures/sync", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStorageMode(data.storageMode || "unknown");
        setRows(Array.isArray(data.packets) ? data.packets : []);
      }
    } catch {
      setStorageMode("offline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  return (
    <section className="mb-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-emerald-300">
              DIRECTOR LIVE FIELD INBOX
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              LEDGER: {storageMode.toUpperCase()} • {rows.length} SEALED PACKETS
            </span>
          </div>
          <h2 className="mt-1 text-base font-bold text-white">Synced Field Evidence Ledger (Phone → Head Office)</h2>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/closeout/bsa-certificate"
            className="min-h-[38px] inline-flex items-center rounded-lg bg-zinc-100 hover:bg-white px-3.5 text-xs font-bold text-zinc-950"
          >
            Print BSA Sec 63(4) PDF
          </Link>
          <button
            type="button"
            onClick={loadFeed}
            className="min-h-[38px] rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-3 text-xs font-mono text-zinc-200"
          >
            {loading ? "Syncing…" : "Refresh"}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 p-5 text-center text-xs font-mono text-zinc-400">
          No field packets synced yet. Open{" "}
          <Link href="/site/dpr" className="text-sky-400 underline">
            /site/dpr
          </Link>{" "}
          on phone or PC to seal and upload a BSA Sec 63 capture.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.slice(0, 12).map((r) => {
            const zone = r.zone_id || r.zoneId || "ZONE";
            const bim = r.bim_global_id || r.bimGlobalId || "BIM";
            const note = r.note_text || r.noteText || "Field evidence";
            const utc = r.recorded_at_utc || r.recordedAtUtc || "";
            const qr = r.qr_payload || r.qrPayload;
            const profile = r.bandwidth_profile || r.bandwidthProfile || "standard";
            const hasMedia = Boolean(r.media_uploaded ?? r.mediaUploaded);

            return (
              <div
                key={r.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 text-xs font-mono space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white truncate">{r.id}</span>
                  <span className="rounded bg-emerald-600/20 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] text-emerald-300">
                    {hasMedia ? profile : "MANIFEST"}
                  </span>
                </div>
                <div className="text-sky-300 font-semibold">
                  {zone} • {bim}
                </div>
                <div className="text-zinc-300 line-clamp-2">{note}</div>
                <div className="text-[10px] text-emerald-400 truncate">SHA-256: {r.sha256}</div>
                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                  <span className="truncate">{qr ? `QR: ${qr}` : "Manual anchor"}</span>
                  <span className="shrink-0">{utc ? utc.slice(0, 19).replace("T", " ") : ""}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
