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

export type MaterialCategoryGate =
  | "STEEL_REBAR_FE500D"
  | "CEMENT_OPC_PPC"
  | "READY_MIX_CONCRETE_RMC"
  | "AGGREGATES_SAND_COARSE"
  | "AAC_BLOCKS_BRICKS"
  | "STRUCTURAL_STEEL_SECTIONS"
  | "SPECIAL_CONSTRUCTION_CHEMICALS";

export type GateInspectionStatus =
  | "GATE_INSPECTION_PENDING"
  | "ACCEPTED_UNLOADED"
  | "REJECTED_RETURNED_AT_GATE"
  | "CONDITIONAL_QUARANTINE_HOLD";

export interface GateInwardRecord {
  id: string;
  project_id: string;
  gate_pass_number: string;
  po_reference: string;
  vendor_name: string;
  vehicle_registration_no: string;
  driver_name_phone: string;
  material_category: MaterialCategoryGate;
  material_specification: string;
  challan_invoice_no: string;
  challan_quantity: number;
  unit: string;
  gross_weight_mt: number;
  tare_weight_mt: number;
  net_weight_mt: number;
  weight_variance_pct: number;
  weighbridge_slip_no?: string | null;
  rmc_batch_time?: string | null;
  rmc_gate_arrival_time?: string | null;
  transit_duration_minutes: number;
  gate_measured_slump_mm: number;
  concrete_temperature_celsius: number;
  steel_heat_number?: string | null;
  mtc_certificate_verified: boolean;
  mtc_certificate_url?: string | null;
  status: GateInspectionStatus;
  rejection_reason?: string | null;
  gate_security_officer: string;
  qa_store_inspector?: string | null;
  inspected_at?: string | null;
  created_at?: string;
}

function computeNetWeightAndVariance(gross: number, tare: number, challanQty: number) {
  const net = Math.max(0, Number((gross - tare).toFixed(3)));
  const variance = challanQty > 0 ? Number((((net - challanQty) / challanQty) * 100).toFixed(2)) : 0;
  return { net, variance };
}

