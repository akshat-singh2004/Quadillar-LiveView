"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Boxes,
  Truck,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Database,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface InventoryItem {
  id: string;
  project_id: string;
  item_code: string;
  material_name: string;
  category: string;
  unit: string;
  current_stock_qty: number;
  minimum_reorder_qty: number;
  storage_location: string;
  unit_rate_inr: number;
  last_inward_date: string;
  stock_health: "ADEQUATE" | "LOW_STOCK" | "CRITICAL_REORDER";
}

const FALLBACK_INVENTORY: InventoryItem[] = [
  {
    id: "inv-fb-1",
    project_id: "PRJ-01-LIVE",
    item_code: "MAT-STL-550",
    material_name: "TMT Steel Rebar Fe 550D (16mm to 32mm)",
    category: "STEEL_REBAR",
    unit: "MT",
    current_stock_qty: 142.50,
    minimum_reorder_qty: 40.00,
    storage_location: "Central Steel Yard Zone A",
    unit_rate_inr: 62500,
    last_inward_date: "2026-09-29",
    stock_health: "ADEQUATE",
  },
  {
    id: "inv-fb-2",
    project_id: "PRJ-01-LIVE",
    item_code: "MAT-CEM-OPC",
    material_name: "UltraTech OPC 53 Grade Cement Bags",
    category: "CEMENT_OPC",
    unit: "Bags",
    current_stock_qty: 2850,
    minimum_reorder_qty: 1000,
    storage_location: "Covered Cement Shed B",
    unit_rate_inr: 385,
    last_inward_date: "2026-09-28",
    stock_health: "ADEQUATE",
  },
  {
    id: "inv-fb-3",
    project_id: "PRJ-01-LIVE",
    item_code: "MAT-AGG-20",
    material_name: "Coarse Crushed Stone Aggregate (20mm)",
    category: "AGGREGATES",
    unit: "MT",
    current_stock_qty: 48.00,
    minimum_reorder_qty: 80.00,
    storage_location: "Batching Bunker 1",
    unit_rate_inr: 1150,
    last_inward_date: "2026-09-25",
    stock_health: "LOW_STOCK",
  },
];

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function SiteInventoryPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [search, setSearch] = useState("");

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("site_material_inventory")
        .select("*")
        .eq("project_id", projectId)
        .order("material_name", { ascending: true });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setItems(FALLBACK_INVENTORY);
      } else {
        setIsFallbackMode(false);
        setItems(data);
      }
    } catch {
      setIsFallbackMode(true);
      setItems(FALLBACK_INVENTORY);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const summary = useMemo(() => {
    const totalValuation = items.reduce((sum, i) => sum + Number(i.current_stock_qty * i.unit_rate_inr), 0);
    const lowStockCount = items.filter((i) => i.stock_health !== "ADEQUATE").length;
    return { count: items.length, totalValuation, lowStockCount };
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const term = search.toLowerCase();
    return items.filter(
      (i) =>
        i.item_code.toLowerCase().includes(term) ||
        i.material_name.toLowerCase().includes(term) ||
        i.category.toLowerCase().includes(term) ||
        i.storage_location.toLowerCase().includes(term)
    );
  }, [items, search]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>MATERIAL CONTROL &bull; CPWD STORES MANUAL SECTION 15 / IS 4082 STACKING</span>
              <StatutoryInfo
                standardRef="CPWD SECTION 15 / IS 4082"
                title="Site Store Inventory & Bulk Material Stock"
                idealRange="Stock Health: Adequate (> Reorder Level)"
                description="Controls bulk raw materials on site: TMT steel bars, cement bags, and aggregates. Reconciles physical yard stock with digital weighbridge deliveries and pour card consumption."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Boxes className="w-6 h-6 text-cyan-400" />
              <span>Site Store Inventory &amp; Bulk Material Stock</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Real-time yard balances, minimum reorder alerts, and store valuation.
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
              onClick={() => void loadInventory()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <Link
              href="/operations/gate-register"
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <span>Gate Inward Register</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* 3 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Stock Valuation</span>
            <div className="text-2xl font-bold text-white mt-1">{formatInr(summary.totalValuation)}</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Live yard inventory balance</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active Bulk Commodities</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{summary.count} Material Lines</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Steel, Cement, Aggregates &amp; Blocks</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Reorder Alerts</span>
            <div className={`text-2xl font-bold mt-1 ${summary.lowStockCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {summary.lowStockCount} Reorder Notice(s)
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Below safety stock threshold</span>
          </div>
        </div>

        {/* INVENTORY TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-zinc-800 pb-3">
            <span className="font-bold text-white uppercase text-xs">Site Inventory Roster ({filteredItems.length})</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search material, code, location..."
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
                  <th className="p-3">Item Code &amp; Description</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Storage Location</th>
                  <th className="p-3 text-right">Current Stock</th>
                  <th className="p-3 text-right">Minimum Reorder</th>
                  <th className="p-3 text-right">Valuation (₹)</th>
                  <th className="p-3 text-center">Stock Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                {filteredItems.map((i) => (
                  <tr key={i.id} className="hover:bg-zinc-900/50 transition">
                    <td className="p-3">
                      <span className="font-bold text-white block">{i.material_name}</span>
                      <span className="text-[10px] text-cyan-400 font-mono">{i.item_code}</span>
                    </td>
                    <td className="p-3 text-zinc-400 font-mono text-[11px]">{i.category.replace(/_/g, " ")}</td>
                    <td className="p-3 text-zinc-300">{i.storage_location}</td>
                    <td className="p-3 text-right font-mono font-bold text-white">
                      {i.current_stock_qty} {i.unit}
                    </td>
                    <td className="p-3 text-right font-mono text-zinc-500">
                      {i.minimum_reorder_qty} {i.unit}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-400 font-bold">
                      {formatInr(Number(i.current_stock_qty * i.unit_rate_inr))}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        i.stock_health === "ADEQUATE"
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                          : "bg-amber-950 text-amber-400 border-amber-800"
                      }`}>
                        {i.stock_health.replace(/_/g, " ")}
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
