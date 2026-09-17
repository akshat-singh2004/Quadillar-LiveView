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

export type VariationCategory =
  | "DEVIATION_LIMIT_EXCEEDED"
  | "SUBSTITUTED_ITEM"
  | "EXTRA_ITEM_NEW_SCOPE"
  | "PROVISIONAL_SUM_CONVERSION"
  | "EMPLOYER_SCOPE_REDUCTION";

export type VariationStatus =
  | "PROPOSED_CONTRACTOR"
  | "ENGINEER_REVIEW_DAR"
  | "SANCTIONED_APPROVED"
  | "REJECTED_DISALLOWED"
  | "COMMITTED_TO_BOQ";

export interface VariationRecord {
  id: string;
  project_id: string;
  variation_number: string;
  title: string;
  work_order_ref: string;
  contractor_name: string;
  trade_package: string;
  category: VariationCategory;
  linked_boq_item_ref?: string | null;
  wbs_code: string;
  description: string;
  rate_derivation_basis: string;
  original_tender_qty: number;
  revised_total_qty: number;
  variation_delta_qty: number;
  unit: string;
  tender_base_rate_inr: number;
  derived_sanctioned_rate_inr: number;
  gross_financial_impact_inr: number;
  schedule_extension_days: number;
  critical_path_impact: boolean;
  linked_hindrance_ref?: string | null;
  status: VariationStatus;
  recommending_engineer?: string | null;
  approving_authority?: string | null;
  sanctioned_at?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function normalizeVariation(d: any): VariationRecord {
  const origQty = Number(d?.original_tender_qty ?? 0);
  const revQty = Number(d?.revised_total_qty ?? 0);
  const delta = Number(d?.variation_delta_qty ?? Math.max(0, revQty - origQty));
  const rate = Number(d?.derived_sanctioned_rate_inr ?? 0);
  const impact = Number(d?.gross_financial_impact_inr ?? Math.round(delta * rate));

  return {
    id: d?.id ?? `var-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    variation_number: d?.variation_number ?? `VO-${Date.now().toString().slice(-4)}`,
    title: d?.title ?? "Contract Variation Order Proposal",
    work_order_ref: d?.work_order_ref ?? "WO-01",
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    category: (d?.category as VariationCategory) ?? "EXTRA_ITEM_NEW_SCOPE",
    linked_boq_item_ref: d?.linked_boq_item_ref ?? null,
    wbs_code: d?.wbs_code ?? "WBS-VAR-01",
    description: d?.description ?? "Variation of scheduled quantities per Clause 12.",
    rate_derivation_basis: d?.rate_derivation_basis ?? "CPWD_DAR_ANALYSIS",
    original_tender_qty: origQty,
    revised_total_qty: revQty,
    variation_delta_qty: delta,
    unit: d?.unit ?? "m³",
    tender_base_rate_inr: Number(d?.tender_base_rate_inr ?? 0),
    derived_sanctioned_rate_inr: rate,
    gross_financial_impact_inr: impact,
    schedule_extension_days: Number(d?.schedule_extension_days ?? 0),
    critical_path_impact: Boolean(d?.critical_path_impact),
    linked_hindrance_ref: d?.linked_hindrance_ref ?? null,
    status: (d?.status as VariationStatus) ?? "PROPOSED_CONTRACTOR",
    recommending_engineer: d?.recommending_engineer ?? null,
    approving_authority: d?.approving_authority ?? null,
    sanctioned_at: d?.sanctioned_at ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalVariationsPage() {
  const { project, role, tier } = useActiveRole();
  const [variations, setVariations] = useState<VariationRecord[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<VariationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Project Director";
  const isDirectorOrSeor =
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleId === "QS_BILLING_HEAD" ||
    roleLabel.includes("Director") ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Surveyor");

  // Form State for Proposing New Variation Order
  const [voNo, setVoNo] = useState(`VO-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-0${Math.floor(1 + Math.random() * 9)}`);
  const [title, setTitle] = useState(
    tier === "RESIDENTIAL"
      ? "Extra Item: Concealed Acoustic Wall Paneling with Charcoal Louvers in Master Bedroom"
      : "CPWD Cl. 12.2 Deviation: M40 Structural Concrete Beyond 30% Tender Allowance"
  );
  const [woRef, setWoRef] = useState(tier === "RESIDENTIAL" ? "WO-RES-001" : "WO-TWR-101");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [category, setCategory] = useState<VariationCategory>(
    tier === "RESIDENTIAL" ? "EXTRA_ITEM_NEW_SCOPE" : "DEVIATION_LIMIT_EXCEEDED"
  );
  const [boqRef, setBoqRef] = useState(tier === "RESIDENTIAL" ? "EI-INT-PANEL-01" : "DSR-5.1.1");
  const [unit, setUnit] = useState(tier === "RESIDENTIAL" ? "Sqm" : "m³");
  const [origQty, setOrigQty] = useState<number>(tier === "RESIDENTIAL" ? 0 : 1850.0);
  const [revQty, setRevQty] = useState<number>(tier === "RESIDENTIAL" ? 48.5 : 2460.0);
  const [tenderRate, setTenderRate] = useState<number>(tier === "RESIDENTIAL" ? 0 : 6966);
  const [derivedRate, setDerivedRate] = useState<number>(tier === "RESIDENTIAL" ? 3450 : 7280);
  const [rateBasis, setRateBasis] = useState("CPWD_DAR_ANALYSIS");
  const [eotDays, setEotDays] = useState<number>(tier === "RESIDENTIAL" ? 5 : 14);
  const [desc, setDesc] = useState(
    tier === "RESIDENTIAL"
      ? "Client approved architectural modification. Addition of high-density fluted acoustic panels behind headboard per revised GFC layout."
      : "Excavation and foundation raft structural thickening requested by SEOR resulting in additional shear core concrete exceeding CPWD 30% deviation limit."
  );

  const loadVariations = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("contract_variations")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeVariation(d));
        setVariations(normalized);
        if (!selectedVariation) setSelectedVariation(normalized[0]);
      } else {
        const defaults: VariationRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeVariation({
                  id: "var-res-01",
                  project_id: projectId,
                  variation_number: "VO-RES-01",
                  title: "Extra Item: Concealed Fluted Wall Paneling in Master Suite",
                  work_order_ref: "WO-RES-001",
                  contractor_name: "Royal Woodworks & Interiors",
                  trade_package: "Custom Joinery & Millwork",
                  category: "EXTRA_ITEM_NEW_SCOPE",
                  linked_boq_item_ref: "EI-INT-PANEL-01",
                  wbs_code: "WBS-2.4",
                  description: "Architectural variation: Addition of decorative fluted charcoal paneling with hidden LED profile channels.",
                  rate_derivation_basis: "MARKET_STAR_RATE",
                  original_tender_qty: 0,
                  revised_total_qty: 48.5,
                  variation_delta_qty: 48.5,
                  unit: "Sqm",
                  tender_base_rate_inr: 0,
                  derived_sanctioned_rate_inr: 3450,
                  gross_financial_impact_inr: 167325,
                  schedule_extension_days: 4,
                  critical_path_impact: false,
                  status: "SANCTIONED_APPROVED",
                  recommending_engineer: "Lead Interior Architect",
                  approving_authority: "Principal Architect",
                  sanctioned_at: "2026-09-02T11:00:00Z",
                }),
              ]
            : [
                normalizeVariation({
                  id: "var-twr-01",
                  project_id: projectId,
                  variation_number: "VO-TWR-01",
                  title: "Clause 12.2 Deviation: M40 Structural Concrete Beyond 30% Allowance",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  category: "DEVIATION_LIMIT_EXCEEDED",
                  linked_boq_item_ref: "DSR-5.1.1",
                  wbs_code: "WBS-2.1.1",
                  description: "Core shear wall thickening per revised seismic structural design. Quantities exceed tender limit by 610 m³.",
                  rate_derivation_basis: "CPWD_DAR_ANALYSIS",
                  original_tender_qty: 1850.0,
                  revised_total_qty: 2460.0,
                  variation_delta_qty: 610.0,
                  unit: "m³",
                  tender_base_rate_inr: 6966,
                  derived_sanctioned_rate_inr: 7280,
                  gross_financial_impact_inr: 4440800,
                  schedule_extension_days: 14,
                  critical_path_impact: true,
                  linked_hindrance_ref: "HND-TWR-02",
                  status: "SANCTIONED_APPROVED",
                  recommending_engineer: "Resident SEOR",
                  approving_authority: "Employer Project Director",
                  sanctioned_at: "2026-08-25T16:30:00Z",
                }),
                normalizeVariation({
                  id: "var-twr-02",
                  project_id: projectId,
                  variation_number: "VO-TWR-02",
                  title: "Substituted Item: High-Performance Crystalline Waterproofing Slurry",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Waterproofing",
                  category: "SUBSTITUTED_ITEM",
                  linked_boq_item_ref: "DSR-12.8.2",
                  wbs_code: "WBS-1.2.3",
                  description: "Substitution of APP membrane with Fosroc crystalline slurry in basement sump pits to withstand hydrostatic water table.",
                  rate_derivation_basis: "MARKET_STAR_RATE",
                  original_tender_qty: 450.0,
                  revised_total_qty: 450.0,
                  variation_delta_qty: 450.0,
                  unit: "Sqm",
                  tender_base_rate_inr: 380,
                  derived_sanctioned_rate_inr: 590,
                  gross_financial_impact_inr: 94500,
                  schedule_extension_days: 0,
                  critical_path_impact: false,
                  status: "ENGINEER_REVIEW_DAR",
                  recommending_engineer: "Materials QA Lead",
                }),
              ];

        setVariations(defaults);
        if (!selectedVariation) setSelectedVariation(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedVariation, tier]);

  useEffect(() => {
    void loadVariations();

    const channel = supabase
      .channel(`variations_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_variations" }, () => void loadVariations())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadVariations]);

  const summary = useMemo(() => {
    const totalOrders = variations.length;
    const totalApprovedCost = variations
      .filter((v) => v.status === "SANCTIONED_APPROVED" || v.status === "COMMITTED_TO_BOQ")
      .reduce((sum, v) => sum + Number(v.gross_financial_impact_inr || 0), 0);
    const pendingReviewCount = variations.filter(
      (v) => v.status === "PROPOSED_CONTRACTOR" || v.status === "ENGINEER_REVIEW_DAR"
    ).length;
    const totalEotDays = variations
      .filter((v) => v.status === "SANCTIONED_APPROVED" || v.status === "COMMITTED_TO_BOQ")
      .reduce((sum, v) => sum + Number(v.schedule_extension_days || 0), 0);

    return { totalOrders, totalApprovedCost, pendingReviewCount, totalEotDays };
  }, [variations]);

  const filteredVariations = useMemo(() => {
    return variations.filter((v) => {
      const matchStatus = filterStatus === "ALL" || v.status === filterStatus;
      const matchCategory = filterCategory === "ALL" || v.category === filterCategory;
      const haystack = `${v.variation_number} ${v.title} ${v.contractor_name} ${v.work_order_ref}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchCategory && matchSearch;
    });
  }, [variations, filterStatus, filterCategory, search]);

  // Sanction & Approve Variation Order (CPWD Form 11)
  const handleSanctionVariation = async (v: VariationRecord) => {
    if (!isDirectorOrSeor) return;
    setActionInProgress(`sanction_${v.id}`);

    const updatePayload: Partial<VariationRecord> = {
      status: "SANCTIONED_APPROVED",
      recommending_engineer: roleLabel || "Resident SEOR",
      approving_authority: "Employer Project Director",
      sanctioned_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("contract_variations")
        .update(updatePayload)
        .eq("id", v.id);
    } catch {
      // Local optimistic update
    }

    setVariations((prev) =>
      prev.map((item) => (item.id === v.id ? ({ ...item, ...updatePayload } as VariationRecord) : item))
    );
    if (selectedVariation && selectedVariation.id === v.id) {
      setSelectedVariation((prev) => (prev ? ({ ...prev, ...updatePayload } as VariationRecord) : null));
    }

    setFeedbackMessage(`Variation Order ${v.variation_number} sanctioned under CPWD Clause 12.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Commit Sanctioned Variation to Master BOQ
  const handleCommitToBoq = async (v: VariationRecord) => {
    if (!isDirectorOrSeor) return;
    setActionInProgress(`commit_boq_${v.id}`);

    try {
      // Insert or update Master BOQ items
      await (supabase as any).from("boq_master_items").insert([
        {
          project_id: projectId,
          item_code: v.linked_boq_item_ref || `VO-BOQ-${v.variation_number}`,
          wbs_code: v.wbs_code,
          item_description: `${v.title} (${v.description})`,
          trade_package: v.trade_package,
          category: "CIVIL_SUPERSTRUCTURE",
          unit: v.unit,
          tender_quantity: v.variation_delta_qty,
          sanctioned_rate_inr: v.derived_sanctioned_rate_inr,
          total_budget_inr: v.gross_financial_impact_inr,
          executed_quantity: 0,
          certified_amount_inr: 0,
          is_extra_item: v.category === "EXTRA_ITEM_NEW_SCOPE",
          linked_variation_no: v.variation_number,
        },
      ]);

      const updatePayload: Partial<VariationRecord> = {
        status: "COMMITTED_TO_BOQ",
      };

      await (supabase as any)
        .from("contract_variations")
        .update(updatePayload)
        .eq("id", v.id);

      setVariations((prev) =>
        prev.map((item) => (item.id === v.id ? ({ ...item, ...updatePayload } as VariationRecord) : item))
      );
      if (selectedVariation && selectedVariation.id === v.id) {
        setSelectedVariation((prev) => (prev ? ({ ...prev, ...updatePayload } as VariationRecord) : null));
      }

      setFeedbackMessage(`Variation ${v.variation_number} committed to Master BOQ & e-MB.`);
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch {
      setFeedbackMessage("Failed to commit variation to Master BOQ.");
      setTimeout(() => setFeedbackMessage(null), 3500);
    }

    setActionInProgress(null);
  };

  // Create New Variation Proposal
  const handleCreateVariation = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_vo");

    const delta = Math.max(0, Number(revQty) - Number(origQty));
    const impact = Math.round(delta * Number(derivedRate));

    const newDbRecord: Omit<VariationRecord, "id"> = {
      project_id: projectId,
      variation_number: voNo.trim(),
      title: title.trim(),
      work_order_ref: woRef.trim(),
      contractor_name: contractor.trim(),
      trade_package: tradePackage.trim(),
      category,
      linked_boq_item_ref: boqRef.trim() || null,
      wbs_code: "WBS-VAR-01",
      description: desc.trim(),
      rate_derivation_basis: rateBasis,
      original_tender_qty: Number(origQty),
      revised_total_qty: Number(revQty),
      variation_delta_qty: delta,
      unit: unit.trim(),
      tender_base_rate_inr: Number(tenderRate),
      derived_sanctioned_rate_inr: Number(derivedRate),
      gross_financial_impact_inr: impact,
      schedule_extension_days: Number(eotDays),
      critical_path_impact: Number(eotDays) > 0,
      status: "PROPOSED_CONTRACTOR",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("contract_variations")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeVariation(data);
        setVariations((prev) => [normalized, ...prev]);
        setSelectedVariation(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeVariation({ ...newDbRecord, id: `var-${Date.now()}` });
      setVariations((prev) => [fallback, ...prev]);
      setSelectedVariation(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory CPWD Form 11 / FIDIC Clause 13 Printable Variation Docket
  const handlePrintVariation = (v: VariationRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Sanction of Variation Order (CPWD Form 11 / FIDIC Cl. 13) — ${v.variation_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .sanctioned { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .review { background: #e0f2fe; color: #0369a1; border: 1px solid #0284c7; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD GCC Clause 12 / FIDIC Red Book Clause 13</div>
      <h1 class="title">Statutory Variation Order &amp; Rate Sanction (Form 11)</h1>
      <div class="meta">Variation Ref: ${v.variation_number} · Sanction Date: ${v.sanctioned_at ? new Date(v.sanctioned_at).toLocaleDateString("en-IN") : "In Review"} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${v.status === "SANCTIONED_APPROVED" || v.status === "COMMITTED_TO_BOQ" ? "sanctioned" : "review"}">${v.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Executing Contractor</th><td><strong>${v.contractor_name}</strong></td><th>Parent Work Order Ref</th><td><strong>${v.work_order_ref}</strong></td></tr>
    <tr><th>Variation Classification</th><td><strong>${v.category.replace(/_/g, " ")}</strong></td><th>Trade Package</th><td>${v.trade_package}</td></tr>
    <tr><th>Linked Master BOQ Code</th><td>${v.linked_boq_item_ref || "Extra Item (New)"}</td><th>Rate Derivation Schedule</th><td><strong>${v.rate_derivation_basis.replace(/_/g, " ")}</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Factual Justification &amp; Technical Necessity</div>
    <div>${v.description}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Contractual Quantity Analysis</th>
        <th class="tar">Tender Qty</th>
        <th class="tar">Revised Qty</th>
        <th class="tar">Sanctioned Delta (${v.unit})</th>
        <th class="tar">Sanctioned Rate (INR)</th>
        <th class="tar">Financial Impact (INR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${v.title}</strong></td>
        <td class="tar">${v.original_tender_qty} ${v.unit}</td>
        <td class="tar">${v.revised_total_qty} ${v.unit}</td>
        <td class="tar font-bold" style="color: #0369a1;">+${v.variation_delta_qty} ${v.unit}</td>
        <td class="tar font-bold">₹${v.derived_sanctioned_rate_inr.toLocaleString("en-IN")} / ${v.unit}</td>
        <td class="tar font-bold" style="color: #15803d; font-size: 13px;">₹${v.gross_financial_impact_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr class="total-row" style="background: #e0f2fe;">
        <td colspan="5"><strong>TOTAL SANCTIONED ADDITIONAL BUDGET EXTENSION</strong></td>
        <td class="tar" style="color: #0369a1; font-size: 13px;"><strong>₹${v.gross_financial_impact_inr.toLocaleString("en-IN")}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Extension of Time (EOT) Schedule Impact Determination</div>
    <div>Contract Completion Extension: <strong>+${v.schedule_extension_days} Calendar Days</strong> (Critical Path Impact: <strong>${v.critical_path_impact ? "YES" : "NO"}</strong>)</div>
    <div>Associated Hindrance Event Ref: <strong>${v.linked_hindrance_ref || "Direct Architectural Variation"}</strong></div>
  </div>

  <div class="footer">
    <div>
      <div>Tender Quantity Surveyor</div>
      <div style="color: #64748b;">Rate analysis per CPWD DAR verified.</div>
      <div class="sig">QS Rate Derivation Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">${v.recommending_engineer || "Technical Recommendation"}</div>
      <div class="sig">Engineer Recommendation Seal</div>
    </div>
    <div>
      <div>Employer Project Director</div>
      <div style="color: #64748b;">${v.approving_authority || "Contract Sanction Granted"}</div>
      <div class="sig">Employer Approval Sanction</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedVariation) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING CONTRACT VARIATIONS &amp; RATE DERIVATION LEDGER...
      </div>
    );
  }

  const isApproved =
    selectedVariation.status === "SANCTIONED_APPROVED" ||
    selectedVariation.status === "COMMITTED_TO_BOQ";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Contract Administration · CPWD GCC Clause 12 / FIDIC Red Book Clause 13</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Contract Variations &amp; Rate Derivation Ledger (VO)
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Statutory change management clearinghouse. Manages extra items, substituted works, and quantities exceeding the statutory 30% deviation limit. Sanctioned orders commit directly to the Master BOQ and e-MB.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintVariation(selectedVariation)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form 11 Docket</span>
            </button>
            <Link
              href="/finance/boq"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Coins className="w-3.5 h-3.5 text-cyan-400" />
              <span>Master BOQ &amp; WBS</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setVoNo(`VO-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-0${Math.floor(1 + Math.random() * 9)}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Propose Variation Order</span>
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
              <span>Sanctioned Variation Budget</span>
              <Coins className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {formatInr(summary.totalApprovedCost)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Approved contract price expansion</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Pending Engineer DAR Review</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.pendingReviewCount > 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {summary.pendingReviewCount} Proposals
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Rate analysis &amp; quotes in review</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Sanctioned EOT Schedule Impact</span>
              <Calendar className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-cyan-300 mt-2">
              +{summary.totalEotDays} Days
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Authorized critical path extension</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Variation Docket Records</span>
              <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.totalOrders} Orders
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CPWD Form 11 statutory records</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Orders (${variations.length})` },
              { key: "SANCTIONED_APPROVED", label: "Sanctioned (Approved)" },
              { key: "COMMITTED_TO_BOQ", label: "Committed to BOQ" },
              { key: "ENGINEER_REVIEW_DAR", label: "In Review" },
              { key: "PROPOSED_CONTRACTOR", label: "Proposed" },
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
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-400 font-mono"
            >
              <option value="ALL">All Categories</option>
              <option value="DEVIATION_LIMIT_EXCEEDED">Deviation &gt; 30% Limit</option>
              <option value="EXTRA_ITEM_NEW_SCOPE">Extra Item (New Scope)</option>
              <option value="SUBSTITUTED_ITEM">Substituted Item</option>
              <option value="PROVISIONAL_SUM_CONVERSION">Provisional Sum</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search VO, title, contractor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: VARIATIONS ROSTER (7 cols) vs RATE ANALYSIS & SANCTION DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: VARIATION ORDERS ROSTER (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Variation Register (CPWD Form 11)
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Approved &amp; Pending Variation Orders</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredVariations.length} Orders</span>
            </div>

            <div className="space-y-3">
              {filteredVariations.map((v) => {
                const isSelected = selectedVariation.id === v.id;
                const isApprovedStatus = v.status === "SANCTIONED_APPROVED" || v.status === "COMMITTED_TO_BOQ";

                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVariation(v)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {v.variation_number}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {v.category.replace(/_/g, " ")}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          v.status === "COMMITTED_TO_BOQ"
                            ? "bg-purple-950 text-purple-400 border border-purple-800/50"
                            : isApprovedStatus
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {v.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-emerald-400">
                          {formatInr(v.gross_financial_impact_inr)}
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          +{v.variation_delta_qty} {v.unit} &times; ₹{v.derived_sanctioned_rate_inr}/{v.unit}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{v.title}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        {v.work_order_ref} &bull; {v.contractor_name} &bull; {v.trade_package}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Rate Basis: <strong className="text-zinc-300">{v.rate_derivation_basis.replace(/_/g, " ")}</strong></span>
                      <span>Schedule: <strong className={v.schedule_extension_days > 0 ? "text-cyan-300" : "text-zinc-400"}>+{v.schedule_extension_days} Days</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: RATE DERIVATION & SANCTION DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  CPWD Form 11 Sanction Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedVariation.variation_number}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isApproved
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : "bg-amber-950 text-amber-400 border border-amber-800/50"
              }`}>
                {selectedVariation.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Variation Subject:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedVariation.title}</strong>
              </div>

              <div className="pt-2 border-t border-zinc-800/60">
                <span className="text-zinc-500 text-[10px] uppercase block">Scope Justification:</span>
                <p className="text-zinc-200 font-sans text-xs mt-1 leading-relaxed">{selectedVariation.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Parent Work Order:</span>
                  <span className="text-white font-bold">{selectedVariation.work_order_ref}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Contractor:</span>
                  <span className="text-zinc-200 font-sans">{selectedVariation.contractor_name}</span>
                </div>
              </div>
            </div>

            {/* CPWD CLAUSE 12 QUANTITY & RATE BREAKDOWN */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Rate Derivation &amp; Quantity Analysis:
              </span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Original Tender Quantity:</span>
                  <span className="text-zinc-300">{selectedVariation.original_tender_qty} {selectedVariation.unit}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Revised Anticipated Total:</span>
                  <span className="text-zinc-300">{selectedVariation.revised_total_qty} {selectedVariation.unit}</span>
                </div>
                <div className="flex justify-between text-white font-bold pt-1 border-t border-zinc-800">
                  <span>Net Approved Delta Quantity:</span>
                  <span className="text-cyan-300">+{selectedVariation.variation_delta_qty} {selectedVariation.unit}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Rate Derivation Basis:</span>
                  <span className="text-zinc-200">{selectedVariation.rate_derivation_basis.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Derived Sanctioned Rate:</span>
                  <span className="text-white font-bold">₹{selectedVariation.derived_sanctioned_rate_inr.toLocaleString("en-IN")} / {selectedVariation.unit}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-extrabold text-sm pt-1.5 border-t border-zinc-800">
                  <span>Total Financial Sanction:</span>
                  <span>{formatInr(selectedVariation.gross_financial_impact_inr)}</span>
                </div>
              </div>
            </div>

            {/* SCHEDULE & FLOATING IMPACT */}
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 font-mono text-xs space-y-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Extension of Time (EOT) Evaluation:
              </span>

              <div className="flex justify-between items-center text-[11px]">
                <span>Contract Extension Recommended:</span>
                <span className={`font-bold ${selectedVariation.schedule_extension_days > 0 ? "text-cyan-300" : "text-zinc-400"}`}>
                  +{selectedVariation.schedule_extension_days} Calendar Days
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span>Critical Path Float Impact:</span>
                <span className={`font-bold ${selectedVariation.critical_path_impact ? "text-amber-400" : "text-emerald-400"}`}>
                  {selectedVariation.critical_path_impact ? "CRITICAL PATH IMPACTED" : "FLOAT ABSORBABLE"}
                </span>
              </div>
            </div>

            {/* ACTION STAGE BUTTONS */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Statutory Order Sanction:
              </span>

              {selectedVariation.status !== "SANCTIONED_APPROVED" && selectedVariation.status !== "COMMITTED_TO_BOQ" && (
                <button
                  type="button"
                  disabled={!isDirectorOrSeor || actionInProgress === `sanction_${selectedVariation.id}`}
                  onClick={() => handleSanctionVariation(selectedVariation)}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sanction Variation Order (SEOR / Director)</span>
                </button>
              )}

              {selectedVariation.status === "SANCTIONED_APPROVED" && (
                <button
                  type="button"
                  disabled={!isDirectorOrSeor || actionInProgress === `commit_boq_${selectedVariation.id}`}
                  onClick={() => handleCommitToBoq(selectedVariation)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                >
                  <Coins className="w-4 h-4" />
                  <span>Commit Line Item to Master BOQ &amp; e-MB</span>
                </button>
              )}

              {selectedVariation.status === "COMMITTED_TO_BOQ" && (
                <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Committed to Master BOQ &bull; Ready for e-MB</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Sanctioned by {selectedVariation.approving_authority || "Project Director"} on {selectedVariation.sanctioned_at ? new Date(selectedVariation.sanctioned_at).toLocaleDateString("en-IN") : "Today"}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD GCC Clause 12 &amp; FIDIC Clause 13 Statutory Protocol
            </div>
          </div>

        </div>

        {/* PROPOSE VARIATION ORDER MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Propose Contract Variation Order (Form 11)
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

              <form onSubmit={handleCreateVariation} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Variation Ref No.</label>
                    <input
                      type="text"
                      required
                      value={voNo}
                      onChange={(e) => setVoNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as VariationCategory)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="DEVIATION_LIMIT_EXCEEDED">Deviation &gt; 30% Limit</option>
                      <option value="EXTRA_ITEM_NEW_SCOPE">Extra Item (New Scope)</option>
                      <option value="SUBSTITUTED_ITEM">Substituted Item</option>
                      <option value="PROVISIONAL_SUM_CONVERSION">Provisional Sum</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Variation Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Parent Work Order</label>
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
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Tender Qty</label>
                    <input
                      type="number"
                      step="0.01"
                      value={origQty}
                      onChange={(e) => setOrigQty(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Revised Total Qty</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={revQty}
                      onChange={(e) => setRevQty(Number(e.target.value))}
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
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Rate Derivation Schedule</label>
                    <select
                      value={rateBasis}
                      onChange={(e) => setRateBasis(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="CPWD_DAR_ANALYSIS">CPWD DAR Analysis (Cost + 15%)</option>
                      <option value="TENDER_BOQ_RATE">Tender BOQ In-Contract Rate</option>
                      <option value="MARKET_STAR_RATE">Market Star Rate (Quotations)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Sanctioned Rate (₹)</label>
                    <input
                      type="number"
                      required
                      value={derivedRate}
                      onChange={(e) => setDerivedRate(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">EOT Days (Time Impact)</label>
                    <input
                      type="number"
                      value={eotDays}
                      onChange={(e) => setEotDays(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Linked BOQ / Item Ref</label>
                    <input
                      type="text"
                      value={boqRef}
                      onChange={(e) => setBoqRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Technical Scope Description &amp; Necessity</label>
                  <textarea
                    rows={2}
                    required
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
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
                    disabled={actionInProgress === "creating_vo"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Variation Proposal</span>
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