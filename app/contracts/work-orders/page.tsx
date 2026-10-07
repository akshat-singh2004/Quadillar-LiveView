"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Award,
  Briefcase,
  CheckCircle2,
  Clock,
  Coins,
  Database,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Scale,
  Search,
  X,
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
  status: WorkOrderStatus;
  employer_signatory_name: string;
}

const FALLBACK_WORK_ORDERS: WorkOrderRecord[] = [
  {
    id: "wo-fb-1",
    project_id: "PRJ-01-LIVE",
    work_order_number: "WO-TWR-101",
    linked_tender_ref: "RFP-2026-001",
    contractor_name: "Apex Structural Formworks Ltd.",
    vendor_registration_no: "VEND-2026-001",
    trade_package: "Civil & Superstructure",
    work_order_title: "Reinforced Concrete & Monolithic Core Walls",
    scope_of_work: "Complete execution of casting, monolithic formwork, and curing up to Level 32 per IS 456.",
    location_grid: "Site-Wide",
    awarded_cost_inr: 13800000,
    cumulative_billed_inr: 3450000,
    retention_deduction_pct: 5.0,
    mobilization_advance_inr: 1380000,
    performance_security_ref: "PBG-2026-8812",
    commencement_date: "2026-04-01",
    stipulated_completion_date: "2026-12-31",
    status: "EXECUTION_ACTIVE",
    employer_signatory_name: "Project Director",
  },
  {
    id: "wo-fb-2",
    project_id: "PRJ-01-LIVE",
    work_order_number: "WO-MEP-102",
    linked_tender_ref: "RFP-2026-002",
    contractor_name: "Thermax MEP Solutions",
    vendor_registration_no: "VEND-2026-002",
    trade_package: "HVAC & Chilled Water",
    work_order_title: "Basement HVAC Ventilation & Chillers",
    scope_of_work: "Supply and installation of dual chiller units and exhaust ventilation.",
    location_grid: "Basement B1-B3",
    awarded_cost_inr: 8100000,
    cumulative_billed_inr: 0,
    retention_deduction_pct: 5.0,
    mobilization_advance_inr: 810000,
    performance_security_ref: "PBG-2026-9912",
    commencement_date: "2026-05-15",
    stipulated_completion_date: "2026-11-30",
    status: "DRAFT_ISSUED",
    employer_signatory_name: "Project Director",
  },
];

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function CanonicalWorkOrdersPage() {
  const { project, role } = useActiveRole();
  const [orders, setOrders] = useState<WorkOrderRecord[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  // Form State
  const [woNo, setWoNo] = useState(`WO-TWR-10${Math.floor(1 + Math.random() * 9)}`);
  const [contractor, setContractor] = useState("");
  const [tradePackage, setTradePackage] = useState("");
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [awardedCost, setAwardedCost] = useState<number>(0);

  const loadWorkOrdersData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("contract_work_orders")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setOrders(FALLBACK_WORK_ORDERS);
        setSelectedOrder(FALLBACK_WORK_ORDERS[0]);
      } else {
        setIsFallbackMode(false);
        setOrders(data);
        setSelectedOrder(data[0]);
      }
    } catch {
      setIsFallbackMode(true);
      setOrders(FALLBACK_WORK_ORDERS);
      setSelectedOrder(FALLBACK_WORK_ORDERS[0]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadWorkOrdersData();
  }, [loadWorkOrdersData]);

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

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_wo");

    const newRecord: Partial<WorkOrderRecord> = {
      project_id: projectId,
      work_order_number: woNo.trim(),
      contractor_name: contractor.trim(),
      vendor_registration_no: `VEND-2026-${Math.floor(100 + Math.random() * 900)}`,
      trade_package: tradePackage.trim(),
      work_order_title: title.trim(),
      scope_of_work: scope.trim(),
      location_grid: "Site-Wide",
      awarded_cost_inr: Number(awardedCost),
      cumulative_billed_inr: 0,
      retention_deduction_pct: 5.0,
      mobilization_advance_inr: Math.round(Number(awardedCost) * 0.1),
      commencement_date: new Date().toISOString().slice(0, 10),
      stipulated_completion_date: "2026-12-31",
      status: "EXECUTION_ACTIVE",
      employer_signatory_name: "Project Director",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("contract_work_orders")
        .insert([newRecord])
        .select()
        .single();

      if (error) throw error;
      setOrders((prev) => [data, ...prev]);
      setSelectedOrder(data);
    } catch {
      const fallback = { ...newRecord, id: `wo-${Date.now()}` } as WorkOrderRecord;
      setOrders((prev) => [fallback, ...prev]);
      setSelectedOrder(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8 font-mono">
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] tracking-widest text-cyan-400 uppercase font-bold">
              <span>Contracts &amp; Commitments · CPWD Works Manual Form 16 / FIDIC Clause 4.4</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Subcontractor Work Orders &amp; Commitments Ledger
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl font-sans">
              Contract award and financial commitment clearinghouse. Converts procurement tender LOIs into legally binding Work Orders, reserves Master BOQ budgets, enforces 5% retention terms, and anchors field measurement books and RA bills.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isFallbackMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-[10px] text-amber-300">
                <Database className="w-3.5 h-3.5" />
                <span>Simulated Offline Telemetry</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => void loadWorkOrdersData()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                setWoNo(`WO-TWR-10${orders.length + 1}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Work Order</span>
            </button>
          </div>
        </div>

        {/* 4 PRIMARY GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
                  CPWD Form 16 Ledger
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Subcontract Agreements</h2>
              </div>
              <span className="text-xs text-zinc-500">{filteredOrders.length} Orders</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-500">Loading work order commitments...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">No work orders recorded. Click &quot;Issue Work Order&quot; to begin.</div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((wo) => {
                  const isSelected = selectedOrder?.id === wo.id;
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
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white">{wo.work_order_number}</span>
                        <span className="text-xs font-bold text-emerald-400">{formatInr(wo.awarded_cost_inr)}</span>
                      </div>
                      <div className="text-xs text-zinc-300 font-sans">{wo.work_order_title}</div>
                      <div className="text-[11px] text-zinc-500">{wo.contractor_name} &bull; {wo.trade_package}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DETAIL DESK */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            {selectedOrder ? (
              <>
                <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
                      Work Order Contractual Governance
                    </span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{selectedOrder.work_order_number} &mdash; {selectedOrder.trade_package}</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                    {selectedOrder.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2 text-xs">
                  <div><span className="text-zinc-500">Contractor:</span> <strong className="text-white ml-1">{selectedOrder.contractor_name}</strong></div>
                  <div><span className="text-zinc-500">Awarded Commitment:</span> <strong className="text-emerald-400 ml-1">{formatInr(selectedOrder.awarded_cost_inr)}</strong></div>
                  <div><span className="text-zinc-500">Scope:</span> <p className="text-zinc-300 font-sans mt-1">{selectedOrder.scope_of_work}</p></div>
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-zinc-500 text-xs">
                Select or issue a work order to review contractual parameters and retention terms.
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
