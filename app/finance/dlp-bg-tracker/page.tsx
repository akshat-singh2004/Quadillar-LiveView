"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileCheck,
  FileText,
  Filter,
  HardHat,
  ImageIcon,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  TrendingDown,
  Unlock,
  Wrench,
  X,
  Zap,
  CircleAlert,
  Flame,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type PbgStatus =
  | "ACTIVE"
  | "EXPIRING_SOON"
  | "EXTENDED"
  | "CALLED_UPON"
  | "RELEASED"
  | "EXPIRED_LAPSED"
  | "REPLACED";

export type DefectSeverity = "STRUCTURAL" | "MAJOR" | "MINOR" | "COSMETIC";
export type DefectStatus =
  | "OPEN"
  | "NOTIFIED"
  | "IN_RECTIFICATION"
  | "RECTIFIED"
  | "VERIFIED_CLOSED"
  | "DEFAULTED"
  | "DISPUTED";

export interface BankGuarantee {
  id: string;
  project_id: string;
  work_order_ref: string;
  contractor_name: string;
  trade_package?: string;
  guarantee_type: string;
  bg_number: string;
  issuing_bank_name: string;
  issuing_bank_branch?: string;
  beneficiary_name: string;
  guarantee_amount_inr: number;
  original_contract_value_inr: number;
  guarantee_pct_of_contract: number;
  issue_date: string;
  validity_start_date: string;
  validity_expiry_date: string;
  dlp_end_date?: string | null;
  extension_validity_date?: string | null;
  actual_release_date?: string | null;
  status: PbgStatus;
  toc_reference?: string | null;
  toc_date?: string | null;
  dlp_duration_months: number;
  dlp_computed_expiry?: string | null;
  zero_defect_signoff: boolean;
  zero_defect_signoff_by?: string | null;
  zero_defect_signoff_at?: string | null;
  release_auth_by?: string | null;
  release_auth_at?: string | null;
  release_letter_ref?: string | null;
  called_upon_reason?: string | null;
  called_upon_amount_inr?: number | null;
  called_upon_at?: string | null;
  remarks?: string | null;
  document_url?: string | null;
  created_at?: string;
}

