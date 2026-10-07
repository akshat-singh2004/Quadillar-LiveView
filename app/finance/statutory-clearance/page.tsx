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
  AlertTriangle,
  Banknote,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Download,
  FileCheck,
  FileText,
  Filter,
  HardHat,
  IndianRupee,
  Landmark,
  Link2,
  Lock,
  Percent,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  TrendingDown,
  Upload,
  Users,
  X,
  Zap,
  CircleCheck,
  CircleDot,
  AlertCircle,
  Building,
  Receipt,
  Flame,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type CertStatus =
  | "NOT_SUBMITTED"
  | "SUBMITTED_PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "NOT_APPLICABLE";

export type RAGStatus = "GREEN" | "AMBER" | "RED" | "GREY";

export type BocwTxType =
  | "RA_BILL_DEDUCTION"
  | "FINAL_BILL_DEDUCTION"
  | "SUPPLEMENTARY_DEDUCTION"
  | "REMITTANCE_TO_WELFARE_BOARD"
  | "REFUND_ADJUSTMENT";

export interface StatutoryClearance {
  id: string;
  project_id: string;
  work_order_ref: string;
  contractor_name: string;
  trade_package?: string | null;
  contractor_gstin?: string | null;
  contractor_pan?: string | null;

  // Labour Licence
  labour_licence_number?: string | null;
  labour_licence_issued_date?: string | null;
  labour_licence_expiry_date?: string | null;
  labour_licence_max_workers?: number | null;
  labour_licence_status: CertStatus;
  labour_licence_doc_url?: string | null;

  // EPF
  epf_registration_number?: string | null;
  epf_employer_rate_pct: number;
  epf_employee_rate_pct: number;
  epf_clearance_status: CertStatus;
  epf_last_return_month?: string | null;
  epf_arrears_inr: number;
  epf_no_dues_cert_date?: string | null;
  epf_no_dues_cert_url?: string | null;

  // ESI
  esi_registration_number?: string | null;
  esi_employer_rate_pct: number;
  esi_employee_rate_pct: number;
  esi_clearance_status: CertStatus;
  esi_last_return_month?: string | null;
  esi_arrears_inr: number;
  esi_no_dues_cert_date?: string | null;
  esi_no_dues_cert_url?: string | null;

  // BOCW Cess
  bocw_cess_rate_pct: number;
  bocw_gross_cost_base_inr: number;
  bocw_total_cess_due_inr: number;
  bocw_total_cess_paid_inr: number;
  bocw_balance_due_inr: number;
  bocw_remittance_status: CertStatus;
  bocw_challan_ref?: string | null;
  bocw_challan_date?: string | null;
  bocw_challan_url?: string | null;

  // GST
  gst_filing_status: CertStatus;
  gst_last_filed_period?: string | null;
  gst_arrears_inr: number;
  gst_no_dues_cert_date?: string | null;
  gst_no_dues_cert_url?: string | null;

  // Final No-Dues
  final_clearance_status: CertStatus;
  final_clearance_issued_date?: string | null;
  final_clearance_issued_by?: string | null;
  final_clearance_doc_url?: string | null;
  final_clearance_remarks?: string | null;

  // RAG
  rag_epf: RAGStatus;
  rag_esi: RAGStatus;
  rag_gst: RAGStatus;
  rag_bocw: RAGStatus;
  rag_labour_licence: RAGStatus;
  rag_overall: RAGStatus;

  reviewed_by?: string | null;
  reviewed_at?: string | null;
  remarks?: string | null;
  created_at?: string;
}

