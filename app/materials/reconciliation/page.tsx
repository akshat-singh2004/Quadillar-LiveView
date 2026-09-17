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

export type StructuralMaterialType =
  | "CEMENT_OPC_PPC"
  | "REBAR_FE500D"
  | "STRUCTURAL_STEEL_SECTIONS"
  | "READY_MIX_CONCRETE_M40"
  | "BITUMEN_VG30";

export type Cl42ReconciliationStatus =
  | "DRAFT_CALCULATED"
  | "WITHIN_PERMISSIBLE_TOLERANCE"
  | "EXCESS_WASTAGE_PENALIZED"
  | "CERTIFIED_DEBITED_IN_RA";

export interface MaterialReconciliationRecord {
  id: string;
  project_id: string;
  statement_code: string;
  work_order_ref: string;
  contractor_name: string;
  trade_package: string;
  material_type: StructuralMaterialType;
  material_name: string;
  unit: string;
  billing_period_start: string;
  billing_period_end: string;
  executed_work_volume: number;
  executed_work_unit: string;
  theoretical_consumption_factor: number;
  theoretical_consumption_qty: number;
  actual_issued_qty: number;
  actual_returned_scrap_qty: number;
  actual_net_consumed_qty: number;
  variance_quantity: number;
  variance_percentage: number;
  permissible_wastage_pct: number;
  excess_unaccounted_qty: number;
  stipulated_base_rate_inr: number;
  penal_recovery_rate_inr: number;
  total_penal_debit_inr: number;
  linked_ra_bill_no?: string | null;
  status: Cl42ReconciliationStatus;
  store_incharge_name?: string | null;
  seor_auditor_name?: string | null;
  audited_at?: string | null;
  audit_notes?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function computeCl42Derivations(
  workVolume: number,
  factor: number,
  issuedQty: number,
  scrapQty: number,
  permissiblePct: number,
  baseRate: number
) {
  const theoreticalQty = Number((workVolume * factor).toFixed(3));
  const actualNetConsumed = Number((issuedQty - scrapQty).toFixed(3));
  const varianceQty = Number((actualNetConsumed - theoreticalQty).toFixed(3));
  const variancePct = theoreticalQty > 0 ? Number(((varianceQty / theoreticalQty) * 100).toFixed(2)) : 0;

  const permissibleQty = Number((theoreticalQty * (1 + permissiblePct / 100)).toFixed(3));
  const excessQty = Number(Math.max(0, actualNetConsumed - permissibleQty).toFixed(3));
  const penalRate = Math.round(baseRate * 2.0); // CPWD Clause 42 double-rate penal recovery
  const totalPenalDebit = Math.round(excessQty * penalRate);

  const status: Cl42ReconciliationStatus =
    excessQty > 0 ? "EXCESS_WASTAGE_PENALIZED" : "WITHIN_PERMISSIBLE_TOLERANCE";

  return {
    theoreticalQty,
    actualNetConsumed,
    varianceQty,
    variancePct,
    excessQty,
    penalRate,
    totalPenalDebit,
    status,
  };
}

function normalizeReconciliationRecord(d: any): MaterialReconciliationRecord {
  const workVol = Number(d?.executed_work_volume ?? 0);
  const factor = Number(d?.theoretical_consumption_factor ?? 1.0);
  const issued = Number(d?.actual_issued_qty ?? 0);
  const scrap = Number(d?.actual_returned_scrap_qty ?? 0);
  const permPct = Number(d?.permissible_wastage_pct ?? 2.0);
  const baseRate = Number(d?.stipulated_base_rate_inr ?? 0);

  const calc = computeCl42Derivations(workVol, factor, issued, scrap, permPct, baseRate);

  return {
    id: d?.id ?? `rec-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    statement_code: d?.statement_code ?? `REC-${Date.now().toString().slice(-4)}`,
    work_order_ref: d?.work_order_ref ?? "WO-01",
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    material_type: (d?.material_type as StructuralMaterialType) ?? "REBAR_FE500D",
    material_name: d?.material_name ?? "Fe500D High-Yield Rebar",
    unit: d?.unit ?? "MT",
    billing_period_start: d?.billing_period_start ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    billing_period_end: d?.billing_period_end ?? new Date().toISOString().slice(0, 10),
    executed_work_volume: workVol,
    executed_work_unit: d?.executed_work_unit ?? "m³",
    theoretical_consumption_factor: factor,
    theoretical_consumption_qty: Number(d?.theoretical_consumption_qty ?? calc.theoreticalQty),
    actual_issued_qty: issued,
    actual_returned_scrap_qty: scrap,
    actual_net_consumed_qty: Number(d?.actual_net_consumed_qty ?? calc.actualNetConsumed),
    variance_quantity: Number(d?.variance_quantity ?? calc.varianceQty),
    variance_percentage: Number(d?.variance_percentage ?? calc.variancePct),
    permissible_wastage_pct: permPct,
    excess_unaccounted_qty: Number(d?.excess_unaccounted_qty ?? calc.excessQty),
    stipulated_base_rate_inr: baseRate,
    penal_recovery_rate_inr: Number(d?.penal_recovery_rate_inr ?? calc.penalRate),
    total_penal_debit_inr: Number(d?.total_penal_debit_inr ?? calc.totalPenalDebit),
    linked_ra_bill_no: d?.linked_ra_bill_no ?? null,
    status: (d?.status as Cl42ReconciliationStatus) ?? calc.status,
    store_incharge_name: d?.store_incharge_name ?? null,
    seor_auditor_name: d?.seor_auditor_name ?? null,
    audited_at: d?.audited_at ?? null,
    audit_notes: d?.audit_notes ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalMaterialReconciliationPage() {
  const { project, role, tier } = useActiveRole();
  const [records, setRecords] = useState<MaterialReconciliationRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MaterialReconciliationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterMaterial, setFilterMaterial] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Lead Quantity Surveyor";
  const isFinanceOrConsultant =
    roleId === "QS_BILLING" ||
    roleId === "QS_BILLING_HEAD" ||
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleLabel.includes("Finance") ||
    roleLabel.includes("Accounts") ||
    roleLabel.includes("Director") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("Surveyor");

  // Form State for Recording New Reconciliation Statement
  const [recCode, setRecCode] = useState(`REC-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-0${Math.floor(1 + Math.random() * 9)}`);
  const [woRef, setWoRef] = useState(tier === "RESIDENTIAL" ? "WO-RES-001" : "WO-TWR-101");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [matType, setMatType] = useState<StructuralMaterialType>(
    tier === "RESIDENTIAL" ? "STRUCTURAL_STEEL_SECTIONS" : "REBAR_FE500D"
  );
  const [matName, setMatName] = useState(
    tier === "RESIDENTIAL" ? "Action TESA 18mm Boilo HDHMR Boards" : "Tata Tiscon Fe500D TMT Rebar (8mm-32mm)"
  );
  const [unit, setUnit] = useState(tier === "RESIDENTIAL" ? "Sqm" : "MT");
  const [workVolume, setWorkVolume] = useState<number>(tier === "RESIDENTIAL" ? 120.0 : 175.5);
  const [workUnit, setWorkUnit] = useState(tier === "RESIDENTIAL" ? "Sqm" : "m³");
  const [factor, setFactor] = useState<number>(tier === "RESIDENTIAL" ? 1.05 : 0.125);
  const [issuedQty, setIssuedQty] = useState<number>(tier === "RESIDENTIAL" ? 132.0 : 23.2);
  const [scrapQty, setScrapQty] = useState<number>(tier === "RESIDENTIAL" ? 2.5 : 0.4);
  const [permissiblePct, setPermissiblePct] = useState<number>(2.0);
  const [baseRate, setBaseRate] = useState<number>(tier === "RESIDENTIAL" ? 1400 : 72500);
  const [targetRaBill, setTargetRaBill] = useState(tier === "RESIDENTIAL" ? "RA-RES-03" : "RA-TWR-06");

  const loadReconciliationData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("material_reconciliation_records")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeReconciliationRecord(d));
        setRecords(normalized);
        if (!selectedRecord) setSelectedRecord(normalized[0]);
      } else {
        const defaults: MaterialReconciliationRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeReconciliationRecord({
                  id: "rec-res-01",
                  project_id: projectId,
                  statement_code: "REC-RES-2026-01",
                  work_order_ref: "WO-RES-001",
                  contractor_name: "Royal Woodworks & Interiors",
                  trade_package: "Custom Joinery & Millwork",
                  material_type: "STRUCTURAL_STEEL_SECTIONS",
                  material_name: "Action TESA 18mm Boilo HDHMR Panels",
                  unit: "Sqm",
                  billing_period_start: "2026-08-15",
                  billing_period_end: "2026-09-12",
                  executed_work_volume: 120.0,
                  executed_work_unit: "Sqm",
                  theoretical_consumption_factor: 1.05,
                  theoretical_consumption_qty: 126.0,
                  actual_issued_qty: 132.0,
                  actual_returned_scrap_qty: 3.5,
                  actual_net_consumed_qty: 128.5,
                  variance_quantity: 2.5,
                  variance_percentage: 1.98,
                  permissible_wastage_pct: 2.0,
                  excess_unaccounted_qty: 0,
                  stipulated_base_rate_inr: 1400,
                  penal_recovery_rate_inr: 2800,
                  total_penal_debit_inr: 0,
                  linked_ra_bill_no: "RA-RES-03",
                  status: "WITHIN_PERMISSIBLE_TOLERANCE",
                  store_incharge_name: "Store Keeper",
                  seor_auditor_name: "Principal Architect",
                  audited_at: "2026-09-12T15:00:00Z",
                  audit_notes: "Net consumption within 2.0% allowable architectural cutting wastage.",
                }),
              ]
            : [
                normalizeReconciliationRecord({
                  id: "rec-twr-01",
                  project_id: projectId,
                  statement_code: "REC-TWR-2026-01",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  material_type: "REBAR_FE500D",
                  material_name: "Tata Tiscon Fe500D TMT Reinforcement",
                  unit: "MT",
                  billing_period_start: "2026-08-01",
                  billing_period_end: "2026-08-31",
                  executed_work_volume: 175.5,
                  executed_work_unit: "m³",
                  theoretical_consumption_factor: 0.125,
                  theoretical_consumption_qty: 21.938,
                  actual_issued_qty: 23.5,
                  actual_returned_scrap_qty: 0.4,
                  actual_net_consumed_qty: 23.1,
                  variance_quantity: 1.162,
                  variance_percentage: 5.29,
                  permissible_wastage_pct: 2.0,
                  excess_unaccounted_qty: 0.76,
                  stipulated_base_rate_inr: 72500,
                  penal_recovery_rate_inr: 145000,
                  total_penal_debit_inr: 110200,
                  linked_ra_bill_no: "RA-TWR-06",
                  status: "EXCESS_WASTAGE_PENALIZED",
                  store_incharge_name: "Chief Store Officer",
                  seor_auditor_name: "Resident SEOR",
                  audited_at: "2026-09-08T16:00:00Z",
                  audit_notes: "Unjustified cutting wastage beyond 2.0% threshold. Double-rate penal recovery debited on RA-06.",
                }),
                normalizeReconciliationRecord({
                  id: "rec-twr-02",
                  project_id: projectId,
                  statement_code: "REC-TWR-2026-02",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  material_type: "READY_MIX_CONCRETE_M40",
                  material_name: "Design Mix Concrete Grade M40",
                  unit: "m³",
                  billing_period_start: "2026-08-01",
                  billing_period_end: "2026-08-31",
                  executed_work_volume: 175.5,
                  executed_work_unit: "m³",
                  theoretical_consumption_factor: 1.0,
                  theoretical_consumption_qty: 175.5,
                  actual_issued_qty: 178.0,
                  actual_returned_scrap_qty: 0,
                  actual_net_consumed_qty: 178.0,
                  variance_quantity: 2.5,
                  variance_percentage: 1.42,
                  permissible_wastage_pct: 2.0,
                  excess_unaccounted_qty: 0,
                  stipulated_base_rate_inr: 6966,
                  penal_recovery_rate_inr: 13932,
                  total_penal_debit_inr: 0,
                  linked_ra_bill_no: "RA-TWR-06",
                  status: "WITHIN_PERMISSIBLE_TOLERANCE",
                  store_incharge_name: "Batching Plant QA",
                  seor_auditor_name: "Resident SEOR",
                  audited_at: "2026-09-08T16:30:00Z",
                  audit_notes: "Transit slip reconciliation complete. 1.42% over-break within permissible pumping tolerance.",
                }),
              ];

        setRecords(defaults);
        if (!selectedRecord) setSelectedRecord(defaults[0]);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedRecord, tier]);

  useEffect(() => {
    void loadReconciliationData();

    const channel = supabase
      .channel(`mat_rec_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "material_reconciliation_records" }, () => void loadReconciliationData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadReconciliationData]);

  const summary = useMemo(() => {
    const totalStatements = records.length;
    const penalizedCount = records.filter((r) => r.status === "EXCESS_WASTAGE_PENALIZED" || r.total_penal_debit_inr > 0).length;
    const totalPenalDebitsInr = records.reduce((sum, r) => sum + Number(r.total_penal_debit_inr || 0), 0);
    const compliantCount = records.filter((r) => r.status === "WITHIN_PERMISSIBLE_TOLERANCE").length;

    return { totalStatements, penalizedCount, totalPenalDebitsInr, compliantCount };
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchStatus = filterStatus === "ALL" || r.status === filterStatus;
      const matchMaterial = filterMaterial === "ALL" || r.material_type === filterMaterial;
      const haystack = `${r.statement_code} ${r.material_name} ${r.contractor_name} ${r.work_order_ref}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchMaterial && matchSearch;
    });
  }, [records, filterStatus, filterMaterial, search]);

  // Stage 1: SEOR Certifies Reconciliation & Enforces RA Bill Debit
  const handleCertifyPenalDebit = async (rec: MaterialReconciliationRecord) => {
    if (!isFinanceOrConsultant) return;
    setActionInProgress(`certify_${rec.id}`);

    const updatePayload: Partial<MaterialReconciliationRecord> = {
      status: "CERTIFIED_DEBITED_IN_RA",
      seor_auditor_name: roleLabel || "Resident SEOR",
      audited_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("material_reconciliation_records")
        .update(updatePayload)
        .eq("id", rec.id);

      // Auto-update penal debit on the linked RA bill if specified
      if (rec.linked_ra_bill_no && rec.total_penal_debit_inr > 0) {
        await (supabase as any)
          .from("running_account_bills")
          .update({
            cl42_wastage_penalties_inr: rec.total_penal_debit_inr,
          })
          .eq("project_id", projectId)
          .eq("bill_number", rec.linked_ra_bill_no);
      }
    } catch {
      // Local optimistic update
    }

    setRecords((prev) =>
      prev.map((item) => (item.id === rec.id ? ({ ...item, ...updatePayload } as MaterialReconciliationRecord) : item))
    );
    if (selectedRecord && selectedRecord.id === rec.id) {
      setSelectedRecord((prev) => (prev ? ({ ...prev, ...updatePayload } as MaterialReconciliationRecord) : null));
    }

    setFeedbackMessage(`Statement ${rec.statement_code} certified. Penal debit of ${formatInr(rec.total_penal_debit_inr)} transferred to ${rec.linked_ra_bill_no || "RA Bill"}.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Record New Material Reconciliation Filing
  const handleCreateReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_rec");

    const calc = computeCl42Derivations(
      Number(workVolume),
      Number(factor),
      Number(issuedQty),
      Number(scrapQty),
      Number(permissiblePct),
      Number(baseRate)
    );

    const newDbRecord: Omit<MaterialReconciliationRecord, "id"> = {
      project_id: projectId,
      statement_code: recCode.trim(),
      work_order_ref: woRef.trim(),
      contractor_name: contractor.trim(),
      trade_package: tradePackage.trim(),
      material_type: matType,
      material_name: matName.trim(),
      unit: unit.trim(),
      billing_period_start: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
      billing_period_end: new Date().toISOString().slice(0, 10),
      executed_work_volume: Number(workVolume),
      executed_work_unit: workUnit.trim(),
      theoretical_consumption_factor: Number(factor),
      theoretical_consumption_qty: calc.theoreticalQty,
      actual_issued_qty: Number(issuedQty),
      actual_returned_scrap_qty: Number(scrapQty),
      actual_net_consumed_qty: calc.actualNetConsumed,
      variance_quantity: calc.varianceQty,
      variance_percentage: calc.variancePct,
      permissible_wastage_pct: Number(permissiblePct),
      excess_unaccounted_qty: calc.excessQty,
      stipulated_base_rate_inr: Number(baseRate),
      penal_recovery_rate_inr: calc.penalRate,
      total_penal_debit_inr: calc.totalPenalDebit,
      linked_ra_bill_no: targetRaBill.trim() || null,
      status: calc.status,
      store_incharge_name: roleLabel || "Store In-Charge",
      audit_notes: calc.excessQty > 0 ? "Excess cutting wastage recorded beyond statutory limits." : "Within standard tolerances.",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("material_reconciliation_records")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeReconciliationRecord(data);
        setRecords((prev) => [normalized, ...prev]);
        setSelectedRecord(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeReconciliationRecord({ ...newDbRecord, id: `rec-${Date.now()}` });
      setRecords((prev) => [fallback, ...prev]);
      setSelectedRecord(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory CPWD Form 33 / Clause 42 Printable Statement
  const handlePrintForm33 = (rec: MaterialReconciliationRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Material Theoretical Reconciliation Statement (CPWD Clause 42 / Form 33) — ${rec.statement_code}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .penalized { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
    .pass { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .tac { text-align: center; font-family: monospace; }
    .total-row { background: #f1f5f9; font-weight: bold; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-top: 14px; background: #fafafa; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 40px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD GCC Clause 42 / Form 33 Statement</div>
      <h1 class="title">Statutory Material Reconciliation &amp; Penal Recovery Statement</h1>
      <div class="meta">Statement Ref: ${rec.statement_code} · Period: ${rec.billing_period_start} to ${rec.billing_period_end} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${rec.excess_unaccounted_qty > 0 ? "penalized" : "pass"}">${rec.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Executing Contractor</th><td><strong>${rec.contractor_name}</strong></td><th>Parent Work Order Ref</th><td><strong>${rec.work_order_ref}</strong></td></tr>
    <tr><th>Structural Material Description</th><td><strong>${rec.material_name} (${rec.material_type.replace(/_/g, " ")})</strong></td><th>Associated RA Bill No.</th><td><strong>${rec.linked_ra_bill_no || "Next IPC"}</strong></td></tr>
    <tr><th>Certified Executed Work (e-MB)</th><td><strong>${rec.executed_work_volume} ${rec.executed_work_unit}</strong></td><th>Theoretical Coefficient Factor</th><td><strong>${rec.theoretical_consumption_factor} ${rec.unit}/${rec.executed_work_unit}</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Audited Technical Remarks &amp; Weighbridge Reference</div>
    <div>${rec.audit_notes || "Theoretical material requirement audited against certified e-MB Form 23 entries. Weighbridge inward dockets verified."}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Consumption &amp; Recovery Parameter</th>
        <th>Audit Benchmark / Derivation Formula</th>
        <th class="tar">Quantity (${rec.unit})</th>
        <th class="tar">Valuation (INR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Statutory Theoretical Requirement</td>
        <td>Certified Work Volume &times; Consumption Constant</td>
        <td class="tar font-bold">${rec.theoretical_consumption_qty} ${rec.unit}</td>
        <td class="tar">₹${(rec.theoretical_consumption_qty * rec.stipulated_base_rate_inr).toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>2. Total Issued to Contractor (Gate Inward)</td>
        <td>Weighbridge delivery slips &amp; store requisitions</td>
        <td class="tar">${rec.actual_issued_qty} ${rec.unit}</td>
        <td class="tar">—</td>
      </tr>
      <tr>
        <td>3. Less: Unused &amp; Scrapped Returns to Store</td>
        <td>Authenticated store return memos</td>
        <td class="tar" style="color: #15803d;">-${rec.actual_returned_scrap_qty} ${rec.unit}</td>
        <td class="tar">—</td>
      </tr>
      <tr class="total-row">
        <td><strong>4. Net Actual Material Consumed at Site</strong></td>
        <td>Gross Issues minus Material Returns</td>
        <td class="tar font-bold" style="color: #0369a1;">${rec.actual_net_consumed_qty} ${rec.unit}</td>
        <td class="tar font-bold">₹${(rec.actual_net_consumed_qty * rec.stipulated_base_rate_inr).toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>5. Permissible Statutory Wastage Allowance</td>
        <td>CPWD Cl. 42 Allowance: +${rec.permissible_wastage_pct}%</td>
        <td class="tar">${(rec.theoretical_consumption_qty * (rec.permissible_wastage_pct / 100)).toFixed(3)} ${rec.unit}</td>
        <td class="tar">—</td>
      </tr>
      <tr class="total-row" style="background: ${rec.excess_unaccounted_qty > 0 ? "#fee2e2" : "#dcfce7"};">
        <td><strong>6. Excess Unaccounted Consumption / Wastage</strong></td>
        <td>Actual Net minus (Theoretical + Permissible)</td>
        <td class="tar font-bold" style="color: ${rec.excess_unaccounted_qty > 0 ? "#b91c1c" : "#15803d"}; font-size: 12px;">
          ${rec.excess_unaccounted_qty > 0 ? `+${rec.excess_unaccounted_qty} ${rec.unit}` : `0.000 ${rec.unit} (PASS)`}
        </td>
        <td class="tar font-bold" style="color: ${rec.excess_unaccounted_qty > 0 ? "#b91c1c" : "#15803d"};">
          ${rec.variance_percentage}% Variance
        </td>
      </tr>
      ${rec.excess_unaccounted_qty > 0 ? `
      <tr class="total-row" style="background: #fee2e2; color: #b91c1c;">
        <td colspan="3"><strong style="font-size: 12px;">CPWD CLAUSE 42 DOUBLE-RATE PENAL RECOVERY (2 &times; ₹${rec.stipulated_base_rate_inr.toLocaleString("en-IN")})</strong></td>
        <td class="tar" style="font-size: 14px;"><strong>-₹${rec.total_penal_debit_inr.toLocaleString("en-IN")}</strong></td>
      </tr>` : ""}
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>Site Store In-Charge</div>
      <div style="color: #64748b;">${rec.store_incharge_name || "Weighbridge Inward Authenticated"}</div>
      <div class="sig">Store Verification Seal</div>
    </div>
    <div>
      <div>Lead Quantity Surveyor</div>
      <div style="color: #64748b;">Theoretical Constants Reconciled</div>
      <div class="sig">QS Audit Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">${rec.seor_auditor_name || "Clause 42 Sanction Signed"}</div>
      <div class="sig">Engineer Sanction &amp; Debit Seal</div>
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
        INITIALIZING STATUTORY MATERIAL RECONCILIATION &amp; CLAUSE 42 ENGINE...
      </div>
    );
  }

  const isPenalized = selectedRecord.excess_unaccounted_qty > 0;
  const isDebitedInRa = selectedRecord.status === "CERTIFIED_DEBITED_IN_RA";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Materials Governance · CPWD GCC Clause 42 / Form 33 Reconciliation</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Material Reconciliation &amp; Clause 42 Penal Recovery
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Statutory material consumption clearinghouse. Derives theoretical cement and steel quantities from certified e-MB measurements, evaluates permissible wastage limits, and enforces mandatory 2&times; double-rate penal debits on running bills.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintForm33(selectedRecord)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form 33 Statement</span>
            </button>
            <Link
              href="/finance/ra-bills"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Receipt className="w-3.5 h-3.5 text-cyan-400" />
              <span>RA Bills Clearinghouse</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setRecCode(`REC-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-0${records.length + 1}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>File Reconciliation Statement</span>
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
              <span>Clause 42 Penal Debits</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.totalPenalDebitsInr > 0 ? "text-rose-400" : "text-zinc-400"}`}>
              {formatInr(summary.totalPenalDebitsInr)}
            </div>
            <div className="text-[11px] text-rose-500/80 mt-1">Double-rate statutory penalties</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Wastage Tolerances Maintained</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {summary.compliantCount} Statements
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Within &plusmn;2% statutory allowance</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Excess Wastage Penalties Flagged</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.penalizedCount > 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {summary.penalizedCount} Material(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Shortfalls or unaccounted consumption</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Reconciled Filings</span>
              <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.totalStatements} Records
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CPWD Form 33 statutory returns</div>
          </div>
        </div>

        {/* CLAUSE 42 PENAL ALERT CALLOUT */}
        {isPenalized && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <strong className="text-rose-200 text-xs uppercase tracking-wider block">
                  CPWD Clause 42 Statutory Breach: Excess Material Wastage Flagged
                </strong>
                <span className="text-xs text-rose-300/80 font-sans">
                  The contractor has consumed {selectedRecord.excess_unaccounted_qty} {selectedRecord.unit} beyond the permissible {selectedRecord.permissible_wastage_pct}% wastage allowance. Under CPWD GCC Clause 42, a mandatory double-rate penal recovery of {formatInr(selectedRecord.total_penal_debit_inr)} must be deducted from the contractor&apos;s RA Bill.
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={isDebitedInRa || actionInProgress === `certify_${selectedRecord.id}`}
              onClick={() => handleCertifyPenalDebit(selectedRecord)}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 transition font-mono disabled:opacity-50"
            >
              {isDebitedInRa ? "Debited on RA Bill" : "Enforce Penal Debit"}
            </button>
          </div>
        )}

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Filings (${records.length})` },
              { key: "EXCESS_WASTAGE_PENALIZED", label: `Penalized (${summary.penalizedCount})` },
              { key: "WITHIN_PERMISSIBLE_TOLERANCE", label: "Compliant" },
              { key: "CERTIFIED_DEBITED_IN_RA", label: "Debited in RA" },
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

          <div className="flex items-center gap-2">
            <select
              value={filterMaterial}
              onChange={(e) => setFilterMaterial(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-400 font-mono"
            >
              <option value="ALL">All Materials</option>
              <option value="REBAR_FE500D">Fe500D Rebar</option>
              <option value="READY_MIX_CONCRETE_M40">RMC Concrete</option>
              <option value="CEMENT_OPC_PPC">Cement OPC/PPC</option>
              <option value="STRUCTURAL_STEEL_SECTIONS">Structural Sections</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search code, material, contractor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: STATEMENTS ROSTER (7 cols) vs THEORETICAL AUDIT DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: RECONCILIATION STATEMENTS LISTING (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  CPWD Form 33 Reconciliation Register
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Audited Material Statements</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredRecords.length} Statements</span>
            </div>

            <div className="space-y-3">
              {filteredRecords.map((rec) => {
                const isSelected = selectedRecord.id === rec.id;
                const isPenal = rec.excess_unaccounted_qty > 0;

                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedRecord(rec)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {rec.statement_code}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {rec.material_type.replace(/_/g, " ")}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          rec.status === "CERTIFIED_DEBITED_IN_RA"
                            ? "bg-purple-950 text-purple-400 border border-purple-800/50"
                            : isPenal
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                            : "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                        }`}>
                          {rec.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className={`text-xs font-bold ${isPenal ? "text-rose-400" : "text-emerald-400"}`}>
                          {isPenal ? `-${formatInr(rec.total_penal_debit_inr)} Penal` : "Within Limits"}
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Variance: {rec.variance_percentage > 0 ? `+${rec.variance_percentage}%` : `${rec.variance_percentage}%`}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{rec.material_name}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        Contractor: <strong className="text-zinc-200">{rec.contractor_name}</strong> &bull; {rec.work_order_ref}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Theoretical: <strong className="text-zinc-300">{rec.theoretical_consumption_qty} {rec.unit}</strong></span>
                      <span>Actual Consumed: <strong className="text-zinc-300">{rec.actual_net_consumed_qty} {rec.unit}</strong></span>
                      <span>Target Bill: <strong className="text-cyan-300">{rec.linked_ra_bill_no || "Next IPC"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: THEORETICAL AUDIT & PENAL DEBIT DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  CPWD Clause 42 Audit Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedRecord.statement_code}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isPenalized
                  ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                  : "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
              }`}>
                {selectedRecord.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Material Name:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedRecord.material_name}</strong>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Parent Work Order:</span>
                  <span className="text-cyan-300 font-bold">{selectedRecord.work_order_ref}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Contractor:</span>
                  <span className="text-white font-sans">{selectedRecord.contractor_name}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Certified e-MB Work:</span>
                  <span className="text-white font-bold">{selectedRecord.executed_work_volume} {selectedRecord.executed_work_unit}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Consumption Factor:</span>
                  <span className="text-zinc-200">{selectedRecord.theoretical_consumption_factor} {selectedRecord.unit}/{selectedRecord.executed_work_unit}</span>
                </div>
              </div>
            </div>

            {/* THEORETICAL CONSUMPTION & PENAL WATERFALL */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Statutory Consumption Breakdown:
              </span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>1. Statutory Theoretical Requirement:</span>
                  <span className="text-white font-bold">{selectedRecord.theoretical_consumption_qty} {selectedRecord.unit}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>2. Total Issued to Contractor:</span>
                  <span className="text-zinc-300">{selectedRecord.actual_issued_qty} {selectedRecord.unit}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>3. Less: Authenticated Scrap/Returns:</span>
                  <span className="text-emerald-400">-{selectedRecord.actual_returned_scrap_qty} {selectedRecord.unit}</span>
                </div>
                <div className="flex justify-between text-white font-bold pt-1 border-t border-zinc-800">
                  <span>4. Actual Net Consumed:</span>
                  <span className="text-cyan-300">{selectedRecord.actual_net_consumed_qty} {selectedRecord.unit}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>5. Permissible Wastage Allowance:</span>
                  <span className="text-zinc-200">&plusmn;{selectedRecord.permissible_wastage_pct}%</span>
                </div>

                <div className="flex justify-between items-baseline pt-1 border-t border-zinc-800">
                  <span>6. Excess Wastage Shortfall:</span>
                  <span className={`font-bold ${isPenalized ? "text-rose-400" : "text-emerald-400"}`}>
                    {selectedRecord.excess_unaccounted_qty > 0 ? `+${selectedRecord.excess_unaccounted_qty} ${selectedRecord.unit}` : "0.000 MT (COMPLIANT)"}
                  </span>
                </div>

                {isPenalized && (
                  <div className="flex justify-between text-rose-400 font-extrabold text-sm pt-1.5 border-t border-zinc-800">
                    <span>Double-Rate Penal Debit (2&times; Rate):</span>
                    <span>-{formatInr(selectedRecord.total_penal_debit_inr)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ACTION STAGE BUTTONS */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Statutory Deduction Protocol:
              </span>

              {isPenalized && !isDebitedInRa && (
                <button
                  type="button"
                  disabled={!isFinanceOrConsultant || actionInProgress === `certify_${selectedRecord.id}`}
                  onClick={() => handleCertifyPenalDebit(selectedRecord)}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/50 font-mono disabled:opacity-50"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>Enforce Clause 42 Debit on {selectedRecord.linked_ra_bill_no || "RA Bill"}</span>
                </button>
              )}

              {isDebitedInRa && (
                <div className="p-3.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Penal Debit Deducted on {selectedRecord.linked_ra_bill_no}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Certified by {selectedRecord.seor_auditor_name || "Resident SEOR"} on {selectedRecord.audited_at ? new Date(selectedRecord.audited_at).toLocaleDateString("en-IN") : "Today"}
                  </div>
                </div>
              )}

              {!isPenalized && (
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-center text-xs space-y-1">
                  <div className="font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Consumption Within Permissible Limits</span>
                  </div>
                  <div className="text-[10px]">Zero statutory deductions warranted under CPWD Clause 42.</div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD GCC Clause 42 &amp; Works Manual Section 14 Protocol
            </div>
          </div>

        </div>

        {/* FILE RECONCILIATION MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    File Material Reconciliation (Form 33)
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

              <form onSubmit={handleCreateReconciliation} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Statement Code</label>
                    <input
                      type="text"
                      required
                      value={recCode}
                      onChange={(e) => setRecCode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Material Type</label>
                    <select
                      value={matType}
                      onChange={(e) => setMatType(e.target.value as StructuralMaterialType)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="REBAR_FE500D">Fe500D TMT Rebar</option>
                      <option value="READY_MIX_CONCRETE_M40">Ready-Mix Concrete</option>
                      <option value="CEMENT_OPC_PPC">Cement (OPC / PPC)</option>
                      <option value="STRUCTURAL_STEEL_SECTIONS">Structural Steel Sections</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Material Specification &amp; Brand</label>
                  <input
                    type="text"
                    required
                    value={matName}
                    onChange={(e) => setMatName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Work Order Ref</label>
                    <input
                      type="text"
                      required
                      value={woRef}
                      onChange={(e) => setWoRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Contractor Entity</label>
                    <input
                      type="text"
                      required
                      value={contractor}
                      onChange={(e) => setContractor(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">e-MB Work Vol</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={workVolume}
                      onChange={(e) => setWorkVolume(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Constant Factor</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={factor}
                      onChange={(e) => setFactor(Number(e.target.value))}
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
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Actual Issued Qty</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={issuedQty}
                      onChange={(e) => setIssuedQty(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Returned Scrap Qty</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={scrapQty}
                      onChange={(e) => setScrapQty(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Stipulated Base Rate (₹)</label>
                    <input
                      type="number"
                      required
                      value={baseRate}
                      onChange={(e) => setBaseRate(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Target RA Bill Ref</label>
                    <input
                      type="text"
                      required
                      value={targetRaBill}
                      onChange={(e) => setTargetRaBill(e.target.value)}
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
                    disabled={actionInProgress === "creating_rec"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Statement</span>
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