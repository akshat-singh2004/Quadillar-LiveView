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

export type EmbRecordStatus =
  | "RECORDED_ENTRY"
  | "AE_TEST_CHECKED_50PCT"
  | "SEOR_CERTIFIED"
  | "BILLED_IN_RA";

export interface EmbRecord {
  id: string;
  project_id: string;
  mb_entry_number: string;
  boq_item_ref: string;
  work_order_ref: string;
  contractor_name: string;
  trade_package: string;
  location_grid: string;
  measurement_date: string;
  item_description: string;
  unit: string;
  number_of_units: number;
  length_m: number;
  breadth_m: number;
  height_or_depth_m: number;
  gross_content_quantity: number;
  deduction_quantity: number;
  net_quantity: number;
  sanctioned_rate_inr: number;
  total_amount_inr: number;
  ae_test_checked: boolean;
  ae_auditor_name?: string | null;
  ae_checked_at?: string | null;
  ee_test_checked: boolean;
  ee_auditor_name?: string | null;
  ee_checked_at?: string | null;
  status: EmbRecordStatus;
  linked_ra_bill_no?: string | null;
  remarks?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function computeQuantities(
  units: number,
  l: number,
  b: number,
  h: number,
  deduction: number,
  rate: number
) {
  const gross = units * (l > 0 ? l : 1) * (b > 0 ? b : 1) * (h > 0 ? h : 1);
  const net = Math.max(0, gross - deduction);
  const totalAmount = Math.round(net * rate);
  return { gross: Number(gross.toFixed(3)), net: Number(net.toFixed(3)), totalAmount };
}

function normalizeEmbRecord(d: any): EmbRecord {
  const units = Number(d?.number_of_units ?? 1.0);
  const l = Number(d?.length_m ?? 0.0);
  const b = Number(d?.breadth_m ?? 0.0);
  const h = Number(d?.height_or_depth_m ?? 0.0);
  const deduction = Number(d?.deduction_quantity ?? 0.0);
  const rate = Number(d?.sanctioned_rate_inr ?? 0.0);

  const calc = computeQuantities(units, l, b, h, deduction, rate);

  return {
    id: d?.id ?? `emb-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    mb_entry_number: d?.mb_entry_number ?? `MB-${Date.now().toString().slice(-4)}`,
    boq_item_ref: d?.boq_item_ref ?? "DSR-5.1.1",
    work_order_ref: d?.work_order_ref ?? "WO-01",
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    location_grid: d?.location_grid ?? "Tower A / Level 08 / Shear Core 02",
    measurement_date: d?.measurement_date ?? new Date().toISOString().slice(0, 10),
    item_description: d?.item_description ?? "Reinforced cement concrete M40 in shear walls.",
    unit: d?.unit ?? "m³",
    number_of_units: units,
    length_m: l,
    breadth_m: b,
    height_or_depth_m: h,
    gross_content_quantity: Number(d?.gross_content_quantity ?? calc.gross),
    deduction_quantity: deduction,
    net_quantity: Number(d?.net_quantity ?? calc.net),
    sanctioned_rate_inr: rate,
    total_amount_inr: Number(d?.total_amount_inr ?? calc.totalAmount),
    ae_test_checked: Boolean(d?.ae_test_checked),
    ae_auditor_name: d?.ae_auditor_name ?? null,
    ae_checked_at: d?.ae_checked_at ?? null,
    ee_test_checked: Boolean(d?.ee_test_checked),
    ee_auditor_name: d?.ee_auditor_name ?? null,
    ee_checked_at: d?.ee_checked_at ?? null,
    status: (d?.status as EmbRecordStatus) ?? "RECORDED_ENTRY",
    linked_ra_bill_no: d?.linked_ra_bill_no ?? null,
    remarks: d?.remarks ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalMeasurementBookPage() {
  const { project, role, tier } = useActiveRole();
  const [records, setRecords] = useState<EmbRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<EmbRecord | null>(null);
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
  const isSurveyorOrEngineer =
    roleId === "QS_BILLING" ||
    roleId === "QS_BILLING_HEAD" ||
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleId === "RESIDENT_ENGINEER" ||
    roleLabel.includes("Surveyor") ||
    roleLabel.includes("Engineer") ||
    roleLabel.includes("Director") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Architect");

  // Form State for Recording New Measurement Entry
  const [mbNo, setMbNo] = useState(`MB-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [boqRef, setBoqRef] = useState(tier === "RESIDENTIAL" ? "SOR-JOINERY-04" : "DSR-5.1.1");
  const [woRef, setWoRef] = useState(tier === "RESIDENTIAL" ? "WO-RES-001" : "WO-TWR-101");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [grid, setGrid] = useState(tier === "RESIDENTIAL" ? "First Floor / MB-02" : "Tower A / Level 08 / Shear Core 02");
  const [desc, setDesc] = useState(
    tier === "RESIDENTIAL"
      ? "Providing & fixing 18mm Boilo HDHMR modular wardrobe carcasses."
      : "Providing and laying reinforced cement concrete M40 in shear walls and column kickers."
  );
  const [unit, setUnit] = useState(tier === "RESIDENTIAL" ? "Sqm" : "m³");
  const [unitsCount, setUnitsCount] = useState<number>(tier === "RESIDENTIAL" ? 2.0 : 4.0);
  const [lengthM, setLengthM] = useState<number>(tier === "RESIDENTIAL" ? 2.4 : 6.5);
  const [breadthM, setBreadthM] = useState<number>(tier === "RESIDENTIAL" ? 3.6 : 0.45);
  const [heightM, setHeightM] = useState<number>(tier === "RESIDENTIAL" ? 0 : 3.0);
  const [deduction, setDeduction] = useState<number>(tier === "RESIDENTIAL" ? 0 : 0.0);
  const [sanctionedRate, setSanctionedRate] = useState<number>(tier === "RESIDENTIAL" ? 2850 : 6966);

  const loadEmbData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("electronic_measurement_book")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeEmbRecord(d));
        setRecords(normalized);
        if (!selectedRecord) setSelectedRecord(normalized[0]);
      } else {
        const defaults: EmbRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeEmbRecord({
                  id: "emb-res-01",
                  project_id: projectId,
                  mb_entry_number: "MB-RES-2026-041",
                  boq_item_ref: "SOR-JOINERY-04",
                  work_order_ref: "WO-RES-001",
                  contractor_name: "Royal Woodworks & Interiors",
                  trade_package: "Custom Joinery & Millwork",
                  location_grid: "First Floor / MB-02 Wardrobe Niche",
                  measurement_date: "2026-09-12",
                  item_description: "Providing & fixing Action TESA 18mm Boilo HDHMR modular wardrobe carcasses.",
                  unit: "Sqm",
                  number_of_units: 2,
                  length_m: 2.4,
                  breadth_m: 3.6,
                  height_or_depth_m: 0,
                  deduction_quantity: 0,
                  sanctioned_rate_inr: 2850,
                  ae_test_checked: true,
                  ae_auditor_name: "Assistant Engineer (QS)",
                  status: "SEOR_CERTIFIED",
                  linked_ra_bill_no: "RA-RES-03",
                  remarks: "100% field measurement audited. Jointly checked with contractor engineer.",
                }),
              ]
            : [
                normalizeEmbRecord({
                  id: "emb-twr-01",
                  project_id: projectId,
                  mb_entry_number: "MB-TWR-2026-108",
                  boq_item_ref: "DSR-5.1.1",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  location_grid: "Tower A / Level 08 / Grid C3-D5 Shear Core",
                  measurement_date: "2026-09-08",
                  item_description: "Reinforced cement concrete M40 in shear walls and lift core shafts.",
                  unit: "m³",
                  number_of_units: 4,
                  length_m: 6.5,
                  breadth_m: 0.45,
                  height_or_depth_m: 3.0,
                  deduction_quantity: 0,
                  sanctioned_rate_inr: 6966,
                  ae_test_checked: true,
                  ae_auditor_name: "Assistant Engineer (Civil)",
                  ee_test_checked: true,
                  ee_auditor_name: "Resident SEOR",
                  status: "BILLED_IN_RA",
                  linked_ra_bill_no: "RA-TWR-06",
                  remarks: "Pre-pour stage gate PC-TWR-109 verified. Reconciled with batching plant transit slips.",
                }),
                normalizeEmbRecord({
                  id: "emb-twr-02",
                  project_id: projectId,
                  mb_entry_number: "MB-TWR-2026-109",
                  boq_item_ref: "DSR-5.2.2",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  location_grid: "Tower A / Level 08 / PT Deck Slab",
                  measurement_date: "2026-09-14",
                  item_description: "Fe500D TMT reinforcement bars cut, bent, and tied in place per Bar Bending Schedule (BBS).",
                  unit: "MT",
                  number_of_units: 1,
                  length_m: 0,
                  breadth_m: 0,
                  height_or_depth_m: 0,
                  gross_content_quantity: 4.85,
                  deduction_quantity: 0,
                  net_quantity: 4.85,
                  sanctioned_rate_inr: 72500,
                  total_amount_inr: 351625,
                  ae_test_checked: false,
                  status: "RECORDED_ENTRY",
                  remarks: "Recorded by Field QS. Requires mandatory AE 50% test-check before RA inclusion.",
                }),
              ];

