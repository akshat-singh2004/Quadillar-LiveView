"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Award,
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

export type TenderStage =
  | "DRAFT_NIT"
  | "NOTICE_INVITING_TENDER_PUBLISHED"
  | "TECHNICAL_BID_EVALUATION"
  | "COMMERCIAL_CSQ_OPENED"
  | "AWARDED_LOI_ISSUED"
  | "SCRAPPED_RETENDER";

export type BidderQualificationStatus =
  | "UNDER_TECHNICAL_SCRUTINY"
  | "QUALIFIED_RESPONSIVE"
  | "TECHNICALLY_DISQUALIFIED"
  | "L1_RECOMMENDED_AWARD"
  | "AWARDED"
  | "REJECTED";

export interface TenderPackageRecord {
  id: string;
  project_id: string;
  tender_reference: string;
  trade_package: string;
  title: string;
  work_scope_description: string;
  estimated_cost_inr: number;
  earnest_money_deposit_inr: number;
  nit_publish_date: string;
  bid_submission_deadline: string;
  technical_opening_date?: string | null;
  commercial_csq_opening_date?: string | null;
  status: TenderStage;
  awarded_bidder_name?: string | null;
  awarded_value_inr?: number;
  loi_reference?: string | null;
  created_by: string;
  created_at?: string;
}

