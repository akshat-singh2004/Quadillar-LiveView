"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Award,
  Banknote,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ClipboardCheck,
  Download,
  FileCheck,
  FileLock2,
  FileText,
  Filter,
  HardHat,
  IndianRupee,
  Landmark,
  LayoutDashboard,
  Link2,
  Lock,
  Package,
  Percent,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Star,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
  Wallet,
  Wrench,
  X,
  Zap,
  Cpu,
  Flame,
  CircleCheck,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type PcrStatus =
  | "DRAFT"
  | "SUBMITTED_TO_SEOR"
  | "SEOR_REVIEWED"
  | "SUBMITTED_TO_DIRECTOR"
  | "DIRECTOR_APPROVED"
  | "CLIENT_ACCEPTED"
  | "GAZETTED";

export type AssetCategory =
  | "CIVIL_STRUCTURE"
  | "MEP_HVAC"
  | "ELECTRICAL"
  | "PLUMBING_SANITATION"
  | "FIRE_FIGHTING"
  | "SECURITY_BMS"
  | "ELEVATOR_ESCALATOR"
  | "LANDSCAPE"
  | "FURNITURE_FIXTURE"
  | "SPECIALIST_EQUIPMENT"
  | "IT_TELECOM"
  | "OTHER";

export type AssetHandoverStatus =
  | "PENDING"
  | "DOCUMENTATION_SUBMITTED"
  | "INSPECTION_DONE"
  | "HANDED_OVER"
  | "PUNCH_LISTED"
  | "REJECTED";

export interface ProjectCompletionReport {
  id: string;
  project_id: string;
  pcr_number: string;
  project_name: string;
  project_location?: string | null;
  client_name: string;
  contractor_name: string;
  work_order_number: string;
  work_order_date?: string | null;
  // Financial — Sanctioned
  sanctioned_amount_inr: number;
  tendered_amount_inr: number;
  loa_amount_inr: number;
  // Financial — Actual
  final_measured_value_inr: number;
  total_ra_bills_paid_inr: number;
  final_bill_net_payable_inr: number;
  total_actual_expenditure_inr: number;
  // Head-wise variance
  var_substructure_sanctioned_inr: number;
  var_substructure_actual_inr: number;
  var_superstructure_sanctioned_inr: number;
  var_superstructure_actual_inr: number;
  var_finishes_sanctioned_inr: number;
  var_finishes_actual_inr: number;
  var_mep_sanctioned_inr: number;
  var_mep_actual_inr: number;
  var_external_works_sanctioned_inr: number;
  var_external_works_actual_inr: number;
  var_contingency_sanctioned_inr: number;
  var_contingency_actual_inr: number;
  // Deductions
  liquidated_damages_levied_inr: number;
  price_adjustment_credit_inr: number;
  variations_approved_inr: number;
  // Schedule
  stipulated_completion_date?: string | null;
  actual_completion_date?: string | null;
  time_overrun_days: number;
  approved_extension_days: number;
  net_delay_days: number;
  spi_value: number;
  milestone_count_total: number;
  milestone_count_achieved: number;
  // TOC
  toc_number?: string | null;
  toc_issued_date?: string | null;
  toc_issued_by?: string | null;
  practical_completion_confirmed: boolean;
  // Sign-off
  status: PcrStatus;
  seor_name?: string | null;
  seor_submitted_date?: string | null;
  seor_reviewed_date?: string | null;
  seor_remarks?: string | null;
  director_name?: string | null;
  director_approved_date?: string | null;
  director_remarks?: string | null;
  client_rep_name?: string | null;
  client_accepted_date?: string | null;
  client_remarks?: string | null;
  // Quality
  dlp_duration_months: number;
  defects_at_handover_count: number;
  defects_cleared_count: number;
  // Attachments
  as_built_drawing_url?: string | null;
  bim_model_url?: string | null;
  photographic_record_url?: string | null;
  test_commissioning_report_url?: string | null;
  remarks?: string | null;
  created_at?: string;
}

export interface FacilityAsset {
  id: string;
  project_id: string;
  pcr_id?: string | null;
  asset_tag: string;
  asset_name: string;
  asset_category: AssetCategory;
  sub_category?: string | null;
  make_model?: string | null;
  manufacturer?: string | null;
  serial_number?: string | null;
  installation_location?: string | null;
  floor_zone?: string | null;
  asset_value_inr: number;
  depreciation_rate_pct: number;
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  warranty_period_months?: number | null;
  warranty_provider?: string | null;
  warranty_contact?: string | null;
  om_manual_url?: string | null;
  test_cert_url?: string | null;
  as_built_ref?: string | null;
  bim_object_id?: string | null;
  bim_integrated: boolean;
  status: AssetHandoverStatus;
  handover_date?: string | null;
  handed_over_by?: string | null;
  received_by?: string | null;
  client_signoff_date?: string | null;
  punch_list_item?: string | null;
  remarks?: string | null;
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
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
}

