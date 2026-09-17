"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Award,
  Building,
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
  Settings,
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

export type StatutoryAuthorityType =
  | "MUNICIPAL_DEVELOPMENT_AUTHORITY"
  | "FIRE_SAFETY_DIRECTORATE"
  | "STATE_POLLUTION_CONTROL_BOARD"
  | "RERA_REGULATORY_AUTHORITY"
  | "AIRPORT_AUTHORITY_NOC"
  | "FOREST_TREE_OFFICER"
  | "ELECTRICAL_LIFT_INSPECTORATE";

export type ApprovalLifecycleStage =
  | "PRE_CONSTRUCTION_SANCTION"
  | "CONSTRUCTION_PLINTH_CHECK"
  | "POST_CONSTRUCTION_OCCUPANCY";

export type ApprovalStatus =
  | "DOCUMENT_SCRUTINY"
  | "FEE_PAID_AWAITING_INSPECTION"
  | "JOINT_SITE_INSPECTION_SCHEDULED"
  | "SANCTIONED_GRANTED"
  | "CONDITIONAL_REMEDIAL_HOLD"
  | "EXPIRED_RENEWAL_DUE";

export interface StatutoryPermitRecord {
  id: string;
  project_id: string;
  permit_reference_no: string;
  authority_type: StatutoryAuthorityType;
  permit_title: string;
  lifecycle_stage: ApprovalLifecycleStage;
  issuing_authority_name: string;
  application_number: string;
  application_date: string;
  challan_fee_paid_inr: number;
  challan_receipt_ref?: string | null;
  joint_inspection_date?: string | null;
  approval_grant_date?: string | null;
  validity_expiry_date?: string | null;
  is_rera_registration: boolean;
  rera_registration_number?: string | null;
  is_plinth_certificate: boolean;
  plinth_checked_setbacks_ok: boolean;
  is_fire_safety_noc: boolean;
  status: ApprovalStatus;
  designated_liaison_officer: string;
  sanctioning_officer_name?: string | null;
  statutory_conditions_summary?: string | null;
  digital_order_url?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function normalizePermit(d: any): StatutoryPermitRecord {
  const grantDate = d?.approval_grant_date ?? null;
  const expiry = d?.validity_expiry_date ?? (grantDate ? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10) : null);
  const isExpired = expiry && new Date(expiry).getTime() < Date.now();