export interface TenderBidRecord {
  id: string;
  project_id: string;
  tender_reference: string;
  bidder_name: string;
  vendor_registration_no: string;
  contact_person: string;
  email?: string | null;
  phone?: string | null;
  past_experience_score: number;
  equipment_capability_score: number;
  financial_turnover_score: number;
  compliance_and_safety_score: number;
  total_technical_score: number;
  is_technically_qualified: boolean;
  commercial_bid_total_inr: number;
  variance_to_estimate_pct: number;
  rank_position: string;
  qualification_status: BidderQualificationStatus;
  emd_submitted: boolean;
  emd_instrument_ref?: string | null;
  loi_issued: boolean;
  loi_issued_at?: string | null;
  evaluation_notes?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function normalizeTenderPackage(d: any): TenderPackageRecord {
  return {
    id: d?.id ?? `tender-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    tender_reference: d?.tender_reference ?? `NIT-${Date.now().toString().slice(-4)}`,
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    title: d?.title ?? "Subcontract Work Package Tendering",
    work_scope_description: d?.work_scope_description ?? "Comprehensive execution of package per tender specifications.",
    estimated_cost_inr: Number(d?.estimated_cost_inr ?? 0),
    earnest_money_deposit_inr: Number(d?.earnest_money_deposit_inr ?? 0),
    nit_publish_date: d?.nit_publish_date ?? new Date().toISOString().slice(0, 10),
    bid_submission_deadline: d?.bid_submission_deadline ?? new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    technical_opening_date: d?.technical_opening_date ?? null,
    commercial_csq_opening_date: d?.commercial_csq_opening_date ?? null,
    status: (d?.status as TenderStage) ?? "NOTICE_INVITING_TENDER_PUBLISHED",
    awarded_bidder_name: d?.awarded_bidder_name ?? null,
    awarded_value_inr: Number(d?.awarded_value_inr ?? 0),
    loi_reference: d?.loi_reference ?? null,
    created_by: d?.created_by ?? "Tender Committee Lead",
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

function normalizeTenderBid(d: any, estimatedBase: number): TenderBidRecord {
  const commTotal = Number(d?.commercial_bid_total_inr ?? 0);
  const variance = estimatedBase > 0 ? Number((((commTotal - estimatedBase) / estimatedBase) * 100).toFixed(2)) : 0;
  const techScore = Number(d?.total_technical_score ?? 75);

  return {
    id: d?.id ?? `bid-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    tender_reference: d?.tender_reference ?? "NIT-01",
    bidder_name: d?.bidder_name ?? "Qualified Bidder",
    vendor_registration_no: d?.vendor_registration_no ?? "VEND-REG-001",
    contact_person: d?.contact_person ?? "Authorized Signatory",
    email: d?.email ?? "bids@contractor.in",
    phone: d?.phone ?? "+91 98765 43210",
    past_experience_score: Number(d?.past_experience_score ?? 25),
    equipment_capability_score: Number(d?.equipment_capability_score ?? 20),
    financial_turnover_score: Number(d?.financial_turnover_score ?? 20),
    compliance_and_safety_score: Number(d?.compliance_and_safety_score ?? 15),
    total_technical_score: techScore,
    is_technically_qualified: Boolean(d?.is_technically_qualified ?? techScore >= 70),
    commercial_bid_total_inr: commTotal,
    variance_to_estimate_pct: Number(d?.variance_to_estimate_pct ?? variance),
    rank_position: d?.rank_position ?? "L1",
    qualification_status: (d?.qualification_status as BidderQualificationStatus) ?? "QUALIFIED_RESPONSIVE",
    emd_submitted: Boolean(d?.emd_submitted ?? true),
    emd_instrument_ref: d?.emd_instrument_ref ?? "BG/EMD/2026/8912",
    loi_issued: Boolean(d?.loi_issued),
    loi_issued_at: d?.loi_issued_at ?? null,
    evaluation_notes: d?.evaluation_notes ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalTenderingPage() {
  const { project, role, tier } = useActiveRole();
  const [packages, setPackages] = useState<TenderPackageRecord[]>([]);
  const [bids, setBids] = useState<TenderBidRecord[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<TenderPackageRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Tender Committee Lead";
  const isTenderLeadOrDirector =
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "QS_BILLING_HEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleLabel.includes("Director") ||
    roleLabel.includes("Tender") ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("Surveyor") ||
    roleLabel.includes("Lead");

  // Form State for Proposing New Tender Package (NIT)
  const [nitCode, setNitCode] = useState(`NIT-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-0${Math.floor(1 + Math.random() * 9)}`);
  const [pkgTitle, setPkgTitle] = useState(
    tier === "RESIDENTIAL"
      ? "Turnkey Joinery, Modular Wardrobes & Premium Fluted Wall Paneling"
      : "Tower A Structural Reinforcement, Shuttering & Core Concrete Works (Levels 01-14)"
  );
  const [pkgTrade, setPkgTrade] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [pkgScope, setPkgScope] = useState(
    tier === "RESIDENTIAL"
      ? "Fabrication and installation of factory-pressed HDHMR wardrobes, Italian hardware, and lacquer finish."
      : "Complete execution of Fe500D rebar tying, M40 core concrete pours, and Doka system formwork."
  );
  const [pkgEstCost, setPkgEstCost] = useState<number>(tier === "RESIDENTIAL" ? 2850000 : 85000000);
  const [pkgEmd, setPkgEmd] = useState<number>(tier === "RESIDENTIAL" ? 57000 : 1700000); // 2% EMD

  // Form State for Submitting Bidder Price Bid
  const [bidderName, setBidderName] = useState("");
  const [vendorRegNo, setVendorRegNo] = useState("REG-UP-2026-");
  const [contactName, setContactName] = useState("Contractor Lead");
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [techScoreInput, setTechScoreInput] = useState<number>(82);

  const loadTenderingData = useCallback(async () => {
    try {
      const [{ data: pkgData }, { data: bidData }] = await Promise.all([
        (supabase as any)
          .from("procurement_tender_packages")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("procurement_tender_bids")
          .select("*")
          .eq("project_id", projectId)
          .order("commercial_bid_total_inr", { ascending: true }),
      ]);

      if (pkgData && pkgData.length > 0) {
        const normalizedPkgs = pkgData.map((d: any) => normalizeTenderPackage(d));
        setPackages(normalizedPkgs);
        if (!selectedPackage) setSelectedPackage(normalizedPkgs[0]);
      } else {
        const defaultPkgs: TenderPackageRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeTenderPackage({
                  id: "nit-res-01",
                  project_id: projectId,
                  tender_reference: "NIT-RES-2026-01",
                  trade_package: "Custom Joinery & Millwork",
                  title: "Turnkey Joinery, Modular Wardrobes & Premium Fluted Wall Paneling",
                  work_scope_description: "Turnkey fabrication and installation of master bedroom wardrobes, fluted wall cladding, and hardware.",
                  estimated_cost_inr: 2850000,
                  earnest_money_deposit_inr: 57000,
                  nit_publish_date: "2026-08-01",
                  bid_submission_deadline: "2026-08-15",
                  technical_opening_date: "2026-08-16",
                  commercial_csq_opening_date: "2026-08-18",
                  status: "COMMERCIAL_CSQ_OPENED",
                  created_by: "Principal Architect",
                }),
              ]
            : [
                normalizeTenderPackage({
                  id: "nit-twr-01",
                  project_id: projectId,
                  tender_reference: "NIT-TWR-2026-01",
                  trade_package: "Civil & Superstructure",
                  title: "Tower A Structural Reinforcement, Shuttering & Core Concrete Works (Levels 01-14)",
                  work_scope_description: "Execution of reinforced concrete shear cores, post-tensioned floor slabs, and column kickers.",
                  estimated_cost_inr: 85000000,
                  earnest_money_deposit_inr: 1700000,
                  nit_publish_date: "2026-03-01",
                  bid_submission_deadline: "2026-03-21",
                  technical_opening_date: "2026-03-22",
                  commercial_csq_opening_date: "2026-03-25",
                  status: "AWARDED_LOI_ISSUED",
                  awarded_bidder_name: "Narmada Concrete Works",
                  awarded_value_inr: 83200000,
                  loi_reference: "LOI-TWR-CIVIL-01",
                  created_by: "Tender Committee Lead",
                }),
              ];

        setPackages(defaultPkgs);
        if (!selectedPackage) setSelectedPackage(defaultPkgs[0]);
      }

      if (bidData && bidData.length > 0) {
        const estCost = selectedPackage?.estimated_cost_inr || 85000000;
        setBids(bidData.map((d: any) => normalizeTenderBid(d, estCost)));
      } else {
        const defaultBids: TenderBidRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeTenderBid({
                  id: "bid-res-01",
                  project_id: projectId,
                  tender_reference: "NIT-RES-2026-01",
                  bidder_name: "Royal Woodworks & Interiors",
                  vendor_registration_no: "REG-INT-9912",
                  contact_person: "V. K. Mehta (Director)",
                  total_technical_score: 92,
                  is_technically_qualified: true,
                  commercial_bid_total_inr: 2745000,
                  rank_position: "L1",
                  qualification_status: "L1_RECOMMENDED_AWARD",
                  evaluation_notes: "L1 bidder: 3.68% below estimate. High-density moisture-resistant (HDHMR) sample approved.",
                }, 2850000),
                normalizeTenderBid({
                  id: "bid-res-02",
                  project_id: projectId,
                  tender_reference: "NIT-RES-2026-01",
                  bidder_name: "Urban Modular Spaces LLP",
                  vendor_registration_no: "REG-INT-7741",
                  contact_person: "Rohit Agarwal",
                  total_technical_score: 84,
                  is_technically_qualified: true,
                  commercial_bid_total_inr: 2890000,
                  rank_position: "L2",
                  qualification_status: "QUALIFIED_RESPONSIVE",
                  evaluation_notes: "L2 bidder: 1.40% above departmental estimate.",
                }, 2850000),
                normalizeTenderBid({
                  id: "bid-res-03",
                  project_id: projectId,
                  tender_reference: "NIT-RES-2026-01",
                  bidder_name: "Elite Millworks & Decor",
                  vendor_registration_no: "REG-INT-4410",
                  contact_person: "Harpreet Singh",
                  total_technical_score: 64,
                  is_technically_qualified: false,
                  commercial_bid_total_inr: 2620000,
                  rank_position: "DQ",
                  qualification_status: "TECHNICALLY_DISQUALIFIED",
                  evaluation_notes: "Failed technical threshold (<70). Factory press machine calibration certificates missing.",
                }, 2850000),
              ]
            : [
                normalizeTenderBid({
                  id: "bid-twr-01",
                  project_id: projectId,
                  tender_reference: "NIT-TWR-2026-01",
                  bidder_name: "Narmada Concrete Works",
                  vendor_registration_no: "REG-CIVIL-0081",
                  contact_person: "R. K. Sharma (MD)",
                  total_technical_score: 94,
                  is_technically_qualified: true,
                  commercial_bid_total_inr: 83200000,
                  rank_position: "L1",
                  qualification_status: "AWARDED",
                  loi_issued: true,
                  loi_issued_at: "2026-03-28T11:00:00Z",
                  evaluation_notes: "L1 bidder: 2.12% below departmental estimate. Owns 2 twin-shaft batching plants.",
                }, 85000000),
                normalizeTenderBid({
                  id: "bid-twr-02",
                  project_id: projectId,
                  tender_reference: "NIT-TWR-2026-01",
                  bidder_name: "Apex Infra Projects Pvt Ltd",
                  vendor_registration_no: "REG-CIVIL-0044",
                  contact_person: "Sunil Nair",
                  total_technical_score: 88,
                  is_technically_qualified: true,
                  commercial_bid_total_inr: 86450000,
                  rank_position: "L2",
                  qualification_status: "QUALIFIED_RESPONSIVE",
                  evaluation_notes: "L2 bidder: 1.71% above estimate. Satisfies all plant and machinery criteria.",
                }, 85000000),
                normalizeTenderBid({
                  id: "bid-twr-03",
                  project_id: projectId,
                  tender_reference: "NIT-TWR-2026-01",
                  bidder_name: "Ganga Infrabuild Corp",
                  vendor_registration_no: "REG-CIVIL-0012",
                  contact_person: "Anand Mishra",
                  total_technical_score: 72,
                  is_technically_qualified: true,
                  commercial_bid_total_inr: 89800000,
                  rank_position: "L3",
                  qualification_status: "QUALIFIED_RESPONSIVE",
                  evaluation_notes: "L3 bidder: 5.65% above estimate.",
                }, 85000000),
              ];

        setBids(defaultBids);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedPackage, tier]);

  useEffect(() => {
    void loadTenderingData();

    const channel = supabase
      .channel(`tenders_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "procurement_tender_packages" }, () => void loadTenderingData())
      .on("postgres_changes", { event: "*", schema: "public", table: "procurement_tender_bids" }, () => void loadTenderingData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadTenderingData]);

  const currentPackageBids = useMemo(() => {
    if (!selectedPackage) return [];
    return bids.filter((b) => b.tender_reference === selectedPackage.tender_reference);
  }, [bids, selectedPackage]);

  const summary = useMemo(() => {
    const totalPackages = packages.length;
    const activeNit = packages.filter((p) => p.status === "NOTICE_INVITING_TENDER_PUBLISHED").length;
    const inCsq = packages.filter((p) => p.status === "COMMERCIAL_CSQ_OPENED").length;
    const awardedPackages = packages.filter((p) => p.status === "AWARDED_LOI_ISSUED").length;
    const totalAwardedValue = packages
      .filter((p) => p.status === "AWARDED_LOI_ISSUED")
      .reduce((sum, p) => sum + Number(p.awarded_value_inr || 0), 0);

    return { totalPackages, activeNit, inCsq, awardedPackages, totalAwardedValue };
  }, [packages]);

  const filteredPackages = useMemo(() => {
    return packages.filter((p) => {
      const matchStage = filterStage === "ALL" || p.status === filterStage;
      const haystack = `${p.tender_reference} ${p.title} ${p.trade_package}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStage && matchSearch;
    });
  }, [packages, filterStage, search]);

  // Stage 1: Issue Letter of Intent (LOI) to L1 Recommended Bidder
  const handleAwardLoi = async (pkg: TenderPackageRecord, winningBid: TenderBidRecord) => {
    if (!isTenderLeadOrDirector) return;
    setActionInProgress(`loi_${winningBid.id}`);

    const loiCode = `LOI-${winningBid.tender_reference.replace("NIT-", "")}-01`;

    const pkgUpdate: Partial<TenderPackageRecord> = {
      status: "AWARDED_LOI_ISSUED",
      awarded_bidder_name: winningBid.bidder_name,
      awarded_value_inr: winningBid.commercial_bid_total_inr,
      loi_reference: loiCode,
    };

    const bidUpdate: Partial<TenderBidRecord> = {
      qualification_status: "AWARDED",
      loi_issued: true,
      loi_issued_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("procurement_tender_packages")
        .update(pkgUpdate)
        .eq("id", pkg.id);

      await (supabase as any)
        .from("procurement_tender_bids")
        .update(bidUpdate)
        .eq("id", winningBid.id);

      // Auto-insert draft Work Order in contract_work_orders
      await (supabase as any).from("contract_work_orders").insert([
        {
          project_id: projectId,
          work_order_number: `WO-${winningBid.tender_reference.replace("NIT-", "")}`,
          contractor_name: winningBid.bidder_name,
          trade_package: pkg.trade_package,
          awarded_cost_inr: winningBid.commercial_bid_total_inr,
          status: "DRAFT_ISSUED",
          linked_tender_ref: pkg.tender_reference,
        },
      ]);
    } catch {
      // Local optimistic update
    }

    setPackages((prev) => prev.map((p) => (p.id === pkg.id ? ({ ...p, ...pkgUpdate } as TenderPackageRecord) : p)));
    setBids((prev) => prev.map((b) => (b.id === winningBid.id ? ({ ...b, ...bidUpdate } as TenderBidRecord) : b)));
    if (selectedPackage && selectedPackage.id === pkg.id) {
      setSelectedPackage((prev) => (prev ? ({ ...prev, ...pkgUpdate } as TenderPackageRecord) : null));
    }

    setFeedbackMessage(`Letter of Intent (${loiCode}) awarded to ${winningBid.bidder_name} at ${formatInr(winningBid.commercial_bid_total_inr)}.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Create New Tender Package (NIT)
  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_pkg");

    const newDbRecord: Omit<TenderPackageRecord, "id"> = {
      project_id: projectId,
      tender_reference: nitCode.trim(),
      trade_package: pkgTrade.trim(),
      title: pkgTitle.trim(),
      work_scope_description: pkgScope.trim(),
      estimated_cost_inr: Number(pkgEstCost),
      earnest_money_deposit_inr: Number(pkgEmd),
      nit_publish_date: new Date().toISOString().slice(0, 10),
      bid_submission_deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      status: "NOTICE_INVITING_TENDER_PUBLISHED",
      created_by: roleLabel || "Tender Committee Lead",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("procurement_tender_packages")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeTenderPackage(data);
        setPackages((prev) => [normalized, ...prev]);
        setSelectedPackage(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeTenderPackage({ ...newDbRecord, id: `nit-${Date.now()}` });
      setPackages((prev) => [fallback, ...prev]);
      setSelectedPackage(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Submit Bidder Quotation in Tender
  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;
    setActionInProgress("submitting_bid");

    const estCost = selectedPackage.estimated_cost_inr;
    const variance = estCost > 0 ? Number((((Number(bidAmount) - estCost) / estCost) * 100).toFixed(2)) : 0;
    const isQualified = Number(techScoreInput) >= 70;

    const newBidRecord: Omit<TenderBidRecord, "id"> = {
      project_id: projectId,
      tender_reference: selectedPackage.tender_reference,
      bidder_name: bidderName.trim(),
      vendor_registration_no: vendorRegNo.trim(),
      contact_person: contactName.trim(),
      past_experience_score: Math.round(Number(techScoreInput) * 0.3),
      equipment_capability_score: Math.round(Number(techScoreInput) * 0.25),
      financial_turnover_score: Math.round(Number(techScoreInput) * 0.25),
      compliance_and_safety_score: Math.round(Number(techScoreInput) * 0.2),
      total_technical_score: Number(techScoreInput),
      is_technically_qualified: isQualified,
      commercial_bid_total_inr: Number(bidAmount),
      variance_to_estimate_pct: variance,
      rank_position: "L1",
      qualification_status: isQualified ? "QUALIFIED_RESPONSIVE" : "TECHNICALLY_DISQUALIFIED",
      emd_submitted: true,
      emd_instrument_ref: `BG/EMD/${Date.now().toString().slice(-4)}`,
      loi_issued: false,
      evaluation_notes: isQualified ? "Bidder compliant with pre-qualification charter." : "Technical score below 70 threshold.",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("procurement_tender_bids")
        .insert([newBidRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeTenderBid(data, estCost);
        setBids((prev) => [...prev, normalized]);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeTenderBid({ ...newBidRecord, id: `bid-${Date.now()}` }, estCost);
      setBids((prev) => [...prev, fallback]);
    }

    setBidModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory CPWD Form 15 / Comparative Statement of Quotations (CSQ) Print
  const handlePrintCsqDocket = (pkg: TenderPackageRecord, pkgBids: TenderBidRecord[]) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Comparative Statement of Quotations (CPWD Form 15) — ${pkg.tender_reference}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .awarded { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .csq { background: #e0f2fe; color: #0369a1; border: 1px solid #0284c7; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD Works Manual Section 16 / Form 15 CSQ</div>
      <h1 class="title">Comparative Statement of Quotations &amp; Tender Scrutiny Note</h1>
      <div class="meta">Tender Ref: ${pkg.tender_reference} · NIT Publish Date: ${pkg.nit_publish_date} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${pkg.status === "AWARDED_LOI_ISSUED" ? "awarded" : "csq"}">${pkg.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Work Package Title</th><td><strong>${pkg.title}</strong></td><th>Trade Package</th><td><strong>${pkg.trade_package}</strong></td></tr>
    <tr><th>Departmental Estimated Cost</th><td><strong>₹${pkg.estimated_cost_inr.toLocaleString("en-IN")}</strong></td><th>Earnest Money Deposit (EMD)</th><td>₹${pkg.earnest_money_deposit_inr.toLocaleString("en-IN")} (2%)</td></tr>
    <tr><th>Awarded Subcontractor</th><td><strong>${pkg.awarded_bidder_name || "Under Tender Scrutiny"}</strong></td><th>Awarded Value (INR)</th><td><strong>${pkg.awarded_value_inr ? `₹${pkg.awarded_value_inr.toLocaleString("en-IN")}` : "In Evaluation"}</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Factual Scope of Works &amp; Technical Specifications</div>
    <div>${pkg.work_scope_description}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="tac">Rank</th>
        <th>Participating Subcontractor</th>
        <th class="tac">Tech Score</th>
        <th class="tar">Quoted Commercial Sum (INR)</th>
        <th class="tar">Variance to Estimate (%)</th>
        <th class="tac">Qualification Status</th>
      </tr>
    </thead>
    <tbody>
      ${pkgBids.map((b, idx) => `
        <tr style="background: ${b.rank_position === "L1" ? "#dcfce7" : b.is_technically_qualified ? "#ffffff" : "#fee2e2"};">
          <td class="tac font-bold">${b.is_technically_qualified ? `L${idx + 1}` : "DQ"}</td>
          <td><strong>${b.bidder_name}</strong><br><span style="color: #64748b; font-size: 10px;">Reg: ${b.vendor_registration_no} &bull; ${b.contact_person}</span></td>
          <td class="tac font-bold" style="color: ${b.is_technically_qualified ? "#15803d" : "#b91c1c"};">${b.total_technical_score}/100</td>
          <td class="tar font-bold">₹${b.commercial_bid_total_inr.toLocaleString("en-IN")}</td>
          <td class="tar font-bold" style="color: ${b.variance_to_estimate_pct < 0 ? "#15803d" : "#b91c1c"};">
            ${b.variance_to_estimate_pct > 0 ? `+${b.variance_to_estimate_pct}%` : `${b.variance_to_estimate_pct}%`}
          </td>
          <td class="tac font-bold">${b.qualification_status.replace(/_/g, " ")}</td>
        </tr>
      `).join("")}
      <tr class="total-row" style="background: #e0f2fe;">
        <td colspan="3"><strong>DEPARTMENTAL BENCHMARK ESTIMATE BASE</strong></td>
        <td class="tar font-bold" style="color: #0369a1; font-size: 12px;">₹${pkg.estimated_cost_inr.toLocaleString("en-IN")}</td>
        <td class="tar font-bold">0.00% Baseline</td>
        <td class="tac font-bold">CPWD DSR Base</td>
      </tr>
    </tbody>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Tender Committee Scrutiny &amp; Justification Finding</div>
    <div>${pkg.loi_reference ? `Letter of Intent (Ref: ${pkg.loi_reference}) authorized in favor of lowest responsive bidder ${pkg.awarded_bidder_name}. Price reasonableness benchmarked against Delhi Analysis of Rates (DAR).` : "Tender bids scrutinized under two-envelope protocol. Pre-qualification threshold set at 70 points. Commercial price bids unsealed for qualified vendors only."}</div>
  </div>

  <div class="footer">
    <div>
      <div>Tender Committee Member (QS)</div>
      <div style="color: #64748b;">Comparative Statement Verified</div>
      <div class="sig">Quantity Surveyor Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">Technical Bid Evaluation Endorsed</div>
      <div class="sig">Engineer Technical Seal</div>
    </div>
    <div>
      <div>Employer Project Director</div>
      <div style="color: #64748b;">${pkg.status === "AWARDED_LOI_ISSUED" ? "Tender Award Approved" : "Scrutiny in Progress"}</div>
      <div class="sig">Award Sanction Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedPackage) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING SUBCONTRACTOR TENDERING &amp; CSQ ENGINE...
      </div>
    );
  }

  const isAwarded = selectedPackage.status === "AWARDED_LOI_ISSUED";
  const l1Bid = currentPackageBids.find((b) => b.is_technically_qualified && (b.rank_position === "L1" || b.qualification_status === "L1_RECOMMENDED_AWARD" || b.qualification_status === "AWARDED"));

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Procurement Governance · CPWD Works Manual Section 16 / FIDIC Clause 4.4</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Subcontractor Tendering &amp; Comparative Statement (CSQ)
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Competitive bidding and subcontract award clearinghouse. Enforces technical pre-qualification scorecards, evaluates item-rate commercial bids against departmental estimates, and awards formal Letters of Intent (LOI).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintCsqDocket(selectedPackage, currentPackageBids)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form 15 CSQ</span>
            </button>
            <Link
              href="/finance/boq"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Coins className="w-3.5 h-3.5 text-cyan-400" />
              <span>Master BOQ Baselines</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setNitCode(`NIT-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-0${packages.length + 1}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Notice (NIT)</span>
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
              <span>Total Awarded Subcontracts</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {formatInr(summary.totalAwardedValue)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">{summary.awardedPackages} packages under active LOI</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>In Commercial CSQ Scrutiny</span>
              <Scale className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-cyan-300 mt-2">
              {summary.inCsq} Packages
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Evaluating L1 price deviations</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Active NIT Floating</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.activeNit > 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {summary.activeNit} Packages
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Awaiting bid submission window</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Tender Package Dockets</span>
              <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.totalPackages} Packages
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CPWD Form 15 statutory registers</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Tenders (${packages.length})` },
              { key: "COMMERCIAL_CSQ_OPENED", label: `In CSQ (${summary.inCsq})` },
              { key: "AWARDED_LOI_ISSUED", label: "Awarded (LOI)" },
              { key: "NOTICE_INVITING_TENDER_PUBLISHED", label: "NIT Floating" },
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

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search tender reference, package, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: PACKAGES ROSTER (5 cols) vs COMPARATIVE STATEMENT CSQ MATRIX (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: TENDER PACKAGES LISTING (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Notice Inviting Tenders (NIT)
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Procurement Work Packages</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredPackages.length} Packages</span>
            </div>

            <div className="space-y-3">
              {filteredPackages.map((pkg) => {
                const isSelected = selectedPackage.id === pkg.id;
                const isPkgAwarded = pkg.status === "AWARDED_LOI_ISSUED";

                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {pkg.tender_reference}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isPkgAwarded
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : pkg.status === "COMMERCIAL_CSQ_OPENED"
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {pkg.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-white">
                          {formatInr(pkg.estimated_cost_inr)}
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          EMD: {formatInr(pkg.earnest_money_deposit_inr)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{pkg.title}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        Trade: <strong className="text-zinc-200">{pkg.trade_package}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Deadline: <strong className="text-zinc-300">{pkg.bid_submission_deadline}</strong></span>
                      <span>Awarded: <strong className={pkg.awarded_bidder_name ? "text-emerald-400" : "text-zinc-400"}>{pkg.awarded_bidder_name || "In Review"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: COMPARATIVE STATEMENT OF QUOTATIONS (CSQ) MATRIX (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  CPWD Form 15 Scrutiny Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedPackage.tender_reference} &mdash; CSQ Matrix</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBidderName("");
                    setBidAmount(selectedPackage.estimated_cost_inr * 0.98);
                    setBidModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Bidder</span>
                </button>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  isAwarded
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                    : "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                }`}>
                  {selectedPackage.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Package Scope:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedPackage.work_scope_description}</strong>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Departmental Estimate:</span>
                  <span className="text-cyan-300 font-bold">{formatInr(selectedPackage.estimated_cost_inr)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Earnest Money (2%):</span>
                  <span className="text-white font-bold">{formatInr(selectedPackage.earnest_money_deposit_inr)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Submission Deadline:</span>
                  <span className="text-amber-400 font-bold">{selectedPackage.bid_submission_deadline}</span>
                </div>
              </div>
            </div>

            {/* CSQ BIDDER COMPARATIVE MATRIX */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                  Two-Envelope Evaluation Matrix:
                </span>
                <span className="text-[10px] text-zinc-400">{currentPackageBids.length} Subcontractors Participated</span>
              </div>

              <div className="space-y-2.5">
                {currentPackageBids.map((b, idx) => {
                  const isWinningL1 = b.rank_position === "L1" || b.qualification_status === "L1_RECOMMENDED_AWARD" || b.qualification_status === "AWARDED";

                  return (
                    <div
                      key={b.id}
                      className={`p-3 rounded-xl border transition space-y-2 ${
                        isWinningL1
                          ? "bg-emerald-950/30 border-emerald-800/60 shadow-md shadow-emerald-950/20"
                          : !b.is_technically_qualified
                          ? "bg-rose-950/20 border-rose-800/40"
                          : "bg-zinc-950/60 border-zinc-800"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isWinningL1
                              ? "bg-emerald-500 text-zinc-950"
                              : !b.is_technically_qualified
                              ? "bg-rose-900 text-rose-300"
                              : "bg-zinc-800 text-zinc-300"
                          }`}>
                            {b.is_technically_qualified ? `L${idx + 1}` : "DQ"}
                          </span>
                          <span className="font-bold text-white font-sans text-xs">{b.bidder_name}</span>
                          <span className="text-[10px] text-zinc-500">({b.vendor_registration_no})</span>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-xs text-white">{formatInr(b.commercial_bid_total_inr)}</span>
                          <span className={`text-[10px] ml-2 font-bold ${
                            b.variance_to_estimate_pct < 0 ? "text-emerald-400" : "text-rose-400"
                          }`}>
                            {b.variance_to_estimate_pct > 0 ? `+${b.variance_to_estimate_pct}%` : `${b.variance_to_estimate_pct}%`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1.5 border-t border-zinc-800/60">
                        <span>Technical Score: <strong className={b.is_technically_qualified ? "text-emerald-400" : "text-rose-400"}>{b.total_technical_score}/100 ({b.is_technically_qualified ? "Qualified" : "Failed Pre-Qual"})</strong></span>
                        <span>EMD Status: <strong className="text-zinc-200">{b.emd_submitted ? "Paid (BG)" : "Missing"}</strong></span>
                      </div>

                      {b.evaluation_notes && (
                        <div className="text-[10px] text-zinc-400 font-sans italic">
                          {b.evaluation_notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ACTIONS: AWARD LETTER OF INTENT (LOI) */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Tender Committee Sanction Gate:
              </span>

              {!isAwarded && l1Bid && (
                <button
                  type="button"
                  disabled={!isTenderLeadOrDirector || actionInProgress === `loi_${l1Bid.id}`}
                  onClick={() => handleAwardLoi(selectedPackage, l1Bid)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                >
                  <Award className="w-4 h-4" />
                  <span>Award Letter of Intent (LOI) to L1 Bidder: {l1Bid.bidder_name}</span>
                </button>
              )}

              {isAwarded && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Contract Awarded under LOI Ref: {selectedPackage.loi_reference}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Awarded to <strong className="text-white font-mono">{selectedPackage.awarded_bidder_name}</strong> at <strong>{formatInr(selectedPackage.awarded_value_inr || 0)}</strong>. Work Order initialized.
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD Works Manual Section 16 &amp; CVC Public Procurement Guidelines
            </div>
          </div>

        </div>

        {/* PROPOSE NEW TENDER PACKAGE MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Publish Notice Inviting Tender (NIT)
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

              <form onSubmit={handleCreatePackage} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Tender Ref Code</label>
                    <input
                      type="text"
                      required
                      value={nitCode}
                      onChange={(e) => setNitCode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Trade Package</label>
                    <input
                      type="text"
                      required
                      value={pkgTrade}
                      onChange={(e) => setPkgTrade(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Tender Package Title</label>
                  <input
                    type="text"
                    required
                    value={pkgTitle}
                    onChange={(e) => setPkgTitle(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Detailed Scope of Work</label>
                  <textarea
                    rows={2}
                    required
                    value={pkgScope}
                    onChange={(e) => setPkgScope(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Estimated Departmental Cost (₹)</label>
                    <input
                      type="number"
                      required
                      value={pkgEstCost}
                      onChange={(e) => setPkgEstCost(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Earnest Money Deposit EMD (₹)</label>
                    <input
                      type="number"
                      required
                      value={pkgEmd}
                      onChange={(e) => setPkgEmd(Number(e.target.value))}
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
                    disabled={actionInProgress === "creating_pkg"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Publish Tender Notice</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SUBMIT BIDDER QUOTATION MODAL */}
        {bidModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Record Subcontractor Tender Bid
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBidModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitBid} className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Bidder / Subcontractor Entity</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Infra Projects Pvt Ltd"
                    value={bidderName}
                    onChange={(e) => setBidderName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Vendor Registration No.</label>
                    <input
                      type="text"
                      required
                      value={vendorRegNo}
                      onChange={(e) => setVendorRegNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Authorized Contact</label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Commercial Price Bid (₹)</label>
                    <input
                      type="number"
                      required
                      value={bidAmount}
                      onChange={(e) => setBidAmount(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Technical Score (0-100)</label>
                    <input
                      type="number"
                      max="100"
                      min="0"
                      required
                      value={techScoreInput}
                      onChange={(e) => setTechScoreInput(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setBidModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === "submitting_bid"}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-emerald-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Price Bid</span>
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