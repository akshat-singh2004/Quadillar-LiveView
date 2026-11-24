"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

interface AnchorSpec {
  id: string;
  zoneId: string;
  bimGlobalId: string;
  floor: string;
  location: string;
  datumRl: string;
}

const DEFAULT_ANCHORS: AnchorSpec[] = [
  { id: "A1", zoneId: "ZONE-1", bimGlobalId: "SLAB-Z1", floor: "Ground / Plinth", location: "Stairwell A Landing", datumRl: "+0.45m RL" },
  { id: "A2", zoneId: "ZONE-2", bimGlobalId: "SLAB-Z2", floor: "Level 1", location: "East Bay Column C-04", datumRl: "+4.20m RL" },
  { id: "A3", zoneId: "ZONE-3", bimGlobalId: "SLAB-Z3", floor: "Level 2", location: "Hotel Core Lift Lobby", datumRl: "+8.00m RL" },
  { id: "A4", zoneId: "ZONE-4", bimGlobalId: "TG-03", floor: "Level 3 Podium", location: "Transfer Girder TG-03 Soffit", datumRl: "+12.60m RL" },
  { id: "A5", zoneId: "ZONE-5", bimGlobalId: "CORE-Z5", floor: "Level 4", location: "MEP Riser Shaft North", datumRl: "+16.40m RL" },
  { id: "A6", zoneId: "ZONE-6", bimGlobalId: "CORE-Z6", floor: "Terrace / Crown", location: "Weather & Roof Anchor", datumRl: "+54.00m RL" },
  { id: "A7", zoneId: "FOAP-PILOT", bimGlobalId: "FOAP-BAY-01", floor: "FOAP Studio", location: "AKTU FOAP NIC Incubation Bay", datumRl: "+0.00m Local" },
];

export default function ZoneQrAnchorsPage() {
  const [anchors, setAnchors] = useState<AnchorSpec[]>(DEFAULT_ANCHORS);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [customZone, setCustomZone] = useState("FOAP-ROOM-2");
  const [customElement, setCustomElement] = useState("COL-B2");
  const [customFloor, setCustomFloor] = useState("Floor 2");

  useEffect(() => {
    let active = true;
    Promise.all(
      anchors.map(async (a) => {
        const payload = `QUADILLAR|${a.zoneId}|${a.bimGlobalId}|${a.floor}|${a.datumRl}`;
        // Level H error correction: stays scannable with up to 30% dust/damage on site
        const dataUrl = await QRCode.toDataURL(payload, {
          width: 240,
          margin: 2,
          errorCorrectionLevel: "H",
          color: { dark: "#000000", light: "#ffffff" },
        });
        return [a.id, dataUrl] as const;
      })
    ).then((entries) => {
      if (active) setQrMap(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [anchors]);

  const addCustomAnchor = () => {
    if (!customZone.trim() || !customElement.trim()) return;
    setAnchors((prev) => [
      ...prev,
      {
        id: `C-${Date.now().toString(36)}`,
        zoneId: customZone.trim().toUpperCase(),
        bimGlobalId: customElement.trim().toUpperCase(),
        floor: customFloor.trim() || "Site Level",
        location: "Custom Pilot Anchor",
        datumRl: "Local Origin",
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-3 sm:p-5 md:p-6 space-y-5">
      {/* Screen-only toolbar */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
            ₹5 Indoor Floor Lock • Works 100% Offline • Error Correction Level H (30% Dust Tolerance)
          </div>
          <h1 className="mt-0.5 text-xl font-bold text-white">Printable Zone QR Anchor Stickers</h1>
          <p className="text-xs text-zinc-400">
            Print on A4, laminate or tape at stairwell landings & columns. Scanning in Site Report snaps Floor + BIM Element instantly.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-[46px] shrink-0 rounded-lg bg-zinc-100 hover:bg-white px-5 text-xs font-bold text-zinc-950"
        >
          Print / Save A4 PDF
        </button>
      </div>

      {/* Add Custom FOAP / Site Sticker */}
      <div className="print:hidden grid grid-cols-1 sm:grid-cols-4 gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-xs font-mono">
        <input
          value={customZone}
          onChange={(e) => setCustomZone(e.target.value)}
          placeholder="Zone ID (e.g. FOAP-L2)"
          className="min-h-[42px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-white"
        />
        <input
          value={customElement}
          onChange={(e) => setCustomElement(e.target.value)}
          placeholder="BIM Element (e.g. COL-B2)"
          className="min-h-[42px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-white"
        />
        <input
          value={customFloor}
          onChange={(e) => setCustomFloor(e.target.value)}
          placeholder="Floor / Level"
          className="min-h-[42px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-white"
        />
        <button
          type="button"
          onClick={addCustomAnchor}
          className="min-h-[42px] rounded-lg bg-sky-600 hover:bg-sky-500 font-bold text-white"
        >
          + Add Sticker
        </button>
      </div>

      {/* Printable High-Contrast Sticker Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2 print:gap-3">
        {anchors.map((a) => (
          <div
            key={a.id}
            className="break-inside-avoid rounded-xl border-2 border-dashed border-zinc-700 bg-white p-4 text-zinc-950 flex flex-col items-center text-center shadow-sm"
          >
            <div className="w-full flex items-center justify-between border-b border-zinc-300 pb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider">
              <span>QUADILLAR LIVEVIEW</span>
              <span>{a.datumRl}</span>
            </div>

            {qrMap[a.id] ? (
              <img src={qrMap[a.id]} alt={`${a.zoneId}-${a.bimGlobalId}`} className="my-2.5 h-44 w-44" />
            ) : (
              <div className="my-2.5 h-44 w-44 flex items-center justify-center bg-zinc-100 text-xs font-mono">
                Generating…
              </div>
            )}

            <div className="text-lg font-mono font-extrabold tracking-tight">
              {a.zoneId} • {a.bimGlobalId}
            </div>
            <div className="text-xs font-semibold text-zinc-700">
              {a.floor} — {a.location}
            </div>
            <div className="mt-2 w-full rounded bg-zinc-950 px-2 py-1 text-[10px] font-mono text-white">
              SCAN IN SITE REPORT TO LOCK 6-DOF FLOOR ANCHOR
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
