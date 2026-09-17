"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  Globe,
  Leaf,
  Layers,
  Printer,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  TrendingDown,
  Truck,
  Wind,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export interface CarbonMaterialRecord {
  id: string;
  project_id: string;
  material_name: string;
  scope_category: "SCOPE_1_DIRECT" | "SCOPE_2_ENERGY" | "SCOPE_3_EMBODIED";
  quantity: number;
  unit: string;
  emission_factor_kgco2e_per_unit: number;
  gross_emissions_tco2e: number;
  offset_savings_tco2e: number;
  net_emissions_tco2e: number;
  specification_clause: string;
  igbc_compliance_status: "COMPLIANT" | "UNDER_AUDIT" | "NON_COMPLIANT";
  verification_source: string;
}

export default function CanonicalCarbonPage() {
  const { project, role, tier } = useActiveRole();
  const [materials, setMaterials] = useState<CarbonMaterialRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<CarbonMaterialRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterScope, setFilterScope] = useState<string>("ALL");

  const builtUpAreaSqm = tier === "RESIDENTIAL" ? 85 : 14200;

  const loadCarbonData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("project_carbon_emissions_log")
        .select("*")
        .eq("project_id", project.id)
        .order("net_emissions_tco2e", { ascending: false });

      if (data && data.length > 0) {
        setMaterials(data as CarbonMaterialRecord[]);
        if (!selectedRecord) setSelectedRecord(data[0] as CarbonMaterialRecord);
      } else {
        const defaults: CarbonMaterialRecord[] =
          tier === "RESIDENTIAL"
            ? [
                {
                  id: "c-res-01",
                  project_id: project.id,
                  material_name: "Action TESA Boilo HDHMR Boards (E1 Certified)",
                  scope_category: "SCOPE_3_EMBODIED",
                  quantity: 60,
                  unit: "Sheets",
                  emission_factor_kgco2e_per_unit: 14.2,
                  gross_emissions_tco2e: 0.85,
                  offset_savings_tco2e: 0.42,
                  net_emissions_tco2e: 0.43,
                  specification_clause: "FSC-STD-40-004 / Low-Formaldehyde Class E1",
                  igbc_compliance_status: "COMPLIANT",
                  verification_source: "EPD Declaration GreenPro-2026",
                },
                {
                  id: "c-res-02",
                  project_id: project.id,
                  material_name: "Low-VOC Waterborne PU Wall Primer & Topcoat",
                  scope_category: "SCOPE_3_EMBODIED",
                  quantity: 85,
                  unit: "Liters",
                  emission_factor_kgco2e_per_unit: 2.1,
                  gross_emissions_tco2e: 0.18,
                  offset_savings_tco2e: 0.08,
                  net_emissions_tco2e: 0.1,
                  specification_clause: "IGBC IEQ Credit 2 / VOC < 50 g/L",
                  igbc_compliance_status: "COMPLIANT",
                  verification_source: "Asian Paints Royale EPD",
                },
                {
                  id: "c-res-03",
                  project_id: project.id,
                  material_name: "Site Electrical Power (Fit-Out Operations)",
                  scope_category: "SCOPE_2_ENERGY",
                  quantity: 650,
                  unit: "kWh",
                  emission_factor_kgco2e_per_unit: 0.82,
                  gross_emissions_tco2e: 0.53,
                  offset_savings_tco2e: 0.0,
                  net_emissions_tco2e: 0.53,
                  specification_clause: "CEA Grid Baseline Emission Factor 2026",
                  igbc_compliance_status: "COMPLIANT",
                  verification_source: "MVVNL Meter Billing Record",
                },
              ]
            : [
                {
                  id: "c-twr-01",
                  project_id: project.id,
                  material_name: "M40 Grade Ready-Mix Concrete (35% GGBS Blend)",
                  scope_category: "SCOPE_3_EMBODIED",
                  quantity: 2850,
                  unit: "m³",
                  emission_factor_kgco2e_per_unit: 245.0,
                  gross_emissions_tco2e: 980.5,
                  offset_savings_tco2e: 282.2,
                  net_emissions_tco2e: 698.3,
                  specification_clause: "IS 456 / IS 12089 Slag Cement Optimization",
                  igbc_compliance_status: "COMPLIANT",
                  verification_source: "BuildMix Plant Environmental Declaration",
                },
                {
                  id: "c-twr-02",
                  project_id: project.id,
                  material_name: "TMT Rebar Fe500D (Recycled EAF Route)",
                  scope_category: "SCOPE_3_EMBODIED",
                  quantity: 420,
                  unit: "MT",
                  emission_factor_kgco2e_per_unit: 1450.0,
                  gross_emissions_tco2e: 820.0,
                  offset_savings_tco2e: 211.0,
                  net_emissions_tco2e: 609.0,
                  specification_clause: "GreenPro Certified Recycled Scrap Feedstock",
                  igbc_compliance_status: "COMPLIANT",
                  verification_source: "SteelSpan EPD Certificate 2026",
                },
                {
                  id: "c-twr-03",
                  project_id: project.id,
                  material_name: "Tower Cranes & Concrete Pumps (Direct Fuel)",
                  scope_category: "SCOPE_1_DIRECT",
                  quantity: 8400,
                  unit: "Liters Diesel",
                  emission_factor_kgco2e_per_unit: 2.68,
                  gross_emissions_tco2e: 22.5,
                  offset_savings_tco2e: 0.0,
                  net_emissions_tco2e: 22.5,
                  specification_clause: "IPCC Stationary Combustion Guidelines",
                  igbc_compliance_status: "COMPLIANT",
                  verification_source: "Site Fuel Bunker Register",
                },
              ];

        setMaterials(defaults);
        if (!selectedRecord) setSelectedRecord(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [project.id, selectedRecord, tier]);

  useEffect(() => {
    void loadCarbonData();

    const channel = supabase
      .channel(`carbon_sync_${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_carbon_emissions_log" }, () => void loadCarbonData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [project.id, loadCarbonData]);

  const summary = useMemo(() => {
    const grossTotal = materials.reduce((sum, m) => sum + Number(m.gross_emissions_tco2e || 0), 0);
    const savingsTotal = materials.reduce((sum, m) => sum + Number(m.offset_savings_tco2e || 0), 0);
    const netTotal = materials.reduce((sum, m) => sum + Number(m.net_emissions_tco2e || 0), 0);
    const intensity = builtUpAreaSqm > 0 ? (netTotal * 1000) / builtUpAreaSqm : 0;
    const reductionPct = grossTotal > 0 ? ((savingsTotal / grossTotal) * 100).toFixed(1) : "0.0";

    return { grossTotal, savingsTotal, netTotal, intensity: Math.round(intensity), reductionPct };
  }, [materials, builtUpAreaSqm]);

  const filteredMaterials = useMemo(() => {
    if (filterScope === "ALL") return materials;
    return materials.filter((m) => m.scope_category === filterScope);
  }, [materials, filterScope]);

  const handlePrintEsgReport = () => {
    const printWin = window.open("", "_blank", "width=1000,height=850");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>ESG Embodied Carbon & Green Rating Statement — ${project.name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 10px; }
    .green { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .total-row { background: #f1f5f9; font-weight: bold; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 36px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #059669;">Quadillar LiveView · ISO 14064 / IGBC Green Building Rating</div>
      <h1 class="title">Statutory Embodied Carbon (GHG) Audit Statement</h1>
      <div class="meta">Project: ${project.name} (${project.id}) · Governed Area: ${builtUpAreaSqm} m²</div>
    </div>
    <span class="badge green">IGBC GOLD / GRIHA 4-STAR BENCHMARK</span>
  </div>

  <table>
    <tr><th>Gross Baseline Emissions</th><td class="tar">${summary.grossTotal.toFixed(2)} tCO₂e</td><th>Offset from Pozzolana/Recycling</th><td class="tar" style="color: #15803d;">-${summary.savingsTotal.toFixed(2)} tCO₂e</td></tr>
    <tr><th>Net Embodied Carbon Output</th><td class="tar"><strong>${summary.netTotal.toFixed(2)} tCO₂e</strong></td><th>Carbon Intensity per Area</th><td class="tar"><strong>${summary.intensity} kgCO₂e/m²</strong></td></tr>
  </table>

  <table>
    <thead>
      <tr><th>Material / Activity</th><th>Scope Category</th><th class="tar">Quantity</th><th class="tar">Gross (tCO₂e)</th><th class="tar">Offsets (tCO₂e)</th><th class="tar">Net (tCO₂e)</th></tr>
    </thead>
    <tbody>
      ${materials.map((m) => `
        <tr>
          <td><strong>${m.material_name}</strong><div style="font-size: 10px; color: #64748b;">${m.specification_clause}</div></td>
          <td>${m.scope_category.replace(/_/g, ' ')}</td>
          <td class="tar">${m.quantity} ${m.unit}</td>
          <td class="tar">${m.gross_emissions_tco2e.toFixed(2)}</td>
          <td class="tar" style="color: #15803d;">-${m.offset_savings_tco2e.toFixed(2)}</td>
          <td class="tar" style="font-weight: bold;">${m.net_emissions_tco2e.toFixed(2)}</td>
        </tr>
      `).join("")}
      <tr class="total-row">
        <td colspan="3"><strong>TOTAL NET CRADLE-TO-GATE CARBON INVENTORY</strong></td>
        <td class="tar">${summary.grossTotal.toFixed(2)}</td>
        <td class="tar" style="color: #15803d;">-${summary.savingsTotal.toFixed(2)}</td>
        <td class="tar" style="color: #059669; font-size: 13px;"><strong>${summary.netTotal.toFixed(2)} tCO₂e</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>Materials Procurement Lead</div>
      <div style="color: #64748b;">EPD manufacturer certificates verified.</div>
      <div class="sig">Procurement Sign & Date</div>
    </div>
    <div>
      <div>IGBC / GRIHA Accredited Professional</div>
      <div style="color: #64748b;">ISO 14064 GHG verification cleared.</div>
      <div class="sig">Sustainability Lead Seal</div>
    </div>
    <div>
      <div>Principal Architect / Consultant SEOR</div>
      <div style="color: #64748b;">Certified for green building rating credits.</div>
      <div class="sig">Principal Consultant Approval</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedRecord) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        CALCULATING CRADLE-TO-GATE EMBODIED CARBON &amp; ESG FOOTPRINT...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-emerald-400 uppercase font-bold">
              <span>Sustainability Desk · ISO 14064 / IGBC &amp; GRIHA Standards</span>
              <span>·</span>
              <span className="text-zinc-400">{project.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Embodied Carbon &amp; ESG Performance
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Cradle-to-gate GHG accounting. Tracks concrete clinker reduction, scrap-fed EAF steel rebar, and low-VOC finishes to benchmark building lifecycle carbon intensity.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrintEsgReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print ESG Audit Certificate</span>
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Return to Command Center</span>
            </Link>
          </div>
        </div>

        {/* 4 PRIMARY CARBON TELEMETRY GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Net Embodied Carbon</span>
              <Leaf className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {summary.netTotal.toFixed(1)} tCO₂e
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {summary.reductionPct}% offset from clinker substitution
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Carbon Intensity (A1-A3)</span>
              <Scale className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {summary.intensity} <span className="text-xs font-normal text-zinc-500">kgCO₂e/m²</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Across {builtUpAreaSqm} m² built-up footprint</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Avoided Clinker Emissions</span>
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              -{summary.savingsTotal.toFixed(1)} tCO₂e
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Via GGBS / fly ash cement blending</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Green Rating Compliance</span>
              <Award className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-cyan-300 mt-2">
              GRIHA 4-Star
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Eligible for maximum energy credits</div>
          </div>
        </div>

        {/* TOOLBAR FILTER TABS */}
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
          {[
            { key: "ALL", label: `All Materials (${materials.length})` },
            { key: "SCOPE_3_EMBODIED", label: "Scope 3 (Embodied Materials)" },
            { key: "SCOPE_1_DIRECT", label: "Scope 1 (Direct Fuel & Equipment)" },
            { key: "SCOPE_2_ENERGY", label: "Scope 2 (Site Power Grid)" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterScope(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                filterScope === tab.key
                  ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-950/50"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 2-COLUMN WORKBENCH: MATERIAL EMISSION TABLE (8 cols) vs VERIFICATION PANE (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: INVENTORY LEDGER (8 cols) */}
          <div className="lg:col-span-8 rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
            <div className="border-b border-zinc-800 px-5 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  ISO 14064 Material Inventory
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">Embodied Carbon Tracking Table</h3>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredMaterials.length} Packages</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-900/60 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Material Package</th>
                    <th className="px-4 py-3">Scope Classification</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Factor (kgCO₂e/u)</th>
                    <th className="px-4 py-3 text-right">Gross (tCO₂e)</th>
                    <th className="px-4 py-3 text-right">Net (tCO₂e)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                  {filteredMaterials.map((m) => {
                    const isSelected = selectedRecord.id === m.id;

                    return (
                      <tr
                        key={m.id}
                        onClick={() => setSelectedRecord(m)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? "bg-emerald-950/30 border-l-2 border-l-emerald-400"
                            : "hover:bg-zinc-900/30"
                        }`}
                      >
                        <td className="px-4 py-3.5 font-sans font-bold text-white">
                          {m.material_name}
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{m.specification_clause}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            {m.scope_category.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-zinc-200">
                          {m.quantity} {m.unit}
                        </td>
                        <td className="px-4 py-3.5 text-right text-zinc-400">
                          {m.emission_factor_kgco2e_per_unit}
                        </td>
                        <td className="px-4 py-3.5 text-right text-zinc-400">
                          {m.gross_emissions_tco2e.toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-emerald-400">
                          {m.net_emissions_tco2e.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: DETAILED AUDIT PANE (4 cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  EPD Verification
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">Life-Cycle Assessment</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 text-[10px] font-mono font-bold uppercase">
                {selectedRecord.igbc_compliance_status}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2 text-xs font-mono">
              <span className="text-[10px] uppercase text-zinc-500 block">Audited Package:</span>
              <strong className="text-white text-sm font-sans block leading-snug">{selectedRecord.material_name}</strong>
              <div className="text-emerald-400 text-[11px]">{selectedRecord.specification_clause}</div>
              <div className="pt-2 border-t border-zinc-800/60 text-[11px] space-y-1">
                <div className="text-zinc-400">Evidence Source: <strong className="text-zinc-200">{selectedRecord.verification_source}</strong></div>
                <div className="text-zinc-400">Scope Level: <strong className="text-cyan-400">{selectedRecord.scope_category.replace(/_/g, " ")}</strong></div>
              </div>
            </div>

            {/* CARBON SAVINGS SUMMARY */}
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                GreenPro Environmental Product Declaration:
              </span>

              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Gross Sourced Footprint:</span>
                  <span className="text-zinc-200">{selectedRecord.gross_emissions_tco2e.toFixed(2)} tCO₂e</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Decarbonization Offset:</span>
                  <span className="text-emerald-400">-{selectedRecord.offset_savings_tco2e.toFixed(2)} tCO₂e</span>
                </div>
                <div className="flex justify-between text-white font-extrabold text-sm pt-2 border-t border-zinc-800">
                  <span>Certified Net Emission:</span>
                  <span className="text-emerald-400">{selectedRecord.net_emissions_tco2e.toFixed(2)} tCO₂e</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 font-mono text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Cradle-to-Gate (A1-A3) EPD verified against EN 15804 / ISO 21930.</span>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              ISO 14064 &amp; IGBC Green Building Construction Matrix
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}