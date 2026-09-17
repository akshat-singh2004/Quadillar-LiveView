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

export type EscalationClauseType =
  | "CPWD_CLAUSE_10CA_SPECIFIED_MATERIALS"
  | "CPWD_CLAUSE_10CC_FULL_FORMULA"
  | "CPWD_CLAUSE_10C_STATUTORY_LABOUR"
  | "FIDIC_CLAUSE_13_8_WEIGHTED_INDEX";

export type EscalationClaimStatus =
  | "INDEX_SCRUTINY_DRAFT"
  | "QS_FORMULA_VERIFIED"
  | "SEOR_CERTIFIED_FOR_BILLING"
  | "CREDITED_IN_RA_BILL";

export interface StatutoryIndexRecord {
  id: string;
  project_id: string;
  index_month_key: string;
  base_year: string;
  labour_cpi_index: number;
  cement_wpi_index: number;
  steel_wpi_index: number;
  pol_fuel_index: number;
  is_base_tender_index: boolean;
  published_by: string;
}

export interface EscalationClaimRecord {
  id: string;
  project_id: string;
  claim_reference_no: string;
  work_order_ref: string;
  contractor_name: string;
  clause_type: EscalationClauseType;
  billing_period_month: string;
  linked_ra_bill_no: string;
  gross_work_done_inr: number;
  material_component_pct: number;
  labour_component_pct: number;
  pol_component_pct: number;
  fixed_component_pct: number;
  material_escalation_inr: number;
  labour_escalation_inr: number;
  pol_escalation_inr: number;
  total_escalation_payable_inr: number;
  status: EscalationClaimStatus;
  verified_by_qs?: string | null;
  certified_by_seor?: string | null;
  certified_at?: string | null;
  calculation_summary?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function computeClause10cc(
  grossWork: number,
  matPct: number,
  labPct: number,
  polPct: number,
  baseIndices: StatutoryIndexRecord,
  currentIndices: StatutoryIndexRecord
) {
  // Material Escalation: W * (X/100) * ((SteelIndex - SteelBase) / SteelBase)
  const matRatio = baseIndices.steel_wpi_index > 0
    ? (currentIndices.steel_wpi_index - baseIndices.steel_wpi_index) / baseIndices.steel_wpi_index
    : 0;
  const matEscalation = Math.round(grossWork * (matPct / 100) * matRatio);

  // Labour Escalation: W * (Y/100) * ((CPI - CPIBase) / CPIBase)
  const labRatio = baseIndices.labour_cpi_index > 0
    ? (currentIndices.labour_cpi_index - baseIndices.labour_cpi_index) / baseIndices.labour_cpi_index
    : 0;
  const labEscalation = Math.round(grossWork * (labPct / 100) * labRatio);

  // POL Fuel Escalation: W * (Z/100) * ((POL - POLBase) / POLBase)
  const polRatio = baseIndices.pol_fuel_index > 0
    ? (currentIndices.pol_fuel_index - baseIndices.pol_fuel_index) / baseIndices.pol_fuel_index
    : 0;
  const polEscalation = Math.round(grossWork * (polPct / 100) * polRatio);

  const total = matEscalation + labEscalation + polEscalation;

  return { matEscalation, labEscalation, polEscalation, total };
}

function normalizeClaimRecord(d: any): EscalationClaimRecord {
  return {
    id: d?.id ?? `esc-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    claim_reference_no: d?.claim_reference_no ?? `ESC-${Date.now().toString().slice(-4)}`,
    work_order_ref: d?.work_order_ref ?? "WO-01",
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    clause_type: (d?.clause_type as EscalationClauseType) ?? "CPWD_CLAUSE_10CC_FULL_FORMULA",
    billing_period_month: d?.billing_period_month ?? "2026-08",
    linked_ra_bill_no: d?.linked_ra_bill_no ?? "RA-01",
    gross_work_done_inr: Number(d?.gross_work_done_inr ?? 0),
    material_component_pct: Number(d?.material_component_pct ?? 60.0),
    labour_component_pct: Number(d?.labour_component_pct ?? 25.0),
    pol_component_pct: Number(d?.pol_component_pct ?? 5.0),
    fixed_component_pct: Number(d?.fixed_component_pct ?? 10.0),
    material_escalation_inr: Number(d?.material_escalation_inr ?? 0),
    labour_escalation_inr: Number(d?.labour_escalation_inr ?? 0),
    pol_escalation_inr: Number(d?.pol_escalation_inr ?? 0),
    total_escalation_payable_inr: Number(d?.total_escalation_payable_inr ?? 0),
    status: (d?.status as EscalationClaimStatus) ?? "INDEX_SCRUTINY_DRAFT",
    verified_by_qs: d?.verified_by_qs ?? null,
    certified_by_seor: d?.certified_by_seor ?? null,
    certified_at: d?.certified_at ?? null,
    calculation_summary: d?.calculation_summary ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalPriceEscalationPage() {
  const { project, role, tier } = useActiveRole();
  const [claims, setClaims] = useState<EscalationClaimRecord[]>([]);
  const [indices, setIndices] = useState<StatutoryIndexRecord[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<EscalationClaimRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
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

  // Form State for Lodging Price Escalation Claim
  const [claimNo, setClaimNo] = useState(`ESC-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-0${Math.floor(1 + Math.random() * 9)}`);
  const [woRef, setWoRef] = useState(tier === "RESIDENTIAL" ? "WO-RES-001" : "WO-TWR-101");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [clause, setClause] = useState<EscalationClauseType>(
    tier === "RESIDENTIAL" ? "CPWD_CLAUSE_10CA_SPECIFIED_MATERIALS" : "CPWD_CLAUSE_10CC_FULL_FORMULA"
  );
  const [claimMonth, setClaimMonth] = useState("2026-08");
  const [targetRaBill, setTargetRaBill] = useState(tier === "RESIDENTIAL" ? "RA-RES-03" : "RA-TWR-06");
  const [grossWorkDone, setGrossWorkDone] = useState<number>(tier === "RESIDENTIAL" ? 650000 : 16500000);
  const [matPct, setMatPct] = useState<number>(60.0);
  const [labPct, setLabPct] = useState<number>(25.0);
  const [polPct, setPolPct] = useState<number>(5.0);

  const baseIndexRecord = useMemo(() => {
    return indices.find((idx) => idx.is_base_tender_index) || {
      id: "base",
      project_id: projectId,
      index_month_key: "2026-01",
      base_year: "2011-12=100",
      labour_cpi_index: 382.0,
      cement_wpi_index: 170.0,
      steel_wpi_index: 158.5,
      pol_fuel_index: 178.0,
      is_base_tender_index: true,
      published_by: "Labour Bureau / MoC&I",
    };
  }, [indices, projectId]);

  const currentIndexRecord = useMemo(() => {
    return indices.find((idx) => idx.index_month_key === claimMonth) || {
      id: "curr",
      project_id: projectId,
      index_month_key: claimMonth,
      base_year: "2011-12=100",
      labour_cpi_index: 396.4,
      cement_wpi_index: 174.2,
      steel_wpi_index: 167.8,
      pol_fuel_index: 186.5,
      is_base_tender_index: false,
      published_by: "Labour Bureau / MoC&I",
    };
  }, [indices, claimMonth, projectId]);

  const loadEscalationData = useCallback(async () => {
    try {
      const [{ data: claimData }, { data: idxData }] = await Promise.all([
        (supabase as any)
          .from("price_escalation_claims")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("statutory_price_indices")
          .select("*")
          .eq("project_id", projectId)
          .order("index_month_key", { ascending: true }),
      ]);

      if (idxData && idxData.length > 0) {
        setIndices(idxData as StatutoryIndexRecord[]);
      } else {
        const defaultIndices: StatutoryIndexRecord[] = [
          {
            id: "idx-base",
            project_id: projectId,
            index_month_key: "2026-01",
            base_year: "2011-12=100",
            labour_cpi_index: 382.0,
            cement_wpi_index: 170.0,
            steel_wpi_index: 158.5,
            pol_fuel_index: 178.0,
            is_base_tender_index: true,
            published_by: "Office of Economic Adviser / Labour Bureau",
          },
          {
            id: "idx-07",
            project_id: projectId,
            index_month_key: "2026-07",
            base_year: "2011-12=100",
            labour_cpi_index: 394.0,
            cement_wpi_index: 173.0,
            steel_wpi_index: 165.2,
            pol_fuel_index: 184.2,
            is_base_tender_index: false,
            published_by: "Office of Economic Adviser / Labour Bureau",
          },
          {
            id: "idx-08",
            project_id: projectId,
            index_month_key: "2026-08",
            base_year: "2011-12=100",
            labour_cpi_index: 396.4,
            cement_wpi_index: 174.2,
            steel_wpi_index: 167.8,
            pol_fuel_index: 186.5,
            is_base_tender_index: false,
            published_by: "Office of Economic Adviser / Labour Bureau",
          },
        ];
        setIndices(defaultIndices);
      }

      if (claimData && claimData.length > 0) {
        const normalized = claimData.map((d: any) => normalizeClaimRecord(d));
        setClaims(normalized);
        if (!selectedClaim) setSelectedClaim(normalized[0]);
      } else {
        const defaults: EscalationClaimRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeClaimRecord({
                  id: "esc-res-01",
                  project_id: projectId,
                  claim_reference_no: "ESC-RES-2026-01",
                  work_order_ref: "WO-RES-001",
                  contractor_name: "Royal Woodworks & Interiors",
                  clause_type: "CPWD_CLAUSE_10CA_SPECIFIED_MATERIALS",
                  billing_period_month: "2026-08",
                  linked_ra_bill_no: "RA-RES-03",
                  gross_work_done_inr: 650000,
                  material_component_pct: 60.0,
                  labour_component_pct: 25.0,
                  pol_component_pct: 5.0,
                  material_escalation_inr: 22895,
                  labour_escalation_inr: 6100,
                  pol_escalation_inr: 1550,
                  total_escalation_payable_inr: 30545,
                  status: "SEOR_CERTIFIED_FOR_BILLING",
                  verified_by_qs: "Quantity Surveyor",
                  certified_by_seor: "Principal Architect",
                  certified_at: "2026-09-08T11:00:00Z",
                  calculation_summary: "Clause 10CA price adjustment for HDHMR board index increase (+5.87%).",
                }),
              ]
            : [
                normalizeClaimRecord({
                  id: "esc-twr-01",
                  project_id: projectId,
                  claim_reference_no: "ESC-TWR-2026-01",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  clause_type: "CPWD_CLAUSE_10CC_FULL_FORMULA",
                  billing_period_month: "2026-08",
                  linked_ra_bill_no: "RA-TWR-06",
                  gross_work_done_inr: 16500000,
                  material_component_pct: 60.0,
                  labour_component_pct: 25.0,
                  pol_component_pct: 5.0,
                  material_escalation_inr: 581104,
                  labour_escalation_inr: 155550,
                  pol_escalation_inr: 39396,
                  total_escalation_payable_inr: 776050,
                  status: "SEOR_CERTIFIED_FOR_BILLING",
                  verified_by_qs: "Lead Quantity Surveyor",
                  certified_by_seor: "Resident SEOR",
                  certified_at: "2026-09-08T14:30:00Z",
                  calculation_summary: "Multi-component Clause 10CC formula applied. Steel index increased from 158.50 to 167.80 (+5.87%). CPI-IW increased from 382.00 to 396.40 (+3.77%).",
                }),
              ];

        setClaims(defaults);
        if (!selectedClaim) setSelectedClaim(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedClaim, tier]);

  useEffect(() => {
    void loadEscalationData();

    const channel = supabase
      .channel(`escalation_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "price_escalation_claims" }, () => void loadEscalationData())
      .on("postgres_changes", { event: "*", schema: "public", table: "statutory_price_indices" }, () => void loadEscalationData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadEscalationData]);

  const summary = useMemo(() => {
    const totalClaims = claims.length;
    const totalEscalationCertified = claims
      .filter((c) => c.status === "SEOR_CERTIFIED_FOR_BILLING" || c.status === "CREDITED_IN_RA_BILL")
      .reduce((sum, c) => sum + Number(c.total_escalation_payable_inr || 0), 0);
    const inScrutiny = claims.filter((c) => c.status === "INDEX_SCRUTINY_DRAFT" || c.status === "QS_FORMULA_VERIFIED").length;

    return { totalClaims, totalEscalationCertified, inScrutiny };
  }, [claims]);

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const matchStatus = filterStatus === "ALL" || c.status === filterStatus;
      const haystack = `${c.claim_reference_no} ${c.contractor_name} ${c.linked_ra_bill_no} ${c.billing_period_month}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [claims, filterStatus, search]);

  // Stage 1: SEOR Certifies Escalation for Inclusion in RA Bill
  const handleCertifyEscalation = async (claim: EscalationClaimRecord) => {
    if (!isFinanceOrDirector) return;
    setActionInProgress(`cert_${claim.id}`);

    const updatePayload: Partial<EscalationClaimRecord> = {
      status: "SEOR_CERTIFIED_FOR_BILLING",
      certified_by_seor: roleLabel || "Resident SEOR",
      certified_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("price_escalation_claims")
        .update(updatePayload)
        .eq("id", claim.id);

      // Auto-update statutory_escalation_inr on linked RA bill
      await (supabase as any)
        .from("running_account_bills")
        .update({
          statutory_escalation_inr: claim.total_escalation_payable_inr,
        })
        .eq("project_id", projectId)
        .eq("bill_number", claim.linked_ra_bill_no);
    } catch {
      // Local optimistic update
    }

    setClaims((prev) =>
      prev.map((item) => (item.id === claim.id ? ({ ...item, ...updatePayload } as EscalationClaimRecord) : item))
    );
    if (selectedClaim && selectedClaim.id === claim.id) {
      setSelectedClaim((prev) => (prev ? ({ ...prev, ...updatePayload } as EscalationClaimRecord) : null));
    }

    setFeedbackMessage(`Escalation claim ${claim.claim_reference_no} certified. ${formatInr(claim.total_escalation_payable_inr)} transferred to ${claim.linked_ra_bill_no}.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Submit New Escalation Claim
  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_claim");

    const calc = computeClause10cc(
      Number(grossWorkDone),
      Number(matPct),
      Number(labPct),
      Number(polPct),
      baseIndexRecord,
      currentIndexRecord
    );

    const summaryText = `Clause 10CC formula applied. Steel index shifted from ${baseIndexRecord.steel_wpi_index} to ${currentIndexRecord.steel_wpi_index} (${((currentIndexRecord.steel_wpi_index - baseIndexRecord.steel_wpi_index) / baseIndexRecord.steel_wpi_index * 100).toFixed(2)}%). CPI shifted from ${baseIndexRecord.labour_cpi_index} to ${currentIndexRecord.labour_cpi_index} (${((currentIndexRecord.labour_cpi_index - baseIndexRecord.labour_cpi_index) / baseIndexRecord.labour_cpi_index * 100).toFixed(2)}%).`;

    const newDbRecord: Omit<EscalationClaimRecord, "id"> = {
      project_id: projectId,
      claim_reference_no: claimNo.trim(),
      work_order_ref: woRef.trim(),
      contractor_name: contractor.trim(),
      clause_type: clause,
      billing_period_month: claimMonth.trim(),
      linked_ra_bill_no: targetRaBill.trim(),
      gross_work_done_inr: Number(grossWorkDone),
      material_component_pct: Number(matPct),
      labour_component_pct: Number(labPct),
      pol_component_pct: Number(polPct),
      fixed_component_pct: 100 - (Number(matPct) + Number(labPct) + Number(polPct)),
      material_escalation_inr: calc.matEscalation,
      labour_escalation_inr: calc.labEscalation,
      pol_escalation_inr: calc.polEscalation,
      total_escalation_payable_inr: calc.total,
      status: "QS_FORMULA_VERIFIED",
      verified_by_qs: roleLabel || "Lead Quantity Surveyor",
      calculation_summary: summaryText,
    };

    try {
      const { data, error } = await (supabase as any)
        .from("price_escalation_claims")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeClaimRecord(data);
        setClaims((prev) => [normalized, ...prev]);
        setSelectedClaim(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeClaimRecord({ ...newDbRecord, id: `esc-${Date.now()}` });
      setClaims((prev) => [fallback, ...prev]);
      setSelectedClaim(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory CPWD Form 10CC Print Docket
  const handlePrintForm10CC = (claim: EscalationClaimRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Price Adjustment Statement (CPWD Clause 10CC / Form 10CC) — ${claim.claim_reference_no}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .certified { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .review { background: #e0f2fe; color: #0369a1; border: 1px solid #0284c7; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD GCC Clause 10CC / Form 10CC Price Adjustment</div>
      <h1 class="title">Statutory Escalation &amp; Price Variation Certificate</h1>
      <div class="meta">Claim Ref: ${claim.claim_reference_no} · Month: ${claim.billing_period_month} · Linked IPC: ${claim.linked_ra_bill_no} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${claim.status === "SEOR_CERTIFIED_FOR_BILLING" ? "certified" : "review"}">${claim.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Executing Contractor</th><td><strong>${claim.contractor_name}</strong></td><th>Parent Work Order Ref</th><td><strong>${claim.work_order_ref}</strong></td></tr>
    <tr><th>Statutory Escalation Clause</th><td><strong>${claim.clause_type.replace(/_/g, " ")}</strong></td><th>Gross Work Done in Period (W)</th><td class="tar font-bold" style="font-size: 13px; color: #0369a1;">₹${claim.gross_work_done_inr.toLocaleString("en-IN")}</td></tr>
    <tr><th>Base Tender Month (Base Index)</th><td><code>${baseIndexRecord.index_month_key}</code> (${baseIndexRecord.base_year})</td><th>Current Claim Month</th><td><code>${claim.billing_period_month}</code></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Index Movement &amp; Shift Benchmark</div>
    <div>${claim.calculation_summary || "Statutory wholesale and consumer price index shifts verified against official Economic Adviser / Labour Bureau bulletins."}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Escalation Component</th>
        <th class="tac">Weight (%)</th>
        <th class="tar">Base Index (Io)</th>
        <th class="tar">Current Index (I)</th>
        <th class="tar">Net Index Shift (%)</th>
        <th class="tar">Escalation Payable (INR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Materials Component (Clause 10CC / Steel WPI)</td>
        <td class="tac font-bold">${claim.material_component_pct}%</td>
        <td class="tar">${baseIndexRecord.steel_wpi_index}</td>
        <td class="tar">${currentIndexRecord.steel_wpi_index}</td>
        <td class="tar font-bold" style="color: #15803d;">+${(((currentIndexRecord.steel_wpi_index - baseIndexRecord.steel_wpi_index) / baseIndexRecord.steel_wpi_index) * 100).toFixed(2)}%</td>
        <td class="tar font-bold" style="color: #15803d;">₹${claim.material_escalation_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>2. Labour Component (CPI-IW Labour Bureau)</td>
        <td class="tac font-bold">${claim.labour_component_pct}%</td>
        <td class="tar">${baseIndexRecord.labour_cpi_index}</td>
        <td class="tar">${currentIndexRecord.labour_cpi_index}</td>
        <td class="tar font-bold" style="color: #15803d;">+${(((currentIndexRecord.labour_cpi_index - baseIndexRecord.labour_cpi_index) / baseIndexRecord.labour_cpi_index) * 100).toFixed(2)}%</td>
        <td class="tar font-bold" style="color: #15803d;">₹${claim.labour_escalation_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>3. POL / Fuel Component (HSD Wholesale Index)</td>
        <td class="tac font-bold">${claim.pol_component_pct}%</td>
        <td class="tar">${baseIndexRecord.pol_fuel_index}</td>
        <td class="tar">${currentIndexRecord.pol_fuel_index}</td>
        <td class="tar font-bold" style="color: #15803d;">+${(((currentIndexRecord.pol_fuel_index - baseIndexRecord.pol_fuel_index) / baseIndexRecord.pol_fuel_index) * 100).toFixed(2)}%</td>
        <td class="tar font-bold" style="color: #15803d;">₹${claim.pol_escalation_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr class="total-row" style="background: #dcfce7;">
        <td colspan="5"><strong>TOTAL CERTIFIED STATUTORY ESCALATION (CLAUSE 10CC)</strong></td>
        <td class="tar font-bold" style="color: #15803d; font-size: 14px;">₹${claim.total_escalation_payable_inr.toLocaleString("en-IN")}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>Lead Quantity Surveyor</div>
      <div style="color: #64748b;">Formula Indices Audited</div>
      <div class="sig">QS Signatory Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">${claim.certified_by_seor || "Form 10CC Verified"}</div>
      <div class="sig">SEOR Certification Seal</div>
    </div>
    <div>
      <div>Employer Project Director</div>
      <div style="color: #64748b;">Credited to ${claim.linked_ra_bill_no}</div>
      <div class="sig">Director Sanction Order</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedClaim) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING STATUTORY PRICE ESCALATION &amp; CLAUSE 10CC ENGINE...
      </div>
    );
  }

  const isCertified = selectedClaim.status === "SEOR_CERTIFIED_FOR_BILLING" || selectedClaim.status === "CREDITED_IN_RA_BILL";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Cost Governance · CPWD GCC Clauses 10C, 10CA, 10CC / FIDIC Red Book Clause 13.8</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Statutory Escalation &amp; Price Adjustment Formula
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Market volatility indexation clearinghouse. Computes multi-component formula adjustments for labour, bulk materials, and fuel against Ministry wholesale and consumer price bulletins, crediting certified escalation into contractor RA bills.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintForm10CC(selectedClaim)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form 10CC</span>
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
                setClaimNo(`ESC-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-0${claims.length + 1}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Lodge Escalation Claim</span>
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
              <span>Total Certified Escalation</span>
              <Coins className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {formatInr(summary.totalEscalationCertified)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">SEOR certified price adjustments</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Steel Index Shift (WPI)</span>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              +5.87%
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">158.50 &rarr; 167.80 (2011-12 base)</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Labour CPI-IW Shift</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              +3.77%
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">382.00 &rarr; 396.40 (Consumer index)</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Claims in Scrutiny</span>
              <Scale className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.inScrutiny} Claim(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Awaiting monthly bulletin lock</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Claims (${claims.length})` },
              { key: "SEOR_CERTIFIED_FOR_BILLING", label: "Certified" },
              { key: "QS_FORMULA_VERIFIED", label: "QS Verified" },
              { key: "INDEX_SCRUTINY_DRAFT", label: "Draft" },
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
              placeholder="Search claim ref, contractor, IPC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: CLAIMS ROSTER (5 cols) vs FORMULA WATERFALL DESK (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: CLAIMS LISTING (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  CPWD Form 10CC Master
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Lodged Escalation Claims</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredClaims.length} Claims</span>
            </div>

            <div className="space-y-3">
              {filteredClaims.map((claim) => {
                const isSelected = selectedClaim.id === claim.id;
                const isCert = claim.status === "SEOR_CERTIFIED_FOR_BILLING" || claim.status === "CREDITED_IN_RA_BILL";

                return (
                  <div
                    key={claim.id}
                    onClick={() => setSelectedClaim(claim)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {claim.claim_reference_no}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isCert
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                        }`}>
                          {claim.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-emerald-400">
                          +{formatInr(claim.total_escalation_payable_inr)}
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Period: {claim.billing_period_month}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{claim.clause_type.replace(/_/g, " ")}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        Target IPC: <strong className="text-zinc-200">{claim.linked_ra_bill_no}</strong> &bull; {claim.contractor_name}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Gross Work: <strong className="text-zinc-300">{formatInr(claim.gross_work_done_inr)}</strong></span>
                      <span>SEOR Sign: <strong className={claim.certified_by_seor ? "text-emerald-400" : "text-amber-400"}>{claim.certified_by_seor ? "Certified" : "Pending"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: FORMULA WATERFALL & INDEX SCRUTINY DESK (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Price Adjustment Telemetry
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedClaim.claim_reference_no} &mdash; {selectedClaim.billing_period_month}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isCertified
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
              }`}>
                {selectedClaim.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-zinc-500 block">Gross Work Done (W):</span>
                  <strong className="text-white text-sm font-bold block mt-0.5">{formatInr(selectedClaim.gross_work_done_inr)}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">Total Escalation Amount:</span>
                  <span className="text-emerald-400 text-sm font-bold block mt-0.5">+{formatInr(selectedClaim.total_escalation_payable_inr)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Material Weight (X):</span>
                  <span className="text-white font-bold">{selectedClaim.material_component_pct}%</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Labour Weight (Y):</span>
                  <span className="text-white font-bold">{selectedClaim.labour_component_pct}%</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">POL Fuel Weight (Z):</span>
                  <span className="text-white font-bold">{selectedClaim.pol_component_pct}%</span>
                </div>
              </div>
            </div>

            {/* WATERFALL BREAKDOWN TABLE */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Component-Wise Index Shift &amp; Escalation:
              </span>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between items-center text-zinc-400">
                  <span>1. Material Component (Steel WPI):</span>
                  <span className="text-emerald-400 font-bold">+{formatInr(selectedClaim.material_escalation_inr)}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>2. Labour Component (CPI-IW):</span>
                  <span className="text-emerald-400 font-bold">+{formatInr(selectedClaim.labour_escalation_inr)}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>3. POL / Fuel Component (HSD Index):</span>
                  <span className="text-emerald-400 font-bold">+{formatInr(selectedClaim.pol_escalation_inr)}</span>
                </div>

                <div className="pt-2 border-t border-zinc-800 flex justify-between items-baseline text-white font-bold">
                  <span>Total Payable Price Adjustment:</span>
                  <span className="text-emerald-400 text-sm font-extrabold">+{formatInr(selectedClaim.total_escalation_payable_inr)}</span>
                </div>
              </div>
            </div>

            {/* ACTIONS: CERTIFY & TRANSFER TO RA BILL */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Statutory Escalation Certification:
              </span>

              {!isCertified && (
                <button
                  type="button"
                  disabled={!isFinanceOrDirector || actionInProgress === `cert_${selectedClaim.id}`}
                  onClick={() => handleCertifyEscalation(selectedClaim)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                >
                  <Award className="w-4 h-4" />
                  <span>Certify Escalation &amp; Credit to {selectedClaim.linked_ra_bill_no}</span>
                </button>
              )}

              {isCertified && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Price Variation Certified &bull; Credited to {selectedClaim.linked_ra_bill_no}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Certified on {selectedClaim.certified_at ? new Date(selectedClaim.certified_at).toLocaleDateString("en-IN") : "Today"} by {selectedClaim.certified_by_seor || "Resident SEOR"}.
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD GCC Clause 10CC &amp; FIDIC Red Book Clause 13.8 Formula Protocol
            </div>
          </div>

        </div>

        {/* LODGE CLAIM MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Lodge Price Escalation Claim (Form 10CC)
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

              <form onSubmit={handleCreateClaim} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Claim Ref No.</label>
                    <input
                      type="text"
                      required
                      value={claimNo}
                      onChange={(e) => setClaimNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Clause Type</label>
                    <select
                      value={clause}
                      onChange={(e) => setClause(e.target.value as EscalationClauseType)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="CPWD_CLAUSE_10CC_FULL_FORMULA">CPWD Clause 10CC (Full Formula)</option>
                      <option value="CPWD_CLAUSE_10CA_SPECIFIED_MATERIALS">CPWD Clause 10CA (Specified Materials)</option>
                      <option value="CPWD_CLAUSE_10C_STATUTORY_LABOUR">CPWD Clause 10C (Statutory Labour)</option>
                      <option value="FIDIC_CLAUSE_13_8_WEIGHTED_INDEX">FIDIC Clause 13.8 (Cost Adjustment)</option>
                    </select>
                  </div>
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Claim Month (YYYY-MM)</label>
                    <input
                      type="text"
                      required
                      value={claimMonth}
                      onChange={(e) => setClaimMonth(e.target.value)}
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

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Gross Work Done (W) in Period (₹)</label>
                  <input
                    type="number"
                    required
                    value={grossWorkDone}
                    onChange={(e) => setGrossWorkDone(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Material % (X)</label>
                    <input
                      type="number"
                      required
                      value={matPct}
                      onChange={(e) => setMatPct(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Labour % (Y)</label>
                    <input
                      type="number"
                      required
                      value={labPct}
                      onChange={(e) => setLabPct(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">POL % (Z)</label>
                    <input
                      type="number"
                      required
                      value={polPct}
                      onChange={(e) => setPolPct(Number(e.target.value))}
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
                    disabled={actionInProgress === "creating_claim"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Evaluate &amp; Lodge Claim</span>
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