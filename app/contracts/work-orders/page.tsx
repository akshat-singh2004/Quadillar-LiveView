"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Award,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  Gavel,
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
  Users,
  Wrench,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type WorkOrderStatus =
  | "DRAFT_ISSUED"
  | "SIGNATORY_ACCEPTED"
  | "EXECUTION_ACTIVE"
  | "SUSPENDED_DISPUTE"
  | "COMPLETED_CLOSED"
  | "TERMINATED_DEFAULT";

export interface WorkOrderRecord {
  id: string;
  project_id: string;
  work_order_number: string;
  linked_tender_ref?: string | null;
  contractor_name: string;
  vendor_registration_no: string;
  trade_package: string;
  work_order_title: string;
  scope_of_work: string;
  location_grid: string;
  awarded_cost_inr: number;
  cumulative_billed_inr: number;
  retention_deduction_pct: number;
  mobilization_advance_inr: number;
  performance_security_ref?: string | null;
  commencement_date: string;
  stipulated_completion_date: string;
  actual_completion_date?: string | null;
  defects_liability_period_months: number;
  liquidated_damages_pct_per_week: number;
  status: WorkOrderStatus;
  contractor_signatory_name?: string | null;
  employer_signatory_name: string;
  accepted_at?: string | null;
  special_conditions?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function normalizeWorkOrder(d: any): WorkOrderRecord {
  return {
    id: d?.id ?? `wo-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    work_order_number: d?.work_order_number ?? `WO-${Date.now().toString().slice(-4)}`,
    linked_tender_ref: d?.linked_tender_ref ?? "NIT-01",
    contractor_name: d?.contractor_name ?? "Executing Subcontractor",
    vendor_registration_no: d?.vendor_registration_no ?? "VEND-REG-001",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    work_order_title: d?.work_order_title ?? "Subcontract Work Package Agreement",
    scope_of_work: d?.scope_of_work ?? "Complete execution of package per tender specifications.",
    location_grid: d?.location_grid ?? "Site-Wide",
    awarded_cost_inr: Number(d?.awarded_cost_inr ?? 0),
    cumulative_billed_inr: Number(d?.cumulative_billed_inr ?? 0),
    retention_deduction_pct: Number(d?.retention_deduction_pct ?? 5.0),
    mobilization_advance_inr: Number(d?.mobilization_advance_inr ?? 0),
    performance_security_ref: d?.performance_security_ref ?? "PBG-2026-8812",
    commencement_date: d?.commencement_date ?? new Date().toISOString().slice(0, 10),
    stipulated_completion_date: d?.stipulated_completion_date ?? new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
    actual_completion_date: d?.actual_completion_date ?? null,
    defects_liability_period_months: Number(d?.defects_liability_period_months ?? 12),
    liquidated_damages_pct_per_week: Number(d?.liquidated_damages_pct_per_week ?? 0.5),
    status: (d?.status as WorkOrderStatus) ?? "EXECUTION_ACTIVE",
    contractor_signatory_name: d?.contractor_signatory_name ?? "Subcontractor Director",
    employer_signatory_name: d?.employer_signatory_name ?? "Project Director",
    accepted_at: d?.accepted_at ?? new Date().toISOString(),
    special_conditions: d?.special_conditions ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalWorkOrdersPage() {
  const { project, role, tier } = useActiveRole();
  const [orders, setOrders] = useState<WorkOrderRecord[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Contracts Lead";
  const isContractsOrDirector =
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "QS_BILLING_HEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleLabel.includes("Director") ||
    roleLabel.includes("Contract") ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("Surveyor") ||
    roleLabel.includes("Lead");

  // Form State for Issuing New Work Order
  const [woNo, setWoNo] = useState(`WO-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-10${Math.floor(1 + Math.random() * 9)}`);
  const [tenderRef, setTenderRef] = useState(tier === "RESIDENTIAL" ? "NIT-RES-2026-01" : "NIT-TWR-2026-01");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [title, setTitle] = useState(
    tier === "RESIDENTIAL"
      ? "Turnkey Modular Joinery, Wardrobes & Premium Fluted Wall Paneling"
      : "Tower A Structural Reinforcement, Shuttering & Core Concrete Works (Levels 01-14)"
  );
  const [scope, setScope] = useState(
    tier === "RESIDENTIAL"
      ? "Fabrication and installation of Action TESA 18mm Boilo HDHMR modular wardrobe carcasses, soft-close hardware, and PU lacquer finish."
      : "Complete execution of Fe500D rebar tying, M40 core concrete pours, and Doka system formwork."
  );
  const [awardedCost, setAwardedCost] = useState<number>(tier === "RESIDENTIAL" ? 2745000 : 83200000);
  const [retention, setRetention] = useState<number>(5.0);
  const [mobAdvance, setMobAdvance] = useState<number>(tier === "RESIDENTIAL" ? 274500 : 8320000); // 10% advance
  const [pbgRef, setPbgRef] = useState("PBG-HDFC-2026-9921");
  const [commenceDate, setCommenceDate] = useState(new Date().toISOString().slice(0, 10));
  const [completeDate, setCompleteDate] = useState(
    new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10)
  );

  const loadWorkOrdersData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("contract_work_orders")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeWorkOrder(d));
        setOrders(normalized);
        if (!selectedOrder) setSelectedOrder(normalized[0]);
      } else {
        const defaults: WorkOrderRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeWorkOrder({
                  id: "wo-res-01",
                  project_id: projectId,
                  work_order_number: "WO-RES-001",
                  linked_tender_ref: "NIT-RES-2026-01",
                  contractor_name: "Royal Woodworks & Interiors",
                  vendor_registration_no: "REG-INT-9912",
                  trade_package: "Custom Joinery & Millwork",
                  work_order_title: "Turnkey Modular Joinery, Wardrobes & Fluted Paneling",
                  scope_of_work: "Fabrication and installation of Action TESA 18mm Boilo HDHMR modular wardrobe carcasses, soft-close fittings, and lacquer finish.",
                  location_grid: "First Floor / MB-02 & Lobby",
                  awarded_cost_inr: 2745000,
                  cumulative_billed_inr: 650000,
                  retention_deduction_pct: 5.0,
                  mobilization_advance_inr: 274500,
                  performance_security_ref: "PBG-HDFC-RES-9912",
                  commencement_date: "2026-08-20",
                  stipulated_completion_date: "2026-11-20",
                  status: "EXECUTION_ACTIVE",
                  contractor_signatory_name: "V. K. Mehta (Director)",
                  employer_signatory_name: "Principal Architect",
                  special_conditions: "All timber substrates to carry 5-year anti-termite and boiling waterproof warranty.",
                }),
              ]
            : [
                normalizeWorkOrder({
                  id: "wo-twr-01",
                  project_id: projectId,
                  work_order_number: "WO-TWR-101",
                  linked_tender_ref: "NIT-TWR-2026-01",
                  contractor_name: "Narmada Concrete Works",
                  vendor_registration_no: "REG-CIVIL-0081",
                  trade_package: "Civil & Superstructure",
                  work_order_title: "Tower A Structural Reinforcement, Shuttering & Core Concrete Works",
                  scope_of_work: "Execution of reinforced concrete shear cores, post-tensioned floor slabs, column kickers, and concrete pumping.",
                  location_grid: "Tower A / Substructure to Level 14",
                  awarded_cost_inr: 83200000,
                  cumulative_billed_inr: 34500000,
                  retention_deduction_pct: 5.0,
                  mobilization_advance_inr: 8320000,
                  performance_security_ref: "PBG-SBI-TWR-8812",
                  commencement_date: "2026-04-01",
                  stipulated_completion_date: "2027-03-31",
                  status: "EXECUTION_ACTIVE",
                  contractor_signatory_name: "R. K. Sharma (MD)",
                  employer_signatory_name: "Project Director",
                  special_conditions: "Concrete cube acceptance per IS 456 Table 11. 2x penal recovery enforced under Clause 42 for excess steel wastage.",
                }),
              ];

        setOrders(defaults);
        if (!selectedOrder) setSelectedOrder(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedOrder, tier]);

  useEffect(() => {
    void loadWorkOrdersData();

    const channel = supabase
      .channel(`work_orders_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_work_orders" }, () => void loadWorkOrdersData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadWorkOrdersData]);

  const summary = useMemo(() => {
    const totalWOs = orders.length;
    const activeExecution = orders.filter((w) => w.status === "EXECUTION_ACTIVE").length;
    const totalCommittedValueInr = orders.reduce((sum, w) => sum + Number(w.awarded_cost_inr || 0), 0);
    const totalBilledValueInr = orders.reduce((sum, w) => sum + Number(w.cumulative_billed_inr || 0), 0);
    const unbilledCommitmentInr = Math.max(0, totalCommittedValueInr - totalBilledValueInr);

    return { totalWOs, activeExecution, totalCommittedValueInr, totalBilledValueInr, unbilledCommitmentInr };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((w) => {
      const matchStatus = filterStatus === "ALL" || w.status === filterStatus;
      const haystack = `${w.work_order_number} ${w.contractor_name} ${w.trade_package} ${w.work_order_title}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [orders, filterStatus, search]);

  // Stage 1: Accept Work Order & Lock Commitment
  const handleAcceptWorkOrder = async (wo: WorkOrderRecord) => {
    if (!isContractsOrDirector) return;
    setActionInProgress(`accept_${wo.id}`);

    const updatePayload: Partial<WorkOrderRecord> = {
      status: "EXECUTION_ACTIVE",
      accepted_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("contract_work_orders")
        .update(updatePayload)
        .eq("id", wo.id);
    } catch {
      // Local optimistic update
    }

    setOrders((prev) =>
      prev.map((item) => (item.id === wo.id ? ({ ...item, ...updatePayload } as WorkOrderRecord) : item))
    );
    if (selectedOrder && selectedOrder.id === wo.id) {
      setSelectedOrder((prev) => (prev ? ({ ...prev, ...updatePayload } as WorkOrderRecord) : null));
    }

    setFeedbackMessage(`Work Order ${wo.work_order_number} formally accepted and locked for active execution.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Issue New Contract Work Order
  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_wo");

    const newDbRecord: Omit<WorkOrderRecord, "id"> = {
      project_id: projectId,
      work_order_number: woNo.trim(),
      linked_tender_ref: tenderRef.trim() || null,
      contractor_name: contractor.trim(),
      vendor_registration_no: `VEND-${Math.floor(100 + Math.random() * 900)}`,
      trade_package: tradePackage.trim(),
      work_order_title: title.trim(),
      scope_of_work: scope.trim(),
      location_grid: "Site-Wide",
      awarded_cost_inr: Number(awardedCost),
      cumulative_billed_inr: 0,
      retention_deduction_pct: Number(retention),
      mobilization_advance_inr: Number(mobAdvance),
      performance_security_ref: pbgRef.trim(),
      commencement_date: commenceDate,
      stipulated_completion_date: completeDate,
      defects_liability_period_months: 12,
      liquidated_damages_pct_per_week: 0.5,
      status: "EXECUTION_ACTIVE",
      contractor_signatory_name: "Authorized Subcontractor Signatory",
      employer_signatory_name: roleLabel || "Project Director",
      accepted_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await (supabase as any)
        .from("contract_work_orders")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeWorkOrder(data);
        setOrders((prev) => [normalized, ...prev]);
        setSelectedOrder(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeWorkOrder({ ...newDbRecord, id: `wo-${Date.now()}` });
      setOrders((prev) => [fallback, ...prev]);
      setSelectedOrder(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory CPWD Form 16 / Work Order Legal Agreement Print
  const handlePrintWorkOrderDocket = (wo: WorkOrderRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Contract Work Order (CPWD Form 16 / FIDIC Cl. 4.4) — ${wo.work_order_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .active { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .draft { background: #fef3c7; color: #b45309; border: 1px solid #f59e0b; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .tac { text-align: center; font-family: monospace; }
    .total-row { background: #f1f5f9; font-weight: bold; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-top: 14px; background: #fafafa; }
    .footer { display: grid; grid-template-columns: repeat(2, 1fr); gap: 48px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 40px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD Works Manual Section 16 / Form 16 Work Order</div>
      <h1 class="title">Formal Contract Work Order &amp; Commitment Agreement</h1>
      <div class="meta">Work Order Ref: ${wo.work_order_number} · Award Date: ${wo.commencement_date} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${wo.status === "EXECUTION_ACTIVE" ? "active" : "draft"}">${wo.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Appointed Subcontractor</th><td><strong>${wo.contractor_name}</strong> (Vendor Reg: ${wo.vendor_registration_no})</td><th>Associated Tender NIT Ref</th><td><code>${wo.linked_tender_ref || "Direct Award"}</code></td></tr>
    <tr><th>Package Title</th><td><strong>${wo.work_order_title}</strong></td><th>Trade Package Category</th><td><strong>${wo.trade_package}</strong></td></tr>
    <tr><th>Total Awarded Contract Value</th><td class="tar" style="font-size: 14px; color: #15803d; font-weight: bold;">₹${wo.awarded_cost_inr.toLocaleString("en-IN")}</td><th>Performance Security (PBG)</th><td><code>${wo.performance_security_ref || "Verified 5%"}</code></td></tr>
    <tr><th>Stipulated Commencement Date</th><td><strong>${wo.commencement_date}</strong></td><th>Stipulated Completion Date</th><td><strong>${wo.stipulated_completion_date}</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Factual Scope of Works &amp; Technical Obligations</div>
    <div>${wo.scope_of_work}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Commercial &amp; Statutory Governance Parameter</th>
        <th>Contractual Schedule Provision</th>
        <th class="tar">Rate / Valuation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Contract Retention Deduction</td>
        <td>Deducted from gross value of every intermediate IPC bill</td>
        <td class="tar font-bold">${wo.retention_deduction_pct}% of Gross Bill</td>
      </tr>
      <tr>
        <td>2. Mobilization Advance Sanctioned</td>
        <td>Amortized pro-rata across intermediate Running Account bills</td>
        <td class="tar font-bold">₹${wo.mobilization_advance_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>3. Liquidated Damages (CPWD GCC Clause 2)</td>
        <td>Enforced for unjustified delays beyond critical path float</td>
        <td class="tar font-bold">${wo.liquidated_damages_pct_per_week}% per week (Cap: 10%)</td>
      </tr>
      <tr>
        <td>4. Defects Liability Period (DLP)</td>
        <td>Commences from Taking-Over Certificate (TOC) date</td>
        <td class="tar font-bold">${wo.defects_liability_period_months} Calendar Months</td>
      </tr>
    </tbody>
  </table>

  <div class="box" style="margin-top: 14px;">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Special Conditions &amp; Statutory Commercial Interlocks</div>
    <div>${wo.special_conditions || "Subcontractor must comply with all BOCW Central Rules, CPWD Safety Code Clause 19H, and submit direct bank disbursement proof under Form XVII. Concrete acceptance governed by IS 456."}</div>
  </div>

  <div class="footer">
    <div>
      <div>Accepted on behalf of Subcontractor:</div>
      <div style="color: #64748b;">${wo.contractor_signatory_name || wo.contractor_name}</div>
      <div class="sig">Authorized Partner / Director Seal</div>
    </div>
    <div>
      <div>Issued on behalf of Employer / General Contractor:</div>
      <div style="color: #64748b;">${wo.employer_signatory_name}</div>
      <div class="sig">Corporate Employer Execution Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedOrder) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING CONTRACT WORK ORDERS &amp; COMMITMENTS LEDGER...
      </div>
    );
  }

  const isExecutionActive = selectedOrder.status === "EXECUTION_ACTIVE";
  const billedPct = selectedOrder.awarded_cost_inr > 0 ? Math.round((selectedOrder.cumulative_billed_inr / selectedOrder.awarded_cost_inr) * 100) : 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Contracts &amp; Commitments · CPWD Works Manual Form 16 / FIDIC Clause 4.4</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Subcontractor Work Orders &amp; Commitments Ledger
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Contract award and financial commitment clearinghouse. Converts procurement tender LOIs into legally binding Work Orders, reserves Master BOQ budgets, enforces 5% retention terms, and anchors field measurement books and RA bills.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintWorkOrderDocket(selectedOrder)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form 16 Docket</span>
            </button>
            <Link
              href="/finance/measurement-book"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              <span>e-MB Form 23</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setWoNo(`WO-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-10${orders.length + 1}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Work Order</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Committed Contract Value</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {formatInr(summary.totalCommittedValueInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">{summary.totalWOs} trade package commitments</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Executed &amp; Billed to Date</span>
              <Receipt className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-cyan-300 mt-2">
              {formatInr(summary.totalBilledValueInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Cumulative certified intermediate IPCs</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Unbilled Outstanding Liability</span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {formatInr(summary.unbilledCommitmentInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Remaining contractual commitment</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Active Subcontract Packages</span>
              <Briefcase className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.activeExecution} Packages
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CPWD Form 16 binding agreements</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Work Orders (${orders.length})` },
              { key: "EXECUTION_ACTIVE", label: `Active (${summary.activeExecution})` },
              { key: "DRAFT_ISSUED", label: "Draft Issued" },
              { key: "COMPLETED_CLOSED", label: "Closed" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition ${
                  filterStatus === tab.key
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
              placeholder="Search WO number, contractor, trade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: WO ROSTER (5 cols) vs CONTRACT COMMITMENT & TERMS DESK (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: WORK ORDERS LISTING (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  CPWD Form 16 Ledger
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Subcontract Agreements</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredOrders.length} Orders</span>
            </div>

            <div className="space-y-3">
              {filteredOrders.map((wo) => {
                const isSelected = selectedOrder.id === wo.id;
                const isActive = wo.status === "EXECUTION_ACTIVE";

                return (
                  <div
                    key={wo.id}
                    onClick={() => setSelectedOrder(wo)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {wo.work_order_number}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isActive
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {wo.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-emerald-400">
                          {formatInr(wo.awarded_cost_inr)}
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Billed: {formatInr(wo.cumulative_billed_inr)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{wo.work_order_title}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        {wo.contractor_name} &bull; Trade: <strong className="text-zinc-200">{wo.trade_package}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Commence: <strong className="text-zinc-300">{wo.commencement_date}</strong></span>
                      <span>Target: <strong className="text-zinc-300">{wo.stipulated_completion_date}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: WORK ORDER TERMS & COMMITMENTS DESK (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Work Order Contractual Governance
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedOrder.work_order_number} &mdash; {selectedOrder.trade_package}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isExecutionActive
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : "bg-amber-950 text-amber-400 border border-amber-800/50"
              }`}>
                {selectedOrder.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Contractor Entity:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedOrder.contractor_name} ({selectedOrder.vendor_registration_no})</strong>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Awarded Commitment:</span>
                  <span className="text-emerald-400 font-bold text-sm">{formatInr(selectedOrder.awarded_cost_inr)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Billed Progress ({billedPct}%):</span>
                  <span className="text-cyan-300 font-bold text-sm">{formatInr(selectedOrder.cumulative_billed_inr)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Commencement:</span>
                  <span className="text-white font-bold">{selectedOrder.commencement_date}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Stipulated Target:</span>
                  <span className="text-zinc-200">{selectedOrder.stipulated_completion_date}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">DLP Horizon:</span>
                  <span className="text-white">{selectedOrder.defects_liability_period_months} Months</span>
                </div>
              </div>
            </div>

            {/* CONTRACTUAL PROVISIONS & COMMERCIAL INTERLOCKS WATERFALL */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Binding Commercial Provisions:
              </span>

              <p className="text-zinc-200 font-sans text-xs leading-relaxed">
                {selectedOrder.scope_of_work}
              </p>

              <div className="pt-2 border-t border-zinc-800 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Contract Retention Deduction:</span>
                  <span className="text-white font-bold">{selectedOrder.retention_deduction_pct}% retained on each IPC</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Mobilization Advance Ceiling:</span>
                  <span className="text-cyan-300 font-bold">{formatInr(selectedOrder.mobilization_advance_inr)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Liquidated Damages Rate (CPWD Cl. 2):</span>
                  <span className="text-rose-400 font-bold">{selectedOrder.liquidated_damages_pct_per_week}% / week (Cap: 10%)</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Performance Security Guarantee:</span>
                  <span className="text-emerald-400 font-bold">{selectedOrder.performance_security_ref || "Verified 5%"}</span>
                </div>
              </div>
            </div>

            {/* ACTION STAGE BUTTONS */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Contractual Work Order Actions:
              </span>

              {!isExecutionActive && (
                <button
                  type="button"
                  disabled={!isContractsOrDirector || actionInProgress === `accept_${selectedOrder.id}`}
                  onClick={() => handleAcceptWorkOrder(selectedOrder)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                >
                  <Award className="w-4 h-4" />
                  <span>Execute Work Order &amp; Lock Commitment (CPWD Form 16)</span>
                </button>
              )}

              {isExecutionActive && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Work Order Formally Executed &bull; Active Field Subcontract</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Executed by {selectedOrder.employer_signatory_name}. Linked to Electronic Measurement Book and RA billing.
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD Works Manual Section 16 &amp; FIDIC Clause 4.4 Subcontract Protocol
            </div>
          </div>

        </div>

        {/* ISSUE NEW WORK ORDER MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Issue Contract Work Order (Form 16)
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

              <form onSubmit={handleCreateWorkOrder} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Work Order Ref No.</label>
                    <input
                      type="text"
                      required
                      value={woNo}
                      onChange={(e) => setWoNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Linked Tender Ref</label>
                    <input
                      type="text"
                      required
                      value={tenderRef}
                      onChange={(e) => setTenderRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Subcontractor Entity</label>
                    <input
                      type="text"
                      required
                      value={contractor}
                      onChange={(e) => setContractor(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
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
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Work Order Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Detailed Scope of Work</label>
                  <textarea
                    rows={2}
                    required
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Awarded Cost (₹)</label>
                    <input
                      type="number"
                      required
                      value={awardedCost}
                      onChange={(e) => setAwardedCost(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Retention (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={retention}
                      onChange={(e) => setRetention(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Advance (₹)</label>
                    <input
                      type="number"
                      required
                      value={mobAdvance}
                      onChange={(e) => setMobAdvance(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Commencement Date</label>
                    <input
                      type="date"
                      required
                      value={commenceDate}
                      onChange={(e) => setCommenceDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Stipulated Completion Date</label>
                    <input
                      type="date"
                      required
                      value={completeDate}
                      onChange={(e) => setCompleteDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
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
                    disabled={actionInProgress === "creating_wo"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Issue Work Order</span>
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