"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Award,
  Banknote,
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
  Gavel,
  HardHat,
  Landmark,
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

export type SecuredMaterialType =
  | "STEEL_REBAR_FE500D"
  | "STRUCTURAL_STEEL_SECTIONS"
  | "CEMENT_OPC_PPC"
  | "PIPES_AND_SANITARY_FIXTURES"
  | "CERAMIC_TILES_STONE_SLABS"
  | "ELECTRICAL_CABLES_CONDUITS"
  | "JOINERY_BOARDS_HDHMR";

export type SecuredAdvanceStatus =
  | "INDENTURE_EXECUTED_DISBURSED"
  | "PARTIALLY_RECOVERED_CONSUMPTION"
  | "FULLY_RECOVERED_CLOSED"
  | "DEFAULT_HYPOTHECATION_INVOKED";

export interface SecuredAdvanceRecord {
  id: string;
  project_id: string;
  advance_ref_number: string;
  work_order_ref: string;
  contractor_name: string;
  material_type: SecuredMaterialType;
  material_description: string;
  storage_location_grid: string;
  invoice_challan_ref: string;
  gate_pass_ref?: string | null;
  delivered_quantity: number;
  unit: string;
  invoiced_rate_inr: number;
  market_or_dsr_rate_inr: number;
  assessed_base_rate_inr: number;
  total_assessed_value_inr: number;
  advance_percentage: number;
  sanctioned_advance_inr: number;
  consumed_quantity: number;
  cumulative_recovered_inr: number;
  outstanding_advance_inr: number;
  hypothecation_indenture_ref: string;
  insurance_policy_ref: string;
  insurance_expiry_date: string;
  status: SecuredAdvanceStatus;
  sanctioned_date: string;
  inspected_by_engineer: string;
  created_at?: string;
}

