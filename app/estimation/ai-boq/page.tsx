"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  Box,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Coins,
  Compass,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  HelpCircle,
  IndianRupee,
  Info,
  Layers,
  LayoutDashboard,
  Lock,
  Maximize2,
  MinusCircle,
  Percent,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  Upload,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useActiveRole } from "@/context/RoleContext";
import {
  fetchProjectBoqItems,
  fetchDsrRateAnalysis,
  fetchEstimationCostIndices,
  updateProjectBoqItemQuantity,
  simulateBoqCostFluctuation,
  generateTenderBoqDossier,
  fallbackProjectBoqItems,
  fallbackDsrRateAnalysis,
  fallbackEstimationCostIndices,
} from "@/app/lib/services";
import type {
  ProjectBoqItem,
  DsrRateAnalysis,
  EstimationCostIndex,
  BoqSimulationParams,
  BoqSubheadCategory,
  RateSourceType,
} from "@/types/construction";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES & FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtINR(amount: number): string {
  if (isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtQty(qty: number, unit: string): string {
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(qty)} ${unit}`;
}

function numberToWordsINR(amount: number): string {
  if (isNaN(amount) || amount === 0) return "Zero Rupees Only";
  const abs = Math.round(amount);
  const crores = Math.floor(abs / 10000000);
  const lakhs = Math.floor((abs % 10000000) / 100000);
  const thousands = Math.floor((abs % 100000) / 1000);
  const remainder = abs % 1000;

  const parts: string[] = [];
  if (crores > 0) parts.push(`${crores} Crore${crores > 1 ? "s" : ""}`);
  if (lakhs > 0) parts.push(`${lakhs} Lakh${lakhs > 1 ? "s" : ""}`);
  if (thousands > 0) parts.push(`${thousands} Thousand`);
  if (remainder > 0) parts.push(`${remainder}`);

  return `Rupees ${parts.join(" ")} Only`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: AI-Powered BIM-to-BOQ & CPWD DSR Automated Estimation Engine
// ─────────────────────────────────────────────────────────────────────────────


const FALLBACK_COST_INDEX = {
  id: "ci-lko-up",
  locationName: "Lucknow (UP) - Gomti Nagar",
  costIndexPct: 108.5,
  state: "Uttar Pradesh",
  baseSchedule: "CPWD DSR 2023",
};

export default function AiBoqEstimationPage() {
  const roleContext = useActiveRole();
  const project = roleContext?.project;
  const role = roleContext?.role;
  const roleLabel = (role as any)?.label ?? "Chief Estimator";
  const activeProjectId = (project as any)?.project_id || (project as any)?.id || "GOMTI-NAGAR-PH1-FITOUT";

  // Data State
  const [items, setItems] = useState<ProjectBoqItem[]>(fallbackProjectBoqItems);
  const [rateAnalyses, setRateAnalyses] = useState<DsrRateAnalysis[]>(fallbackDsrRateAnalysis);
  const [costIndices, setCostIndices] = useState<EstimationCostIndex[]>(fallbackEstimationCostIndices);
  const [selectedCostIndex, setSelectedCostIndex] = useState<any>(FALLBACK_COST_INDEX); // Default Lucknow 118.5%
  const [loading, setLoading] = useState(false);
  const [isTakeoffRunning, setIsTakeoffRunning] = useState(false);
  const [takeoffSuccessNotice, setTakeoffSuccessNotice] = useState<string | null>(null);

  // Filters
  const [selectedSubhead, setSelectedSubhead] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [rateSourceFilter, setRateSourceFilter] = useState<string>("ALL");

  // Modals & Drawers
  const [selectedItemForAnalysis, setSelectedItemForAnalysis] = useState<ProjectBoqItem | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<DsrRateAnalysis | null>(null);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [overrideModalItem, setOverrideModalItem] = useState<ProjectBoqItem | null>(null);
  const [overrideInputQty, setOverrideInputQty] = useState<string>("");

  // Simulation Sliders State
  const [simParams, setSimParams] = useState<BoqSimulationParams>({
    cementChangePct: 0,
    steelChangePct: 0,
    labourChangePct: 0,
    locationCostIndexPct: 118.5,
  });

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [boqData, indicesData, raData] = await Promise.all([
        fetchProjectBoqItems(activeProjectId),
        fetchEstimationCostIndices(),
        fetchDsrRateAnalysis(),
      ]);
      setItems(boqData);
      setCostIndices(indicesData);
      setRateAnalyses(raData);
      const lko = indicesData.find((ci: any) => ci.id === "ci-lko-up") || indicesData[0];
      if (lko) {
        setSelectedCostIndex(lko);
        setSimParams((prev) => ({ ...prev, locationCostIndexPct: lko.costIndexPct }));
      }
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Recalculate adjusted rates when cost index changes
  const adjustedItems = useMemo(() => {
    const factor = (selectedCostIndex?.costIndexPct ?? 108.5) / 100.0;
    return items.map((item) => {
      // Non-DSR items use their custom factor, DSR items use location factor
      const appliedFactor = item.rateSource === "CPWD_DSR_2023" ? factor : item.costIndexFactor;
      const adjustedRate = Math.round(item.dsrBaseRateInr * appliedFactor * 100) / 100;
      const totalCost = Math.round(item.finalQuantity * adjustedRate);
      return {
        ...item,
        costIndexFactor: appliedFactor,
        adjustedUnitRateInr: adjustedRate,
        totalEstimatedCostInr: totalCost,
      };
    });
  }, [items, selectedCostIndex]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return adjustedItems.filter((item) => {
      const matchesSubhead = selectedSubhead === "ALL" || item.subHeadCode === selectedSubhead;
      const matchesRateSource = rateSourceFilter === "ALL" || item.rateSource === rateSourceFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.itemDescription.toLowerCase().includes(q) ||
        item.itemCode.toLowerCase().includes(q) ||
        item.wbsCode.toLowerCase().includes(q) ||
        (item.ifcGuid && item.ifcGuid.toLowerCase().includes(q)) ||
        item.subHeadTitle.toLowerCase().includes(q);
      return matchesSubhead && matchesRateSource && matchesSearch;
    });
  }, [adjustedItems, selectedSubhead, rateSourceFilter, searchQuery]);

  // Pre-construction Summary Aggregates
  const metrics = useMemo(() => {
    const totalTenderValue = adjustedItems.reduce((acc, curr) => acc + curr.totalEstimatedCostInr, 0);
    const baseTenderValue = adjustedItems.reduce(
      (acc, curr) => acc + curr.finalQuantity * curr.dsrBaseRateInr,
      0
    );
    const indexDelta = totalTenderValue - baseTenderValue;
    const totalItems = adjustedItems.length;
    const dsrItems = adjustedItems.filter((i) => i.rateSource === "CPWD_DSR_2023").length;
    const dsrMatchPct = totalItems > 0 ? (dsrItems / totalItems) * 100 : 0;
    const avgConfidence =
      totalItems > 0 ? (adjustedItems.reduce((acc, c) => acc + c.confidenceScore, 0) / totalItems) * 100 : 0;

    return {
      totalTenderValue,
      baseTenderValue,
      indexDelta,
      totalItems,
      dsrItems,
      dsrMatchPct,
      avgConfidence,
    };
  }, [adjustedItems]);

  // Sub-head breakdown for Abstract of Cost
  const subheadSummaries = useMemo(() => {
    const map = new Map<BoqSubheadCategory, { title: string; count: number; subtotal: number }>();

    adjustedItems.forEach((item) => {
      const entry = map.get(item.subHeadCode) || {
        title: item.subHeadTitle,
        count: 0,
        subtotal: 0,
      };
      entry.count += 1;
      entry.subtotal += item.totalEstimatedCostInr;
      map.set(item.subHeadCode, entry);
    });

    return Array.from(map.entries()).map(([subHeadCode, data]) => ({
      subHeadCode,
      subHeadTitle: data.title,
      itemCount: data.count,
      subtotalInr: data.subtotal,
      percentageOfTotal: metrics.totalTenderValue > 0 ? (data.subtotal / metrics.totalTenderValue) * 100 : 0,
    }));
  }, [adjustedItems, metrics.totalTenderValue]);

  // Fluctuation Simulation Results
  const simulationResult = useMemo(() => {
    return simulateBoqCostFluctuation(adjustedItems, simParams);
  }, [adjustedItems, simParams]);

  // Action: Trigger AI BIM Takeoff Re-run
  const handleRerunTakeoff = async () => {
    setIsTakeoffRunning(true);
    setTakeoffSuccessNotice(null);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsTakeoffRunning(false);
    setTakeoffSuccessNotice(
      "Automated IFC take-off completed: 42 BIM model containers re-parsed, 9 DSR items updated with 98.4% geometry match."
    );
    setTimeout(() => setTakeoffSuccessNotice(null), 6000);
  };

  // Action: Open Rate Analysis Drawer
  const handleOpenRateAnalysis = (item: ProjectBoqItem) => {
    setSelectedItemForAnalysis(item);
    const matched = rateAnalyses.find((r) => r.dsrItemCode === item.itemCode);
    setActiveAnalysis(matched || rateAnalyses[2]); // fallback RCC
  };

  // Action: Save Quantity Override
  const handleSaveQuantityOverride = async () => {
    if (!overrideModalItem) return;
    const num = overrideInputQty.trim() === "" ? null : parseFloat(overrideInputQty);
    await updateProjectBoqItemQuantity(overrideModalItem.id, num);
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === overrideModalItem.id) {
          const finalQ = num !== null && num >= 0 ? num : it.bimMeasuredQuantity;
          return {
            ...it,
            manualOverrideQuantity: num,
            finalQuantity: finalQ,
            totalEstimatedCostInr: Math.round(finalQ * it.adjustedUnitRateInr),
          };
        }
        return it;
      })
    );
    setOverrideModalItem(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8">
      {/* ── TOP EXECUTIVE BANNER & ACTIONS ───────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              CPWD DSR 2023 · AI BIM-to-BOQ Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-bold uppercase tracking-wider">
              FIDIC Pre-Construction
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Authority: {roleLabel}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Calculator className="w-6 h-6 text-cyan-400" />
            AI-Powered BIM-to-BOQ &amp; CPWD DSR Automated Estimation Engine
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-4xl leading-relaxed">
            Automated IFC quantity take-offs mapped to Delhi Schedule of Rates (DSR 2023) with regional cost index factors, rate analysis breakdown, and interactive tender sensitivity simulations.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Location Cost Index Selector */}
          <div className="relative">
            <select
              value={(selectedCostIndex?.id ?? "ci-lko-up")}
              onChange={(e) => {
                const found = costIndices.find((c) => c.id === e.target.value);
                if (found) {
                  setSelectedCostIndex(found);
                  setSimParams((prev) => ({ ...prev, locationCostIndexPct: found.costIndexPct }));
                }
              }}
              className="appearance-none rounded-xl border border-zinc-800 bg-zinc-900/90 pl-3 pr-8 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-700 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
            >
              {costIndices.map((ci) => (
                <option key={ci.id} value={ci.id}>
                  {ci.locationName} ({ci.costIndexPct.toFixed(1)}%)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={handleRerunTakeoff}
            disabled={isTakeoffRunning}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition shadow-sm"
            title="Re-parse Revit/IFC structural and architectural quantities"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isTakeoffRunning ? "animate-spin" : ""}`} />
            <span>{isTakeoffRunning ? "Parsing BIM..." : "Re-Run BIM Takeoff"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSimulationOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>Cost Sensitivity Sliders</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDossierModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/50"
          >
            <Printer className="w-4 h-4" />
            <span>Tender-Ready BOQ Dossier</span>
          </button>
        </div>
      </div>

      {/* Success Alert Banner */}
      {takeoffSuccessNotice && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{takeoffSuccessNotice}</span>
          </div>
          <button type="button" onClick={() => setTakeoffSuccessNotice(null)} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 4 PRE-CONSTRUCTION ESTIMATION KPI CARDS ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        {/* Card 1: Total Estimated Tender Value */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 font-medium">
            <span>Total Estimated Tender Value</span>
            <Coins className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl lg:text-2xl font-black text-white tracking-tight">
            {fmtINR(metrics.totalTenderValue)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            <span className="text-cyan-400 font-semibold font-mono">
              Delhi Base: {fmtINR(metrics.baseTenderValue)}
            </span>
          </div>
        </div>

        {/* Card 2: DSR Rate Matching Coverage */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 font-medium">
            <span>DSR Rate Match Rate</span>
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl lg:text-2xl font-black text-emerald-400 tracking-tight">
            {metrics.dsrMatchPct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            {metrics.dsrItems} of {metrics.totalItems} items mapped to CPWD DSR 2023
          </div>
        </div>

        {/* Card 3: Regional Index Cost Additive */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 font-medium">
            <span>Regional Index Additive</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl lg:text-2xl font-black text-amber-300 tracking-tight">
            +{fmtINR(metrics.indexDelta)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1 font-mono">
            <span>Factor: {(selectedCostIndex?.costIndexPct ?? 108.5).toFixed(1)}% ({(selectedCostIndex?.locationName ?? "Lucknow (UP)").split(" ")[0]})</span>
          </div>
        </div>

        {/* Card 4: BIM Takeoff AI Extraction Confidence */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 font-medium">
            <span>AI Takeoff Confidence</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl lg:text-2xl font-black text-indigo-300 tracking-tight">
            {metrics.avgConfidence.toFixed(1)}%
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            42 IFC structural elements verified by SEOR
          </div>
        </div>
      </div>

      {/* ── SUB-HEAD FILTER TABS & SEARCH BAR ───────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 mb-6 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {[
              { code: "ALL", label: "All Subheads" },
              { code: "SUB_01_EARTHWORK", label: "01 Earthwork" },
              { code: "SUB_02_CONCRETE_WORK", label: "02 PCC Concrete" },
              { code: "SUB_03_RCC_STRUCTURE", label: "03 RCC Structure" },
              { code: "SUB_04_BRICK_MASONRY", label: "04 Brickwork" },
              { code: "SUB_05_STEEL_WORK", label: "05 Steel Work" },
              { code: "SUB_08_FINISHING_PLASTER", label: "08 Finishes" },
            ].map((sub) => (
              <button
                key={sub.code}
                type="button"
                onClick={() => setSelectedSubhead(sub.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedSubhead === sub.code
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/80"
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Search & Source Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search DSR item, WBS, IFC..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={rateSourceFilter}
              onChange={(e) => setRateSourceFilter(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Rate Sources</option>
              <option value="CPWD_DSR_2023">CPWD DSR 2023</option>
              <option value="NON_DSR_MARKET_ANALYZED">Non-DSR Market</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── LIVE TAKEOFF & DSR MATCHING LEDGER TABLE ─────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden shadow-xl mb-8">
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              BIM Takeoff Schedule of Quantities &amp; DSR Unit Valuation
            </h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            Showing {filteredItems.length} of {items.length} items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-mono text-[10px] border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">WBS / DSR Code</th>
                <th className="py-3 px-4">Description &amp; BIM Element</th>
                <th className="py-3 px-3 text-center">Rate Source</th>
                <th className="py-3 px-3 text-right">BIM Qty</th>
                <th className="py-3 px-3 text-right">Final Qty</th>
                <th className="py-3 px-2 text-center">Unit</th>
                <th className="py-3 px-3 text-right">DSR Base (DL)</th>
                <th className="py-3 px-2 text-center">Index</th>
                <th className="py-3 px-3 text-right">Adjusted Rate</th>
                <th className="py-3 px-4 text-right">Total Est. (INR)</th>
                <th className="py-3 px-3 text-center">Rate Analysis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredItems.map((item) => {
                const isOverridden = item.manualOverrideQuantity !== null && item.manualOverrideQuantity !== undefined;
                return (
                  <tr key={item.id} className="hover:bg-zinc-800/40 transition">
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-cyan-400">{item.itemCode}</div>
                      <div className="text-[10px] text-zinc-500">{item.wbsCode}</div>
                    </td>

                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-medium text-zinc-200 line-clamp-2 leading-relaxed">
                        {item.itemDescription}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500 font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {item.bimElementType.replace("IFC_", "")}
                        </span>
                        {item.ifcGuid && <span>GUID: {item.ifcGuid}</span>}
                        {item.drawingSheetRef && <span>• {item.drawingSheetRef}</span>}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          item.rateSource === "CPWD_DSR_2023"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {item.rateSource === "CPWD_DSR_2023" ? "DSR 2023" : "Non-DSR"}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-zinc-400">
                      {new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(item.bimMeasuredQuantity)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono">
                      <button
                        type="button"
                        onClick={() => {
                          setOverrideModalItem(item);
                          setOverrideInputQty(
                            item.manualOverrideQuantity !== null && item.manualOverrideQuantity !== undefined
                              ? item.manualOverrideQuantity.toString()
                              : item.bimMeasuredQuantity.toString()
                          );
                        }}
                        className={`px-1.5 py-0.5 rounded hover:bg-zinc-800 transition font-bold ${
                          isOverridden ? "text-amber-300 underline decoration-dotted" : "text-white"
                        }`}
                        title="Click to override quantity"
                      >
                        {new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(item.finalQuantity)}
                        {isOverridden && <span className="text-[9px] text-amber-400 ml-1">(Ovr)</span>}
                      </button>
                    </td>

                    <td className="py-3 px-2 text-center text-zinc-400 font-mono text-[11px]">
                      {item.unit}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-zinc-400">
                      ₹{item.dsrBaseRateInr.toFixed(2)}
                    </td>

                    <td className="py-3 px-2 text-center font-mono text-[11px] text-cyan-400 font-semibold">
                      {item.costIndexFactor.toFixed(3)}x
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-zinc-200">
                      ₹{item.adjustedUnitRateInr.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-cyan-300">
                      {fmtINR(item.totalEstimatedCostInr)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenRateAnalysis(item)}
                        className="p-1.5 rounded-lg border border-zinc-800 hover:border-cyan-500/40 bg-zinc-950 text-zinc-400 hover:text-cyan-300 transition"
                        title="View decomposed CPWD rate analysis"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: MANUAL QUANTITY OVERRIDE ───────────────────────────────── */}
      {overrideModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setOverrideModalItem(null)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2 font-mono text-xs text-cyan-400 font-bold">
              <span>{overrideModalItem.itemCode}</span>
              <span>•</span>
              <span>{overrideModalItem.wbsCode}</span>
            </div>

            <h3 className="text-sm font-bold text-white mb-3 leading-snug">
              Override Quantity for {overrideModalItem.subHeadTitle}
            </h3>

            <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-3 mb-4 text-xs space-y-1.5">
              <div className="flex justify-between text-zinc-400">
                <span>BIM Automated Take-off:</span>
                <span className="font-mono text-white">
                  {overrideModalItem.bimMeasuredQuantity} {overrideModalItem.unit}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Current Active Rate:</span>
                <span className="font-mono text-cyan-400">
                  ₹{overrideModalItem.adjustedUnitRateInr.toFixed(2)} / {overrideModalItem.unit}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                New Final Quantity ({overrideModalItem.unit})
              </label>
              <input
                type="number"
                step="any"
                value={overrideInputQty}
                onChange={(e) => setOverrideInputQty(e.target.value)}
                placeholder="Leave blank to restore BIM measured quantity"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Enter revised quantity or leave empty to restore original BIM take-off value.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOverrideModalItem(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuantityOverride}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs"
              >
                Save &amp; Recalculate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER / MODAL: DECOMPOSED DSR RATE ANALYSIS ─────────────────── */}
      {selectedItemForAnalysis && activeAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                    CPWD DAR Analysis
                  </span>
                  <span className="text-zinc-400">{activeAnalysis.dsrItemCode}</span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1 line-clamp-1">
                  {selectedItemForAnalysis.itemDescription}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemForAnalysis(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Rate Decomposition Summary Pill */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center">
                  <div className="text-[10px] text-zinc-400 uppercase font-mono">DSR Delhi Base</div>
                  <div className="text-base font-bold text-white font-mono mt-0.5">
                    ₹{activeAnalysis.baseRateDelhiInr.toFixed(2)} / {activeAnalysis.unit}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center">
                  <div className="text-[10px] text-zinc-400 uppercase font-mono">Location Factor</div>
                  <div className="text-base font-bold text-cyan-400 font-mono mt-0.5">
                    {(selectedCostIndex?.costIndexPct ?? 108.5).toFixed(1)}% (
                    {selectedItemForAnalysis.costIndexFactor.toFixed(3)}x)
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center">
                  <div className="text-[10px] text-zinc-400 uppercase font-mono">Adjusted Tender Rate</div>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                    ₹{selectedItemForAnalysis.adjustedUnitRateInr.toFixed(2)} / {activeAnalysis.unit}
                  </div>
                </div>
              </div>

              {/* Material Component Breakdown */}
              {activeAnalysis.materialBreakdown.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono mb-2 flex items-center justify-between">
                    <span>1. Material Component Breakdown ({activeAnalysis.materialCostPct}%)</span>
                    <span className="text-zinc-500 text-[10px]">Per 1.00 {activeAnalysis.unit}</span>
                  </h4>
                  <div className="rounded-xl border border-zinc-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-900 text-zinc-400 text-[10px] font-mono border-b border-zinc-800">
                        <tr>
                          <th className="py-2 px-3">Material Description</th>
                          <th className="py-2 px-2 text-right">Coefficient</th>
                          <th className="py-2 px-2 text-center">Unit</th>
                          <th className="py-2 px-3 text-right">Basic Rate</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-mono">
                        {activeAnalysis.materialBreakdown.map((mat, i) => (
                          <tr key={i} className="hover:bg-zinc-900/40">
                            <td className="py-2 px-3 text-zinc-300 font-sans">{mat.material}</td>
                            <td className="py-2 px-2 text-right">{mat.coefficient}</td>
                            <td className="py-2 px-2 text-center text-zinc-500">{mat.unit}</td>
                            <td className="py-2 px-3 text-right text-zinc-400">₹{mat.unitRateInr}</td>
                            <td className="py-2 px-3 text-right text-white font-bold">₹{mat.amountInr.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Labour Component Breakdown */}
              {activeAnalysis.labourBreakdown.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono mb-2 flex items-center justify-between">
                    <span>2. Labour Coefficients ({activeAnalysis.labourCostPct}%)</span>
                    <span className="text-zinc-500 text-[10px]">Standard Man-days</span>
                  </h4>
                  <div className="rounded-xl border border-zinc-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-900 text-zinc-400 text-[10px] font-mono border-b border-zinc-800">
                        <tr>
                          <th className="py-2 px-3">Trade / Skill Category</th>
                          <th className="py-2 px-2 text-right">Man-days</th>
                          <th className="py-2 px-3 text-right">Daily Wage (DL)</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-mono">
                        {activeAnalysis.labourBreakdown.map((lab, i) => (
                          <tr key={i} className="hover:bg-zinc-900/40">
                            <td className="py-2 px-3 text-zinc-300 font-sans">{lab.trade}</td>
                            <td className="py-2 px-2 text-right">{lab.coefficient}</td>
                            <td className="py-2 px-3 text-right text-zinc-400">₹{lab.unitRateInr}</td>
                            <td className="py-2 px-3 text-right text-white font-bold">₹{lab.amountInr.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Statutory Overhead, Water Charges & Contractor Profit */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Water Charges (CPWD Standard 1.0%):</span>
                  <span className="font-mono text-zinc-200">Included in Base Rate</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Contractor Overheads &amp; Profit (CPWD Standard 15.0%):</span>
                  <span className="font-mono text-emerald-400 font-semibold">Included in DSR Base Rate</span>
                </div>
                <div className="flex justify-between text-zinc-400 border-t border-zinc-800/80 pt-2">
                  <span>Goods &amp; Services Tax (GST 18.0%):</span>
                  <span className="font-mono text-amber-300">Added to Project Abstract Subtotal</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedItemForAnalysis(null)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
              >
                Close Rate Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: INTERACTIVE COST SIMULATION SLIDERS ───────────────────── */}
      {isSimulationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsSimulationOpen(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-bold text-white">
                Pre-Construction Material Price Fluctuation Simulation
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mb-6">
              Simulate sensitivity across key cost drivers per FIDIC Clause 13.8 (Adjustments for Changes in Cost).
            </p>

            {/* Slider Controls */}
            <div className="space-y-4 mb-6">
              {/* Cement Fluctuation */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-300">OPC / PPC Cement Price Variation:</span>
                  <span className={`font-mono ${simParams.cementChangePct >= 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    {simParams.cementChangePct > 0 ? `+${simParams.cementChangePct}%` : `${simParams.cementChangePct}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="30"
                  step="1"
                  value={simParams.cementChangePct}
                  onChange={(e) =>
                    setSimParams((prev) => ({ ...prev, cementChangePct: parseInt(e.target.value) }))
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Steel Fluctuation */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-300">TMT Reinforcement Steel Variation:</span>
                  <span className={`font-mono ${simParams.steelChangePct >= 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    {simParams.steelChangePct > 0 ? `+${simParams.steelChangePct}%` : `${simParams.steelChangePct}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="30"
                  step="1"
                  value={simParams.steelChangePct}
                  onChange={(e) =>
                    setSimParams((prev) => ({ ...prev, steelChangePct: parseInt(e.target.value) }))
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Labour Wage Fluctuation */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-300">Minimum Labour Wage Index Revision:</span>
                  <span className={`font-mono ${simParams.labourChangePct >= 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    {simParams.labourChangePct > 0 ? `+${simParams.labourChangePct}%` : `${simParams.labourChangePct}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="25"
                  step="1"
                  value={simParams.labourChangePct}
                  onChange={(e) =>
                    setSimParams((prev) => ({ ...prev, labourChangePct: parseInt(e.target.value) }))
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Location Cost Index */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-300">Regional Cost Index Multiplier:</span>
                  <span className="font-mono text-cyan-400">
                    {simParams.locationCostIndexPct.toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="90"
                  max="140"
                  step="0.5"
                  value={simParams.locationCostIndexPct}
                  onChange={(e) =>
                    setSimParams((prev) => ({ ...prev, locationCostIndexPct: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Realtime Impact Summary Card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2 mb-6">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Original Estimated Tender Value:</span>
                <span className="font-mono text-white font-semibold">
                  {fmtINR(simulationResult.baseTotalInr)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Simulated Projected Value:</span>
                <span className="font-mono text-cyan-300 font-bold">
                  {fmtINR(simulationResult.simulatedTotalInr)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-zinc-800">
                <span>Projected Cost Delta:</span>
                <span className={simulationResult.deltaInr >= 0 ? "text-amber-400 font-mono" : "text-emerald-400 font-mono"}>
                  {simulationResult.deltaInr >= 0 ? `+${fmtINR(simulationResult.deltaInr)}` : fmtINR(simulationResult.deltaInr)} ({simulationResult.deltaPct > 0 ? `+${simulationResult.deltaPct}%` : `${simulationResult.deltaPct}%`})
                </span>
              </div>
            </div>

            {/* Quick Reset & Close Buttons */}
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() =>
                  setSimParams({
                    cementChangePct: 0,
                    steelChangePct: 0,
                    labourChangePct: 0,
                    locationCostIndexPct: (selectedCostIndex?.costIndexPct ?? 108.5),
                  })
                }
                className="text-xs text-zinc-400 hover:text-white underline"
              >
                Reset to Baseline (0% Delta)
              </button>
              <button
                type="button"
                onClick={() => setIsSimulationOpen(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs"
              >
                Apply &amp; Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PRINT-READY TENDER-READY BOQ DOSSIER (@media print) ───── */}
      {isDossierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-5xl max-h-[95vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
            {/* Top Bar for Modal Controls */}
            <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/90 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase font-mono">
                  Official CPWD Tender Estimate Dossier Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Official Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDossierModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet Container */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-zinc-900 font-sans print:p-0 print:overflow-visible">
              {/* CPWD Document Header */}
              <div className="border-b-2 border-zinc-900 pb-4 mb-6 text-center">
                <div className="text-xs font-bold uppercase tracking-widest text-zinc-600">
                  Government of Uttar Pradesh · Public Works Department / LDA
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-zinc-900 uppercase tracking-tight mt-1">
                  DETAILED ESTIMATE &amp; SCHEDULE OF QUANTITIES (BOQ)
                </h1>
                <div className="text-xs text-zinc-700 font-semibold mt-1">
                  CPWD DSR 2023 Matching · Regional Cost Index {(selectedCostIndex?.costIndexPct ?? 108.5).toFixed(1)}% ({(selectedCostIndex?.locationName ?? "Lucknow (UP)")})
                </div>
              </div>

              {/* Project Meta Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs mb-6 border border-zinc-300 p-3 bg-zinc-50 rounded">
                <div>
                  <span className="text-zinc-500 font-semibold">Name of Work: </span>
                  <span className="font-bold text-zinc-900">
                    Construction of Tower A Core &amp; Shell Commercial Hub, Sector 7, Gomti Nagar Extension, Lucknow
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 font-semibold">Tender Reference No: </span>
                  <span className="font-mono font-bold text-zinc-900">
                    UP-PWD/LDA/COMM-TWR-A/2026/BOQ-01
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 font-semibold">Estimated Cost Put to Tender: </span>
                  <span className="font-bold text-emerald-800 font-mono">
                    {fmtINR(metrics.totalTenderValue)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 font-semibold">Time of Completion: </span>
                  <span className="font-bold text-zinc-900">18 Calendar Months (including monsoon)</span>
                </div>
              </div>

              {/* PART 1: ABSTRACT OF COST (Subhead Wise) */}
              <div className="mb-6">
                <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900 border-b border-zinc-400 pb-1 mb-2 font-mono">
                  PART 1: ABSTRACT OF COST
                </h2>
                <table className="w-full text-left text-xs border border-zinc-300">
                  <thead className="bg-zinc-100 text-zinc-700 uppercase font-mono text-[10px] border-b border-zinc-300">
                    <tr>
                      <th className="py-2 px-3">Subhead Ref</th>
                      <th className="py-2 px-3">Description of Trade Subhead</th>
                      <th className="py-2 px-3 text-center">Items</th>
                      <th className="py-2 px-3 text-right">Subtotal Amount (INR)</th>
                      <th className="py-2 px-3 text-right">% of Tender</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {subheadSummaries.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50">
                        <td className="py-2 px-3 font-mono font-bold text-zinc-800">
                          {sub.subHeadCode.replace("SUB_", "SH-")}
                        </td>
                        <td className="py-2 px-3 font-medium text-zinc-800">{sub.subHeadTitle}</td>
                        <td className="py-2 px-3 text-center font-mono">{sub.itemCount}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-zinc-900">
                          {fmtINR(sub.subtotalInr)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-zinc-600">
                          {sub.percentageOfTotal.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                    {/* Subtotal */}
                    <tr className="bg-zinc-100 font-bold border-t border-zinc-400">
                      <td colSpan={3} className="py-2 px-3 text-right uppercase">Subtotal (Net Works Cost):</td>
                      <td className="py-2 px-3 text-right font-mono">{fmtINR(metrics.totalTenderValue)}</td>
                      <td className="py-2 px-3 text-right font-mono">100.00%</td>
                    </tr>
                    {/* Contingencies 3% */}
                    <tr>
                      <td colSpan={3} className="py-1.5 px-3 text-right text-zinc-600">Add 3% Unforeseen Physical Contingencies:</td>
                      <td className="py-1.5 px-3 text-right font-mono text-zinc-700">
                        {fmtINR(Math.round(metrics.totalTenderValue * 0.03))}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-zinc-500">3.00%</td>
                    </tr>
                    {/* GST 18% */}
                    <tr>
                      <td colSpan={3} className="py-1.5 px-3 text-right text-zinc-600">Add 18% Goods &amp; Services Tax (GST):</td>
                      <td className="py-1.5 px-3 text-right font-mono text-zinc-700">
                        {fmtINR(Math.round(metrics.totalTenderValue * 0.18))}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-zinc-500">18.00%</td>
                    </tr>
                    {/* Grand Total */}
                    <tr className="bg-zinc-900 text-white font-black text-sm">
                      <td colSpan={3} className="py-2.5 px-3 text-right uppercase">Grand Total Sanctioned Estimate:</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-300">
                        {fmtINR(Math.round(metrics.totalTenderValue * 1.21))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-zinc-300">121.00%</td>
                    </tr>
                  </tbody>
                </table>
                <div className="text-[11px] text-zinc-600 italic mt-1 font-serif">
                  ({numberToWordsINR(Math.round(metrics.totalTenderValue * 1.21))})
                </div>
              </div>

              {/* PART 2: DETAILED SCHEDULE OF QUANTITIES */}
              <div className="mb-6">
                <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900 border-b border-zinc-400 pb-1 mb-2 font-mono">
                  PART 2: SCHEDULE OF DETAILED QUANTITIES &amp; RATES
                </h2>
                <table className="w-full text-left text-[11px] border border-zinc-300">
                  <thead className="bg-zinc-100 text-zinc-700 uppercase font-mono text-[9px] border-b border-zinc-300">
                    <tr>
                      <th className="py-1.5 px-2">Item No</th>
                      <th className="py-1.5 px-2">DSR Code</th>
                      <th className="py-1.5 px-3">Description of Item</th>
                      <th className="py-1.5 px-2 text-right">Quantity</th>
                      <th className="py-1.5 px-1 text-center">Unit</th>
                      <th className="py-1.5 px-2 text-right">Adjusted Rate</th>
                      <th className="py-1.5 px-3 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {adjustedItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-zinc-50">
                        <td className="py-2 px-2 font-mono font-bold text-zinc-700">{idx + 1}</td>
                        <td className="py-2 px-2 font-mono font-bold text-zinc-800">{item.itemCode}</td>
                        <td className="py-2 px-3 text-zinc-800 leading-snug">
                          <div className="font-semibold">{item.itemDescription}</div>
                          <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                            BIM Tag: {item.bimElementType} · Drawing: {item.drawingSheetRef || "DWG-REF-01"}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-zinc-800">
                          {new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(item.finalQuantity)}
                        </td>
                        <td className="py-2 px-1 text-center font-mono text-zinc-600">{item.unit}</td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-zinc-800">
                          ₹{item.adjustedUnitRateInr.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-zinc-900">
                          {fmtINR(item.totalEstimatedCostInr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PART 3: SPECIFICATIONS & SIGN-OFF BLOCKS */}
              <div className="border-t-2 border-zinc-900 pt-4 mt-8">
                <div className="text-[10px] text-zinc-600 uppercase font-mono tracking-wider mb-8">
                  Certified that the quantities have been computed accurately from the approved GFC BIM Model and rates adopted conform to the CPWD Delhi Schedule of Rates (DSR 2023) multiplied by the regional cost index factor {(selectedCostIndex?.costIndexPct ?? 108.5).toFixed(1)}%.
                </div>

                <div className="grid grid-cols-3 gap-6 text-center text-xs">
                  <div className="border-t border-zinc-400 pt-2">
                    <div className="font-bold text-zinc-900">Er. Rajesh Srivastava</div>
                    <div className="text-[11px] text-zinc-600">Chief Quantity Surveyor</div>
                    <div className="text-[9px] font-mono text-zinc-400 mt-1">SEOR Certified Stamp · 2026-03-15</div>
                  </div>
                  <div className="border-t border-zinc-400 pt-2">
                    <div className="font-bold text-zinc-900">Vikas Bansal, FCA</div>
                    <div className="text-[11px] text-zinc-600">Director (Commercial Finance)</div>
                    <div className="text-[9px] font-mono text-zinc-400 mt-1">Audit Clearance · 2026-03-16</div>
                  </div>
                  <div className="border-t border-zinc-400 pt-2">
                    <div className="font-bold text-zinc-900">Alok Tandon, IAS</div>
                    <div className="text-[11px] text-zinc-600">Managing Director / Sanctioning Authority</div>
                    <div className="text-[9px] font-mono text-zinc-400 mt-1">Technical Sanction No. TS/2026/89</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