function daysFromNow(iso?: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function varPct(actual: number, sanctioned: number) {
  if (!sanctioned) return 0;
  return ((actual - sanctioned) / sanctioned) * 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS META
// ─────────────────────────────────────────────────────────────────────────────

const PCR_STATUS_STEPS: { key: PcrStatus; label: string; short: string }[] = [
  { key: "DRAFT",                label: "Draft PCR Prepared",       short: "Draft" },
  { key: "SUBMITTED_TO_SEOR",    label: "Submitted to SEOR",        short: "To SEOR" },
  { key: "SEOR_REVIEWED",        label: "SEOR Reviewed",            short: "SEOR ✓" },
  { key: "SUBMITTED_TO_DIRECTOR",label: "Submitted to Director",    short: "To Director" },
  { key: "DIRECTOR_APPROVED",    label: "Director Approved",        short: "Director ✓" },
  { key: "CLIENT_ACCEPTED",      label: "Client Accepted",          short: "Client ✓" },
  { key: "GAZETTED",             label: "PCR Gazetted / Archived",  short: "Gazetted" },
];

const ASSET_STATUS_META: Record<AssetHandoverStatus, { label: string; cls: string }> = {
  PENDING:                  { label: "Pending",          cls: "bg-zinc-800   text-zinc-400   border-zinc-700" },
  DOCUMENTATION_SUBMITTED:  { label: "Docs Submitted",  cls: "bg-blue-950   text-blue-400   border-blue-800/50" },
  INSPECTION_DONE:          { label: "Inspected",        cls: "bg-cyan-950   text-cyan-400   border-cyan-800/50" },
  HANDED_OVER:              { label: "Handed Over",      cls: "bg-emerald-950 text-emerald-400 border-emerald-800/50" },
  PUNCH_LISTED:             { label: "Punch-Listed",     cls: "bg-amber-950  text-amber-400  border-amber-800/50" },
  REJECTED:                 { label: "Rejected",         cls: "bg-rose-950   text-rose-400   border-rose-800/50" },
};

const CATEGORY_META: Record<AssetCategory, { label: string; icon: React.ElementType; color: string }> = {
  CIVIL_STRUCTURE:     { label: "Civil Structure",      icon: Building2,     color: "text-zinc-400" },
  MEP_HVAC:            { label: "MEP / HVAC",           icon: Zap,           color: "text-cyan-400" },
  ELECTRICAL:          { label: "Electrical",           icon: Zap,           color: "text-yellow-400" },
  PLUMBING_SANITATION: { label: "Plumbing",             icon: Wrench,        color: "text-blue-400" },
  FIRE_FIGHTING:       { label: "Fire Fighting",        icon: Flame,         color: "text-red-400" },
  SECURITY_BMS:        { label: "Security / BMS",       icon: Shield,        color: "text-purple-400" },
  ELEVATOR_ESCALATOR:  { label: "Elevator / Escalator", icon: TrendingUp,    color: "text-indigo-400" },
  LANDSCAPE:           { label: "Landscape",            icon: Star,          color: "text-green-400" },
  FURNITURE_FIXTURE:   { label: "Furniture & Fixtures", icon: Package,       color: "text-amber-400" },
  SPECIALIST_EQUIPMENT:{ label: "Specialist Equipment", icon: Cpu,           color: "text-pink-400" },
  IT_TELECOM:          { label: "IT / Telecom",         icon: Cpu,           color: "text-teal-400" },
  OTHER:               { label: "Other",                icon: HardHat,       color: "text-zinc-500" },
};

function AssetStatusBadge({ status }: { status: AssetHandoverStatus }) {
  const m = ASSET_STATUS_META[status];
  return <span className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold uppercase ${m.cls}`}>{m.label}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRINT COMPLETION DOSSIER
// ─────────────────────────────────────────────────────────────────────────────

function openCompletionDossier(pcr: ProjectCompletionReport, assets: FacilityAsset[]) {
  const totalVariance = pcr.total_actual_expenditure_inr - pcr.loa_amount_inr;
  const variancePct   = pcr.loa_amount_inr ? (totalVariance / pcr.loa_amount_inr * 100) : 0;
  const milestonePct  = pcr.milestone_count_total ? Math.round((pcr.milestone_count_achieved / pcr.milestone_count_total) * 100) : 100;

  const headRows = [
    ["Civil — Substructure",    pcr.var_substructure_sanctioned_inr,   pcr.var_substructure_actual_inr],
    ["Civil — Superstructure",  pcr.var_superstructure_sanctioned_inr, pcr.var_superstructure_actual_inr],
    ["Finishes & Interiors",    pcr.var_finishes_sanctioned_inr,       pcr.var_finishes_actual_inr],
    ["MEP Services",            pcr.var_mep_sanctioned_inr,            pcr.var_mep_actual_inr],
    ["External Works",          pcr.var_external_works_sanctioned_inr, pcr.var_external_works_actual_inr],
    ["Contingency / Prelims",   pcr.var_contingency_sanctioned_inr,    pcr.var_contingency_actual_inr],
  ].map(([label, sanc, act]) => {
    const v = (act as number) - (sanc as number);
    const vp = (sanc as number) ? ((v / (sanc as number)) * 100) : 0;
    return `
      <tr>
        <td>${label as string}</td>
        <td style="text-align:right">${fmt(sanc as number)}</td>
        <td style="text-align:right">${fmt(act as number)}</td>
        <td style="text-align:right;font-weight:700;color:${v > 0 ? "#dc2626" : "#059669"}">${v > 0 ? "+" : ""}${fmt(v)}</td>
        <td style="text-align:right;color:${v > 0 ? "#dc2626" : "#059669"}">${vp > 0 ? "+" : ""}${vp.toFixed(1)}%</td>
      </tr>
    `;
  }).join("");

  const assetRows = assets.map((a) => `
    <tr>
      <td>${a.asset_tag}</td>
      <td>${a.asset_name}</td>
      <td>${CATEGORY_META[a.asset_category]?.label ?? a.asset_category}</td>
      <td>${a.manufacturer ?? "—"}</td>
      <td>${a.serial_number ?? "—"}</td>
      <td style="text-align:center">${a.bim_integrated ? "✓" : "–"}</td>
      <td style="text-align:center">${a.test_cert_url ? "✓ On File" : "Pending"}</td>
      <td style="text-align:center">${a.om_manual_url ? "✓ Linked" : "Pending"}</td>
      <td>${fmtDate(a.warranty_end_date)}</td>
      <td style="text-align:center;font-weight:700;color:${a.status === "HANDED_OVER" ? "#059669" : "#d97706"}">${ASSET_STATUS_META[a.status]?.label ?? a.status}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Project Completion Report — ${pcr.project_name}</title>
  <style>
    @page { size: A3 landscape; margin: 16mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    * { box-sizing: border-box; }
    body { font-family: "SF Pro Text","Segoe UI",Arial,sans-serif; font-size: 9pt; color: #111; background: #fff; margin: 0; padding: 20px; }
    .gov-header { text-align: center; border-bottom: 3px double #111; padding-bottom: 12px; margin-bottom: 16px; }
    .gov-header h1 { font-size: 14pt; font-weight: 900; margin: 0 0 2px; letter-spacing: 0.05em; text-transform: uppercase; }
    .gov-header .sub { font-size: 9pt; color: #333; }
    .pcr-ref { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 8pt; border: 1px solid #ddd; padding: 8px 12px; border-radius: 6px; background: #fafafa; }
    .kpi-row { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
    .kpi { border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; min-width: 120px; background: #f9f9f9; }
    .kpi .lbl { font-size: 7pt; color: #666; text-transform: uppercase; letter-spacing: .04em; }
    .kpi .val { font-size: 11pt; font-weight: 800; margin-top: 2px; }
    .kpi.green .val { color: #059669; }
    .kpi.red   .val { color: #dc2626; }
    .kpi.amber .val { color: #d97706; }
    h2 { font-size: 10pt; font-weight: 700; border-left: 4px solid #111; padding-left: 8px; margin: 16px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-bottom: 16px; }
    th { background: #18181b; color: #fff; padding: 6px 8px; text-align: left; font-weight: 700; white-space: nowrap; }
    td { padding: 4px 8px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
    tfoot td { background: #18181b !important; color: #fff; font-weight: 700; }
    .schedule-box { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 14px; }
    .sched-item { border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; background: #fafafa; font-size: 8pt; }
    .sched-item .lbl { color: #666; font-size: 7pt; text-transform: uppercase; }
    .sched-item .val { font-weight: 700; font-size: 10pt; margin-top: 2px; }
    .toc-box { border: 1px solid #d1fae5; background: #f0fdf4; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; font-size: 8pt; }
    .cert-box { border: 2px solid #111; border-radius: 8px; padding: 16px; margin-top: 20px; }
    .cert-box h3 { font-size: 11pt; font-weight: 800; text-align: center; margin: 0 0 8px; text-transform: uppercase; letter-spacing: .08em; }
    .cert-text { font-size: 8pt; line-height: 1.7; margin: 0 0 16px; text-align: justify; }
    .sign-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 32px; }
    .sign-block { text-align: center; }
    .sign-name { font-weight: 700; font-size: 9pt; border-top: 1px solid #111; padding-top: 6px; margin-top: 40px; }
    .sign-role  { font-size: 7.5pt; color: #555; }
    .sign-date  { font-size: 7pt; color: #888; margin-top: 2px; }
    .watermark  { position: fixed; top: 45%; left: 50%; transform: translate(-50%,-50%) rotate(-40deg); font-size: 80pt; color: rgba(0,0,0,0.04); font-weight: 900; pointer-events: none; z-index: 0; white-space: nowrap; }
    .footer { margin-top: 18px; font-size: 7pt; color: #aaa; text-align: center; border-top: 1px solid #ddd; padding-top: 6px; }
  </style>
</head>
<body>
  <div class="watermark">OFFICIAL</div>
  <div class="gov-header">
    <h1>Project Completion Report</h1>
    <div class="sub">
      CPWD Works Manual — Chapter VI: Completion Reports &nbsp;|&nbsp;
      FIDIC Red Book Cl. 10 (Taking-Over) &amp; Cl. 14.13 (Final Certificate) &nbsp;|&nbsp;
      Report No.: <strong>${pcr.pcr_number}</strong>
    </div>
  </div>

  <div class="pcr-ref">
    <div><strong>Project:</strong> ${pcr.project_name}</div>
    <div><strong>Location:</strong> ${pcr.project_location ?? "—"}</div>
    <div><strong>Client:</strong> ${pcr.client_name}</div>
    <div><strong>Contractor:</strong> ${pcr.contractor_name}</div>
    <div><strong>WO No.:</strong> ${pcr.work_order_number}</div>
    <div><strong>Status:</strong> ${pcr.status.replace(/_/g," ")}</div>
    <div><strong>Date:</strong> ${new Date().toLocaleDateString("en-IN", {day:"2-digit",month:"long",year:"numeric"})}</div>
  </div>

  <div class="kpi-row">
    <div class="kpi"><div class="lbl">Sanctioned Amount</div><div class="val">${fmt(pcr.sanctioned_amount_inr)}</div></div>
    <div class="kpi"><div class="lbl">LOA (Contract) Value</div><div class="val">${fmt(pcr.loa_amount_inr)}</div></div>
    <div class="kpi"><div class="lbl">Final Actual Expenditure</div><div class="val">${fmt(pcr.total_actual_expenditure_inr)}</div></div>
    <div class="kpi ${totalVariance > 0 ? "red" : "green"}">
      <div class="lbl">Cost Variance</div>
      <div class="val">${totalVariance > 0 ? "+" : ""}${fmt(totalVariance)} (${variancePct > 0 ? "+" : ""}${variancePct.toFixed(1)}%)</div>
    </div>
    <div class="kpi"><div class="lbl">Liquidated Damages</div><div class="val">${fmt(pcr.liquidated_damages_levied_inr)}</div></div>
    <div class="kpi ${pcr.net_delay_days > 0 ? "amber" : "green"}">
      <div class="lbl">Net Schedule Delay</div>
      <div class="val">${pcr.net_delay_days > 0 ? pcr.net_delay_days + " days" : "On Time"}</div>
    </div>
    <div class="kpi ${pcr.spi_value >= 1 ? "green" : "amber"}">
      <div class="lbl">Schedule Perf. Index (SPI)</div>
      <div class="val">${pcr.spi_value.toFixed(3)}</div>
    </div>
    <div class="kpi"><div class="lbl">Milestones Achieved</div><div class="val">${pcr.milestone_count_achieved}/${pcr.milestone_count_total} (${milestonePct}%)</div></div>
    <div class="kpi"><div class="lbl">Assets Registered</div><div class="val">${assets.length}</div></div>
  </div>

  <h2>Section A — Schedule Performance Summary</h2>
  <div class="schedule-box">
    <div class="sched-item"><div class="lbl">Stipulated Completion</div><div class="val">${fmtDate(pcr.stipulated_completion_date)}</div></div>
    <div class="sched-item"><div class="lbl">Actual Completion</div><div class="val">${fmtDate(pcr.actual_completion_date)}</div></div>
    <div class="sched-item"><div class="lbl">Total Overrun</div><div class="val">${pcr.time_overrun_days} days</div></div>
    <div class="sched-item"><div class="lbl">Approved Extensions</div><div class="val">${pcr.approved_extension_days} days</div></div>
    <div class="sched-item"><div class="lbl">Net Culpable Delay</div><div class="val" style="color:${pcr.net_delay_days>0?"#dc2626":"#059669"}">${pcr.net_delay_days} days</div></div>
    <div class="sched-item"><div class="lbl">DLP Duration</div><div class="val">${pcr.dlp_duration_months} months</div></div>
  </div>

  ${pcr.toc_number ? `
  <div class="toc-box">
    <strong>Taking-Over Certificate (FIDIC Cl. 10):</strong> &nbsp;
    TOC No. <strong>${pcr.toc_number}</strong> issued on <strong>${fmtDate(pcr.toc_issued_date)}</strong> by <strong>${pcr.toc_issued_by ?? "—"}</strong>.
    Practical Completion: <strong>${pcr.practical_completion_confirmed ? "✓ CONFIRMED" : "PENDING"}</strong>.
  </div>` : ""}

  <h2>Section B — Financial Variance by Major Work Head (CPWD Head-Wise)</h2>
  <table>
    <thead>
      <tr>
        <th>Work Head</th>
        <th style="text-align:right">Sanctioned / LOA (₹)</th>
        <th style="text-align:right">Actual Final (₹)</th>
        <th style="text-align:right">Variance (₹)</th>
        <th style="text-align:right">Variance (%)</th>
      </tr>
    </thead>
    <tbody>${headRows}</tbody>
    <tfoot>
      <tr>
        <td>TOTAL (All Heads)</td>
        <td style="text-align:right">${fmt(pcr.loa_amount_inr)}</td>
        <td style="text-align:right">${fmt(pcr.total_actual_expenditure_inr)}</td>
        <td style="text-align:right;color:${totalVariance>0?"#f87171":"#34d399"}">${totalVariance>0?"+":""}${fmt(totalVariance)}</td>
        <td style="text-align:right;color:${variancePct>0?"#f87171":"#34d399"}">${variancePct>0?"+":""}${variancePct.toFixed(1)}%</td>
      </tr>
    </tfoot>
  </table>

  <h2>Section C — Deductions &amp; Adjustments Applied</h2>
  <table style="width:50%">
    <tbody>
      <tr><td>Liquidated Damages Levied (FIDIC Cl. 8.7)</td><td style="text-align:right;color:#dc2626;font-weight:700">${fmt(pcr.liquidated_damages_levied_inr)}</td></tr>
      <tr><td>Approved Variations &amp; EOT</td><td style="text-align:right;color:#059669;font-weight:700">+${fmt(pcr.variations_approved_inr)}</td></tr>
      <tr><td>Price Adjustment Credit</td><td style="text-align:right;color:#059669;font-weight:700">+${fmt(pcr.price_adjustment_credit_inr)}</td></tr>
    </tbody>
  </table>

  <h2>Section D — Permanent Facility Asset Register (${assets.length} Assets)</h2>
  <table>
    <thead>
      <tr>
        <th>Asset Tag</th><th>Asset Name</th><th>Category</th><th>Manufacturer</th><th>Serial No.</th>
        <th style="text-align:center">BIM</th><th style="text-align:center">Test Cert</th>
        <th style="text-align:center">O&amp;M Manual</th><th>Warranty Expiry</th><th style="text-align:center">Status</th>
      </tr>
    </thead>
    <tbody>${assetRows}</tbody>
  </table>

  <div class="cert-box">
    <h3>Permanent Facility Handover Certificate &amp; Official Sign-Off</h3>
    <p class="cert-text">
      We, the undersigned, hereby certify that the works described in Work Order No. <strong>${pcr.work_order_number}</strong> for the project
      <strong>${pcr.project_name}</strong>, located at <strong>${pcr.project_location ?? "—"}</strong>, have been completed to the satisfaction
      of the Engineer and the Employer. The Taking-Over Certificate No. <strong>${pcr.toc_number ?? "—"}</strong> has been issued in accordance
      with FIDIC Red Book Sub-Clause 10.1. The permanent facility with <strong>${assets.length}</strong> registered assets, together with all
      as-built drawings, BIM models, O&amp;M manuals, equipment test/commissioning certificates, and statutory clearance documents, 
      is hereby formally handed over to the Client / Asset Owner. The Defects Liability Period of 
      <strong>${pcr.dlp_duration_months} months</strong> shall commence from the date of this certificate.
      The total final cost of the project stands at <strong>${fmt(pcr.total_actual_expenditure_inr)}</strong> against a sanctioned amount 
      of <strong>${fmt(pcr.sanctioned_amount_inr)}</strong>, representing a cost variance of 
      <strong>${variancePct > 0 ? "+" : ""}${variancePct.toFixed(2)}%</strong> of the contract value.
    </p>
    <div class="sign-grid">
      <div class="sign-block">
        <div class="sign-name">${pcr.seor_name ?? "________________________"}</div>
        <div class="sign-role">Resident Engineer / SEOR</div>
        <div class="sign-date">Date: ${fmtDate(pcr.seor_reviewed_date)}</div>
      </div>
      <div class="sign-block">
        <div class="sign-name">${pcr.director_name ?? "________________________"}</div>
        <div class="sign-role">Project Director / Superintending Engineer</div>
        <div class="sign-date">Date: ${fmtDate(pcr.director_approved_date)}</div>
      </div>
      <div class="sign-block">
        <div class="sign-name">${pcr.client_rep_name ?? "________________________"}</div>
        <div class="sign-role">Client / Asset Owner Representative</div>
        <div class="sign-date">Date: ${fmtDate(pcr.client_accepted_date)}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    Quadillar LiveView — Project Completion Report · ${pcr.pcr_number} · ${pcr.project_name} · Generated ${new Date().toISOString()} · CONFIDENTIAL OFFICIAL DOCUMENT
  </div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=1400,height=900");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 700);
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA
// ─────────────────────────────────────────────────────────────────────────────

function buildDemoPCR(projectId: string, projectName: string, tier: string): ProjectCompletionReport {
  const isInfra = tier === "INFRASTRUCTURE";
  const isRes   = tier === "RESIDENTIAL";

  if (isInfra) {
    return {
      id: "pcr-infra-01", project_id: projectId,
      pcr_number: "PCR/LKO/2026/001", project_name: projectName,
      project_location: "Lucknow, Uttar Pradesh", client_name: "UPEIDA / Airports Authority of India",
      contractor_name: "Apex Infrastructure Ltd", work_order_number: "WO-INFRA-MAIN-2025",
      work_order_date: "2025-03-01",
      sanctioned_amount_inr: 250000000, tendered_amount_inr: 238500000, loa_amount_inr: 238500000,
      final_measured_value_inr: 241800000, total_ra_bills_paid_inr: 228000000,
      final_bill_net_payable_inr: 13800000, total_actual_expenditure_inr: 241800000,
      var_substructure_sanctioned_inr: 52000000, var_substructure_actual_inr: 53800000,
      var_superstructure_sanctioned_inr: 84000000, var_superstructure_actual_inr: 86200000,
      var_finishes_sanctioned_inr: 35000000, var_finishes_actual_inr: 33900000,
      var_mep_sanctioned_inr: 44000000, var_mep_actual_inr: 43500000,
      var_external_works_sanctioned_inr: 12000000, var_external_works_actual_inr: 13200000,
      var_contingency_sanctioned_inr: 11500000, var_contingency_actual_inr: 11200000,
      liquidated_damages_levied_inr: 1800000, price_adjustment_credit_inr: 4200000, variations_approved_inr: 6800000,
      stipulated_completion_date: "2026-06-30", actual_completion_date: "2026-09-10",
      time_overrun_days: 72, approved_extension_days: 45, net_delay_days: 27,
      spi_value: 0.9624,
      milestone_count_total: 18, milestone_count_achieved: 17,
      toc_number: "TOC/INFRA/2026/001", toc_issued_date: "2026-09-10",
      toc_issued_by: "Er. S.K. Pandey, Superintending Engineer",
      practical_completion_confirmed: true,
      status: "DIRECTOR_APPROVED",
      seor_name: "Er. Rajesh Kumar Tiwari", seor_submitted_date: "2026-09-12",
      seor_reviewed_date: "2026-09-14", seor_remarks: "PCR verified. Head-wise variance within acceptable CPWD tolerance.",
      director_name: "Mr. Ajay Kumar Sharma", director_approved_date: "2026-09-15",
      director_remarks: "Approved. Client sign-off pending. LD of ₹18 L levied for net 27-day delay.",
      client_rep_name: "Mr. V.P. Singh, AAI", client_accepted_date: null, client_remarks: null,
      dlp_duration_months: 12, defects_at_handover_count: 11, defects_cleared_count: 7,
      as_built_drawing_url: "/docs/asbuilt_infra.pdf",
      bim_model_url: "/bim/infra_final.ifc",
      photographic_record_url: "/docs/photo_record_infra.pdf",
      test_commissioning_report_url: "/docs/commissioning_infra.pdf",
      remarks: "Awaiting client sign-off on PCR. 4 minor defects still under rectification during DLP.",
      created_at: new Date().toISOString(),
    };
  } else if (isRes) {
    return {
      id: "pcr-res-01", project_id: projectId,
      pcr_number: "PCR/GMN/2026/001", project_name: projectName,
      project_location: "Gomti Nagar, Lucknow", client_name: "Mr. & Mrs. Agarwal (Private Client)",
      contractor_name: "Royal Woodworks & Interiors", work_order_number: "WO-RES-MAIN-2025",
      work_order_date: "2025-01-15",
      sanctioned_amount_inr: 6800000, tendered_amount_inr: 6500000, loa_amount_inr: 6500000,
      final_measured_value_inr: 6482000, total_ra_bills_paid_inr: 6000000,
      final_bill_net_payable_inr: 482000, total_actual_expenditure_inr: 6482000,
      var_substructure_sanctioned_inr: 0, var_substructure_actual_inr: 0,
      var_superstructure_sanctioned_inr: 1800000, var_superstructure_actual_inr: 1780000,
      var_finishes_sanctioned_inr: 2200000, var_finishes_actual_inr: 2180000,
      var_mep_sanctioned_inr: 1800000, var_mep_actual_inr: 1820000,
      var_external_works_sanctioned_inr: 350000, var_external_works_actual_inr: 360000,
      var_contingency_sanctioned_inr: 350000, var_contingency_actual_inr: 342000,
      liquidated_damages_levied_inr: 0, price_adjustment_credit_inr: 0, variations_approved_inr: 180000,
      stipulated_completion_date: "2026-07-31", actual_completion_date: "2026-07-28",
      time_overrun_days: 0, approved_extension_days: 0, net_delay_days: 0,
      spi_value: 1.0147,
      milestone_count_total: 8, milestone_count_achieved: 8,
      toc_number: "TOC/RES/2026/001", toc_issued_date: "2026-07-28",
      toc_issued_by: "Ar. Rajan Mehta, Principal Architect",
      practical_completion_confirmed: true,
      status: "CLIENT_ACCEPTED",
      seor_name: "Ar. Rajan Mehta", seor_submitted_date: "2026-07-30",
      seor_reviewed_date: "2026-07-30", seor_remarks: "All works completed on schedule. Excellent finish quality.",
      director_name: "Mr. Deepak Nair", director_approved_date: "2026-08-01",
      director_remarks: "PCR approved. Minor cost saving of ₹18,000 achieved.",
      client_rep_name: "Mr. Suresh Agarwal", client_accepted_date: "2026-08-05",
      client_remarks: "Extremely satisfied with the quality of work. Formally accepting the completed fit-out.",
      dlp_duration_months: 12, defects_at_handover_count: 3, defects_cleared_count: 3,
      as_built_drawing_url: "/docs/asbuilt_res.pdf",
      bim_model_url: "/bim/res_final.ifc",
      photographic_record_url: "/docs/photo_record_res.pdf",
      test_commissioning_report_url: "/docs/commissioning_res.pdf",
      remarks: "All DLP defects cleared. PBG released. Final no-dues certificate issued.",
      created_at: new Date().toISOString(),
    };
  }

  // Default / Commercial
  return {
    id: "pcr-com-01", project_id: projectId,
    pcr_number: "PCR/TWR/2026/001", project_name: projectName,
    project_location: "CBD, Lucknow", client_name: "Tower A Development SPV",
    contractor_name: "Meridian Construction Pvt Ltd", work_order_number: "WO-COM-MAIN-2025",
    work_order_date: "2025-01-01",
    sanctioned_amount_inr: 180000000, tendered_amount_inr: 171000000, loa_amount_inr: 171000000,
    final_measured_value_inr: 174200000, total_ra_bills_paid_inr: 160000000,
    final_bill_net_payable_inr: 14200000, total_actual_expenditure_inr: 174200000,
    var_substructure_sanctioned_inr: 32000000, var_substructure_actual_inr: 33200000,
    var_superstructure_sanctioned_inr: 65000000, var_superstructure_actual_inr: 66800000,
    var_finishes_sanctioned_inr: 30000000, var_finishes_actual_inr: 29500000,
    var_mep_sanctioned_inr: 28000000, var_mep_actual_inr: 28800000,
    var_external_works_sanctioned_inr: 8000000, var_external_works_actual_inr: 8300000,
    var_contingency_sanctioned_inr: 8000000, var_contingency_actual_inr: 7600000,
    liquidated_damages_levied_inr: 850000, price_adjustment_credit_inr: 1200000, variations_approved_inr: 3200000,
    stipulated_completion_date: "2026-08-31", actual_completion_date: "2026-09-05",
    time_overrun_days: 5, approved_extension_days: 5, net_delay_days: 0,
    spi_value: 1.0012,
    milestone_count_total: 14, milestone_count_achieved: 14,
    toc_number: "TOC/COM/2026/001", toc_issued_date: "2026-09-05",
    toc_issued_by: "Er. R.P. Gupta, PMC Project Director",
    practical_completion_confirmed: true,
    status: "SUBMITTED_TO_DIRECTOR",
    seor_name: "Er. R.P. Gupta", seor_submitted_date: "2026-09-08",
    seor_reviewed_date: "2026-09-09", seor_remarks: "PCR submitted. Variance of 1.9% within permissible limits.",
    director_name: "Mr. Arvind Mehrotra", director_approved_date: null, director_remarks: null,
    client_rep_name: "Mr. K.L. Sharma", client_accepted_date: null, client_remarks: null,
    dlp_duration_months: 12, defects_at_handover_count: 8, defects_cleared_count: 5,
    as_built_drawing_url: "/docs/asbuilt_tower.pdf",
    bim_model_url: "/bim/tower_final.ifc",
    photographic_record_url: null, test_commissioning_report_url: "/docs/commissioning_tower.pdf",
    remarks: "Awaiting Director's signature. Asset handover list being finalised.",
    created_at: new Date().toISOString(),
  };
}

function buildDemoAssets(projectId: string, pcrId: string, tier: string): FacilityAsset[] {
  const isInfra = tier === "INFRASTRUCTURE";
  const items: Partial<FacilityAsset>[] = isInfra ? [
    { asset_tag: "ASSET-CIV-001", asset_name: "RCC Frame Structure — Block A", asset_category: "CIVIL_STRUCTURE", sub_category: "Primary Structure", manufacturer: "N/A (In-situ)", status: "HANDED_OVER", asset_value_inr: 85000000, warranty_period_months: 60, warranty_end_date: "2031-09-10", bim_integrated: true, om_manual_url: "/docs/om_structure.pdf", test_cert_url: "/docs/ndt_report.pdf", as_built_ref: "DWG-CIV-001-R3", bim_object_id: "BIM-STR-001", installation_location: "All Levels", handover_date: "2026-09-10", handed_over_by: "Er. Rajesh Tiwari", received_by: "AAI Facilities Manager" },
    { asset_tag: "ASSET-MEP-001", asset_name: "AHU Unit — Level 3 Plant Room", asset_category: "MEP_HVAC", sub_category: "Air Handling Unit", make_model: "Daikin FTXM-60", manufacturer: "Daikin India Pvt Ltd", serial_number: "DKN-AHU-2026-0441", status: "HANDED_OVER", asset_value_inr: 1800000, warranty_period_months: 24, warranty_start_date: "2026-09-10", warranty_end_date: "2028-09-10", warranty_provider: "Daikin India", warranty_contact: "+91-1800-100-0044", bim_integrated: true, om_manual_url: "/docs/om_ahu.pdf", test_cert_url: "/docs/ahu_commission_cert.pdf", as_built_ref: "DWG-MEP-AHU-001", installation_location: "Level 3 Plant Room", floor_zone: "Mech. Zone A", handover_date: "2026-09-10", handed_over_by: "Deccan MEP Systems", received_by: "AAI FM" },
    { asset_tag: "ASSET-MEP-002", asset_name: "Chilled Water Pump Set", asset_category: "MEP_HVAC", sub_category: "CHW Pump", make_model: "Grundfos CR-32", manufacturer: "Grundfos Pumps India", serial_number: "GF-CRW-2026-0882", status: "INSPECTION_DONE", asset_value_inr: 640000, warranty_period_months: 24, warranty_start_date: "2026-09-10", warranty_end_date: "2028-09-10", bim_integrated: false, om_manual_url: "/docs/om_pump.pdf", test_cert_url: null, installation_location: "UG Plant Room", floor_zone: "Basement" },
    { asset_tag: "ASSET-ELE-001", asset_name: "HT Panel — Main Switchgear", asset_category: "ELECTRICAL", sub_category: "HT Switchgear", make_model: "Siemens 3AH5", manufacturer: "Siemens Ltd", serial_number: "SIE-HT-2026-1109", status: "HANDED_OVER", asset_value_inr: 3200000, warranty_period_months: 24, warranty_start_date: "2026-09-10", warranty_end_date: "2028-09-10", bim_integrated: true, om_manual_url: "/docs/om_ht_panel.pdf", test_cert_url: "/docs/ht_test_cert.pdf", as_built_ref: "DWG-ELE-HT-001", installation_location: "Electrical Substation", floor_zone: "Ground Level", handover_date: "2026-09-10", handed_over_by: "Pioneer Electrical", received_by: "AAI FM" },
    { asset_tag: "ASSET-ELE-002", asset_name: "DG Set 1000 kVA", asset_category: "ELECTRICAL", sub_category: "Emergency Power", make_model: "Cummins C1000 D5", manufacturer: "Cummins India Ltd", serial_number: "CUM-DG-2026-0337", status: "HANDED_OVER", asset_value_inr: 4800000, warranty_period_months: 12, warranty_start_date: "2026-09-10", warranty_end_date: "2027-09-10", bim_integrated: false, om_manual_url: "/docs/om_dg.pdf", test_cert_url: "/docs/dg_load_test.pdf", installation_location: "DG Yard — East Side", floor_zone: "Ground Level", handover_date: "2026-09-10", handed_over_by: "Pioneer Electrical", received_by: "AAI FM" },
    { asset_tag: "ASSET-FF-001",  asset_name: "Fire Hydrant System", asset_category: "FIRE_FIGHTING", sub_category: "Wet Riser & Hydrant", manufacturer: "Minimax India Ltd", status: "HANDED_OVER", asset_value_inr: 1200000, warranty_period_months: 12, warranty_end_date: "2027-09-10", bim_integrated: false, om_manual_url: "/docs/om_ff.pdf", test_cert_url: "/docs/fire_noc_cert.pdf", installation_location: "All Floors", handover_date: "2026-09-10", handed_over_by: "Apex Infrastructure", received_by: "AAI FM" },
    { asset_tag: "ASSET-BMS-001", asset_name: "BMS / SCADA Control System", asset_category: "SECURITY_BMS", sub_category: "Building Management System", make_model: "Honeywell EBI R510", manufacturer: "Honeywell International", serial_number: "HON-BMS-2026-0551", status: "PUNCH_LISTED", asset_value_inr: 2800000, warranty_period_months: 24, warranty_end_date: "2028-09-10", bim_integrated: false, om_manual_url: null, test_cert_url: null, installation_location: "BMS Control Room, Level 1", punch_list_item: "BMS sensor calibration drift — pending final acceptance test", remarks: "Punch-listed — Deccan MEP to rectify within 14 days." },
  ] : [
    { asset_tag: "ASSET-FIT-001", asset_name: "Modular Kitchen — Unit 3A", asset_category: "FURNITURE_FIXTURE", sub_category: "Kitchen Cabinetry", make_model: "Hettich Innotech", manufacturer: "Royal Woodworks (Custom)", status: "HANDED_OVER", asset_value_inr: 420000, warranty_period_months: 24, warranty_end_date: "2028-07-28", bim_integrated: true, om_manual_url: "/docs/om_kitchen.pdf", test_cert_url: null, installation_location: "Unit 3A Kitchen", handover_date: "2026-07-28", handed_over_by: "Royal Woodworks", received_by: "Mr. Suresh Agarwal" },
    { asset_tag: "ASSET-MEP-003", asset_name: "VRF HVAC System — All Rooms", asset_category: "MEP_HVAC", sub_category: "VRF Indoor + Outdoor Units", make_model: "Daikin VRV-IV", manufacturer: "Daikin India", serial_number: "DKN-VRF-2026-1882", status: "HANDED_OVER", asset_value_inr: 650000, warranty_period_months: 24, warranty_start_date: "2026-07-28", warranty_end_date: "2028-07-28", bim_integrated: false, om_manual_url: "/docs/om_vrf.pdf", test_cert_url: "/docs/vrf_commission.pdf", installation_location: "All Bedrooms + Living", handover_date: "2026-07-28", handed_over_by: "Skyline MEP", received_by: "Mr. Suresh Agarwal" },
    { asset_tag: "ASSET-ELE-003", asset_name: "Electrical DB + Smart Switches", asset_category: "ELECTRICAL", sub_category: "Distribution Board", make_model: "Legrand BTicino", manufacturer: "Legrand India", status: "HANDED_OVER", asset_value_inr: 185000, warranty_period_months: 12, warranty_end_date: "2027-07-28", bim_integrated: false, om_manual_url: "/docs/om_db.pdf", test_cert_url: "/docs/electrical_test.pdf", installation_location: "Utility Area", handover_date: "2026-07-28", handed_over_by: "Skyline MEP", received_by: "Mr. Suresh Agarwal" },
  ];

  return items.map((a, i) => ({
    id: `asset-${pcrId}-${i}`, project_id: projectId, pcr_id: pcrId,
    asset_tag: a.asset_tag!, asset_name: a.asset_name!, asset_category: a.asset_category ?? "OTHER",
    sub_category: a.sub_category ?? null, make_model: a.make_model ?? null,
    manufacturer: a.manufacturer ?? null, serial_number: a.serial_number ?? null,
    installation_location: a.installation_location ?? null, floor_zone: a.floor_zone ?? null,
    asset_value_inr: a.asset_value_inr ?? 0, depreciation_rate_pct: a.depreciation_rate_pct ?? 5,
    warranty_start_date: a.warranty_start_date ?? null, warranty_end_date: a.warranty_end_date ?? null,
    warranty_period_months: a.warranty_period_months ?? null,
    warranty_provider: a.warranty_provider ?? null, warranty_contact: a.warranty_contact ?? null,
    om_manual_url: a.om_manual_url ?? null, test_cert_url: a.test_cert_url ?? null,
    as_built_ref: a.as_built_ref ?? null, bim_object_id: a.bim_object_id ?? null,
    bim_integrated: a.bim_integrated ?? false,
    status: a.status ?? "PENDING",
    handover_date: a.handover_date ?? null, handed_over_by: a.handed_over_by ?? null,
    received_by: a.received_by ?? null, client_signoff_date: a.handover_date ?? null,
    punch_list_item: a.punch_list_item ?? null, remarks: a.remarks ?? null,
    created_at: new Date().toISOString(),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

type ActiveTab = "overview" | "variance" | "assets" | "signoff";

const PCR_STATUS_ORDER = PCR_STATUS_STEPS.map((s) => s.key);

export default function CompletionReportPage() {
  const { project, role, tier } = useActiveRole();
  const [pcr, setPcr]         = useState<ProjectCompletionReport | null>(null);
  const [assets, setAssets]   = useState<FacilityAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [actionId, setActionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"ok" | "warn">("ok");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<string>("ALL");
  const [assetStatusFilter, setAssetStatusFilter] = useState<string>("ALL");
  const [advanceRemarks, setAdvanceRemarks] = useState("");
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);

  const projectId   = (project as any)?.id   || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = (project as any)?.name || "Default Project";
  const roleLabel   = (role as any)?.label   || "Project Director";
  const isPrivileged = ["PRINCIPAL_ARCHITECT","PMC_LEAD","QS_BILLING","CLIENT_EXECUTIVE"].includes((role as any)?.id || "");

  const showFeedback = useCallback((msg: string, type: "ok" | "warn" = "ok") => {
    setFeedback(msg); setFeedbackType(type);
    setTimeout(() => setFeedback(null), 4500);
  }, []);

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [pcrRes, assetRes] = await Promise.all([
        (supabase as any).from("project_completion_reports").select("*").eq("project_id", projectId).single(),
        (supabase as any).from("facility_asset_handover").select("*").eq("project_id", projectId).order("asset_tag"),
      ]);
      if (pcrRes.data) {
        setPcr(pcrRes.data as ProjectCompletionReport);
        if (assetRes.data?.length) setAssets(assetRes.data as FacilityAsset[]);
        setLoading(false); return;
      }
    } catch { /* demo */ }

    const demoPcr = buildDemoPCR(projectId, projectName, tier as string);
    const demoAssets = buildDemoAssets(projectId, demoPcr.id, tier as string);
    setPcr(demoPcr);
    setAssets(demoAssets);
    setLoading(false);
  }, [projectId, projectName, tier]);

  useEffect(() => {
    void loadData();
    const ch = supabase.channel(`pcr_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_completion_reports" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "facility_asset_handover" }, () => void loadData())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [projectId, loadData]);

  // ── Computed ─────────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    if (!pcr) return null;
    const totalVariance = pcr.total_actual_expenditure_inr - pcr.loa_amount_inr;
    const variancePct   = pcr.loa_amount_inr ? (totalVariance / pcr.loa_amount_inr * 100) : 0;
    const spiColor      = pcr.spi_value >= 1 ? "text-emerald-400" : pcr.spi_value >= 0.9 ? "text-amber-400" : "text-rose-400";
    const assetHandedOver   = assets.filter((a) => a.status === "HANDED_OVER").length;
    const assetWithBim      = assets.filter((a) => a.bim_integrated).length;
    const assetWithTestCert = assets.filter((a) => !!a.test_cert_url).length;
    const assetWithOM       = assets.filter((a) => !!a.om_manual_url).length;
    const totalAssetValue   = assets.reduce((s, a) => s + a.asset_value_inr, 0);
    const currentStep = PCR_STATUS_ORDER.indexOf(pcr.status);
    const stepPct     = Math.round((currentStep / (PCR_STATUS_ORDER.length - 1)) * 100);
    return { totalVariance, variancePct, spiColor, assetHandedOver, assetWithBim, assetWithTestCert, assetWithOM, totalAssetValue, currentStep, stepPct };
  }, [pcr, assets]);

  // ── Head-wise variance data ──────────────────────────────────────────────────
  const varianceHeads = useMemo(() => {
    if (!pcr) return [];
    return [
      { label: "Civil — Substructure",   sanc: pcr.var_substructure_sanctioned_inr,   act: pcr.var_substructure_actual_inr,   icon: Building2 },
      { label: "Civil — Superstructure", sanc: pcr.var_superstructure_sanctioned_inr, act: pcr.var_superstructure_actual_inr, icon: Building2 },
      { label: "Finishes & Interiors",   sanc: pcr.var_finishes_sanctioned_inr,       act: pcr.var_finishes_actual_inr,       icon: Star },
      { label: "MEP Services",           sanc: pcr.var_mep_sanctioned_inr,            act: pcr.var_mep_actual_inr,            icon: Zap },
      { label: "External Works",         sanc: pcr.var_external_works_sanctioned_inr, act: pcr.var_external_works_actual_inr, icon: Landmark },
      { label: "Contingency / Prelims",  sanc: pcr.var_contingency_sanctioned_inr,    act: pcr.var_contingency_actual_inr,    icon: Package },
    ].map((h) => ({
      ...h,
      variance: h.act - h.sanc,
      variancePct: h.sanc ? ((h.act - h.sanc) / h.sanc * 100) : 0,
    }));
  }, [pcr]);

  // ── Asset filtering ──────────────────────────────────────────────────────────
  const filteredAssets = useMemo(() => assets.filter((a) => {
    const matchCat    = assetCategoryFilter === "ALL" || a.asset_category === assetCategoryFilter;
    const matchStatus = assetStatusFilter   === "ALL" || a.status === assetStatusFilter;
    const hay = `${a.asset_tag} ${a.asset_name} ${a.manufacturer} ${a.serial_number}`.toLowerCase();
    return matchCat && matchStatus && (!assetSearch.trim() || hay.includes(assetSearch.toLowerCase()));
  }), [assets, assetCategoryFilter, assetStatusFilter, assetSearch]);

  // ── Advance PCR status ───────────────────────────────────────────────────────
  const handleAdvancePCR = async () => {
    if (!pcr || !isPrivileged) return;
    const idx  = PCR_STATUS_ORDER.indexOf(pcr.status);
    if (idx >= PCR_STATUS_ORDER.length - 1) return;
    const next = PCR_STATUS_ORDER[idx + 1];
    setActionId("advance_pcr");
    const now   = new Date().toISOString().slice(0, 10);
    const patch: Partial<ProjectCompletionReport> = { status: next as PcrStatus };
    if (next === "SEOR_REVIEWED")         { patch.seor_reviewed_date = now; patch.seor_name = pcr.seor_name || roleLabel; patch.seor_remarks = advanceRemarks || "Reviewed and verified."; }
    if (next === "DIRECTOR_APPROVED")     { patch.director_approved_date = now; patch.director_name = pcr.director_name || roleLabel; patch.director_remarks = advanceRemarks || "PCR approved."; }
    if (next === "CLIENT_ACCEPTED")       { patch.client_accepted_date = now; patch.client_rep_name = pcr.client_rep_name || roleLabel; patch.client_remarks = advanceRemarks || "Formally accepted by client."; }
    try {
      await (supabase as any).from("project_completion_reports").update(patch).eq("id", pcr.id);
    } catch { /* optimistic */ }
    setPcr((p) => p ? { ...p, ...patch } : p);
    setShowAdvanceModal(false); setAdvanceRemarks("");
    showFeedback(`✓ PCR advanced to: ${PCR_STATUS_STEPS.find((s) => s.key === next)?.label}`);
    setActionId(null);
  };

  const handleHandoverAsset = async (asset: FacilityAsset) => {
    setActionId(`handover_${asset.id}`);
    const next: Partial<Record<AssetHandoverStatus, AssetHandoverStatus>> = {
      PENDING: "DOCUMENTATION_SUBMITTED", DOCUMENTATION_SUBMITTED: "INSPECTION_DONE",
      INSPECTION_DONE: "HANDED_OVER",
    };
    const newStatus = next[asset.status];
    if (!newStatus) { setActionId(null); return; }
    const patch: Partial<FacilityAsset> = {
      status: newStatus,
      ...(newStatus === "HANDED_OVER" ? { handover_date: new Date().toISOString().slice(0, 10), handed_over_by: roleLabel } : {}),
    };
    try {
      await (supabase as any).from("facility_asset_handover").update(patch).eq("id", asset.id);
    } catch { /* optimistic */ }
    setAssets((prev) => prev.map((a) => a.id === asset.id ? { ...a, ...patch } : a));
    showFeedback(`✓ ${asset.asset_name} → ${newStatus.replace(/_/g, " ")}`);
    setActionId(null);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-2 text-zinc-500">
        <Clock className="w-4 h-4 animate-spin text-amber-400" />
        <span className="font-mono text-xs">LOADING PROJECT COMPLETION REPORT…</span>
      </div>
    );
  }

  if (!pcr || !summary) return null;

  const stepIdx = summary.currentStep;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1700px] space-y-5">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-amber-400 uppercase font-bold flex-wrap">
              <Award className="w-3.5 h-3.5" />
              <span>Project Completion Report · CPWD Works Manual Cl. VI · FIDIC Cl. 10 &amp; 14.13</span>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-400">{pcr.project_name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1.5">
              PCR, Cost Variance &amp; Facility Asset Handover
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              {pcr.pcr_number} · WO: {pcr.work_order_number} · Contractor: {pcr.contractor_name} · Client: {pcr.client_name}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button type="button" onClick={() => void loadData()}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs transition">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <Link href="/finance/statutory-clearance"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition">
              <ClipboardCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Statutory Clearance</span>
            </Link>
            <Link href="/closeout/vendor-archive"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition">
              <Archive className="w-3.5 h-3.5 text-cyan-400" />
              <span>Vendor Archive &amp; Ledger</span>
            </Link>
            <Link href="/closeout/client-ledger"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition">
              <Wallet className="w-3.5 h-3.5 text-cyan-400" />
              <span>Client Closeout</span>
            </Link>
            <Link href="/closeout/subcontractor-settlement"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition">
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>Subcontractor Settlement</span>
            </Link>
            <Link href="/closeout/as-built-vault"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition">
              <Archive className="w-3.5 h-3.5 text-cyan-400" />
              <span>As-Built Vault</span>
            </Link>
            <Link href="/closeout/escrow-reserve"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Escrow &amp; Reserve</span>
            </Link>
            <Link href="/closeout/audit-vault"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition">
              <FileLock2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Audit Vault</span>
            </Link>
            <Link href="/closeout/command-center"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition">
              <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
              <span>Command Center</span>
            </Link>
            {isPrivileged && pcr.status !== "GAZETTED" && (
              <button type="button" onClick={() => setShowAdvanceModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-amber-800/50 bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 text-xs font-bold transition">
                <ChevronRight className="w-4 h-4" />
                Advance PCR Status
              </button>
            )}
            <button type="button" onClick={() => openCompletionDossier(pcr, assets)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-amber-950/50">
              <Printer className="w-4 h-4" />
              Print Completion Dossier
            </button>
          </div>
        </div>

        {/* ── FEEDBACK ── */}
        {feedback && (
          <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
            feedbackType === "ok" ? "bg-cyan-950/70 border-cyan-800/80 text-cyan-300" : "bg-amber-950/70 border-amber-800/80 text-amber-300"
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {feedback}
          </div>
        )}

        {/* ── PCR WORKFLOW STEPPER ── */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-amber-400 font-bold uppercase tracking-wider">PCR Workflow Progress</span>
            <span className="text-zinc-400">
              Step {stepIdx + 1} of {PCR_STATUS_STEPS.length}: <strong className="text-white">{PCR_STATUS_STEPS[stepIdx]?.label}</strong>
            </span>
          </div>
          {/* Step dots */}
          <div className="flex items-center gap-0">
            {PCR_STATUS_STEPS.map((step, i) => {
              const done    = i < stepIdx;
              const active  = i === stepIdx;
              const future  = i > stepIdx;
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition ${
                      done   ? "bg-emerald-500 border-emerald-500 text-white"
                      : active ? "bg-amber-500 border-amber-500 text-zinc-950 animate-pulse"
                      : "bg-zinc-800 border-zinc-700 text-zinc-600"
                    }`}>
                      {done ? "✓" : i + 1}
                    </div>
                    <div className={`text-[8px] font-mono mt-1 text-center whitespace-nowrap ${
                      done ? "text-emerald-400" : active ? "text-amber-400" : "text-zinc-600"
                    }`}>{step.short}</div>
                  </div>
                  {i < PCR_STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 rounded transition ${done ? "bg-emerald-500" : "bg-zinc-800"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${summary.stepPct}%` }} />
          </div>
        </div>

        {/* ── KPI GAUGES ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
          {[
            { label: "Sanctioned Budget",   value: fmt(pcr.sanctioned_amount_inr),            icon: IndianRupee,    color: "text-white" },
            { label: "Final Expenditure",   value: fmt(pcr.total_actual_expenditure_inr),      icon: Banknote,       color: "text-amber-300" },
            { label: "Total Variance",      value: `${summary.variancePct > 0 ? "+" : ""}${summary.variancePct.toFixed(1)}%`, icon: summary.totalVariance > 0 ? TrendingUp : TrendingDown, color: summary.totalVariance > 0 ? "text-rose-400" : "text-emerald-400" },
            { label: "SPI",                 value: pcr.spi_value.toFixed(3),                   icon: BarChart3,      color: summary.spiColor },
            { label: "Net Delay",           value: pcr.net_delay_days > 0 ? `${pcr.net_delay_days}d` : "On Time", icon: Clock, color: pcr.net_delay_days > 0 ? "text-amber-400" : "text-emerald-400" },
            { label: "Assets Handed Over",  value: `${summary.assetHandedOver}/${assets.length}`, icon: Package, color: "text-cyan-400" },
          ].map((g) => (
            <div key={g.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between text-zinc-500 text-[11px]">
                <span>{g.label}</span>
                <g.icon className="w-3.5 h-3.5 opacity-50" />
              </div>
              <div className={`text-xl font-extrabold mt-2 ${g.color}`}>{g.value}</div>
            </div>
          ))}
        </div>

        {/* ── TAB BAR ── */}
        <div className="flex items-center gap-1 border-b border-zinc-800">
          {([
            { key: "overview",  label: "Project Overview",    icon: BarChart3 },
            { key: "variance",  label: "Cost Variance",       icon: TrendingDown },
            { key: "assets",    label: `Asset Register (${assets.length})`, icon: Package },
            { key: "signoff",   label: "Sign-Off Chain",      icon: FileCheck },
          ] as { key: ActiveTab; label: string; icon: React.ElementType }[]).map((t) => (
            <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono font-bold rounded-t-lg border-b-2 transition whitespace-nowrap ${
                activeTab === t.key
                  ? "border-amber-400 text-amber-300 bg-amber-950/20"
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
              }`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Project Details Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold border-b border-zinc-800 pb-3">
                Project Identity
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-mono">
                {[
                  ["PCR No.",            pcr.pcr_number],
                  ["Project Location",   pcr.project_location ?? "—"],
                  ["Client",             pcr.client_name],
                  ["Main Contractor",    pcr.contractor_name],
                  ["Work Order No.",     pcr.work_order_number],
                  ["WO Date",            fmtDate(pcr.work_order_date)],
                  ["TOC Number",         pcr.toc_number ?? "—"],
                  ["TOC Date",           fmtDate(pcr.toc_issued_date)],
                  ["DLP Duration",       `${pcr.dlp_duration_months} months`],
                  ["Practical Completion", pcr.practical_completion_confirmed ? "✓ Confirmed" : "Pending"],
                ].map(([l, v]) => (
                  <div key={l as string} className="flex justify-between gap-2 py-0.5 border-b border-zinc-800/30">
                    <span className="text-zinc-500 shrink-0">{l as string}:</span>
                    <span className={`text-right font-bold ${(l as string) === "Practical Completion" && v === "✓ Confirmed" ? "text-emerald-400" : "text-zinc-200"}`}>{v as string}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule Performance */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold border-b border-zinc-800 pb-3">
                Schedule Performance &amp; SPI Analytics
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Stipulated Completion", value: fmtDate(pcr.stipulated_completion_date), color: "text-zinc-200" },
                  { label: "Actual Completion",     value: fmtDate(pcr.actual_completion_date),     color: "text-zinc-200" },
                  { label: "Gross Overrun",         value: `${pcr.time_overrun_days}d`,              color: pcr.time_overrun_days > 0 ? "text-amber-400" : "text-emerald-400" },
                  { label: "Extension Approved",    value: `${pcr.approved_extension_days}d`,        color: "text-cyan-400" },
                  { label: "Net Culpable Delay",    value: `${pcr.net_delay_days}d`,                 color: pcr.net_delay_days > 0 ? "text-rose-400" : "text-emerald-400" },
                  { label: "SPI",                   value: pcr.spi_value.toFixed(4),                 color: summary.spiColor },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 text-center">
                    <div className="text-[9px] text-zinc-500 font-mono uppercase">{item.label}</div>
                    <div className={`text-base font-extrabold font-mono mt-1 ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>
              {/* Milestone Progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>Milestone Achievement</span>
                  <span className="text-white font-bold">{pcr.milestone_count_achieved} / {pcr.milestone_count_total} ({pcr.milestone_count_total ? Math.round((pcr.milestone_count_achieved / pcr.milestone_count_total) * 100) : 100}%)</span>
                </div>
                <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${pcr.milestone_count_total ? (pcr.milestone_count_achieved / pcr.milestone_count_total * 100) : 100}%` }} />
                </div>
              </div>
              {/* Defect Summary */}
              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-[11px] font-mono space-y-1">
                <div className="text-zinc-400 font-bold text-[10px] uppercase">Defects at Handover</div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Identified at TOC:</span>
                  <span className="text-amber-300 font-bold">{pcr.defects_at_handover_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Cleared/Closed:</span>
                  <span className="text-emerald-400 font-bold">{pcr.defects_cleared_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Outstanding (DLP):</span>
                  <span className={`font-bold ${pcr.defects_at_handover_count - pcr.defects_cleared_count > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {pcr.defects_at_handover_count - pcr.defects_cleared_count}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Attachments */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3 lg:col-span-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold border-b border-zinc-800 pb-3">
                Completion Dossier — Attached Documents
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "As-Built Drawings",           url: pcr.as_built_drawing_url,         icon: FileText },
                  { label: "BIM Model (IFC)",              url: pcr.bim_model_url,                icon: Building2 },
                  { label: "Photographic Record",          url: pcr.photographic_record_url,      icon: Star },
                  { label: "Test & Commissioning Report",  url: pcr.test_commissioning_report_url, icon: FileCheck },
                ].map((doc) => (
                  <div key={doc.label} className={`flex items-center gap-2.5 p-3 rounded-xl border transition ${
                    doc.url ? "border-emerald-800/50 bg-emerald-950/20" : "border-zinc-800 bg-zinc-900/30"
                  }`}>
                    <doc.icon className={`w-4 h-4 shrink-0 ${doc.url ? "text-emerald-400" : "text-zinc-600"}`} />
                    <div className="min-w-0">
                      <div className={`text-[10px] font-mono font-bold ${doc.url ? "text-emerald-300" : "text-zinc-500"}`}>{doc.label}</div>
                      {doc.url ? (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="text-[9px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-0.5 mt-0.5">
                          <Link2 className="w-2.5 h-2.5" /> View Document
                        </a>
                      ) : (
                        <div className="text-[9px] text-zinc-600 font-mono mt-0.5 flex items-center gap-0.5">
                          <Upload className="w-2.5 h-2.5" /> Upload Pending
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: COST VARIANCE ── */}
        {activeTab === "variance" && (
          <div className="space-y-4">
            {/* Summary band */}
            <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              summary.totalVariance > 0 ? "border-rose-800/60 bg-rose-950/20" : "border-emerald-800/60 bg-emerald-950/10"
            }`}>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Net Financial Variance (Final Actual vs LOA Contract Value)</div>
                <div className={`text-2xl font-extrabold font-mono mt-1 ${summary.totalVariance > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {summary.totalVariance > 0 ? "+" : ""}{fmt(summary.totalVariance)}&nbsp;
                  <span className="text-base">({summary.variancePct > 0 ? "+" : ""}{summary.variancePct.toFixed(2)}%)</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                {[
                  { label: "LOA Value",      value: fmt(pcr.loa_amount_inr),                     color: "text-white" },
                  { label: "Final Actual",   value: fmt(pcr.total_actual_expenditure_inr),        color: "text-amber-300" },
                  { label: "LD Levied",      value: fmt(pcr.liquidated_damages_levied_inr),       color: "text-rose-400" },
                ].map((g) => (
                  <div key={g.label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-center">
                    <div className="text-[9px] text-zinc-500 uppercase">{g.label}</div>
                    <div className={`font-extrabold mt-1 ${g.color}`}>{g.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Head-wise waterfall */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
              <div className="p-4 border-b border-zinc-800 text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                Head-Wise Variance Breakdown — CPWD Sanctioned vs Final Actual
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-mono">
                  <thead>
                    <tr className="bg-zinc-900/80 text-zinc-500 text-[10px] uppercase tracking-wider">
                      <th className="text-left px-5 py-3">Work Head</th>
                      <th className="text-right px-4 py-3">Sanctioned / LOA (₹)</th>
                      <th className="text-right px-4 py-3">Final Actual (₹)</th>
                      <th className="text-right px-4 py-3">Variance (₹)</th>
                      <th className="text-right px-4 py-3">Variance (%)</th>
                      <th className="px-4 py-3">Visual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {varianceHeads.map((h) => {
                      const isOver  = h.variance > 0;
                      const barW    = h.sanc > 0 ? Math.min(Math.abs(h.variancePct) * 2, 100) : 0;
                      return (
                        <tr key={h.label} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <h.icon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              <span className="font-bold text-zinc-200">{h.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-zinc-300">{fmt(h.sanc)}</td>
                          <td className="px-4 py-3 text-right text-zinc-100 font-bold">{fmt(h.act)}</td>
                          <td className={`px-4 py-3 text-right font-extrabold ${isOver ? "text-rose-400" : "text-emerald-400"}`}>
                            {isOver ? "+" : ""}{fmt(h.variance)}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${isOver ? "text-rose-400" : "text-emerald-400"}`}>
                            {h.variancePct > 0 ? "+" : ""}{h.variancePct.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 w-36">
                            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${isOver ? "bg-rose-500" : "bg-emerald-500"}`}
                                style={{ width: `${barW}%` }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-900/80 font-bold text-sm">
                      <td className="px-5 py-3 text-zinc-200">TOTAL PROJECT</td>
                      <td className="px-4 py-3 text-right text-zinc-200">{fmt(pcr.loa_amount_inr)}</td>
                      <td className="px-4 py-3 text-right text-amber-300">{fmt(pcr.total_actual_expenditure_inr)}</td>
                      <td className={`px-4 py-3 text-right ${summary.totalVariance > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        {summary.totalVariance > 0 ? "+" : ""}{fmt(summary.totalVariance)}
                      </td>
                      <td className={`px-4 py-3 text-right ${summary.variancePct > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        {summary.variancePct > 0 ? "+" : ""}{summary.variancePct.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Deduction summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Liquidated Damages (FIDIC Cl. 8.7)",   value: pcr.liquidated_damages_levied_inr, color: "text-rose-400",   sub: pcr.net_delay_days > 0 ? `${pcr.net_delay_days} day net delay` : "No culpable delay" },
                { label: "Approved Variations & EOT Credits",    value: pcr.variations_approved_inr,       color: "text-emerald-400", sub: "Employer-instructed variations" },
                { label: "Price Adjustment Credit",              value: pcr.price_adjustment_credit_inr,   color: "text-cyan-400",    sub: "CPWD/FIDIC Cl. 13.8 escalation" },
              ].map((d) => (
                <div key={d.label} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-1">
                  <div className="text-[10px] font-mono uppercase text-zinc-500">{d.label}</div>
                  <div className={`text-xl font-extrabold font-mono ${d.color}`}>{d.value > 0 ? "+" : ""}{fmt(d.value)}</div>
                  <div className="text-[10px] text-zinc-600 font-mono">{d.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: ASSET REGISTER ── */}
        {activeTab === "assets" && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              {[
                { label: "Total Assets",          value: `${assets.length}`,                  color: "text-white" },
                { label: "Handed Over",           value: `${summary.assetHandedOver}`,         color: "text-emerald-400" },
                { label: "BIM Integrated",        value: `${summary.assetWithBim}/${assets.length}`, color: "text-cyan-400" },
                { label: "Total Asset Value",     value: fmt(summary.totalAssetValue),         color: "text-amber-300" },
              ].map((g) => (
                <div key={g.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="text-[11px] text-zinc-500">{g.label}</div>
                  <div className={`text-xl font-extrabold mt-2 ${g.color}`}>{g.value}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex gap-2 items-center flex-wrap">
                <select value={assetCategoryFilter} onChange={(e) => setAssetCategoryFilter(e.target.value)}
                  className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-2 py-1.5 outline-none">
                  <option value="ALL">All Categories</option>
                  {(Object.keys(CATEGORY_META) as AssetCategory[]).map((c) => (
                    <option key={c} value={c}>{CATEGORY_META[c].label}</option>
                  ))}
                </select>
                <select value={assetStatusFilter} onChange={(e) => setAssetStatusFilter(e.target.value)}
                  className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-2 py-1.5 outline-none">
                  <option value="ALL">All Status</option>
                  {(Object.keys(ASSET_STATUS_META) as AssetHandoverStatus[]).map((s) => (
                    <option key={s} value={s}>{ASSET_STATUS_META[s].label}</option>
                  ))}
                </select>
              </div>
              <div className="relative w-full sm:w-56 ml-auto">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <input type="text" placeholder="Search assets…" value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-amber-400 font-mono" />
              </div>
            </div>

            {/* Asset cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAssets.map((a) => {
                const catMeta = CATEGORY_META[a.asset_category];
                const CatIcon = catMeta.icon;
                const warrantyDays = daysFromNow(a.warranty_end_date);
                const warrantyExpiring = warrantyDays !== null && warrantyDays >= 0 && warrantyDays <= 90;
                const warrantyExpired  = warrantyDays !== null && warrantyDays < 0;

                return (
                  <div key={a.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg bg-zinc-800 ${catMeta.color}`}>
                          <CatIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white leading-tight">{a.asset_name}</div>
                          <div className="text-[10px] text-amber-400 font-mono">{a.asset_tag}</div>
                        </div>
                      </div>
                      <AssetStatusBadge status={a.status} />
                    </div>

                    {/* Meta grid */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono text-zinc-500">
                      <span className="col-span-2 text-[9px] uppercase font-bold text-zinc-600">{catMeta.label} {a.sub_category ? `· ${a.sub_category}` : ""}</span>
                      {a.manufacturer  && <span>Mfr: <strong className="text-zinc-300">{a.manufacturer}</strong></span>}
                      {a.make_model    && <span>Model: <strong className="text-zinc-300">{a.make_model}</strong></span>}
                      {a.serial_number && <span>S/N: <strong className="text-cyan-400">{a.serial_number}</strong></span>}
                      {a.installation_location && <span>Loc: <strong className="text-zinc-300">{a.installation_location}</strong></span>}
                      <span>Value: <strong className="text-amber-300">{fmt(a.asset_value_inr)}</strong></span>
                    </div>

                    {/* Warranty */}
                    <div className={`flex items-center justify-between p-2 rounded-lg border text-[10px] font-mono ${
                      warrantyExpired   ? "border-rose-800/50 bg-rose-950/20 text-rose-400"
                      : warrantyExpiring ? "border-amber-800/50 bg-amber-950/20 text-amber-400"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-500"
                    }`}>
                      <span>Warranty:</span>
                      <span className="font-bold">{fmtDate(a.warranty_start_date)} → {fmtDate(a.warranty_end_date)}</span>
                    </div>

                    {/* Doc flags */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { label: "BIM", on: a.bim_integrated,       color: "emerald" },
                        { label: "Test Cert", on: !!a.test_cert_url, color: "cyan" },
                        { label: "O&M Manual", on: !!a.om_manual_url, color: "blue" },
                        { label: "As-Built", on: !!a.as_built_ref,   color: "purple" },
                      ].map((flag) => (
                        <span key={flag.label} className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold border ${
                          flag.on
                            ? `bg-${flag.color}-950 text-${flag.color}-400 border-${flag.color}-800/50`
                            : "bg-zinc-800 text-zinc-600 border-zinc-700"
                        }`}>
                          {flag.on ? "✓" : "✗"} {flag.label}
                        </span>
                      ))}
                    </div>

                    {/* Punch-list item */}
                    {a.punch_list_item && (
                      <div className="text-[10px] text-amber-400 font-mono bg-amber-950/20 border border-amber-800/40 rounded p-2">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        {a.punch_list_item}
                      </div>
                    )}

                    {/* Handover progress button */}
                    {a.status !== "HANDED_OVER" && a.status !== "REJECTED" && isPrivileged && (
                      <button type="button"
                        disabled={actionId === `handover_${a.id}`}
                        onClick={() => void handleHandoverAsset(a)}
                        className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[10px] font-bold font-mono transition flex items-center justify-center gap-1.5 disabled:opacity-50">
                        <ChevronRight className="w-3.5 h-3.5" />
                        {a.status === "PENDING"                  ? "Submit Documentation"
                         : a.status === "DOCUMENTATION_SUBMITTED" ? "Mark Inspected"
                         : "Mark Handed Over"}
                      </button>
                    )}
                    {a.status === "HANDED_OVER" && (
                      <div className="text-center text-[10px] text-emerald-400 font-mono py-1">
                        ✓ Handed over {fmtDate(a.handover_date)} by {a.handed_over_by ?? "—"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB: SIGN-OFF CHAIN ── */}
        {activeTab === "signoff" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  role: "Resident SEOR / Site Engineer",
                  name: pcr.seor_name,
                  submittedDate: pcr.seor_submitted_date,
                  signedDate:    pcr.seor_reviewed_date,
                  remarks:       pcr.seor_remarks,
                  done:          !!pcr.seor_reviewed_date,
                  required:      ["SEOR_REVIEWED","SUBMITTED_TO_DIRECTOR","DIRECTOR_APPROVED","CLIENT_ACCEPTED","GAZETTED"].includes(pcr.status),
                  icon:          HardHat,
                },
                {
                  role: "Project Director / Superintending Engineer",
                  name: pcr.director_name,
                  submittedDate: null,
                  signedDate:    pcr.director_approved_date,
                  remarks:       pcr.director_remarks,
                  done:          !!pcr.director_approved_date,
                  required:      ["DIRECTOR_APPROVED","CLIENT_ACCEPTED","GAZETTED"].includes(pcr.status),
                  icon:          Users,
                },
                {
                  role: "Client / Asset Owner Representative",
                  name: pcr.client_rep_name,
                  submittedDate: null,
                  signedDate:    pcr.client_accepted_date,
                  remarks:       pcr.client_remarks,
                  done:          !!pcr.client_accepted_date,
                  required:      ["CLIENT_ACCEPTED","GAZETTED"].includes(pcr.status),
                  icon:          Landmark,
                },
              ].map((signer) => (
                <div key={signer.role} className={`rounded-2xl border p-5 space-y-3 ${
                  signer.done
                    ? "border-emerald-800/60 bg-emerald-950/10"
                    : signer.required
                    ? "border-amber-800/50 bg-amber-950/10"
                    : "border-zinc-800 bg-zinc-900/40"
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${signer.done ? "bg-emerald-500" : signer.required ? "bg-amber-500" : "bg-zinc-800"}`}>
                      <signer.icon className={`w-4 h-4 ${signer.done || signer.required ? "text-zinc-950" : "text-zinc-500"}`} />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{signer.role}</div>
                      <div className="text-sm font-bold text-white">{signer.name ?? "—"}</div>
                    </div>
                  </div>
                  <div className="space-y-1 text-[11px] font-mono">
                    {signer.submittedDate && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Submitted:</span>
                        <span className="text-zinc-300">{fmtDate(signer.submittedDate)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Signed Date:</span>
                      <span className={signer.done ? "text-emerald-400 font-bold" : "text-zinc-600"}>{fmtDate(signer.signedDate)}</span>
                    </div>
                  </div>
                  {signer.remarks && (
                    <div className="p-2 rounded-lg border border-zinc-700 bg-zinc-900/60 text-[10px] font-mono text-zinc-400 italic">
                      {signer.remarks}
                    </div>
                  )}
                  {signer.done ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-bold">
                      <ShieldCheck className="w-4 h-4" /> Signature Recorded
                    </div>
                  ) : (
                    <div className="text-[10px] text-zinc-600 font-mono">
                      {signer.required ? "⏳ Awaiting signature" : "Not yet reached this stage"}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* TOC Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                Taking-Over Certificate — FIDIC Red Book Sub-Clause 10.1
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px] font-mono">
                {[
                  ["TOC Number",          pcr.toc_number ?? "—"],
                  ["TOC Issued Date",     fmtDate(pcr.toc_issued_date)],
                  ["Issued By",           pcr.toc_issued_by ?? "—"],
                  ["PC Confirmed",        pcr.practical_completion_confirmed ? "✓ Yes" : "Pending"],
                ].map(([l, v]) => (
                  <div key={l as string} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                    <div className="text-[9px] text-zinc-500 uppercase">{l as string}</div>
                    <div className={`font-bold mt-1 ${(l as string) === "PC Confirmed" && v === "✓ Yes" ? "text-emerald-400" : "text-zinc-200"}`}>{v as string}</div>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-zinc-600 font-mono">
                CPWD Works Manual Ref: Chapter VI, Para 6.3 — Completion Certificate | FIDIC Cl. 10.1 — Taking-Over of the Works and Sections | FIDIC Cl. 14.13 — Final Certificate
              </div>
            </div>
          </div>
        )}

        {/* ── ADVANCE PCR MODAL ── */}
        {showAdvanceModal && pcr.status !== "GAZETTED" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white font-mono uppercase">Advance PCR Workflow</h3>
                </div>
                <button type="button" onClick={() => setShowAdvanceModal(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-3 rounded-xl border border-amber-800/50 bg-amber-950/30 text-xs font-mono space-y-1">
                  <div>Current Status: <strong className="text-amber-300">{PCR_STATUS_STEPS.find((s) => s.key === pcr.status)?.label}</strong></div>
                  <div>Next Status: <strong className="text-emerald-400">
                    {PCR_STATUS_STEPS[PCR_STATUS_ORDER.indexOf(pcr.status) + 1]?.label ?? "—"}
                  </strong></div>
                  <div>Actioned by: <strong className="text-white">{roleLabel}</strong></div>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">Sign-Off Remarks (optional)</label>
                  <textarea rows={3} value={advanceRemarks}
                    onChange={(e) => setAdvanceRemarks(e.target.value)}
                    placeholder="Add comments, conditions, or notes for the PCR record…"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white text-xs outline-none focus:border-amber-400 resize-none" />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setShowAdvanceModal(false)} className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-white">Cancel</button>
                  <button type="button"
                    disabled={actionId === "advance_pcr"}
                    onClick={() => void handleAdvancePCR()}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition font-mono flex items-center gap-1.5 disabled:opacity-50">
                    <ChevronRight className="w-4 h-4" />
                    Advance PCR Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