  return {
    id: d?.id ?? `permit-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    permit_reference_no: d?.permit_reference_no ?? `PERM-${Date.now().toString().slice(-4)}`,
    authority_type: (d?.authority_type as StatutoryAuthorityType) ?? "MUNICIPAL_DEVELOPMENT_AUTHORITY",
    permit_title: d?.permit_title ?? "Municipal Building Sanction Clearance",
    lifecycle_stage: (d?.lifecycle_stage as ApprovalLifecycleStage) ?? "PRE_CONSTRUCTION_SANCTION",
    issuing_authority_name: d?.issuing_authority_name ?? "Lucknow Development Authority (LDA)",
    application_number: d?.application_number ?? `APP-${Date.now().toString().slice(-6)}`,
    application_date: d?.application_date ?? new Date().toISOString().slice(0, 10),
    challan_fee_paid_inr: Number(d?.challan_fee_paid_inr ?? 0),
    challan_receipt_ref: d?.challan_receipt_ref ?? null,
    joint_inspection_date: d?.joint_inspection_date ?? null,
    approval_grant_date: grantDate,
    validity_expiry_date: expiry,
    is_rera_registration: Boolean(d?.is_rera_registration),
    rera_registration_number: d?.rera_registration_number ?? null,
    is_plinth_certificate: Boolean(d?.is_plinth_certificate),
    plinth_checked_setbacks_ok: Boolean(d?.plinth_checked_setbacks_ok),
    is_fire_safety_noc: Boolean(d?.is_fire_safety_noc),
    status: isExpired ? "EXPIRED_RENEWAL_DUE" : (d?.status as ApprovalStatus) ?? "DOCUMENT_SCRUTINY",
    designated_liaison_officer: d?.designated_liaison_officer ?? "Lead Liaison Architect",
    sanctioning_officer_name: d?.sanctioning_officer_name ?? null,
    statutory_conditions_summary: d?.statutory_conditions_summary ?? null,
    digital_order_url: d?.digital_order_url ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalStatutoryApprovalsPage() {
  const { project, role, tier } = useActiveRole();
  const [permits, setPermits] = useState<StatutoryPermitRecord[]>([]);
  const [selectedPermit, setSelectedPermit] = useState<StatutoryPermitRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState<string>("ALL");
  const [filterAuthority, setFilterAuthority] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Lead Project Architect";
  const isLiaisonOrDirector =
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleLabel.includes("Director") ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("Liaison") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Lead");

  // Form State for Lodging Municipal Approval Application
  const [refNo, setRefNo] = useState(`PERM-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-0${Math.floor(1 + Math.random() * 9)}`);
  const [authority, setAuthority] = useState<StatutoryAuthorityType>("MUNICIPAL_DEVELOPMENT_AUTHORITY");
  const [stage, setStage] = useState<ApprovalLifecycleStage>("PRE_CONSTRUCTION_SANCTION");
  const [title, setTitle] = useState(
    tier === "RESIDENTIAL"
      ? "Municipal Interior Structural Layout Alteration Sanction & Height Permit"
      : "Building Plan Sanction, Height Clearance & Comprehensive Floor Area Ratio (FAR) Grant"
  );
  const [issuingDept, setIssuingDept] = useState("Lucknow Development Authority (Town Planning Wing)");
  const [appNo, setAppNo] = useState(`APP/LDA/2026/${Math.floor(10000 + Math.random() * 90000)}`);
  const [feePaid, setFeePaid] = useState<number>(tier === "RESIDENTIAL" ? 28500 : 645000);
  const [challanRef, setChallanRef] = useState("CHL-TREASURY-UP-99214");
  const [liaisonOfficer, setLiaisonOfficer] = useState("Ar. Akshat Singh (Principal Architect)");
  const [isRera, setIsRera] = useState(tier !== "RESIDENTIAL");
  const [reraNumber, setReraNumber] = useState(tier === "RESIDENTIAL" ? "" : "UPRERAPRJ882104");
  const [isPlinth, setIsPlinth] = useState(false);
  const [isFire, setIsFire] = useState(false);
  const [conditions, setConditions] = useState(
    tier === "RESIDENTIAL"
      ? "Maintain internal load-bearing wall integrity. Comply with local residential noise decibel norms."
      : "Front setback: 12.0m, Rear: 9.0m, Side: 7.5m. Rainwater harvesting system installation mandatory."
  );

  const loadPermitsData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("statutory_permits_and_approvals")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizePermit(d));
        setPermits(normalized);
        if (!selectedPermit) setSelectedPermit(normalized[0]);
      } else {
        const defaults: StatutoryPermitRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizePermit({
                  id: "perm-res-01",
                  project_id: projectId,
                  permit_reference_no: "PERM-RES-2026-01",
                  authority_type: "MUNICIPAL_DEVELOPMENT_AUTHORITY",
                  permit_title: "Architectural Interior Fit-Out & Structural Wall Non-Obstruction Approval",
                  lifecycle_stage: "PRE_CONSTRUCTION_SANCTION",
                  issuing_authority_name: "Lucknow Municipal Corporation (LMC)",
                  application_number: "APP/LMC/RES/2026/088",
                  application_date: "2026-07-15",
                  challan_fee_paid_inr: 28500,
                  challan_receipt_ref: "CHL-LMC-7721",
                  approval_grant_date: "2026-08-01",
                  validity_expiry_date: "2027-08-01",
                  status: "SANCTIONED_GRANTED",
                  designated_liaison_officer: "Principal Architect",
                  sanctioning_officer_name: "Assistant Town Planner (LMC)",
                  statutory_conditions_summary: "Approved for interior non-structural joinery and MEP modifications. Structural shear elements untouched.",
                }),
              ]
            : [
                normalizePermit({
                  id: "perm-twr-01",
                  project_id: projectId,
                  permit_reference_no: "PERM-TWR-2026-01",
                  authority_type: "MUNICIPAL_DEVELOPMENT_AUTHORITY",
                  permit_title: "Building Plan Sanction, FAR Sanction & Tower Height Clearances",
                  lifecycle_stage: "PRE_CONSTRUCTION_SANCTION",
                  issuing_authority_name: "Lucknow Development Authority (LDA)",
                  application_number: "APP/LDA/BP/2026/9941",
                  application_date: "2026-01-10",
                  challan_fee_paid_inr: 850000,
                  challan_receipt_ref: "CHL-LDA-882194",
                  approval_grant_date: "2026-02-28",
                  validity_expiry_date: "2031-02-28",
                  status: "SANCTIONED_GRANTED",
                  designated_liaison_officer: "Project Director",
                  sanctioning_officer_name: "Chief Town Planner (LDA)",
                  statutory_conditions_summary: "FAR 1:2.75 sanctioned. Ground coverage 32.4%. Mandatory boundary green buffer.",
                }),
                normalizePermit({
                  id: "perm-twr-02",
                  project_id: projectId,
                  permit_reference_no: "PERM-TWR-2026-02",
                  authority_type: "RERA_REGULATORY_AUTHORITY",
                  permit_title: "UP RERA Project Registration Certificate (Section 5)",
                  lifecycle_stage: "PRE_CONSTRUCTION_SANCTION",
                  issuing_authority_name: "Uttar Pradesh Real Estate Regulatory Authority",
                  application_number: "RERA/UP/2026/REG/0419",
                  application_date: "2026-02-15",
                  challan_fee_paid_inr: 450000,
                  challan_receipt_ref: "CHL-RERA-00129",
                  approval_grant_date: "2026-03-25",
                  validity_expiry_date: "2029-12-31",
                  is_rera_registration: true,
                  rera_registration_number: "UPRERAPRJ882104",
                  status: "SANCTIONED_GRANTED",
                  designated_liaison_officer: "Corporate Legal Head",
                  sanctioning_officer_name: "Secretary, UP RERA",
                  statutory_conditions_summary: "70% dedicated escrow account opened with State Bank of India. Quarterly progress filings mandatory.",
                }),
                normalizePermit({
                  id: "perm-twr-03",
                  project_id: projectId,
                  permit_reference_no: "PERM-TWR-2026-03",
                  authority_type: "MUNICIPAL_DEVELOPMENT_AUTHORITY",
                  permit_title: "Plinth Level Verification Certificate (NBC Part 2 Clause 5.12)",
                  lifecycle_stage: "CONSTRUCTION_PLINTH_CHECK",
                  issuing_authority_name: "Lucknow Development Authority (LDA)",
                  application_number: "APP/LDA/PLINTH/2026/012",
                  application_date: "2026-05-10",
                  challan_fee_paid_inr: 65000,
                  challan_receipt_ref: "CHL-LDA-PLN-1204",
                  joint_inspection_date: "2026-05-18",
                  approval_grant_date: "2026-05-25",
                  is_plinth_certificate: true,
                  plinth_checked_setbacks_ok: true,
                  status: "SANCTIONED_GRANTED",
                  designated_liaison_officer: "Resident SEOR",
                  sanctioning_officer_name: "Executive Engineer (LDA Zone 4)",
                  statutory_conditions_summary: "Front setback verified at 12.08m (Required: 12.00m). Superstructure casting clearance authorized.",
                }),
                normalizePermit({
                  id: "perm-twr-04",
                  project_id: projectId,
                  permit_reference_no: "PERM-TWR-2026-04",
                  authority_type: "FIRE_SAFETY_DIRECTORATE",
                  permit_title: "Provisional Fire Safety Clearance (Fire Prevention & Life Safety Act)",
                  lifecycle_stage: "PRE_CONSTRUCTION_SANCTION",
                  issuing_authority_name: "Directorate of Fire Services, Uttar Pradesh",
                  application_number: "FIRE/UP/2026/NOC/084",
                  application_date: "2026-02-01",
                  challan_fee_paid_inr: 125000,
                  challan_receipt_ref: "CHL-FIRE-8812",
                  approval_grant_date: "2026-03-12",
                  validity_expiry_date: "2027-03-11",
                  is_fire_safety_noc: true,
                  status: "SANCTIONED_GRANTED",
                  designated_liaison_officer: "EHS Safety Lead",
                  sanctioning_officer_name: "Chief Fire Officer (CFO)",
                  statutory_conditions_summary: "6.0m wide continuous vehicular drive-around corridor verified. 200,000L underground static fire tank required.",
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
    void loadPermitsData();

    const channel = supabase
      .channel(`permits_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "statutory_permits_and_approvals" }, () => void loadPermitsData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadPermitsData]);

  const summary = useMemo(() => {
    const totalApprovals = permits.length;
    const activeSanctioned = permits.filter((p) => p.status === "SANCTIONED_GRANTED").length;
    const inScrutiny = permits.filter(
      (p) => p.status === "DOCUMENT_SCRUTINY" || p.status === "FEE_PAID_AWAITING_INSPECTION" || p.status === "JOINT_SITE_INSPECTION_SCHEDULED"
    ).length;
    const totalChallanFeesInr = permits.reduce((sum, p) => sum + Number(p.challan_fee_paid_inr || 0), 0);
    const plinthCleared = permits.some((p) => p.is_plinth_certificate && p.plinth_checked_setbacks_ok);
    const reraActive = permits.some((p) => p.is_rera_registration && p.status === "SANCTIONED_GRANTED");

    return { totalApprovals, activeSanctioned, inScrutiny, totalChallanFeesInr, plinthCleared, reraActive };
  }, [permits]);

  const filteredPermits = useMemo(() => {
    return permits.filter((p) => {
      const matchStage = filterStage === "ALL" || p.lifecycle_stage === filterStage;
      const matchAuth = filterAuthority === "ALL" || p.authority_type === filterAuthority;
      const haystack = `${p.permit_reference_no} ${p.permit_title} ${p.application_number} ${p.issuing_authority_name}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStage && matchAuth && matchSearch;
    });
  }, [permits, filterStage, filterAuthority, search]);

  // Stage 1: Schedule Joint Site Inspection
  const handleScheduleInspection = async (perm: StatutoryPermitRecord) => {
    if (!isLiaisonOrDirector) return;
    setActionInProgress(`inspect_${perm.id}`);

    const inspDate = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    const updatePayload: Partial<StatutoryPermitRecord> = {
      joint_inspection_date: inspDate,
      status: "JOINT_SITE_INSPECTION_SCHEDULED",
    };

    try {
      await (supabase as any)
        .from("statutory_permits_and_approvals")
        .update(updatePayload)
        .eq("id", perm.id);
    } catch {
      // Local optimistic update
    }

    setPermits((prev) =>
      prev.map((item) => (item.id === perm.id ? ({ ...item, ...updatePayload } as StatutoryPermitRecord) : item))
    );
    if (selectedPermit && selectedPermit.id === perm.id) {
      setSelectedPermit((prev) => (prev ? ({ ...prev, ...updatePayload } as StatutoryPermitRecord) : null));
    }

    setFeedbackMessage(`Joint site inspection for ${perm.permit_reference_no} scheduled with authorities on ${inspDate}.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Stage 2: Endorse & Grant Statutory Sanction
  const handleGrantSanction = async (perm: StatutoryPermitRecord) => {
    if (!isLiaisonOrDirector) return;
    setActionInProgress(`grant_${perm.id}`);

    const grantDate = new Date().toISOString().slice(0, 10);
    const expiryDate = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

    const updatePayload: Partial<StatutoryPermitRecord> = {
      status: "SANCTIONED_GRANTED",
      approval_grant_date: grantDate,
      validity_expiry_date: expiryDate,
      sanctioning_officer_name: "Executive Competent Authority",
      plinth_checked_setbacks_ok: perm.is_plinth_certificate ? true : perm.plinth_checked_setbacks_ok,
    };

    try {
      await (supabase as any)
        .from("statutory_permits_and_approvals")
        .update(updatePayload)
        .eq("id", perm.id);
    } catch {
      // Local optimistic update
    }

    setPermits((prev) =>
      prev.map((item) => (item.id === perm.id ? ({ ...item, ...updatePayload } as StatutoryPermitRecord) : item))
    );
    if (selectedPermit && selectedPermit.id === perm.id) {
      setSelectedPermit((prev) => (prev ? ({ ...prev, ...updatePayload } as StatutoryPermitRecord) : null));
    }

    setFeedbackMessage(`Statutory Sanction GRANTED for ${perm.permit_reference_no}! Operational clearance active.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Register New Statutory Municipal Application
  const handleCreatePermit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_perm");

    const newDbRecord: Omit<StatutoryPermitRecord, "id"> = {
      project_id: projectId,
      permit_reference_no: refNo.trim(),
      authority_type: authority,
      permit_title: title.trim(),
      lifecycle_stage: stage,
      issuing_authority_name: issuingDept.trim(),
      application_number: appNo.trim(),
      application_date: new Date().toISOString().slice(0, 10),
      challan_fee_paid_inr: Number(feePaid),
      challan_receipt_ref: challanRef.trim() || null,
      is_rera_registration: isRera,
      rera_registration_number: isRera ? reraNumber.trim() : null,
      is_plinth_certificate: isPlinth,
      plinth_checked_setbacks_ok: false,
      is_fire_safety_noc: isFire,
      status: "FEE_PAID_AWAITING_INSPECTION",
      designated_liaison_officer: liaisonOfficer.trim(),
      statutory_conditions_summary: conditions.trim(),
    };

    try {
      const { data, error } = await (supabase as any)
        .from("statutory_permits_and_approvals")
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
      const fallback = normalizePermit({ ...newDbRecord, id: `perm-${Date.now()}` });
      setPermits((prev) => [fallback, ...prev]);
      setSelectedPermit(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory Municipal Approval Docket Print (NBC 2016 / Local Authority Docket)
  const handlePrintPermitDocket = (perm: StatutoryPermitRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Statutory Sanction &amp; Municipal Clearance Docket — ${perm.permit_reference_no}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .sanctioned { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .review { background: #e0f2fe; color: #0369a1; border: 1px solid #0284c7; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .tac { text-align: center; font-family: monospace; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-top: 14px; background: #fafafa; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 40px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · NBC 2016 Part 2 / Municipal Building Bye-Laws</div>
      <h1 class="title">Statutory Sanction &amp; Permitting Clearance Docket</h1>
      <div class="meta">Permit Ref: ${perm.permit_reference_no} · Authority: ${perm.issuing_authority_name} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${perm.status === "SANCTIONED_GRANTED" ? "sanctioned" : "review"}">${perm.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Clearance Title</th><td colspan="3"><strong>${perm.permit_title}</strong></td></tr>
    <tr><th>Statutory Directorate</th><td><strong>${perm.authority_type.replace(/_/g, " ")}</strong></td><th>Lifecycle Stage</th><td><strong>${perm.lifecycle_stage.replace(/_/g, " ")}</strong></td></tr>
    <tr><th>Municipal Application No.</th><td><code>${perm.application_number}</code></td><th>Application Lodged Date</th><td>${perm.application_date}</td></tr>
    <tr><th>Government Challan Fee Paid</th><td><strong>₹${perm.challan_fee_paid_inr.toLocaleString("en-IN")}</strong></td><th>Treasury Challan Receipt</th><td><code>${perm.challan_receipt_ref || "Verified Online"}</code></td></tr>
    <tr><th>Approval Grant Order Date</th><td><strong>${perm.approval_grant_date || "Pending Final Sanction"}</strong></td><th>Statutory Validity Expiry</th><td><strong>${perm.validity_expiry_date || "Five (5) Years from Grant"}</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Milestone Gate Authentications</div>
    <div>RERA Registration Status: <strong>${perm.is_rera_registration ? `REGISTERED (${perm.rera_registration_number || "Active"})` : "Not Required"}</strong></div>
    <div>Plinth Setback Verification: <strong>${perm.is_plinth_certificate ? (perm.plinth_checked_setbacks_ok ? "PASSED (NBC Setbacks Verified)" : "JOINT INSPECTION PENDING") : "Not Applicable"}</strong></div>
    <div>Fire Directorate Safety Clearance: <strong>${perm.is_fire_safety_noc ? "FIRE SAFETY PROVISIONAL NOC ISSUED" : "Not Applicable"}</strong></div>
  </div>

  <div class="box" style="margin-top: 14px;">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Sanction Conditions &amp; Mandatory Engineering Restraints</div>
    <div>${perm.statutory_conditions_summary || "Adhere strictly to sanctioned floor plans, setback boundaries, FAR limits, and local municipal environmental guidelines."}</div>
  </div>

  <div class="footer">
    <div>
      <div>Principal Liaison Architect</div>
      <div style="color: #64748b;">${perm.designated_liaison_officer}</div>
      <div class="sig">Architect Council Seal</div>
    </div>
    <div>
      <div>Competent Sanctioning Authority</div>
      <div style="color: #64748b;">${perm.sanctioning_officer_name || "Town Planning Directorate"}</div>
      <div class="sig">Municipal Sanction Seal</div>
    </div>
    <div>
      <div>Employer Project Director</div>
      <div style="color: #64748b;">Clearance Released for Execution</div>
      <div class="sig">Employer Sanction Order</div>
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
        INITIALIZING STATUTORY APPROVALS &amp; MUNICIPAL PERMITTING TRACKER...
      </div>
    );
  }

  const isSanctioned = selectedPermit.status === "SANCTIONED_GRANTED";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Statutory Governance · NBC 2016 Part 2 / Municipal Building Bye-Laws / RERA</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Statutory Approvals &amp; Municipal Permitting Tracker
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Development authority clearance and municipal permitting clearinghouse. Monitors RERA project registrations, tracks joint plinth setback inspections, manages fire safety NOCs, and unlocks milestone construction drawdowns.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintPermitDocket(selectedPermit)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sanction Docket</span>
            </button>
            <Link
              href="/contracts/taking-over"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Taking-Over &amp; TOC</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setRefNo(`PERM-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-0${permits.length + 1}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Lodge Permit Application</span>
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
              <span>Sanctioned Clearances</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {summary.activeSanctioned} / {summary.totalApprovals} Permits
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Official sanction orders active</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>In Municipal Scrutiny</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.inScrutiny > 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {summary.inScrutiny} Applications
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Awaiting inspection or fee scrutiny</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>RERA &amp; Plinth Gate</span>
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {tier === "RESIDENTIAL" ? "Exempt / Clear" : (summary.plinthCleared ? "Plinth Certified" : "Plinth Pending")}
            </div>
            <div className="text-[11px] text-cyan-300 mt-1">{summary.reraActive ? "RERA Registered" : "RERA In Scrutiny"}</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Treasury Challan Fees</span>
              <Coins className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {formatInr(summary.totalChallanFeesInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Total municipal fees remitted</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Permits (${permits.length})` },
              { key: "PRE_CONSTRUCTION_SANCTION", label: "Pre-Construction" },
              { key: "CONSTRUCTION_PLINTH_CHECK", label: "Plinth & In-Progress" },
              { key: "POST_CONSTRUCTION_OCCUPANCY", label: "Occupancy (CC/OC)" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterStage(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition ${
                  filterStage === tab.key
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
              value={filterAuthority}
              onChange={(e) => setFilterAuthority(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-400 font-mono"
            >
              <option value="ALL">All Authorities</option>
              <option value="MUNICIPAL_DEVELOPMENT_AUTHORITY">Development Authority (LDA/LMC)</option>
              <option value="RERA_REGULATORY_AUTHORITY">RERA Directorate</option>
              <option value="FIRE_SAFETY_DIRECTORATE">Fire Safety Directorate</option>
              <option value="STATE_POLLUTION_CONTROL_BOARD">Pollution Control Board</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search permit, app number, title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: PERMITS ROSTER (5 cols) vs SANCTION & INSPECTION DESK (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: PERMITS LISTING (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Statutory Municipal Clearances
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Lodged Permit Applications</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredPermits.length} Records</span>
            </div>

            <div className="space-y-3">
              {filteredPermits.map((perm) => {
                const isSelected = selectedPermit.id === perm.id;
                const isSanct = perm.status === "SANCTIONED_GRANTED";

                return (
                  <div
                    key={perm.id}
                    onClick={() => setSelectedPermit(perm)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {perm.permit_reference_no}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isSanct
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {perm.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                        {perm.lifecycle_stage.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{perm.permit_title}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        {perm.issuing_authority_name} &bull; App: <strong className="text-zinc-200">{perm.application_number}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Challan: <strong className="text-zinc-300">{formatInr(perm.challan_fee_paid_inr)}</strong></span>
                      <span>Grant Date: <strong className={perm.approval_grant_date ? "text-emerald-400" : "text-amber-400"}>{perm.approval_grant_date || "Pending"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: SANCTION SCRUTINY & INSPECTION CONTROL DESK (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Statutory Clearances Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedPermit.permit_reference_no} &mdash; {selectedPermit.permit_title}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isSanctioned
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : "bg-amber-950 text-amber-400 border border-amber-800/50"
              }`}>
                {selectedPermit.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-zinc-500 block">Competent Directorate:</span>
                  <strong className="text-white block mt-0.5">{selectedPermit.authority_type.replace(/_/g, " ")}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">Issuing Department:</span>
                  <span className="text-cyan-300 font-bold block mt-0.5">{selectedPermit.issuing_authority_name}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Application Ref:</span>
                  <span className="text-white font-bold">{selectedPermit.application_number}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Lodged Date:</span>
                  <span className="text-zinc-200">{selectedPermit.application_date}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Challan Fee Paid:</span>
                  <span className="text-emerald-400 font-bold">{formatInr(selectedPermit.challan_fee_paid_inr)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Joint Inspection:</span>
                  <span className="text-white font-bold">{selectedPermit.joint_inspection_date || "Not Scheduled"}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Sanction Order Date:</span>
                  <span className={selectedPermit.approval_grant_date ? "text-emerald-400 font-bold" : "text-amber-400"}>
                    {selectedPermit.approval_grant_date || "Awaiting Grant"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Validity Expiry:</span>
                  <span className="text-zinc-200">{selectedPermit.validity_expiry_date || "Five (5) Years"}</span>
                </div>
              </div>
            </div>

            {/* STATUTORY MANDATES & RESTRAINTS WATERFALL */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Sanction Conditions &amp; Mandatory Engineering Restraints:
              </span>

              <p className="text-zinc-200 font-sans text-xs leading-relaxed">
                {selectedPermit.statutory_conditions_summary || "Adhere strictly to sanctioned floor plans, setback boundaries, FAR limits, and local municipal environmental guidelines."}
              </p>

              {/* Special Milestone Flags */}
              <div className="pt-2 border-t border-zinc-800 space-y-1.5 text-[11px]">
                {selectedPermit.is_rera_registration && (
                  <div className="flex justify-between items-center text-cyan-300">
                    <span>RERA Project Registration Certificate:</span>
                    <strong className="font-mono">{selectedPermit.rera_registration_number || "UPRERA-VERIFIED"}</strong>
                  </div>
                )}
                {selectedPermit.is_plinth_certificate && (
                  <div className="flex justify-between items-center text-emerald-400">
                    <span>Plinth Level Setback Verification (NBC 2016):</span>
                    <strong>{selectedPermit.plinth_checked_setbacks_ok ? "PASSED (Setbacks Cleared)" : "AWAITING SURVEY"}</strong>
                  </div>
                )}
                {selectedPermit.is_fire_safety_noc && (
                  <div className="flex justify-between items-center text-rose-400">
                    <span>Fire Prevention &amp; Life Safety Provisional NOC:</span>
                    <strong>{isSanctioned ? "APPROVED & SEALED" : "AWAITING INSPECTION"}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* ACTION STAGE BUTTONS */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Municipal Authority Actions:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Action 1: Schedule Joint Site Inspection */}
                {!selectedPermit.joint_inspection_date && (
                  <button
                    type="button"
                    disabled={!isLiaisonOrDirector || actionInProgress === `inspect_${selectedPermit.id}`}
                    onClick={() => handleScheduleInspection(selectedPermit)}
                    className="py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono disabled:opacity-50"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Schedule Joint Site Inspection</span>
                  </button>
                )}

                {/* Action 2: Endorse Sanction Grant */}
                {!isSanctioned && (
                  <button
                    type="button"
                    disabled={!isLiaisonOrDirector || actionInProgress === `grant_${selectedPermit.id}`}
                    onClick={() => handleGrantSanction(selectedPermit)}
                    className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                  >
                    <Award className="w-4 h-4" />
                    <span>Grant Statutory Sanction Order</span>
                  </button>
                )}
              </div>

              {isSanctioned && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sanction Order Active &bull; Operational Clearance Endorsed</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Sanctioned by {selectedPermit.sanctioning_officer_name || "Development Authority"}. Valid until {selectedPermit.validity_expiry_date || "2031"}.
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              NBC 2016 Part 2 &amp; RERA Act 2016 Statutory Protocol
            </div>
          </div>

        </div>

        {/* LODGE PERMIT APPLICATION MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Lodge Statutory Municipal Application
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
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Permit Ref Code</label>
                    <input
                      type="text"
                      required
                      value={refNo}
                      onChange={(e) => setRefNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Authority Type</label>
                    <select
                      value={authority}
                      onChange={(e) => setAuthority(e.target.value as StatutoryAuthorityType)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="MUNICIPAL_DEVELOPMENT_AUTHORITY">Development Authority (LDA/LMC)</option>
                      <option value="RERA_REGULATORY_AUTHORITY">RERA Directorate</option>
                      <option value="FIRE_SAFETY_DIRECTORATE">Fire Safety Directorate</option>
                      <option value="STATE_POLLUTION_CONTROL_BOARD">Pollution Control Board</option>
                      <option value="AIRPORT_AUTHORITY_NOC">Airport Authority (AAI NOC)</option>
                      <option value="ELECTRICAL_LIFT_INSPECTORATE">Electrical &amp; Lift Inspectorate</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Permit / Clearance Title</label>
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
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Issuing Department / Body</label>
                    <input
                      type="text"
                      required
                      value={issuingDept}
                      onChange={(e) => setIssuingDept(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Application Reference No.</label>
                    <input
                      type="text"
                      required
                      value={appNo}
                      onChange={(e) => setAppNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Challan Fee Paid (₹)</label>
                    <input
                      type="number"
                      required
                      value={feePaid}
                      onChange={(e) => setFeePaid(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Lifecycle Stage</label>
                    <select
                      value={stage}
                      onChange={(e) => setStage(e.target.value as ApprovalLifecycleStage)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="PRE_CONSTRUCTION_SANCTION">Pre-Construction Sanction</option>
                      <option value="CONSTRUCTION_PLINTH_CHECK">Plinth Verification Check</option>
                      <option value="POST_CONSTRUCTION_OCCUPANCY">Occupancy Certificate (CC/OC)</option>
                    </select>
                  </div>
                </div>

                {/* Milestone Checkboxes */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-[11px]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRera}
                      onChange={(e) => setIsRera(e.target.checked)}
                      className="rounded accent-cyan-400"
                    />
                    <span>RERA Application</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPlinth}
                      onChange={(e) => setIsPlinth(e.target.checked)}
                      className="rounded accent-cyan-400"
                    />
                    <span>Plinth Check</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFire}
                      onChange={(e) => setIsFire(e.target.checked)}
                      className="rounded accent-cyan-400"
                    />
                    <span>Fire NOC</span>
                  </label>
                </div>

                {isRera && (
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">RERA Certificate Registration No.</label>
                    <input
                      type="text"
                      value={reraNumber}
                      onChange={(e) => setReraNumber(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Designated Liaison Officer</label>
                  <input
                    type="text"
                    required
                    value={liaisonOfficer}
                    onChange={(e) => setLiaisonOfficer(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Statutory Conditions &amp; Restraints</label>
                  <textarea
                    rows={2}
                    required
                    value={conditions}
                    onChange={(e) => setConditions(e.target.value)}
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
                    disabled={actionInProgress === "creating_perm"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Municipal Application</span>
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