export interface BocwCessEntry {
  id: string;
  project_id: string;
  statutory_clearance_id?: string | null;
  work_order_ref: string;
  contractor_name: string;
  transaction_type: BocwTxType;
  bill_reference?: string | null;
  bill_date?: string | null;
  gross_bill_amount_inr: number;
  cess_rate_pct: number;
  cess_deducted_inr: number;
  amount_remitted_inr: number;
  balance_inr: number;
  challan_number?: string | null;
  challan_date?: string | null;
  welfare_board_receipt_url?: string | null;
  entered_by?: string | null;
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
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

function daysFromNow(iso?: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function deriveRAG(status: CertStatus, expiryIso?: string | null, arrearsInr = 0): RAGStatus {
  if (status === "NOT_APPLICABLE") return "GREY";
  if (status === "REJECTED" || status === "EXPIRED") return "RED";
  if (arrearsInr > 0) return "RED";
  if (status === "NOT_SUBMITTED") return "RED";
  if (status === "SUBMITTED_PENDING_REVIEW") return "AMBER";
  if (expiryIso) {
    const d = daysFromNow(expiryIso);
    if (d !== null && d < 0)  return "RED";
    if (d !== null && d <= 30) return "AMBER";
  }
  return "GREEN";
}

function worstRAG(rags: RAGStatus[]): RAGStatus {
  if (rags.includes("RED"))   return "RED";
  if (rags.includes("AMBER")) return "AMBER";
  if (rags.includes("GREEN")) return "GREEN";
  return "GREY";
}

function enrichRAG(sc: StatutoryClearance): StatutoryClearance {
  const rag_epf            = deriveRAG(sc.epf_clearance_status,      undefined,               sc.epf_arrears_inr);
  const rag_esi            = deriveRAG(sc.esi_clearance_status,      undefined,               sc.esi_arrears_inr);
  const rag_gst            = deriveRAG(sc.gst_filing_status,         undefined,               sc.gst_arrears_inr);
  const rag_bocw           = deriveRAG(sc.bocw_remittance_status,    undefined,               sc.bocw_balance_due_inr);
  const rag_labour_licence = deriveRAG(sc.labour_licence_status,     sc.labour_licence_expiry_date);
  const rag_overall        = worstRAG([rag_epf, rag_esi, rag_gst, rag_bocw, rag_labour_licence]);
  return { ...sc, rag_epf, rag_esi, rag_gst, rag_bocw, rag_labour_licence, rag_overall };
}

// ─────────────────────────────────────────────────────────────────────────────
// BADGE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const RAG_STYLES: Record<RAGStatus, { cls: string; dot: string; label: string }> = {
  GREEN: { cls: "bg-emerald-950 text-emerald-400 border-emerald-800/50", dot: "bg-emerald-400", label: "Compliant" },
  AMBER: { cls: "bg-amber-950  text-amber-400  border-amber-800/50",    dot: "bg-amber-400",   label: "Action Req." },
  RED:   { cls: "bg-rose-950   text-rose-400   border-rose-800/50",     dot: "bg-rose-500",    label: "Non-Compliant" },
  GREY:  { cls: "bg-zinc-800   text-zinc-400   border-zinc-700",        dot: "bg-zinc-500",    label: "Not Assessed" },
};

const CERT_STYLES: Record<CertStatus, { cls: string; label: string }> = {
  NOT_SUBMITTED:           { cls: "bg-rose-950 text-rose-400 border-rose-800/50",     label: "Not Submitted" },
  SUBMITTED_PENDING_REVIEW:{ cls: "bg-amber-950 text-amber-400 border-amber-800/50", label: "Pending Review" },
  APPROVED:                { cls: "bg-emerald-950 text-emerald-400 border-emerald-800/50", label: "Approved" },
  REJECTED:                { cls: "bg-red-950 text-red-400 border-red-800/50",         label: "Rejected" },
  EXPIRED:                 { cls: "bg-orange-950 text-orange-400 border-orange-800/50", label: "Expired" },
  NOT_APPLICABLE:          { cls: "bg-zinc-800 text-zinc-500 border-zinc-700",          label: "N/A" },
};

function RAGBadge({ rag, size = "sm" }: { rag: RAGStatus; size?: "xs" | "sm" | "lg" }) {
  const m = RAG_STYLES[rag];
  const sz = size === "lg" ? "text-xs px-2.5 py-1" : size === "xs" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5";
  return (
    <span className={`inline-flex items-center gap-1 rounded border font-mono font-bold uppercase ${sz} ${m.cls}`}>
      <span className={`rounded-full shrink-0 ${size === "lg" ? "w-2 h-2" : "w-1.5 h-1.5"} ${m.dot}`} />
      {m.label}
    </span>
  );
}

function CertBadge({ status }: { status: CertStatus }) {
  const m = CERT_STYLES[status];
  return (
    <span className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold uppercase ${m.cls}`}>
      {m.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA
// ─────────────────────────────────────────────────────────────────────────────

function buildDemoSC(projectId: string, tier: string): StatutoryClearance[] {
  const isInfra = tier === "INFRASTRUCTURE";
  const raw: Partial<StatutoryClearance>[] = isInfra
    ? [
        {
          id: "sc-infra-01", work_order_ref: "WO-INFRA-201",
          contractor_name: "Apex Infrastructure Ltd", trade_package: "Civil & Structural",
          contractor_gstin: "09AABCA1234A1Z5", contractor_pan: "AABCA1234A",
          labour_licence_number: "LL/UP/2025/001234", labour_licence_issued_date: "2025-03-01",
          labour_licence_expiry_date: "2026-09-25", labour_licence_max_workers: 350,
          labour_licence_status: "APPROVED", labour_licence_doc_url: "/docs/ll_apex.pdf",
          epf_registration_number: "UP/LKO/0012345", epf_employer_rate_pct: 12, epf_employee_rate_pct: 12,
          epf_clearance_status: "APPROVED", epf_last_return_month: "2026-08",
          epf_arrears_inr: 0, epf_no_dues_cert_date: "2026-08-31", epf_no_dues_cert_url: "/docs/epf_ndcs_apex.pdf",
          esi_registration_number: "5110012345678901", esi_employer_rate_pct: 3.25, esi_employee_rate_pct: 0.75,
          esi_clearance_status: "APPROVED", esi_last_return_month: "2026-08",
          esi_arrears_inr: 0, esi_no_dues_cert_date: "2026-08-31", esi_no_dues_cert_url: "/docs/esi_ndc_apex.pdf",
          bocw_cess_rate_pct: 1, bocw_gross_cost_base_inr: 105000000, bocw_total_cess_due_inr: 1050000,
          bocw_total_cess_paid_inr: 1050000, bocw_balance_due_inr: 0,
          bocw_remittance_status: "APPROVED", bocw_challan_ref: "BOCW/LKO/2026/0441",
          bocw_challan_date: "2026-09-05", bocw_challan_url: "/docs/bocw_challan_apex.pdf",
          gst_filing_status: "APPROVED", gst_last_filed_period: "2026-08",
          gst_arrears_inr: 0, gst_no_dues_cert_date: "2026-09-01", gst_no_dues_cert_url: "/docs/gst_ndc_apex.pdf",
          final_clearance_status: "NOT_SUBMITTED", remarks: "Labour licence expires Sep 25 — extension in progress.",
        },
        {
          id: "sc-infra-02", work_order_ref: "WO-INFRA-202",
          contractor_name: "Deccan MEP Systems Pvt Ltd", trade_package: "MEP & HVAC",
          contractor_gstin: "09AACDS4321B1Z8", contractor_pan: "AACDS4321B",
          labour_licence_number: "LL/UP/2025/002178", labour_licence_issued_date: "2025-04-01",
          labour_licence_expiry_date: "2027-04-01", labour_licence_max_workers: 120,
          labour_licence_status: "APPROVED",
          epf_registration_number: "UP/LKO/0023456", epf_employer_rate_pct: 12, epf_employee_rate_pct: 12,
          epf_clearance_status: "SUBMITTED_PENDING_REVIEW", epf_last_return_month: "2026-07",
          epf_arrears_inr: 0,
          esi_registration_number: "5110023456789012", esi_employer_rate_pct: 3.25, esi_employee_rate_pct: 0.75,
          esi_clearance_status: "APPROVED", esi_last_return_month: "2026-08", esi_arrears_inr: 0,
          esi_no_dues_cert_date: "2026-08-31",
          bocw_cess_rate_pct: 1, bocw_gross_cost_base_inr: 45000000, bocw_total_cess_due_inr: 450000,
          bocw_total_cess_paid_inr: 360000, bocw_balance_due_inr: 90000,
          bocw_remittance_status: "SUBMITTED_PENDING_REVIEW",
          gst_filing_status: "APPROVED", gst_last_filed_period: "2026-08", gst_arrears_inr: 0,
          gst_no_dues_cert_date: "2026-09-01",
          final_clearance_status: "NOT_SUBMITTED",
          remarks: "BOCW cess balance of ₹90,000 outstanding. EPF return for Aug pending review.",
        },
        {
          id: "sc-infra-03", work_order_ref: "WO-INFRA-203",
          contractor_name: "Narmada Concrete Works", trade_package: "Foundation & Basement",
          contractor_gstin: "09AADNC9876C1Z2", contractor_pan: "AADNC9876C",
          labour_licence_number: "LL/UP/2024/000891", labour_licence_issued_date: "2024-06-01",
          labour_licence_expiry_date: "2026-06-01", labour_licence_max_workers: 500,
          labour_licence_status: "EXPIRED",
          epf_registration_number: "UP/LKO/0034567", epf_employer_rate_pct: 12, epf_employee_rate_pct: 12,
          epf_clearance_status: "APPROVED", epf_last_return_month: "2026-06", epf_arrears_inr: 0,
          epf_no_dues_cert_date: "2026-06-30",
          esi_registration_number: "5110034567890123", esi_employer_rate_pct: 3.25, esi_employee_rate_pct: 0.75,
          esi_clearance_status: "APPROVED", esi_last_return_month: "2026-06", esi_arrears_inr: 0,
          esi_no_dues_cert_date: "2026-06-30",
          bocw_cess_rate_pct: 1, bocw_gross_cost_base_inr: 98000000, bocw_total_cess_due_inr: 980000,
          bocw_total_cess_paid_inr: 980000, bocw_balance_due_inr: 0,
          bocw_remittance_status: "APPROVED", bocw_challan_ref: "BOCW/LKO/2026/0221",
          bocw_challan_date: "2026-06-20",
          gst_filing_status: "APPROVED", gst_last_filed_period: "2026-06", gst_arrears_inr: 0,
          gst_no_dues_cert_date: "2026-07-01",
          final_clearance_status: "APPROVED", final_clearance_issued_date: "2026-07-15",
          final_clearance_issued_by: "Er. S.K. Pandey (SEOR)",
          remarks: "All works completed. Final clearance issued. Labour licence was not renewed post-DLP (contract closed).",
        },
        {
          id: "sc-infra-04", work_order_ref: "WO-INFRA-204",
          contractor_name: "Pioneer Electrical Contractors", trade_package: "HT/LT Electrical",
          contractor_gstin: "09AAPEC5432D1Z6", contractor_pan: "AAPEC5432D",
          labour_licence_number: null, labour_licence_status: "NOT_SUBMITTED",
          labour_licence_max_workers: 85,
          epf_registration_number: "UP/LKO/0045678", epf_employer_rate_pct: 12, epf_employee_rate_pct: 12,
          epf_clearance_status: "NOT_SUBMITTED", epf_last_return_month: null, epf_arrears_inr: 125000,
          esi_clearance_status: "NOT_SUBMITTED", esi_employer_rate_pct: 3.25, esi_employee_rate_pct: 0.75,
          esi_arrears_inr: 38000,
          bocw_cess_rate_pct: 1, bocw_gross_cost_base_inr: 12000000, bocw_total_cess_due_inr: 120000,
          bocw_total_cess_paid_inr: 0, bocw_balance_due_inr: 120000,
          bocw_remittance_status: "NOT_SUBMITTED",
          gst_filing_status: "REJECTED", gst_last_filed_period: "2026-06", gst_arrears_inr: 92000,
          final_clearance_status: "NOT_SUBMITTED",
          remarks: "⚠ HIGH RISK: Multiple non-compliances. Bill payments on hold pending clearance submission.",
        },
      ]
    : [
        {
          id: "sc-res-01", work_order_ref: "WO-RES-001",
          contractor_name: "Royal Woodworks & Interiors", trade_package: "Custom Joinery & Millwork",
          contractor_gstin: "09AABCR1111R1Z3", contractor_pan: "AABCR1111R",
          labour_licence_number: "LL/UP/2025/003312", labour_licence_issued_date: "2025-01-15",
          labour_licence_expiry_date: "2026-10-15", labour_licence_max_workers: 40,
          labour_licence_status: "APPROVED",
          epf_registration_number: "UP/LKO/0056789", epf_employer_rate_pct: 12, epf_employee_rate_pct: 12,
          epf_clearance_status: "APPROVED", epf_last_return_month: "2026-07", epf_arrears_inr: 0,
          epf_no_dues_cert_date: "2026-07-31",
          esi_clearance_status: "APPROVED", esi_employer_rate_pct: 3.25, esi_employee_rate_pct: 0.75,
          esi_last_return_month: "2026-07", esi_arrears_inr: 0, esi_no_dues_cert_date: "2026-07-31",
          bocw_cess_rate_pct: 1, bocw_gross_cost_base_inr: 2450000, bocw_total_cess_due_inr: 24500,
          bocw_total_cess_paid_inr: 24500, bocw_balance_due_inr: 0,
          bocw_remittance_status: "APPROVED", bocw_challan_ref: "BOCW/LKO/2026/1001",
          gst_filing_status: "APPROVED", gst_last_filed_period: "2026-07", gst_arrears_inr: 0,
          final_clearance_status: "APPROVED", final_clearance_issued_date: "2026-07-18",
          final_clearance_issued_by: "Ar. Rajan Mehta",
        },
        {
          id: "sc-res-02", work_order_ref: "WO-RES-002",
          contractor_name: "Skyline MEP Contractors", trade_package: "MEP & HVAC",
          contractor_gstin: "09AABSK2222S1Z7", contractor_pan: "AABSK2222S",
          labour_licence_number: "LL/UP/2025/004455", labour_licence_issued_date: "2025-02-01",
          labour_licence_expiry_date: "2026-10-15", labour_licence_max_workers: 60,
          labour_licence_status: "APPROVED",
          epf_registration_number: "UP/LKO/0067890", epf_employer_rate_pct: 12, epf_employee_rate_pct: 12,
          epf_clearance_status: "SUBMITTED_PENDING_REVIEW", epf_last_return_month: "2026-08", epf_arrears_inr: 0,
          esi_clearance_status: "APPROVED", esi_employer_rate_pct: 3.25, esi_employee_rate_pct: 0.75,
          esi_last_return_month: "2026-08", esi_arrears_inr: 0, esi_no_dues_cert_date: "2026-08-31",
          bocw_cess_rate_pct: 1, bocw_gross_cost_base_inr: 3200000, bocw_total_cess_due_inr: 32000,
          bocw_total_cess_paid_inr: 16000, bocw_balance_due_inr: 16000,
          bocw_remittance_status: "SUBMITTED_PENDING_REVIEW",
          gst_filing_status: "APPROVED", gst_last_filed_period: "2026-08", gst_arrears_inr: 0,
          final_clearance_status: "NOT_SUBMITTED",
          remarks: "2nd BOCW tranche pending. EPF Sept return submitted, awaiting board confirmation.",
        },
      ];

  return raw.map((r) => {
    const sc: StatutoryClearance = {
      id: r.id!, project_id: projectId, work_order_ref: r.work_order_ref!,
      contractor_name: r.contractor_name!, trade_package: r.trade_package ?? null,
      contractor_gstin: r.contractor_gstin ?? null, contractor_pan: r.contractor_pan ?? null,
      labour_licence_number: r.labour_licence_number ?? null,
      labour_licence_issued_date: r.labour_licence_issued_date ?? null,
      labour_licence_expiry_date: r.labour_licence_expiry_date ?? null,
      labour_licence_max_workers: r.labour_licence_max_workers ?? null,
      labour_licence_status: r.labour_licence_status ?? "NOT_SUBMITTED",
      labour_licence_doc_url: r.labour_licence_doc_url ?? null,
      epf_registration_number: r.epf_registration_number ?? null,
      epf_employer_rate_pct: r.epf_employer_rate_pct ?? 12,
      epf_employee_rate_pct: r.epf_employee_rate_pct ?? 12,
      epf_clearance_status: r.epf_clearance_status ?? "NOT_SUBMITTED",
      epf_last_return_month: r.epf_last_return_month ?? null,
      epf_arrears_inr: r.epf_arrears_inr ?? 0,
      epf_no_dues_cert_date: r.epf_no_dues_cert_date ?? null,
      epf_no_dues_cert_url: r.epf_no_dues_cert_url ?? null,
      esi_registration_number: r.esi_registration_number ?? null,
      esi_employer_rate_pct: r.esi_employer_rate_pct ?? 3.25,
      esi_employee_rate_pct: r.esi_employee_rate_pct ?? 0.75,
      esi_clearance_status: r.esi_clearance_status ?? "NOT_SUBMITTED",
      esi_last_return_month: r.esi_last_return_month ?? null,
      esi_arrears_inr: r.esi_arrears_inr ?? 0,
      esi_no_dues_cert_date: r.esi_no_dues_cert_date ?? null,
      esi_no_dues_cert_url: r.esi_no_dues_cert_url ?? null,
      bocw_cess_rate_pct: r.bocw_cess_rate_pct ?? 1,
      bocw_gross_cost_base_inr: r.bocw_gross_cost_base_inr ?? 0,
      bocw_total_cess_due_inr: r.bocw_total_cess_due_inr ?? 0,
      bocw_total_cess_paid_inr: r.bocw_total_cess_paid_inr ?? 0,
      bocw_balance_due_inr: r.bocw_balance_due_inr ?? 0,
      bocw_remittance_status: r.bocw_remittance_status ?? "NOT_SUBMITTED",
      bocw_challan_ref: r.bocw_challan_ref ?? null,
      bocw_challan_date: r.bocw_challan_date ?? null,
      bocw_challan_url: r.bocw_challan_url ?? null,
      gst_filing_status: r.gst_filing_status ?? "NOT_SUBMITTED",
      gst_last_filed_period: r.gst_last_filed_period ?? null,
      gst_arrears_inr: r.gst_arrears_inr ?? 0,
      gst_no_dues_cert_date: r.gst_no_dues_cert_date ?? null,
      gst_no_dues_cert_url: r.gst_no_dues_cert_url ?? null,
      final_clearance_status: r.final_clearance_status ?? "NOT_SUBMITTED",
      final_clearance_issued_date: r.final_clearance_issued_date ?? null,
      final_clearance_issued_by: r.final_clearance_issued_by ?? null,
      final_clearance_doc_url: r.final_clearance_doc_url ?? null,
      final_clearance_remarks: r.final_clearance_remarks ?? null,
      rag_epf: "GREY", rag_esi: "GREY", rag_gst: "GREY",
      rag_bocw: "GREY", rag_labour_licence: "GREY", rag_overall: "GREY",
      reviewed_by: null, reviewed_at: null, remarks: r.remarks ?? null,
      created_at: new Date().toISOString(),
    };
    return enrichRAG(sc);
  });
}

function buildDemoBocw(projectId: string, clearances: StatutoryClearance[]): BocwCessEntry[] {
  const entries: BocwCessEntry[] = [];
  clearances.forEach((sc, i) => {
    if (sc.bocw_gross_cost_base_inr <= 0) return;
    const chunks = Math.ceil(sc.bocw_total_cess_due_inr / 500000) || 1;
    const paidPer = sc.bocw_total_cess_paid_inr / chunks;
    const grossPer = sc.bocw_gross_cost_base_inr / chunks;
    for (let c = 0; c < chunks; c++) {
      const billDate = new Date(2026, 3 + c, 15 + i).toISOString().slice(0, 10);
      const isPaid = paidPer * (c + 1) <= sc.bocw_total_cess_paid_inr;
      entries.push({
        id: `bocw-${sc.id}-${c}`, project_id: projectId,
        statutory_clearance_id: sc.id, work_order_ref: sc.work_order_ref,
        contractor_name: sc.contractor_name,
        transaction_type: c === chunks - 1 && sc.bocw_total_cess_paid_inr === sc.bocw_total_cess_due_inr
          ? "REMITTANCE_TO_WELFARE_BOARD" : "RA_BILL_DEDUCTION",
        bill_reference: `RA-${sc.work_order_ref}-${String(c + 1).padStart(3, "0")}`,
        bill_date: billDate,
        gross_bill_amount_inr: Math.round(grossPer),
        cess_rate_pct: 1,
        cess_deducted_inr: Math.round(paidPer || sc.bocw_total_cess_due_inr / chunks),
        amount_remitted_inr: isPaid ? Math.round(paidPer) : 0,
        balance_inr: isPaid ? 0 : Math.round(paidPer || sc.bocw_total_cess_due_inr / chunks),
        challan_number: isPaid ? `BOCW/CHALLAN/${sc.work_order_ref}-${c + 1}` : null,
        challan_date: isPaid ? billDate : null,
        entered_by: "QS / Statutory Desk",
        remarks: c === 0 ? "First deduction tranche" : "Subsequent tranche",
        created_at: new Date().toISOString(),
      });
    }
  });
  return entries;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRINT AUDIT REPORT
// ─────────────────────────────────────────────────────────────────────────────

function openAuditReport(clearances: StatutoryClearance[], bocwEntries: BocwCessEntry[], projectName: string) {
  const totalCessDue   = clearances.reduce((s, c) => s + c.bocw_total_cess_due_inr, 0);
  const totalCessPaid  = clearances.reduce((s, c) => s + c.bocw_total_cess_paid_inr, 0);
  const totalBalance   = clearances.reduce((s, c) => s + c.bocw_balance_due_inr, 0);
  const totalEpfArrears = clearances.reduce((s, c) => s + c.epf_arrears_inr, 0);
  const totalEsiArrears = clearances.reduce((s, c) => s + c.esi_arrears_inr, 0);
  const greenCount = clearances.filter((c) => c.rag_overall === "GREEN").length;
  const amberCount = clearances.filter((c) => c.rag_overall === "AMBER").length;
  const redCount   = clearances.filter((c) => c.rag_overall === "RED").length;

  const rows = clearances.map((c) => `
    <tr>
      <td>${c.contractor_name}</td>
      <td>${c.work_order_ref}</td>
      <td>${c.trade_package ?? "—"}</td>
      <td style="text-align:center">${c.labour_licence_number ?? "—"}<br/><small>${fmtDate(c.labour_licence_expiry_date)}</small></td>
      <td style="text-align:center">${c.epf_registration_number ?? "—"}</td>
      <td style="text-align:center">${c.esi_registration_number ?? "—"}</td>
      <td style="text-align:right">${fmt(c.bocw_total_cess_due_inr)}</td>
      <td style="text-align:right">${fmt(c.bocw_total_cess_paid_inr)}</td>
      <td style="text-align:right;color:${c.bocw_balance_due_inr > 0 ? "#f87171" : "#34d399"}">${fmt(c.bocw_balance_due_inr)}</td>
      <td style="text-align:center;font-weight:bold;color:${c.rag_overall === "GREEN" ? "#34d399" : c.rag_overall === "AMBER" ? "#fbbf24" : "#f87171"}">${c.rag_overall}</td>
      <td style="text-align:center">${c.final_clearance_status === "APPROVED" ? "✓ ISSUED" : "PENDING"}</td>
    </tr>
  `).join("");

  const bocwRows = bocwEntries.map((e) => `
    <tr>
      <td>${e.contractor_name}</td>
      <td>${e.bill_reference ?? "—"}</td>
      <td>${fmtDate(e.bill_date)}</td>
      <td style="text-align:right">${fmt(e.gross_bill_amount_inr)}</td>
      <td style="text-align:right">${e.cess_rate_pct}%</td>
      <td style="text-align:right">${fmt(e.cess_deducted_inr)}</td>
      <td style="text-align:right">${fmt(e.amount_remitted_inr)}</td>
      <td style="text-align:right;color:${e.balance_inr > 0 ? "#f87171" : "#34d399"}">${fmt(e.balance_inr)}</td>
      <td style="text-align:center">${e.challan_number ?? "—"}<br/><small>${fmtDate(e.challan_date)}</small></td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Statutory Labour Compliance Audit Report — ${projectName}</title>
  <style>
    @page { size: A3 landscape; margin: 18mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    * { box-sizing: border-box; }
    body { font-family: "SF Pro Text", "Segoe UI", Arial, sans-serif; font-size: 9pt; color: #111; background: #fff; margin: 0; padding: 24px; }
    .header { border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 18px; }
    .header h1 { font-size: 14pt; font-weight: 800; margin: 0 0 4px; }
    .header .sub { font-size: 8pt; color: #555; }
    .kpi-row { display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
    .kpi { background: #f5f5f5; border: 1px solid #ddd; border-radius: 8px; padding: 10px 14px; min-width: 130px; }
    .kpi .lbl { font-size: 7pt; color: #777; text-transform: uppercase; letter-spacing: .05em; }
    .kpi .val { font-size: 12pt; font-weight: 800; margin-top: 2px; }
    .kpi.red .val { color: #dc2626; }
    .kpi.amber .val { color: #d97706; }
    .kpi.green .val { color: #059669; }
    h2 { font-size: 10pt; font-weight: 700; margin: 20px 0 8px; border-left: 4px solid #111; padding-left: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 8pt; }
    th { background: #18181b; color: #fff; font-weight: 700; padding: 6px 8px; text-align: left; white-space: nowrap; }
    td { padding: 5px 8px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
    small { font-size: 7pt; color: #777; display: block; }
    .summary-box { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px 16px; background: #fffbeb; margin-bottom: 18px; font-size: 8pt; }
    .cert-box { border: 2px solid #111; border-radius: 8px; padding: 16px; margin-top: 24px; }
    .cert-box h3 { font-size: 10pt; font-weight: 700; margin: 0 0 8px; }
    .sign-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 32px; }
    .sign-line { border-top: 1px solid #999; padding-top: 6px; font-size: 8pt; color: #444; }
    .footer { margin-top: 24px; font-size: 7pt; color: #999; border-top: 1px solid #ddd; padding-top: 8px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Statutory Labour Compliance Audit Report</h1>
    <div class="sub">
      Project: <strong>${projectName}</strong> &nbsp;|&nbsp;
      Generated: <strong>${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</strong> &nbsp;|&nbsp;
      Statutory Reference: BOCW Act 1996 · BOCW Welfare Cess Act 1996 · EPF &amp; MP Act 1952 · ESI Act 1948 · Contract Labour (R&amp;A) Act 1970 · CPWD GCC
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi"><div class="lbl">Total Vendors</div><div class="val">${clearances.length}</div></div>
    <div class="kpi green"><div class="lbl">Fully Compliant</div><div class="val">${greenCount}</div></div>
    <div class="kpi amber"><div class="lbl">Action Required</div><div class="val">${amberCount}</div></div>
    <div class="kpi red"><div class="lbl">Non-Compliant</div><div class="val">${redCount}</div></div>
    <div class="kpi"><div class="lbl">Total BOCW Cess Due</div><div class="val">${fmt(totalCessDue)}</div></div>
    <div class="kpi green"><div class="lbl">BOCW Cess Paid</div><div class="val">${fmt(totalCessPaid)}</div></div>
    <div class="kpi ${totalBalance > 0 ? "red" : "green"}"><div class="lbl">Outstanding Balance</div><div class="val">${fmt(totalBalance)}</div></div>
    <div class="kpi ${totalEpfArrears + totalEsiArrears > 0 ? "red" : "green"}"><div class="lbl">EPF+ESI Arrears</div><div class="val">${fmt(totalEpfArrears + totalEsiArrears)}</div></div>
  </div>

  <div class="summary-box">
    <strong>Statutory Compliance Summary:</strong> BOCW Welfare Cess @ 1% of gross construction cost deducted from all running and final bills per BOCW Welfare Cess Act 1996. EPF contributions @ 12% employer + 12% employee per EPF &amp; MP Act 1952. ESI contributions @ 3.25% employer + 0.75% employee per ESI Act 1948. Labour licences mandated under Contract Labour (R&amp;A) Act 1970 for contractors with &gt;20 workers.
  </div>

  <h2>Section A — Vendor Compliance Matrix</h2>
  <table>
    <thead>
      <tr>
        <th>Contractor</th>
        <th>WO Ref</th>
        <th>Trade</th>
        <th>Labour Licence / Expiry</th>
        <th>EPF Reg. No.</th>
        <th>ESI Reg. No.</th>
        <th>BOCW Cess Due</th>
        <th>BOCW Cess Paid</th>
        <th>Balance Due</th>
        <th>Overall RAG</th>
        <th>Final NDC</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <h2>Section B — BOCW Cess Deduction Ledger (Transaction-Level)</h2>
  <table>
    <thead>
      <tr>
        <th>Contractor</th>
        <th>Bill Reference</th>
        <th>Bill Date</th>
        <th>Gross Bill Amount</th>
        <th>Cess Rate</th>
        <th>Cess Deducted</th>
        <th>Amount Remitted</th>
        <th>Balance</th>
        <th>Challan No. / Date</th>
      </tr>
    </thead>
    <tbody>${bocwRows}</tbody>
    <tfoot>
      <tr style="background:#18181b;color:#fff;font-weight:700">
        <td colspan="5">TOTAL</td>
        <td style="text-align:right">${fmt(bocwEntries.reduce((s,e)=>s+e.cess_deducted_inr,0))}</td>
        <td style="text-align:right">${fmt(bocwEntries.reduce((s,e)=>s+e.amount_remitted_inr,0))}</td>
        <td style="text-align:right">${fmt(bocwEntries.reduce((s,e)=>s+e.balance_inr,0))}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="cert-box">
    <h3>Statutory Compliance Declaration — BOCW Cess Remittance Certificate</h3>
    <p style="font-size:8pt;line-height:1.6;margin:0 0 12px">
      We hereby certify that the BOCW Welfare Cess as computed at the prescribed rate of <strong>1%</strong> of the total gross construction cost 
      has been deducted from all running account bills and the final bill, and has been or is in the process of being remitted to the 
      BOCW Welfare Board as per the Building &amp; Other Construction Workers' Welfare Cess Act, 1996. 
      EPF contributions have been deposited with the Employees' Provident Fund Organisation (EPFO) and ESI contributions 
      with the Employees' State Insurance Corporation (ESIC) for all contract workers engaged on this project.
    </p>
    <div class="sign-grid">
      <div><div style="height:36px"></div><div class="sign-line">Accounts / QS Officer<br/>(Statutory Compliance)</div></div>
      <div><div style="height:36px"></div><div class="sign-line">Resident SEOR / Site Engineer<br/>(Verification)</div></div>
      <div><div style="height:36px"></div><div class="sign-line">Project Director / Authorising Officer<br/>(Approval)</div></div>
    </div>
  </div>

  <div class="footer">
    Quadillar LiveView — Statutory Labour Compliance Audit Report · ${projectName} · Generated ${new Date().toISOString()} · CONFIDENTIAL — For Internal Audit Use Only
  </div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=1200,height=900");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

type ActiveTab = "matrix" | "bocw" | "vault" | "audit";

export default function StatutoryClearancePage() {
  const { project, role, tier } = useActiveRole();
  const [clearances, setClearances] = useState<StatutoryClearance[]>([]);
  const [bocwEntries, setBocwEntries] = useState<BocwCessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("matrix");
  const [selectedSc, setSelectedSc] = useState<StatutoryClearance | null>(null);
  const [ragFilter, setRagFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"ok" | "warn">("ok");
  const [showSignoffModal, setShowSignoffModal] = useState(false);
  const [signoffRemarks, setSignoffRemarks] = useState("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const projectId   = (project as any)?.id   || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = (project as any)?.name || "Default Project";
  const roleLabel   = (role as any)?.label   || "QS Officer";
  const isPrivileged = ["PRINCIPAL_ARCHITECT","PMC_LEAD","QS_BILLING","CLIENT_EXECUTIVE"].includes((role as any)?.id || "");

  const showFeedback = useCallback((msg: string, type: "ok" | "warn" = "ok") => {
    setFeedback(msg); setFeedbackType(type);
    setTimeout(() => setFeedback(null), 4500);
  }, []);

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [scRes, bcRes] = await Promise.all([
        (supabase as any).from("statutory_clearances").select("*").eq("project_id", projectId).order("contractor_name"),
        (supabase as any).from("bocw_cess_ledger").select("*").eq("project_id", projectId).order("bill_date", { ascending: false }),
      ]);
      if (scRes.data?.length) {
        const enriched = (scRes.data as StatutoryClearance[]).map(enrichRAG);
        setClearances(enriched);
        setSelectedSc((p) => p ?? enriched[0]);
        if (bcRes.data?.length) setBocwEntries(bcRes.data as BocwCessEntry[]);
        setLoading(false); return;
      }
    } catch { /* fall through to demo */ }

    const demoSC = buildDemoSC(projectId, tier as string);
    const demoBocw = buildDemoBocw(projectId, demoSC);
    setClearances(demoSC);
    setBocwEntries(demoBocw);
    setSelectedSc((p) => p ?? demoSC[0]);
    setLoading(false);
  }, [projectId, tier]);

  useEffect(() => {
    void loadData();
    const ch = supabase.channel(`statutory_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "statutory_clearances" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "bocw_cess_ledger" }, () => void loadData())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [projectId, loadData]);

  // ── Summary ─────────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalVendors     = clearances.length;
    const greenCount       = clearances.filter((c) => c.rag_overall === "GREEN").length;
    const amberCount       = clearances.filter((c) => c.rag_overall === "AMBER").length;
    const redCount         = clearances.filter((c) => c.rag_overall === "RED").length;
    const totalCessDue     = clearances.reduce((s, c) => s + c.bocw_total_cess_due_inr, 0);
    const totalCessPaid    = clearances.reduce((s, c) => s + c.bocw_total_cess_paid_inr, 0);
    const totalBalance     = clearances.reduce((s, c) => s + c.bocw_balance_due_inr, 0);
    const totalEpfArrears  = clearances.reduce((s, c) => s + c.epf_arrears_inr, 0);
    const totalEsiArrears  = clearances.reduce((s, c) => s + c.esi_arrears_inr, 0);
    const finalCleared     = clearances.filter((c) => c.final_clearance_status === "APPROVED").length;
    return { totalVendors, greenCount, amberCount, redCount, totalCessDue, totalCessPaid, totalBalance, totalEpfArrears, totalEsiArrears, finalCleared };
  }, [clearances]);

  // ── Alert matrix ────────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const list: { type: "critical" | "warning"; msg: string }[] = [];
    clearances.forEach((c) => {
      if (c.epf_arrears_inr > 0)  list.push({ type: "critical", msg: `EPF arrears of ${fmt(c.epf_arrears_inr)} for ${c.contractor_name} — payment overdue.` });
      if (c.esi_arrears_inr > 0)  list.push({ type: "critical", msg: `ESI arrears of ${fmt(c.esi_arrears_inr)} for ${c.contractor_name} — payment overdue.` });
      if (c.bocw_balance_due_inr > 0) list.push({ type: "warning", msg: `BOCW Cess balance of ${fmt(c.bocw_balance_due_inr)} outstanding — ${c.contractor_name}.` });
      if (c.labour_licence_expiry_date) {
        const d = daysFromNow(c.labour_licence_expiry_date);
        if (d !== null && d >= 0 && d <= 30) list.push({ type: "warning", msg: `Labour Licence for ${c.contractor_name} expires in ${d} day(s) — renew immediately.` });
        if (d !== null && d < 0 && c.labour_licence_status !== "NOT_APPLICABLE") list.push({ type: "critical", msg: `Labour Licence for ${c.contractor_name} EXPIRED ${Math.abs(d)} day(s) ago — non-compliant.` });
      }
      if (c.rag_overall === "RED" && c.final_clearance_status !== "APPROVED") {
        list.push({ type: "critical", msg: `${c.contractor_name} is non-compliant. Final clearance cannot be issued.` });
      }
    });
    return list;
  }, [clearances]);

  // ── Filtered clearances ──────────────────────────────────────────────────────
  const filtered = useMemo(() => clearances.filter((c) => {
    const matchRag = ragFilter === "ALL" || c.rag_overall === ragFilter;
    const hay = `${c.contractor_name} ${c.work_order_ref} ${c.trade_package}`.toLowerCase();
    return matchRag && (!search.trim() || hay.includes(search.toLowerCase()));
  }), [clearances, ragFilter, search]);

  // ── BOCW reconciliation stats ────────────────────────────────────────────────
  const bocwReconciled = useMemo(() => {
    const linkedEntries = selectedSc
      ? bocwEntries.filter((e) => e.statutory_clearance_id === selectedSc.id || e.work_order_ref === selectedSc.work_order_ref)
      : bocwEntries;
    const totalDeducted  = linkedEntries.reduce((s, e) => s + e.cess_deducted_inr, 0);
    const totalRemitted  = linkedEntries.reduce((s, e) => s + e.amount_remitted_inr, 0);
    const totalPending   = linkedEntries.reduce((s, e) => s + e.balance_inr, 0);
    return { linkedEntries, totalDeducted, totalRemitted, totalPending };
  }, [bocwEntries, selectedSc]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const patchSC = useCallback((id: string, patch: Partial<StatutoryClearance>) => {
    setClearances((prev) => prev.map((c) => c.id === id ? enrichRAG({ ...c, ...patch }) : c));
    setSelectedSc((p) => p?.id === id ? enrichRAG({ ...p, ...patch }) : p);
  }, []);

  const handleApproveCert = async (scId: string, field: keyof StatutoryClearance, label: string) => {
    if (!isPrivileged) return;
    setActionId(`approve_${scId}_${field as string}`);
    const patch: Partial<StatutoryClearance> = {
      [field]: "APPROVED",
      reviewed_by: roleLabel,
      reviewed_at: new Date().toISOString(),
    };
    try {
      await (supabase as any).from("statutory_clearances").update(patch).eq("id", scId);
    } catch { /* optimistic */ }
    patchSC(scId, patch);
    showFeedback(`✓ ${label} approved by ${roleLabel}.`);
    setActionId(null);
  };

  const handleIssueFinalClearance = async () => {
    if (!selectedSc || !isPrivileged) return;
    setActionId(`final_${selectedSc.id}`);
    const patch: Partial<StatutoryClearance> = {
      final_clearance_status: "APPROVED",
      final_clearance_issued_date: new Date().toISOString().slice(0, 10),
      final_clearance_issued_by: roleLabel,
      final_clearance_remarks: signoffRemarks || "All statutory obligations verified and confirmed.",
      reviewed_by: roleLabel, reviewed_at: new Date().toISOString(),
    };
    try {
      await (supabase as any).from("statutory_clearances").update(patch).eq("id", selectedSc.id);
    } catch { /* optimistic */ }
    patchSC(selectedSc.id, patch);
    setShowSignoffModal(false); setSignoffRemarks("");
    showFeedback(`✓ Final No-Dues Clearance Certificate issued for ${selectedSc.contractor_name}.`);
    setActionId(null);
  };

  // ── Clearance eligibility ────────────────────────────────────────────────────
  const clearanceEligible = useMemo(() => {
    if (!selectedSc) return false;
    return selectedSc.rag_epf !== "RED"
      && selectedSc.rag_esi !== "RED"
      && selectedSc.bocw_balance_due_inr <= 0
      && selectedSc.rag_gst !== "RED";
  }, [selectedSc]);

  if (loading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-2 text-zinc-500">
        <Clock className="w-4 h-4 animate-spin text-amber-400" />
        <span className="font-mono text-xs">LOADING STATUTORY COMPLIANCE CLEARINGHOUSE…</span>
      </div>
    );
  }

  const sc = selectedSc;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1700px] space-y-5">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-amber-400 uppercase font-bold">
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Statutory Compliance · BOCW Act 1996 · EPF &amp; MP Act 1952 · ESI Act 1948 · CPWD GCC</span>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1.5">
              Labour Compliance &amp; BOCW Cess Tracker
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              Automated BOCW Cess @ 1% reconciliation · Subcontractor EPF / ESI / GST RAG verification matrix · Final no-dues clearance workflow · Audit-ready report generation.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button type="button" onClick={() => void loadData()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs transition">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <Link href="/finance/dlp-bg-tracker"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>DLP Tracker</span>
            </Link>
            <button type="button" onClick={() => openAuditReport(clearances, bocwEntries, projectName)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-amber-800/50 bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 text-xs font-bold transition">
              <Printer className="w-4 h-4" />
              <span>Audit Report</span>
            </button>
          </div>
        </div>

        {/* ── COMPLIANCE ALERT BANNER ── */}
        {alerts.length > 0 && (
          <div className="rounded-2xl border border-rose-800/60 bg-rose-950/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-bold uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              Statutory Compliance Alerts — {alerts.length} issue{alerts.length > 1 ? "s" : ""} detected
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs rounded-lg p-2 ${
                  a.type === "critical"
                    ? "bg-rose-950/60 border border-rose-800/50 text-rose-300"
                    : "bg-amber-950/50 border border-amber-800/50 text-amber-300"
                }`}>
                  {a.type === "critical" ? <Flame className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                  <span className="font-mono">{a.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FEEDBACK ── */}
        {feedback && (
          <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
            feedbackType === "ok" ? "bg-cyan-950/70 border-cyan-800/80 text-cyan-300" : "bg-amber-950/70 border-amber-800/80 text-amber-300"
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {feedback}
          </div>
        )}

        {/* ── KPI GAUGES ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
          {[
            { label: "Total Vendors",     value: summary.totalVendors.toString(),    icon: Users,       color: "text-white",      sub: "subcontractors" },
            { label: "Fully Compliant",   value: `${summary.greenCount}`,            icon: ShieldCheck, color: "text-emerald-400",sub: "GREEN RAG" },
            { label: "Action Required",   value: `${summary.amberCount}`,            icon: ShieldAlert, color: "text-amber-400",  sub: "AMBER RAG" },
            { label: "Non-Compliant",     value: `${summary.redCount}`,              icon: ShieldOff,   color: summary.redCount > 0 ? "text-rose-400" : "text-zinc-500", sub: "RED RAG" },
            { label: "BOCW Cess Balance", value: fmt(summary.totalBalance),          icon: IndianRupee, color: summary.totalBalance > 0 ? "text-rose-400" : "text-emerald-400", sub: `of ${fmt(summary.totalCessDue)} due` },
            { label: "Final NDC Issued",  value: `${summary.finalCleared}/${summary.totalVendors}`, icon: FileCheck, color: "text-cyan-400", sub: "no-dues certificates" },
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

        {/* ── TAB BAR ── */}
        <div className="flex items-center gap-1 border-b border-zinc-800 pb-0">
          {([
            { key: "matrix", label: "Compliance Matrix", icon: Shield },
            { key: "bocw",   label: "BOCW Cess Ledger",  icon: IndianRupee },
            { key: "vault",  label: "Document Vault",    icon: BookOpen },
            { key: "audit",  label: "Audit Readiness",   icon: ClipboardCheck },
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

        {/* ── TAB: COMPLIANCE MATRIX ── */}
        {activeTab === "matrix" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

            {/* Left: vendor list */}
            <div className="xl:col-span-5 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { key: "ALL",   label: `All (${clearances.length})` },
                    { key: "GREEN", label: "Green" },
                    { key: "AMBER", label: "Amber" },
                    { key: "RED",   label: "Red" },
                  ].map((t) => (
                    <button key={t.key} type="button" onClick={() => setRagFilter(t.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition ${
                        ragFilter === t.key
                          ? t.key === "RED"   ? "bg-rose-500   text-white shadow-md"
                          : t.key === "AMBER" ? "bg-amber-500  text-zinc-950 shadow-md"
                          : t.key === "GREEN" ? "bg-emerald-500 text-zinc-950 shadow-md"
                          : "bg-amber-500 text-zinc-950 shadow-md"
                          : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-44 ml-auto">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                  <input type="text" placeholder="Search…" value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-amber-400 font-mono" />
                </div>
              </div>

              <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
                {filtered.map((c) => (
                  <div key={c.id} onClick={() => setSelectedSc(c)}
                    className={`rounded-2xl border p-4 cursor-pointer transition space-y-3 ${
                      sc?.id === c.id
                        ? "border-amber-500/60 bg-amber-950/10 shadow-lg shadow-amber-950/20"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
                    }`}>

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-white">{c.contractor_name}</div>
                        <div className="text-[10px] text-amber-400 font-mono">{c.trade_package ?? c.work_order_ref}</div>
                      </div>
                      <RAGBadge rag={c.rag_overall} size="sm" />
                    </div>

                    {/* RAG mini-grid */}
                    <div className="grid grid-cols-5 gap-1">
                      {([
                        ["EPF",  c.rag_epf],
                        ["ESI",  c.rag_esi],
                        ["GST",  c.rag_gst],
                        ["BOCW", c.rag_bocw],
                        ["LL",   c.rag_labour_licence],
                      ] as [string, RAGStatus][]).map(([label, rag]) => {
                        const m = RAG_STYLES[rag];
                        return (
                          <div key={label} className={`flex flex-col items-center p-1.5 rounded-lg border text-[9px] font-mono font-bold ${m.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mb-1 ${m.dot}`} />
                            {label}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span>BOCW: {fmt(c.bocw_total_cess_paid_inr)} paid / {fmt(c.bocw_total_cess_due_inr)} due</span>
                      <CertBadge status={c.final_clearance_status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: detail panel */}
            <div className="xl:col-span-7 space-y-4">
              {sc ? (
                <>
                  {/* Header card */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
                    <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">Statutory Clearance Record</div>
                        <div className="text-lg font-bold text-white mt-0.5">{sc.contractor_name}</div>
                        <div className="text-xs text-zinc-400 font-mono">
                          {sc.work_order_ref} · {sc.trade_package ?? "—"} · PAN: {sc.contractor_pan ?? "N/A"} · GSTIN: {sc.contractor_gstin ?? "N/A"}
                        </div>
                      </div>
                      <RAGBadge rag={sc.rag_overall} size="lg" />
                    </div>

                    {/* 5-pillar compliance grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      {([
                        {
                          label: "Labour Licence", rag: sc.rag_labour_licence,
                          statusKey: "labour_licence_status" as keyof StatutoryClearance,
                          status: sc.labour_licence_status,
                          detail: sc.labour_licence_number ?? "Not registered",
                          sub: `Expiry: ${fmtDate(sc.labour_licence_expiry_date)} · Max ${sc.labour_licence_max_workers ?? "—"} workers`,
                          icon: HardHat,
                        },
                        {
                          label: "EPF", rag: sc.rag_epf,
                          statusKey: "epf_clearance_status" as keyof StatutoryClearance,
                          status: sc.epf_clearance_status,
                          detail: sc.epf_registration_number ?? "Not registered",
                          sub: `Last Return: ${sc.epf_last_return_month ?? "—"} · Arrears: ${fmt(sc.epf_arrears_inr)}`,
                          icon: Users,
                        },
                        {
                          label: "ESI", rag: sc.rag_esi,
                          statusKey: "esi_clearance_status" as keyof StatutoryClearance,
                          status: sc.esi_clearance_status,
                          detail: sc.esi_registration_number ?? "Not registered",
                          sub: `Last Return: ${sc.esi_last_return_month ?? "—"} · Arrears: ${fmt(sc.esi_arrears_inr)}`,
                          icon: Users,
                        },
                        {
                          label: "GST", rag: sc.rag_gst,
                          statusKey: "gst_filing_status" as keyof StatutoryClearance,
                          status: sc.gst_filing_status,
                          detail: sc.contractor_gstin ?? "Not registered",
                          sub: `Last Filed: ${sc.gst_last_filed_period ?? "—"} · Arrears: ${fmt(sc.gst_arrears_inr)}`,
                          icon: Receipt,
                        },
                        {
                          label: "BOCW Cess", rag: sc.rag_bocw,
                          statusKey: "bocw_remittance_status" as keyof StatutoryClearance,
                          status: sc.bocw_remittance_status,
                          detail: sc.bocw_challan_ref ?? "No challan",
                          sub: `Due: ${fmt(sc.bocw_total_cess_due_inr)} · Paid: ${fmt(sc.bocw_total_cess_paid_inr)} · Bal: ${fmt(sc.bocw_balance_due_inr)}`,
                          icon: IndianRupee,
                        },
                      ]).map((item) => {
                        const m = RAG_STYLES[item.rag];
                        return (
                          <div key={item.label} className={`rounded-xl border p-3 space-y-2 ${m.cls} bg-opacity-10`} style={{ background: "rgba(255,255,255,0.02)" }}>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wide text-zinc-400">{item.label}</span>
                              <span className={`w-2 h-2 rounded-full ${m.dot}`} />
                            </div>
                            <CertBadge status={item.status as CertStatus} />
                            <div className="text-[9px] font-mono text-zinc-300 truncate">{item.detail}</div>
                            <div className="text-[9px] text-zinc-600 leading-relaxed">{item.sub}</div>
                            {/* Approve button */}
                            {item.status === "SUBMITTED_PENDING_REVIEW" && isPrivileged && (
                              <button type="button"
                                disabled={!!actionId}
                                onClick={() => void handleApproveCert(sc.id, item.statusKey, item.label)}
                                className="w-full py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[9px] font-bold font-mono transition disabled:opacity-50">
                                Approve
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {sc.remarks && (
                      <div className="p-3 rounded-xl border border-amber-800/40 bg-amber-950/20 text-xs text-amber-300 font-mono">
                        <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5 text-amber-400" />
                        {sc.remarks}
                      </div>
                    )}
                  </div>

                  {/* BOCW Cess Reconciliation for selected vendor */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">BOCW Cess Reconciliation</div>
                        <div className="text-sm font-bold text-white mt-0.5">
                          {fmt(bocwReconciled.totalDeducted)} deducted · {fmt(bocwReconciled.totalRemitted)} remitted
                        </div>
                      </div>
                      <div className={`text-sm font-extrabold font-mono ${bocwReconciled.totalPending > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        {bocwReconciled.totalPending > 0 ? `${fmt(bocwReconciled.totalPending)} pending` : "✓ Reconciled"}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                        <span>BOCW Cess Remittance Progress</span>
                        <span>{sc.bocw_total_cess_due_inr > 0 ? Math.round((sc.bocw_total_cess_paid_inr / sc.bocw_total_cess_due_inr) * 100) : 100}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${bocwReconciled.totalPending > 0 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${sc.bocw_total_cess_due_inr > 0 ? Math.min((sc.bocw_total_cess_paid_inr / sc.bocw_total_cess_due_inr) * 100, 100) : 100}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {bocwReconciled.linkedEntries.length === 0 ? (
                        <div className="text-center text-zinc-600 text-xs py-4 font-mono">No BOCW transactions for this vendor.</div>
                      ) : (
                        bocwReconciled.linkedEntries.map((e) => (
                          <div key={e.id} className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-800/70 bg-zinc-900/50 text-[10px] font-mono">
                            <div>
                              <span className="font-bold text-white">{e.bill_reference ?? "—"}</span>
                              <span className="text-zinc-500 ml-2">{fmtDate(e.bill_date)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-zinc-400">Gross: <strong className="text-zinc-200">{fmt(e.gross_bill_amount_inr)}</strong></span>
                              <span className="text-zinc-400">Cess: <strong className="text-amber-300">{fmt(e.cess_deducted_inr)}</strong></span>
                              <span className={`font-bold ${e.balance_inr > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                {e.balance_inr > 0 ? `${fmt(e.balance_inr)} due` : "✓ Paid"}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Final Clearance Sign-off */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold border-b border-zinc-800 pb-3">
                      Final No-Dues Clearance Certificate
                    </div>

                    {sc.final_clearance_status === "APPROVED" ? (
                      <div className="p-4 rounded-xl border border-emerald-800/50 bg-emerald-950/30 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                          <ShieldCheck className="w-4 h-4" /> Final No-Dues Certificate Issued
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono space-y-0.5">
                          <div>Issued: {fmtDate(sc.final_clearance_issued_date)}</div>
                          <div>By: {sc.final_clearance_issued_by ?? "—"}</div>
                          {sc.final_clearance_remarks && <div>Remarks: {sc.final_clearance_remarks}</div>}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-1.5 text-[11px] font-mono">
                          {([
                            { label: "EPF No-Dues Certificate",  pass: sc.rag_epf !== "RED",  detail: sc.epf_no_dues_cert_date ? `Cert dated ${fmtDate(sc.epf_no_dues_cert_date)}` : "Awaiting submission" },
                            { label: "ESI No-Dues Certificate",  pass: sc.rag_esi !== "RED",  detail: sc.esi_no_dues_cert_date ? `Cert dated ${fmtDate(sc.esi_no_dues_cert_date)}` : "Awaiting submission" },
                            { label: "BOCW Cess Fully Remitted", pass: sc.bocw_balance_due_inr <= 0, detail: sc.bocw_balance_due_inr <= 0 ? `Challan: ${sc.bocw_challan_ref ?? "On file"}` : `${fmt(sc.bocw_balance_due_inr)} outstanding` },
                            { label: "GST Returns Filed",        pass: sc.rag_gst !== "RED",  detail: sc.gst_last_filed_period ? `Last filed: ${sc.gst_last_filed_period}` : "Awaiting submission" },
                            { label: "Labour Licence Valid",     pass: sc.rag_labour_licence !== "RED", detail: sc.labour_licence_number ?? "Not submitted" },
                          ]).map((item) => (
                            <div key={item.label} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${
                              item.pass ? "border-emerald-800/30 bg-emerald-950/20" : "border-zinc-800 bg-zinc-900/50"
                            }`}>
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold ${
                                item.pass ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-500"
                              }`}>{item.pass ? "✓" : "✗"}</div>
                              <div>
                                <div className={`font-bold ${item.pass ? "text-emerald-400" : "text-zinc-400"}`}>{item.label}</div>
                                <div className="text-[10px] text-zinc-500">{item.detail}</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {clearanceEligible && isPrivileged && (
                          <button type="button" onClick={() => setShowSignoffModal(true)}
                            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold font-mono transition flex items-center justify-center gap-1.5">
                            <FileCheck className="w-4 h-4" />
                            Issue Final No-Dues Clearance Certificate
                          </button>
                        )}
                        {!clearanceEligible && (
                          <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 text-[10px] text-zinc-500 font-mono text-center">
                            <Lock className="w-4 h-4 inline mr-1 text-zinc-600" />
                            Final clearance locked — resolve all RED compliance items first.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-zinc-600 text-xs py-12 font-mono">
                  Select a vendor from the list to view their compliance record.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: BOCW CESS LEDGER ── */}
        {activeTab === "bocw" && (
          <div className="space-y-4">
            {/* Totals bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              {[
                { label: "Total Gross Cost Base",   value: fmt(clearances.reduce((s,c)=>s+c.bocw_gross_cost_base_inr,0)),   color: "text-white" },
                { label: "Total BOCW Cess @ 1%",    value: fmt(clearances.reduce((s,c)=>s+c.bocw_total_cess_due_inr,0)),    color: "text-amber-300" },
                { label: "Total Remitted",           value: fmt(clearances.reduce((s,c)=>s+c.bocw_total_cess_paid_inr,0)),  color: "text-emerald-400" },
                { label: "Outstanding Balance",     value: fmt(clearances.reduce((s,c)=>s+c.bocw_balance_due_inr,0)),      color: summary.totalBalance > 0 ? "text-rose-400" : "text-emerald-400" },
              ].map((g) => (
                <div key={g.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="text-[11px] text-zinc-500">{g.label}</div>
                  <div className={`text-xl font-extrabold mt-2 ${g.color}`}>{g.value}</div>
                </div>
              ))}
            </div>

            {/* Transaction table */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  BOCW Cess Deduction Ledger — {bocwEntries.length} transactions
                </div>
                <div className="text-[10px] font-mono text-zinc-500">
                  Ref: BOCW Welfare Cess Act 1996 § 3 — 1% of gross construction cost
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-mono">
                  <thead>
                    <tr className="bg-zinc-900/80 text-zinc-500 text-[10px] uppercase tracking-wider">
                      <th className="text-left px-4 py-3">Contractor</th>
                      <th className="text-left px-3 py-3">Bill Ref</th>
                      <th className="text-left px-3 py-3">Date</th>
                      <th className="text-right px-3 py-3">Gross Bill</th>
                      <th className="text-right px-3 py-3">Rate</th>
                      <th className="text-right px-3 py-3">Cess Deducted</th>
                      <th className="text-right px-3 py-3">Remitted</th>
                      <th className="text-right px-3 py-3">Balance</th>
                      <th className="text-left px-3 py-3">Challan</th>
                      <th className="text-center px-3 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bocwEntries.map((e, i) => (
                      <tr key={e.id} className={`border-b border-zinc-800/50 hover:bg-zinc-900/40 transition ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                        <td className="px-4 py-3">
                          <div className="font-bold text-white text-[11px]">{e.contractor_name}</div>
                          <div className="text-[9px] text-zinc-500">{e.work_order_ref}</div>
                        </td>
                        <td className="px-3 py-3 text-zinc-300">{e.bill_reference ?? "—"}</td>
                        <td className="px-3 py-3 text-zinc-400">{fmtDate(e.bill_date)}</td>
                        <td className="px-3 py-3 text-right text-zinc-200">{fmt(e.gross_bill_amount_inr)}</td>
                        <td className="px-3 py-3 text-right text-amber-400">{e.cess_rate_pct}%</td>
                        <td className="px-3 py-3 text-right font-bold text-amber-300">{fmt(e.cess_deducted_inr)}</td>
                        <td className="px-3 py-3 text-right text-emerald-400">{fmt(e.amount_remitted_inr)}</td>
                        <td className={`px-3 py-3 text-right font-bold ${e.balance_inr > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                          {e.balance_inr > 0 ? fmt(e.balance_inr) : "✓ Nil"}
                        </td>
                        <td className="px-3 py-3">
                          {e.challan_number ? (
                            <div>
                              <div className="text-cyan-400 text-[9px]">{e.challan_number}</div>
                              <div className="text-zinc-600 text-[9px]">{fmtDate(e.challan_date)}</div>
                            </div>
                          ) : <span className="text-zinc-600">Pending</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${
                            e.balance_inr === 0
                              ? "bg-emerald-950 text-emerald-400 border-emerald-800/50"
                              : "bg-amber-950 text-amber-400 border-amber-800/50"
                          }`}>
                            {e.balance_inr === 0 ? "Remitted" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-900/80 font-bold text-zinc-300 text-[11px]">
                      <td colSpan={5} className="px-4 py-3">TOTAL</td>
                      <td className="px-3 py-3 text-right text-amber-300">{fmt(bocwEntries.reduce((s,e)=>s+e.cess_deducted_inr,0))}</td>
                      <td className="px-3 py-3 text-right text-emerald-400">{fmt(bocwEntries.reduce((s,e)=>s+e.amount_remitted_inr,0))}</td>
                      <td className={`px-3 py-3 text-right ${bocwEntries.reduce((s,e)=>s+e.balance_inr,0) > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        {fmt(bocwEntries.reduce((s,e)=>s+e.balance_inr,0))}
                      </td>
                      <td colSpan={2} className="px-3 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: DOCUMENT VAULT ── */}
        {activeTab === "vault" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {clearances.map((c) => (
                <div key={c.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">{c.contractor_name}</div>
                      <div className="text-[10px] text-amber-400 font-mono">{c.work_order_ref}</div>
                    </div>
                    <RAGBadge rag={c.rag_overall} size="xs" />
                  </div>
                  <div className="space-y-1.5">
                    {([
                      { label: "Labour Licence",       url: c.labour_licence_doc_url,    status: c.labour_licence_status },
                      { label: "EPF No-Dues Cert",     url: c.epf_no_dues_cert_url,      status: c.epf_clearance_status },
                      { label: "ESI No-Dues Cert",     url: c.esi_no_dues_cert_url,      status: c.esi_clearance_status },
                      { label: "BOCW Challan",         url: c.bocw_challan_url,           status: c.bocw_remittance_status },
                      { label: "GST NDC",              url: c.gst_no_dues_cert_url,       status: c.gst_filing_status },
                      { label: "Final No-Dues Cert",   url: c.final_clearance_doc_url,    status: c.final_clearance_status },
                    ]).map((doc) => (
                      <div key={doc.label} className="flex items-center justify-between p-2 rounded-lg border border-zinc-800/70 bg-zinc-900/40">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span className="text-[10px] font-mono text-zinc-300">{doc.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {doc.url ? (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer"
                              className="text-[9px] flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-mono">
                              <Link2 className="w-3 h-3" /> View
                            </a>
                          ) : (
                            <button type="button"
                              className="text-[9px] flex items-center gap-1 text-zinc-500 hover:text-zinc-300 font-mono border border-zinc-700 rounded px-1.5 py-0.5 transition">
                              <Upload className="w-3 h-3" /> Upload
                            </button>
                          )}
                          <CertBadge status={doc.status as CertStatus} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: AUDIT READINESS ── */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">Audit Readiness Dashboard</div>
                  <div className="text-lg font-bold text-white mt-0.5">Statutory Compliance Summary — {projectName}</div>
                </div>
                <button type="button" onClick={() => openAuditReport(clearances, bocwEntries, projectName)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold font-mono transition">
                  <Printer className="w-4 h-4" /> Print Full Audit Report
                </button>
              </div>

              {/* Readiness matrix */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-mono">
                  <thead>
                    <tr className="bg-zinc-900/80 text-zinc-500 text-[10px] uppercase tracking-wider">
                      <th className="text-left px-4 py-3">Contractor</th>
                      <th className="text-center px-3 py-3">Labour Lic.</th>
                      <th className="text-center px-3 py-3">EPF</th>
                      <th className="text-center px-3 py-3">ESI</th>
                      <th className="text-center px-3 py-3">GST</th>
                      <th className="text-center px-3 py-3">BOCW Cess</th>
                      <th className="text-center px-3 py-3">Overall RAG</th>
                      <th className="text-center px-3 py-3">Final NDC</th>
                      <th className="text-right px-3 py-3">BOCW Due</th>
                      <th className="text-right px-3 py-3">BOCW Paid</th>
                      <th className="text-right px-3 py-3">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clearances.map((c, i) => (
                      <tr key={c.id} className={`border-b border-zinc-800/50 hover:bg-zinc-900/30 transition ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{c.contractor_name}</div>
                          <div className="text-[9px] text-zinc-500">{c.work_order_ref} · {c.trade_package ?? "—"}</div>
                        </td>
                        {([c.rag_labour_licence, c.rag_epf, c.rag_esi, c.rag_gst, c.rag_bocw, c.rag_overall] as RAGStatus[]).map((rag, j) => {
                          const m = RAG_STYLES[rag];
                          return (
                            <td key={j} className="px-3 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold ${m.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                                {rag}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center">
                          <CertBadge status={c.final_clearance_status} />
                        </td>
                        <td className="px-3 py-3 text-right text-zinc-300">{fmt(c.bocw_total_cess_due_inr)}</td>
                        <td className="px-3 py-3 text-right text-emerald-400">{fmt(c.bocw_total_cess_paid_inr)}</td>
                        <td className={`px-3 py-3 text-right font-bold ${c.bocw_balance_due_inr > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                          {c.bocw_balance_due_inr > 0 ? fmt(c.bocw_balance_due_inr) : "✓ Nil"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-900/80 font-bold text-zinc-200 text-[11px]">
                      <td colSpan={8} className="px-4 py-3">PROJECT TOTAL</td>
                      <td className="px-3 py-3 text-right">{fmt(summary.totalCessDue)}</td>
                      <td className="px-3 py-3 text-right text-emerald-400">{fmt(summary.totalCessPaid)}</td>
                      <td className={`px-3 py-3 text-right font-bold ${summary.totalBalance > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        {summary.totalBalance > 0 ? fmt(summary.totalBalance) : "✓ Nil"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Statutory note */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 text-[10px] font-mono text-zinc-500 leading-relaxed space-y-1">
                <div className="text-zinc-300 font-bold text-[11px] mb-1">Statutory Remittance Declaration</div>
                <div>• BOCW Welfare Cess @ <strong>1%</strong> of gross construction cost deducted from all RA bills &amp; final bills per BOCW Welfare Cess Act 1996 § 3.</div>
                <div>• EPF contributions: Employer <strong>12%</strong> + Employee <strong>12%</strong> of basic wages per EPF &amp; MP Act 1952.</div>
                <div>• ESI contributions: Employer <strong>3.25%</strong> + Employee <strong>0.75%</strong> of gross wages per ESI Act 1948.</div>
                <div>• Labour Licences mandated for contractors employing &gt;20 workers under Contract Labour (R&amp;A) Act 1970.</div>
                <div>• Final No-Dues Certificate issued only after all statutory obligations are discharged and confirmed by SEOR/QS.</div>
                <div className="text-zinc-600 mt-1">Reference: CPWD GCC Statutory Clauses · Quadillar LiveView Statutory Clearinghouse Module · ISO 19650 CDE Status: PUBLISHED</div>
              </div>
            </div>
          </div>
        )}

        {/* ── FINAL CLEARANCE SIGNOFF MODAL ── */}
        {showSignoffModal && sc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white font-mono uppercase">Issue Final No-Dues Certificate</h3>
                </div>
                <button type="button" onClick={() => setShowSignoffModal(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-3 rounded-xl border border-amber-800/50 bg-amber-950/30 text-xs text-amber-300 font-mono leading-relaxed">
                  <strong>Contractor:</strong> {sc.contractor_name}<br />
                  <strong>Work Order:</strong> {sc.work_order_ref}<br />
                  <strong>Issuing Authority:</strong> {roleLabel}<br />
                  <strong>Date:</strong> {new Date().toLocaleDateString("en-IN")}
                </div>
                <div className="text-xs text-zinc-400 font-mono leading-relaxed">
                  I certify that all statutory obligations — including EPF, ESI, BOCW Cess remittance, GST filings, and labour licence compliance — have been verified and cleared for the above contractor/work package. This No-Dues Certificate is issued in accordance with CPWD GCC and the applicable statutory provisions.
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">Remarks (optional)</label>
                  <textarea rows={3} value={signoffRemarks}
                    onChange={(e) => setSignoffRemarks(e.target.value)}
                    placeholder="Any conditions or notes for the record…"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white text-xs outline-none focus:border-emerald-400 resize-none" />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setShowSignoffModal(false)} className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-white">Cancel</button>
                  <button type="button"
                    disabled={actionId === `final_${sc.id}`}
                    onClick={() => void handleIssueFinalClearance()}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition font-mono flex items-center gap-1.5 disabled:opacity-50">
                    <ShieldCheck className="w-4 h-4" />
                    Issue No-Dues Certificate
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
