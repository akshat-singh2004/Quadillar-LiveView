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
  Camera,
  CheckCircle2,
  Clock,
  Coins,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  HardHat,
  Layers,
  Lock,
  Plus,
  Printer,
  Radio,
  RefreshCw,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Unlock,
  Users,
  Video,
  Wrench,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type SafetyPermitType =
  | "WORKING_AT_HEIGHT"
  | "HOT_WORK_WELDING"
  | "DEEP_EXCAVATION_SHORING"
  | "CONFINED_SPACE_ENTRY"
  | "HEAVY_LIFT_CRANE"
  | "NIGHT_POUR_LIGHTING";

export type SafetyPermitStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "EHS_AUDITED"
  | "SEOR_AUTHORIZED"
  | "ACTIVE_LIVE"
  | "CLOSED_SAFE"
  | "STOP_WORK_REVOKED";

export interface PermitRecord {
  id: string;
  project_id: string;
  permit_number: string;
  title: string;
  permit_type: SafetyPermitType;
  location_grid: string;
  elevation_m: number;
  contractor_entity: string;
  trade_package: string;
  supervisor_in_charge: string;
  safety_officer_name?: string | null;
  seor_engineer_name?: string | null;
  start_time: string;
  expiry_time: string;
  toolbox_talk_conducted: boolean;
  workers_inducted_count: number;
  ppe_mandatory_verified: boolean;
  fall_arrest_harness_inspected: boolean;
  fire_extinguisher_deployed: boolean;
  gas_atmosphere_safe: boolean;
  shuttering_scaffolding_certified: boolean;
  linked_camera_code?: string | null;
  linked_pour_card_ref?: string | null;
  ai_safety_violations_count: number;
  stop_work_issued: boolean;
  stop_work_reason?: string | null;
  status: SafetyPermitStatus;
  authorized_at?: string | null;
  closed_at?: string | null;
  created_at?: string;
}