export interface DlpDefect {
  id: string;
  project_id: string;
  bank_guarantee_id?: string | null;
  work_order_ref: string;
  defect_number: string;
  description: string;
  location_zone?: string | null;
  element?: string | null;
  trade_discipline?: string | null;
  severity: DefectSeverity;
  discovered_date: string;
  discovered_by?: string | null;
  notification_date?: string | null;
  notice_reference?: string | null;
  rectification_deadline_days: number;
  rectification_due_date?: string | null;
  assigned_contractor: string;
  assigned_to_person?: string | null;
  status: DefectStatus;
  rectified_date?: string | null;
  rectified_by?: string | null;
  inspector_verified_date?: string | null;
  inspector_name?: string | null;
  closure_certificate_ref?: string | null;
  is_defaulted: boolean;
  penalty_deduction_inr: number;
  penalty_applied_at?: string | null;
  penalty_notes?: string | null;
  photo_before_url?: string | null;
  photo_after_url?: string | null;
  inspection_report_url?: string | null;
  created_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function fmt(v: number) {
  const a = Math.abs(v || 0);
  if (a >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} Cr`;
  if (a >= 100_000)    return `₹${(v / 100_000).toFixed(2)} L`;
  return `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

function daysFromNow(iso?: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function dlpProgress(tocIso?: string | null, durationMonths = 12): number {
  if (!tocIso) return 0;
  const start = new Date(tocIso).getTime();
  const end   = start + durationMonths * 30.44 * 86_400_000;
  const now   = Date.now();
  if (now >= end)   return 100;
  if (now <= start) return 0;
  return Math.round(((now - start) / (end - start)) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// BADGE CONFIGS
// ─────────────────────────────────────────────────────────────────────────────

const PBG_STATUS_META: Record<PbgStatus, { label: string; cls: string; dot: string }> = {
  ACTIVE:           { label: "Active",          cls: "bg-emerald-950 text-emerald-400 border-emerald-800/50", dot: "bg-emerald-400" },
  EXPIRING_SOON:    { label: "Expiring Soon",   cls: "bg-amber-950  text-amber-400  border-amber-800/50",  dot: "bg-amber-400" },
  EXTENDED:         { label: "Extended",        cls: "bg-blue-950   text-blue-400   border-blue-800/50",   dot: "bg-blue-400" },
  CALLED_UPON:      { label: "Called Upon",     cls: "bg-rose-950   text-rose-400   border-rose-800/50",   dot: "bg-rose-400" },
  RELEASED:         { label: "Released",        cls: "bg-purple-950 text-purple-400 border-purple-800/50", dot: "bg-purple-400" },
  EXPIRED_LAPSED:   { label: "Lapsed",          cls: "bg-zinc-800   text-zinc-400   border-zinc-700",      dot: "bg-zinc-500" },
  REPLACED:         { label: "Replaced",        cls: "bg-cyan-950   text-cyan-400   border-cyan-800/50",   dot: "bg-cyan-400" },
};

const DEFECT_STATUS_META: Record<DefectStatus, { label: string; cls: string }> = {
  OPEN:             { label: "Open",             cls: "bg-rose-950   text-rose-400   border-rose-800/50" },
  NOTIFIED:         { label: "Notified",         cls: "bg-amber-950  text-amber-400  border-amber-800/50" },
  IN_RECTIFICATION: { label: "In Rectification", cls: "bg-blue-950   text-blue-400   border-blue-800/50" },
  RECTIFIED:        { label: "Rectified",        cls: "bg-cyan-950   text-cyan-400   border-cyan-800/50" },
  VERIFIED_CLOSED:  { label: "Verified Closed",  cls: "bg-emerald-950 text-emerald-400 border-emerald-800/50" },
  DEFAULTED:        { label: "Defaulted",        cls: "bg-red-950    text-red-300    border-red-800/50" },
  DISPUTED:         { label: "Disputed",         cls: "bg-orange-950 text-orange-400 border-orange-800/50" },
};

const SEVERITY_META: Record<DefectSeverity, { label: string; cls: string; icon: React.ElementType }> = {
  STRUCTURAL: { label: "Structural", cls: "text-red-400",    icon: Flame },
  MAJOR:      { label: "Major",      cls: "text-orange-400", icon: AlertOctagon },
  MINOR:      { label: "Minor",      cls: "text-amber-400",  icon: AlertTriangle },
  COSMETIC:   { label: "Cosmetic",   cls: "text-zinc-400",   icon: CircleAlert },
};

function PbgBadge({ status }: { status: PbgStatus }) {
  const m = PBG_STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-mono font-bold uppercase ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function DefectBadge({ status }: { status: DefectStatus }) {
  const m = DEFECT_STATUS_META[status];
  return (
    <span className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold uppercase ${m.cls}`}>
      {m.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function buildDemoGuarantees(projectId: string, tier: string): BankGuarantee[] {
  const isInfra = tier === "INFRASTRUCTURE";
  const base: Partial<BankGuarantee>[] = isInfra
    ? [
        {
          id: "pbg-infra-01", work_order_ref: "WO-INFRA-201", contractor_name: "Apex Infrastructure Ltd",
          trade_package: "Civil & Structural", guarantee_type: "PERFORMANCE_SECURITY",
          bg_number: "SBI/BG/2025/0441", issuing_bank_name: "State Bank of India",
          issuing_bank_branch: "Lucknow Main Branch", beneficiary_name: "UPEIDA / Project Employer",
          guarantee_amount_inr: 8500000, original_contract_value_inr: 170000000, guarantee_pct_of_contract: 5,
          issue_date: "2025-03-15", validity_start_date: "2025-03-15",
          validity_expiry_date: "2026-09-30",
          toc_reference: "TOC-INFRA-01", toc_date: "2025-09-18", dlp_duration_months: 12,
          dlp_computed_expiry: "2026-09-18",
          status: "EXPIRING_SOON", zero_defect_signoff: false,
          remarks: "Extension requested. DLP defects partially open. BG must be extended or defects cleared by Sep 30.",
        },
        {
          id: "pbg-infra-02", work_order_ref: "WO-INFRA-202", contractor_name: "Deccan MEP Systems Pvt Ltd",
          trade_package: "MEP & HVAC", guarantee_type: "PERFORMANCE_SECURITY",
          bg_number: "HDFC/BG/2025/1182", issuing_bank_name: "HDFC Bank Ltd",
          issuing_bank_branch: "Hazratganj Branch", beneficiary_name: "UPEIDA / Project Employer",
          guarantee_amount_inr: 3200000, original_contract_value_inr: 64000000, guarantee_pct_of_contract: 5,
          issue_date: "2025-04-01", validity_start_date: "2025-04-01",
          validity_expiry_date: "2027-04-01",
          toc_reference: "TOC-INFRA-02", toc_date: "2026-04-01", dlp_duration_months: 12,
          dlp_computed_expiry: "2027-04-01",
          status: "ACTIVE", zero_defect_signoff: false,
          remarks: "DLP running. 3 minor defects open.",
        },
        {
          id: "pbg-infra-03", work_order_ref: "WO-INFRA-203", contractor_name: "Narmada Concrete Works",
          trade_package: "Foundation & Basement", guarantee_type: "PERFORMANCE_SECURITY",
          bg_number: "PNB/BG/2024/0089", issuing_bank_name: "Punjab National Bank",
          issuing_bank_branch: "Alambagh Branch", beneficiary_name: "UPEIDA / Project Employer",
          guarantee_amount_inr: 6200000, original_contract_value_inr: 124000000, guarantee_pct_of_contract: 5,
          issue_date: "2024-06-01", validity_start_date: "2024-06-01",
          validity_expiry_date: "2026-06-15",
          toc_reference: "TOC-INFRA-03", toc_date: "2024-06-10", dlp_duration_months: 24,
          dlp_computed_expiry: "2026-06-10",
          status: "RELEASED",
          zero_defect_signoff: true, zero_defect_signoff_by: "Er. S.K. Pandey (SEOR)",
          zero_defect_signoff_at: "2026-06-08T10:00:00Z",
          release_auth_by: "Mr. A.K. Sharma (Project Director)",
          release_auth_at: "2026-06-10T14:30:00Z",
          release_letter_ref: "REL-BG-INFRA-03-FINAL",
          actual_release_date: "2026-06-10",
          remarks: "All DLP defects cleared. Zero-defect certificate issued. BG returned per FIDIC Cl. 4.2.",
        },
      ]
    : [
        {
          id: "pbg-res-01", work_order_ref: "WO-RES-001", contractor_name: "Royal Woodworks & Interiors",
          trade_package: "Custom Joinery & Millwork", guarantee_type: "PERFORMANCE_SECURITY",
          bg_number: "AXIS/BG/2025/3341", issuing_bank_name: "Axis Bank Ltd",
          issuing_bank_branch: "Gomti Nagar Branch", beneficiary_name: "Project Employer (Residential)",
          guarantee_amount_inr: 122500, original_contract_value_inr: 2450000, guarantee_pct_of_contract: 5,
          issue_date: "2025-01-10", validity_start_date: "2025-01-10",
          validity_expiry_date: "2026-10-10",
          toc_reference: "TOC-RES-01", toc_date: "2025-07-15", dlp_duration_months: 12,
          dlp_computed_expiry: "2026-07-15",
          status: "RELEASED",
          zero_defect_signoff: true, zero_defect_signoff_by: "Ar. Rajan Mehta",
          zero_defect_signoff_at: "2026-07-12T11:00:00Z",
          release_auth_by: "Mr. Deepak Nair (Project Director)",
          release_auth_at: "2026-07-15T09:00:00Z",
          release_letter_ref: "REL-BG-RES-01",
          actual_release_date: "2026-07-15",
          remarks: "DLP completed. All snags cleared and verified.",
        },
        {
          id: "pbg-res-02", work_order_ref: "WO-RES-002", contractor_name: "Skyline MEP Contractors",
          trade_package: "MEP & HVAC", guarantee_type: "PERFORMANCE_SECURITY",
          bg_number: "ICICI/BG/2025/7782", issuing_bank_name: "ICICI Bank Ltd",
          issuing_bank_branch: "Hazratganj Branch", beneficiary_name: "Project Employer (Residential)",
          guarantee_amount_inr: 160000, original_contract_value_inr: 3200000, guarantee_pct_of_contract: 5,
          issue_date: "2025-02-01", validity_start_date: "2025-02-01",
          validity_expiry_date: "2026-10-15",
          toc_reference: "TOC-RES-02", toc_date: "2026-08-01", dlp_duration_months: 12,
          dlp_computed_expiry: "2027-08-01",
          status: "ACTIVE", zero_defect_signoff: false,
          remarks: "DLP running. 2 open defects on HVAC ductwork. Deadline: Nov 2026.",
        },
      ];

  return base.map((d) => ({
    id: d.id!, project_id: projectId, work_order_ref: d.work_order_ref!,
    contractor_name: d.contractor_name!, trade_package: d.trade_package,
    guarantee_type: d.guarantee_type!, bg_number: d.bg_number!,
    issuing_bank_name: d.issuing_bank_name!, issuing_bank_branch: d.issuing_bank_branch,
    beneficiary_name: d.beneficiary_name!, guarantee_amount_inr: d.guarantee_amount_inr!,
    original_contract_value_inr: d.original_contract_value_inr!,
    guarantee_pct_of_contract: d.guarantee_pct_of_contract!,
    issue_date: d.issue_date!, validity_start_date: d.validity_start_date!,
    validity_expiry_date: d.validity_expiry_date!, dlp_end_date: d.dlp_computed_expiry,
    extension_validity_date: null, actual_release_date: d.actual_release_date ?? null,
    status: d.status as PbgStatus,
    toc_reference: d.toc_reference, toc_date: d.toc_date,
    dlp_duration_months: d.dlp_duration_months!, dlp_computed_expiry: d.dlp_computed_expiry ?? null,
    zero_defect_signoff: d.zero_defect_signoff!, zero_defect_signoff_by: d.zero_defect_signoff_by ?? null,
    zero_defect_signoff_at: d.zero_defect_signoff_at ?? null,
    release_auth_by: d.release_auth_by ?? null, release_auth_at: d.release_auth_at ?? null,
    release_letter_ref: d.release_letter_ref ?? null, called_upon_reason: null,
    called_upon_amount_inr: null, called_upon_at: null, remarks: d.remarks ?? null,
    document_url: null, created_at: new Date().toISOString(),
  }));
}

let _defectCounter = 1;
function buildDemoDefects(projectId: string, guarantees: BankGuarantee[], tier: string): DlpDefect[] {
  _defectCounter = 1;
  const make = (
    bg: BankGuarantee,
    overrides: Partial<DlpDefect>
  ): DlpDefect => {
    const n = `DLP-DEF-2026-${String(_defectCounter++).padStart(3, "0")}`;
    return {
      id: `def-${bg.id}-${n}`, project_id: projectId,
      bank_guarantee_id: bg.id, work_order_ref: bg.work_order_ref,
      defect_number: n, description: "Defect", location_zone: "Zone A",
      element: "Slab", trade_discipline: "Civil", severity: "MINOR",
      discovered_date: "2026-08-01", discovered_by: "Site Inspector",
      notification_date: null, notice_reference: null,
      rectification_deadline_days: 28, rectification_due_date: null,
      assigned_contractor: bg.contractor_name, assigned_to_person: null,
      status: "OPEN", rectified_date: null, rectified_by: null,
      inspector_verified_date: null, inspector_name: null, closure_certificate_ref: null,
      is_defaulted: false, penalty_deduction_inr: 0, penalty_notes: null,
      photo_before_url: null, photo_after_url: null, inspection_report_url: null,
      created_at: new Date().toISOString(),
      ...overrides,
    };
  };

  const results: DlpDefect[] = [];

  if (tier === "INFRASTRUCTURE") {
    const bg1 = guarantees.find((g) => g.id === "pbg-infra-01")!;
    const bg2 = guarantees.find((g) => g.id === "pbg-infra-02")!;
    if (bg1) {
      results.push(make(bg1, {
        description: "Longitudinal cracks observed in RCC column C-14 at Level 2. Width >0.3mm — structural concern.",
        severity: "STRUCTURAL", element: "RCC Column C-14", location_zone: "Block B, Level 2",
        trade_discipline: "Civil / Structural",
        discovered_date: "2026-07-10", notification_date: "2026-07-12",
        notice_reference: "DN-DLP-2026-001", rectification_deadline_days: 14,
        rectification_due_date: "2026-07-26",
        status: "NOTIFIED", photo_before_url: "/evidence/crack_col_c14.jpg",
      }));
      results.push(make(bg1, {
        description: "Delamination of floor screeding at Departure Hall. Area approx. 45 sqm.",
        severity: "MAJOR", element: "Floor Screed – Departure Hall", location_zone: "Block A, Ground Floor",
        trade_discipline: "Civil / Finishing",
        discovered_date: "2026-08-05", notification_date: "2026-08-08",
        notice_reference: "DN-DLP-2026-002", rectification_deadline_days: 21,
        rectification_due_date: "2026-08-29",
        status: "IN_RECTIFICATION", assigned_to_person: "Site Supervisor Ramesh Kumar",
      }));
      results.push(make(bg1, {
        description: "Missing sealant at expansion joints on Roof Level — potential water ingress risk.",
        severity: "MAJOR", element: "Expansion Joints – Roof Level", location_zone: "Roof",
        trade_discipline: "Civil / Waterproofing",
        discovered_date: "2026-09-01",
        rectification_deadline_days: 28, rectification_due_date: "2026-09-29",
        status: "OPEN",
      }));
      results.push(make(bg1, {
        description: "Hairline cracks in plaster finish at interior wall panels (cosmetic).",
        severity: "COSMETIC", element: "Interior Wall Plaster", location_zone: "Block C, Level 1",
        trade_discipline: "Finishing",
        discovered_date: "2026-07-20",
        status: "RECTIFIED", rectified_date: "2026-08-15", rectified_by: "Apex Finishing Crew",
        photo_after_url: "/evidence/plaster_rectified.jpg",
      }));
    }
    if (bg2) {
      results.push(make(bg2, {
        description: "HVAC AHU vibration beyond permissible levels at Level 3 plant room.",
        severity: "MAJOR", element: "AHU Unit – Level 3", location_zone: "MEP Plant Room",
        trade_discipline: "MEP / HVAC",
        discovered_date: "2026-08-20", notification_date: "2026-08-22",
        notice_reference: "DN-DLP-2026-003", rectification_deadline_days: 21,
        rectification_due_date: "2026-09-12",
        status: "VERIFIED_CLOSED", rectified_date: "2026-09-10",
        inspector_verified_date: "2026-09-12", inspector_name: "Er. P.K. Gupta",
        closure_certificate_ref: "CC-DLP-2026-001",
      }));
      results.push(make(bg2, {
        description: "Chilled water pipe insulation incomplete at Level 1 corridor.",
        severity: "MINOR", element: "CHW Pipe Insulation", location_zone: "Level 1 Corridor",
        trade_discipline: "MEP / Plumbing",
        discovered_date: "2026-09-05",
        status: "OPEN", rectification_deadline_days: 28,
        rectification_due_date: "2026-10-03",
      }));
      results.push(make(bg2, {
        description: "BMS sensor calibration drift — temperature reporting error >2°C.",
        severity: "MINOR", element: "BMS Sensors – General", location_zone: "All Floors",
        trade_discipline: "MEP / BMS",
        discovered_date: "2026-09-10",
        status: "IN_RECTIFICATION", rectification_deadline_days: 14,
        rectification_due_date: "2026-09-24",
      }));
    }
  } else {
    const bg = guarantees.find((g) => g.id === "pbg-res-02")!;
    if (bg) {
      results.push(make(bg, {
        description: "HVAC duct seal failure in master bedroom — air leakage causing noise.",
        severity: "MAJOR", element: "HVAC Duct – Master Bedroom", location_zone: "Unit 3A, Bedroom 1",
        trade_discipline: "MEP / HVAC",
        discovered_date: "2026-08-25", notification_date: "2026-08-28",
        notice_reference: "DN-DLP-2026-001", rectification_deadline_days: 21,
        rectification_due_date: "2026-09-18",
        status: "IN_RECTIFICATION",
      }));
      results.push(make(bg, {
        description: "Thermostat wiring short in living area — tripping MCB intermittently.",
        severity: "MAJOR", element: "Thermostat Circuit", location_zone: "Unit 3A, Living Room",
        trade_discipline: "MEP / Electrical",
        discovered_date: "2026-09-01",
        status: "NOTIFIED", rectification_deadline_days: 14, rectification_due_date: "2026-09-15",
        notification_date: "2026-09-03", notice_reference: "DN-DLP-2026-002",
      }));
    }
    // Released BG gets verified defects
    const bgRel = guarantees.find((g) => g.id === "pbg-res-01")!;
    if (bgRel) {
      results.push(make(bgRel, {
        description: "Warping of joinery panel near window — humidity expansion.",
        severity: "MINOR", element: "Joinery Panel – Window Bay", location_zone: "Unit 2B",
        trade_discipline: "Joinery",
        discovered_date: "2026-05-10",
        status: "VERIFIED_CLOSED", rectified_date: "2026-06-01",
        inspector_verified_date: "2026-06-05", inspector_name: "Ar. Rajan Mehta",
        closure_certificate_ref: "CC-DLP-2026-RES-01",
      }));
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// PBG RELEASE GATE LOGIC
// ─────────────────────────────────────────────────────────────────────────────

function computeReleaseGate(bg: BankGuarantee, defects: DlpDefect[]) {
  const linked = defects.filter(
    (d) => d.bank_guarantee_id === bg.id || d.work_order_ref === bg.work_order_ref
  );
  const openCount       = linked.filter((d) => ["OPEN","NOTIFIED","IN_RECTIFICATION","DISPUTED"].includes(d.status)).length;
  const structuralOpen  = linked.filter((d) => d.severity === "STRUCTURAL" && d.status !== "VERIFIED_CLOSED" && d.status !== "DEFAULTED").length;
  const defaultedCount  = linked.filter((d) => d.status === "DEFAULTED").length;
  const totalPenalties  = linked.reduce((s, d) => s + d.penalty_deduction_inr, 0);
  const dlpDays         = daysFromNow(bg.dlp_computed_expiry);
  const dlpExpired      = dlpDays !== null && dlpDays <= 0;
  const bgDays          = daysFromNow(bg.validity_expiry_date);
  const bgExpiringWarning = bgDays !== null && bgDays >= 0 && bgDays <= 30;

  const canRelease = openCount === 0 && dlpExpired && bg.status !== "CALLED_UPON";

  return { linked, openCount, structuralOpen, defaultedCount, totalPenalties, dlpDays, dlpExpired, bgDays, bgExpiringWarning, canRelease };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function DlpBgTrackerPage() {
  const { project, role, tier } = useActiveRole();
  const [guarantees, setGuarantees]     = useState<BankGuarantee[]>([]);
  const [defects, setDefects]           = useState<DlpDefect[]>([]);
  const [selectedBg, setSelectedBg]     = useState<BankGuarantee | null>(null);
  const [loading, setLoading]           = useState(true);
  const [actionId, setActionId]         = useState<string | null>(null);
  const [feedback, setFeedback]         = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"ok" | "warn">("ok");
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [defectFilter, setDefectFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [addDefectOpen, setAddDefectOpen]   = useState(false);
  const [addBgOpen, setAddBgOpen]           = useState(false);

  const projectId   = (project as any)?.id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = (project as any)?.name || "Default Project";
  const roleLabel   = (role as any)?.label || "Site Engineer";
  const isPrivileged = ["PRINCIPAL_ARCHITECT","PMC_LEAD","QS_BILLING","CLIENT_EXECUTIVE"].includes((role as any)?.id || "");

  // ── Defect form state ───────────────────────────────────────────────────────
  const [dForm, setDForm] = useState({
    bgId: "", defectNumber: "", description: "", locationZone: "",
    element: "", tradeDiscipline: "Civil", severity: "MINOR" as DefectSeverity,
    discoveredDate: new Date().toISOString().slice(0, 10),
    deadlineDays: 28, assignedContractor: "",
  });

  // ── BG form state ────────────────────────────────────────────────────────────
  const [bgForm, setBgForm] = useState({
    woRef: "", contractor: "", tradePackage: "", bgType: "PERFORMANCE_SECURITY",
    bgNumber: "", bank: "", branch: "", amount: 0, contractValue: 0,
    pct: 5, issueDate: "", validityStart: "", validityExpiry: "",
    tocRef: "", tocDate: "", dlpMonths: 12, remarks: "",
  });

  const showFeedback = useCallback((msg: string, type: "ok" | "warn" = "ok", delay = 4000) => {
    setFeedback(msg); setFeedbackType(type);
    setTimeout(() => setFeedback(null), delay);
  }, []);

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [bgRes, defRes] = await Promise.all([
        (supabase as any).from("project_bank_guarantees").select("*")
          .eq("project_id", projectId).order("validity_expiry_date"),
        (supabase as any).from("dlp_defects").select("*")
          .eq("project_id", projectId).order("discovered_date", { ascending: false }),
      ]);
      if (bgRes.data?.length) {
        setGuarantees(bgRes.data as BankGuarantee[]);
        setSelectedBg((p) => p ?? bgRes.data[0]);
        if (defRes.data?.length) setDefects(defRes.data as DlpDefect[]);
        setLoading(false); return;
      }
    } catch { /* fall through to demo */ }

    const demoGs = buildDemoGuarantees(projectId, tier as string);
    const demoDs = buildDemoDefects(projectId, demoGs, tier as string);
    setGuarantees(demoGs);
    setDefects(demoDs);
    setSelectedBg((p) => p ?? demoGs[0]);
    setLoading(false);
  }, [projectId, tier]);

  useEffect(() => {
    void loadData();
    const ch = supabase.channel(`dlp_bg_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_bank_guarantees" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "dlp_defects" }, () => void loadData())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [projectId, loadData]);

  // ── Computed summaries ──────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalBgs        = guarantees.length;
    const totalExposure   = guarantees.filter((g) => g.status !== "RELEASED").reduce((s, g) => s + g.guarantee_amount_inr, 0);
    const expiringCount   = guarantees.filter((g) => { const d = daysFromNow(g.validity_expiry_date); return d !== null && d >= 0 && d <= 30 && g.status !== "RELEASED"; }).length;
    const releasedCount   = guarantees.filter((g) => g.status === "RELEASED").length;
    const openDefects     = defects.filter((d) => ["OPEN","NOTIFIED","IN_RECTIFICATION"].includes(d.status)).length;
    const structuralOpen  = defects.filter((d) => d.severity === "STRUCTURAL" && !["VERIFIED_CLOSED","DEFAULTED"].includes(d.status)).length;
    const totalPenalties  = defects.reduce((s, d) => s + d.penalty_deduction_inr, 0);
    return { totalBgs, totalExposure, expiringCount, releasedCount, openDefects, structuralOpen, totalPenalties };
  }, [guarantees, defects]);

  // ── Alert computation ───────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const list: { type: "critical" | "warning" | "info"; msg: string }[] = [];
    guarantees.forEach((g) => {
      const d = daysFromNow(g.validity_expiry_date);
      if (d !== null && d >= 0 && d <= 7 && g.status !== "RELEASED") {
        list.push({ type: "critical", msg: `BG ${g.bg_number} (${g.contractor_name}) expires in ${d} day(s) — IMMEDIATE extension required.` });
      } else if (d !== null && d >= 0 && d <= 30 && g.status !== "RELEASED") {
        list.push({ type: "warning", msg: `BG ${g.bg_number} (${g.contractor_name}) expires on ${fmtDate(g.validity_expiry_date)} — initiate renewal.` });
      }
    });
    defects.forEach((d) => {
      if (d.severity === "STRUCTURAL" && !["VERIFIED_CLOSED","DEFAULTED"].includes(d.status)) {
        list.push({ type: "critical", msg: `STRUCTURAL defect ${d.defect_number} unresolved — ${d.description.slice(0, 60)}…` });
      }
      if (d.rectification_due_date) {
        const overdue = daysFromNow(d.rectification_due_date);
        if (overdue !== null && overdue < 0 && !["VERIFIED_CLOSED","RECTIFIED","DEFAULTED"].includes(d.status)) {
          list.push({ type: "warning", msg: `Defect ${d.defect_number} rectification overdue by ${Math.abs(overdue)} day(s) — ${d.assigned_contractor}.` });
        }
      }
    });
    return list;
  }, [guarantees, defects]);

  // ── Filtered sets ────────────────────────────────────────────────────────────
  const filteredGs = useMemo(() => guarantees.filter((g) => {
    const matchStatus = filterStatus === "ALL" || g.status === filterStatus;
    const hay = `${g.bg_number} ${g.contractor_name} ${g.work_order_ref} ${g.trade_package}`.toLowerCase();
    return matchStatus && (!search.trim() || hay.includes(search.toLowerCase()));
  }), [guarantees, filterStatus, search]);

  const filteredDefects = useMemo(() => {
    const bgDefects = selectedBg
      ? defects.filter((d) => d.bank_guarantee_id === selectedBg.id || d.work_order_ref === selectedBg.work_order_ref)
      : defects;
    return bgDefects.filter((d) => {
      const matchStatus   = defectFilter === "ALL"   || d.status === defectFilter;
      const matchSeverity = severityFilter === "ALL" || d.severity === severityFilter;
      return matchStatus && matchSeverity;
    });
  }, [defects, selectedBg, defectFilter, severityFilter]);

  const gate = useMemo(
    () => selectedBg ? computeReleaseGate(selectedBg, defects) : null,
    [selectedBg, defects]
  );

  // ── Actions ──────────────────────────────────────────────────────────────────

  const patchBg = useCallback((id: string, patch: Partial<BankGuarantee>) => {
    setGuarantees((prev) => prev.map((g) => g.id === id ? { ...g, ...patch } : g));
    setSelectedBg((prev) => prev?.id === id ? { ...prev, ...patch } : prev);
  }, []);

  const patchDefect = useCallback((id: string, patch: Partial<DlpDefect>) => {
    setDefects((prev) => prev.map((d) => d.id === id ? { ...d, ...patch } : d));
  }, []);

  const handleReleaseBg = async (bg: BankGuarantee) => {
    if (!isPrivileged || !gate?.canRelease) return;
    setActionId(`release_${bg.id}`);
    const letterRef = `REL-BG-${bg.bg_number.replace(/\//g, "-")}-FINAL`;
    const patch: Partial<BankGuarantee> = {
      status: "RELEASED",
      release_auth_by: roleLabel,
      release_auth_at: new Date().toISOString(),
      release_letter_ref: letterRef,
      actual_release_date: new Date().toISOString().slice(0, 10),
    };
    try {
      await (supabase as any).from("project_bank_guarantees").update(patch).eq("id", bg.id);
    } catch { /* optimistic */ }
    patchBg(bg.id, patch);
    showFeedback(`✓ PBG ${bg.bg_number} released. Letter ref: ${letterRef}`);
    setActionId(null);
  };

  const handleZeroDefectSignoff = async (bg: BankGuarantee) => {
    if (!isPrivileged) return;
    setActionId(`signoff_${bg.id}`);
    const patch: Partial<BankGuarantee> = {
      zero_defect_signoff: true,
      zero_defect_signoff_by: roleLabel,
      zero_defect_signoff_at: new Date().toISOString(),
    };
    try {
      await (supabase as any).from("project_bank_guarantees").update(patch).eq("id", bg.id);
    } catch { /* optimistic */ }
    patchBg(bg.id, patch);
    showFeedback(`✓ Zero-defect DLP clearance certificate issued by ${roleLabel}.`);
    setActionId(null);
  };

  const handleAdvanceDefectStatus = async (defect: DlpDefect) => {
    const transitions: Partial<Record<DefectStatus, DefectStatus>> = {
      OPEN: "NOTIFIED",
      NOTIFIED: "IN_RECTIFICATION",
      IN_RECTIFICATION: "RECTIFIED",
      RECTIFIED: "VERIFIED_CLOSED",
    };
    const next = transitions[defect.status];
    if (!next) return;
    setActionId(`defect_${defect.id}`);
    const now = new Date().toISOString();
    const patch: Partial<DlpDefect> = {
      status: next,
      ...(next === "NOTIFIED"         ? { notification_date: now.slice(0, 10), notice_reference: `DN-DLP-${Date.now().toString().slice(-6)}` } : {}),
      ...(next === "IN_RECTIFICATION" ? { rectification_due_date: new Date(Date.now() + defect.rectification_deadline_days * 86_400_000).toISOString().slice(0, 10) } : {}),
      ...(next === "RECTIFIED"        ? { rectified_date: now.slice(0, 10), rectified_by: roleLabel } : {}),
      ...(next === "VERIFIED_CLOSED"  ? { inspector_verified_date: now.slice(0, 10), inspector_name: roleLabel, closure_certificate_ref: `CC-DLP-${Date.now().toString().slice(-6)}` } : {}),
    };
    try {
      await (supabase as any).from("dlp_defects").update(patch).eq("id", defect.id);
    } catch { /* optimistic */ }
    patchDefect(defect.id, patch);
    showFeedback(`✓ Defect ${defect.defect_number} advanced to ${next.replace(/_/g, " ")}.`);
    setActionId(null);
  };

  const handleApplyPenalty = async (defect: DlpDefect, amount: number) => {
    setActionId(`penalty_${defect.id}`);
    const patch: Partial<DlpDefect> = {
      status: "DEFAULTED", is_defaulted: true,
      penalty_deduction_inr: amount,
      penalty_applied_at: new Date().toISOString(),
      penalty_notes: `Penalty applied by ${roleLabel} — contractor failed to rectify within deadline.`,
    };
    try {
      await (supabase as any).from("dlp_defects").update(patch).eq("id", defect.id);
    } catch { /* optimistic */ }
    patchDefect(defect.id, patch);
    showFeedback(`✓ Penalty of ${fmt(amount)} applied to defect ${defect.defect_number}.`, "warn");
    setActionId(null);
  };

  const handleCreateDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionId("creating_defect");
    const newDef: Omit<DlpDefect, "id"> = {
      project_id: projectId,
      bank_guarantee_id: dForm.bgId || null,
      work_order_ref: guarantees.find((g) => g.id === dForm.bgId)?.work_order_ref || "WO-UNKNOWN",
      defect_number: dForm.defectNumber || `DLP-DEF-${Date.now().toString().slice(-6)}`,
      description: dForm.description, location_zone: dForm.locationZone,
      element: dForm.element, trade_discipline: dForm.tradeDiscipline,
      severity: dForm.severity, discovered_date: dForm.discoveredDate,
      discovered_by: roleLabel, notification_date: null, notice_reference: null,
      rectification_deadline_days: dForm.deadlineDays, rectification_due_date: null,
      assigned_contractor: dForm.assignedContractor,
      assigned_to_person: null, status: "OPEN",
      rectified_date: null, rectified_by: null, inspector_verified_date: null,
      inspector_name: null, closure_certificate_ref: null,
      is_defaulted: false, penalty_deduction_inr: 0, penalty_notes: null,
      photo_before_url: null, photo_after_url: null, inspection_report_url: null,
    };
    try {
      const { data } = await (supabase as any).from("dlp_defects").insert([newDef]).select().single();
      if (data) { setDefects((p) => [data as DlpDefect, ...p]); }
      else throw new Error();
    } catch {
      setDefects((p) => [{ ...newDef, id: `def-${Date.now()}`, created_at: new Date().toISOString() }, ...p]);
    }
    setAddDefectOpen(false); setActionId(null);
    showFeedback("✓ DLP Defect logged and assigned for rectification.");
  };

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-2 text-zinc-500">
        <div className="flex items-center gap-2 font-mono text-xs">
          <Clock className="w-4 h-4 animate-spin text-amber-400" />
          LOADING DLP & PERFORMANCE SECURITY CLEARINGHOUSE…
        </div>
      </div>
    );
  }