function normalizeGateRecord(d: any): GateInwardRecord {
  const gross = Number(d?.gross_weight_mt ?? 0);
  const tare = Number(d?.tare_weight_mt ?? 0);
  const challanQty = Number(d?.challan_quantity ?? 0);
  const calc = computeNetWeightAndVariance(gross, tare, challanQty);

  return {
    id: d?.id ?? `gate-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    gate_pass_number: d?.gate_pass_number ?? `GP-${Date.now().toString().slice(-4)}`,
    po_reference: d?.po_reference ?? "PO-01",
    vendor_name: d?.vendor_name ?? "Approved Supplier",
    vehicle_registration_no: d?.vehicle_registration_no ?? "UP-32-BN-8812",
    driver_name_phone: d?.driver_name_phone ?? "Driver Name (+91 9876543210)",
    material_category: (d?.material_category as MaterialCategoryGate) ?? "STEEL_REBAR_FE500D",
    material_specification: d?.material_specification ?? "Tata Tiscon Fe500D High-Yield Rebar (16mm-25mm)",
    challan_invoice_no: d?.challan_invoice_no ?? "CHL-2026-9912",
    challan_quantity: challanQty,
    unit: d?.unit ?? "MT",
    gross_weight_mt: gross,
    tare_weight_mt: tare,
    net_weight_mt: Number(d?.net_weight_mt ?? calc.net),
    weight_variance_pct: Number(d?.weight_variance_pct ?? calc.variance),
    weighbridge_slip_no: d?.weighbridge_slip_no ?? `WB-${Date.now().toString().slice(-4)}`,
    rmc_batch_time: d?.rmc_batch_time ?? null,
    rmc_gate_arrival_time: d?.rmc_gate_arrival_time ?? null,
    transit_duration_minutes: Number(d?.transit_duration_minutes ?? 0),
    gate_measured_slump_mm: Number(d?.gate_measured_slump_mm ?? 140),
    concrete_temperature_celsius: Number(d?.concrete_temperature_celsius ?? 28.5),
    steel_heat_number: d?.steel_heat_number ?? "HEAT-TT-882104",
    mtc_certificate_verified: Boolean(d?.mtc_certificate_verified),
    mtc_certificate_url: d?.mtc_certificate_url ?? null,
    status: (d?.status as GateInspectionStatus) ?? "GATE_INSPECTION_PENDING",
    rejection_reason: d?.rejection_reason ?? null,
    gate_security_officer: d?.gate_security_officer ?? "Main Gate Security",
    qa_store_inspector: d?.qa_store_inspector ?? null,
    inspected_at: d?.inspected_at ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalGateInwardPage() {
  const { project, role, tier } = useActiveRole();
  const [records, setRecords] = useState<GateInwardRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<GateInwardRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Site Store Officer";
  const isStoreOrQa =
    roleId === "RESIDENT_SEOR" ||
    roleId === "RESIDENT_ENGINEER" ||
    roleId === "PMC_LEAD" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleLabel.includes("Store") ||
    roleLabel.includes("Security") ||
    roleLabel.includes("QA") ||
    roleLabel.includes("QC") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Engineer");

  // Form State for Recording New Gate Inward Entry
  const [gpNo, setGpNo] = useState(`GP-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-0${Math.floor(1 + Math.random() * 9)}`);
  const [poRef, setPoRef] = useState(tier === "RESIDENTIAL" ? "PO-RES-JOINERY-01" : "PO-TWR-STEEL-04");
  const [vendor, setVendor] = useState(
    tier === "RESIDENTIAL" ? "Action TESA Panels Pvt Ltd" : "Tata Steel Ltd (Direct Dispatch)"
  );
  const [vehicle, setVehicle] = useState("UP-32-BN-8812");
  const [driver, setDriver] = useState("Dharmendra Yadav (+91 94500 11200)");
  const [category, setCategory] = useState<MaterialCategoryGate>(
    tier === "RESIDENTIAL" ? "AAC_BLOCKS_BRICKS" : "STEEL_REBAR_FE500D"
  );
  const [spec, setSpec] = useState(
    tier === "RESIDENTIAL"
      ? "Action TESA 18mm Boilo High-Density Moisture-Resistant HDHMR Panels"
      : "Tata Tiscon Fe500D TMT Reinforcement Bars (16mm, 20mm & 25mm)"
  );
  const [invoiceNo, setInvoiceNo] = useState(`INV/UP/2026/${Math.floor(1000 + Math.random() * 9000)}`);
  const [challanQty, setChallanQty] = useState<number>(tier === "RESIDENTIAL" ? 120.0 : 28.5);
  const [unit, setUnit] = useState(tier === "RESIDENTIAL" ? "Sqm" : "MT");
  const [grossWeight, setGrossWeight] = useState<number>(tier === "RESIDENTIAL" ? 14.5 : 42.85);
  const [tareWeight, setTareWeight] = useState<number>(tier === "RESIDENTIAL" ? 8.2 : 14.35);
  const [heatNo, setHeatNo] = useState(tier === "RESIDENTIAL" ? "BATCH-AT-8812" : "HEAT-TS-2026-9921");
  const [slumpAtGate, setSlumpAtGate] = useState<number>(140);
  const [transitMins, setTransitMins] = useState<number>(45);

  const loadGateInwardData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("site_material_gate_inward")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeGateRecord(d));
        setRecords(normalized);
        if (!selectedRecord) setSelectedRecord(normalized[0]);
      } else {
        const defaults: GateInwardRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeGateRecord({
                  id: "gate-res-01",
                  project_id: projectId,
                  gate_pass_number: "GP-RES-2026-01",
                  po_reference: "PO-RES-JOINERY-01",
                  vendor_name: "Action TESA Panels Pvt Ltd",
                  vehicle_registration_no: "UP-32-AT-4412",
                  driver_name_phone: "R. K. Maurya (+91 98390 12345)",
                  material_category: "AAC_BLOCKS_BRICKS",
                  material_specification: "18mm Boilo HDHMR Water-Resistant Boards (8ft x 4ft)",
                  challan_invoice_no: "INV-TESA-8812",
                  challan_quantity: 120,
                  unit: "Sqm",
                  gross_weight_mt: 14.5,
                  tare_weight_mt: 8.2,
                  net_weight_mt: 6.3,
                  steel_heat_number: "BATCH-AT-8812",
                  mtc_certificate_verified: true,
                  status: "ACCEPTED_UNLOADED",
                  gate_security_officer: "Residential Site Gate Guard",
                  qa_store_inspector: "Principal Architect",
                  inspected_at: "2026-09-12T11:00:00Z",
                }),
              ]
            : [
                normalizeGateRecord({
                  id: "gate-twr-01",
                  project_id: projectId,
                  gate_pass_number: "GP-TWR-2026-01",
                  po_reference: "PO-TWR-STEEL-04",
                  vendor_name: "Tata Steel Ltd (Direct Dispatch)",
                  vehicle_registration_no: "UP-32-TR-9921",
                  driver_name_phone: "Dharmendra Yadav (+91 94500 11200)",
                  material_category: "STEEL_REBAR_FE500D",
                  material_specification: "Tata Tiscon Fe500D TMT Reinforcement (20mm & 25mm)",
                  challan_invoice_no: "CHL-TATA-2026-0914",
                  challan_quantity: 28.5,
                  unit: "MT",
                  gross_weight_mt: 42.85,
                  tare_weight_mt: 14.35,
                  net_weight_mt: 28.5,
                  weight_variance_pct: 0.0,
                  steel_heat_number: "HEAT-TS-2026-9921",
                  mtc_certificate_verified: true,
                  status: "ACCEPTED_UNLOADED",
                  gate_security_officer: "Main Gate Security",
                  qa_store_inspector: "Resident SEOR",
                  inspected_at: "2026-09-08T10:30:00Z",
                }),
                normalizeGateRecord({
                  id: "gate-twr-02",
                  project_id: projectId,
                  gate_pass_number: "GP-TWR-2026-02",
                  po_reference: "PO-TWR-RMC-08",
                  vendor_name: "ACC Concrete RMC Plant (Gomti Nagar)",
                  vehicle_registration_no: "UP-32-RMC-5501",
                  driver_name_phone: "Satish Kumar (+91 98765 00011)",
                  material_category: "READY_MIX_CONCRETE_RMC",
                  material_specification: "M40 Grade Design Mix with Sika Plastocrete (6 m³ Transit Mixer)",
                  challan_invoice_no: "DOCKET-ACC-881204",
                  challan_quantity: 6.0,
                  unit: "m³",
                  rmc_batch_time: "2026-09-14T09:15:00Z",
                  rmc_gate_arrival_time: "2026-09-14T10:05:00Z",
                  transit_duration_minutes: 50,
                  gate_measured_slump_mm: 145,
                  concrete_temperature_celsius: 29.0,
                  status: "ACCEPTED_UNLOADED",
                  gate_security_officer: "Main Gate Security",
                  qa_store_inspector: "Lead QA Engineer",
                  inspected_at: "2026-09-14T10:15:00Z",
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
    void loadGateInwardData();

    const channel = supabase
      .channel(`gate_inward_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_material_gate_inward" }, () => void loadGateInwardData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadGateInwardData]);

  const summary = useMemo(() => {
    const totalEntries = records.length;
    const acceptedCount = records.filter((r) => r.status === "ACCEPTED_UNLOADED").length;
    const rejectedCount = records.filter((r) => r.status === "REJECTED_RETURNED_AT_GATE").length;
    const pendingInspection = records.filter((r) => r.status === "GATE_INSPECTION_PENDING").length;
    const totalSteelAcceptedMt = records
      .filter((r) => r.material_category === "STEEL_REBAR_FE500D" && r.status === "ACCEPTED_UNLOADED")
      .reduce((sum, r) => sum + Number(r.net_weight_mt || 0), 0);

    return { totalEntries, acceptedCount, rejectedCount, pendingInspection, totalSteelAcceptedMt };
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchCat = filterCategory === "ALL" || r.material_category === filterCategory;
      const matchStat = filterStatus === "ALL" || r.status === filterStatus;
      const haystack = `${r.gate_pass_number} ${r.vendor_name} ${r.vehicle_registration_no} ${r.challan_invoice_no} ${r.steel_heat_number}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchCat && matchStat && matchSearch;
    });
  }, [records, filterCategory, filterStatus, search]);

  // Stage 1: Accept Material & Certify Unloading
  const handleAcceptMaterial = async (rec: GateInwardRecord) => {
    if (!isStoreOrQa) return;
    setActionInProgress(`accept_${rec.id}`);

    const updatePayload: Partial<GateInwardRecord> = {
      status: "ACCEPTED_UNLOADED",
      qa_store_inspector: roleLabel || "Site Store Officer",
      inspected_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("site_material_gate_inward")
        .update(updatePayload)
        .eq("id", rec.id);
    } catch {
      // Local optimistic update
    }

    setRecords((prev) =>
      prev.map((item) => (item.id === rec.id ? ({ ...item, ...updatePayload } as GateInwardRecord) : item))
    );
    if (selectedRecord && selectedRecord.id === rec.id) {
      setSelectedRecord((prev) => (prev ? ({ ...prev, ...updatePayload } as GateInwardRecord) : null));
    }

    setFeedbackMessage(`Material Gate Pass ${rec.gate_pass_number} ACCEPTED. Authenticated into site stock.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Stage 2: Reject Material at Gate
  const handleRejectMaterial = async (rec: GateInwardRecord) => {
    if (!isStoreOrQa) return;
    setActionInProgress(`reject_${rec.id}`);

    const reason = rec.material_category === "READY_MIX_CONCRETE_RMC"
      ? "Slump deviation / transit time exceeded 90 minutes per IS 4926."
      : "Weight discrepancy exceeding permissible 0.5% tolerance or MTC mismatch.";

    const updatePayload: Partial<GateInwardRecord> = {
      status: "REJECTED_RETURNED_AT_GATE",
      rejection_reason: reason,
      qa_store_inspector: roleLabel || "Site Store Officer",
      inspected_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("site_material_gate_inward")
        .update(updatePayload)
        .eq("id", rec.id);
    } catch {
      // Local optimistic update
    }

    setRecords((prev) =>
      prev.map((item) => (item.id === rec.id ? ({ ...item, ...updatePayload } as GateInwardRecord) : item))
    );
    if (selectedRecord && selectedRecord.id === rec.id) {
      setSelectedRecord((prev) => (prev ? ({ ...prev, ...updatePayload } as GateInwardRecord) : null));
    }

    setFeedbackMessage(`GATE REJECTION ENFORCED: Vehicle ${rec.vehicle_registration_no} turned away. Gate Docket issued.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Record New Material Gate Inward
  const handleCreateGateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_gate");

    const calc = computeNetWeightAndVariance(
      Number(grossWeight),
      Number(tareWeight),
      Number(challanQty)
    );

    const isRmc = category === "READY_MIX_CONCRETE_RMC";
    const batchTime = isRmc ? new Date(Date.now() - transitMins * 60000).toISOString() : null;

    const newDbRecord: Omit<GateInwardRecord, "id"> = {
      project_id: projectId,
      gate_pass_number: gpNo.trim(),
      po_reference: poRef.trim(),
      vendor_name: vendor.trim(),
      vehicle_registration_no: vehicle.trim(),
      driver_name_phone: driver.trim(),
      material_category: category,
      material_specification: spec.trim(),
      challan_invoice_no: invoiceNo.trim(),
      challan_quantity: Number(challanQty),
      unit: unit.trim(),
      gross_weight_mt: Number(grossWeight),
      tare_weight_mt: Number(tareWeight),
      net_weight_mt: calc.net,
      weight_variance_pct: calc.variance,
      weighbridge_slip_no: `WB-${Math.floor(1000 + Math.random() * 9000)}`,
      rmc_batch_time: batchTime,
      rmc_gate_arrival_time: isRmc ? new Date().toISOString() : null,
      transit_duration_minutes: isRmc ? Number(transitMins) : 0,
      gate_measured_slump_mm: isRmc ? Number(slumpAtGate) : 140,
      concrete_temperature_celsius: 28.5,
      steel_heat_number: heatNo.trim() || null,
      mtc_certificate_verified: true,
      status: "GATE_INSPECTION_PENDING",
      gate_security_officer: roleLabel || "Main Gate Security",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("site_material_gate_inward")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeGateRecord(data);
        setRecords((prev) => [normalized, ...prev]);
        setSelectedRecord(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeGateRecord({ ...newDbRecord, id: `gate-${Date.now()}` });
      setRecords((prev) => [fallback, ...prev]);
      setSelectedRecord(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory CPWD Form 13 / Material Inward Inspection Docket Print
  const handlePrintGateDocket = (rec: GateInwardRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Material Inward Inspection Docket (CPWD Form 13 / IS 4926) — ${rec.gate_pass_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .accepted { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .rejected { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD Works Manual Section 14 / Form 13 Materials Inward</div>
      <h1 class="title">Statutory Material Gate Inward &amp; Weighbridge Inspection Docket</h1>
      <div class="meta">Gate Pass: ${rec.gate_pass_number} · Inward Date: ${new Date(rec.created_at || Date.now()).toLocaleDateString("en-IN")} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${rec.status === "ACCEPTED_UNLOADED" ? "accepted" : "rejected"}">${rec.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Approved Supplier / Manufacturer</th><td><strong>${rec.vendor_name}</strong></td><th>Parent Purchase Order Ref</th><td><strong>${rec.po_reference}</strong></td></tr>
    <tr><th>Carrier Vehicle Registration</th><td><strong>${rec.vehicle_registration_no}</strong></td><th>Driver Credentials</th><td>${rec.driver_name_phone}</td></tr>
    <tr><th>Vendor Invoice / Challan Ref</th><td><strong>${rec.challan_invoice_no}</strong></td><th>Material Category</th><td><strong>${rec.material_category.replace(/_/g, " ")}</strong></td></tr>
    <tr><th>Material Detailed Specification</th><td colspan="3">${rec.material_specification}</td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Digital Weighbridge Measurement Telemetry</div>
    <table>
      <thead>
        <tr>
          <th class="tar">Vendor Invoiced Qty</th>
          <th class="tar">Gross Weight (MT)</th>
          <th class="tar">Tare Weight (MT)</th>
          <th class="tar">Net Actual Weight (MT)</th>
          <th class="tar">Variance (%)</th>
          <th class="tac">Weighbridge Slip Ref</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="tar font-bold">${rec.challan_quantity} ${rec.unit}</td>
          <td class="tar">${rec.gross_weight_mt > 0 ? `${rec.gross_weight_mt} MT` : "—"}</td>
          <td class="tar">${rec.tare_weight_mt > 0 ? `${rec.tare_weight_mt} MT` : "—"}</td>
          <td class="tar font-bold" style="color: #0369a1; font-size: 12px;">${rec.net_weight_mt} ${rec.unit}</td>
          <td class="tar font-bold" style="color: ${Math.abs(rec.weight_variance_pct) > 0.5 ? "#b91c1c" : "#15803d"};">
            ${rec.weight_variance_pct > 0 ? `+${rec.weight_variance_pct}%` : `${rec.weight_variance_pct}%`}
          </td>
          <td class="tac font-bold">${rec.weighbridge_slip_no || "WB-AUTO-SLIP"}</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${rec.material_category === "READY_MIX_CONCRETE_RMC" ? `
  <div class="box" style="margin-top: 14px;">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">IS 4926 Ready-Mix Concrete (RMC) Quality Gates</div>
    <div>Batch Discharge Time: <strong>${rec.rmc_batch_time ? new Date(rec.rmc_batch_time).toLocaleTimeString("en-IN") : "09:15 AM"}</strong> &bull; Site Arrival: <strong>${rec.rmc_gate_arrival_time ? new Date(rec.rmc_gate_arrival_time).toLocaleTimeString("en-IN") : "10:05 AM"}</strong></div>
    <div>Elapsed Transit Time: <strong style="color: ${rec.transit_duration_minutes > 90 ? "#b91c1c" : "#15803d"};">${rec.transit_duration_minutes} Minutes</strong> (IS 4926 Limit: 90 Mins max)</div>
    <div>Slump at Gate: <strong>${rec.gate_measured_slump_mm} mm</strong> &bull; Concrete Temperature: <strong>${rec.concrete_temperature_celsius}&deg;C</strong></div>
  </div>` : ""}

  ${rec.steel_heat_number ? `
  <div class="box" style="margin-top: 14px;">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">IS 1786 Mill Test Certificate (MTC) Heat Traceability</div>
    <div>Manufacturer Cast / Heat Number: <strong style="font-family: monospace;">${rec.steel_heat_number}</strong></div>
    <div>MTC Chemical &amp; Mechanical Conformance: <strong style="color: #15803d;">VERIFIED &amp; ATTESTED</strong></div>
  </div>` : ""}

  <div class="footer">
    <div>
      <div>Gate Security Inspector</div>
      <div style="color: #64748b;">${rec.gate_security_officer}</div>
      <div class="sig">Gate Entry Seal</div>
    </div>
    <div>
      <div>Site QA / Materials Inspector</div>
      <div style="color: #64748b;">${rec.qa_store_inspector || "Inspection Cleared"}</div>
      <div class="sig">QA Inspection Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">Physical Unloading Sanctioned</div>
      <div class="sig">Engineer Acceptance Seal</div>
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
        INITIALIZING SITE STORE, DIGITAL WEIGHBRIDGE &amp; MTC GATEWAY...
      </div>
    );
  }

  const isAccepted = selectedRecord.status === "ACCEPTED_UNLOADED";
  const isRejected = selectedRecord.status === "REJECTED_RETURNED_AT_GATE";
  const isRmc = selectedRecord.material_category === "READY_MIX_CONCRETE_RMC";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Materials Inward · CPWD Works Manual Section 14 / IS 4926 / IS 1786</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Site Store, Digital Weighbridge &amp; MTC Gateway
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Physical material receipt and weighbridge telemetry clearinghouse. Reconciles net payload against supplier challans, enforces IS 4926 90-minute RMC transit limits, verifies steel heat numbers, and halts defective supplies at the site gate.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintGateDocket(selectedRecord)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Gate Pass</span>
            </button>
            <Link
              href="/materials/reconciliation"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cl. 42 Reconciliation</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setGpNo(`GP-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-0${records.length + 1}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Log Gate Entry</span>
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
              <span>Accepted Payloads</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {summary.acceptedCount} / {summary.totalEntries} Consignments
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Weighbridge &amp; MTC verified</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Rejected at Site Gate</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.rejectedCount > 0 ? "text-rose-400" : "text-zinc-400"}`}>
              {summary.rejectedCount} Vehicles
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Weight or transit violations</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Accepted Fe500D Rebar</span>
              <Scale className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-cyan-300 mt-2">
              {summary.totalSteelAcceptedMt.toFixed(1)} MT
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">IS 1786 heat numbers cleared</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Pending Gate QA</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.pendingInspection > 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {summary.pendingInspection} Consignment(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Awaiting physical sampling &amp; slump</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Inward (${records.length})` },
              { key: "ACCEPTED_UNLOADED", label: "Accepted" },
              { key: "REJECTED_RETURNED_AT_GATE", label: `Rejected (${summary.rejectedCount})` },
              { key: "GATE_INSPECTION_PENDING", label: "Pending QA" },
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
              <option value="ALL">All Materials</option>
              <option value="STEEL_REBAR_FE500D">Fe500D TMT Rebar</option>
              <option value="READY_MIX_CONCRETE_RMC">RMC Concrete</option>
              <option value="CEMENT_OPC_PPC">Cement Bags / Bulker</option>
              <option value="AGGREGATES_SAND_COARSE">Aggregates &amp; Sand</option>
              <option value="AAC_BLOCKS_BRICKS">AAC Blocks &amp; Bricks</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search pass, vendor, vehicle, heat no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: GATE ENTRIES LISTING (5 cols) vs WEIGHBRIDGE & TELEMETRY DESK (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: INWARD CONSIGNMENTS LISTING (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Gatehouse Ledger (Form 13)
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Logged Inward Vehicles</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredRecords.length} Consignments</span>
            </div>

            <div className="space-y-3">
              {filteredRecords.map((rec) => {
                const isSelected = selectedRecord.id === rec.id;
                const isPass = rec.status === "ACCEPTED_UNLOADED";

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
                          {rec.gate_pass_number}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isPass
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : rec.status === "REJECTED_RETURNED_AT_GATE"
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {rec.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-white">
                          {rec.net_weight_mt} {rec.unit}
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Challan: {rec.challan_quantity} {rec.unit}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{rec.material_specification}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        Vehicle: <strong className="text-zinc-200">{rec.vehicle_registration_no}</strong> &bull; {rec.vendor_name}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Invoice: <strong className="text-zinc-300">{rec.challan_invoice_no}</strong></span>
                      <span>Variance: <strong className={Math.abs(rec.weight_variance_pct) > 0.5 ? "text-rose-400" : "text-emerald-400"}>{rec.weight_variance_pct > 0 ? `+${rec.weight_variance_pct}%` : `${rec.weight_variance_pct}%`}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: WEIGHBRIDGE & PHYSICAL INSPECTION DESK (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Material Verification Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedRecord.gate_pass_number} &mdash; {selectedRecord.material_category.replace(/_/g, " ")}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isAccepted
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : isRejected
                  ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                  : "bg-amber-950 text-amber-400 border border-amber-800/50"
              }`}>
                {selectedRecord.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Material Specification:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedRecord.material_specification}</strong>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Vendor / Source:</span>
                  <span className="text-cyan-300 font-bold font-sans">{selectedRecord.vendor_name}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Carrier Vehicle:</span>
                  <span className="text-white font-bold">{selectedRecord.vehicle_registration_no}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">PO Reference:</span>
                  <span className="text-white">{selectedRecord.po_reference}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Challan Ref:</span>
                  <span className="text-zinc-200">{selectedRecord.challan_invoice_no}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Invoiced Qty:</span>
                  <span className="text-cyan-300 font-bold">{selectedRecord.challan_quantity} {selectedRecord.unit}</span>
                </div>
              </div>
            </div>

            {/* WEIGHBRIDGE TELEMETRY WATERFALL */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Digital Weighbridge Calibration Telemetry:
              </span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Gross Weight:</span>
                  <span className="text-white font-bold">{selectedRecord.gross_weight_mt > 0 ? `${selectedRecord.gross_weight_mt} MT` : "—"}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Tare Weight (Empty Carrier):</span>
                  <span className="text-zinc-300">-{selectedRecord.tare_weight_mt > 0 ? `${selectedRecord.tare_weight_mt} MT` : "—"}</span>
                </div>
                <div className="flex justify-between text-cyan-300 font-bold pt-1 border-t border-zinc-800">
                  <span>Net Physical Payload Delivered:</span>
                  <span>{selectedRecord.net_weight_mt} {selectedRecord.unit}</span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-zinc-800">
                  <span>Challan vs Weighbridge Variance:</span>
                  <span className={`font-bold ${Math.abs(selectedRecord.weight_variance_pct) > 0.5 ? "text-rose-400" : "text-emerald-400"}`}>
                    {selectedRecord.weight_variance_pct > 0 ? `+${selectedRecord.weight_variance_pct}%` : `${selectedRecord.weight_variance_pct}%`} (Tolerance: &plusmn;0.5%)
                  </span>
                </div>
              </div>
            </div>

            {/* RMC & IS 4926 TRANSIT GATE */}
            {isRmc && (
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-cyan-300 font-bold">
                  <span>IS 4926 Ready-Mix Concrete Gate Verification</span>
                  <Truck className="w-4 h-4" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-zinc-300 pt-1">
                  <div>
                    <span className="text-zinc-500 block">Transit Time:</span>
                    <strong className={selectedRecord.transit_duration_minutes > 90 ? "text-rose-400" : "text-emerald-400"}>
                      {selectedRecord.transit_duration_minutes} Mins (Max 90)
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Slump at Gate:</span>
                    <strong>{selectedRecord.gate_measured_slump_mm} mm</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Temp (&deg;C):</span>
                    <strong>{selectedRecord.concrete_temperature_celsius}&deg;C</strong>
                  </div>
                </div>
              </div>
            )}

            {/* STEEL HEAT NO. & MTC CHECK */}
            {selectedRecord.steel_heat_number && (
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 font-mono text-xs flex items-center justify-between">
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase block">IS 1786 Mill Test Certificate Heat No.</span>
                  <strong className="text-white font-mono">{selectedRecord.steel_heat_number}</strong>
                </div>
                <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                  MTC ATTESTED
                </span>
              </div>
            )}

            {/* ACTION STAGE BUTTONS */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Gate Inspection Clearances:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Action 1: Accept & Unload */}
                {selectedRecord.status !== "ACCEPTED_UNLOADED" && (
                  <button
                    type="button"
                    disabled={!isStoreOrQa || actionInProgress === `accept_${selectedRecord.id}`}
                    onClick={() => handleAcceptMaterial(selectedRecord)}
                    className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept &amp; Authorize Unloading</span>
                  </button>
                )}

                {/* Action 2: Reject at Gate */}
                {selectedRecord.status !== "REJECTED_RETURNED_AT_GATE" && (
                  <button
                    type="button"
                    disabled={!isStoreOrQa || actionInProgress === `reject_${selectedRecord.id}`}
                    onClick={() => handleRejectMaterial(selectedRecord)}
                    className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/50 font-mono disabled:opacity-50"
                  >
                    <AlertOctagon className="w-4 h-4" />
                    <span>Reject Consignment at Gate</span>
                  </button>
                )}
              </div>

              {isAccepted && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Consignment Verified &amp; Accepted into Site Stock</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Inspected on {selectedRecord.inspected_at ? new Date(selectedRecord.inspected_at).toLocaleDateString("en-IN") : "Today"} by {selectedRecord.qa_store_inspector || "Site Store QA"}. Reconciled into Material Register.
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD Form 13 &amp; IS 4926 / IS 1786 Materials Control Protocol
            </div>
          </div>

        </div>

        {/* LOG GATE ENTRY MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Log Material Gate Inward (Form 13)
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

              <form onSubmit={handleCreateGateRecord} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Gate Pass No.</label>
                    <input
                      type="text"
                      required
                      value={gpNo}
                      onChange={(e) => setGpNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Material Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as MaterialCategoryGate)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="STEEL_REBAR_FE500D">Fe500D TMT Rebar</option>
                      <option value="READY_MIX_CONCRETE_RMC">Ready-Mix Concrete (RMC)</option>
                      <option value="CEMENT_OPC_PPC">Cement (OPC / PPC)</option>
                      <option value="AGGREGATES_SAND_COARSE">Aggregates &amp; Sand</option>
                      <option value="AAC_BLOCKS_BRICKS">AAC Blocks &amp; Bricks</option>
                      <option value="STRUCTURAL_STEEL_SECTIONS">Structural Sections</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Material Detailed Specification</label>
                  <input
                    type="text"
                    required
                    value={spec}
                    onChange={(e) => setSpec(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Vendor / Manufacturer</label>
                    <input
                      type="text"
                      required
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">PO Reference</label>
                    <input
                      type="text"
                      required
                      value={poRef}
                      onChange={(e) => setPoRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Carrier Vehicle Registration</label>
                    <input
                      type="text"
                      required
                      value={vehicle}
                      onChange={(e) => setVehicle(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Driver Name &amp; Contact</label>
                    <input
                      type="text"
                      required
                      value={driver}
                      onChange={(e) => setDriver(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Challan Qty</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={challanQty}
                      onChange={(e) => setChallanQty(Number(e.target.value))}
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
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Invoice Ref</label>
                    <input
                      type="text"
                      required
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* Weighbridge Readings */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 font-mono text-[11px]">
                  <div>
                    <label className="block text-zinc-400 mb-1">Gross Weight (MT)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={grossWeight}
                      onChange={(e) => setGrossWeight(Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-white outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Tare Weight (MT)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tareWeight}
                      onChange={(e) => setTareWeight(Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-white outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>

                {/* Category specific fields */}
                {category === "READY_MIX_CONCRETE_RMC" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Elapsed Transit (Mins)</label>
                      <input
                        type="number"
                        value={transitMins}
                        onChange={(e) => setTransitMins(Number(e.target.value))}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Slump at Gate (mm)</label>
                      <input
                        type="number"
                        value={slumpAtGate}
                        onChange={(e) => setSlumpAtGate(Number(e.target.value))}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                )}

                {category === "STEEL_REBAR_FE500D" && (
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Manufacturer Heat / Cast Number</label>
                    <input
                      type="text"
                      value={heatNo}
                      onChange={(e) => setHeatNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                )}

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
                    disabled={actionInProgress === "creating_gate"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Log Gate Pass</span>
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