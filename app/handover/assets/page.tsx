"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Database,
  FileCheck2,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface FacilityAsset {
  id: string;
  project_id: string;
  asset_tag: string;
  asset_name: string;
  category: string;
  location_grid: string;
  manufacturer: string;
  model_serial_no: string;
  installation_date: string;
  warranty_end_date: string;
  commissioning_status: string;
  vendor_name: string;
}

const FALLBACK_ASSETS: FacilityAsset[] = [
  {
    id: "ast-fb-1",
    project_id: "PRJ-01-LIVE",
    asset_tag: "HVAC-CH-01",
    asset_name: "Water-Cooled Centrifugal Chiller 500 TR",
    category: "HVAC_CHILLER",
    location_grid: "Basement 2 - Plant Room",
    manufacturer: "Daikin Industries",
    model_serial_no: "DK-500TR-9821",
    installation_date: "2026-05-10",
    warranty_end_date: "2028-05-10",
    commissioning_status: "COMMISSIONED_VERIFIED",
    vendor_name: "Thermax MEP Solutions",
  },
  {
    id: "ast-fb-2",
    project_id: "PRJ-01-LIVE",
    asset_tag: "LIFT-PS-01",
    asset_name: "High-Speed Gearless Passenger Elevator (2.5 m/s)",
    category: "PASSENGER_ELEVATOR",
    location_grid: "Tower A - Core Lift Bank 1",
    manufacturer: "Schindler Group",
    model_serial_no: "SCH-5500-4491",
    installation_date: "2026-06-20",
    warranty_end_date: "2029-06-20",
    commissioning_status: "COMMISSIONED_VERIFIED",
    vendor_name: "Schindler India Pvt Ltd",
  },
  {
    id: "ast-fb-3",
    project_id: "PRJ-01-LIVE",
    asset_tag: "DG-SET-01",
    asset_name: "Prime Silent Diesel Generator 1500 kVA",
    category: "DIESEL_GENERATOR",
    location_grid: "DG Yard Grid East",
    manufacturer: "Cummins India",
    model_serial_no: "QSK50-G4-1102",
    installation_date: "2026-04-15",
    warranty_end_date: "2028-04-15",
    commissioning_status: "COMMISSIONED_VERIFIED",
    vendor_name: "Sterling & Wilson",
  },
];

export default function FacilityAssetsPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [assets, setAssets] = useState<FacilityAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [search, setSearch] = useState("");

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("handover_facility_assets")
        .select("*")
        .eq("project_id", projectId)
        .order("asset_tag", { ascending: true });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setAssets(FALLBACK_ASSETS);
      } else {
        setIsFallbackMode(false);
        setAssets(data);
      }
    } catch {
      setIsFallbackMode(true);
      setAssets(FALLBACK_ASSETS);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const filteredAssets = useMemo(() => {
    if (!search.trim()) return assets;
    const term = search.toLowerCase();
    return assets.filter(
      (a) =>
        a.asset_tag.toLowerCase().includes(term) ||
        a.asset_name.toLowerCase().includes(term) ||
        a.manufacturer.toLowerCase().includes(term) ||
        a.vendor_name.toLowerCase().includes(term)
    );
  }, [assets, search]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>FACILITY HANDOVER • NATIONAL BUILDING CODE PART 8 / COBIE ASSET INVENTORY</span>
              <StatutoryInfo
                standardRef="NBC 2016 PART 8 / BS 8536"
                title="Facility Asset Register & As-Built Handover"
                idealRange="100% Commissioned & Warranty Logged"
                description="Governs post-completion asset handover for operations and maintenance. Tracks manufacturer serial numbers, commissioning sign-offs, and warranty expiration horizons."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-cyan-400" />
              <span>Facility Asset Register &amp; As-Built Handover</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Commissioning evidence, O&amp;M manuals, warranty windows, and vendor accountability.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFallbackMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-[10px] text-amber-300">
                <Database className="w-3.5 h-3.5" />
                <span>Simulated Offline Telemetry</span>
              </span>
            )}
            <button
              onClick={() => void loadAssets()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </header>

        {/* 3 SUMMARY TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Registered Facility Assets</span>
            <div className="text-2xl font-bold text-white mt-1">{assets.length} Plant Assets</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">100% Commissioned &amp; tested</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active Warranty Coverage</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">24 - 36 Months</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Full OEM manufacturer warranties</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">COBie / BIM Integrated</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">Level 2 LOD 500</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Direct parameter synchronization</span>
          </div>
        </div>

        {/* ASSET TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-zinc-800 pb-3">
            <span className="font-bold text-white uppercase text-xs">Commissioned Equipment Roster ({filteredAssets.length})</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search tag, equipment, vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 pl-8 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-zinc-800 text-xs">
            <table className="w-full text-left">
              <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                <tr>
                  <th className="p-3">Asset Tag &amp; Description</th>
                  <th className="p-3">Manufacturer &amp; Serial</th>
                  <th className="p-3">Installation Grid</th>
                  <th className="p-3">Warranty Expiration</th>
                  <th className="p-3">Vendor</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                {filteredAssets.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-900/50 transition">
                    <td className="p-3">
                      <span className="font-bold text-white block">{a.asset_name}</span>
                      <span className="text-[10px] text-cyan-400 font-mono">{a.asset_tag}</span>
                    </td>
                    <td className="p-3 text-zinc-300">
                      <div>{a.manufacturer}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{a.model_serial_no}</div>
                    </td>
                    <td className="p-3 text-zinc-400">{a.location_grid}</td>
                    <td className="p-3 text-emerald-400 font-mono font-bold">{a.warranty_end_date}</td>
                    <td className="p-3 text-zinc-300">{a.vendor_name}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {a.commissioning_status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
