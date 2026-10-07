"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Boxes,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Download,
  Search,
  Filter,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Scale,
  DollarSign,
  Plus,
  FileText,
  FileCheck2,
  Package,
  Truck,
  ShieldCheck,
  ShieldAlert,
  ArrowUpDown,
  Calculator,
  X,
  Check,
  ExternalLink,
  ChevronRight,
  Layers,
  Archive,
  BarChart3,
  Calendar,
  Warehouse,
  FileSpreadsheet,
} from "lucide-react";
import {
  fetchStoreInventory,
  fetchGoodsReceivedSheets,
  fetchBinCardEntries,
  calculateMaterialIssueRate,
  createGoodsReceivedSheet,
  generateGrsDocketPdf,
  fallbackStoreInventory,
  fallbackGoodsReceivedSheets,
  fallbackBinCardEntries,
} from "@/app/lib/services";
import type {
  StoreInventoryItem,
  GoodsReceivedSheet,
  BinCardEntry,
  StoreMaterialCategory,
  InventoryStockStatus,
  GrsVerificationStatus,
  IssueRateBreakdown,
} from "@/types/construction";

export default function InventoryStorePage() {
  const [selectedProjectId] = useState<string>("GOMTI-NAGAR-PH1-FITOUT");
  const [inventory, setInventory] = useState<StoreInventoryItem[]>(fallbackStoreInventory);
  const [grsSheets, setGrsSheets] = useState<GoodsReceivedSheet[]>(fallbackGoodsReceivedSheets);
  const [binCards, setBinCards] = useState<BinCardEntry[]>(fallbackBinCardEntries);
  const [loading, setLoading] = useState<boolean>(true);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<"INVENTORY" | "GRS_LEDGER" | "BIN_CARD" | "ISSUE_CALC">("INVENTORY");

  // Filters & Search
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBinItemCode, setSelectedBinItemCode] = useState<string>("MAT-CEM-PPC");

  // Issue Rate Calculator Interactive State (CPWD Para 7.2.1)
  const [calcPurchaseRate, setCalcPurchaseRate] = useState<number>(385);
  const [calcFreightTotal, setCalcFreightTotal] = useState<number>(9000);
  const [calcQuantity, setCalcQuantity] = useState<number>(600);
  const [calcStoragePct, setCalcStoragePct] = useState<number>(2.5);

  // New GRS Modal State
  const [isNewGrsModalOpen, setIsNewGrsModalOpen] = useState<boolean>(false);
  const [isSubmittingGrs, setIsSubmittingGrs] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const [newGrsForm, setNewGrsForm] = useState({
    poReference: "PO-LKO-2026-460",
    challanNumber: "CHL-SPL-2026-881",
    supplierName: "UltraTech Cement Limited",
    supplierId: "VND-UT-CEM",
    vehicleNumber: "UP-32-BN-9102",
    carrierName: "Avadh Rapid Freight",
    itemCode: "MAT-CEM-PPC",
    itemDescription: "UltraTech PPC Cement 50kg Bags",
    unit: "Bags",
    challanQuantity: 400,
    receivedQuantity: 400,
    acceptedQuantity: 400,
    rejectedQuantity: 0,
    purchaseRateInr: 385,
    carriageFreightInr: 6000,
    incidentalStoragePct: 2.5,
    qualityConformity: true,
    remarks: "Received in dry condition. Bags intact and count tallied with delivery challan.",
  });

  // Printable Docket Modal State
  const [docketModalOpen, setDocketModalOpen] = useState<boolean>(false);
  const [selectedGrsForDocket, setSelectedGrsForDocket] = useState<GoodsReceivedSheet | null>(null);

  // Data Loading
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invData, grsData, binData] = await Promise.all([
        fetchStoreInventory(selectedProjectId),
        fetchGoodsReceivedSheets(selectedProjectId),
        fetchBinCardEntries(selectedProjectId),
      ]);
      setInventory(invData);
      setGrsSheets(grsData);
      setBinCards(binData);
    } catch (err) {
      console.error("Failed loading store inventory data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesCategory = categoryFilter === "ALL" || item.category === categoryFilter;
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.binLocation.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [inventory, categoryFilter, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalValuation = inventory.reduce((acc, item) => acc + item.valuationTotalInr, 0);
    const lowStockItems = inventory.filter(
      (i) => i.inventoryStatus === "LOW_STOCK" || i.inventoryStatus === "CRITICAL_REORDER"
    );
    const totalGrsValue = grsSheets.reduce((acc, g) => acc + g.totalGrsValueInr, 0);

    return {
      totalValuation,
      totalSkuCount: inventory.length,
      lowStockCount: lowStockItems.length,
      lowStockList: lowStockItems,
      totalGrsValue,
    };
  }, [inventory, grsSheets]);

  // Bin Card Filtered by Selected Item
  const activeBinCardEntries = useMemo(() => {
    return binCards.filter((b) => b.itemCode === selectedBinItemCode);
  }, [binCards, selectedBinItemCode]);

  const activeBinItem = useMemo(() => {
    return inventory.find((i) => i.itemCode === selectedBinItemCode) || inventory[0];
  }, [inventory, selectedBinItemCode]);

  // Live Issue Rate Calculator output
  const liveIssueRate = useMemo(() => {
    return calculateMaterialIssueRate(
      calcPurchaseRate,
      calcFreightTotal,
      calcQuantity || 1,
      calcStoragePct
    );
  }, [calcPurchaseRate, calcFreightTotal, calcQuantity, calcStoragePct]);

  // Handle Form Submission for New GRS
  const handleCreateGrs = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingGrs(true);
    try {
      const created = await createGoodsReceivedSheet({
        projectId: selectedProjectId,
        poReference: newGrsForm.poReference,
        challanNumber: newGrsForm.challanNumber,
        supplierName: newGrsForm.supplierName,
        supplierId: newGrsForm.supplierId,
        vehicleNumber: newGrsForm.vehicleNumber,
        carrierName: newGrsForm.carrierName,
        itemCode: newGrsForm.itemCode,
        itemDescription: newGrsForm.itemDescription,
        unit: newGrsForm.unit,
        challanQuantity: Number(newGrsForm.challanQuantity),
        receivedQuantity: Number(newGrsForm.receivedQuantity),
        acceptedQuantity: Number(newGrsForm.acceptedQuantity),
        rejectedQuantity: Number(newGrsForm.rejectedQuantity),
        purchaseRateInr: Number(newGrsForm.purchaseRateInr),
        carriageFreightInr: Number(newGrsForm.carriageFreightInr),
        incidentalStoragePct: Number(newGrsForm.incidentalStoragePct),
        qualityConformity: newGrsForm.qualityConformity,
        remarks: newGrsForm.remarks,
      });

      setActionSuccessMessage(
        `Goods Received Sheet ${created.grsNumber} logged successfully. Net accepted: ${created.acceptedQuantity} ${created.unit}. Issue Rate: ₹${created.calculatedIssueRateInr}/${created.unit}.`
      );
      setIsNewGrsModalOpen(false);
      await loadData();
      setTimeout(() => setActionSuccessMessage(null), 6000);
    } catch (err) {
      console.error("Error creating GRS:", err);
    } finally {
      setIsSubmittingGrs(false);
    }
  };

  // Open Printable Docket
  const handleOpenDocket = (grs: GoodsReceivedSheet) => {
    setSelectedGrsForDocket(grs);
    setDocketModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8 print:p-0 print:bg-white print:text-black">
      {/* ── 1. Executive Warehouse Command Spine ─────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800/80 pb-6 print:hidden">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-700/50 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              GOMTI-NAGAR-PH1-FITOUT
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-950/80 text-indigo-400 border border-indigo-700/50 flex items-center gap-1.5">
              <Warehouse className="w-3.5 h-3.5" />
              CPWD Works Accounts Code Ch. 7 (Stores)
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Form 8-A (GRS) & Form 8 (Bin Card)
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Boxes className="w-7 h-7 text-cyan-400" />
            Material Inventory, Store Accounting & GRS Ledger
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Central warehouse stock ledger enforcing CPWD statutory store accounting, physical count verification, automated issue rate calculation (purchase price + carriage + 2.5% incidental storage), and Form 8-A consignment dockets.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsNewGrsModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-cyan-900/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Log GRS (Form 8-A)
          </button>

          <button
            onClick={() => {
              if (grsSheets.length > 0) handleOpenDocket(grsSheets[0]);
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            Print Form 8-A Docket
          </button>

          <button
            onClick={loadData}
            title="Refresh Inventory Feed"
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 2. Pre-Issue Stock Health KPI Cards ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {/* Card 1: Total Store Valuation */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
            <span>Total Store Inventory Valuation</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            ₹{(metrics.totalValuation / 10000000).toFixed(3)} Cr
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
              CPWD Issue Rate Valuation
            </span>
            <span>Incl. 2.5% Storage</span>
          </div>
          <div className="absolute top-0 right-0 h-full w-1 bg-cyan-500/80" />
        </div>

        {/* Card 2: Active SKUs & Bins */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
            <span>Active SKUs & Bins Monitored</span>
            <Package className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {metrics.totalSkuCount} SKUs
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <span className="text-indigo-400 font-medium">8 Core Trades</span>
            <span>&bull; Allotted in Sheds A/B & Yards</span>
          </div>
          <div className="absolute top-0 right-0 h-full w-1 bg-indigo-500/80" />
        </div>

        {/* Card 3: Low Stock & Reorder Alarms */}
        <div
          className={`rounded-xl p-4 relative overflow-hidden backdrop-blur-sm border transition-all ${
            metrics.lowStockCount > 0
              ? "bg-slate-900/80 border-amber-600/70 shadow-lg shadow-amber-950/20"
              : "bg-slate-900/70 border-slate-800/80"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
            <span className={metrics.lowStockCount > 0 ? "text-amber-400 font-semibold" : ""}>
              Low Stock & Reorder Alarms
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${metrics.lowStockCount > 0 ? "text-amber-400 animate-pulse" : "text-slate-400"}`}
            />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight flex items-baseline gap-2">
            {metrics.lowStockCount} Items
            {metrics.lowStockCount > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/60">
                Action Required
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-2 truncate font-medium">
            {metrics.lowStockList.map((i) => i.itemCode.replace("MAT-", "")).join(", ") || "All stock optimal"}
          </div>
          <div
            className={`absolute top-0 right-0 h-full w-1 ${
              metrics.lowStockCount > 0 ? "bg-amber-500" : "bg-slate-700"
            }`}
          />
        </div>

        {/* Card 4: Monthly GRS Throughput */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
            <span>Monthly Inward Throughput</span>
            <Truck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            ₹{(metrics.totalGrsValue / 100000).toFixed(2)} Lakhs
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <span className="text-emerald-300 font-semibold">{grsSheets.length} Consignments</span>
            <span>&bull; 99.6% Acceptance Rate</span>
          </div>
          <div className="absolute top-0 right-0 h-full w-1 bg-emerald-500/80" />
        </div>
      </div>

      {/* ── 3. Critical Low-Stock Warning Banner ─────────────────────────── */}
      {metrics.lowStockCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-200">
                CPWD Safety Stock Threshold Breach ({metrics.lowStockCount} Materials Below Reorder Point)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                The current stock balances for{" "}
                {metrics.lowStockList.map((i) => `${i.itemName} (${i.currentStockBalance} ${i.unit})`).join(" and ")}{" "}
                have dropped below the mandatory minimum reserve for Tower A structural works.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setActionSuccessMessage("Automated purchase requisition indent draft generated and queued for Project Engineer sign-off.");
              setTimeout(() => setActionSuccessMessage(null), 5000);
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-lg shadow transition-all cursor-pointer shrink-0"
          >
            Trigger Urgent Purchase Indent
          </button>
        </div>
      )}

      {/* ── 4. Main Navigation Tabs ───────────────────────────────────────── */}
      <div className="border-b border-slate-800 flex items-center justify-between gap-4 overflow-x-auto print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("INVENTORY")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "INVENTORY"
                ? "border-cyan-400 text-cyan-300 bg-slate-900/80"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Boxes className="w-4 h-4" />
            Store Inventory Ledger ({inventory.length})
          </button>

          <button
            onClick={() => setActiveTab("GRS_LEDGER")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "GRS_LEDGER"
                ? "border-cyan-400 text-cyan-300 bg-slate-900/80"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Goods Received Sheets (Form 8-A) ({grsSheets.length})
          </button>

          <button
            onClick={() => setActiveTab("BIN_CARD")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "BIN_CARD"
                ? "border-cyan-400 text-cyan-300 bg-slate-900/80"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Archive className="w-4 h-4" />
            Bin Card Register (Form 8)
          </button>

          <button
            onClick={() => setActiveTab("ISSUE_CALC")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "ISSUE_CALC"
                ? "border-cyan-400 text-cyan-300 bg-slate-900/80"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Calculator className="w-4 h-4" />
            CPWD Issue Rate Calculator (Para 7.2.1)
          </button>
        </div>

        <div className="text-xs text-slate-400 hidden md:block">
          Warehouse In-Charge: <span className="text-slate-200 font-medium">Mohan Lal (Head Storekeeper)</span>
        </div>
      </div>

      {/* ── 5. TAB 1: Store Inventory Ledger ─────────────────────────────── */}
      {activeTab === "INVENTORY" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-400 font-medium mr-1">Category:</span>
              {["ALL", "CEMENT", "STEEL_REBAR", "AGGREGATES", "MASONRY", "CHEMICALS", "SHUTTERING"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                    categoryFilter === cat
                      ? "bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-medium"
                      : "bg-slate-800/80 text-slate-400 hover:text-white"
                  }`}
                >
                  {cat === "ALL" ? "All Categories" : cat.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search SKU or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Master Store Inventory Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="p-3 font-semibold w-12">S.No</th>
                    <th className="p-3 font-semibold">Material Code & Item Description</th>
                    <th className="p-3 font-semibold w-32">Bin Location</th>
                    <th className="p-3 font-semibold w-24">Unit</th>
                    <th className="p-3 text-right font-semibold w-32">Current Stock Balance</th>
                    <th className="p-3 text-right font-semibold w-28 text-slate-400">Min Threshold</th>
                    <th className="p-3 text-right font-semibold w-32 text-cyan-400">Issue Rate (₹)</th>
                    <th className="p-3 text-right font-semibold w-36 text-cyan-300">Total Valuation (₹)</th>
                    <th className="p-3 text-center font-semibold w-28">Status</th>
                    <th className="p-3 text-center font-semibold w-20">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredInventory.map((item, idx) => {
                    const isLow = item.inventoryStatus === "LOW_STOCK" || item.inventoryStatus === "CRITICAL_REORDER";
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-sans">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span className="font-mono text-cyan-400 text-xs">{item.itemCode}</span>
                            <span>{item.itemName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">{item.category}</span>
                            <span>Subhead: {item.subheadCode}</span>
                          </div>
                        </td>
                        <td className="p-3 font-sans text-slate-300">{item.binLocation}</td>
                        <td className="p-3 text-slate-300">{item.unit}</td>
                        <td className="p-3 text-right font-bold text-white text-sm">
                          {item.currentStockBalance.toLocaleString("en-IN", { maximumFractionDigits: 3 })}
                        </td>
                        <td className="p-3 text-right text-slate-400">
                          {item.minimumStockThreshold.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 text-right text-cyan-300 font-semibold">
                          ₹{item.standardIssueRateInr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right text-emerald-300 font-bold">
                          ₹{(item.valuationTotalInr / 100000).toFixed(2)}L
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.inventoryStatus === "OPTIMAL"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-700"
                                : item.inventoryStatus === "LOW_STOCK"
                                ? "bg-amber-950 text-amber-300 border border-amber-700"
                                : "bg-red-950 text-red-400 border border-red-700"
                            }`}
                          >
                            {item.inventoryStatus}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedBinItemCode(item.itemCode);
                              setActiveTab("BIN_CARD");
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors text-[11px] font-sans font-medium"
                            title="View Bin Card (Form 8)"
                          >
                            Bin Card
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Ledger Grand Totals */}
                <tfoot>
                  <tr className="bg-slate-950 border-t-2 border-slate-700 text-xs font-semibold">
                    <td colSpan={7} className="p-4 text-right text-slate-300 font-sans tracking-wide">
                      TOTAL STORE VALUATION (ACCORDING TO CPWD WORKS ACCOUNTS CODE PARA 7.2):
                    </td>
                    <td className="p-4 text-right font-mono text-emerald-400 text-sm font-bold">
                      ₹{metrics.totalValuation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2} className="p-4 text-slate-500 font-sans text-right">
                      {metrics.totalSkuCount} SKUs in Register
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. TAB 2: Goods Received Sheets (GRS Form 8-A) ──────────────── */}
      {activeTab === "GRS_LEDGER" && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-cyan-400" />
                CPWD Form 8-A Consignment Clearance Register
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every consignment entering the project site is recorded in Form 8-A, subjected to weighbridge check, physical sample tally, and joint verification before crediting stock accounts.
              </p>
            </div>

            <button
              onClick={() => setIsNewGrsModalOpen(true)}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New GRS Entry
            </button>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="p-3 font-semibold">GRS Number & Date</th>
                    <th className="p-3 font-semibold">Supplier / Source</th>
                    <th className="p-3 font-semibold">PO & Challan Details</th>
                    <th className="p-3 font-semibold">Material Item</th>
                    <th className="p-3 text-right font-semibold">Challan Qty</th>
                    <th className="p-3 text-right font-semibold text-emerald-400">Accepted Qty</th>
                    <th className="p-3 text-right font-semibold text-cyan-400">Issue Rate (₹)</th>
                    <th className="p-3 text-right font-semibold">Total Value (₹)</th>
                    <th className="p-3 text-center font-semibold">Status</th>
                    <th className="p-3 text-center font-semibold">Docket</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {grsSheets.map((sheet) => (
                    <tr key={sheet.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-white">{sheet.grsNumber}</div>
                        <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                          {new Date(sheet.receivedDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="p-3 font-sans">
                        <div className="font-semibold text-slate-200">{sheet.supplierName}</div>
                        <div className="text-[10px] text-slate-400">Vehicle: {sheet.vehicleNumber}</div>
                      </td>
                      <td className="p-3 font-sans text-slate-300">
                        <div>PO: {sheet.poReference}</div>
                        <div className="text-[10px] text-slate-400">Challan: {sheet.challanNumber}</div>
                      </td>
                      <td className="p-3 font-sans">
                        <div className="font-semibold text-white">{sheet.itemCode}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{sheet.itemDescription}</div>
                      </td>
                      <td className="p-3 text-right text-slate-400">
                        {sheet.challanQuantity.toLocaleString("en-IN")} {sheet.unit}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-300">
                        {sheet.acceptedQuantity.toLocaleString("en-IN")} {sheet.unit}
                        {sheet.rejectedQuantity > 0 && (
                          <div className="text-[10px] text-red-400 font-normal">
                            (-{sheet.rejectedQuantity} Rej)
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right text-cyan-300 font-semibold">
                        ₹{sheet.calculatedIssueRateInr.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-bold text-white">
                        ₹{(sheet.totalGrsValueInr / 100000).toFixed(2)}L
                      </td>
                      <td className="p-3 text-center font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            sheet.physicalVerificationStatus === "VERIFIED_ACCEPTED"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-700"
                              : sheet.physicalVerificationStatus === "CONDITIONALLY_ACCEPTED"
                              ? "bg-amber-950 text-amber-300 border border-amber-700"
                              : "bg-red-950 text-red-400 border border-red-700"
                          }`}
                        >
                          {sheet.physicalVerificationStatus === "VERIFIED_ACCEPTED"
                            ? "ACCEPTED"
                            : sheet.physicalVerificationStatus.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleOpenDocket(sheet)}
                          className="p-1.5 bg-slate-800 hover:bg-cyan-900/60 text-cyan-400 rounded-md transition-colors"
                          title="Print Official Form 8-A Docket"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. TAB 3: Bin Card Ledger (CPWD Form 8) ─────────────────────── */}
      {activeTab === "BIN_CARD" && (
        <div className="space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-medium">Select Bin Material:</span>
              <select
                value={selectedBinItemCode}
                onChange={(e) => setSelectedBinItemCode(e.target.value)}
                className="bg-slate-950 text-white text-xs font-semibold rounded-lg border border-slate-700 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
              >
                {inventory.map((item) => (
                  <option key={item.id} value={item.itemCode}>
                    {item.itemCode} - {item.itemName.slice(0, 36)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-300 flex items-center gap-4">
              <span>
                Bin Location: <strong className="text-white">{activeBinItem?.binLocation}</strong>
              </span>
              <span>
                Current Balance:{" "}
                <strong className="text-emerald-400 font-mono text-sm">
                  {activeBinItem?.currentStockBalance} {activeBinItem?.unit}
                </strong>
              </span>
            </div>
          </div>

          {/* Bin Card Register Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Archive className="w-4 h-4 text-cyan-400" />
                  CPWD Form 8 &bull; Bin Card Ledger for {activeBinItem?.itemName}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chronological recording of receipts and issues pursuant to CPWD Works Accounts Code Para 7.1.4.
                </p>
              </div>

              <span className="px-3 py-1 text-xs font-mono font-semibold rounded-md bg-slate-800 text-cyan-300">
                Unit Issue Rate: ₹{activeBinItem?.standardIssueRateInr}/{activeBinItem?.unit}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="p-3 font-semibold">Date & Time</th>
                    <th className="p-3 font-semibold">Transaction Type</th>
                    <th className="p-3 font-semibold">Voucher / Indent No</th>
                    <th className="p-3 font-semibold">Site Location / Indentor</th>
                    <th className="p-3 text-right font-semibold text-emerald-400">Receipt (In)</th>
                    <th className="p-3 text-right font-semibold text-amber-400">Issue (Out)</th>
                    <th className="p-3 text-right font-semibold text-white">Balance on Hand</th>
                    <th className="p-3 text-center font-semibold">Storekeeper</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {activeBinCardEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-slate-300">
                        {new Date(entry.entryDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            entry.transactionType === "RECEIPT"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                              : "bg-indigo-950 text-indigo-300 border border-indigo-700"
                          }`}
                        >
                          {entry.transactionType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-3 text-cyan-400 font-semibold">{entry.referenceVoucherNo}</td>
                      <td className="p-3 font-sans text-slate-300">
                        <div>{entry.contractorOrIndentor || "Direct Store Entry"}</div>
                        <div className="text-[10px] text-slate-500">{entry.issueToLocationOrTrade}</div>
                      </td>
                      <td className="p-3 text-right text-emerald-400 font-bold">
                        {entry.quantityIn > 0 ? `+${entry.quantityIn.toLocaleString("en-IN")}` : "--"}
                      </td>
                      <td className="p-3 text-right text-amber-400 font-bold">
                        {entry.quantityOut > 0 ? `-${entry.quantityOut.toLocaleString("en-IN")}` : "--"}
                      </td>
                      <td className="p-3 text-right text-white font-bold text-sm bg-slate-950/40">
                        {entry.balanceQuantity.toLocaleString("en-IN")} {activeBinItem?.unit}
                      </td>
                      <td className="p-3 text-center text-slate-400 font-sans">{entry.storekeeperInitials}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. TAB 4: CPWD Issue Rate Calculator (Para 7.2.1) ─────────────── */}
      {activeTab === "ISSUE_CALC" && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-start gap-4">
            <Calculator className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-white">
                CPWD Works Accounts Code Chapter 7 &bull; Para 7.2.1 Statutory Issue Rate Formulation
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                The issue rate of materials in stock accounts must cover the purchase price, loading, freight, unloading carriage charges, and a statutory addition of <strong>2.5% towards storage and supervision charges</strong>. Adjust parameters below to simulate live store pricing.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Controls */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
              <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                Rate Buildup Parameter Inputs
              </h4>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">Basic Purchase Price (ex-factory per unit):</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">₹</span>
                  <input
                    type="number"
                    value={calcPurchaseRate}
                    onChange={(e) => setCalcPurchaseRate(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">Total Carriage / Freight / Unloading (₹):</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">₹</span>
                  <input
                    type="number"
                    value={calcFreightTotal}
                    onChange={(e) => setCalcFreightTotal(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">Consignment Quantity Accepted (Units):</label>
                <input
                  type="number"
                  value={calcQuantity}
                  onChange={(e) => setCalcQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Incidental Storage & Supervision Addition:</span>
                  <span className="font-mono text-cyan-400 font-bold">{calcStoragePct}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.5}
                  value={calcStoragePct}
                  onChange={(e) => setCalcStoragePct(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">Standard CPWD Para 7.2.1 statutory norm is 2.50%</span>
              </div>
            </div>

            {/* Calculated Breakdown Display */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span>Statutory Rate Deconstruction</span>
                  <span className="text-xs text-cyan-400 font-mono">CPWD Form 8-A Basis</span>
                </h4>

                <div className="space-y-3 mt-4 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-slate-950/70 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400">1. Basic Purchase Price:</span>
                    <span className="font-mono text-white font-semibold">₹{liveIssueRate.purchaseRateInr.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-950/70 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400">2. Carriage Freight per Unit:</span>
                    <span className="font-mono text-white font-semibold">
                      +₹{liveIssueRate.carriagePerUnitInr.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-950/70 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400">3. Incidental Storage & Supervision ({calcStoragePct}%):</span>
                    <span className="font-mono text-cyan-300 font-semibold">
                      +₹{liveIssueRate.storageChargeInr.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 mt-6">
                <div className="text-xs text-slate-400">Final Statutory Unit Issue Rate:</div>
                <div className="text-3xl font-bold font-mono text-emerald-400 mt-1">
                  ₹{liveIssueRate.finalIssueRateInr.toFixed(2)} <span className="text-sm font-normal text-slate-400">/ Unit</span>
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  Total Consignment Book Value ({liveIssueRate.totalQuantity} units):{" "}
                  <strong className="text-white font-mono">
                    ₹{liveIssueRate.totalValuationInr.toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. New GRS Consignment Logging Modal ─────────────────────────── */}
      {isNewGrsModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                Log Inward Consignment &bull; Goods Received Sheet (Form 8-A)
              </h3>
              <button
                onClick={() => setIsNewGrsModalOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGrs} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Purchase Order Reference:</label>
                  <input
                    type="text"
                    required
                    value={newGrsForm.poReference}
                    onChange={(e) => setNewGrsForm({ ...newGrsForm, poReference: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Supplier Delivery Challan No:</label>
                  <input
                    type="text"
                    required
                    value={newGrsForm.challanNumber}
                    onChange={(e) => setNewGrsForm({ ...newGrsForm, challanNumber: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Supplier / Vendor Name:</label>
                  <input
                    type="text"
                    required
                    value={newGrsForm.supplierName}
                    onChange={(e) => setNewGrsForm({ ...newGrsForm, supplierName: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Carrier Vehicle Reg No:</label>
                  <input
                    type="text"
                    required
                    value={newGrsForm.vehicleNumber}
                    onChange={(e) => setNewGrsForm({ ...newGrsForm, vehicleNumber: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Store SKU Material Item:</label>
                  <select
                    value={newGrsForm.itemCode}
                    onChange={(e) => {
                      const selected = inventory.find((i) => i.itemCode === e.target.value);
                      setNewGrsForm({
                        ...newGrsForm,
                        itemCode: e.target.value,
                        itemDescription: selected?.itemName || "",
                        unit: selected?.unit || "Nos",
                        purchaseRateInr: selected ? selected.standardIssueRateInr * 0.95 : 100,
                      });
                    }}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white cursor-pointer"
                  >
                    {inventory.map((item) => (
                      <option key={item.id} value={item.itemCode}>
                        {item.itemCode} - {item.itemName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Unit of Measurement:</label>
                  <input
                    type="text"
                    disabled
                    value={newGrsForm.unit}
                    className="w-full p-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Challan Quantity:</label>
                  <input
                    type="number"
                    required
                    value={newGrsForm.challanQuantity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNewGrsForm({
                        ...newGrsForm,
                        challanQuantity: val,
                        receivedQuantity: val,
                        acceptedQuantity: val,
                      });
                    }}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Net Accepted Quantity:</label>
                  <input
                    type="number"
                    required
                    value={newGrsForm.acceptedQuantity}
                    onChange={(e) =>
                      setNewGrsForm({
                        ...newGrsForm,
                        acceptedQuantity: Number(e.target.value),
                        rejectedQuantity: newGrsForm.receivedQuantity - Number(e.target.value),
                      })
                    }
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-emerald-400 font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Base Purchase Price per Unit (₹):</label>
                  <input
                    type="number"
                    required
                    value={newGrsForm.purchaseRateInr}
                    onChange={(e) => setNewGrsForm({ ...newGrsForm, purchaseRateInr: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Total Carriage Freight (₹):</label>
                  <input
                    type="number"
                    required
                    value={newGrsForm.carriageFreightInr}
                    onChange={(e) => setNewGrsForm({ ...newGrsForm, carriageFreightInr: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block text-xs mb-1">Storekeeper Verification Remarks:</label>
                <textarea
                  rows={2}
                  value={newGrsForm.remarks}
                  onChange={(e) => setNewGrsForm({ ...newGrsForm, remarks: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewGrsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGrs}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingGrs ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Certify & Credit to Bin Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 10. Printable CPWD Form 8-A GRS Docket Modal (`@media print`) ─── */}
      {docketModalOpen && selectedGrsForDocket && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-8 flex justify-center">
          <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full p-8 space-y-6 shadow-2xl relative my-auto print:m-0 print:p-0 print:shadow-none print:max-w-none">
            {/* Action Bar (Hidden on print) */}
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-md font-mono">
                  CPWD FORM 8-A &bull; GOODS RECEIVED SHEET
                </span>
                <span className="text-xs text-slate-500 font-mono">Docket: {selectedGrsForDocket.grsNumber}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Print Form 8-A Docket
                </button>
                <button
                  onClick={() => setDocketModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Header */}
            <div className="text-center space-y-1 border-b pb-4">
              <div className="text-xs uppercase tracking-widest font-bold text-slate-500">
                GOVERNMENT OF INDIA &bull; CENTRAL PUBLIC WORKS DEPARTMENT
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                Goods Received Sheet & Consignment Docket (Form 8-A)
              </h2>
              <p className="text-xs text-slate-600">
                Pursuant to CPWD Works Accounts Code Chapter 7 (Stores) &amp; FIDIC Red Book Clause 14.5
              </p>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border text-xs">
              <div>
                <span className="text-slate-500 block">Project Code & Name:</span>
                <strong className="text-slate-900">{selectedGrsForDocket.projectId} (Tower A)</strong>
              </div>
              <div>
                <span className="text-slate-500 block">GRS Reference No:</span>
                <strong className="text-slate-900 font-mono">{selectedGrsForDocket.grsNumber}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">PO Reference No:</span>
                <strong className="text-slate-900 font-mono">{selectedGrsForDocket.poReference}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Receiving Date:</span>
                <strong className="text-slate-900">
                  {new Date(selectedGrsForDocket.receivedDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
              </div>
            </div>

            {/* Consignment & Carrier Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-3 border rounded text-xs">
              <div>
                <span className="text-slate-500 block">Supplier / Consignor:</span>
                <strong>{selectedGrsForDocket.supplierName}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Delivery Challan No & Date:</span>
                <strong>
                  {selectedGrsForDocket.challanNumber} (Dt: {selectedGrsForDocket.challanDate})
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Carrier & Vehicle No:</span>
                <strong>
                  {selectedGrsForDocket.carrierName} ({selectedGrsForDocket.vehicleNumber})
                </strong>
              </div>
            </div>

            {/* Line Item Table */}
            <div>
              <table className="w-full text-xs border border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b">
                    <th className="p-2 border text-left">SKU Code</th>
                    <th className="p-2 border text-left">Description of Goods</th>
                    <th className="p-2 border text-center">Unit</th>
                    <th className="p-2 border text-right">Challan Qty</th>
                    <th className="p-2 border text-right">Received Qty</th>
                    <th className="p-2 border text-right">Deduction (Rej)</th>
                    <th className="p-2 border text-right">Net Accepted</th>
                    <th className="p-2 border text-right">Issue Rate (₹)</th>
                    <th className="p-2 border text-right">Total Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border font-mono font-semibold">{selectedGrsForDocket.itemCode}</td>
                    <td className="p-2 border">{selectedGrsForDocket.itemDescription}</td>
                    <td className="p-2 border text-center">{selectedGrsForDocket.unit}</td>
                    <td className="p-2 border text-right font-mono">
                      {selectedGrsForDocket.challanQuantity.toLocaleString("en-IN")}
                    </td>
                    <td className="p-2 border text-right font-mono">
                      {selectedGrsForDocket.receivedQuantity.toLocaleString("en-IN")}
                    </td>
                    <td className="p-2 border text-right font-mono text-red-600">
                      {selectedGrsForDocket.rejectedQuantity.toLocaleString("en-IN")}
                    </td>
                    <td className="p-2 border text-right font-mono font-bold">
                      {selectedGrsForDocket.acceptedQuantity.toLocaleString("en-IN")}
                    </td>
                    <td className="p-2 border text-right font-mono">
                      ₹{selectedGrsForDocket.calculatedIssueRateInr.toFixed(2)}
                    </td>
                    <td className="p-2 border text-right font-mono font-bold">
                      ₹{selectedGrsForDocket.totalGrsValueInr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Storekeeper Certification Note */}
            <div className="p-4 bg-slate-50 rounded-lg border text-xs space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Physical Verification & Bin Credit Certification (Para 7.1.3):
              </h4>
              <p className="text-slate-700 leading-relaxed">
                Certified that the articles detailed above have been physically counted, measured, weighbridge verified, and found to correspond with the specification. The net accepted quantities have been duly entered in the respective Bin Cards, and the rates charged conform to purchase orders and CPWD Accounts Code regulations.
              </p>
            </div>

            {/* Tripartite Sign-off Block */}
            <div className="pt-8 border-t grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-6">
                <div className="font-mono text-emerald-700 text-xs font-bold">[VERIFIED &bull; BIN CREDITED]</div>
                <div className="border-t pt-2">
                  <div className="font-bold text-slate-900">{selectedGrsForDocket.storekeeperSign}</div>
                  <div className="text-slate-500 text-[10px]">Head Storekeeper / Receiver</div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="font-mono text-emerald-700 text-xs font-bold">[INSPECTED &bull; QUALITY PASSED]</div>
                <div className="border-t pt-2">
                  <div className="font-bold text-slate-900">{selectedGrsForDocket.sectionalOfficerSign}</div>
                  <div className="text-slate-500 text-[10px]">Sectional Officer / Assistant Engineer</div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="font-mono text-emerald-700 text-xs font-bold">[STOCK ACCOUNT AUDITED]</div>
                <div className="border-t pt-2">
                  <div className="font-bold text-slate-900">Er. Rajesh Srivastava</div>
                  <div className="text-slate-500 text-[10px]">Superintending Engineer / Lead PMC</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