  const sb = selectedBg;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1700px] space-y-5">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-amber-400 uppercase font-bold">
              <Shield className="w-3.5 h-3.5" />
              <span>DLP & Performance Security · CPWD GCC Cl. 17 / FIDIC Cl. 11 & 4.2</span>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1.5">
              DLP Countdown & PBG Release Tracker
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              Defects Liability Period surveillance and Performance Bank Guarantee release gate. Tracks open defects, rectification status, penalty deductions, BG expiry alerts, and zero-defect DLP clearance certificates.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button type="button" onClick={() => void loadData()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs transition">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <Link href="/finance/final-bill"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition">
              <Banknote className="w-3.5 h-3.5 text-emerald-400" />
              <span>Final Bill</span>
            </Link>
            <button type="button" onClick={() => setAddDefectOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-amber-800/50 bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 text-xs font-bold transition">
              <Plus className="w-4 h-4" />
              <span>Log Defect</span>
            </button>
            <button type="button" onClick={() => setAddBgOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-amber-950/50">
              <Shield className="w-4 h-4" />
              <span>Register BG</span>
            </button>
          </div>
        </div>

        {/* ── COMPLIANCE ALERT BANNER ── */}
        {alerts.length > 0 && (
          <div className="rounded-2xl border border-rose-800/60 bg-rose-950/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-bold uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              Compliance Alert Matrix — {alerts.length} Active Warning{alerts.length > 1 ? "s" : ""}
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs rounded-lg p-2 ${
                  a.type === "critical"
                    ? "bg-rose-950/60 border border-rose-800/50 text-rose-300"
                    : "bg-amber-950/50 border border-amber-800/50 text-amber-300"
                }`}>
                  {a.type === "critical"
                    ? <Flame className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                    : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />}
                  <span className="font-mono">{a.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FEEDBACK ── */}
        {feedback && (
          <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
            feedbackType === "ok"
              ? "bg-cyan-950/70 border-cyan-800/80 text-cyan-300"
              : "bg-amber-950/70 border-amber-800/80 text-amber-300"
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {feedback}
          </div>
        )}

        {/* ── KPI GAUGES ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
          {[
            { label: "BG Instruments", value: summary.totalBgs.toString(), sub: "Performance security bonds", icon: Shield, color: "text-white" },
            { label: "Live BG Exposure", value: fmt(summary.totalExposure), sub: "Total unreleased PBG value", icon: Banknote, color: "text-amber-300" },
            { label: "Expiring ≤30 Days", value: summary.expiringCount.toString(), sub: "Urgent renewal required", icon: AlertTriangle, color: summary.expiringCount > 0 ? "text-rose-400" : "text-zinc-400" },
            { label: "BGs Released", value: summary.releasedCount.toString(), sub: "Zero-defect cleared", icon: Unlock, color: "text-emerald-400" },
            { label: "Open DLP Defects", value: summary.openDefects.toString(), sub: `${summary.structuralOpen} structural`, icon: Wrench, color: summary.openDefects > 0 ? "text-amber-400" : "text-emerald-400" },
            { label: "Total Penalties", value: fmt(summary.totalPenalties), sub: "Contractual deductions", icon: TrendingDown, color: summary.totalPenalties > 0 ? "text-rose-400" : "text-zinc-400" },
          ].map((g) => (
            <div key={g.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between text-zinc-500 text-[11px]">
                <span>{g.label}</span>
                <g.icon className="w-3.5 h-3.5 opacity-50" />
              </div>
              <div className={`text-xl font-extrabold mt-2 ${g.color}`}>{g.value}</div>
              <div className="text-[10px] text-zinc-600 mt-1">{g.sub}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN WORKBENCH ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

          {/* ─── LEFT: BG LIST + DLP TIMERS (7 cols) ─── */}
          <div className="xl:col-span-7 space-y-4">

            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { key: "ALL",           label: `All (${guarantees.length})` },
                  { key: "ACTIVE",        label: "Active" },
                  { key: "EXPIRING_SOON", label: "Expiring" },
                  { key: "RELEASED",      label: "Released" },
                  { key: "CALLED_UPON",   label: "Called Upon" },
                ].map((t) => (
                  <button key={t.key} type="button" onClick={() => setFilterStatus(t.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition ${
                      filterStatus === t.key
                        ? "bg-amber-500 text-zinc-950 shadow-md"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-56 ml-auto">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <input type="text" placeholder="Search BG, contractor…" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-amber-400 font-mono" />
              </div>
            </div>

            {/* BG Cards */}
            <div className="space-y-3">
              {filteredGs.length === 0 && (
                <div className="text-center text-zinc-600 text-xs py-8 font-mono">No bank guarantees match the current filter.</div>
              )}
              {filteredGs.map((bg) => {
                const g = computeReleaseGate(bg, defects);
                const progress = dlpProgress(bg.toc_date, bg.dlp_duration_months);
                const isSelected = sb?.id === bg.id;
                const bgDaysLeft = daysFromNow(bg.validity_expiry_date);
                const dlpDaysLeft = daysFromNow(bg.dlp_computed_expiry);

                return (
                  <div key={bg.id}
                    onClick={() => setSelectedBg(bg)}
                    className={`rounded-2xl border p-4 cursor-pointer transition space-y-4 ${
                      isSelected
                        ? "border-amber-500/60 bg-amber-950/10 shadow-lg shadow-amber-950/20"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
                    }`}>

                    {/* Row 1: identity + badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-white">{bg.bg_number}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">{bg.work_order_ref}</span>
                        <PbgBadge status={bg.status} />
                        {g.structuralOpen > 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800/50 font-mono font-bold">
                            {g.structuralOpen} STRUCTURAL OPEN
                          </span>
                        )}
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-sm font-bold text-amber-300">{fmt(bg.guarantee_amount_inr)}</span>
                        <div className="text-[10px] text-zinc-500">{bg.guarantee_pct_of_contract}% of {fmt(bg.original_contract_value_inr)}</div>
                      </div>
                    </div>

                    {/* Row 2: contractor + bank */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-white">{bg.contractor_name}</div>
                        <div className="text-[11px] text-amber-400 font-mono">{bg.trade_package}</div>
                      </div>
                      <div className="text-right text-[10px] font-mono text-zinc-500">
                        <div>{bg.issuing_bank_name}</div>
                        <div>{bg.issuing_bank_branch}</div>
                      </div>
                    </div>

                    {/* Row 3: DLP Countdown Progress Bar */}
                    {bg.toc_date && bg.status !== "RELEASED" && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-zinc-500">DLP Progress ({bg.dlp_duration_months} months)</span>
                          <span className={`font-bold ${progress >= 100 ? "text-emerald-400" : progress >= 80 ? "text-amber-400" : "text-cyan-400"}`}>
                            {progress >= 100 ? "✓ EXPIRED" : `${progress}% elapsed`}
                            {dlpDaysLeft !== null && dlpDaysLeft > 0 && ` · ${dlpDaysLeft}d remaining`}
                            {dlpDaysLeft !== null && dlpDaysLeft <= 0 && " · Ready for clearance"}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              progress >= 100 ? "bg-emerald-500" : progress >= 80 ? "bg-amber-500" : "bg-cyan-500"
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-zinc-600 font-mono">
                          <span>TOC: {fmtDate(bg.toc_date)}</span>
                          <span>DLP Expiry: {fmtDate(bg.dlp_computed_expiry)}</span>
                        </div>
                      </div>
                    )}

                    {/* Row 4: stats row */}
                    <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>
                        BG Expiry: <strong className={`${bgDaysLeft !== null && bgDaysLeft <= 30 && bg.status !== "RELEASED" ? "text-rose-400" : "text-zinc-300"}`}>
                          {fmtDate(bg.validity_expiry_date)}
                        </strong>
                      </span>
                      <span>Open: <strong className={g.openCount > 0 ? "text-amber-400" : "text-emerald-400"}>{g.openCount}</strong></span>
                      <span>Penalties: <strong className="text-zinc-300">{fmt(g.totalPenalties)}</strong></span>
                      <span>Release Gate: <strong className={g.canRelease ? "text-emerald-400" : "text-amber-400"}>{g.canRelease ? "✓ Clear" : "Blocked"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── RIGHT: DETAIL + DEFECTS PANEL (5 cols) ─── */}
          <div className="xl:col-span-5 space-y-4">

            {sb ? (
              <>
                {/* ─ PBG RELEASE GATE CARD ─ */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">PBG Release Gate</div>
                      <div className="text-base font-bold text-white font-mono mt-0.5">{sb.bg_number}</div>
                      <div className="text-[11px] text-zinc-400">{sb.contractor_name}</div>
                    </div>
                    <PbgBadge status={sb.status} />
                  </div>

                  {gate && (
                    <div className="space-y-2.5">
                      {/* Release gate checklist */}
                      <div className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Release Gate Checklist (FIDIC Cl. 4.2 / CPWD GCC Cl. 1):</div>

                      {[
                        { label: "DLP Period Expired", pass: !!gate.dlpExpired,
                          detail: gate.dlpExpired ? `DLP expired ${fmtDate(sb.dlp_computed_expiry)}` : `${gate.dlpDays !== null && gate.dlpDays > 0 ? gate.dlpDays + " days remaining" : "DLP date not set"}` },
                        { label: "Zero Open Defects", pass: gate.openCount === 0,
                          detail: gate.openCount === 0 ? "No open defects on record" : `${gate.openCount} defect(s) pending rectification` },
                        { label: "No Structural Defects Outstanding", pass: gate.structuralOpen === 0,
                          detail: gate.structuralOpen === 0 ? "All structural defects cleared" : `${gate.structuralOpen} structural defect(s) unresolved` },
                        { label: "Zero-Defect Sign-off Issued", pass: sb.zero_defect_signoff,
                          detail: sb.zero_defect_signoff ? `Signed by ${sb.zero_defect_signoff_by} on ${fmtDate(sb.zero_defect_signoff_at)}` : "Awaiting SEOR/QS zero-defect certificate" },
                        { label: "BG Not Called Upon", pass: sb.status !== "CALLED_UPON",
                          detail: sb.status === "CALLED_UPON" ? `BG invoked — ${sb.called_upon_reason}` : "No invocation on record" },
                      ].map((item) => (
                        <div key={item.label} className={`flex items-start gap-2.5 p-2.5 rounded-lg text-xs ${
                          item.pass ? "bg-emerald-950/30 border border-emerald-800/30" : "bg-zinc-900/60 border border-zinc-800"
                        }`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 ${
                            item.pass ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-500"
                          }`}>
                            {item.pass ? "✓" : "✗"}
                          </div>
                          <div>
                            <div className={`font-bold font-mono text-[11px] ${item.pass ? "text-emerald-400" : "text-zinc-400"}`}>{item.label}</div>
                            <div className="text-[10px] text-zinc-500">{item.detail}</div>
                          </div>
                        </div>
                      ))}

                      {/* Financial summary */}
                      {gate.totalPenalties > 0 && (
                        <div className="p-2.5 rounded-lg border border-rose-800/40 bg-rose-950/20 text-xs font-mono">
                          <div className="text-rose-400 font-bold text-[10px] uppercase">Penalty Deductions Applied</div>
                          <div className="text-rose-300 text-sm font-bold mt-1">{fmt(gate.totalPenalties)}</div>
                          <div className="text-zinc-500 text-[10px]">from {gate.defaultedCount} defaulted defect(s)</div>
                        </div>
                      )}

                      {/* Action buttons */}
                      {sb.status !== "RELEASED" && (
                        <div className="space-y-2 pt-1 border-t border-zinc-800">
                          {!sb.zero_defect_signoff && gate.openCount === 0 && isPrivileged && (
                            <button type="button"
                              disabled={actionId === `signoff_${sb.id}`}
                              onClick={() => void handleZeroDefectSignoff(sb)}
                              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 disabled:opacity-50">
                              <FileCheck className="w-4 h-4" />
                              Issue Zero-Defect DLP Clearance Certificate
                            </button>
                          )}
                          {gate.canRelease && sb.zero_defect_signoff && isPrivileged && (
                            <button type="button"
                              disabled={actionId === `release_${sb.id}`}
                              onClick={() => void handleReleaseBg(sb)}
                              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 disabled:opacity-50">
                              <Unlock className="w-4 h-4" />
                              Release PBG — {fmt(sb.guarantee_amount_inr)} (FIDIC Cl. 4.2)
                            </button>
                          )}
                          {!gate.canRelease && !gate.dlpExpired && (
                            <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 text-[10px] text-zinc-500 font-mono text-center">
                              <Lock className="w-4 h-4 inline mr-1 text-zinc-600" />
                              PBG release locked until DLP expires & all defects cleared.
                            </div>
                          )}
                        </div>
                      )}

                      {sb.status === "RELEASED" && (
                        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/50 text-xs font-mono space-y-1">
                          <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4" /> PBG Conclusively Released
                          </div>
                          <div className="text-zinc-400">
                            Released: {fmtDate(sb.actual_release_date)} · Auth: {sb.release_auth_by}
                          </div>
                          <div className="text-zinc-500 text-[10px]">Ref: {sb.release_letter_ref}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* BG Details */}
                  <div className="pt-2 border-t border-zinc-800 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-mono">
                    {[
                      ["Issuing Bank", sb.issuing_bank_name],
                      ["BG Amount", fmt(sb.guarantee_amount_inr)],
                      ["BG Expiry", fmtDate(sb.validity_expiry_date)],
                      ["TOC Date", fmtDate(sb.toc_date)],
                      ["DLP Months", `${sb.dlp_duration_months} months`],
                      ["DLP Expiry", fmtDate(sb.dlp_computed_expiry)],
                    ].map(([l, v]) => (
                      <div key={l as string} className="flex justify-between gap-2">
                        <span className="text-zinc-500">{l as string}:</span>
                        <span className="text-zinc-200 font-bold text-right">{v as string}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[9px] text-zinc-600 font-mono text-center pt-1 border-t border-zinc-800">
                    CPWD GCC Cl. 1 & 17 · FIDIC Red Book Cl. 4.2, 11.1 & 11.9
                  </div>
                </div>

                {/* ─ DEFECT LEDGER ─ */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">DLP Defect Ledger</div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {filteredDefects.length} defect(s) — {sb.work_order_ref}
                      </div>
                    </div>
                    {/* Defect filters */}
                    <div className="flex items-center gap-1.5">
                      <select value={defectFilter} onChange={(e) => setDefectFilter(e.target.value)}
                        className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-2 py-1 outline-none">
                        <option value="ALL">All Status</option>
                        {(["OPEN","NOTIFIED","IN_RECTIFICATION","RECTIFIED","VERIFIED_CLOSED","DEFAULTED"] as DefectStatus[]).map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                      <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}
                        className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-2 py-1 outline-none">
                        <option value="ALL">All Severity</option>
                        {(["STRUCTURAL","MAJOR","MINOR","COSMETIC"] as DefectSeverity[]).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {filteredDefects.length === 0 ? (
                    <div className="text-center text-zinc-600 text-xs py-6 font-mono">
                      No defects recorded for this package.
                      {gate?.openCount === 0 && <div className="text-emerald-500 mt-1">✓ Zero open defects — eligible for DLP clearance.</div>}
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                      {filteredDefects.map((d) => {
                        const sm = SEVERITY_META[d.severity];
                        const SevIcon = sm.icon;
                        const overdue = d.rectification_due_date ? daysFromNow(d.rectification_due_date) : null;
                        const isOverdue = overdue !== null && overdue < 0 && !["VERIFIED_CLOSED","RECTIFIED","DEFAULTED"].includes(d.status);

                        return (
                          <div key={d.id} className={`rounded-xl border p-3.5 space-y-2.5 ${
                            d.severity === "STRUCTURAL"
                              ? "border-red-800/60 bg-red-950/10"
                              : isOverdue
                              ? "border-orange-800/50 bg-orange-950/10"
                              : "border-zinc-800/70 bg-zinc-900/40"
                          }`}>
                            {/* Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <SevIcon className={`w-3.5 h-3.5 shrink-0 ${sm.cls}`} />
                                <span className="font-mono text-[11px] font-bold text-white">{d.defect_number}</span>
                                <DefectBadge status={d.status} />
                                {isOverdue && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-800/50 font-mono font-bold">
                                    OVERDUE {Math.abs(overdue!)}d
                                  </span>
                                )}
                              </div>
                              <span className={`text-[10px] font-mono font-bold shrink-0 ${sm.cls}`}>{sm.label}</span>
                            </div>

                            {/* Description */}
                            <div className="text-xs text-zinc-200 leading-relaxed">{d.description}</div>

                            {/* Meta */}
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono text-zinc-500">
                              {d.element        && <span>Element: <strong className="text-zinc-300">{d.element}</strong></span>}
                              {d.location_zone  && <span>Zone: <strong className="text-zinc-300">{d.location_zone}</strong></span>}
                              {d.trade_discipline && <span>Trade: <strong className="text-zinc-300">{d.trade_discipline}</strong></span>}
                              <span>Discovered: <strong className="text-zinc-300">{fmtDate(d.discovered_date)}</strong></span>
                              {d.rectification_due_date && (
                                <span>Due: <strong className={isOverdue ? "text-orange-400" : "text-zinc-300"}>{fmtDate(d.rectification_due_date)}</strong></span>
                              )}
                              {d.notice_reference && <span>Notice: <strong className="text-cyan-400">{d.notice_reference}</strong></span>}
                              {d.inspector_name  && <span>Verified by: <strong className="text-emerald-400">{d.inspector_name}</strong></span>}
                              {d.closure_certificate_ref && <span>CC Ref: <strong className="text-emerald-400">{d.closure_certificate_ref}</strong></span>}
                            </div>

                            {/* Photo evidence */}
                            {(d.photo_before_url || d.photo_after_url) && (
                              <div className="flex gap-2">
                                {d.photo_before_url && (
                                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-800/60 rounded px-2 py-1 font-mono">
                                    <ImageIcon className="w-3 h-3" /> Before
                                  </div>
                                )}
                                {d.photo_after_url && (
                                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 rounded px-2 py-1 font-mono">
                                    <ImageIcon className="w-3 h-3" /> After
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Penalty */}
                            {d.penalty_deduction_inr > 0 && (
                              <div className="text-[10px] text-rose-400 font-mono font-bold">
                                ₹{d.penalty_deduction_inr.toLocaleString("en-IN")} penalty applied
                                {d.penalty_notes && ` — ${d.penalty_notes}`}
                              </div>
                            )}

                            {/* Action buttons */}
                            {!["VERIFIED_CLOSED","DEFAULTED"].includes(d.status) && isPrivileged && (
                              <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/50">
                                {d.status !== "VERIFIED_CLOSED" && d.status !== "DEFAULTED" && (() => {
                                  const next: Record<DefectStatus, string | null> = {
                                    OPEN: "Issue Notice", NOTIFIED: "Start Rectification",
                                    IN_RECTIFICATION: "Mark Rectified", RECTIFIED: "Verify & Close",
                                    VERIFIED_CLOSED: null, DEFAULTED: null, DISPUTED: null,
                                  };
                                  const label = next[d.status];
                                  if (!label) return null;
                                  return (
                                    <button type="button"
                                      disabled={actionId === `defect_${d.id}`}
                                      onClick={() => void handleAdvanceDefectStatus(d)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[10px] font-bold font-mono transition disabled:opacity-50">
                                      <ChevronRight className="w-3 h-3" />
                                      {label}
                                    </button>
                                  );
                                })()}
                                {["NOTIFIED","IN_RECTIFICATION"].includes(d.status) && overdue !== null && overdue < 0 && (
                                  <button type="button"
                                    disabled={actionId === `penalty_${d.id}`}
                                    onClick={() => void handleApplyPenalty(d, 25000)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-800/50 bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 text-[10px] font-bold font-mono transition disabled:opacity-50">
                                    <TrendingDown className="w-3 h-3" />
                                    Apply Penalty
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center text-zinc-600 text-xs py-12 font-mono">
                Select a bank guarantee to view the release gate and defect ledger.
              </div>
            )}
          </div>
        </div>

        {/* ── LOG DEFECT MODAL ── */}
        {addDefectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-950/95 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Log DLP Defect</h3>
                </div>
                <button type="button" onClick={() => setAddDefectOpen(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateDefect} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Linked Bank Guarantee</label>
                  <select value={dForm.bgId} onChange={(e) => setDForm((f) => ({ ...f, bgId: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-400 font-mono">
                    <option value="">— Select BG —</option>
                    {guarantees.filter((g) => g.status !== "RELEASED").map((g) => (
                      <option key={g.id} value={g.id}>{g.bg_number} · {g.contractor_name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Defect Number</label>
                    <input type="text" value={dForm.defectNumber} placeholder="DLP-DEF-2026-xxx"
                      onChange={(e) => setDForm((f) => ({ ...f, defectNumber: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-400 font-mono" />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Severity</label>
                    <select value={dForm.severity} onChange={(e) => setDForm((f) => ({ ...f, severity: e.target.value as DefectSeverity }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-400 font-mono">
                      <option value="COSMETIC">Cosmetic</option>
                      <option value="MINOR">Minor</option>
                      <option value="MAJOR">Major</option>
                      <option value="STRUCTURAL">Structural ⚠</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Defect Description *</label>
                  <textarea required rows={3} value={dForm.description}
                    onChange={(e) => setDForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Describe the defect, observed condition, and potential risk…"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-400 resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Location / Zone</label>
                    <input type="text" value={dForm.locationZone}
                      onChange={(e) => setDForm((f) => ({ ...f, locationZone: e.target.value }))}
                      placeholder="e.g. Block A, Level 2"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Element</label>
                    <input type="text" value={dForm.element}
                      onChange={(e) => setDForm((f) => ({ ...f, element: e.target.value }))}
                      placeholder="e.g. Column C-7"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Trade Discipline</label>
                    <select value={dForm.tradeDiscipline} onChange={(e) => setDForm((f) => ({ ...f, tradeDiscipline: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-400 font-mono">
                      {["Civil / Structural","Civil / Finishing","MEP / HVAC","MEP / Electrical","MEP / Plumbing","MEP / BMS","Joinery","Waterproofing","Facade","Other"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Rectification Deadline (days)</label>
                    <input type="number" min={1} value={dForm.deadlineDays}
                      onChange={(e) => setDForm((f) => ({ ...f, deadlineDays: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-amber-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Discovered Date</label>
                    <input type="date" value={dForm.discoveredDate}
                      onChange={(e) => setDForm((f) => ({ ...f, discoveredDate: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Assigned Contractor *</label>
                    <input required type="text" value={dForm.assignedContractor}
                      onChange={(e) => setDForm((f) => ({ ...f, assignedContractor: e.target.value }))}
                      placeholder="Contractor name"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-400" />
                  </div>
                </div>

                {dForm.severity === "STRUCTURAL" && (
                  <div className="p-3 rounded-xl border border-red-800/60 bg-red-950/30 text-xs text-red-300 font-mono">
                    <strong>⚠ STRUCTURAL DEFECT:</strong> This will trigger a critical alert and block PBG release until resolved. Ensure immediate site inspection and stop-work assessment per FIDIC Cl. 11.8.
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setAddDefectOpen(false)} className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-white">Cancel</button>
                  <button type="submit" disabled={actionId === "creating_defect"}
                    className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition flex items-center gap-1.5 font-mono disabled:opacity-50">
                    <Wrench className="w-4 h-4" />
                    Log Defect
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── REGISTER BG MODAL ── */}
        {addBgOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-950/95 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Register Bank Guarantee</h3>
                </div>
                <button type="button" onClick={() => setAddBgOpen(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setActionId("creating_bg");
                const tocDt = bgForm.tocDate || null;
                const dlpExpiry = tocDt ? (() => {
                  const d = new Date(tocDt);
                  d.setMonth(d.getMonth() + bgForm.dlpMonths);
                  return d.toISOString().slice(0, 10);
                })() : null;
                const payload = {
                  project_id: projectId, work_order_ref: bgForm.woRef, contractor_name: bgForm.contractor,
                  trade_package: bgForm.tradePackage, guarantee_type: bgForm.bgType,
                  bg_number: bgForm.bgNumber, issuing_bank_name: bgForm.bank,
                  issuing_bank_branch: bgForm.branch || null, beneficiary_name: projectName,
                  guarantee_amount_inr: Number(bgForm.amount),
                  original_contract_value_inr: Number(bgForm.contractValue),
                  guarantee_pct_of_contract: Number(bgForm.pct),
                  issue_date: bgForm.issueDate, validity_start_date: bgForm.validityStart,
                  validity_expiry_date: bgForm.validityExpiry, toc_reference: bgForm.tocRef || null,
                  toc_date: tocDt, dlp_duration_months: bgForm.dlpMonths,
                  dlp_computed_expiry: dlpExpiry, status: "ACTIVE", zero_defect_signoff: false,
                  remarks: bgForm.remarks || null,
                };
                try {
                  const { data } = await (supabase as any).from("project_bank_guarantees").insert([payload]).select().single();
                  if (data) setGuarantees((p) => [data as BankGuarantee, ...p]);
                  else throw new Error();
                } catch {
                  const fb: BankGuarantee = {
                    ...payload, id: `pbg-${Date.now()}`, extension_validity_date: null,
                    actual_release_date: null, dlp_end_date: dlpExpiry,
                    zero_defect_signoff_by: null, zero_defect_signoff_at: null,
                    release_auth_by: null, release_auth_at: null, release_letter_ref: null,
                    called_upon_reason: null, called_upon_amount_inr: null, called_upon_at: null,
                    document_url: null, status: "ACTIVE" as PbgStatus,
                    created_at: new Date().toISOString(), issuing_bank_branch: bgForm.branch,
                    beneficiary_name: projectName,
                  };
                  setGuarantees((p) => [fb, ...p]);
                }
                setAddBgOpen(false); setActionId(null);
                showFeedback("✓ Bank Guarantee registered in DLP tracker.");
              }} className="p-6 space-y-4 text-xs">

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Work Order Ref *</label>
                    <input required type="text" value={bgForm.woRef}
                      onChange={(e) => setBgForm((f) => ({ ...f, woRef: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">BG / Instrument Number *</label>
                    <input required type="text" value={bgForm.bgNumber}
                      onChange={(e) => setBgForm((f) => ({ ...f, bgNumber: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-amber-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Contractor Name *</label>
                    <input required type="text" value={bgForm.contractor}
                      onChange={(e) => setBgForm((f) => ({ ...f, contractor: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Trade Package</label>
                    <input type="text" value={bgForm.tradePackage}
                      onChange={(e) => setBgForm((f) => ({ ...f, tradePackage: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Issuing Bank *</label>
                    <input required type="text" value={bgForm.bank}
                      onChange={(e) => setBgForm((f) => ({ ...f, bank: e.target.value }))}
                      placeholder="e.g. State Bank of India"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Branch</label>
                    <input type="text" value={bgForm.branch}
                      onChange={(e) => setBgForm((f) => ({ ...f, branch: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-400" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">BG Amount (₹) *</label>
                    <input required type="number" min={0} value={bgForm.amount}
                      onChange={(e) => setBgForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Contract Value (₹)</label>
                    <input type="number" min={0} value={bgForm.contractValue}
                      onChange={(e) => setBgForm((f) => ({ ...f, contractValue: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">BG % of Contract</label>
                    <input type="number" min={0} max={100} step={0.5} value={bgForm.pct}
                      onChange={(e) => setBgForm((f) => ({ ...f, pct: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-amber-400" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Issue Date *</label>
                    <input required type="date" value={bgForm.issueDate}
                      onChange={(e) => setBgForm((f) => ({ ...f, issueDate: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Validity Start *</label>
                    <input required type="date" value={bgForm.validityStart}
                      onChange={(e) => setBgForm((f) => ({ ...f, validityStart: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">BG Expiry *</label>
                    <input required type="date" value={bgForm.validityExpiry}
                      onChange={(e) => setBgForm((f) => ({ ...f, validityExpiry: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-amber-400" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">TOC Reference</label>
                    <input type="text" value={bgForm.tocRef}
                      onChange={(e) => setBgForm((f) => ({ ...f, tocRef: e.target.value }))}
                      placeholder="TOC-INFRA-01"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">TOC / PC Date</label>
                    <input type="date" value={bgForm.tocDate}
                      onChange={(e) => setBgForm((f) => ({ ...f, tocDate: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">DLP Duration (months)</label>
                    <input type="number" min={1} value={bgForm.dlpMonths}
                      onChange={(e) => setBgForm((f) => ({ ...f, dlpMonths: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-amber-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Remarks</label>
                  <textarea rows={2} value={bgForm.remarks}
                    onChange={(e) => setBgForm((f) => ({ ...f, remarks: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-400 resize-none" />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setAddBgOpen(false)} className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-white">Cancel</button>
                  <button type="submit" disabled={actionId === "creating_bg"}
                    className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition flex items-center gap-1.5 font-mono disabled:opacity-50">
                    <Shield className="w-4 h-4" />
                    Register BG
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
