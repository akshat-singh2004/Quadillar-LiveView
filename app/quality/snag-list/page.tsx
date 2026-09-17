"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Coins,
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
  Unlock,
  Wrench,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type SnagCategory =
  | "CATEGORY_A_CRITICAL_BLOCKER"
  | "CATEGORY_B_FUNCTIONAL_DEFECT"
  | "CATEGORY_C_COSMETIC_SURFACE";

export type SnagStatus =
  | "OPEN_PENDING_RECTIFICATION"
  | "CONTRACTOR_RECTIFIED"
  | "SEOR_VERIFIED_DE_SNAGGED"
  | "DEFAULT_ESCROW_WITHHELD";

export interface SnagItemRecord {
  id: string;
  project_id: string;
  snag_code: string;
  work_order_ref: string;
  contractor_name: string;
  trade_package: string;
  location_grid: string;
  room_zone: string;
  snag_title: string;
  description: string;
  category: SnagCategory;
  estimated_rectification_cost_inr: number;
  target_rectification_date: string;
  rectified_date?: string | null;
  photo_before_url?: string | null;
  photo_after_url?: string | null;
  is_handover_blocker: boolean;
  linked_toc_ref?: string | null;
  status: SnagStatus;
  logged_by: string;
  verified_by?: string | null;
  verified_at?: string | null;
  rectification_notes?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function normalizeSnag(d: any): SnagItemRecord {
  const cat = (d?.category as SnagCategory) ?? "CATEGORY_B_FUNCTIONAL_DEFECT";
  const isBlocker = cat === "CATEGORY_A_CRITICAL_BLOCKER" || Boolean(d?.is_handover_blocker);

  return {
    id: d?.id ?? `snag-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    snag_code: d?.snag_code ?? `SNG-${Date.now().toString().slice(-4)}`,
    work_order_ref: d?.work_order_ref ?? "WO-01",
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    location_grid: d?.location_grid ?? "Level 08 / Unit 802",
    room_zone: d?.room_zone ?? "Master Bedroom",
    snag_title: d?.snag_title ?? "Pre-Handover Snag Observation",
    description: d?.description ?? "Physical defect identified during comprehensive pre-handover snagging walkthrough.",
    category: cat,
    estimated_rectification_cost_inr: Number(d?.estimated_rectification_cost_inr ?? 2500),
    target_rectification_date: d?.target_rectification_date ?? new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    rectified_date: d?.rectified_date ?? null,
    photo_before_url: d?.photo_before_url ?? null,
    photo_after_url: d?.photo_after_url ?? null,
    is_handover_blocker: isBlocker,
    linked_toc_ref: d?.linked_toc_ref ?? null,
    status: (d?.status as SnagStatus) ?? "OPEN_PENDING_RECTIFICATION",
    logged_by: d?.logged_by ?? "Lead QA Architect",
    verified_by: d?.verified_by ?? null,
    verified_at: d?.verified_at ?? null,
    rectification_notes: d?.rectification_notes ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalSnagListPage() {
  const { project, role, tier } = useActiveRole();
  const [snags, setSnags] = useState<SnagItemRecord[]>([]);
  const [selectedSnag, setSelectedSnag] = useState<SnagItemRecord | null>(null);
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
  const roleLabel = (role as { label?: string })?.label || "Lead QA Architect";
  const isQaOrSeor =
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleId === "RESIDENT_ENGINEER" ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("QA") ||
    roleLabel.includes("QC") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Engineer");

  // Form State for Logging New Snag
  const [snagCode, setSnagCode] = useState(`SNG-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
  const [snagTitle, setSnagTitle] = useState(
    tier === "RESIDENTIAL"
      ? "Joinery Shutter Alignment Defect: Master Wardrobe Soft-Close Friction"
      : "Fire Rated Door Perimeter Intumescent Seal Gap Exceeds 3mm"
  );
  const [category, setCategory] = useState<SnagCategory>(
    tier === "RESIDENTIAL" ? "CATEGORY_B_FUNCTIONAL_DEFECT" : "CATEGORY_A_CRITICAL_BLOCKER"
  );
  const [woRef, setWoRef] = useState(tier === "RESIDENTIAL" ? "WO-RES-001" : "WO-TWR-101");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Fit-Out" : "Civil & Fire Doors"
  );
  const [grid, setGrid] = useState(tier === "RESIDENTIAL" ? "First Floor / MB-02" : "Tower A / Level 08 / Unit 804");
  const [zone, setZone] = useState(tier === "RESIDENTIAL" ? "Master Bedroom Wardrobe Wall" : "Fire Staircase Exit Corridor");
  const [desc, setDesc] = useState(
    tier === "RESIDENTIAL"
      ? "Right-hand wardrobe shutter catches against pelmet edge trim. Hinges require realignment and screw tightening."
      : "Fire door bottom clearance measured at 7.5mm (Max allowable: 3mm). Smoke and fire barrier compromise."
  );
  const [costEst, setCostEst] = useState<number>(tier === "RESIDENTIAL" ? 2500 : 18000);
  const [targetDate, setTargetDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );

  const loadSnagData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("project_snag_punch_list")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeSnag(d));
        setSnags(normalized);
        if (!selectedSnag) setSelectedSnag(normalized[0]);
      } else {
        const defaults: SnagItemRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeSnag({
                  id: "snag-res-01",
                  project_id: projectId,
                  snag_code: "SNG-RES-041",
                  work_order_ref: "WO-RES-001",
                  contractor_name: "Royal Woodworks & Interiors",
                  trade_package: "Custom Joinery & Millwork",
                  location_grid: "First Floor / MB-02",
                  room_zone: "Master Bedroom Dressing Niche",
                  snag_title: "Wardrobe Right Shutter Edge Gap Uneven & Bottom Runner Rubbing",
                  description: "Gap between central bi-fold leaves varies from 1.5mm at base to 4.5mm at head. Adjust Blum soft-close hinges and re-level base plinth.",
                  category: "CATEGORY_B_FUNCTIONAL_DEFECT",
                  estimated_rectification_cost_inr: 2500,
                  target_rectification_date: "2026-09-25",
                  is_handover_blocker: false,
                  status: "OPEN_PENDING_RECTIFICATION",
                  logged_by: "Principal Architect",
                }),
                normalizeSnag({
                  id: "snag-res-02",
                  project_id: projectId,
                  snag_code: "SNG-RES-042",
                  work_order_ref: "WO-RES-001",
                  contractor_name: "Royal Woodworks & Interiors",
                  trade_package: "Architectural Painting",
                  location_grid: "Ground Floor / Living Foyer",
                  room_zone: "Entrance Ceiling Pelmet",
                  snag_title: "Ceiling Paint Flashing & Roller Nap Marks under Grazing Light",
                  description: "Roller texture inconsistencies visible under magnetic track light grazing. Sand down with 220-grit and apply final coat of Asian Paints Royale Matte.",
                  category: "CATEGORY_C_COSMETIC_SURFACE",
                  estimated_rectification_cost_inr: 1500,
                  target_rectification_date: "2026-09-20",
                  rectified_date: "2026-09-15",
                  is_handover_blocker: false,
                  status: "SEOR_VERIFIED_DE_SNAGGED",
                  logged_by: "Principal Architect",
                  verified_by: "Principal Architect",
                  verified_at: "2026-09-15T15:00:00Z",
                  rectification_notes: "Ceiling refinished with fine microfiber roller. Grazing light audit passed.",
                }),
              ]
            : [
                normalizeSnag({
                  id: "snag-twr-01",
                  project_id: projectId,
                  snag_code: "SNG-TWR-101",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Fire Doors & Compartmentation",
                  location_grid: "Tower A / Level 08 / Staircase 01",
                  room_zone: "Fire Exit Door Frame",
                  snag_title: "Fire Rated Door Perimeter Gap Exceeds 3mm (NBC Clause 4.2.13)",
                  description: "Bottom threshold clearance measured at 7.5mm, exceeding maximum 3mm limit per NBC 2016 Part 4. Drop-seal mechanism failed to deploy upon door latching.",
                  category: "CATEGORY_A_CRITICAL_BLOCKER",
                  estimated_rectification_cost_inr: 18000,
                  target_rectification_date: "2026-09-22",
                  is_handover_blocker: true,
                  linked_toc_ref: "TOC-TWR-08",
                  status: "OPEN_PENDING_RECTIFICATION",
                  logged_by: "Resident SEOR",
                }),
                normalizeSnag({
                  id: "snag-twr-02",
                  project_id: projectId,
                  snag_code: "SNG-TWR-102",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  location_grid: "Tower A / Level 08 / Unit 802",
                  room_zone: "Balcony Perimeter Deck",
                  snag_title: "Waterproofing Skirting Coving Hairline Crack & Void Spot",
                  description: "Minor shrinkage hairline separation observed along 1.2m of balcony kerb waterproofing coving. V-groove chase, clean, and seal with polyurethane sealant.",
                  category: "CATEGORY_B_FUNCTIONAL_DEFECT",
                  estimated_rectification_cost_inr: 4500,
                  target_rectification_date: "2026-09-24",
                  is_handover_blocker: false,
                  status: "CONTRACTOR_RECTIFIED",
                  logged_by: "Resident SEOR",
                  rectification_notes: "PU sealant applied and pond testing conducted for 24 hours without leakage.",
                }),
              ];

        setSnags(defaults);
        if (!selectedSnag) setSelectedSnag(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedSnag, tier]);

  useEffect(() => {
    void loadSnagData();

    const channel = supabase
      .channel(`snags_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_snag_punch_list" }, () => void loadSnagData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadSnagData]);

  const summary = useMemo(() => {
    const totalSnags = snags.length;
    const catABlockers = snags.filter(
      (s) => s.category === "CATEGORY_A_CRITICAL_BLOCKER" && s.status !== "SEOR_VERIFIED_DE_SNAGGED"
    ).length;
    const pendingRectification = snags.filter((s) => s.status === "OPEN_PENDING_RECTIFICATION").length;
    const deSnaggedCleared = snags.filter((s) => s.status === "SEOR_VERIFIED_DE_SNAGGED").length;
    const totalWithholdingCostInr = snags
      .filter((s) => s.status !== "SEOR_VERIFIED_DE_SNAGGED")
      .reduce((sum, s) => sum + Number(s.estimated_rectification_cost_inr || 0), 0);

    return { totalSnags, catABlockers, pendingRectification, deSnaggedCleared, totalWithholdingCostInr };
  }, [snags]);

  const filteredSnags = useMemo(() => {
    return snags.filter((s) => {
      const matchCat = filterCategory === "ALL" || s.category === filterCategory;
      const matchStat = filterStatus === "ALL" || s.status === filterStatus;
      const haystack = `${s.snag_code} ${s.snag_title} ${s.location_grid} ${s.room_zone} ${s.contractor_name}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchCat && matchStat && matchSearch;
    });
  }, [snags, filterCategory, filterStatus, search]);

  // Stage 1: Contractor Marks Snag as Rectified
  const handleMarkRectified = async (snag: SnagItemRecord) => {
    setActionInProgress(`rectify_${snag.id}`);

    const updatePayload: Partial<SnagItemRecord> = {
      status: "CONTRACTOR_RECTIFIED",
      rectified_date: new Date().toISOString().slice(0, 10),
      rectification_notes: "Physical defect repaired. Requesting SEOR de-snagging inspection.",
    };

    try {
      await (supabase as any)
        .from("project_snag_punch_list")
        .update(updatePayload)
        .eq("id", snag.id);
    } catch {
      // Local optimistic update
    }

    setSnags((prev) =>
      prev.map((item) => (item.id === snag.id ? ({ ...item, ...updatePayload } as SnagItemRecord) : item))
    );
    if (selectedSnag && selectedSnag.id === snag.id) {
      setSelectedSnag((prev) => (prev ? ({ ...prev, ...updatePayload } as SnagItemRecord) : null));
    }

    setFeedbackMessage(`Snag ${snag.snag_code} marked as rectified. Transmitted for SEOR de-snagging verification.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Stage 2: SEOR / Architect Inspects & De-Snags (Closes Defect)
  const handleVerifyDeSnag = async (snag: SnagItemRecord) => {
    if (!isQaOrSeor) return;
    setActionInProgress(`desnag_${snag.id}`);

    const updatePayload: Partial<SnagItemRecord> = {
      status: "SEOR_VERIFIED_DE_SNAGGED",
      verified_by: roleLabel || "Resident SEOR",
      verified_at: new Date().toISOString(),
      is_handover_blocker: false,
    };

    try {
      await (supabase as any)
        .from("project_snag_punch_list")
        .update(updatePayload)
        .eq("id", snag.id);
    } catch {
      // Local optimistic update
    }

    setSnags((prev) =>
      prev.map((item) => (item.id === snag.id ? ({ ...item, ...updatePayload } as SnagItemRecord) : item))
    );
    if (selectedSnag && selectedSnag.id === snag.id) {
      setSelectedSnag((prev) => (prev ? ({ ...prev, ...updatePayload } as SnagItemRecord) : null));
    }

    setFeedbackMessage(`Snag ${snag.snag_code} formally de-snagged and cleared. Handover blocker released.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Stage 3: Enforce Escrow Retention Withholding (Contractor Default)
  const handleEnforceWithholding = async (snag: SnagItemRecord) => {
    if (!isQaOrSeor) return;
    setActionInProgress(`withhold_${snag.id}`);

    const updatePayload: Partial<SnagItemRecord> = {
      status: "DEFAULT_ESCROW_WITHHELD",
    };

    try {
      await (supabase as any)
        .from("project_snag_punch_list")
        .update(updatePayload)
        .eq("id", snag.id);
    } catch {
      // Local optimistic update
    }

    setSnags((prev) =>
      prev.map((item) => (item.id === snag.id ? ({ ...item, ...updatePayload } as SnagItemRecord) : item))
    );
    if (selectedSnag && selectedSnag.id === snag.id) {
      setSelectedSnag((prev) => (prev ? ({ ...prev, ...updatePayload } as SnagItemRecord) : null));
    }

    setFeedbackMessage(`Escrow withholding of ${formatInr(snag.estimated_rectification_cost_inr)} enforced from contractor Final Bill.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Log New Snag Item
  const handleCreateSnag = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_snag");

    const isBlocker = category === "CATEGORY_A_CRITICAL_BLOCKER";

    const newDbRecord: Omit<SnagItemRecord, "id"> = {
      project_id: projectId,
      snag_code: snagCode.trim(),
      work_order_ref: woRef.trim(),
      contractor_name: contractor.trim(),
      trade_package: tradePackage.trim(),
      location_grid: grid.trim(),
      room_zone: zone.trim(),
      snag_title: snagTitle.trim(),
      description: desc.trim(),
      category,
      estimated_rectification_cost_inr: Number(costEst),
      target_rectification_date: targetDate,
      is_handover_blocker: isBlocker,
      linked_toc_ref: isBlocker ? (tier === "RESIDENTIAL" ? "TOC-RES-01" : "TOC-TWR-08") : null,
      status: "OPEN_PENDING_RECTIFICATION",
      logged_by: roleLabel || "Lead QA Architect",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("project_snag_punch_list")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeSnag(data);
        setSnags((prev) => [normalized, ...prev]);
        setSelectedSnag(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeSnag({ ...newDbRecord, id: `snag-${Date.now()}` });
      setSnags((prev) => [fallback, ...prev]);
      setSelectedSnag(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory Pre-Handover Punch List Print (FIDIC 10.1 / CPWD Form 17)
  const handlePrintPunchList = (snagList: SnagItemRecord[]) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Pre-Handover Punch List &amp; De-Snagging Schedule (FIDIC Cl. 10.1 / CPWD Form 17) — ${projectName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .cleared { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .blocker { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD Works Manual Section 17 / FIDIC Cl. 10.1 Punch List</div>
      <h1 class="title">Pre-Handover Snagging &amp; De-Snagging Schedule</h1>
      <div class="meta">Inspection Date: ${new Date().toLocaleDateString("en-IN")} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${summary.catABlockers > 0 ? "blocker" : "cleared"}">${summary.catABlockers > 0 ? "HANDOVER BLOCKED (CAT A SNAGS)" : "TOC CLEARANCE PERMITTED"}</span>
  </div>

  <table>
    <tr><th>Total Logged Snags</th><td><strong>${summary.totalSnags} Items</strong></td><th>Critical Handover Blockers</th><td style="color: #b91c1c; font-weight: bold;">${summary.catABlockers} Active Blocker(s)</td></tr>
    <tr><th>Pending Rectification</th><td>${summary.pendingRectification} Items</td><th>De-Snagged &amp; Verified</th><td style="color: #15803d; font-weight: bold;">${summary.deSnaggedCleared} Cleared</td></tr>
    <tr><th>Estimated Withholding Quantum</th><td colspan="3"><strong style="color: #b91c1c;">₹${summary.totalWithholdingCostInr.toLocaleString("en-IN")}</strong> (Held against Stage 1 Retention)</td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Taking-Over Certificate (TOC) Commercial Determination</div>
    <div>Under FIDIC Clause 10.1, Category A snags legally prevent Taking-Over certification. Minor Category B and C snags are permitted provided the contractor provides an escrow withholding deposit equal to 1.5x the estimated rectification value.</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Snag Code</th>
        <th>Zone &amp; Grid</th>
        <th>Trade &amp; Contractor</th>
        <th>Defect Description</th>
        <th class="tac">Category</th>
        <th class="tar">Withholding (INR)</th>
        <th class="tac">Status</th>
      </tr>
    </thead>
    <tbody>
      ${snagList.map((s) => `
        <tr style="background: ${s.status === "SEOR_VERIFIED_DE_SNAGGED" ? "#ffffff" : s.category === "CATEGORY_A_CRITICAL_BLOCKER" ? "#fee2e2" : "#fefce8"};">
          <td style="font-family: monospace; font-weight: bold;">${s.snag_code}</td>
          <td><strong>${s.room_zone}</strong><br><span style="color: #64748b; font-size: 10px;">${s.location_grid}</span></td>
          <td>${s.trade_package}<br><span style="color: #64748b; font-size: 10px;">${s.contractor_name}</span></td>
          <td>${s.snag_title}</td>
          <td class="tac font-bold" style="color: ${s.category === "CATEGORY_A_CRITICAL_BLOCKER" ? "#b91c1c" : "#0369a1"};">${s.category.replace(/_/g, " ").replace("CATEGORY ", "")}</td>
          <td class="tar font-bold">₹${s.estimated_rectification_cost_inr.toLocaleString("en-IN")}</td>
          <td class="tac font-bold" style="color: ${s.status === "SEOR_VERIFIED_DE_SNAGGED" ? "#15803d" : "#b91c1c"};">${s.status.replace(/_/g, " ")}</td>
        </tr>
      `).join("")}
      <tr class="total-row">
        <td colspan="5"><strong>TOTAL OUTSTANDING DEFECT WITHHOLDING LIABILITY</strong></td>
        <td class="tar font-bold" style="color: #b91c1c; font-size: 13px;">₹${summary.totalWithholdingCostInr.toLocaleString("en-IN")}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>Subcontractor Representative</div>
      <div style="color: #64748b;">Rectification Timeline Acknowledged</div>
      <div class="sig">Contractor Receipt Seal</div>
    </div>
    <div>
      <div>Lead QA Architect / Inspector</div>
      <div style="color: #64748b;">Punch List Survey Completed</div>
      <div class="sig">Architect Inspection Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">De-Snagging Clearance Certified</div>
      <div class="sig">SEOR Taking-Over Endorsement</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedSnag) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING PROJECT SNAGGING &amp; PRE-HANDOVER PUNCH-LIST CLEARINGHOUSE...
      </div>
    );
  }

  const isCatABlocker = selectedSnag.category === "CATEGORY_A_CRITICAL_BLOCKER" && selectedSnag.status !== "SEOR_VERIFIED_DE_SNAGGED";
  const isDeSnagged = selectedSnag.status === "SEOR_VERIFIED_DE_SNAGGED";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Handover Governance · FIDIC Red Book Clause 10.1 / CPWD Works Manual Section 17</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Project Snagging &amp; Pre-Handover Punch-List
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Defect inspection and Taking-Over clearance clearinghouse. Categorizes Category A handover blockers versus minor finishes, enforces mandatory 14-day defect SLAs, holds escrow retention against unrectified snags, and certifies formal de-snagging.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintPunchList(filteredSnags)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Punch List Docket</span>
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
                setSnagCode(`SNG-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Log Snag Item</span>
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
              <span>Category A Handover Blockers</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.catABlockers > 0 ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
              {summary.catABlockers} Critical Hold(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Freezes Taking-Over Certificate (TOC)</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>De-Snagged &amp; Cleared</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {summary.deSnaggedCleared} / {summary.totalSnags} Items
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">SEOR inspected and cleared</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Pending Contractor SLA</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.pendingRectification > 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {summary.pendingRectification} Snags
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">14-day rectification window</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Outstanding Withholding</span>
              <Coins className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {formatInr(summary.totalWithholdingCostInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Estimated defect escrow reserve</div>
          </div>
        </div>

        {/* CATEGORY A HANDOVER BLOCKER WARNING CALLOUT */}
        {isCatABlocker && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <strong className="text-rose-200 text-xs uppercase tracking-wider block">
                  Category A Handover Blocker Active: Taking-Over Certificate (TOC) Frozen
                </strong>
                <span className="text-xs text-rose-300/80 font-sans">
                  Defect {selectedSnag.snag_code} ({selectedSnag.snag_title}) constitutes a life safety or functional barrier at {selectedSnag.location_grid}. Under FIDIC Clause 10.1, the Employer cannot execute substantial completion or release Stage 1 retention until this defect is rectified and de-snagged by the Resident SEOR.
                </span>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-800 text-xs font-bold shrink-0">
              TOC FROZEN
            </span>
          </div>
        )}

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Snags (${snags.length})` },
              { key: "OPEN_PENDING_RECTIFICATION", label: `Open (${summary.pendingRectification})` },
              { key: "CONTRACTOR_RECTIFIED", label: "Rectified" },
              { key: "SEOR_VERIFIED_DE_SNAGGED", label: "De-Snagged (Closed)" },
              { key: "DEFAULT_ESCROW_WITHHELD", label: "Escrow Withheld" },
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
              <option value="ALL">All Categories</option>
              <option value="CATEGORY_A_CRITICAL_BLOCKER">Cat A: Handover Blocker</option>
              <option value="CATEGORY_B_FUNCTIONAL_DEFECT">Cat B: Functional Defect</option>
              <option value="CATEGORY_C_COSMETIC_SURFACE">Cat C: Cosmetic Surface</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search code, title, zone, grid..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: SNAG ROSTER (5 cols) vs INSPECTION & DE-SNAGGING DESK (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: SNAGS LISTING (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  FIDIC 10.1 Punch List Register
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Identified Pre-Handover Defects</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredSnags.length} Snags</span>
            </div>

            <div className="space-y-3">
              {filteredSnags.map((snag) => {
                const isSelected = selectedSnag.id === snag.id;
                const isBlocker = snag.category === "CATEGORY_A_CRITICAL_BLOCKER" && snag.status !== "SEOR_VERIFIED_DE_SNAGGED";
                const isCleared = snag.status === "SEOR_VERIFIED_DE_SNAGGED";

                return (
                  <div
                    key={snag.id}
                    onClick={() => setSelectedSnag(snag)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {snag.snag_code}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isBlocker
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                            : snag.category === "CATEGORY_B_FUNCTIONAL_DEFECT"
                            ? "bg-amber-950 text-amber-400 border border-amber-800/50"
                            : "bg-zinc-800 text-zinc-300"
                        }`}>
                          {snag.category.replace(/_/g, " ").replace("CATEGORY ", "")}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isCleared
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : snag.status === "CONTRACTOR_RECTIFIED"
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                            : "bg-zinc-800 text-zinc-300"
                        }`}>
                          {snag.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-white">
                          {formatInr(snag.estimated_rectification_cost_inr)}
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Due: {snag.target_rectification_date}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{snag.snag_title}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        {snag.room_zone} &bull; Grid: <strong className="text-zinc-200">{snag.location_grid}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Trade: <strong className="text-zinc-300">{snag.trade_package}</strong></span>
                      <span>Contractor: <strong className="text-zinc-200">{snag.contractor_name}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: SNAG DETAILS & DE-SNAGGING DESK (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  De-Snagging Clearance Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedSnag.snag_code} &mdash; {selectedSnag.room_zone}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isDeSnagged
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : isCatABlocker
                  ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                  : "bg-amber-950 text-amber-400 border border-amber-800/50"
              }`}>
                {selectedSnag.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Defect Headline:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedSnag.snag_title}</strong>
              </div>

              <div className="pt-2 border-t border-zinc-800/60">
                <span className="text-zinc-500 text-[10px] uppercase block">Physical Observation Description:</span>
                <p className="text-zinc-200 font-sans text-xs mt-1 leading-relaxed">{selectedSnag.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Room / Zone:</span>
                  <span className="text-white font-bold">{selectedSnag.room_zone}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Grid Coordinate:</span>
                  <span className="text-cyan-300 font-bold">{selectedSnag.location_grid}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Trade Package:</span>
                  <span className="text-white">{selectedSnag.trade_package}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Responsible Entity:</span>
                  <span className="text-zinc-200">{selectedSnag.contractor_name}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Withholding Valuation:</span>
                  <span className="text-rose-400 font-bold">{formatInr(selectedSnag.estimated_rectification_cost_inr)}</span>
                </div>
              </div>
            </div>

            {/* RECTIFICATION TIMELINE & EVIDENCE REPOSITORY */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Statutory Rectification &amp; De-Snagging Audit:
              </span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Defect Categorization:</span>
                  <span className="text-white font-bold">{selectedSnag.category.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Mandatory Rectification SLA Target:</span>
                  <span className="text-amber-400 font-bold">{selectedSnag.target_rectification_date}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Handover Blocker Status:</span>
                  <span className={selectedSnag.is_handover_blocker ? "text-rose-400 font-bold" : "text-emerald-400"}>
                    {selectedSnag.is_handover_blocker ? `YES &bull; Blocks TOC (${selectedSnag.linked_toc_ref || "Active TOC"})` : "NO &bull; Conditional Handover Allowed"}
                  </span>
                </div>

                {selectedSnag.rectification_notes && (
                  <div className="pt-2 border-t border-zinc-800 text-[11px]">
                    <span className="text-zinc-500 block">Contractor Rectification Notes:</span>
                    <p className="text-zinc-300 font-sans mt-0.5">{selectedSnag.rectification_notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ACTION STAGE BUTTONS */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                De-Snagging Protocol Authorizations:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Action 1: Contractor Marks Rectified */}
                {selectedSnag.status === "OPEN_PENDING_RECTIFICATION" && (
                  <button
                    type="button"
                    disabled={actionInProgress === `rectify_${selectedSnag.id}`}
                    onClick={() => handleMarkRectified(selectedSnag)}
                    className="py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono"
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Mark Rectification Completed</span>
                  </button>
                )}

                {/* Action 2: SEOR De-Snags / Clears Defect */}
                {selectedSnag.status !== "SEOR_VERIFIED_DE_SNAGGED" && (
                  <button
                    type="button"
                    disabled={!isQaOrSeor || actionInProgress === `desnag_${selectedSnag.id}`}
                    onClick={() => handleVerifyDeSnag(selectedSnag)}
                    className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify &amp; Seal De-Snagged (SEOR)</span>
                  </button>
                )}

                {/* Action 3: Enforce Escrow Withholding (Default) */}
                {selectedSnag.status !== "SEOR_VERIFIED_DE_SNAGGED" && selectedSnag.status !== "DEFAULT_ESCROW_WITHHELD" && (
                  <button
                    type="button"
                    disabled={!isQaOrSeor || actionInProgress === `withhold_${selectedSnag.id}`}
                    onClick={() => handleEnforceWithholding(selectedSnag)}
                    className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/50 font-mono disabled:opacity-50"
                  >
                    <AlertOctagon className="w-4 h-4" />
                    <span>Enforce Escrow Withholding</span>
                  </button>
                )}
              </div>

              {isDeSnagged && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Defect Inspected &bull; Formally De-Snagged</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Certified on {selectedSnag.verified_at ? new Date(selectedSnag.verified_at).toLocaleDateString("en-IN") : "Today"} by {selectedSnag.verified_by || "Resident SEOR"}.
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              FIDIC Clause 10.1 &amp; CPWD Works Manual Section 17 Protocol
            </div>
          </div>

        </div>

        {/* LOG SNAG ITEM MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Log Pre-Handover Snag Observation
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

              <form onSubmit={handleCreateSnag} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Snag Code</label>
                    <input
                      type="text"
                      required
                      value={snagCode}
                      onChange={(e) => setSnagCode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Snag Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as SnagCategory)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="CATEGORY_A_CRITICAL_BLOCKER">Cat A: Critical Handover Blocker</option>
                      <option value="CATEGORY_B_FUNCTIONAL_DEFECT">Cat B: Functional / Workmanship Defect</option>
                      <option value="CATEGORY_C_COSMETIC_SURFACE">Cat C: Cosmetic / Surface Touch-up</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Defect Headline</label>
                  <input
                    type="text"
                    required
                    value={snagTitle}
                    onChange={(e) => setSnagTitle(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
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
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Room / Zone</label>
                    <input
                      type="text"
                      required
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
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
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Work Order Ref</label>
                    <input
                      type="text"
                      required
                      value={woRef}
                      onChange={(e) => setWoRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Defect Description &amp; Remediation Directive</label>
                  <textarea
                    rows={2}
                    required
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Withholding Estimate (₹)</label>
                    <input
                      type="number"
                      required
                      value={costEst}
                      onChange={(e) => setCostEst(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Target Rectification SLA</label>
                    <input
                      type="date"
                      required
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
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
                    disabled={actionInProgress === "creating_snag"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Commit Snag Entry</span>
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