export interface SecuredRecoveryRecord {
  id: string;
  project_id: string;
  advance_ref_number: string;
  ra_bill_number: string;
  emb_entry_ref: string;
  recovery_date: string;
  consumed_qty_this_bill: number;
  recovered_amount_inr: number;
  remaining_advance_inr: number;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function computeSecuredAdvance(
  qty: number,
  invoiceRate: number,
  marketRate: number,
  advPct: number
) {
  const assessedRate = Math.min(invoiceRate, marketRate);
  const totalValue = Math.round(qty * assessedRate);
  const sanctionedAdv = Math.round(totalValue * (advPct / 100));
  return { assessedRate, totalValue, sanctionedAdv };
}

function normalizeSecuredRecord(d: any): SecuredAdvanceRecord {
  const qty = Number(d?.delivered_quantity ?? 0);
  const invRate = Number(d?.invoiced_rate_inr ?? 0);
  const mktRate = Number(d?.market_or_dsr_rate_inr ?? invRate);
  const advPct = Number(d?.advance_percentage ?? 75.0);
  const calc = computeSecuredAdvance(qty, invRate, mktRate, advPct);

  const consumed = Number(d?.consumed_quantity ?? 0);
  const recovered = Number(d?.cumulative_recovered_inr ?? Math.round(consumed * calc.assessedRate * (advPct / 100)));
  const outstanding = Math.max(0, Number(d?.outstanding_advance_inr ?? (calc.sanctionedAdv - recovered)));

  let derivedStatus: SecuredAdvanceStatus = (d?.status as SecuredAdvanceStatus) ?? "INDENTURE_EXECUTED_DISBURSED";
  if (outstanding <= 0 && calc.sanctionedAdv > 0) {
    derivedStatus = "FULLY_RECOVERED_CLOSED";
  } else if (recovered > 0) {
    derivedStatus = "PARTIALLY_RECOVERED_CONSUMPTION";
  }

  return {
    id: d?.id ?? `sec-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    advance_ref_number: d?.advance_ref_number ?? `SEC-${Date.now().toString().slice(-4)}`,
    work_order_ref: d?.work_order_ref ?? "WO-01",
    contractor_name: d?.contractor_name ?? "Executing Subcontractor",
    material_type: (d?.material_type as SecuredMaterialType) ?? "STEEL_REBAR_FE500D",
    material_description: d?.material_description ?? "Tata Tiscon Fe500D High-Yield Rebar (16mm-25mm)",
    storage_location_grid: d?.storage_location_grid ?? "Central Stock Yard / Bay 02",
    invoice_challan_ref: d?.invoice_challan_ref ?? "INV-TATA-2026-9912",
    gate_pass_ref: d?.gate_pass_ref ?? "GP-TWR-2026-01",
    delivered_quantity: qty,
    unit: d?.unit ?? "MT",
    invoiced_rate_inr: invRate,
    market_or_dsr_rate_inr: mktRate,
    assessed_base_rate_inr: Number(d?.assessed_base_rate_inr ?? calc.assessedRate),
    total_assessed_value_inr: Number(d?.total_assessed_value_inr ?? calc.totalValue),
    advance_percentage: advPct,
    sanctioned_advance_inr: Number(d?.sanctioned_advance_inr ?? calc.sanctionedAdv),
    consumed_quantity: consumed,
    cumulative_recovered_inr: recovered,
    outstanding_advance_inr: outstanding,
    hypothecation_indenture_ref: d?.hypothecation_indenture_ref ?? "IND-10A-2026-041",
    insurance_policy_ref: d?.insurance_policy_ref ?? "INS-CAR-2026-8812",
    insurance_expiry_date: d?.insurance_expiry_date ?? new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
    status: derivedStatus,
    sanctioned_date: d?.sanctioned_date ?? new Date().toISOString().slice(0, 10),
    inspected_by_engineer: d?.inspected_by_engineer ?? "Resident SEOR",
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalSecuredAdvancePage() {
  const { project, role, tier } = useActiveRole();
  const [advances, setAdvances] = useState<SecuredAdvanceRecord[]>([]);
  const [recoveries, setRecoveries] = useState<SecuredRecoveryRecord[]>([]);
  const [selectedAdvance, setSelectedAdvance] = useState<SecuredAdvanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [consumeModalOpen, setConsumeModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Lead Quantity Surveyor";
  const isFinanceOrDirector =
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "QS_BILLING_HEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleLabel.includes("Finance") ||
    roleLabel.includes("Director") ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("Surveyor") ||
    roleLabel.includes("Lead");

  // Form State for Sanctioning Form 10A Secured Advance
  const [secRef, setSecRef] = useState(`SEC-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-0${Math.floor(1 + Math.random() * 9)}`);
  const [woRef, setWoRef] = useState(tier === "RESIDENTIAL" ? "WO-RES-001" : "WO-TWR-101");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [matType, setMatType] = useState<SecuredMaterialType>(
    tier === "RESIDENTIAL" ? "JOINERY_BOARDS_HDHMR" : "STEEL_REBAR_FE500D"
  );
  const [matDesc, setMatDesc] = useState(
    tier === "RESIDENTIAL"
      ? "Action TESA 18mm Boilo High-Density Moisture-Resistant HDHMR Boards (8ft x 4ft)"
      : "Tata Tiscon Fe500D High-Yield TMT Reinforcement Bars (16mm, 20mm & 25mm)"
  );
  const [gridLoc, setGridLoc] = useState(tier === "RESIDENTIAL" ? "Joinery Stock Yard Bay 01" : "Central Rebar Yard / Bay 02");
  const [invRef, setInvRef] = useState(`INV/TATA/2026/${Math.floor(1000 + Math.random() * 9000)}`);
  const [gatePassRef, setGatePassRef] = useState(tier === "RESIDENTIAL" ? "GP-RES-2026-01" : "GP-TWR-2026-01");
  const [delQty, setDelQty] = useState<number>(tier === "RESIDENTIAL" ? 120.0 : 45.0);
  const [unit, setUnit] = useState(tier === "RESIDENTIAL" ? "Sqm" : "MT");
  const [invRate, setInvRate] = useState<number>(tier === "RESIDENTIAL" ? 1400 : 72500);
  const [mktRate, setMktRate] = useState<number>(tier === "RESIDENTIAL" ? 1450 : 74000);
  const [indentureRef, setIndentureRef] = useState(`IND-10A-${Math.floor(1000 + Math.random() * 9000)}`);
  const [insPolicy, setInsPolicy] = useState("INS-CAR-NEW-INDIA-2026-881");

  // Form State for Recording Consumption Recovery
  const [targetRaBill, setTargetRaBill] = useState(tier === "RESIDENTIAL" ? "RA-RES-03" : "RA-TWR-06");
  const [embRef, setEmbRef] = useState(tier === "RESIDENTIAL" ? "MB-RES-2026-041" : "MB-TWR-2026-109");
  const [consumedQtyThisBill, setConsumedQtyThisBill] = useState<number>(tier === "RESIDENTIAL" ? 40.0 : 15.0);

  const loadSecuredData = useCallback(async () => {
    try {
      const [{ data: advData }, { data: recData }] = await Promise.all([
        (supabase as any)
          .from("secured_material_advances")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("secured_advance_consumption_recoveries")
          .select("*")
          .eq("project_id", projectId)
          .order("recovery_date", { ascending: false }),
      ]);

      if (advData && advData.length > 0) {
        const normalized = advData.map((d: any) => normalizeSecuredRecord(d));
        setAdvances(normalized);
        if (!selectedAdvance) setSelectedAdvance(normalized[0]);
      } else {
        const defaults: SecuredAdvanceRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeSecuredRecord({
                  id: "sec-res-01",
                  project_id: projectId,
                  advance_ref_number: "SEC-RES-2026-01",
                  work_order_ref: "WO-RES-001",
                  contractor_name: "Royal Woodworks & Interiors",
                  material_type: "JOINERY_BOARDS_HDHMR",
                  material_description: "Action TESA 18mm Boilo High-Density Moisture-Resistant HDHMR Boards",
                  storage_location_grid: "Joinery Stock Yard Bay 01",
                  invoice_challan_ref: "INV-TESA-8812",
                  gate_pass_ref: "GP-RES-2026-01",
                  delivered_quantity: 120.0,
                  unit: "Sqm",
                  invoiced_rate_inr: 1400,
                  market_or_dsr_rate_inr: 1450,
                  assessed_base_rate_inr: 1400,
                  total_assessed_value_inr: 168000,
                  advance_percentage: 75.0,
                  sanctioned_advance_inr: 126000,
                  consumed_quantity: 40.0,
                  cumulative_recovered_inr: 42000,
                  outstanding_advance_inr: 84000,
                  hypothecation_indenture_ref: "IND-10A-RES-01",
                  insurance_policy_ref: "INS-CAR-HDFC-991",
                  status: "PARTIALLY_RECOVERED_CONSUMPTION",
                  inspected_by_engineer: "Principal Architect",
                }),
              ]
            : [
                normalizeSecuredRecord({
                  id: "sec-twr-01",
                  project_id: projectId,
                  advance_ref_number: "SEC-TWR-2026-01",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  material_type: "STEEL_REBAR_FE500D",
                  material_description: "Tata Tiscon Fe500D TMT Reinforcement Bars (16mm, 20mm & 25mm)",
                  storage_location_grid: "Central Rebar Yard / Bay 02",
                  invoice_challan_ref: "CHL-TATA-2026-0914",
                  gate_pass_ref: "GP-TWR-2026-01",
                  delivered_quantity: 45.0,
                  unit: "MT",
                  invoiced_rate_inr: 72500,
                  market_or_dsr_rate_inr: 74200,
                  assessed_base_rate_inr: 72500,
                  total_assessed_value_inr: 3262500,
                  advance_percentage: 75.0,
                  sanctioned_advance_inr: 2446875,
                  consumed_quantity: 15.0,
                  cumulative_recovered_inr: 815625,
                  outstanding_advance_inr: 1631250,
                  hypothecation_indenture_ref: "IND-10A-TWR-01",
                  insurance_policy_ref: "INS-CAR-NEW-INDIA-882",
                  status: "PARTIALLY_RECOVERED_CONSUMPTION",
                  inspected_by_engineer: "Resident SEOR",
                }),
              ];

        setAdvances(defaults);
        if (!selectedAdvance) setSelectedAdvance(defaults[0]);
      }

      if (recData && recData.length > 0) {
        setRecoveries(recData as SecuredRecoveryRecord[]);
      } else {
        const defaultRecs: SecuredRecoveryRecord[] = [
          {
            id: "rec-01",
            project_id: projectId,
            advance_ref_number: tier === "RESIDENTIAL" ? "SEC-RES-2026-01" : "SEC-TWR-2026-01",
            ra_bill_number: tier === "RESIDENTIAL" ? "RA-RES-02" : "RA-TWR-05",
            emb_entry_ref: tier === "RESIDENTIAL" ? "MB-RES-2026-040" : "MB-TWR-2026-108",
            recovery_date: "2026-09-08",
            consumed_qty_this_bill: tier === "RESIDENTIAL" ? 40.0 : 15.0,
            recovered_amount_inr: tier === "RESIDENTIAL" ? 42000 : 815625,
            remaining_advance_inr: tier === "RESIDENTIAL" ? 84000 : 1631250,
            created_at: new Date().toISOString(),
          },
        ];
        setRecoveries(defaultRecs);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedAdvance, tier]);

  useEffect(() => {
    void loadSecuredData();

    const channel = supabase
      .channel(`secured_adv_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "secured_material_advances" }, () => void loadSecuredData())
      .on("postgres_changes", { event: "*", schema: "public", table: "secured_advance_consumption_recoveries" }, () => void loadSecuredData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadSecuredData]);

  const currentAdvanceRecoveries = useMemo(() => {
    if (!selectedAdvance) return [];
    return recoveries.filter((r) => r.advance_ref_number === selectedAdvance.advance_ref_number);
  }, [recoveries, selectedAdvance]);

  const summary = useMemo(() => {
    const totalSecuredAdvances = advances.length;
    const totalSanctionedInr = advances.reduce((sum, a) => sum + Number(a.sanctioned_advance_inr || 0), 0);
    const totalRecoveredInr = advances.reduce((sum, a) => sum + Number(a.cumulative_recovered_inr || 0), 0);
    const totalOutstandingInr = advances.reduce((sum, a) => sum + Number(a.outstanding_advance_inr || 0), 0);
    const activeHypothecationCount = advances.filter((a) => a.status !== "FULLY_RECOVERED_CLOSED").length;

    return { totalSecuredAdvances, totalSanctionedInr, totalRecoveredInr, totalOutstandingInr, activeHypothecationCount };
  }, [advances]);

  const filteredAdvances = useMemo(() => {
    return advances.filter((a) => {
      const matchStatus = filterStatus === "ALL" || a.status === filterStatus;
      const haystack = `${a.advance_ref_number} ${a.contractor_name} ${a.material_description} ${a.hypothecation_indenture_ref}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [advances, filterStatus, search]);

  // Sanction New Form 10A Secured Material Advance
  const handleCreateSecuredAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_sec");

    const calc = computeSecuredAdvance(
      Number(delQty),
      Number(invRate),
      Number(mktRate),
      75.0
    );

    const newDbRecord: Omit<SecuredAdvanceRecord, "id"> = {
      project_id: projectId,
      advance_ref_number: secRef.trim(),
      work_order_ref: woRef.trim(),
      contractor_name: contractor.trim(),
      material_type: matType,
      material_description: matDesc.trim(),
      storage_location_grid: gridLoc.trim(),
      invoice_challan_ref: invRef.trim(),
      gate_pass_ref: gatePassRef.trim() || null,
      delivered_quantity: Number(delQty),
      unit: unit.trim(),
      invoiced_rate_inr: Number(invRate),
      market_or_dsr_rate_inr: Number(mktRate),
      assessed_base_rate_inr: calc.assessedRate,
      total_assessed_value_inr: calc.totalValue,
      advance_percentage: 75.0,
      sanctioned_advance_inr: calc.sanctionedAdv,
      consumed_quantity: 0,
      cumulative_recovered_inr: 0,
      outstanding_advance_inr: calc.sanctionedAdv,
      hypothecation_indenture_ref: indentureRef.trim(),
      insurance_policy_ref: insPolicy.trim(),
      insurance_expiry_date: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
      status: "INDENTURE_EXECUTED_DISBURSED",
      sanctioned_date: new Date().toISOString().slice(0, 10),
      inspected_by_engineer: roleLabel || "Resident SEOR",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("secured_material_advances")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeSecuredRecord(data);
        setAdvances((prev) => [normalized, ...prev]);
        setSelectedAdvance(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeSecuredRecord({ ...newDbRecord, id: `sec-${Date.now()}` });
      setAdvances((prev) => [fallback, ...prev]);
      setSelectedAdvance(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Record Permanent Work Consumption & 100% Amortization Recovery on RA Bill
  const handleRecordConsumptionRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvance) return;
    setActionInProgress("recording_rec");

    const consumed = Number(consumedQtyThisBill);
    const recoveryAmt = Math.round(consumed * selectedAdvance.assessed_base_rate_inr * (selectedAdvance.advance_percentage / 100));
    const newConsumedTotal = selectedAdvance.consumed_quantity + consumed;
    const newCumulativeRecovered = selectedAdvance.cumulative_recovered_inr + recoveryAmt;
    const newOutstanding = Math.max(0, selectedAdvance.outstanding_advance_inr - recoveryAmt);

    let nextStatus: SecuredAdvanceStatus = "PARTIALLY_RECOVERED_CONSUMPTION";
    if (newOutstanding <= 0) {
      nextStatus = "FULLY_RECOVERED_CLOSED";
    }

    const newRecoveryLog: Omit<SecuredRecoveryRecord, "id"> = {
      project_id: projectId,
      advance_ref_number: selectedAdvance.advance_ref_number,
      ra_bill_number: targetRaBill.trim(),
      emb_entry_ref: embRef.trim(),
      recovery_date: new Date().toISOString().slice(0, 10),
      consumed_qty_this_bill: consumed,
      recovered_amount_inr: recoveryAmt,
      remaining_advance_inr: newOutstanding,
    };

    try {
      await (supabase as any)
        .from("secured_advance_consumption_recoveries")
        .insert([newRecoveryLog]);

      await (supabase as any)
        .from("secured_material_advances")
        .update({
          consumed_quantity: newConsumedTotal,
          cumulative_recovered_inr: newCumulativeRecovered,
          outstanding_advance_inr: newOutstanding,
          status: nextStatus,
        })
        .eq("id", selectedAdvance.id);
    } catch {
      // Local optimistic update
    }

    const updatedAdv: SecuredAdvanceRecord = {
      ...selectedAdvance,
      consumed_quantity: newConsumedTotal,
      cumulative_recovered_inr: newCumulativeRecovered,
      outstanding_advance_inr: newOutstanding,
      status: nextStatus,
    };

    setSelectedAdvance(updatedAdv);
    setAdvances((prev) => prev.map((a) => (a.id === selectedAdvance.id ? updatedAdv : a)));
    setRecoveries((prev) => [{ ...newRecoveryLog, id: `rec-${Date.now()}` }, ...prev]);

    setFeedbackMessage(`Material consumption recorded. ${formatInr(recoveryAmt)} recovered on ${targetRaBill}.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setConsumeModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory CPWD Form 10A Indenture Legal Agreement Print
  const handlePrintForm10A = (adv: SecuredAdvanceRecord, recList: SecuredRecoveryRecord[]) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Indenture for Secured Advances (CPWD Form 10A / GCC Clause 10B) — ${adv.advance_ref_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .active { background: #e0f2fe; color: #0369a1; border: 1px solid #0284c7; }
    .closed { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD GCC Clause 10B(ii) / Form 10A Indenture</div>
      <h1 class="title">Statutory Indenture for Secured Material Advance</h1>
      <div class="meta">Indenture Ref: ${adv.hypothecation_indenture_ref} · Sanction Date: ${adv.sanctioned_date} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${adv.status === "FULLY_RECOVERED_CLOSED" ? "closed" : "active"}">${adv.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Executing Contractor / Borrower</th><td><strong>${adv.contractor_name}</strong></td><th>Parent Work Order Ref</th><td><strong>${adv.work_order_ref}</strong></td></tr>
    <tr><th>Material Description</th><td colspan="3"><strong>${adv.material_description}</strong></td></tr>
    <tr><th>Storage Location Grid</th><td><strong>${adv.storage_location_grid}</strong></td><th>Gate Pass / Weighbridge Ref</th><td><code>${adv.gate_pass_ref || "Verified Inward"}</code></td></tr>
    <tr><th>Insurance Policy Ref</th><td><code>${adv.insurance_policy_ref}</code></td><th>Insurance Validity Expiry</th><td><strong>${adv.insurance_expiry_date}</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Form 10A Statutory Hypothecation Declaration</div>
    <div>The Contractor hereby hypothecates to the Employer all non-perishable materials detailed herein brought to the site for permanent incorporation into the contract works. The materials remain under the joint physical custody of the Employer and shall not be removed from site under any pretext without written sanction.</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Delivered Physical Quantity</th>
        <th class="tar">Vendor Invoiced Rate</th>
        <th class="tar">Market / DSR Ceiling</th>
        <th class="tar">Assessed Base Rate</th>
        <th class="tar">Total Assessed Value</th>
        <th class="tar">Sanctioned Advance (75%)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="font-bold">${adv.delivered_quantity} ${adv.unit}</td>
        <td class="tar">₹${adv.invoiced_rate_inr.toLocaleString("en-IN")} / ${adv.unit}</td>
        <td class="tar">₹${adv.market_or_dsr_rate_inr.toLocaleString("en-IN")} / ${adv.unit}</td>
        <td class="tar font-bold" style="color: #0369a1;">₹${adv.assessed_base_rate_inr.toLocaleString("en-IN")}</td>
        <td class="tar font-bold">₹${adv.total_assessed_value_inr.toLocaleString("en-IN")}</td>
        <td class="tar font-bold" style="font-size: 13px; color: #15803d;">₹${adv.sanctioned_advance_inr.toLocaleString("en-IN")}</td>
      </tr>
    </tbody>
  </table>

  <div class="box" style="margin-top: 14px;">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Consumption &amp; Recovery Schedule (100% Pro-Rata on Permanent Work Incorporation)</div>
    <table>
      <thead>
        <tr>
          <th>Recovery Date</th>
          <th>Target RA Bill Ref</th>
          <th>Certified e-MB Entry</th>
          <th class="tar">Consumed Quantity</th>
          <th class="tar">Recovered Quantum (INR)</th>
          <th class="tar">Remaining Balance (INR)</th>
        </tr>
      </thead>
      <tbody>
        ${recList.map((r) => `
          <tr>
            <td>${r.recovery_date}</td>
            <td><strong>${r.ra_bill_number}</strong></td>
            <td><code>${r.emb_entry_ref}</code></td>
            <td class="tar font-bold">${r.consumed_qty_this_bill} ${adv.unit}</td>
            <td class="tar font-bold" style="color: #15803d;">-₹${r.recovered_amount_inr.toLocaleString("en-IN")}</td>
            <td class="tar font-bold" style="color: #0369a1;">₹${r.remaining_advance_inr.toLocaleString("en-IN")}</td>
          </tr>
        `).join("")}
        <tr class="total-row">
          <td colspan="3"><strong>CUMULATIVE CONSUMPTION RECOVERY TOTALS</strong></td>
          <td class="tar font-bold">${adv.consumed_quantity} ${adv.unit}</td>
          <td class="tar font-bold" style="color: #15803d;">₹${adv.cumulative_recovered_inr.toLocaleString("en-IN")}</td>
          <td class="tar font-bold" style="color: #b91c1c;">₹${adv.outstanding_advance_inr.toLocaleString("en-IN")} Outstanding</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <div>
      <div>Contractor Signatory (Borrower)</div>
      <div style="color: #64748b;">${adv.contractor_name}</div>
      <div class="sig">Form 10A Indenture Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">${adv.inspected_by_engineer}</div>
      <div class="sig">Engineer Sanction &amp; Verification Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedAdvance) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING SECURED MATERIAL ADVANCE (75% INDENTURE FORM 10A) ENGINE...
      </div>
    );
  }

  const recoveryPct = selectedAdvance.sanctioned_advance_inr > 0
    ? Math.round((selectedAdvance.cumulative_recovered_inr / selectedAdvance.sanctioned_advance_inr) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Financial Governance · CPWD GCC Clause 10B / Form 10A Indenture / FIDIC 14.5</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Secured Material Advance (75% Indenture Form 10A)
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Site material working capital clearinghouse. Governs 75% assessed advances on imperishable structural materials brought to site against Form 10A statutory hypothecation indentures, and enforces 100% recovery upon work incorporation.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintForm10A(selectedAdvance, currentAdvanceRecoveries)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form 10A Indenture</span>
            </button>
            <Link
              href="/finance/ra-bills"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Receipt className="w-3.5 h-3.5 text-cyan-400" />
              <span>Running Account Bills</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setSecRef(`SEC-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-0${advances.length + 1}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Claim Secured Advance</span>
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
              <span>Outstanding Secured Advance</span>
              <AlertOctagon className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-400 mt-2">
              {formatInr(summary.totalOutstandingInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Hypothecated site stock liability</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Cumulative Recovered (Consumed)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {formatInr(summary.totalRecoveredInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">100% amortized on intermediate IPCs</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Active Hypothecation Indentures</span>
              <Landmark className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-cyan-300 mt-2">
              {summary.activeHypothecationCount} Active Indentures
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Form 10A first charge active</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Sanctioned Material Advances</span>
              <Coins className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {formatInr(summary.totalSanctionedInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">75% assessed value ceiling</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Advances (${advances.length})` },
              { key: "PARTIALLY_RECOVERED_CONSUMPTION", label: "Partially Recovered" },
              { key: "INDENTURE_EXECUTED_DISBURSED", label: "Disbursed" },
              { key: "FULLY_RECOVERED_CLOSED", label: "Fully Recovered" },
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
              placeholder="Search advance, material, contractor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: ADVANCES ROSTER (5 cols) vs HYPOTHECATION & CONSUMPTION DESK (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: ADVANCES LISTING (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  CPWD Form 10A Master
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Secured Advance Claims</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredAdvances.length} Records</span>
            </div>

            <div className="space-y-3">
              {filteredAdvances.map((adv) => {
                const isSelected = selectedAdvance.id === adv.id;
                const isRecovering = adv.status === "PARTIALLY_RECOVERED_CONSUMPTION";

                return (
                  <div
                    key={adv.id}
                    onClick={() => setSelectedAdvance(adv)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {adv.advance_ref_number}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          adv.status === "FULLY_RECOVERED_CLOSED"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : isRecovering
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {adv.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-amber-400">
                          {formatInr(adv.outstanding_advance_inr)} Out
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Sanctioned: {formatInr(adv.sanctioned_advance_inr)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{adv.material_description}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        Stock Yard: <strong className="text-zinc-200">{adv.storage_location_grid}</strong> &bull; {adv.contractor_name}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Delivered: <strong className="text-zinc-300">{adv.delivered_quantity} {adv.unit}</strong></span>
                      <span>Consumed: <strong className="text-emerald-400">{adv.consumed_quantity} {adv.unit}</strong></span>
                      <span>Indenture: <strong className="text-cyan-300">{adv.hypothecation_indenture_ref}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: HYPOTHECATION & CONSUMPTION RECOVERY DESK (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  CPWD Form 10A Hypothecation Telemetry
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedAdvance.advance_ref_number} &mdash; {selectedAdvance.material_description}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetRaBill(tier === "RESIDENTIAL" ? "RA-RES-03" : "RA-TWR-06");
                    setEmbRef(tier === "RESIDENTIAL" ? "MB-RES-2026-041" : "MB-TWR-2026-109");
                    setConsumedQtyThisBill(tier === "RESIDENTIAL" ? 40.0 : 15.0);
                    setConsumeModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-mono font-bold flex items-center gap-1 shadow-md shadow-cyan-950/50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Consumption</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-zinc-500 block">Sanctioned Advance (75%):</span>
                  <strong className="text-white text-sm font-bold block mt-0.5">{formatInr(selectedAdvance.sanctioned_advance_inr)}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">Total Assessed Material Value:</span>
                  <span className="text-cyan-300 font-bold block mt-0.5">{formatInr(selectedAdvance.total_assessed_value_inr)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Delivered Qty:</span>
                  <span className="text-white font-bold">{selectedAdvance.delivered_quantity} {selectedAdvance.unit}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Assessed Rate:</span>
                  <span className="text-zinc-200">₹{selectedAdvance.assessed_base_rate_inr.toLocaleString("en-IN")}/{selectedAdvance.unit}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Insurance Expiry:</span>
                  <span className="text-emerald-400 font-bold">{selectedAdvance.insurance_expiry_date}</span>
                </div>
              </div>
            </div>

            {/* PROGRESS WATERFALL BAR */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-400">Permanent Work Incorporation Recovery:</span>
                <span className="text-emerald-400 font-bold">{recoveryPct}% Recovered ({formatInr(selectedAdvance.cumulative_recovered_inr)})</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, recoveryPct)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 pt-1">
                <span>Consumed: {selectedAdvance.consumed_quantity} {selectedAdvance.unit}</span>
                <span>Outstanding: <strong className="text-amber-400">{formatInr(selectedAdvance.outstanding_advance_inr)}</strong></span>
                <span>Total: {selectedAdvance.delivered_quantity} {selectedAdvance.unit}</span>
              </div>
            </div>

            {/* CONSUMPTION RECOVERY SCHEDULE */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                  e-MB Consumption &amp; RA Bill Amortization Events:
                </span>
                <span className="text-[10px] text-zinc-400">{currentAdvanceRecoveries.length} Recoveries Logged</span>
              </div>

              <div className="space-y-2.5">
                {currentAdvanceRecoveries.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{rec.ra_bill_number}</span>
                        <span className="text-cyan-300 font-mono text-[10px]">{rec.emb_entry_ref}</span>
                        <span className="text-zinc-500 text-[10px]">({rec.recovery_date})</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Consumed This IPC: <strong className="text-white">{rec.consumed_qty_this_bill} {selectedAdvance.unit}</strong>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-xs font-bold text-emerald-400">
                        -{formatInr(rec.recovered_amount_inr)}
                      </span>
                      <div className="text-[10px] text-zinc-500">
                        Outstanding: {formatInr(rec.remaining_advance_inr)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD GCC Clause 10B(ii) &amp; Form 10A Indenture Protocol
            </div>
          </div>

        </div>

        {/* CLAIM SECURED ADVANCE MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Claim Secured Material Advance (Form 10A)
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

              <form onSubmit={handleCreateSecuredAdvance} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Advance Ref Code</label>
                    <input
                      type="text"
                      required
                      value={secRef}
                      onChange={(e) => setSecRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Material Classification</label>
                    <select
                      value={matType}
                      onChange={(e) => setMatType(e.target.value as SecuredMaterialType)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="STEEL_REBAR_FE500D">Fe500D TMT Rebar</option>
                      <option value="STRUCTURAL_STEEL_SECTIONS">Structural Steel Sections</option>
                      <option value="CEMENT_OPC_PPC">Cement (OPC / PPC)</option>
                      <option value="PIPES_AND_SANITARY_FIXTURES">Pipes &amp; Fittings</option>
                      <option value="CERAMIC_TILES_STONE_SLABS">Tiles &amp; Stone Slabs</option>
                      <option value="JOINERY_BOARDS_HDHMR">Joinery Boards / HDHMR</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Material Detailed Specification</label>
                  <input
                    type="text"
                    required
                    value={matDesc}
                    onChange={(e) => setMatDesc(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
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
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Delivered Qty</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={delQty}
                      onChange={(e) => setDelQty(Number(e.target.value))}
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
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Invoice Rate (₹)</label>
                    <input
                      type="number"
                      required
                      value={invRate}
                      onChange={(e) => setInvRate(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Market / DSR Ceiling (₹)</label>
                    <input
                      type="number"
                      required
                      value={mktRate}
                      onChange={(e) => setMktRate(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Storage Grid</label>
                    <input
                      type="text"
                      required
                      value={gridLoc}
                      onChange={(e) => setGridLoc(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Form 10A Indenture Ref</label>
                    <input
                      type="text"
                      required
                      value={indentureRef}
                      onChange={(e) => setIndentureRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Insurance Policy Ref</label>
                    <input
                      type="text"
                      required
                      value={insPolicy}
                      onChange={(e) => setInsPolicy(e.target.value)}
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
                    disabled={actionInProgress === "creating_sec"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Execute 75% Advance</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* RECORD CONSUMPTION MODAL */}
        {consumeModalOpen && selectedAdvance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Record Consumption &amp; Amortize on RA Bill
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setConsumeModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRecordConsumptionRecovery} className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 font-mono text-[11px] space-y-1">
                  <div className="text-zinc-400">Advance Ref: <strong className="text-white">{selectedAdvance.advance_ref_number}</strong></div>
                  <div className="text-zinc-400">Assessed Rate: <strong className="text-cyan-300">₹{selectedAdvance.assessed_base_rate_inr.toLocaleString("en-IN")}/{selectedAdvance.unit}</strong></div>
                  <div className="text-zinc-400">Outstanding: <strong className="text-amber-400">{formatInr(selectedAdvance.outstanding_advance_inr)}</strong></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
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
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Certified e-MB Entry</label>
                    <input
                      type="text"
                      required
                      value={embRef}
                      onChange={(e) => setEmbRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Consumed Quantity This Bill ({selectedAdvance.unit})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={consumedQtyThisBill}
                    onChange={(e) => setConsumedQtyThisBill(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setConsumeModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === "recording_rec"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Deduct from RA Bill</span>
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