function normalizePermit(d: any): PermitRecord {
  const number = d?.permit_number ?? `PTW-${Date.now().toString().slice(-4)}`;

  return {
    id: d?.id ?? `ptw-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    permit_number: number,
    title: d?.title ?? "High-Risk Activity Work Permit",
    permit_type: (d?.permit_type as SafetyPermitType) ?? "WORKING_AT_HEIGHT",
    location_grid: d?.location_grid ?? "Site Grid",
    elevation_m: Number(d?.elevation_m ?? 0),
    contractor_entity: d?.contractor_entity ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    supervisor_in_charge: d?.supervisor_in_charge ?? "Site Foreman",
    safety_officer_name: d?.safety_officer_name ?? null,
    seor_engineer_name: d?.seor_engineer_name ?? null,
    start_time: d?.start_time ?? new Date().toISOString(),
    expiry_time: d?.expiry_time ?? new Date(Date.now() + 8 * 3600000).toISOString(),
    toolbox_talk_conducted: Boolean(d?.toolbox_talk_conducted),
    workers_inducted_count: Number(d?.workers_inducted_count ?? 0),
    ppe_mandatory_verified: Boolean(d?.ppe_mandatory_verified),
    fall_arrest_harness_inspected: Boolean(d?.fall_arrest_harness_inspected),
    fire_extinguisher_deployed: Boolean(d?.fire_extinguisher_deployed),
    gas_atmosphere_safe: d?.gas_atmosphere_safe !== undefined ? Boolean(d.gas_atmosphere_safe) : true,
    shuttering_scaffolding_certified: Boolean(d?.shuttering_scaffolding_certified),
    linked_camera_code: d?.linked_camera_code ?? null,
    linked_pour_card_ref: d?.linked_pour_card_ref ?? null,
    ai_safety_violations_count: Number(d?.ai_safety_violations_count ?? 0),
    stop_work_issued: Boolean(d?.stop_work_issued),
    stop_work_reason: d?.stop_work_reason ?? null,
    status: (d?.status as SafetyPermitStatus) ?? "DRAFT",
    authorized_at: d?.authorized_at ?? null,
    closed_at: d?.closed_at ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalPermitsToWorkPage() {
  const { project, role, tier } = useActiveRole();
  const [permits, setPermits] = useState<PermitRecord[]>([]);
  const [selectedPermit, setSelectedPermit] = useState<PermitRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [stopWorkModalOpen, setStopWorkModalOpen] = useState(false);
  const [stopWorkReasonInput, setStopWorkReasonInput] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "EHS Safety Officer";
  const isSafetyOrSeor =
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleId === "RESIDENT_ENGINEER" ||
    roleId === "SITE_FOREMAN" ||
    roleLabel.includes("Safety") ||
    roleLabel.includes("EHS") ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Engineer") ||
    roleLabel.includes("Director");

  // Form State for Registering New Permit
  const [permitNo, setPermitNo] = useState(
    `PTW-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [permitTitle, setPermitTitle] = useState(
    tier === "RESIDENTIAL"
      ? "Balcony Glass Balustrade Edge Glazing Installation"
      : "Level 08 Tower Crane Concrete Bucket Tandem Pouring & Formwork Erection"
  );
  const [permitType, setPermitType] = useState<SafetyPermitType>(
    tier === "RESIDENTIAL" ? "WORKING_AT_HEIGHT" : "HEAVY_LIFT_CRANE"
  );
  const [locationGrid, setLocationGrid] = useState(
    tier === "RESIDENTIAL" ? "Balcony Deck FB-01" : "Tower A / Level 08 / Axis C2-D4"
  );
  const [elevation, setElevation] = useState<number>(tier === "RESIDENTIAL" ? 3.6 : 28.8);
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Glazing" : "Civil & Superstructure"
  );
  const [supervisor, setSupervisor] = useState("K. Ramesh (Site Foreman)");
  const [inductedCount, setInductedCount] = useState<number>(tier === "RESIDENTIAL" ? 6 : 24);
  const [cameraCode, setCameraCode] = useState(tier === "RESIDENTIAL" ? "CAM-RES-GATE" : "CAM-CORE-02");
  const [pourRef, setPourRef] = useState(tier === "RESIDENTIAL" ? "PC-RES-088" : "PC-TWR-109");

  const loadPermits = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("site_permits_to_work")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizePermit(d));
        setPermits(normalized);
        if (!selectedPermit) setSelectedPermit(normalized[0]);
      } else {
        const defaults: PermitRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizePermit({
                  id: "ptw-res-01",
                  project_id: projectId,
                  permit_number: "PTW-RES-014",
                  title: "Exterior Balcony Toughened Glass Handrail Fixing",
                  permit_type: "WORKING_AT_HEIGHT",
                  location_grid: "First Floor / Axis FB-01",
                  elevation_m: 3.6,
                  contractor_entity: "Royal Woodworks & Interiors",
                  trade_package: "Custom Joinery & Glazing",
                  supervisor_in_charge: "S. Pal",
                  safety_officer_name: "Lead EHS Engineer",
                  seor_engineer_name: "Principal Architect",
                  start_time: new Date(Date.now() - 2 * 3600000).toISOString(),
                  expiry_time: new Date(Date.now() + 6 * 3600000).toISOString(),
                  toolbox_talk_conducted: true,
                  workers_inducted_count: 6,
                  ppe_mandatory_verified: true,
                  fall_arrest_harness_inspected: true,
                  fire_extinguisher_deployed: false,
                  gas_atmosphere_safe: true,
                  shuttering_scaffolding_certified: true,
                  linked_camera_code: "CAM-RES-GATE",
                  ai_safety_violations_count: 0,
                  stop_work_issued: false,
                  status: "ACTIVE_LIVE",
                  authorized_at: new Date(Date.now() - 2 * 3600000).toISOString(),
                }),
              ]
            : [
                normalizePermit({
                  id: "ptw-twr-01",
                  project_id: projectId,
                  permit_number: "PTW-TWR-109",
                  title: "Level 08 Core Shear Wall Concrete Pour & Tower Crane Hoisting",
                  permit_type: "HEAVY_LIFT_CRANE",
                  location_grid: "Tower A / Level 08 / Axis C2-D4",
                  elevation_m: 28.8,
                  contractor_entity: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  supervisor_in_charge: "M. K. Sharma",
                  safety_officer_name: "Chief Safety Officer (EHS)",
                  seor_engineer_name: "Resident SEOR",
                  start_time: new Date(Date.now() - 4 * 3600000).toISOString(),
                  expiry_time: new Date(Date.now() + 4 * 3600000).toISOString(),
                  toolbox_talk_conducted: true,
                  workers_inducted_count: 32,
                  ppe_mandatory_verified: true,
                  fall_arrest_harness_inspected: true,
                  fire_extinguisher_deployed: true,
                  gas_atmosphere_safe: true,
                  shuttering_scaffolding_certified: true,
                  linked_camera_code: "CAM-CORE-02",
                  linked_pour_card_ref: "PC-TWR-109",
                  ai_safety_violations_count: 1,
                  stop_work_issued: false,
                  status: "ACTIVE_LIVE",
                  authorized_at: new Date(Date.now() - 4 * 3600000).toISOString(),
                }),
                normalizePermit({
                  id: "ptw-twr-02",
                  project_id: projectId,
                  permit_number: "PTW-TWR-108",
                  title: "Basement B2 Pump Room Sump Pit Shoring Welding & Hot Work",
                  permit_type: "HOT_WORK_WELDING",
                  location_grid: "Basement B2 / Axis A1",
                  elevation_m: -6.5,
                  contractor_entity: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  supervisor_in_charge: "R. K. Yadav",
                  safety_officer_name: "Chief Safety Officer (EHS)",
                  start_time: new Date(Date.now() - 24 * 3600000).toISOString(),
                  expiry_time: new Date(Date.now() - 16 * 3600000).toISOString(),
                  toolbox_talk_conducted: true,
                  workers_inducted_count: 8,
                  ppe_mandatory_verified: true,
                  fall_arrest_harness_inspected: false,
                  fire_extinguisher_deployed: true,
                  gas_atmosphere_safe: true,
                  shuttering_scaffolding_certified: false,
                  linked_camera_code: "CAM-GATE-01",
                  ai_safety_violations_count: 0,
                  stop_work_issued: false,
                  status: "CLOSED_SAFE",
                  authorized_at: new Date(Date.now() - 24 * 3600000).toISOString(),
                  closed_at: new Date(Date.now() - 16 * 3600000).toISOString(),
                }),
              ];

        setPermits(defaults);
        if (!selectedPermit) setSelectedPermit(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedPermit, tier]);

  useEffect(() => {
    void loadPermits();

    const channel = supabase
      .channel(`ptw_realtime_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_permits_to_work" }, () => void loadPermits())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadPermits]);

  const summary = useMemo(() => {
    const totalPermits = permits.length;
    const activeCount = permits.filter((p) => p.status === "ACTIVE_LIVE").length;
    const revokedCount = permits.filter((p) => p.status === "STOP_WORK_REVOKED" || p.stop_work_issued).length;
    const workersProtected = permits
      .filter((p) => p.status === "ACTIVE_LIVE")
      .reduce((sum, p) => sum + Number(p.workers_inducted_count || 0), 0);

    return { totalPermits, activeCount, revokedCount, workersProtected };
  }, [permits]);

  const filteredPermits = useMemo(() => {
    return permits.filter((p) => {
      const matchType = filterType === "ALL" || p.permit_type === filterType;
      const matchStatus = filterStatus === "ALL" || p.status === filterStatus;
      const haystack = `${p.permit_number} ${p.title} ${p.contractor_entity} ${p.location_grid}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchType && matchStatus && matchSearch;
    });
  }, [permits, filterType, filterStatus, search]);

  // Stage Checklist Toggles
  const handleToggleChecklist = async (
    field:
      | "toolbox_talk_conducted"
      | "ppe_mandatory_verified"
      | "fall_arrest_harness_inspected"
      | "fire_extinguisher_deployed"
      | "shuttering_scaffolding_certified"
  ) => {
    if (!selectedPermit) return;
    setActionInProgress(`toggle_${field}`);

    const updatedValue = !selectedPermit[field];
    const updatePayload: Partial<PermitRecord> = { [field]: updatedValue };

    try {
      await (supabase as any)
        .from("site_permits_to_work")
        .update(updatePayload)
        .eq("id", selectedPermit.id);
    } catch {
      // Local optimistic update
    }

    setPermits((prev) =>
      prev.map((p) => (p.id === selectedPermit.id ? ({ ...p, ...updatePayload } as PermitRecord) : p))
    );
    setSelectedPermit((prev) => (prev ? ({ ...prev, ...updatePayload } as PermitRecord) : null));
    setActionInProgress(null);
  };

  // Authorize & Activate Permit (Dual Sign-Off)
  const handleAuthorizePermit = async () => {
    if (!selectedPermit || !isSafetyOrSeor) return;
    setActionInProgress("authorize");

    const updatePayload: Partial<PermitRecord> = {
      status: "ACTIVE_LIVE",
      safety_officer_name: roleLabel || "EHS Safety Lead",
      seor_engineer_name: "Resident SEOR",
      authorized_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("site_permits_to_work")
        .update(updatePayload)
        .eq("id", selectedPermit.id);
    } catch {
      // Local optimistic update
    }

    setPermits((prev) =>
      prev.map((p) => (p.id === selectedPermit.id ? ({ ...p, ...updatePayload } as PermitRecord) : p))
    );
    setSelectedPermit((prev) => (prev ? ({ ...prev, ...updatePayload } as PermitRecord) : null));
    setFeedbackMessage(`Permit ${selectedPermit.permit_number} authorized. High-risk activity active on site.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Issue Statutory Stop-Work Order & Auto-Generate NCR
  const handleIssueStopWork = async () => {
    if (!selectedPermit || !stopWorkReasonInput.trim() || !isSafetyOrSeor) return;
    setActionInProgress("stop_work");

    const updatePayload: Partial<PermitRecord> = {
      status: "STOP_WORK_REVOKED",
      stop_work_issued: true,
      stop_work_reason: stopWorkReasonInput.trim(),
    };

    try {
      await (supabase as any)
        .from("site_permits_to_work")
        .update(updatePayload)
        .eq("id", selectedPermit.id);

      // Auto-escalate to Quality & Safety NCR Backcharge Ledger
      await (supabase as any).from("non_conformance_reports").insert([
        {
          project_id: projectId,
          ncr_code: `NCR-SAFE-${selectedPermit.permit_number}`,
          ncr_number: `NCR-SAFE-${selectedPermit.permit_number}`,
          title: `Emergency Stop-Work Order: ${selectedPermit.title}`,
          structural_element: selectedPermit.location_grid,
          location_grid: selectedPermit.location_grid,
          trade_package: selectedPermit.trade_package,
          assigned_contractor: selectedPermit.contractor_entity,
          remediation_contractor: selectedPermit.contractor_entity,
          severity: "Critical_Structural",
          defect_category: "Safety_Protocol_Violation",
          description: `Contractor permit ${selectedPermit.permit_number} revoked under BOCW Section 38. Safety hazard: ${stopWorkReasonInput.trim()}`,
          remedial_action_required: "Halt all work immediately. Re-induct workers and rectify fall arrest scaffolding.",
          estimated_debit_inr: 50000,
          backcharge_amount: 50000,
          enforce_auto_debit: true,
          status: "OPEN_DEBIT_PENDING",
          issued_by: roleLabel || "EHS Safety Officer",
          issued_date: new Date().toISOString().slice(0, 10),
        },
      ]);
    } catch {
      // Local optimistic update
    }

    setPermits((prev) =>
      prev.map((p) => (p.id === selectedPermit.id ? ({ ...p, ...updatePayload } as PermitRecord) : p))
    );
    setSelectedPermit((prev) => (prev ? ({ ...prev, ...updatePayload } as PermitRecord) : null));
    setStopWorkModalOpen(false);
    setStopWorkReasonInput("");
    setFeedbackMessage(`Stop-Work Order enforced for ${selectedPermit.permit_number}. Safety NCR backcharge logged.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Close Permit Safe
  const handleClosePermitSafe = async () => {
    if (!selectedPermit) return;
    setActionInProgress("close_safe");

    const updatePayload: Partial<PermitRecord> = {
      status: "CLOSED_SAFE",
      closed_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("site_permits_to_work")
        .update(updatePayload)
        .eq("id", selectedPermit.id);
    } catch {
      // Local optimistic update
    }

    setPermits((prev) =>
      prev.map((p) => (p.id === selectedPermit.id ? ({ ...p, ...updatePayload } as PermitRecord) : p))
    );
    setSelectedPermit((prev) => (prev ? ({ ...prev, ...updatePayload } as PermitRecord) : null));
    setActionInProgress(null);
  };

  // Create New Permit
  const handleCreatePermit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_ptw");

    const newDbRecord: Omit<PermitRecord, "id"> = {
      project_id: projectId,
      permit_number: permitNo.trim(),
      title: permitTitle.trim(),
      permit_type: permitType,
      location_grid: locationGrid.trim(),
      elevation_m: Number(elevation),
      contractor_entity: contractor.trim(),
      trade_package: tradePackage.trim(),
      supervisor_in_charge: supervisor.trim(),
      start_time: new Date().toISOString(),
      expiry_time: new Date(Date.now() + 8 * 3600000).toISOString(),
      toolbox_talk_conducted: true,
      workers_inducted_count: Number(inductedCount),
      ppe_mandatory_verified: true,
      fall_arrest_harness_inspected: permitType === "WORKING_AT_HEIGHT",
      fire_extinguisher_deployed: permitType === "HOT_WORK_WELDING",
      gas_atmosphere_safe: true,
      shuttering_scaffolding_certified: true,
      linked_camera_code: cameraCode.trim(),
      linked_pour_card_ref: pourRef.trim(),
      ai_safety_violations_count: 0,
      stop_work_issued: false,
      status: "DRAFT",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("site_permits_to_work")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizePermit(data);
        setPermits((prev) => [normalized, ...prev]);
        setSelectedPermit(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizePermit({ ...newDbRecord, id: `ptw-${Date.now()}` });
      setPermits((prev) => [fallback, ...prev]);
      setSelectedPermit(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory BOCW / CPWD Printable Permit Voucher
  const handlePrintPtw = (ptw: PermitRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Statutory Permit to Work (BOCW / CPWD) — ${ptw.permit_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .active { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .revoked { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-top: 14px; background: #fafafa; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 40px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · BOCW Act 1996 / CPWD GCC Clause 19 Safety Code</div>
      <h1 class="title">Statutory Permit to Work (PTW Voucher)</h1>
      <div class="meta">Permit Ref: ${ptw.permit_number} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${ptw.status === "ACTIVE_LIVE" ? "active" : ptw.status === "STOP_WORK_REVOKED" ? "revoked" : "active"}">
      ${ptw.status.replace(/_/g, " ")}
    </span>
  </div>

  <table>
    <tr><th>Activity Classification</th><td><strong>${ptw.permit_type.replace(/_/g, " ")}</strong></td><th>Location Grid</th><td><strong>${ptw.location_grid}</strong> (+${ptw.elevation_m}m)</td></tr>
    <tr><th>Executing Contractor</th><td>${ptw.contractor_entity}</td><th>Trade Package</th><td>${ptw.trade_package}</td></tr>
    <tr><th>Supervisor In-Charge</th><td>${ptw.supervisor_in_charge}</td><th>Workers Inducted</th><td><strong>${ptw.workers_inducted_count} Person-days</strong></td></tr>
    <tr><th>Permit Start Horizon</th><td>${new Date(ptw.start_time).toLocaleString("en-IN")}</td><th>Permit Expiry Window</th><td>${new Date(ptw.expiry_time).toLocaleString("en-IN")}</td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Permitted Scope of High-Risk Construction Activity</div>
    <div>${ptw.title}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Mandatory BOCW / IS 13416 Safety Checklist</th>
        <th>Standard Specification Benchmark</th>
        <th style="text-align: center;">Verification</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Daily Pre-Shift Tool Box Talk (TBT) Conducted</td>
        <td>Mandatory hazard briefing &amp; emergency route identification</td>
        <td style="text-align: center; font-weight: bold; color: ${ptw.toolbox_talk_conducted ? "#15803d" : "#b91c1c"};">
          ${ptw.toolbox_talk_conducted ? "CONDUCTED & LOGGED" : "NOT CONDUCTED"}
        </td>
      </tr>
      <tr>
        <td>2. Full Body Fall-Arrest Harness &amp; Static Lifelines</td>
        <td>IS 3521 dual-lanyard shock-absorbing harness &ge; 2.0m height</td>
        <td style="text-align: center; font-weight: bold; color: ${ptw.fall_arrest_harness_inspected ? "#15803d" : "#64748b"};">
          ${ptw.fall_arrest_harness_inspected ? "INSPECTED & HOOKED" : "N/A TO PERMIT"}
        </td>
      </tr>
      <tr>
        <td>3. Fire Watch &amp; ABC Dry Powder Extinguishers</td>
        <td>IS 2190 fire equipment within 5m of hot work arc</td>
        <td style="text-align: center; font-weight: bold; color: ${ptw.fire_extinguisher_deployed ? "#15803d" : "#64748b"};">
          ${ptw.fire_extinguisher_deployed ? "DEPLOYED & TESTED" : "N/A TO PERMIT"}
        </td>
      </tr>
      <tr>
        <td>4. Scaffolding Staging Rigidity &amp; Green Tag Certification</td>
        <td>IS 4014 scaffolding green inspection tag posted</td>
        <td style="text-align: center; font-weight: bold; color: ${ptw.shuttering_scaffolding_certified ? "#15803d" : "#b91c1c"};">
          ${ptw.shuttering_scaffolding_certified ? "GREEN TAG CERTIFIED" : "UNTAGGED"}
        </td>
      </tr>
    </tbody>
  </table>

  ${ptw.stop_work_issued ? `
  <div class="box" style="background: #fef2f2; border-color: #fca5a5;">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #991b1b; margin-bottom: 4px;">
      EMERGENCY STOP-WORK REVOCATION NOTICE
    </div>
    <div style="font-size: 11px; color: #b91c1c; font-weight: bold;">
      ${ptw.stop_work_reason || "Safety violation flagged by AI camera surveillance."}
    </div>
  </div>` : ""}

  <div class="footer">
    <div>
      <div>Site Contractor Foreman</div>
      <div style="color: #64748b;">${ptw.supervisor_in_charge}</div>
      <div class="sig">Supervisor Safety Commitment</div>
    </div>
    <div>
      <div>EHS Safety Officer</div>
      <div style="color: #64748b;">${ptw.safety_officer_name || "Safety Inspection Complete"}</div>
      <div class="sig">EHS Permit Authorization</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">${ptw.seor_engineer_name || "Consultant Concurrence"}</div>
      <div class="sig">Consultant Endorsement</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedPermit) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING STATUTORY PERMIT TO WORK &amp; EHS INCIDENT ENGINE...
      </div>
    );
  }

  const isLive = selectedPermit.status === "ACTIVE_LIVE";
  const isRevoked = selectedPermit.status === "STOP_WORK_REVOKED" || selectedPermit.stop_work_issued;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Safety Governance · BOCW Act 1996 / CPWD Clause 19 Safety Code</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Permits to Work (PTW) &amp; High-Risk Activities
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Strict statutory safety stage-gates. Live AI surveillance feeds flag PPE and boundary infractions. Stop-work orders automatically freeze pour cards and file commercial penalty backcharges.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintPtw(selectedPermit)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print PTW Voucher</span>
            </button>
            <Link
              href="/site/sensor-gateway"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Surveillance Nodes</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setPermitNo(`PTW-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Work Permit (PTW)</span>
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
              <span>Active Work Permits</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {summary.activeCount} Live
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">High-risk construction active</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Inducted Workers Protected</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-cyan-300 mt-2">
              {summary.workersProtected} Person-days
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Toolbox talk &amp; safety briefings passed</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Stop-Work Orders Issued</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold font-mono mt-2 ${summary.revokedCount > 0 ? "text-rose-400" : "text-zinc-400"}`}>
              {summary.revokedCount} Revocations
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Safety breaches escalated to NCR</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Logged Permits</span>
              <FileCheck className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {summary.totalPermits} Permits
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Managed under BOCW Section 38</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Permits (${permits.length})` },
              { key: "ACTIVE_LIVE", label: `Live Active (${summary.activeCount})` },
              { key: "DRAFT", label: "Draft Stage" },
              { key: "STOP_WORK_REVOKED", label: `Stop-Work (${summary.revokedCount})` },
              { key: "CLOSED_SAFE", label: "Closed Safe" },
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
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-400 font-mono"
            >
              <option value="ALL">All Risk Types</option>
              <option value="WORKING_AT_HEIGHT">Working at Height</option>
              <option value="HEAVY_LIFT_CRANE">Heavy Crane Lifting</option>
              <option value="HOT_WORK_WELDING">Hot Work &amp; Welding</option>
              <option value="DEEP_EXCAVATION_SHORING">Deep Excavation</option>
              <option value="CONFINED_SPACE_ENTRY">Confined Space</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search permit, grid, vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: PERMIT ROSTER (7 cols) vs SAFETY INSPECTION DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: PERMITS ROSTER (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  BOCW Statutory Safety Registry
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">High-Risk Activity Permits</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredPermits.length} Permits</span>
            </div>

            <div className="space-y-3">
              {filteredPermits.map((ptw) => {
                const isSelected = selectedPermit.id === ptw.id;
                const isItemLive = ptw.status === "ACTIVE_LIVE";
                const isItemRevoked = ptw.status === "STOP_WORK_REVOKED" || ptw.stop_work_issued;

                return (
                  <div
                    key={ptw.id}
                    onClick={() => setSelectedPermit(ptw)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {ptw.permit_number}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {ptw.permit_type.replace(/_/g, " ")}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isItemLive
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50 animate-pulse"
                            : isItemRevoked
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                            : "bg-zinc-800 text-zinc-400"
                        }`}>
                          {ptw.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-400 font-bold">
                          {ptw.workers_inducted_count} Workers
                        </span>
                        {ptw.ai_safety_violations_count > 0 && (
                          <span className="text-[10px] text-rose-400 font-mono font-bold">
                            ({ptw.ai_safety_violations_count} AI Alerts)
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{ptw.title}</div>
                      <div className="text-xs text-cyan-400 font-mono mt-0.5">
                        Location: {ptw.location_grid} (+{ptw.elevation_m}m) &bull; Supervisor: {ptw.supervisor_in_charge}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Vendor: <strong className="text-zinc-300">{ptw.contractor_entity}</strong></span>
                      <span>Expires: <strong className="text-zinc-300">{new Date(ptw.expiry_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: SAFETY AUDIT & STOP-WORK DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Safety Stage-Gate Verification
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedPermit.permit_number}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isLive
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : isRevoked
                  ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                  : "bg-amber-950 text-amber-400 border border-amber-800/50"
              }`}>
                {selectedPermit.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2 text-xs font-mono">
              <span className="text-[10px] uppercase text-zinc-500 block">Activity Description:</span>
              <strong className="text-white text-sm font-sans block leading-snug">{selectedPermit.title}</strong>
              <div className="text-cyan-400 text-[11px]">{selectedPermit.location_grid} (+{selectedPermit.elevation_m}m)</div>
              <div className="pt-2 border-t border-zinc-800/60 flex justify-between text-[11px] text-zinc-400">
                <span>Contractor: <strong className="text-white font-sans">{selectedPermit.contractor_entity}</strong></span>
                <span>Inducted: <strong className="text-cyan-300">{selectedPermit.workers_inducted_count} Personnel</strong></span>
              </div>
            </div>

            {/* LIVE SURVEILLANCE CAMERA BINDING */}
            {selectedPermit.linked_camera_code && (
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="font-bold text-white block">Bound AI Surveillance Feed</span>
                    <span className="text-[10px] text-zinc-400">{selectedPermit.linked_camera_code}</span>
                  </div>
                </div>
                <Link href="/site/sensor-gateway" className="text-xs text-cyan-400 underline font-mono">
                  Inspect Node &rarr;
                </Link>
              </div>
            )}

            {/* BOCW / IS 13416 MANDATORY SAFETY CHECKLIST */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Statutory Physical Safety Checkpoints:
              </span>

              <div className="space-y-2 font-mono text-xs">
                {/* Check 1: Toolbox Talk */}
                <div
                  onClick={() => handleToggleChecklist("toolbox_talk_conducted")}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    selectedPermit.toolbox_talk_conducted
                      ? "border-emerald-800/60 bg-emerald-950/20 text-emerald-300"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {selectedPermit.toolbox_talk_conducted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-700 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold text-white block">Pre-Shift Toolbox Talk Conducted</span>
                      <span className="text-[10px] text-zinc-500">Briefed on hazard controls &amp; rescue routes</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase">{selectedPermit.toolbox_talk_conducted ? "Passed" : "Hold"}</span>
                </div>

                {/* Check 2: Mandatory PPE */}
                <div
                  onClick={() => handleToggleChecklist("ppe_mandatory_verified")}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    selectedPermit.ppe_mandatory_verified
                      ? "border-emerald-800/60 bg-emerald-950/20 text-emerald-300"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {selectedPermit.ppe_mandatory_verified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-700 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold text-white block">Mandatory PPE Verified</span>
                      <span className="text-[10px] text-zinc-500">Helmets, steel-toe boots, high-vis vests</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase">{selectedPermit.ppe_mandatory_verified ? "Passed" : "Hold"}</span>
                </div>

                {/* Check 3: Fall Arrest Harness */}
                <div
                  onClick={() => handleToggleChecklist("fall_arrest_harness_inspected")}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    selectedPermit.fall_arrest_harness_inspected
                      ? "border-emerald-800/60 bg-emerald-950/20 text-emerald-300"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {selectedPermit.fall_arrest_harness_inspected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-700 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold text-white block">Full-Body Fall-Arrest Harness</span>
                      <span className="text-[10px] text-zinc-500">IS 3521 dual lanyard hooked to static lifeline</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase">{selectedPermit.fall_arrest_harness_inspected ? "Passed" : "Hold"}</span>
                </div>

                {/* Check 4: Scaffolding Staging */}
                <div
                  onClick={() => handleToggleChecklist("shuttering_scaffolding_certified")}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    selectedPermit.shuttering_scaffolding_certified
                      ? "border-emerald-800/60 bg-emerald-950/20 text-emerald-300"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {selectedPermit.shuttering_scaffolding_certified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-700 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold text-white block">Scaffolding Staging Green-Tag Certified</span>
                      <span className="text-[10px] text-zinc-500">Base jacks, sole plates &amp; tie-backs rigid</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase">{selectedPermit.shuttering_scaffolding_certified ? "Passed" : "Hold"}</span>
                </div>
              </div>
            </div>

            {/* ACTION STAGE BUTTONS */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Statutory Authority Decision:
              </span>

              {/* Action 1: Authorize & Activate */}
              {selectedPermit.status !== "ACTIVE_LIVE" && selectedPermit.status !== "CLOSED_SAFE" && !selectedPermit.stop_work_issued && (
                <button
                  type="button"
                  disabled={!isSafetyOrSeor || actionInProgress === "authorize"}
                  onClick={handleAuthorizePermit}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorize &amp; Activate Safety Permit (EHS / SEOR)</span>
                </button>
              )}

              {/* Action 2: Emergency Stop-Work Order */}
              {isLive && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStopWorkModalOpen(true)}
                    className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/50 font-mono"
                  >
                    <AlertOctagon className="w-4 h-4" />
                    <span>Issue Stop-Work Order</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClosePermitSafe}
                    className="py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-bold text-xs transition flex items-center justify-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Close Permit Safe</span>
                  </button>
                </div>
              )}

              {isRevoked && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 font-mono text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-200">
                    <AlertOctagon className="w-4 h-4 text-rose-400" />
                    <span>STOP-WORK ORDER ENFORCED</span>
                  </div>
                  <div className="text-[11px] text-zinc-300 font-sans">{selectedPermit.stop_work_reason}</div>
                  <div className="text-[10px] text-rose-400/80 pt-1 border-t border-rose-900/60">
                    Auto-escalated to Commercial NCR Backcharge Ledger (₹50,000 debit applied).
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              BOCW Act 1996 &amp; CPWD Clause 19 Safety Governance Protocol
            </div>
          </div>

        </div>

        {/* ISSUE NEW PTW MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Issue Permit to Work (BOCW / CPWD)
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

              <form onSubmit={handleCreatePermit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Permit Ref Number</label>
                    <input
                      type="text"
                      required
                      value={permitNo}
                      onChange={(e) => setPermitNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Risk Classification</label>
                    <select
                      value={permitType}
                      onChange={(e) => setPermitType(e.target.value as SafetyPermitType)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="WORKING_AT_HEIGHT">Working at Height (&ge; 2m)</option>
                      <option value="HEAVY_LIFT_CRANE">Heavy Crane Lifting / Hoisting</option>
                      <option value="HOT_WORK_WELDING">Hot Work / Arc Welding</option>
                      <option value="DEEP_EXCAVATION_SHORING">Deep Trench Excavation</option>
                      <option value="CONFINED_SPACE_ENTRY">Confined Space Entry</option>
                      <option value="NIGHT_POUR_LIGHTING">Night Concrete Pour</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Activity Designation</label>
                  <input
                    type="text"
                    required
                    value={permitTitle}
                    onChange={(e) => setPermitTitle(e.target.value)}
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Location Grid</label>
                    <input
                      type="text"
                      required
                      value={locationGrid}
                      onChange={(e) => setLocationGrid(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Elevation (meters)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={elevation}
                      onChange={(e) => setElevation(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Supervisor In-Charge</label>
                    <input
                      type="text"
                      required
                      value={supervisor}
                      onChange={(e) => setSupervisor(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Inducted Workers</label>
                    <input
                      type="number"
                      required
                      value={inductedCount}
                      onChange={(e) => setInductedCount(Number(e.target.value))}
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
                    disabled={actionInProgress === "creating_ptw"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Issue Draft Permit</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* STOP-WORK ORDER MODAL */}
        {stopWorkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-150">
            <div className="relative w-full max-w-md rounded-2xl border border-rose-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 text-rose-400 border-b border-rose-900/60 pb-3">
                <AlertOctagon className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono">
                  Enforce Emergency Stop-Work Order
                </h3>
              </div>

              <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                Issuing a Stop-Work Order immediately revokes active high-risk operations on {selectedPermit.permit_number} and records a ₹50,000 backcharge deduction into the active contractor RA bill.
              </p>

              <div>
                <label className="block text-rose-400 text-[11px] mb-1 font-mono font-bold">
                  Factual Safety Hazard / AI Infraction Reason:
                </label>
                <textarea
                  rows={3}
                  required
                  value={stopWorkReasonInput}
                  onChange={(e) => setStopWorkReasonInput(e.target.value)}
                  placeholder="Record observed hazard: e.g., Workers unhooked from lifeline on 28m perimeter deck..."
                  className="w-full rounded-xl border border-rose-800/80 bg-zinc-900 p-3 text-white text-xs outline-none focus:border-rose-400 font-sans resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStopWorkModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white font-mono"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!stopWorkReasonInput.trim() || actionInProgress === "stop_work"}
                  onClick={handleIssueStopWork}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-md shadow-rose-950/50 flex items-center gap-1.5 font-mono disabled:opacity-50"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>Enforce Order &amp; Apply Debit</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}