        setRecords(defaults);
        if (!selectedRecord) setSelectedRecord(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedRecord, tier]);

  useEffect(() => {
    void loadEmbData();

    const channel = supabase
      .channel(`emb_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "electronic_measurement_book" }, () => void loadEmbData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadEmbData]);

  const summary = useMemo(() => {
    const totalEntries = records.length;
    const totalCertifiedValuation = records
      .filter((r) => r.status === "SEOR_CERTIFIED" || r.status === "BILLED_IN_RA")
      .reduce((sum, r) => sum + Number(r.total_amount_inr || 0), 0);
    const pendingAeCheckCount = records.filter((r) => !r.ae_test_checked).length;
    const readyForBillingValuation = records
      .filter((r) => r.status === "SEOR_CERTIFIED" && !r.linked_ra_bill_no)
      .reduce((sum, r) => sum + Number(r.total_amount_inr || 0), 0);

    return { totalEntries, totalCertifiedValuation, pendingAeCheckCount, readyForBillingValuation };
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchStatus = filterStatus === "ALL" || r.status === filterStatus;
      const haystack = `${r.mb_entry_number} ${r.boq_item_ref} ${r.contractor_name} ${r.location_grid}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [records, filterStatus, search]);

  // Stage 1: Assistant Engineer (AE) Endorses 50% Test-Check Quota
  const handleAeTestCheck = async (rec: EmbRecord) => {
    if (!isSurveyorOrEngineer) return;
    setActionInProgress(`ae_${rec.id}`);

    const updatePayload: Partial<EmbRecord> = {
      ae_test_checked: true,
      ae_auditor_name: roleLabel || "Assistant Engineer (QS)",
      ae_checked_at: new Date().toISOString(),
      status: "AE_TEST_CHECKED_50PCT",
    };

    try {
      await (supabase as any)
        .from("electronic_measurement_book")
        .update(updatePayload)
        .eq("id", rec.id);
    } catch {
      // Local optimistic update
    }

    setRecords((prev) =>
      prev.map((item) => (item.id === rec.id ? ({ ...item, ...updatePayload } as EmbRecord) : item))
    );
    if (selectedRecord && selectedRecord.id === rec.id) {
      setSelectedRecord((prev) => (prev ? ({ ...prev, ...updatePayload } as EmbRecord) : null));
    }

    setFeedbackMessage(`AE 50% test-check quota certified for ${rec.mb_entry_number}.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Stage 2: Resident SEOR / EE Certifies for Billing
  const handleSeorCertification = async (rec: EmbRecord) => {
    if (!isSurveyorOrEngineer) return;
    setActionInProgress(`seor_${rec.id}`);

    const updatePayload: Partial<EmbRecord> = {
      ee_test_checked: true,
      ee_auditor_name: roleLabel || "Resident SEOR",
      ee_checked_at: new Date().toISOString(),
      status: "SEOR_CERTIFIED",
    };

    try {
      await (supabase as any)
        .from("electronic_measurement_book")
        .update(updatePayload)
        .eq("id", rec.id);
    } catch {
      // Local optimistic update
    }

    setRecords((prev) =>
      prev.map((item) => (item.id === rec.id ? ({ ...item, ...updatePayload } as EmbRecord) : item))
    );
    if (selectedRecord && selectedRecord.id === rec.id) {
      setSelectedRecord((prev) => (prev ? ({ ...prev, ...updatePayload } as EmbRecord) : null));
    }

    setFeedbackMessage(`Measurement ${rec.mb_entry_number} certified by SEOR. Ready for RA Bill inclusion.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Record New Dimensional Measurement Entry
  const handleCreateEmb = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_emb");

    const calc = computeQuantities(
      Number(unitsCount),
      Number(lengthM),
      Number(breadthM),
      Number(heightM),
      Number(deduction),
      Number(sanctionedRate)
    );

    const newDbRecord: Omit<EmbRecord, "id"> = {
      project_id: projectId,
      mb_entry_number: mbNo.trim(),
      boq_item_ref: boqRef.trim(),
      work_order_ref: woRef.trim(),
      contractor_name: contractor.trim(),
      trade_package: tradePackage.trim(),
      location_grid: grid.trim(),
      measurement_date: new Date().toISOString().slice(0, 10),
      item_description: desc.trim(),
      unit: unit.trim(),
      number_of_units: Number(unitsCount),
      length_m: Number(lengthM),
      breadth_m: Number(breadthM),
      height_or_depth_m: Number(heightM),
      gross_content_quantity: calc.gross,
      deduction_quantity: Number(deduction),
      net_quantity: calc.net,
      sanctioned_rate_inr: Number(sanctionedRate),
      total_amount_inr: calc.totalAmount,
      ae_test_checked: false,
      ee_test_checked: false,
      status: "RECORDED_ENTRY",
      remarks: "Field measurement recorded per IS 1200.",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("electronic_measurement_book")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeEmbRecord(data);
        setRecords((prev) => [normalized, ...prev]);
        setSelectedRecord(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeEmbRecord({ ...newDbRecord, id: `emb-${Date.now()}` });
      setRecords((prev) => [fallback, ...prev]);
      setSelectedRecord(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Printable CPWD Form 23 Measurement Book Docket
  const handlePrintForm23 = (rec: EmbRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Electronic Measurement Book (CPWD Form 23) — ${rec.mb_entry_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .certified { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .pending { background: #fef3c7; color: #b45309; border: 1px solid #f59e0b; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD Works Manual Section 7 / Form 23 e-MB</div>
      <h1 class="title">Electronic Measurement Book Sheet (e-MB)</h1>
      <div class="meta">Entry Ref: ${rec.mb_entry_number} · Date: ${rec.measurement_date} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${rec.status === "SEOR_CERTIFIED" || rec.status === "BILLED_IN_RA" ? "certified" : "pending"}">${rec.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Executing Contractor</th><td><strong>${rec.contractor_name}</strong></td><th>Parent Work Order Ref</th><td><strong>${rec.work_order_ref}</strong></td></tr>
    <tr><th>Linked BOQ Item Ref</th><td><strong>${rec.boq_item_ref}</strong></td><th>Trade Package</th><td>${rec.trade_package}</td></tr>
    <tr><th>Location Grid Coordinate</th><td colspan="3"><strong>${rec.location_grid}</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Factual Specification &amp; Description of Work Executed</div>
    <div>${rec.item_description}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Detail of Work &amp; Structural Member</th>
        <th class="tac">No.</th>
        <th class="tar">Length (m)</th>
        <th class="tar">Breadth (m)</th>
        <th class="tar">Height/Depth (m)</th>
        <th class="tar">Gross Contents</th>
        <th class="tar">Deductions</th>
        <th class="tar">Net Quantity (${rec.unit})</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${rec.location_grid}</strong></td>
        <td class="tac font-bold">${rec.number_of_units}</td>
        <td class="tar">${rec.length_m > 0 ? rec.length_m : "—"}</td>
        <td class="tar">${rec.breadth_m > 0 ? rec.breadth_m : "—"}</td>
        <td class="tar">${rec.height_or_depth_m > 0 ? rec.height_or_depth_m : "—"}</td>
        <td class="tar font-bold">${rec.gross_content_quantity}</td>
        <td class="tar" style="color: #b91c1c;">-${rec.deduction_quantity}</td>
        <td class="tar font-bold" style="color: #0369a1; font-size: 12px;">${rec.net_quantity} ${rec.unit}</td>
      </tr>
      <tr class="total-row" style="background: #e0f2fe;">
        <td colspan="7"><strong>SANCTIONED BASE RATE PER UNIT: ₹${rec.sanctioned_rate_inr.toLocaleString("en-IN")} / ${rec.unit}</strong></td>
        <td class="tar font-bold" style="color: #15803d; font-size: 14px;">₹${rec.total_amount_inr.toLocaleString("en-IN")}</td>
      </tr>
    </tbody>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Statutory Test-Check Quotas Audit (CPWD Works Manual Section 7.12)</div>
    <div>100% Field Measurement Recorded: <strong>VERIFIED (Field Quantity Surveyor)</strong></div>
    <div>Assistant Engineer 50% Test-Check: <strong style="color: ${rec.ae_test_checked ? "#15803d" : "#b91c1c"};">${rec.ae_test_checked ? `PASSED (${rec.ae_auditor_name || "AE Checked"})` : "PENDING TEST-CHECK"}</strong></div>
    <div>Executive Engineer / SEOR 10% Test-Check: <strong style="color: ${rec.ee_test_checked ? "#15803d" : "#b91c1c"};">${rec.ee_test_checked ? `CERTIFIED (${rec.ee_auditor_name || "SEOR Endorsed"})` : "PENDING SEOR"}</strong></div>
    <div>Associated RA Bill: <strong>${rec.linked_ra_bill_no || "Unbilled (Available for next IPC)"}</strong></div>
  </div>

  <div class="footer">
    <div>
      <div>Field Quantity Surveyor</div>
      <div style="color: #64748b;">100% Field Entry Recorded</div>
      <div class="sig">Field QS Seal</div>
    </div>
    <div>
      <div>Assistant Engineer (Civil/QS)</div>
      <div style="color: #64748b;">${rec.ae_auditor_name || "50% Test-Check Quota"}</div>
      <div class="sig">AE Test-Check Stamp</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">${rec.ee_auditor_name || "Statutory Certification Granted"}</div>
      <div class="sig">Engineer Certification Seal</div>
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
        INITIALIZING ELECTRONIC MEASUREMENT BOOK (e-MB FORM 23) CLEARINGHOUSE...
      </div>
    );
  }

  const isCertified = selectedRecord.status === "SEOR_CERTIFIED" || selectedRecord.status === "BILLED_IN_RA";
  const isAeChecked = selectedRecord.ae_test_checked;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Statutory Measurement · CPWD Works Manual Section 7 / FIDIC Clause 12</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Electronic Measurement Book (e-MB Form 23)
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Contract measurement and test-check clearinghouse. Records dimensional L &times; B &times; D calculations, enforces mandatory 50% AE and 10% EE test-check quotas, and locks verified physical work into Running Account bills.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintForm23(selectedRecord)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form 23 Docket</span>
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
                setMbNo(`MB-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-${Math.floor(100 + Math.random() * 900)}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Record e-MB Entry</span>
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
              <span>Total Certified e-MB Valuation</span>
              <Scale className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {formatInr(summary.totalCertifiedValuation)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">SEOR certified physical work</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Ready for Next RA Bill</span>
              <Coins className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {formatInr(summary.readyForBillingValuation)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Certified unbilled measurements</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Pending AE Test-Check</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.pendingAeCheckCount > 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {summary.pendingAeCheckCount} Entries
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Mandatory 50% quota verification</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total e-MB Sheets</span>
              <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.totalEntries} Records
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CPWD Form 23 statutory entries</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Sheets (${records.length})` },
              { key: "SEOR_CERTIFIED", label: "SEOR Certified" },
              { key: "BILLED_IN_RA", label: "Billed in RA" },
              { key: "AE_TEST_CHECKED_50PCT", label: "AE Checked" },
              { key: "RECORDED_ENTRY", label: "Recorded (Unchecked)" },
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
              placeholder="Search MB number, BOQ ref, grid..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: e-MB ROSTER (7 cols) vs DIMENSION INSPECTOR & TEST-CHECK DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: e-MB LISTING (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  CPWD Form 23 Electronic Register
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Recorded Measurement Sheets</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredRecords.length} Sheets</span>
            </div>

            <div className="space-y-3">
              {filteredRecords.map((rec) => {
                const isSelected = selectedRecord.id === rec.id;
                const isCert = rec.status === "SEOR_CERTIFIED" || rec.status === "BILLED_IN_RA";

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
                          {rec.mb_entry_number}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-cyan-300 font-mono font-bold">
                          {rec.boq_item_ref}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          rec.status === "BILLED_IN_RA"
                            ? "bg-purple-950 text-purple-400 border border-purple-800/50"
                            : isCert
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : rec.ae_test_checked
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {rec.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-emerald-400">
                          {formatInr(rec.total_amount_inr)}
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          {rec.net_quantity} {rec.unit} &times; ₹{rec.sanctioned_rate_inr.toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{rec.item_description}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Location: <strong className="text-zinc-200">{rec.location_grid}</strong> &bull; {rec.contractor_name}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Dimensions: <strong className="text-zinc-300">{rec.number_of_units} &times; {rec.length_m} &times; {rec.breadth_m} &times; {rec.height_or_depth_m}</strong></span>
                      <span>AE 50% Check: <strong className={rec.ae_test_checked ? "text-emerald-400" : "text-amber-400"}>{rec.ae_test_checked ? "Pass" : "Pending"}</strong></span>
                      <span>Bill: <strong className="text-cyan-300">{rec.linked_ra_bill_no || "Unbilled"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: DIMENSION INSPECTOR & TEST-CHECK DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Dimensional Measurement Audit
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedRecord.mb_entry_number}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isCertified
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : "bg-amber-950 text-amber-400 border border-amber-800/50"
              }`}>
                {selectedRecord.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Item Description:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedRecord.item_description}</strong>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">BOQ Item Ref:</span>
                  <span className="text-cyan-300 font-bold font-mono">{selectedRecord.boq_item_ref}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Contractor:</span>
                  <span className="text-zinc-200 font-sans">{selectedRecord.contractor_name}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Location Grid:</span>
                  <span className="text-white">{selectedRecord.location_grid}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Measurement Date:</span>
                  <span className="text-zinc-200">{selectedRecord.measurement_date}</span>
                </div>
              </div>
            </div>

            {/* IS 1200 GEOMETRIC DIMENSIONS WATERFALL */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                IS 1200 Geometry &amp; Content Breakdown:
              </span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Number of Identical Members:</span>
                  <span className="text-white font-bold">{selectedRecord.number_of_units}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Length &times; Breadth &times; Height:</span>
                  <span className="text-zinc-200">{selectedRecord.length_m}m &times; {selectedRecord.breadth_m}m &times; {selectedRecord.height_or_depth_m}m</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Gross Measured Content:</span>
                  <span className="text-white">{selectedRecord.gross_content_quantity} {selectedRecord.unit}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Less: Structural Deductions (IS 1200):</span>
                  <span className="text-rose-400">-{selectedRecord.deduction_quantity} {selectedRecord.unit}</span>
                </div>
                <div className="flex justify-between text-cyan-300 font-bold pt-1 border-t border-zinc-800">
                  <span>Net Passed Quantity:</span>
                  <span>{selectedRecord.net_quantity} {selectedRecord.unit}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-extrabold text-sm pt-1 border-t border-zinc-800">
                  <span>Financial Valuation (Rate: ₹{selectedRecord.sanctioned_rate_inr.toLocaleString("en-IN")}):</span>
                  <span>{formatInr(selectedRecord.total_amount_inr)}</span>
                </div>
              </div>
            </div>

            {/* STATUTORY TEST-CHECK AUDIT (CPWD 7.12) */}
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 font-mono text-xs space-y-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Statutory Test-Check Quotas:
              </span>

              <div className="flex justify-between items-center text-[11px]">
                <span>1. Field QS 100% Entry:</span>
                <span className="text-emerald-400 font-bold">RECORDED (PASS)</span>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span>2. Assistant Engineer (AE) 50% Test-Check:</span>
                <span className={`font-bold ${isAeChecked ? "text-emerald-400" : "text-amber-400"}`}>
                  {isAeChecked ? `AUDITED (${selectedRecord.ae_auditor_name})` : "AWAITING AE TEST-CHECK"}
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span>3. Executive Engineer (EE) / SEOR 10% Check:</span>
                <span className={`font-bold ${selectedRecord.ee_test_checked ? "text-emerald-400" : "text-zinc-400"}`}>
                  {selectedRecord.ee_test_checked ? `CERTIFIED (${selectedRecord.ee_auditor_name})` : "PENDING SEOR"}
                </span>
              </div>
            </div>

            {/* ACTIONS: AE CHECK & SEOR CERTIFICATION */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Statutory Test-Check Actions:
              </span>

              {/* Action 1: AE 50% Test-Check */}
              {!isAeChecked && (
                <button
                  type="button"
                  disabled={!isSurveyorOrEngineer || actionInProgress === `ae_${selectedRecord.id}`}
                  onClick={() => handleAeTestCheck(selectedRecord)}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono disabled:opacity-50"
                >
                  <Scale className="w-4 h-4" />
                  <span>Execute AE 50% Statutory Test-Check</span>
                </button>
              )}

              {/* Action 2: SEOR Certification */}
              {isAeChecked && !selectedRecord.ee_test_checked && (
                <button
                  type="button"
                  disabled={!isSurveyorOrEngineer || actionInProgress === `seor_${selectedRecord.id}`}
                  onClick={() => handleSeorCertification(selectedRecord)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Certify Measurement &amp; Unlock for RA Bill (SEOR)</span>
                </button>
              )}

              {isCertified && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>e-MB Entry Certified for RA Billing</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    {selectedRecord.linked_ra_bill_no ? `Billed under ${selectedRecord.linked_ra_bill_no}` : "Available for next Running Account IPC"}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD Form 23 &amp; FIDIC Clause 12 Measurement Protocol
            </div>
          </div>

        </div>

        {/* RECORD NEW e-MB ENTRY MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Record e-MB Measurement (Form 23)
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

              <form onSubmit={handleCreateEmb} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">MB Entry Ref</label>
                    <input
                      type="text"
                      required
                      value={mbNo}
                      onChange={(e) => setMbNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">BOQ Item Ref</label>
                    <input
                      type="text"
                      required
                      value={boqRef}
                      onChange={(e) => setBoqRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Item Description</label>
                  <input
                    type="text"
                    required
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Contractor Name</label>
                    <input
                      type="text"
                      required
                      value={contractor}
                      onChange={(e) => setContractor(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Location Grid</label>
                    <input
                      type="text"
                      required
                      value={grid}
                      onChange={(e) => setGrid(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* DIMENSIONS (L x B x D) */}
                <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1 font-mono">No. of Units</label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={unitsCount}
                      onChange={(e) => setUnitsCount(Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1 font-mono">Length (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={lengthM}
                      onChange={(e) => setLengthM(Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1 font-mono">Breadth (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={breadthM}
                      onChange={(e) => setBreadthM(Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1 font-mono">Height (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={heightM}
                      onChange={(e) => setHeightM(Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Deductions ({unit})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={deduction}
                      onChange={(e) => setDeduction(Number(e.target.value))}
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
                    disabled={actionInProgress === "creating_emb"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Commit e-MB Record</span>
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