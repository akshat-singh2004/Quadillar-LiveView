"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Plus,
  Printer,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Tag,
  Wrench,
  X
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type SubmittalReviewCode =
  | "PENDING_REVIEW"
  | "CODE_A_APPROVED"
  | "CODE_B_APPROVED_AS_NOTED"
  | "CODE_C_REVISE_RESUBMIT"
  | "CODE_D_REJECTED";

export type SubmittalType = "MATERIAL_SAMPLE" | "SHOP_DRAWING" | "PRODUCT_DATA" | "MIX_DESIGN_MOCKUP";

export interface TechnicalSubmittal {
  id: string;
  project_id: string;
  submittal_number: string;
  revision: string;
  title: string;
  submittal_type: SubmittalType;
  trade_package: string;
  contractor_name: string;
  spec_section: string;
  manufacturer_brand: string;
  submission_date: string;
  review_sla_deadline: string;
  review_code: SubmittalReviewCode;
  consultant_remarks: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
}

export default function CanonicalSubmittalsPage() {
  const { project, role, tier } = useActiveRole();
  const [submittals, setSubmittals] = useState<TechnicalSubmittal[]>([]);
  const [selectedSubmittal, setSelectedSubmittal] = useState<TechnicalSubmittal | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCode, setFilterCode] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // New Submittal Form State
  const [submittalNo, setSubmittalNo] = useState(
    `SUB-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [rev, setRev] = useState("Rev 00");
  const [title, setTitle] = useState(
    tier === "RESIDENTIAL"
      ? "Action TESA 18mm Boilo HDHMR Board Swatch & Lab Test Slip"
      : "Fe500D High-Yield Rebar Mill Test Certificate & BBS Layouts"
  );
  const [type, setType] = useState<SubmittalType>(
    tier === "RESIDENTIAL" ? "MATERIAL_SAMPLE" : "SHOP_DRAWING"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [specSection, setSpecSection] = useState(
    tier === "RESIDENTIAL" ? "Sec 06 41 00 / Architectural Woodwork" : "Sec 03 20 00 / Concrete Reinforcement"
  );
  const [manufacturer, setManufacturer] = useState(
    tier === "RESIDENTIAL" ? "Action TESA India Ltd" : "SteelSpan India Pvt Ltd"
  );

  // Type-Safe Role Authorization
  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = role?.label || "";
  const isConsultantOrArchitect =
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Lead") ||
    roleLabel.includes("Consultant");

  const loadSubmittals = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("technical_submittal_register")
        .select("*")
        .eq("project_id", project.id)
        .order("submission_date", { ascending: false });

      if (data && data.length > 0) {
        setSubmittals(data as TechnicalSubmittal[]);
        if (!selectedSubmittal) setSelectedSubmittal(data[0] as TechnicalSubmittal);
      } else {
        const defaults: TechnicalSubmittal[] =
          tier === "RESIDENTIAL"
            ? [
                {
                  id: "sub-res-01",
                  project_id: project.id,
                  submittal_number: "SUB-RES-014",
                  revision: "Rev 01",
                  title: "Action TESA 18mm Boilo Grade HDHMR Carcass Sample & Swatch Board",
                  submittal_type: "MATERIAL_SAMPLE",
                  trade_package: "Custom Joinery & Millwork",
                  contractor_name: "Royal Woodworks & Interiors",
                  spec_section: "Sec 06 41 00 / Custom Cabinets",
                  manufacturer_brand: "Action TESA Boilo (E1 Grade)",
                  submission_date: "2026-09-04",
                  review_sla_deadline: "2026-09-18",
                  review_code: "CODE_B_APPROVED_AS_NOTED",
                  consultant_remarks:
                    "Approved for internal carcasses. Edge banding must utilize 2mm thick high-impact ABS tape with moisture-cured PUR hotmelt adhesive.",
                  reviewed_by: "Principal Architect",
                  reviewed_at: "2026-09-08T14:30:00Z",
                },
                {
                  id: "sub-res-02",
                  project_id: project.id,
                  submittal_number: "SUB-RES-015",
                  revision: "Rev 00",
                  title: "Blum Tandembox Antaro 30kg Soft-Close Drawer Runner Hardware",
                  submittal_type: "PRODUCT_DATA",
                  trade_package: "Custom Joinery & Millwork",
                  contractor_name: "Royal Woodworks & Interiors",
                  spec_section: "Sec 08 71 00 / Door & Cabinet Hardware",
                  manufacturer_brand: "Blum Austria (Silk White)",
                  submission_date: "2026-09-07",
                  review_sla_deadline: "2026-09-21",
                  review_code: "CODE_A_APPROVED",
                  consultant_remarks:
                    "Fully compliant with architectural specifications. Verified against 100,000 cycle test certificate.",
                  reviewed_by: "Principal Architect",
                  reviewed_at: "2026-09-10T11:00:00Z",
                },
                {
                  id: "sub-res-03",
                  project_id: project.id,
                  submittal_number: "SUB-RES-016",
                  revision: "Rev 00",
                  title: "Asian Paints Royale Aspira Low-VOC PU Wall Finish & Primer Mockup",
                  submittal_type: "MIX_DESIGN_MOCKUP",
                  trade_package: "Surface Finishes & Polish",
                  contractor_name: "Royal Woodworks & Interiors",
                  spec_section: "Sec 09 91 23 / Interior Painting",
                  manufacturer_brand: "Asian Paints (VOC < 15 g/L)",
                  submission_date: "2026-09-11",
                  review_sla_deadline: "2026-09-25",
                  review_code: "PENDING_REVIEW",
                  consultant_remarks: "Mockup inspection scheduled on site with lux meter color balance test.",
                },
              ]
            : [
                {
                  id: "sub-twr-01",
                  project_id: project.id,
                  submittal_number: "SUB-TWR-071",
                  revision: "Rev 02",
                  title: "Fe500D Primary Rebar Mill Test Certificate & Level 08 BBS Layouts",
                  submittal_type: "SHOP_DRAWING",
                  trade_package: "Civil & Superstructure",
                  contractor_name: "Narmada Concrete Works",
                  spec_section: "Sec 03 20 00 / Concrete Reinforcement",
                  manufacturer_brand: "SteelSpan Primary Melt Fe500D",
                  submission_date: "2026-09-02",
                  review_sla_deadline: "2026-09-16",
                  review_code: "CODE_A_APPROVED",
                  consultant_remarks:
                    "Lapping lengths verified at 50d. Staggered mechanical couplers approved per IS 16172.",
                  reviewed_by: "Resident SEOR",
                  reviewed_at: "2026-09-06T15:00:00Z",
                },
                {
                  id: "sub-twr-02",
                  project_id: project.id,
                  submittal_number: "SUB-TWR-072",
                  revision: "Rev 01",
                  title: "M40 Grade Ready-Mix Concrete Rheology & 35% GGBS Replacement Design",
                  submittal_type: "MIX_DESIGN_MOCKUP",
                  trade_package: "Civil & Superstructure",
                  contractor_name: "Narmada Concrete Works",
                  spec_section: "Sec 03 30 00 / Cast-in-Place Concrete",
                  manufacturer_brand: "BuildMix RMC Works",
                  submission_date: "2026-09-05",
                  review_sla_deadline: "2026-09-19",
                  review_code: "CODE_B_APPROVED_AS_NOTED",
                  consultant_remarks:
                    "Approved for core walls. Slump flow retention must remain 650mm minimum at 90 minutes post-batching.",
                  reviewed_by: "Resident SEOR",
                  reviewed_at: "2026-09-09T18:00:00Z",
                },
                {
                  id: "sub-twr-03",
                  project_id: project.id,
                  submittal_number: "SUB-TWR-073",
                  revision: "Rev 00",
                  title: "Doka Framax Xlife Core Wall Hydraulic Formwork Structural Calcs",
                  submittal_type: "PRODUCT_DATA",
                  trade_package: "Civil & Superstructure",
                  contractor_name: "Narmada Concrete Works",
                  spec_section: "Sec 03 11 00 / Concrete Forming",
                  manufacturer_brand: "Doka Framax Xlife",
                  submission_date: "2026-09-10",
                  review_sla_deadline: "2026-09-24",
                  review_code: "PENDING_REVIEW",
                  consultant_remarks: "Lateral fresh concrete pressure limit calculations under SEOR verification.",
                },
              ];

        setSubmittals(defaults);
        if (!selectedSubmittal) setSelectedSubmittal(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [project.id, selectedSubmittal, tier]);

  useEffect(() => {
    void loadSubmittals();

    const channel = supabase
      .channel(`submittals_sync_${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "technical_submittal_register" }, () => void loadSubmittals())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [project.id, loadSubmittals]);

  const summary = useMemo(() => {
    const total = submittals.length;
    const approved = submittals.filter(
      (s) => s.review_code === "CODE_A_APPROVED" || s.review_code === "CODE_B_APPROVED_AS_NOTED"
    ).length;
    const pending = submittals.filter((s) => s.review_code === "PENDING_REVIEW").length;
    const rejected = submittals.filter(
      (s) => s.review_code === "CODE_C_REVISE_RESUBMIT" || s.review_code === "CODE_D_REJECTED"
    ).length;

    return { total, approved, pending, rejected };
  }, [submittals]);

  const filteredSubmittals = useMemo(() => {
    return submittals.filter((s) => {
      const matchesFilter = filterCode === "ALL" || s.review_code === filterCode;
      const haystack = `${s.submittal_number} ${s.title} ${s.contractor_name} ${s.manufacturer_brand} ${s.spec_section}`.toLowerCase();
      const matchesSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchesFilter && matchesSearch;
    });
  }, [submittals, filterCode, search]);

  const handleUpdateReview = async (submittalId: string, nextCode: SubmittalReviewCode, remarks: string) => {
    if (!isConsultantOrArchitect) return;
    setActionInProgress(submittalId);

    const updatePayload: Partial<TechnicalSubmittal> = {
      review_code: nextCode,
      consultant_remarks: remarks.trim(),
      reviewed_by: role.label,
      reviewed_at: new Date().toISOString(),
    };

    try {
      await (supabase as any).from("technical_submittal_register").update(updatePayload).eq("id", submittalId);
    } catch {
      // Optimistic update
    }

    setSubmittals((prev) =>
      prev.map((s) => (s.id === submittalId ? { ...s, ...updatePayload } : s))
    );
    if (selectedSubmittal && selectedSubmittal.id === submittalId) {
      setSelectedSubmittal((prev) => (prev ? { ...prev, ...updatePayload } : null));
    }
    setActionInProgress(null);
  };

  const handleCreateSubmittal = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating");

    const today = new Date();
    const slaDate = new Date(today.getTime() + 86400000 * 14);

    const newSubmittal: Omit<TechnicalSubmittal, "id"> = {
      project_id: project.id,
      submittal_number: submittalNo.trim(),
      revision: rev.trim(),
      title: title.trim(),
      submittal_type: type,
      trade_package: tradePackage.trim(),
      contractor_name: contractor.trim(),
      spec_section: specSection.trim(),
      manufacturer_brand: manufacturer.trim(),
      submission_date: today.toISOString().split("T")[0],
      review_sla_deadline: slaDate.toISOString().split("T")[0],
      review_code: "PENDING_REVIEW",
      consultant_remarks: "Awaiting architectural & engineering compliance review.",
    };

    try {
      await (supabase as any).from("technical_submittal_register").insert([newSubmittal]);
    } catch {
      // Local fallback append
    }

    setSubmittals((prev) => [{ ...newSubmittal, id: `sub-${Date.now()}` }, ...prev]);
    setModalOpen(false);
    setActionInProgress(null);
  };

  // Printable Material Approval Request (MAR) / Submittal Review Transmittal
  const handlePrintSubmittal = (sub: TechnicalSubmittal) => {
    const printWin = window.open("", "_blank", "width=1000,height=850");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Material Approval Request (MAR) — ${sub.submittal_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 10px; }
    .code-a { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .code-b { background: #e0f2fe; color: #0369a1; border: 1px solid #0284c7; }
    .code-c { background: #fef3c7; color: #b45309; border: 1px solid #f59e0b; }
    .code-d { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; margin-top: 16px; background: #fafafa; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 36px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · ISO 19650-2 / FIDIC Clause 4.10 Submittal Transmittal</div>
      <h1 class="title">Material Approval Request (MAR / Submittal)</h1>
      <div class="meta">Submittal Ref: ${sub.submittal_number} (${sub.revision}) · Project: ${project.name} (${project.id})</div>
    </div>
    <span class="badge ${sub.review_code === 'CODE_A_APPROVED' ? 'code-a' : sub.review_code === 'CODE_B_APPROVED_AS_NOTED' ? 'code-b' : 'code-c'}">${sub.review_code.replace(/_/g, ' ')}</span>
  </div>

  <table>
    <tr><th>Item Title</th><td colspan="3"><strong>${sub.title}</strong></td></tr>
    <tr><th>Specification Ref</th><td>${sub.spec_section}</td><th>Submittal Type</th><td>${sub.submittal_type.replace(/_/g, ' ')}</td></tr>
    <tr><th>Manufacturer / Model</th><td><strong>${sub.manufacturer_brand}</strong></td><th>Executing Trade</th><td>${sub.contractor_name} (${sub.trade_package})</td></tr>
    <tr><th>Submission Date</th><td>${sub.submission_date}</td><th>14-Day Review SLA</th><td>${sub.review_sla_deadline}</td></tr>
  </table>

  <div class="box">
    <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 6px;">Architectural & Engineering Review Commentary</div>
    <div style="font-size: 12px; line-height: 1.6;">${sub.consultant_remarks}</div>
  </div>

  <div class="footer">
    <div>
      <div>Specialty Trade Contractor</div>
      <div style="color: #64748b;">${sub.contractor_name}</div>
      <div class="sig">Submittal Originator</div>
    </div>
    <div>
      <div>Materials QA/QC Lead</div>
      <div style="color: #64748b;">Technical data sheet verified.</div>
      <div class="sig">Compliance Check</div>
    </div>
    <div>
      <div>Principal Architect / Consultant SEOR</div>
      <div style="color: #64748b;">${sub.reviewed_by || 'Awaiting Formal Action'}</div>
      <div class="sig">ISO 19650 Approval Stamp</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedSubmittal) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        LOADING TECHNICAL SUBMITTALS &amp; ISO 19650 APPROVAL DESK...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Technical Submittal Desk · ISO 19650-2 / FIDIC Clause 4.10</span>
              <span>·</span>
              <span className="text-zinc-400">{project.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Joinery, Finish &amp; Material Submittals
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Strict 14-day statutory review cycle. Shop drawings, swatch sample boards, and mix designs must receive digital Code A/B seal prior to site fabrication or procurement release.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintSubmittal(selectedSubmittal)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Transmittal (MAR)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmittalNo(`SUB-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Material / Drawing</span>
            </button>
          </div>
        </div>

        {/* 4 PRIMARY METRIC GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Submittals</span>
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {summary.total} Items
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">In technical register</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Approved &amp; Cleared (Code A/B)</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {summary.approved} Approved
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Authorized for site deployment</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Pending Review Window</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-400 mt-2">
              {summary.pending} In-Flight
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Within active 14-day SLA window</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Revise &amp; Resubmit (Code C/D)</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-rose-400 mt-2">
              {summary.rejected} Held
            </div>
            <div className="text-[11px] text-rose-500/80 mt-1">Non-compliant with specification</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & STATUS TABS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All (${submittals.length})` },
              { key: "PENDING_REVIEW", label: "Pending Review" },
              { key: "CODE_A_APPROVED", label: "Code A (Approved)" },
              { key: "CODE_B_APPROVED_AS_NOTED", label: "Code B (Noted)" },
              { key: "CODE_C_REVISE_RESUBMIT", label: "Code C (Revise)" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterCode(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition ${
                  filterCode === tab.key
                    ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search submittal ref, brand, spec..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: SUBMITTAL LIST (7 cols) vs REVIEW ACTION DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: SUBMITTAL REGISTER (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Technical Log
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Submittal Tracking Schedule</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredSubmittals.length} Items</span>
            </div>

            <div className="space-y-3">
              {filteredSubmittals.map((sub) => {
                const isSelected = selectedSubmittal.id === sub.id;
                const isApproved = sub.review_code === "CODE_A_APPROVED";
                const isNoted = sub.review_code === "CODE_B_APPROVED_AS_NOTED";
                const isRevise = sub.review_code === "CODE_C_REVISE_RESUBMIT";

                return (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubmittal(sub)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/50 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {sub.submittal_number}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-cyan-300 font-mono font-bold">
                          {sub.revision}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isApproved
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : isNoted
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                            : isRevise
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {sub.review_code.replace(/_/g, " ")}
                        </span>
                      </div>

                      <span className="text-[11px] font-mono text-zinc-400">
                        SLA: <strong className="text-zinc-200">{sub.review_sla_deadline}</strong>
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-zinc-100">{sub.title}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">{sub.manufacturer_brand}</div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Trade: <strong className="text-zinc-300">{sub.contractor_name}</strong></span>
                      <span>Spec: <strong className="text-zinc-400">{sub.spec_section}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: REVIEW ACTION & CERTIFICATION PANE (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Consultant Review Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedSubmittal.submittal_number}</h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {selectedSubmittal.revision}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2 text-xs font-mono">
              <span className="text-[10px] uppercase text-zinc-500 block">Submittal Title:</span>
              <strong className="text-white text-sm font-sans block leading-snug">{selectedSubmittal.title}</strong>
              <div className="text-cyan-400 text-[11px]">{selectedSubmittal.spec_section}</div>
              <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2 text-[11px]">
                <div>Brand: <strong className="text-zinc-200">{selectedSubmittal.manufacturer_brand}</strong></div>
                <div>Submitted: <strong className="text-zinc-200">{selectedSubmittal.submission_date}</strong></div>
              </div>
            </div>

            {/* CONSULTANT REVIEW REMARKS */}
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Official Engineering Review Remarks:
              </span>
              <p className="text-zinc-300 font-sans text-xs leading-relaxed">
                {selectedSubmittal.consultant_remarks}
              </p>
              {selectedSubmittal.reviewed_by && (
                <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-emerald-400 font-mono">
                  Certified by: {selectedSubmittal.reviewed_by} on {new Date(selectedSubmittal.reviewed_at || "").toLocaleDateString("en-IN")}
                </div>
              )}
            </div>

            {/* CONSULTANT REVIEW ACTION BUTTONS */}
            {isConsultantOrArchitect && selectedSubmittal.review_code === "PENDING_REVIEW" ? (
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                  Select Action Code (FIDIC 4.10):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={actionInProgress === selectedSubmittal.id}
                    onClick={() =>
                      handleUpdateReview(
                        selectedSubmittal.id,
                        "CODE_A_APPROVED",
                        "Approved without exception. Meets all architectural specifications."
                      )
                    }
                    className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs font-mono transition shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Code A: Approved</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionInProgress === selectedSubmittal.id}
                    onClick={() =>
                      handleUpdateReview(
                        selectedSubmittal.id,
                        "CODE_B_APPROVED_AS_NOTED",
                        "Approved as noted. Contractor to incorporate specified comments without resubmission."
                      )
                    }
                    className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs font-mono transition shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Code B: As Noted</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={actionInProgress === selectedSubmittal.id}
                    onClick={() =>
                      handleUpdateReview(
                        selectedSubmittal.id,
                        "CODE_C_REVISE_RESUBMIT",
                        "Revise and resubmit. Critical dimensions or material properties deviate from specification."
                      )
                    }
                    className="p-2 rounded-xl bg-amber-500/20 border border-amber-800 text-amber-300 font-bold text-xs font-mono hover:bg-amber-500/30 transition"
                  >
                    Code C: Revise
                  </button>

                  <button
                    type="button"
                    disabled={actionInProgress === selectedSubmittal.id}
                    onClick={() =>
                      handleUpdateReview(
                        selectedSubmittal.id,
                        "CODE_D_REJECTED",
                        "Rejected. Non-compliant with contract technical requirements."
                      )
                    }
                    className="p-2 rounded-xl bg-rose-500/20 border border-rose-800 text-rose-300 font-bold text-xs font-mono hover:bg-rose-500/30 transition"
                  >
                    Code D: Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-center text-xs flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>Review Code Locked ({selectedSubmittal.review_code.replace(/_/g, " ")})</span>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              ISO 19650 Common Data Environment Review Protocol
            </div>
          </div>

        </div>

        {/* LOG NEW SUBMITTAL MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Submit Technical Material / Drawing (MAR)
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

              <form onSubmit={handleCreateSubmittal} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Submittal Ref</label>
                    <input
                      type="text"
                      required
                      value={submittalNo}
                      onChange={(e) => setSubmittalNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Revision</label>
                    <input
                      type="text"
                      required
                      value={rev}
                      onChange={(e) => setRev(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Item / Package Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Submittal Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as SubmittalType)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400"
                    >
                      <option value="MATERIAL_SAMPLE">Material Sample Board</option>
                      <option value="SHOP_DRAWING">Shop Drawing (GFC)</option>
                      <option value="PRODUCT_DATA">Product Data Sheet</option>
                      <option value="MIX_DESIGN_MOCKUP">Mix Design / Mockup</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Manufacturer / Brand</label>
                    <input
                      type="text"
                      required
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Trade Package</label>
                    <input
                      type="text"
                      required
                      value={tradePackage}
                      onChange={(e) => setTradePackage(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Contractor Entity</label>
                    <input
                      type="text"
                      required
                      value={contractor}
                      onChange={(e) => setContractor(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Specification Section</label>
                  <input
                    type="text"
                    required
                    value={specSection}
                    onChange={(e) => setSpecSection(e.target.value)}
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
                    disabled={actionInProgress === "creating"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit for Review</span>
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