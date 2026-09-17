"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Banknote,
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
  Wrench,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type ClaimCategory =
  | "TIME_EXTENSION_EOT"
  | "PROLONGATION_COSTS"
  | "EMPLOYER_DELAY_VARIATION"
  | "UNFORESEEN_PHYSICAL_CONDITIONS"
  | "LIQUIDATED_DAMAGES_LEVIED";

export type ClaimDisputeStatus =
  | "NOTICE_SUBMITTED_28D"
  | "DISALLOWED_TIME_BARRED"
  | "ENGINEER_DETERMINATION_CLAUSE_3_5"
  | "DAB_REFERRAL_84D"
  | "MUTUALLY_SETTLED"
  | "ESCALATED_ARBITRATION";

export interface ClaimDisputeRecord {
  id: string;
  project_id: string;
  claim_reference: string;
  title: string;
  work_order_ref: string;
  contractor_name: string;
  trade_package: string;
  category: ClaimCategory;
  event_occurrence_date: string;
  claim_notice_date: string;
  days_to_notice: number;
  is_time_barred: boolean;
  time_extension_claimed_days: number;
  financial_quantum_claimed_inr: number;
  engineer_assessed_eot_days: number;
  engineer_assessed_amount_inr: number;
  liquidated_damages_levied_inr: number;
  unjustified_delay_weeks: number;
  linked_hindrance_code?: string | null;
  dab_referral_date?: string | null;
  dab_decision_due_date?: string | null;
  dab_decision_summary?: string | null;
  status: ClaimDisputeStatus;
  lead_arbiter_name?: string | null;
  seor_assessor_name?: string | null;
  settled_at?: string | null;
  contemporaneous_evidence_url?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function checkFidic28DayTimeBar(eventDate: string, noticeDate: string) {
  const diffTime = Math.abs(new Date(noticeDate).getTime() - new Date(eventDate).getTime());
  const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isTimeBarred = daysDiff > 28;
  return { daysDiff, isTimeBarred };
}

function normalizeClaimRecord(d: any): ClaimDisputeRecord {
  const eventDate = d?.event_occurrence_date ?? new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10);
  const noticeDate = d?.claim_notice_date ?? new Date().toISOString().slice(0, 10);
  const tb = checkFidic28DayTimeBar(eventDate, noticeDate);

