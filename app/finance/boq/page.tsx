"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Building2,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  HardHat,
  Layers,
  Lock,
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
  TrendingDown,
  TrendingUp,
  Truck,
  Unlock,
  Wrench,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type BoqItemCategory =
  | "CIVIL_SUBSTRUCTURE"
  | "CIVIL_SUPERSTRUCTURE"
  | "MEP_SERVICES"
  | "FINISHES_FITOUT"
  | "EXTERNAL_INFRASTRUCTURE";

export interface BoqItemRecord {
  id: string;
  project_id: string;
  item_code: string;
  wbs_code: string;
  item_description: string;
  trade_package: string;
  category: BoqItemCategory;
  unit: string;
  tender_quantity: number;
  sanctioned_rate_inr: number;
  total_budget_inr: number;
  executed_quantity: number;
  certified_amount_inr: number;
  deviation_limit_pct: number;
  is_extra_item: boolean;
  linked_variation_no?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function normalizeBoqItem(d: any): BoqItemRecord {
  const tenderQty = Number(d?.tender_quantity ?? 0);
  const rate = Number(d?.sanctioned_rate_inr ?? 0);
  const executedQty = Number(d?.executed_quantity ?? 0);

  const budget = Number(d?.total_budget_inr ?? Math.round(tenderQty * rate));
  const certified = Number(d?.certified_amount_inr ?? Math.round(executedQty * rate));

  return {
    id: d?.id ?? `boq-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    item_code: d?.item_code ?? `BOQ-${Date.now().toString().slice(-4)}`,
    wbs_code: d?.wbs_code ?? "WBS-1.0",
    item_description: d?.item_description ?? "Contract Schedule Line Item",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    category: (d?.category as BoqItemCategory) ?? "CIVIL_SUPERSTRUCTURE",
    unit: d?.unit ?? "m³",
    tender_quantity: tenderQty,
    sanctioned_rate_inr: rate,
    total_budget_inr: budget,
    executed_quantity: executedQty,
    certified_amount_inr: certified,
    deviation_limit_pct: Number(d?.deviation_limit_pct ?? 30.0),
    is_extra_item: Boolean(d?.is_extra_item),
    linked_variation_no: d?.linked_variation_no ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalBoqPage() {
  const { project, role, tier } = useActiveRole();
  const [items, setItems] = useState<BoqItemRecord[]>([]);
  const [selectedItem, setSelectedItem] = useState<BoqItemRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Lead Quantity Surveyor";
  const isSurveyorOrDirector =
    roleId === "QS_BILLING" ||
    roleId === "QS_BILLING_HEAD" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleLabel.includes("Surveyor") ||
    roleLabel.includes("Finance") ||
    roleLabel.includes("Director") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("Lead");

  // Form State for Adding New BOQ Line Item
  const [itemCode, setItemCode] = useState(
    tier === "RESIDENTIAL" ? "SOR-INT-JOINERY-06" : "DSR-STR-CONC-02"
  );
  const [wbsCode, setWbsCode] = useState(tier === "RESIDENTIAL" ? "WBS-3.2.1" : "WBS-2.1.4");
  const [desc, setDesc] = useState(
    tier === "RESIDENTIAL"
      ? "Providing and fixing 18mm Action TESA Boilo HDHMR modular wardrobe carcass panels."
      : "Providing and laying M40 grade design mix concrete in shear walls and column kickers."
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [category, setCategory] = useState<BoqItemCategory>(
    tier === "RESIDENTIAL" ? "FINISHES_FITOUT" : "CIVIL_SUPERSTRUCTURE"
  );
  const [unit, setUnit] = useState(tier === "RESIDENTIAL" ? "Sqm" : "m³");
  const [tenderQty, setTenderQty] = useState<number>(tier === "RESIDENTIAL" ? 185.0 : 850.0);
  const [sanctionedRate, setSanctionedRate] = useState<number>(tier === "RESIDENTIAL" ? 2850 : 6966);
  const [deviationLimit, setDeviationLimit] = useState<number>(30.0);

  const loadBoqItems = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("boq_master_items")
        .select("*")
        .eq("project_id", projectId)
        .order("wbs_code", { ascending: true });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeBoqItem(d));
        setItems(normalized);
        if (!selectedItem) setSelectedItem(normalized[0]);
      } else {
        const defaults: BoqItemRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeBoqItem({
                  id: "boq-res-01",
                  project_id: projectId,
                  item_code: "SOR-JOINERY-04",
                  wbs_code: "WBS-2.1",
                  item_description: "Providing & fixing Action TESA 18mm Boilo HDHMR modular wardrobe carcasses.",
                  trade_package: "Custom Joinery & Millwork",
                  category: "FINISHES_FITOUT",
                  unit: "Sqm",
                  tender_quantity: 120.0,
                  sanctioned_rate_inr: 2850,
                  executed_quantity: 17.28,
                }),
                normalizeBoqItem({
                  id: "boq-res-02",
                  project_id: projectId,
                  item_code: "SOR-PLUMB-02",
                  wbs_code: "WBS-3.4",
                  item_description: "Astral SDR-11 CPVC 32mm distribution piping with solvent weld joints.",
                  trade_package: "First-Fix Plumbing & Sanitary",
                  category: "MEP_SERVICES",
                  unit: "Rmt",
                  tender_quantity: 240.0,
                  sanctioned_rate_inr: 450,
                  executed_quantity: 50.0,
                }),
                normalizeBoqItem({
                  id: "boq-res-03",
                  project_id: projectId,
                  item_code: "SOR-CEIL-01",
                  wbs_code: "WBS-2.3",
                  item_description: "Saint-Gobain Gyproc false ceiling framing with shadow gap lighting profiles.",
                  trade_package: "Surface Finishes & Ceiling",
                  category: "FINISHES_FITOUT",
                  unit: "Sqm",
                  tender_quantity: 180.0,
                  sanctioned_rate_inr: 1250,
                  executed_quantity: 81.0,
                }),
              ]
            : [
                normalizeBoqItem({
                  id: "boq-twr-01",
                  project_id: projectId,
                  item_code: "DSR-5.1.1",
                  wbs_code: "WBS-2.1.1",
                  item_description: "Reinforced cement concrete M40 in shear walls, core walls, and columns.",
                  trade_package: "Civil & Superstructure",
                  category: "CIVIL_SUPERSTRUCTURE",
                  unit: "m³",
                  tender_quantity: 1850.0,
                  sanctioned_rate_inr: 6966,
                  executed_quantity: 175.5,
                }),
                normalizeBoqItem({
                  id: "boq-twr-02",
                  project_id: projectId,
                  item_code: "DSR-5.2.2",
                  wbs_code: "WBS-2.1.2",
                  item_description: "High-yield strength Fe500D TMT reinforcement bars cut, bent, and tied in place per BBS.",
                  trade_package: "Civil & Superstructure",
                  category: "CIVIL_SUPERSTRUCTURE",
                  unit: "MT",
                  tender_quantity: 220.0,
                  sanctioned_rate_inr: 72500,
                  executed_quantity: 42.5,
                }),
                normalizeBoqItem({
                  id: "boq-twr-03",
                  project_id: projectId,
                  item_code: "DSR-2.8.1",
                  wbs_code: "WBS-1.1.2",
                  item_description: "Deep basement earthwork excavation in all types of soil including staging and shoring.",
                  trade_package: "Civil & Substructure",
                  category: "CIVIL_SUBSTRUCTURE",
                  unit: "m³",
                  tender_quantity: 3500.0,
                  sanctioned_rate_inr: 285,
                  executed_quantity: 3820.0,
                  deviation_limit_pct: 30.0,
                }),
              ];

        setItems(defaults);
        if (!selectedItem) setSelectedItem(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedItem, tier]);

  useEffect(() => {
    void loadBoqItems();

    const channel = supabase
      .channel(`boq_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "boq_master_items" }, () => void loadBoqItems())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadBoqItems]);

  const summary = useMemo(() => {
    const totalLines = items.length;
    const totalTenderBudget = items.reduce((sum, i) => sum + Number(i.total_budget_inr || 0), 0);
    const totalCertifiedExecution = items.reduce((sum, i) => sum + Number(i.certified_amount_inr || 0), 0);
    const overallProgress =
      totalTenderBudget > 0 ? Math.round((totalCertifiedExecution / totalTenderBudget) * 100) : 0;

    const highDeviationCount = items.filter((i) => {
      const devPct =
        i.tender_quantity > 0
          ? ((i.executed_quantity - i.tender_quantity) / i.tender_quantity) * 100
          : 0;
      return devPct >= 20.0;
    }).length;

    return { totalLines, totalTenderBudget, totalCertifiedExecution, overallProgress, highDeviationCount };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      const matchCat = filterCat === "ALL" || i.category === filterCat;
      const haystack = `${i.item_code} ${i.wbs_code} ${i.item_description} ${i.trade_package}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchCat && matchSearch;
    });
  }, [items, filterCat, search]);

  // Synchronize Live Drawdowns from e-MB Records
  const handleSyncWithEmb = async () => {
    setActionInProgress("sync_emb");

    try {
      const { data: embItems } = await (supabase as any)
        .from("electronic_measurement_book")
        .select("boq_item_ref, net_quantity, status")
        .eq("project_id", projectId)
        .in("status", ["SEOR_CERTIFIED", "BILLED_IN_RA"]);

      if (embItems && embItems.length > 0) {
        const usageMap: Record<string, number> = {};
        embItems.forEach((m: any) => {
          usageMap[m.boq_item_ref] = (usageMap[m.boq_item_ref] || 0) + Number(m.net_quantity || 0);
        });

        // Update local items with verified e-MB output
        setItems((prev) =>
          prev.map((item) => {
            const executed = usageMap[item.item_code] !== undefined ? usageMap[item.item_code] : item.executed_quantity;
            const certified = Math.round(executed * item.sanctioned_rate_inr);
            return {
              ...item,
              executed_quantity: executed,
              certified_amount_inr: certified,
            };
          })
        );
      }

      setFeedbackMessage("Master BOQ synchronized with certified e-MB measurement ledger.");
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch {
      // Local fallback
    }

    setActionInProgress(null);
  };

  // Create New BOQ Line Item
  const handleCreateBoqItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_boq");

    const budget = Math.round(Number(tenderQty) * Number(sanctionedRate));

    const newDbRecord: Omit<BoqItemRecord, "id"> = {
      project_id: projectId,
      item_code: itemCode.trim(),
      wbs_code: wbsCode.trim(),
      item_description: desc.trim(),
      trade_package: tradePackage.trim(),
      category,
      unit: unit.trim(),
      tender_quantity: Number(tenderQty),
      sanctioned_rate_inr: Number(sanctionedRate),
      total_budget_inr: budget,
      executed_quantity: 0,
      certified_amount_inr: 0,
      deviation_limit_pct: Number(deviationLimit),
      is_extra_item: false,
    };

    try {
      const { data, error } = await (supabase as any)
        .from("boq_master_items")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeBoqItem(data);
        setItems((prev) => [...prev, normalized]);
        setSelectedItem(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeBoqItem({ ...newDbRecord, id: `boq-${Date.now()}` });
      setItems((prev) => [...prev, fallback]);
      setSelectedItem(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Printable CPWD Schedule A / BOQ Docket
  const handlePrintBoq = () => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Master Schedule of Quantities (CPWD Schedule A / BOQ) — ${projectName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .tac { text-align: center; font-family: monospace; }
    .total-row { background: #f1f5f9; font-weight: bold; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 40px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD GCC Clause 10 / Schedule of Quantities</div>
      <h1 class="title">Master Contract Bill of Quantities (BOQ)</h1>
      <div class="meta">Project: ${projectName} (${projectId}) · Audit Horizon: ${new Date().toLocaleDateString("en-IN")}</div>
    </div>
    <div style="text-align: right; font-family: monospace;">
      <strong>Baseline Budget: ₹${summary.totalTenderBudget.toLocaleString("en-IN")}</strong><br/>
      <span style="color: #15803d;">Executed Valuation: ₹${summary.totalCertifiedExecution.toLocaleString("en-IN")} (${summary.overallProgress}%)</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item Code</th>
        <th>WBS Code</th>
        <th>Item Description &amp; Trade Package</th>
        <th class="tar">Tender Qty</th>
        <th class="tar">Executed Qty</th>
        <th class="tar">Rate (INR)</th>
        <th class="tar">Tender Budget</th>
        <th class="tar">Certified Execution</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (i) => `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${i.item_code}</td>
          <td style="font-family: monospace;">${i.wbs_code}</td>
          <td><strong>${i.item_description}</strong><br/><span style="color:#64748b;">${i.trade_package}</span></td>
          <td class="tar font-bold">${i.tender_quantity} ${i.unit}</td>
          <td class="tar" style="color: #0369a1;">${i.executed_quantity} ${i.unit}</td>
          <td class="tar">₹${i.sanctioned_rate_inr.toLocaleString("en-IN")}</td>
          <td class="tar font-bold">₹${i.total_budget_inr.toLocaleString("en-IN")}</td>
          <td class="tar font-bold" style="color: #15803d;">₹${i.certified_amount_inr.toLocaleString("en-IN")}</td>
        </tr>
      `
        )
        .join("")}
      <tr class="total-row" style="background: #e0f2fe;">
        <td colspan="6"><strong>TOTAL BASELINE CONTRACT SUM</strong></td>
        <td class="tar" style="color: #0369a1; font-size: 13px;"><strong>₹${summary.totalTenderBudget.toLocaleString("en-IN")}</strong></td>
        <td class="tar" style="color: #15803d; font-size: 13px;"><strong>₹${summary.totalCertifiedExecution.toLocaleString("en-IN")}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>Tender Quantity Surveyor</div>
      <div style="color: #64748b;">BOQ baseline rates certified.</div>
      <div class="sig">Tender QS Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">Measurement drawdown verified against e-MB.</div>
      <div class="sig">Consultant Audit Seal</div>
    </div>
    <div>
      <div>Employer Project Director</div>
      <div style="color: #64748b;">Statutory contract baseline approved.</div>
      <div class="sig">Project Director Authority</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedItem) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING MASTER BILL OF QUANTITIES &amp; WBS ENGINE...
      </div>
    );
  }

  const deviationPct =
    selectedItem.tender_quantity > 0
      ? ((selectedItem.executed_quantity - selectedItem.tender_quantity) / selectedItem.tender_quantity) * 100
      : 0;
  const isDeviationExceeded = deviationPct >= selectedItem.deviation_limit_pct;
  const isDeviationWarning = deviationPct >= 20.0 && !isDeviationExceeded;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Cost Engineering &middot; CPWD GCC Clause 10 / FIDIC Clause 14.1</span>
              <span>&middot;</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Master Bill of Quantities (BOQ) &amp; WBS Ledger
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Contract financial baseline. Tracks tendered quantities against certified e-MB measurements, monitors statutory &plusmn;30% deviation limits, and projects real-time S-curve cost execution.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrintBoq}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Schedule A (BOQ)</span>
            </button>
            <button
              type="button"
              disabled={actionInProgress === "sync_emb"}
              onClick={handleSyncWithEmb}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionInProgress === "sync_emb" ? "animate-spin" : ""}`} />
              <span>Sync e-MB Drawdowns</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setItemCode(tier === "RESIDENTIAL" ? "SOR-INT-09" : "DSR-STR-04");
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Add BOQ Item</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedbackMessage && (
          <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* 4 PRIMARY GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Baseline Contract Value</span>
              <Coins className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {formatInr(summary.totalTenderBudget)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Total sanctioned tender budget</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Executed &amp; Certified Value</span>
              <Scale className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {formatInr(summary.totalCertifiedExecution)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">{summary.overallProgress}% overall completion</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Deviation Limit Warnings (&ge; 20%)</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold font-mono mt-2 ${summary.highDeviationCount > 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {summary.highDeviationCount} Line(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Approaching CPWD 30% variation gate</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total BOQ Schedule Items</span>
              <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {summary.totalLines} Items
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Structured across project WBS</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All WBS (${items.length})` },
              { key: "CIVIL_SUPERSTRUCTURE", label: "Superstructure" },
              { key: "CIVIL_SUBSTRUCTURE", label: "Substructure" },
              { key: "MEP_SERVICES", label: "MEP Services" },
              { key: "FINISHES_FITOUT", label: "Finishes & Fit-out" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterCat(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition ${
                  filterCat === tab.key
                    ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search code, description, WBS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: BOQ ROSTER (7 cols) vs ITEM INSPECTOR & DEVIATION GAUGE (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: BOQ SCHEDULE ROSTER (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Schedule of Quantities (CPWD Schedule A)
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Master Contract Line Items</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredItems.length} Items</span>
            </div>

            <div className="space-y-3">
              {filteredItems.map((item) => {
                const isSelected = selectedItem.id === item.id;
                const dev =
                  item.tender_quantity > 0
                    ? ((item.executed_quantity - item.tender_quantity) / item.tender_quantity) * 100
                    : 0;
                const isOverLimit = dev >= item.deviation_limit_pct;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {item.item_code}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {item.wbs_code}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isOverLimit
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                            : dev >= 20.0
                            ? "bg-amber-950 text-amber-400 border border-amber-800/50"
                            : "bg-zinc-800 text-zinc-300"
                        }`}>
                          {isOverLimit ? "VARIATION REQUIRED" : dev > 0 ? `+${dev.toFixed(1)}%` : "WITHIN BOQ"}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-emerald-400">
                          {formatInr(item.certified_amount_inr)}
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Budget: {formatInr(item.total_budget_inr)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{item.item_description}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        {item.trade_package} &bull; Rate: ₹{item.sanctioned_rate_inr.toLocaleString("en-IN")}/{item.unit}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Tender: <strong className="text-zinc-300">{item.tender_quantity} {item.unit}</strong></span>
                      <span>Executed: <strong className="text-emerald-400">{item.executed_quantity} {item.unit}</strong></span>
                      <span>Balance: <strong className="text-zinc-300">{Math.max(0, item.tender_quantity - item.executed_quantity).toFixed(1)} {item.unit}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: ITEM INSPECTOR & DEVIATION AUDIT DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  BOQ Line Item Breakdown
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedItem.item_code}</h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">{selectedItem.wbs_code}</span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Item Description:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedItem.item_description}</strong>
              </div>
              <div className="pt-2 border-t border-zinc-800/60 flex justify-between text-[11px] text-zinc-400">
                <span>Trade Package:</span>
                <span className="text-zinc-200">{selectedItem.trade_package}</span>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Category:</span>
                <span className="text-cyan-300">{selectedItem.category.replace(/_/g, " ")}</span>
              </div>
            </div>

            {/* FINANCIAL & DEVIATION GAUGES */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                CPWD Clause 12 Deviation Telemetry:
              </span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Sanctioned Tender Quantity:</span>
                  <span className="text-white font-bold">{selectedItem.tender_quantity} {selectedItem.unit}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Cumulative Executed (e-MB):</span>
                  <span className="text-cyan-300 font-bold">{selectedItem.executed_quantity} {selectedItem.unit}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Sanctioned Base Rate:</span>
                  <span className="text-zinc-200">₹{selectedItem.sanctioned_rate_inr.toLocaleString("en-IN")} / {selectedItem.unit}</span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-zinc-800">
                  <span>Actual Quantity Deviation:</span>
                  <span className={`font-bold ${isDeviationExceeded ? "text-rose-400" : isDeviationWarning ? "text-amber-400" : "text-emerald-400"}`}>
                    {deviationPct > 0 ? `+${deviationPct.toFixed(1)}%` : `${deviationPct.toFixed(1)}%`} (Limit: &le; {selectedItem.deviation_limit_pct}%)
                  </span>
                </div>
                <div className="flex justify-between text-emerald-400 font-extrabold text-sm pt-1.5 border-t border-zinc-800">
                  <span>Certified Financial Valuation:</span>
                  <span>{formatInr(selectedItem.certified_amount_inr)}</span>
                </div>
              </div>
            </div>

            {/* STATUTORY ACTIONS: VARIATION ORDER ESCALATION */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              {isDeviationExceeded && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 font-mono text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-rose-200">
                    <AlertOctagon className="w-4 h-4 text-rose-400" />
                    <span>CPWD CLAUSE 12 DEVIATION LIMIT EXCEEDED</span>
                  </div>
                  <p className="text-[11px] font-sans text-zinc-300 leading-relaxed">
                    Cumulative execution exceeds the statutory {selectedItem.deviation_limit_pct}% tender allowance. Future measurements cannot be billed without a sanctioned Variation Order.
                  </p>
                  <Link
                    href="/contracts/variations"
                    className="block text-center py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition font-mono shadow-md shadow-rose-950/50"
                  >
                    Generate Variation Order (VO) &rarr;
                  </Link>
                </div>
              )}

              <Link
                href="/finance/measurement-book"
                className="block text-center py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-bold text-xs transition font-mono"
              >
                Inspect e-MB Measurement Book &rarr;
              </Link>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD GCC Clause 10 &amp; Schedule A Baseline Protocol
            </div>
          </div>

        </div>

        {/* ADD BOQ ITEM MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Add Master BOQ Line Item
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateBoqItem} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Item Code (SOR / DSR)</label>
                    <input
                      type="text"
                      required
                      value={itemCode}
                      onChange={(e) => setItemCode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">WBS Code</label>
                    <input
                      type="text"
                      required
                      value={wbsCode}
                      onChange={(e) => setWbsCode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Item Description</label>
                  <textarea
                    rows={2}
                    required
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Trade Package</label>
                    <input
                      type="text"
                      required
                      value={tradePackage}
                      onChange={(e) => setTradePackage(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as BoqItemCategory)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="CIVIL_SUPERSTRUCTURE">Civil Superstructure</option>
                      <option value="CIVIL_SUBSTRUCTURE">Civil Substructure</option>
                      <option value="MEP_SERVICES">MEP Services</option>
                      <option value="FINISHES_FITOUT">Finishes &amp; Fit-out</option>
                      <option value="EXTERNAL_INFRASTRUCTURE">External Infrastructure</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Tender Qty</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={tenderQty}
                      onChange={(e) => setTenderQty(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Unit</label>
                    <input
                      type="text"
                      required
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Sanctioned Rate (₹)</label>
                    <input
                      type="number"
                      required
                      value={sanctionedRate}
                      onChange={(e) => setSanctionedRate(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Statutory Deviation Limit (%)</label>
                  <input
                    type="number"
                    required
                    value={deviationLimit}
                    onChange={(e) => setDeviationLimit(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === "creating_boq"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Commit BOQ Item</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}