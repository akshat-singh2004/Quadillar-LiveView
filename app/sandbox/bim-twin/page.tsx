"use client";

import React, { useState, useEffect } from "react";

interface Asset { manufacturer?: string; model?: string; serialNumber?: string; [key: string]: any; 
  asset_guid: string;
  asset_tag: string;
  asset_name: string;
  discipline: string;
  sub_system: string;
  floor_level: string;
  grid_location: string;
  defect_ticket_ref: string | null;
  design_parameters: Record<string, any>;
}

export default function BimSandboxPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  useEffect(() => {
    // 1. Fetch asset schedule
    fetch("/models/tower_a_lod500_assets.json")
      .then((r) => r.json())
      .then((data) => {
        setAssets(data);
        if (data.length > 0) setSelectedAsset(data[0]);
      })
      .catch(console.error);

    // 2. Poll live telemetry snapshot
    const interval = setInterval(() => {
      fetch("/models/live_telemetry_snapshot.json")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) setTelemetry(data);
        })
        .catch(() => {});
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const vavTelemetry = telemetry?.telemetry?.["2f8a91b4-4e2a-49c8-9d7e-8c3120b08fa1"];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              LOD 500 AS-BUILT TWIN
            </span>
            <span className="text-xs text-slate-400 font-mono">
              IFC4 / ISO 10303-21 SPECIFICATION
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-1">
            Lucknow IT City Technology Park - Tower A
          </h1>
          <p className="text-xs text-slate-400">
            Project ID: <span className="font-mono text-cyan-400">LUCKNOW-TECHPARK-PH1</span> | CPWD GCC Clause 17 Defect Telemetry Loop
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-right">
            <div className="text-[10px] uppercase text-slate-400 font-semibold">Telemetry Pulse</div>
            <div className="text-sm font-mono text-emerald-400 flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              {telemetry ? `Live (Tick #${telemetry.tick})` : "Awaiting Stream"}
            </div>
          </div>
          <a
            href="/models/lucknow_tower_a_mep.ifc"
            download
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded transition shadow-sm"
          >
            Download Spec IFC4
          </a>
        </div>
      </div>

      {/* Main Grid: Spatial 2.5D Layout + Telemetry Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left: Spatial Floor Layout & BIM Hotspots (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Level 1 Spatial Floor Matrix & Sensor Grid
              </h2>
              <span className="text-xs text-slate-400 font-mono">Geofenced Datum: 26.7794°N, 80.9982°E</span>
            </div>

            {/* Schematic Floor Grid Representation */}
            <div className="relative w-full h-80 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center p-6">
              {/* Grid Lines */}
              <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 opacity-20 pointer-events-none">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="border border-cyan-500/30"></div>
                ))}
              </div>

              {/* Grid Labels */}
              <span className="absolute top-2 left-2 text-[10px] font-mono text-slate-400">Bay A1 (Chiller Core)</span>
              <span className="absolute top-2 right-2 text-[10px] font-mono text-slate-400">Bay D1 (Shaft)</span>
              <span className="absolute bottom-2 left-2 text-[10px] font-mono text-slate-400">Bay A4 (Main LT Switchboard)</span>
              <span className="absolute bottom-2 right-2 text-[10px] font-mono text-amber-400 font-semibold">Bay C3-D4 (Open Workstation Bay)</span>

              {/* Asset Pins */}
              {assets.map((asset) => {
                const isSelected = selectedAsset?.asset_guid === asset.asset_guid;
                const hasTicket = asset.defect_ticket_ref !== null;

                return (
                  <button
                    key={asset.asset_guid}
                    onClick={() => setSelectedAsset(asset)}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 p-2.5 rounded-lg border text-left transition-all ${
                      hasTicket
                        ? "bg-amber-950/80 border-amber-500 text-amber-200 shadow-lg shadow-amber-500/20"
                        : "bg-slate-800/90 border-slate-600 text-slate-200 hover:border-cyan-400"
                    } ${isSelected ? "ring-2 ring-cyan-400 scale-105" : ""}`}
                    style={{
                      left: asset.asset_tag === "VAV-1-NW-04" ? "75%" : asset.asset_tag === "AHU-L01-01" ? "25%" : asset.asset_tag === "LT-PNL-L01" ? "18%" : "50%",
                      top: asset.asset_tag === "VAV-1-NW-04" ? "70%" : asset.asset_tag === "AHU-L01-01" ? "30%" : asset.asset_tag === "LT-PNL-L01" ? "80%" : "20%"
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${hasTicket ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`}></span>
                      <span className="text-xs font-mono font-bold">{asset.asset_tag}</span>
                    </div>
                    <div className="text-[10px] opacity-75">{asset.grid_location}</div>
                  </button>
                );
              })}
            </div>
          </div>

            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div>Click any pinned MEP asset to inspect live telemetry & CPWD SLA status.</div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Normal</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Active DLP Ticket</span>
            </div>
          </div>
        </div>

        {/* Right: Asset Detail & Live Telemetry Panel (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {selectedAsset && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-mono text-cyan-400 uppercase">{selectedAsset.discipline}</span>
                  <h3 className="text-lg font-bold text-white">{selectedAsset.asset_name}</h3>
                  <div className="text-xs text-slate-400 font-mono">GUID: {selectedAsset.asset_guid}</div>
                </div>
                {selectedAsset.defect_ticket_ref && (
                  <span className="px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded">
                    SLA ACTIVE: {selectedAsset.defect_ticket_ref}
                  </span>
                )}
              </div>

              {/* Telemetry Live Gauges */}
              <div className="mt-4">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Real-Time Sensor Telemetry
                </div>

                {selectedAsset.asset_tag === "VAV-1-NW-04" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="text-[11px] text-slate-400">Damper Angle</div>
                      <div className="text-xl font-bold font-mono text-amber-400">
                        {vavTelemetry ? `${vavTelemetry.damper_angle}°` : "46.8°"}
                      </div>
                      <div className="text-[10px] text-amber-500 mt-0.5">
                        {vavTelemetry ? `+${vavTelemetry.drift_degrees}° Drift` : "+1.8° Drift Detected"}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="text-[11px] text-slate-400">Airflow Rate</div>
                      <div className="text-xl font-bold font-mono text-slate-200">
                        {vavTelemetry ? `${vavTelemetry.airflow_cfm} CFM` : "402 CFM"}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Setpoint: 450 CFM</div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg col-span-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Contractor SLA (14-Day Limit)</span>
                        <span className="text-amber-400 font-mono font-semibold">14 Days Remaining</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                        <div className="bg-amber-400 h-full w-[8%]" title="Day 1 of 14"></div>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1.5">
                        Escrow Corpus at Risk: <span className="text-slate-200 font-semibold">₹22,50,000.00</span> (CPWD GCC Clause 17)
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-center text-xs text-slate-400">
                    Operating within nominal manufacturer tolerances. No active defects reported.
                  </div>
                )}
              </div>

              {/* Asset Technical Specifications */}
              <div className="mt-5 pt-4 border-t border-slate-800">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  LOD 500 COBie Metadata
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Manufacturer</span>
                    <span className="text-slate-200 font-mono">{(selectedAsset as any)?.manufacturer}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Model / Serial</span>
                    <span className="text-slate-200 font-mono">{(selectedAsset as any)?.model_number}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Commissioned Date</span>
                    <span className="text-slate-200 font-mono">{selectedAsset.commissioning_date}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Statutory Warranty Expiry</span>
                    <span className="text-emerald-400 font-mono font-semibold">{selectedAsset.warranty_expiry}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