  return {
    id: d?.id ?? `claim-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    claim_reference: d?.claim_reference ?? `CLM-${Date.now().toString().slice(-4)}`,
    title: d?.title ?? "Contractual Claim for Time & Cost",
    work_order_ref: d?.work_order_ref ?? "WO-01",
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    category: (d?.category as ClaimCategory) ?? "TIME_EXTENSION_EOT",
    event_occurrence_date: eventDate,
    claim_notice_date: noticeDate,
    days_to_notice: Number(d?.days_to_notice ?? tb.daysDiff),
    is_time_barred: Boolean(d?.is_time_barred ?? tb.isTimeBarred),
    time_extension_claimed_days: Number(d?.time_extension_claimed_days ?? 0),
    financial_quantum_claimed_inr: Number(d?.financial_quantum_claimed_inr ?? 0),
    engineer_assessed_eot_days: Number(d?.engineer_assessed_eot_days ?? 0),
    engineer_assessed_amount_inr: Number(d?.engineer_assessed_amount_inr ?? 0),
    liquidated_damages_levied_inr: Number(d?.liquidated_damages_levied_inr ?? 0),
    unjustified_delay_weeks: Number(d?.unjustified_delay_weeks ?? 0),
    linked_hindrance_code: d?.linked_hindrance_code ?? null,
    dab_referral_date: d?.dab_referral_date ?? null,
    dab_decision_due_date: d?.dab_decision_due_date ?? null,
    dab_decision_summary: d?.dab_decision_summary ?? null,
    status: (d?.status as ClaimDisputeStatus) ?? (tb.isTimeBarred ? "DISALLOWED_TIME_BARRED" : "NOTICE_SUBMITTED_28D"),
    lead_arbiter_name: d?.lead_arbiter_name ?? null,
    seor_assessor_name: d?.seor_assessor_name ?? null,
    settled_at: d?.settled_at ?? null,
    contemporaneous_evidence_url: d?.contemporaneous_evidence_url ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalClaimsDisputesPage() {
  const { project, role, tier } = useActiveRole();
  const [claims, setClaims] = useState<ClaimDisputeRecord[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ClaimDisputeRecord | null>(null);
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
  const roleLabel = (role as { label?: string })?.label || "Resident SEOR";
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

  // Form State for Lodging New Claim / LD Action
  const [claimRef, setClaimRef] = useState(`CLM-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-0${Math.floor(1 + Math.random() * 9)}`);
  const [title, setTitle] = useState(
    tier === "RESIDENTIAL"
      ? "Prolongation & Idle Labour Claim due to Site Access Delay (Master Bedroom Wet Works)"
      : "FIDIC 20.1 Claim: Unforeseen Subsurface Geological Strata at Tower Foundation Piles"
  );
  const [woRef, setWoRef] = useState(tier === "RESIDENTIAL" ? "WO-RES-001" : "WO-TWR-101");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [category, setCategory] = useState<ClaimCategory>(
    tier === "RESIDENTIAL" ? "PROLONGATION_COSTS" : "UNFORESEEN_PHYSICAL_CONDITIONS"
  );
  const [eventDate, setEventDate] = useState(
    new Date(Date.now() - 18 * 86400000).toISOString().slice(0, 10)
  );
  const [noticeDate, setNoticeDate] = useState(new Date().toISOString().slice(0, 10));
  const [claimedDays, setClaimedDays] = useState<number>(tier === "RESIDENTIAL" ? 8 : 25);
  const [claimedAmount, setClaimedAmount] = useState<number>(tier === "RESIDENTIAL" ? 45000 : 1850000);
  const [hindranceCode, setHindranceCode] = useState(tier === "RESIDENTIAL" ? "HND-RES-01" : "HND-TWR-02");

  const loadClaimsData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("contract_claims_disputes")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeClaimRecord(d));
        setClaims(normalized);
        if (!selectedClaim) setSelectedClaim(normalized[0]);
      } else {
        const defaults: ClaimDisputeRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeClaimRecord({
                  id: "clm-res-01",
                  project_id: projectId,
                  claim_reference: "CLM-RES-01",
                  title: "Prolongation & Idling Gang Charges due to Delayed Tile Curing",
                  work_order_ref: "WO-RES-001",
                  contractor_name: "Royal Woodworks & Interiors",
                  trade_package: "Custom Joinery & Millwork",
                  category: "PROLONGATION_COSTS",
                  event_occurrence_date: "2026-08-20",
                  claim_notice_date: "2026-09-02",
                  days_to_notice: 13,
                  is_time_barred: false,
                  time_extension_claimed_days: 6,
                  financial_quantum_claimed_inr: 32000,
                  engineer_assessed_eot_days: 4,
                  engineer_assessed_amount_inr: 18000,
                  linked_hindrance_code: "HND-RES-01",
                  status: "ENGINEER_DETERMINATION_CLAUSE_3_5",
                  seor_assessor_name: "Principal Architect",
                }),
              ]
            : [
                normalizeClaimRecord({
                  id: "clm-twr-01",
                  project_id: projectId,
                  claim_reference: "CLM-TWR-01",
                  title: "FIDIC Cl. 20.1 & 4.12: Hard Rock Subsurface Anomaly at Foundation Raft",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  category: "UNFORESEEN_PHYSICAL_CONDITIONS",
                  event_occurrence_date: "2026-07-15",
                  claim_notice_date: "2026-08-05",
                  days_to_notice: 21,
                  is_time_barred: false,
                  time_extension_claimed_days: 28,
                  financial_quantum_claimed_inr: 3450000,
                  engineer_assessed_eot_days: 14,
                  engineer_assessed_amount_inr: 1650000,
                  linked_hindrance_code: "HND-TWR-01",
                  dab_referral_date: "2026-08-25",
                  dab_decision_due_date: "2026-11-17",
                  dab_decision_summary: "DAB 84-day hearing scheduled under FIDIC Clause 20.4.",
                  status: "DAB_REFERRAL_84D",
                  lead_arbiter_name: "Dr. K. N. Rao (Sole Adjudicator)",
                  seor_assessor_name: "Resident SEOR",
                }),
                normalizeClaimRecord({
                  id: "clm-twr-02",
                  project_id: projectId,
                  claim_reference: "LD-TWR-01",
                  title: "CPWD Clause 2 Compensation for Delay (Liquidated Damages on Milestone #02)",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  category: "LIQUIDATED_DAMAGES_LEVIED",
                  event_occurrence_date: "2026-08-01",
                  claim_notice_date: "2026-08-10",
                  days_to_notice: 9,
                  is_time_barred: false,
                  time_extension_claimed_days: 0,
                  financial_quantum_claimed_inr: 0,
                  liquidated_damages_levied_inr: 850000,
                  unjustified_delay_weeks: 2.0,
                  status: "ENGINEER_DETERMINATION_CLAUSE_3_5",
                  seor_assessor_name: "Resident SEOR",
                }),
              ];

        setClaims(defaults);
        if (!selectedClaim) setSelectedClaim(defaults[0]);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedClaim, tier]);

  useEffect(() => {
    void loadClaimsData();

    const channel = supabase
      .channel(`claims_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_claims_disputes" }, () => void loadClaimsData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadClaimsData]);

  const summary = useMemo(() => {
    const totalClaims = claims.length;
    const totalClaimedQuantum = claims.reduce((sum, c) => sum + Number(c.financial_quantum_claimed_inr || 0), 0);
    const totalLdLevied = claims.reduce((sum, c) => sum + Number(c.liquidated_damages_levied_inr || 0), 0);
    const timeBarredCount = claims.filter((c) => c.is_time_barred).length;
    const inDabCount = claims.filter((c) => c.status === "DAB_REFERRAL_84D" || c.status === "ESCALATED_ARBITRATION").length;

    return { totalClaims, totalClaimedQuantum, totalLdLevied, timeBarredCount, inDabCount };
  }, [claims]);

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const matchStatus = filterStatus === "ALL" || c.status === filterStatus;
      const matchCat = filterCategory === "ALL" || c.category === filterCategory;
      const haystack = `${c.claim_reference} ${c.title} ${c.contractor_name} ${c.work_order_ref}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchCat && matchSearch;
    });
  }, [claims, filterStatus, filterCategory, search]);

  // Stage 1: Engineer Makes Clause 3.5 / CPWD Cl. 2 Determination
  const handleEngineerDetermination = async (c: ClaimDisputeRecord) => {
    if (!isDirectorOrSeor) return;
    setActionInProgress(`det_${c.id}`);

    const assessedEot = Math.round(c.time_extension_claimed_days * 0.5);
    const assessedAmt = Math.round(c.financial_quantum_claimed_inr * 0.5);

    const updatePayload: Partial<ClaimDisputeRecord> = {
      status: "ENGINEER_DETERMINATION_CLAUSE_3_5",
      engineer_assessed_eot_days: assessedEot,
      engineer_assessed_amount_inr: assessedAmt,
      seor_assessor_name: roleLabel || "Resident SEOR",
    };

    try {
      await (supabase as any)
        .from("contract_claims_disputes")
        .update(updatePayload)
        .eq("id", c.id);
    } catch {
      // Local optimistic update
    }

    setClaims((prev) =>
      prev.map((item) => (item.id === c.id ? ({ ...item, ...updatePayload } as ClaimDisputeRecord) : item))
    );
    if (selectedClaim && selectedClaim.id === c.id) {
      setSelectedClaim((prev) => (prev ? ({ ...prev, ...updatePayload } as ClaimDisputeRecord) : null));
    }

    setFeedbackMessage(`Engineer determination signed under FIDIC 3.5: +${assessedEot} days & ${formatInr(assessedAmt)} assessed.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Stage 2: Refer Unsettled Claim to Dispute Adjudication Board (FIDIC 20.4)
  const handleReferToDab = async (c: ClaimDisputeRecord) => {
    if (!isDirectorOrSeor) return;
    setActionInProgress(`dab_${c.id}`);

    const dabDueDate = new Date(Date.now() + 84 * 86400000).toISOString().slice(0, 10);

    const updatePayload: Partial<ClaimDisputeRecord> = {
      status: "DAB_REFERRAL_84D",
      dab_referral_date: new Date().toISOString().slice(0, 10),
      dab_decision_due_date: dabDueDate,
      dab_decision_summary: "Dispute referred to DAB panel under FIDIC Clause 20.4 (84-day statutory timeline).",
    };

    try {
      await (supabase as any)
        .from("contract_claims_disputes")
        .update(updatePayload)
        .eq("id", c.id);
    } catch {
      // Local optimistic update
    }

    setClaims((prev) =>
      prev.map((item) => (item.id === c.id ? ({ ...item, ...updatePayload } as ClaimDisputeRecord) : item))
    );
    if (selectedClaim && selectedClaim.id === c.id) {
      setSelectedClaim((prev) => (prev ? ({ ...prev, ...updatePayload } as ClaimDisputeRecord) : null));
    }

    setFeedbackMessage(`Claim ${c.claim_reference} referred to DAB panel. 84-day determination timer active.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Lodge New Claim / Dispute Notice
  const handleLodgeClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_claim");

    const tb = checkFidic28DayTimeBar(eventDate, noticeDate);

    const newDbRecord: Omit<ClaimDisputeRecord, "id"> = {
      project_id: projectId,
      claim_reference: claimRef.trim(),
      title: title.trim(),
      work_order_ref: woRef.trim(),
      contractor_name: contractor.trim(),
      trade_package: tradePackage.trim(),
      category,
      event_occurrence_date: eventDate,
      claim_notice_date: noticeDate,
      days_to_notice: tb.daysDiff,
      is_time_barred: tb.isTimeBarred,
      time_extension_claimed_days: Number(claimedDays),
      financial_quantum_claimed_inr: Number(claimedAmount),
      engineer_assessed_eot_days: 0,
      engineer_assessed_amount_inr: 0,
      liquidated_damages_levied_inr: category === "LIQUIDATED_DAMAGES_LEVIED" ? Number(claimedAmount) : 0,
      unjustified_delay_weeks: 0,
      linked_hindrance_code: hindranceCode.trim() || null,
      status: tb.isTimeBarred ? "DISALLOWED_TIME_BARRED" : "NOTICE_SUBMITTED_28D",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("contract_claims_disputes")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeClaimRecord(data);
        setClaims((prev) => [normalized, ...prev]);
        setSelectedClaim(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeClaimRecord({ ...newDbRecord, id: `claim-${Date.now()}` });
      setClaims((prev) => [fallback, ...prev]);
      setSelectedClaim(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Printable Dispute Hearing & CPWD Clause 2 Statement
  const handlePrintHearingDocket = (c: ClaimDisputeRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Statutory Claim Assessment &amp; Dispute Docket — ${c.claim_reference}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .timebar { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
    .hearing { background: #e0f2fe; color: #0369a1; border: 1px solid #0284c7; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · FIDIC Red Book Clause 20.1 &amp; 20.4 / CPWD GCC Clause 2 &amp; 25</div>
      <h1 class="title">Statutory Claim Assessment &amp; Dispute Hearing Docket</h1>
      <div class="meta">Claim Reference: ${c.claim_reference} · Parent Work Order: ${c.work_order_ref} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${c.is_time_barred ? "timebar" : "hearing"}">${c.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Executing Contractor</th><td><strong>${c.contractor_name}</strong></td><th>Trade Package</th><td>${c.trade_package}</td></tr>
    <tr><th>Event Occurrence Date</th><td>${c.event_occurrence_date}</td><th>Formal Claim Notice Date</th><td>${c.claim_notice_date}</td></tr>
    <tr><th>FIDIC 20.1 Statutory Horizon</th><td><strong>${c.days_to_notice} Days</strong> to Notice (28-day Limit)</td><th>Time-Bar Determination</th><td style="font-weight: bold; color: ${c.is_time_barred ? "#b91c1c" : "#15803d"};">${c.is_time_barred ? "DISALLOWED (TIME-BARRED)" : "TIMELY NOTICE (VALID)"}</td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Claim Summary &amp; Contemporaneous Basis</div>
    <div>${c.title}</div>
    <div style="margin-top: 6px; font-size: 10px; color: #64748b;">Associated Hindrance Log: <strong>${c.linked_hindrance_code || "Direct Notice"}</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Quantum &amp; Delay Adjudication Parameter</th>
        <th class="tar">Contractor Claimed</th>
        <th class="tar">Engineer / SEOR Assessed</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Extension of Time (EOT Days)</td>
        <td class="tar font-bold">${c.time_extension_claimed_days} Days</td>
        <td class="tar font-bold" style="color: #0369a1;">${c.engineer_assessed_eot_days} Days</td>
      </tr>
      <tr>
        <td>Prolongation / Additional Cost (INR)</td>
        <td class="tar font-bold">₹${c.financial_quantum_claimed_inr.toLocaleString("en-IN")}</td>
        <td class="tar font-bold" style="color: #15803d;">₹${c.engineer_assessed_amount_inr.toLocaleString("en-IN")}</td>
      </tr>
      ${c.liquidated_damages_levied_inr > 0 ? `
      <tr style="color: #b91c1c;">
        <td>CPWD Clause 2 Liquidated Damages Levied</td>
        <td class="tar">${c.unjustified_delay_weeks} Weeks Delay</td>
        <td class="tar font-bold">₹${c.liquidated_damages_levied_inr.toLocaleString("en-IN")}</td>
      </tr>` : ""}
    </tbody>
  </table>

  ${c.dab_decision_summary ? `
  <div class="box" style="background: #e0f2fe; border-color: #0284c7;">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #0369a1; margin-bottom: 4px;">
      Dispute Adjudication Board (DAB / DRC) Determination
    </div>
    <div style="font-size: 11px; color: #0c4a6e;">
      ${c.dab_decision_summary} (Referred on ${c.dab_referral_date} &bull; Decision Due: ${c.dab_decision_due_date})
    </div>
  </div>` : ""}

  <div class="footer">
    <div>
      <div>Contractor Authorized Representative</div>
      <div style="color: #64748b;">${c.contractor_name}</div>
      <div class="sig">Contractor Claim Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Engineer</div>
      <div style="color: #64748b;">${c.seor_assessor_name || "Engineer Determination Complete"}</div>
      <div class="sig">Engineer Assessment Seal</div>
    </div>
    <div>
      <div>Sole Adjudicator / Arbitrator</div>
      <div style="color: #64748b;">${c.lead_arbiter_name || "DAB Panel Representative"}</div>
      <div class="sig">Dispute Board Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedClaim) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING CONTRACT CLAIMS &amp; DISPUTE BOARD (DAB) CLEARINGHOUSE...
      </div>
    );
  }

  const isBarred = selectedClaim.is_time_barred;
  const isDab = selectedClaim.status === "DAB_REFERRAL_84D";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Dispute Governance · FIDIC Red Book Clause 20 / CPWD GCC Clause 2 &amp; 25</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Claims, Liquidated Damages &amp; Dispute Board (DAB)
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Statutory claim adjudication and dispute clearinghouse. Enforces the strict 28-day notice time-bar under FIDIC 20.1, computes CPWD Clause 2 liquidated damages for unexcused delays, and manages 84-day Dispute Board decisions.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintHearingDocket(selectedClaim)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Dispute Docket</span>
            </button>
            <Link
              href="/finance/ra-bills"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Coins className="w-3.5 h-3.5 text-rose-400" />
              <span>RA Bills Clearinghouse</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setClaimRef(`CLM-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-0${claims.length + 1}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Lodge Claim / Notice</span>
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
              <span>Total Financial Claims</span>
              <DollarSign className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {formatInr(summary.totalClaimedQuantum)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Contractor claimed prolongation costs</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Liquidated Damages Levied</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-extrabold text-rose-400 mt-2">
              {formatInr(summary.totalLdLevied)}
            </div>
            <div className="text-[11px] text-rose-500/80 mt-1">CPWD Clause 2 delay compensation</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Disallowed Time-Barred</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.timeBarredCount > 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {summary.timeBarredCount} Claim(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Notice &gt; 28 days under FIDIC 20.1</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Active DAB Proceedings</span>
              <Gavel className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {summary.inDabCount} Dispute(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">In 84-day statutory adjudication</div>
          </div>
        </div>

        {/* TIME BAR WARNING ALERT */}
        {isBarred && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <strong className="text-rose-200 text-xs uppercase tracking-wider block">
                  FIDIC Clause 20.1 Time-Bar Activated: Claim Legally Discharged
                </strong>
                <span className="text-xs text-rose-300/80 font-sans">
                  The contractor gave notice {selectedClaim.days_to_notice} days after becoming aware of the event, exceeding the mandatory 28-day window. Under FIDIC 20.1 paragraph 2, the employer is completely discharged from all liability.
                </span>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-800 text-xs font-bold shrink-0">
              DISALLOWED TIME-BARRED
            </span>
          </div>
        )}

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Claims (${claims.length})` },
              { key: "NOTICE_SUBMITTED_28D", label: "Notices" },
              { key: "ENGINEER_DETERMINATION_CLAUSE_3_5", label: "Engineer Assessed" },
              { key: "DAB_REFERRAL_84D", label: "DAB Panel" },
              { key: "DISALLOWED_TIME_BARRED", label: "Time-Barred" },
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
              placeholder="Search claim, contractor, WO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: CLAIMS ROSTER (7 cols) vs ADJUDICATION DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: CLAIMS LISTING (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Statutory Claims &amp; Disputes Docket
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Lodged Claims &amp; LD Notices</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredClaims.length} Claims</span>
            </div>

            <div className="space-y-3">
              {filteredClaims.map((c) => {
                const isSelected = selectedClaim.id === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedClaim(c)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {c.claim_reference}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {c.category.replace(/_/g, " ")}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          c.is_time_barred
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                            : c.status === "DAB_REFERRAL_84D"
                            ? "bg-purple-950 text-purple-400 border border-purple-800/50"
                            : c.status === "ENGINEER_DETERMINATION_CLAUSE_3_5"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                        }`}>
                          {c.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-emerald-400">
                          {formatInr(c.financial_quantum_claimed_inr || c.liquidated_damages_levied_inr)}
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          EOT: +{c.time_extension_claimed_days} Days
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{c.title}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        Contractor: <strong className="text-zinc-200">{c.contractor_name}</strong> &bull; {c.work_order_ref}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Event: <strong className="text-zinc-300">{c.event_occurrence_date}</strong></span>
                      <span>Notice: <strong className="text-zinc-300">{c.claim_notice_date} ({c.days_to_notice}d)</strong></span>
                      <span>Hindrance: <strong className="text-cyan-300">{c.linked_hindrance_code || "Direct"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: ADJUDICATION & DETERMINATION DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Claim Adjudication Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedClaim.claim_reference}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                selectedClaim.is_time_barred
                  ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                  : "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
              }`}>
                {selectedClaim.is_time_barred ? "Time-Barred" : "Timely Notice"}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Claim Headline:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedClaim.title}</strong>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Contractor Entity:</span>
                  <span className="text-white font-bold font-sans">{selectedClaim.contractor_name}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Work Order Ref:</span>
                  <span className="text-cyan-300 font-bold">{selectedClaim.work_order_ref}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Event Date:</span>
                  <span className="text-white">{selectedClaim.event_occurrence_date}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Notice Date:</span>
                  <span className="text-cyan-300 font-bold">{selectedClaim.claim_notice_date} ({selectedClaim.days_to_notice} Days)</span>
                </div>
              </div>
            </div>

            {/* FIDIC 20.1 QUANTUM & ASSESSMENT BREAKDOWN */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                FIDIC 20.1 Claim vs Engineer Assessment:
              </span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Contractor Claimed EOT:</span>
                  <span className="text-white font-bold">+{selectedClaim.time_extension_claimed_days} Calendar Days</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Contractor Claimed Cost:</span>
                  <span className="text-cyan-300 font-bold">{formatInr(selectedClaim.financial_quantum_claimed_inr)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-zinc-800">
                  <span>Engineer Assessed EOT:</span>
                  <span>+{selectedClaim.engineer_assessed_eot_days} Days</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Engineer Assessed Cost:</span>
                  <span>{formatInr(selectedClaim.engineer_assessed_amount_inr)}</span>
                </div>

                {selectedClaim.liquidated_damages_levied_inr > 0 && (
                  <div className="flex justify-between text-rose-400 font-extrabold pt-1 border-t border-zinc-800">
                    <span>CPWD Cl. 2 Liquidated Damages:</span>
                    <span>{formatInr(selectedClaim.liquidated_damages_levied_inr)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* DAB 84-DAY ADJUDICATION STATUS */}
            {selectedClaim.dab_referral_date && (
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 font-mono text-xs space-y-1.5">
                <div className="flex items-center justify-between text-cyan-300 font-bold">
                  <span>Dispute Adjudication Board (DAB 84D)</span>
                  <Gavel className="w-4 h-4" />
                </div>
                <p className="text-zinc-300 font-sans text-xs leading-relaxed pt-1">
                  {selectedClaim.dab_decision_summary}
                </p>
                <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800">
                  Decision Due: <strong>{selectedClaim.dab_decision_due_date}</strong> &bull; Arbiter: {selectedClaim.lead_arbiter_name || "Sole Adjudicator"}
                </div>
              </div>
            )}

            {/* ACTIONS: ENGINEER DETERMINATION OR REFER TO DAB */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Statutory Determination Protocol:
              </span>

              {!selectedClaim.is_time_barred && selectedClaim.status === "NOTICE_SUBMITTED_28D" && (
                <button
                  type="button"
                  disabled={!isDirectorOrSeor || actionInProgress === `det_${selectedClaim.id}`}
                  onClick={() => handleEngineerDetermination(selectedClaim)}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono disabled:opacity-50"
                >
                  <Scale className="w-4 h-4" />
                  <span>Issue Clause 3.5 Engineer Determination (SEOR)</span>
                </button>
              )}

              {!selectedClaim.is_time_barred && selectedClaim.status === "ENGINEER_DETERMINATION_CLAUSE_3_5" && (
                <button
                  type="button"
                  disabled={!isDirectorOrSeor || actionInProgress === `dab_${selectedClaim.id}`}
                  onClick={() => handleReferToDab(selectedClaim)}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-purple-950/50 font-mono disabled:opacity-50"
                >
                  <Gavel className="w-4 h-4" />
                  <span>Refer Dispute to DAB Panel (FIDIC 20.4 - 84D)</span>
                </button>
              )}

              {selectedClaim.is_time_barred && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5 text-rose-200">
                    <AlertOctagon className="w-4 h-4 text-rose-400" />
                    <span>CLAIM TIME-BARRED UNDER FIDIC 20.1</span>
                  </div>
                  <div className="text-[10px] text-zinc-300 font-sans">
                    Notice submitted {selectedClaim.days_to_notice} days after event (&gt;28 days). Employer legally discharged.
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              FIDIC Red Book Clause 20 &amp; CPWD GCC Clause 2 / 25 Dispute Protocol
            </div>
          </div>

        </div>

        {/* LODGE CLAIM / LD MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Lodge Contract Claim / LD Notice
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

              <form onSubmit={handleLodgeClaim} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Claim Ref No.</label>
                    <input
                      type="text"
                      required
                      value={claimRef}
                      onChange={(e) => setClaimRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Claim Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ClaimCategory)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="TIME_EXTENSION_EOT">Extension of Time (EOT)</option>
                      <option value="PROLONGATION_COSTS">Prolongation / Idling Costs</option>
                      <option value="UNFORESEEN_PHYSICAL_CONDITIONS">Unforeseen Physical Conditions</option>
                      <option value="EMPLOYER_DELAY_VARIATION">Employer Delay Event</option>
                      <option value="LIQUIDATED_DAMAGES_LEVIED">Liquidated Damages (Levied)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Claim Title</label>
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
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Work Order Ref</label>
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Event Occurrence Date</label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Formal Notice Date</label>
                    <input
                      type="date"
                      required
                      value={noticeDate}
                      onChange={(e) => setNoticeDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Claimed EOT (Days)</label>
                    <input
                      type="number"
                      required
                      value={claimedDays}
                      onChange={(e) => setClaimedDays(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Claimed Amount / LD (₹)</label>
                    <input
                      type="number"
                      required
                      value={claimedAmount}
                      onChange={(e) => setClaimedAmount(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Linked Hindrance Register Code</label>
                  <input
                    type="text"
                    value={hindranceCode}
                    onChange={(e) => setHindranceCode(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
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
                    disabled={actionInProgress === "creating_claim"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Transmit Claim Notice</span>
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