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

export type ClientBillStage =
  | "DRAFT_APPLICATION"
  | "ENGINEER_CERTIFIED"
  | "TAX_INVOICE_SUBMITTED"
  | "PAYMENT_RECEIVED"
  | "RERA_ESCROW_RECONCILED"
  | "DISPUTED_DEDUCTION";

export type ReraEscrowStatus =
  | "EXEMPT_RESIDENTIAL_NON_COMMERCIAL"
  | "PENDING_70PCT_TRANSFER"
  | "ESCROW_DEPOSIT_VERIFIED";

export interface ClientBillingRecord {
  id: string;
  project_id: string;
  invoice_number: string;
  client_name: string;
  client_gstin?: string | null;
  contract_agreement_ref: string;
  billing_period_start: string;
  billing_period_end: string;
  milestone_title: string;
  work_scope_description: string;
  gross_certified_inr: number;
  client_retention_pct: number;
  client_retention_inr: number;
  advance_recovery_inr: number;
  net_work_done_inr: number;
  gst_rate_pct: number;
  cgst_amount_inr: number;
  sgst_amount_inr: number;
  total_invoice_with_gst_inr: number;
  it_tds_194c_inr: number;
  gst_tds_sec51_inr: number;
  net_receivable_inr: number;
  amount_received_inr: number;
  rera_70pct_escrow_deposit_inr: number;
  rera_escrow_account_ref?: string | null;
  rera_deposit_utr?: string | null;
  rera_escrow_status: ReraEscrowStatus;
  status: ClientBillStage;
  client_representative_name?: string | null;
  seor_certifier_name?: string | null;
  certified_at?: string | null;
  payment_received_at?: string | null;
  audit_remarks?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function computeInvoiceFinancials(
  gross: number,
  retentionPct: number,
  advanceRec: number,
  gstPct: number,
  isGovtGstTds: boolean
) {
  const retention = Math.round(gross * (retentionPct / 100));
  const netWorkDone = Math.max(0, gross - retention - advanceRec);
  const halfGstRate = gstPct / 2 / 100;
  const cgst = Math.round(netWorkDone * halfGstRate);
  const sgst = Math.round(netWorkDone * halfGstRate);
  const totalInvoice = netWorkDone + cgst + sgst;

  // Statutory Deductions: 2% IT TDS u/s 194C on Net Work Done
  const itTds = Math.round(netWorkDone * 0.02);
  // 2% GST TDS u/s 51 (1% CGST + 1% SGST) if government/public authority
  const gstTds = isGovtGstTds ? Math.round(netWorkDone * 0.02) : 0;
  const netReceivable = totalInvoice - itTds - gstTds;

  // 70% RERA Escrow requirement on net realizations
  const rera70Pct = Math.round(netReceivable * 0.70);

  return {
    retention,
    netWorkDone,
    cgst,
    sgst,
    totalInvoice,
    itTds,
    gstTds,
    netReceivable,
    rera70Pct,
  };
}

function normalizeClientBill(d: any): ClientBillingRecord {
  const gross = Number(d?.gross_certified_inr ?? 0);
  const retPct = Number(d?.client_retention_pct ?? 5.0);
  const advRec = Number(d?.advance_recovery_inr ?? 0);
  const gstRate = Number(d?.gst_rate_pct ?? 18.0);
  const hasGstTds = Number(d?.gst_tds_sec51_inr ?? 0) > 0;

  const calc = computeInvoiceFinancials(gross, retPct, advRec, gstRate, hasGstTds);

  return {
    id: d?.id ?? `cb-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    invoice_number: d?.invoice_number ?? `INV-${Date.now().toString().slice(-4)}`,
    client_name: d?.client_name ?? "Principal Employer / Master Developer",
    client_gstin: d?.client_gstin ?? "09AAACG1234F1Z5",
    contract_agreement_ref: d?.contract_agreement_ref ?? "CA-01",
    billing_period_start: d?.billing_period_start ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    billing_period_end: d?.billing_period_end ?? new Date().toISOString().slice(0, 10),
    milestone_title: d?.milestone_title ?? "Level 08 Structural Core & Deck Slab Casting Milestone",
    work_scope_description: d?.work_scope_description ?? "Supply, fabrication and casting of RCC superstructure elements.",
    gross_certified_inr: gross,
    client_retention_pct: retPct,
    client_retention_inr: Number(d?.client_retention_inr ?? calc.retention),
    advance_recovery_inr: advRec,
    net_work_done_inr: Number(d?.net_work_done_inr ?? calc.netWorkDone),
    gst_rate_pct: gstRate,
    cgst_amount_inr: Number(d?.cgst_amount_inr ?? calc.cgst),
    sgst_amount_inr: Number(d?.sgst_amount_inr ?? calc.sgst),
    total_invoice_with_gst_inr: Number(d?.total_invoice_with_gst_inr ?? calc.totalInvoice),
    it_tds_194c_inr: Number(d?.it_tds_194c_inr ?? calc.itTds),
    gst_tds_sec51_inr: Number(d?.gst_tds_sec51_inr ?? calc.gstTds),
    net_receivable_inr: Number(d?.net_receivable_inr ?? calc.netReceivable),
    amount_received_inr: Number(d?.amount_received_inr ?? 0),
    rera_70pct_escrow_deposit_inr: Number(d?.rera_70pct_escrow_deposit_inr ?? calc.rera70Pct),
    rera_escrow_account_ref: d?.rera_escrow_account_ref ?? "SBI-RERA-ESCROW-8812",
    rera_deposit_utr: d?.rera_deposit_utr ?? null,
    rera_escrow_status: (d?.rera_escrow_status as ReraEscrowStatus) ?? "PENDING_70PCT_TRANSFER",
    status: (d?.status as ClientBillStage) ?? "DRAFT_APPLICATION",
    client_representative_name: d?.client_representative_name ?? null,
    seor_certifier_name: d?.seor_certifier_name ?? null,
    certified_at: d?.certified_at ?? null,
    payment_received_at: d?.payment_received_at ?? null,
    audit_remarks: d?.audit_remarks ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalClientBillingPage() {
  const { project, role, tier } = useActiveRole();
  const [invoices, setInvoices] = useState<ClientBillingRecord[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<ClientBillingRecord | null>(null);
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

  // Form State for Raising Client Invoice / IPC Claim
  const [invNo, setInvNo] = useState(`IPC-CLIENT-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-0${Math.floor(1 + Math.random() * 9)}`);
  const [clientName, setClientName] = useState(
    tier === "RESIDENTIAL" ? "Private Villa Owner / Client" : "Omaxe Infrastructure & Realty Developers Ltd"
  );
  const [gstin, setGstin] = useState(tier === "RESIDENTIAL" ? "URP-UNREGISTERED" : "09AAACG8812F1Z4");
  const [caRef, setCaRef] = useState(tier === "RESIDENTIAL" ? "CA-RES-FITOUT-01" : "CA-TWR-EPC-2026");
  const [milestone, setMilestone] = useState(
    tier === "RESIDENTIAL"
      ? "Milestone #03: Complete Wardrobe Carcass Installation & Master Bath Stone Cladding"
      : "Milestone #04: Level 08 Structural Core Wall & Post-Tensioned Deck Slab Casting"
  );
  const [scopeDesc, setScopeDesc] = useState(
    tier === "RESIDENTIAL"
      ? "Turnkey interior joinery, HDHMR modular wardrobes, and PU lacquer finish per approved drawing pack."
      : "Providing and casting M40 grade concrete, Fe500D rebar tying, and PT duct profiling."
  );
  const [grossClaim, setGrossClaim] = useState<number>(tier === "RESIDENTIAL" ? 850000 : 18500000);
  const [retentionPct, setRetentionPct] = useState<number>(5.0);
  const [advRec, setAdvRec] = useState<number>(tier === "RESIDENTIAL" ? 0 : 1850000); // 10% advance amortization
  const [isGovtGstTds, setIsGovtGstTds] = useState(false);

  const loadClientBillingData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("client_billing_invoices")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeClientBill(d));
        setInvoices(normalized);
        if (!selectedInvoice) setSelectedInvoice(normalized[0]);
      } else {
        const defaults: ClientBillingRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeClientBill({
                  id: "cb-res-01",
                  project_id: projectId,
                  invoice_number: "INV-RES-2026-01",
                  client_name: "Mr. Vikramaditya Rathore (Villa Owner)",
                  client_gstin: "URP-UNREGISTERED",
                  contract_agreement_ref: "CA-RES-FITOUT-01",
                  billing_period_start: "2026-08-01",
                  billing_period_end: "2026-08-31",
                  milestone_title: "Milestone #02: Electrical First-Fix & Ceiling Framing Sign-Off",
                  work_scope_description: "Conduit routing, concealed wiring boxes, and false ceiling galvanized iron grid installation.",
                  gross_certified_inr: 650000,
                  client_retention_pct: 5.0,
                  client_retention_inr: 32500,
                  advance_recovery_inr: 0,
                  net_work_done_inr: 617500,
                  gst_rate_pct: 18.0,
                  cgst_amount_inr: 55575,
                  sgst_amount_inr: 55575,
                  total_invoice_with_gst_inr: 728650,
                  it_tds_194c_inr: 0,
                  gst_tds_sec51_inr: 0,
                  net_receivable_inr: 728650,
                  amount_received_inr: 728650,
                  rera_70pct_escrow_deposit_inr: 0,
                  rera_escrow_status: "EXEMPT_RESIDENTIAL_NON_COMMERCIAL",
                  status: "PAYMENT_RECEIVED",
                  seor_certifier_name: "Principal Architect",
                  certified_at: "2026-09-02T10:00:00Z",
                  payment_received_at: "2026-09-05T14:30:00Z",
                  audit_remarks: "Client payment received via NEFT. Excluded from RERA commercial escrow mandates.",
                }),
              ]
            : [
                normalizeClientBill({
                  id: "cb-twr-01",
                  project_id: projectId,
                  invoice_number: "IPC-TWR-EPC-03",
                  client_name: "Omaxe Realty Developers Ltd",
                  client_gstin: "09AAACG8812F1Z4",
                  contract_agreement_ref: "CA-TWR-EPC-2026",
                  billing_period_start: "2026-07-01",
                  billing_period_end: "2026-07-31",
                  milestone_title: "Milestone #03: Level 06 Superstructure Slab Completion",
                  work_scope_description: "RCC M40 framing, reinforcement placement, and concrete core wall completion.",
                  gross_certified_inr: 16500000,
                  client_retention_pct: 5.0,
                  client_retention_inr: 825000,
                  advance_recovery_inr: 1650000,
                  net_work_done_inr: 14025000,
                  gst_rate_pct: 18.0,
                  cgst_amount_inr: 1262250,
                  sgst_amount_inr: 1262250,
                  total_invoice_with_gst_inr: 16549500,
                  it_tds_194c_inr: 280500,
                  gst_tds_sec51_inr: 0,
                  net_receivable_inr: 16269000,
                  amount_received_inr: 16269000,
                  rera_70pct_escrow_deposit_inr: 11388300,
                  rera_escrow_account_ref: "SBI-CAG-RERA-99412",
                  rera_deposit_utr: "SBIN88210499124",
                  rera_escrow_status: "ESCROW_DEPOSIT_VERIFIED",
                  status: "RERA_ESCROW_RECONCILED",
                  client_representative_name: "Chief Project Engineer (Omaxe)",
                  seor_certifier_name: "Resident SEOR",
                  certified_at: "2026-08-05T11:00:00Z",
                  payment_received_at: "2026-08-15T16:00:00Z",
                  audit_remarks: "100% certified by client PM. 70% RERA escrow transferred to designated SBI account.",
                }),
                normalizeClientBill({
                  id: "cb-twr-02",
                  project_id: projectId,
                  invoice_number: "IPC-TWR-EPC-04",
                  client_name: "Omaxe Realty Developers Ltd",
                  client_gstin: "09AAACG8812F1Z4",
                  contract_agreement_ref: "CA-TWR-EPC-2026",
                  billing_period_start: "2026-08-01",
                  billing_period_end: "2026-08-31",
                  milestone_title: "Milestone #04: Level 08 Structural Core Wall & Post-Tensioned Slab",
                  work_scope_description: "Post-tensioned deck slab casting, shear wall rebar, and lift shaft concrete.",
                  gross_certified_inr: 18500000,
                  client_retention_pct: 5.0,
                  client_retention_inr: 925000,
                  advance_recovery_inr: 1850000,
                  net_work_done_inr: 15725000,
                  gst_rate_pct: 18.0,
                  cgst_amount_inr: 1415250,
                  sgst_amount_inr: 1415250,
                  total_invoice_with_gst_inr: 18555500,
                  it_tds_194c_inr: 314500,
                  gst_tds_sec51_inr: 0,
                  net_receivable_inr: 18241000,
                  amount_received_inr: 0,
                  rera_70pct_escrow_deposit_inr: 12768700,
                  rera_escrow_account_ref: "SBI-CAG-RERA-99412",
                  rera_escrow_status: "PENDING_70PCT_TRANSFER",
                  status: "TAX_INVOICE_SUBMITTED",
                  seor_certifier_name: "Resident SEOR",
                  certified_at: "2026-09-08T15:30:00Z",
                  audit_remarks: "Tax invoice submitted under Section 31 CGST Act. Awaiting client treasury release.",
                }),
              ];

        setInvoices(defaults);
        if (!selectedInvoice) setSelectedInvoice(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedInvoice, tier]);

  useEffect(() => {
    void loadClientBillingData();

    const channel = supabase
      .channel(`client_billing_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_billing_invoices" }, () => void loadClientBillingData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadClientBillingData]);

  const summary = useMemo(() => {
    const totalInvoices = invoices.length;
    const totalBilledWithGst = invoices.reduce((sum, inv) => sum + Number(inv.total_invoice_with_gst_inr || 0), 0);
    const totalReceivedInr = invoices.reduce((sum, inv) => sum + Number(inv.amount_received_inr || 0), 0);
    const pendingReceivablesInr = invoices
      .filter((inv) => inv.status !== "PAYMENT_RECEIVED" && inv.status !== "RERA_ESCROW_RECONCILED")
      .reduce((sum, inv) => sum + Number(inv.net_receivable_inr || 0), 0);
    const reraEscrowSecuredInr = invoices
      .filter((inv) => inv.rera_escrow_status === "ESCROW_DEPOSIT_VERIFIED")
      .reduce((sum, inv) => sum + Number(inv.rera_70pct_escrow_deposit_inr || 0), 0);

    return { totalInvoices, totalBilledWithGst, totalReceivedInr, pendingReceivablesInr, reraEscrowSecuredInr };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchStatus = filterStatus === "ALL" || inv.status === filterStatus;
      const haystack = `${inv.invoice_number} ${inv.client_name} ${inv.milestone_title}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [invoices, filterStatus, search]);

  // Stage 1: SEOR Endorsement / Milestone Certification
  const handleCertifyIpc = async (inv: ClientBillingRecord) => {
    if (!isFinanceOrDirector) return;
    setActionInProgress(`cert_${inv.id}`);

    const updatePayload: Partial<ClientBillingRecord> = {
      status: "TAX_INVOICE_SUBMITTED",
      seor_certifier_name: roleLabel || "Resident SEOR",
      certified_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("client_billing_invoices")
        .update(updatePayload)
        .eq("id", inv.id);
    } catch {
      // Local optimistic update
    }

    setInvoices((prev) =>
      prev.map((item) => (item.id === inv.id ? ({ ...item, ...updatePayload } as ClientBillingRecord) : item))
    );
    if (selectedInvoice && selectedInvoice.id === inv.id) {
      setSelectedInvoice((prev) => (prev ? ({ ...prev, ...updatePayload } as ClientBillingRecord) : null));
    }

    setFeedbackMessage(`Invoice ${inv.invoice_number} certified under FIDIC 14.3. GST Tax Invoice submitted to Client.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Stage 2: Reconcile Realization & 70% RERA Escrow Transfer
  const handleReconcileEscrow = async (inv: ClientBillingRecord) => {
    if (!isFinanceOrDirector) return;
    setActionInProgress(`escrow_${inv.id}`);

    const utrCode = `CMS-RERA-${Date.now().toString().slice(-6)}`;
    const updatePayload: Partial<ClientBillingRecord> = {
      amount_received_inr: inv.net_receivable_inr,
      payment_received_at: new Date().toISOString(),
      rera_deposit_utr: utrCode,
      rera_escrow_status: "ESCROW_DEPOSIT_VERIFIED",
      status: "RERA_ESCROW_RECONCILED",
    };

    try {
      await (supabase as any)
        .from("client_billing_invoices")
        .update(updatePayload)
        .eq("id", inv.id);
    } catch {
      // Local optimistic update
    }

    setInvoices((prev) =>
      prev.map((item) => (item.id === inv.id ? ({ ...item, ...updatePayload } as ClientBillingRecord) : item))
    );
    if (selectedInvoice && selectedInvoice.id === inv.id) {
      setSelectedInvoice((prev) => (prev ? ({ ...prev, ...updatePayload } as ClientBillingRecord) : null));
    }

    setFeedbackMessage(`Payment of ${formatInr(inv.net_receivable_inr)} reconciled. 70% RERA Escrow (${formatInr(inv.rera_70pct_escrow_deposit_inr)}) deposited.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Create New Client Billing Application
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_inv");

    const calc = computeInvoiceFinancials(
      Number(grossClaim),
      Number(retentionPct),
      Number(advRec),
      18.0,
      isGovtGstTds
    );

    const isResidential = tier === "RESIDENTIAL";

    const newDbRecord: Omit<ClientBillingRecord, "id"> = {
      project_id: projectId,
      invoice_number: invNo.trim(),
      client_name: clientName.trim(),
      client_gstin: gstin.trim(),
      contract_agreement_ref: caRef.trim(),
      billing_period_start: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
      billing_period_end: new Date().toISOString().slice(0, 10),
      milestone_title: milestone.trim(),
      work_scope_description: scopeDesc.trim(),
      gross_certified_inr: Number(grossClaim),
      client_retention_pct: Number(retentionPct),
      client_retention_inr: calc.retention,
      advance_recovery_inr: Number(advRec),
      net_work_done_inr: calc.netWorkDone,
      gst_rate_pct: 18.0,
      cgst_amount_inr: calc.cgst,
      sgst_amount_inr: calc.sgst,
      total_invoice_with_gst_inr: calc.totalInvoice,
      it_tds_194c_inr: isResidential ? 0 : calc.itTds,
      gst_tds_sec51_inr: calc.gstTds,
      net_receivable_inr: isResidential ? calc.totalInvoice : calc.netReceivable,
      amount_received_inr: 0,
      rera_70pct_escrow_deposit_inr: isResidential ? 0 : calc.rera70Pct,
      rera_escrow_account_ref: isResidential ? null : "SBI-CAG-RERA-99412",
      rera_escrow_status: isResidential ? "EXEMPT_RESIDENTIAL_NON_COMMERCIAL" : "PENDING_70PCT_TRANSFER",
      status: "DRAFT_APPLICATION",
      audit_remarks: "Upstream milestone billing claim prepared for engineer endorsement.",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("client_billing_invoices")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeClientBill(data);
        setInvoices((prev) => [normalized, ...prev]);
        setSelectedInvoice(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeClientBill({ ...newDbRecord, id: `cb-${Date.now()}` });
      setInvoices((prev) => [fallback, ...prev]);
      setSelectedInvoice(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory GST Tax Invoice & Client IPC Print (Section 31 CGST Act & RERA Form 3)
  const handlePrintTaxInvoice = (inv: ClientBillingRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>GST Tax Invoice &amp; Client IPC (Section 31 CGST Act / RERA Form 3) — ${inv.invoice_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .reconciled { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .submitted { background: #e0f2fe; color: #0369a1; border: 1px solid #0284c7; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · Section 31 CGST Act 2017 / FIDIC Cl. 14.3 IPC</div>
      <h1 class="title">GST Tax Invoice &amp; Client Interim Payment Certificate</h1>
      <div class="meta">Invoice No: ${inv.invoice_number} · Billing Period: ${inv.billing_period_start} to ${inv.billing_period_end} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${inv.status === "RERA_ESCROW_RECONCILED" || inv.status === "PAYMENT_RECEIVED" ? "reconciled" : "submitted"}">${inv.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Client / Master Developer</th><td><strong>${inv.client_name}</strong></td><th>Client GSTIN</th><td><code>${inv.client_gstin || "URP"}</code></td></tr>
    <tr><th>Contract Agreement Ref</th><td><strong>${inv.contract_agreement_ref}</strong></td><th>Service Accounting Code</th><td><strong>SAC 9954 (Civil Construction Services)</strong></td></tr>
    <tr><th>Milestone Title</th><td colspan="3"><strong>${inv.milestone_title}</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Factual Scope of Certified Works</div>
    <div>${inv.work_scope_description}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Milestone Accounting &amp; Statutory Breakdown</th>
        <th>Contractual Schedule Reference</th>
        <th class="tar">Amount (INR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Gross Value of Work Executed (Milestone Valuation)</td>
        <td>Jointly verified with Client PM</td>
        <td class="tar font-bold">₹${inv.gross_certified_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>2. Less: Client Retention Deductions (${inv.client_retention_pct}%)</td>
        <td>Contract Escrow Retention</td>
        <td class="tar" style="color: #b91c1c;">-₹${inv.client_retention_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>3. Less: Mobilization Advance Recovery Amortization</td>
        <td>Pro-rata advance recovery schedule</td>
        <td class="tar" style="color: #b91c1c;">-₹${inv.advance_recovery_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr class="total-row">
        <td><strong>4. Net Taxable Value of Construction Services</strong></td>
        <td>Taxable Supply Base</td>
        <td class="tar font-bold" style="color: #0369a1;">₹${inv.net_work_done_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>5. Central GST (CGST @ 9.0%)</td>
        <td>Section 9 CGST Act</td>
        <td class="tar">₹${inv.cgst_amount_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>6. State GST (SGST @ 9.0%)</td>
        <td>Section 9 SGST Act</td>
        <td class="tar">₹${inv.sgst_amount_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr class="total-row" style="background: #e0f2fe;">
        <td><strong>7. TOTAL GROSS INVOICE VALUE (WITH 18% GST)</strong></td>
        <td>Gross Receivable</td>
        <td class="tar font-bold" style="font-size: 13px; color: #0369a1;">₹${inv.total_invoice_with_gst_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>8. Less: Income Tax TDS u/s 194C (2.0%)</td>
        <td>Form 26AS Tax Credit</td>
        <td class="tar" style="color: #b91c1c;">-₹${inv.it_tds_194c_inr.toLocaleString("en-IN")}</td>
      </tr>
      ${inv.gst_tds_sec51_inr > 0 ? `
      <tr>
        <td>9. Less: GST TDS u/s 51 (2.0%)</td>
        <td>GSTR-7 Return Credit</td>
        <td class="tar" style="color: #b91c1c;">-₹${inv.gst_tds_sec51_inr.toLocaleString("en-IN")}</td>
      </tr>` : ""}
      <tr class="total-row" style="background: #dcfce7;">
        <td><strong>NET PAYABLE RECEIVABLE BY GENERAL CONTRACTOR</strong></td>
        <td>Net Inflow</td>
        <td class="tar font-bold" style="font-size: 14px; color: #15803d;">₹${inv.net_receivable_inr.toLocaleString("en-IN")}</td>
      </tr>
    </tbody>
  </table>

  ${inv.rera_70pct_escrow_deposit_inr > 0 ? `
  <div class="box" style="background: #f0fdf4; border-color: #86efac; margin-top: 14px;">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #166534; margin-bottom: 4px;">
      RERA Section 4(2)(l)(D) Mandatory 70% Project Escrow Compliance
    </div>
    <div style="font-size: 11px; color: #14532d;">
      Out of the net realization, <strong>₹${inv.rera_70pct_escrow_deposit_inr.toLocaleString("en-IN")} (70%)</strong> is mandatorily deposited in Designated Project Escrow Account <strong>${inv.rera_escrow_account_ref || "SBI RERA Escrow"}</strong> (UTR: ${inv.rera_deposit_utr || "Verified on Realization"}) for construction expenses.
    </div>
  </div>` : ""}

  <div class="footer">
    <div>
      <div>Lead Quantity Surveyor</div>
      <div style="color: #64748b;">Milestone Measurements Audited</div>
      <div class="sig">QS Signatory Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">${inv.seor_certifier_name || "FIDIC Cl. 14.3 Certified"}</div>
      <div class="sig">Engineer Certification Seal</div>
    </div>
    <div>
      <div>Client Authorized Signatory</div>
      <div style="color: #64748b;">${inv.client_representative_name || inv.client_name}</div>
      <div class="sig">Client Payment Sanction</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedInvoice) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING EMPLOYER / CLIENT BILLING &amp; RERA ESCROW ENGINE...
      </div>
    );
  }

  const isReconciled = selectedInvoice.status === "RERA_ESCROW_RECONCILED" || selectedInvoice.status === "PAYMENT_RECEIVED";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Financial Inflows · Section 31 CGST Act / RERA Section 4(2)(l)(D) / FIDIC 14.3</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Employer / Client Billing &amp; RERA 70% Escrow Collection
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Upstream commercial invoicing clearinghouse. Certifies project milestones under FIDIC 14.3, issues GST tax invoices under Section 31, reconciles client retention and IT TDS u/s 194C, and enforces statutory 70% RERA bank escrow deposits.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintTaxInvoice(selectedInvoice)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print GST Invoice</span>
            </button>
            <Link
              href="/finance/ra-bills"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Receipt className="w-3.5 h-3.5 text-cyan-400" />
              <span>Subcontractor RA Bills</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setInvNo(`IPC-CLIENT-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-0${invoices.length + 1}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Raise Client Invoice</span>
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
              <span>Total Client Inflows Collected</span>
              <Coins className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {formatInr(summary.totalReceivedInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Net realizations across milestones</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>RERA 70% Escrow Secured</span>
              <Landmark className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-cyan-300 mt-2">
              {formatInr(summary.reraEscrowSecuredInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Section 4(2)(l)(D) escrow verified</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Pending Client Realization</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.pendingReceivablesInr > 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {formatInr(summary.pendingReceivablesInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Submitted tax invoices awaiting release</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Gross Tax Invoicing (with GST)</span>
              <Receipt className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {formatInr(summary.totalBilledWithGst)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">{summary.totalInvoices} GST tax invoices billed</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Invoices (${invoices.length})` },
              { key: "RERA_ESCROW_RECONCILED", label: "Escrow Reconciled" },
              { key: "PAYMENT_RECEIVED", label: "Paid" },
              { key: "TAX_INVOICE_SUBMITTED", label: "Submitted" },
              { key: "DRAFT_APPLICATION", label: "Draft" },
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
              placeholder="Search invoice, client, milestone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: INVOICES ROSTER (5 cols) vs FINANCIAL BREAKDOWN & RERA DESK (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: INVOICES LISTING (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Upstream IPC Master
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Client Billing Invoices</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredInvoices.length} Invoices</span>
            </div>

            <div className="space-y-3">
              {filteredInvoices.map((inv) => {
                const isSelected = selectedInvoice.id === inv.id;
                const isPaid = inv.status === "PAYMENT_RECEIVED" || inv.status === "RERA_ESCROW_RECONCILED";

                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {inv.invoice_number}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isPaid
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : inv.status === "TAX_INVOICE_SUBMITTED"
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {inv.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-emerald-400">
                          {formatInr(inv.total_invoice_with_gst_inr)}
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Net: {formatInr(inv.net_receivable_inr)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{inv.milestone_title}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        Client: <strong className="text-zinc-200">{inv.client_name}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Gross Work: <strong className="text-zinc-300">{formatInr(inv.gross_certified_inr)}</strong></span>
                      <span>RERA Escrow: <strong className={inv.rera_escrow_status === "ESCROW_DEPOSIT_VERIFIED" ? "text-emerald-400" : "text-amber-400"}>{inv.rera_escrow_status === "ESCROW_DEPOSIT_VERIFIED" ? "Verified" : "Pending"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: FINANCIAL WATERFALL & RERA ESCROW CLEARING DESK (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Section 31 Tax Invoice &amp; IPC Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedInvoice.invoice_number} &mdash; {selectedInvoice.milestone_title}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isReconciled
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
              }`}>
                {selectedInvoice.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-zinc-500 block">Client Entity:</span>
                  <strong className="text-white block mt-0.5 font-sans">{selectedInvoice.client_name}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">Client GSTIN:</span>
                  <span className="text-cyan-300 font-bold block mt-0.5 font-mono">{selectedInvoice.client_gstin || "URP"}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Contract Ref:</span>
                  <span className="text-white font-bold">{selectedInvoice.contract_agreement_ref}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Billing Period:</span>
                  <span className="text-zinc-200">{selectedInvoice.billing_period_start} &rarr; {selectedInvoice.billing_period_end}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">SAC Code:</span>
                  <span className="text-zinc-200">9954 (Civil Construction)</span>
                </div>
              </div>
            </div>

            {/* FINANCIAL WATERFALL: GROSS -> RETENTION -> GST -> TDS -> NET */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Commercial Milestone Accounting &amp; Deductions:
              </span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Gross Certified Milestone Valuation:</span>
                  <span className="text-white font-bold">{formatInr(selectedInvoice.gross_certified_inr)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Less: Client Retention ({selectedInvoice.client_retention_pct}%):</span>
                  <span className="text-rose-400 font-bold">-{formatInr(selectedInvoice.client_retention_inr)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Less: Mobilization Advance Amortization:</span>
                  <span className="text-rose-400 font-bold">-{formatInr(selectedInvoice.advance_recovery_inr)}</span>
                </div>
                <div className="flex justify-between text-cyan-300 font-bold pt-1 border-t border-zinc-800">
                  <span>Net Taxable Supply Value:</span>
                  <span>{formatInr(selectedInvoice.net_work_done_inr)}</span>
                </div>

                <div className="pt-1.5 border-t border-zinc-800 space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>CGST (9.0%):</span>
                    <span className="text-zinc-200">{formatInr(selectedInvoice.cgst_amount_inr)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>SGST (9.0%):</span>
                    <span className="text-zinc-200">{formatInr(selectedInvoice.sgst_amount_inr)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-zinc-800">
                    <span>Total Gross Tax Invoice Value (with 18% GST):</span>
                    <span>{formatInr(selectedInvoice.total_invoice_with_gst_inr)}</span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-zinc-800 space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Less: Income Tax TDS u/s 194C (2.0%):</span>
                    <span className="text-rose-400">-{formatInr(selectedInvoice.it_tds_194c_inr)}</span>
                  </div>
                  {selectedInvoice.gst_tds_sec51_inr > 0 && (
                    <div className="flex justify-between text-zinc-400">
                      <span>Less: GST TDS u/s 51 (2.0%):</span>
                      <span className="text-rose-400">-{formatInr(selectedInvoice.gst_tds_sec51_inr)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-emerald-400 font-extrabold text-sm pt-1.5 border-t border-zinc-800">
                    <span>Net Client Cash Receivable:</span>
                    <span>{formatInr(selectedInvoice.net_receivable_inr)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RERA SECTION 4(2)(l)(D) 70% ESCROW COMPLIANCE BOX */}
            {selectedInvoice.rera_70pct_escrow_deposit_inr > 0 && (
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 font-mono text-xs space-y-1.5">
                <div className="flex items-center justify-between text-cyan-300 font-bold">
                  <span>RERA Section 4(2)(l)(D) Mandatory 70% Escrow Gate</span>
                  <Landmark className="w-4 h-4" />
                </div>
                <div className="flex justify-between text-[11px] text-zinc-300 pt-1">
                  <span>Mandatory 70% Project Construction Deposit:</span>
                  <strong className="text-emerald-400 font-bold">{formatInr(selectedInvoice.rera_70pct_escrow_deposit_inr)}</strong>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800">
                  <span>Designated Escrow Account: <strong>{selectedInvoice.rera_escrow_account_ref || "SBI RERA Escrow"}</strong></span>
                  <span>UTR: <strong className={selectedInvoice.rera_deposit_utr ? "text-emerald-400" : "text-amber-400"}>{selectedInvoice.rera_deposit_utr || "Pending Realization"}</strong></span>
                </div>
              </div>
            )}

            {/* ACTIONS: CERTIFY & RECONCILE ESCROW */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Upstream Certification Actions:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Action 1: SEOR Certifies IPC & Issues Tax Invoice */}
                {selectedInvoice.status === "DRAFT_APPLICATION" && (
                  <button
                    type="button"
                    disabled={!isFinanceOrDirector || actionInProgress === `cert_${selectedInvoice.id}`}
                    onClick={() => handleCertifyIpc(selectedInvoice)}
                    className="py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono disabled:opacity-50"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>Certify IPC &amp; Transmit Tax Invoice</span>
                  </button>
                )}

                {/* Action 2: Reconcile Client Realization & 70% Escrow Transfer */}
                {selectedInvoice.status === "TAX_INVOICE_SUBMITTED" && (
                  <button
                    type="button"
                    disabled={!isFinanceOrDirector || actionInProgress === `escrow_${selectedInvoice.id}`}
                    onClick={() => handleReconcileEscrow(selectedInvoice)}
                    className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                  >
                    <Landmark className="w-4 h-4" />
                    <span>Reconcile Payment &amp; 70% RERA Escrow</span>
                  </button>
                )}
              </div>

              {isReconciled && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Client Realization Reconciled &amp; 70% RERA Escrow Deposited</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Realized on {selectedInvoice.payment_received_at ? new Date(selectedInvoice.payment_received_at).toLocaleDateString("en-IN") : "Today"}. UTR Ref: {selectedInvoice.rera_deposit_utr || "Verified Online"}.
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              Section 31 CGST Act &amp; RERA Section 4(2)(l)(D) Cash Flow Protocol
            </div>
          </div>

        </div>

        {/* RAISE CLIENT INVOICE MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Raise Client Milestone Tax Invoice
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

              <form onSubmit={handleCreateInvoice} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Invoice Ref No.</label>
                    <input
                      type="text"
                      required
                      value={invNo}
                      onChange={(e) => setInvNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Contract Ref</label>
                    <input
                      type="text"
                      required
                      value={caRef}
                      onChange={(e) => setCaRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Client / Developer Entity</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Client GSTIN</label>
                    <input
                      type="text"
                      required
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Gross Milestone Claim (₹)</label>
                    <input
                      type="number"
                      required
                      value={grossClaim}
                      onChange={(e) => setGrossClaim(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Milestone Title</label>
                  <input
                    type="text"
                    required
                    value={milestone}
                    onChange={(e) => setMilestone(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Retention Deduction (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={retentionPct}
                      onChange={(e) => setRetentionPct(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Advance Recovery (₹)</label>
                    <input
                      type="number"
                      required
                      value={advRec}
                      onChange={(e) => setAdvRec(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Certified Scope of Works</label>
                  <textarea
                    rows={2}
                    required
                    value={scopeDesc}
                    onChange={(e) => setScopeDesc(e.target.value)}
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
                    disabled={actionInProgress === "creating_inv"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Create Tax Invoice Claim</span>
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