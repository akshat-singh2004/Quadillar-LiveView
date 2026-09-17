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
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Download,
  Eye,
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
  RefreshCw,
  Scale,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Unlock,
  Wrench,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type SubmittalType =
  | "MATERIAL_SAMPLE"
  | "SHOP_DRAWING"
  | "MIX_DESIGN"
  | "METHOD_STATEMENT"
  | "CALCULATION_REPORT";

export type SubmittalReviewCode =
  | "PENDING_REVIEW"
  | "CODE_A_APPROVED"
  | "CODE_B_APPROVED_AS_NOTED"
  | "CODE_C_REVISE_RESUBMIT"
  | "CODE_D_REJECTED";

export interface SubmittalRecord {
  id: string;
  project_id: string;
  submittal_number: string;
  title: string;
  submittal_type: SubmittalType;
  discipline: string;
  contractor_entity: string;
  trade_package: string;
  specification_clause?: string | null;
  manufacturer_brand: string;
  supplier_vendor: string;
  submission_date: string;
  review_deadline: string;
  review_code: SubmittalReviewCode;
  consultant_remarks?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  sample_mockup_submitted: boolean;
  test_reports_attached: boolean;
  compliance_statement_attached: boolean;
  linked_rfi_number?: string | null;
  created_at?: string;
}

function normalizeSubmittal(d: any): SubmittalRecord {
  const number = d?.submittal_number ?? `SUB-${Date.now().toString().slice(-4)}`;

  return {
    id: d?.id ?? `sub-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    submittal_number: number,
    title: d?.title ?? "Technical Submittal Logged",
    submittal_type: (d?.submittal_type as SubmittalType) ?? "MATERIAL_SAMPLE",
    discipline: d?.discipline ?? "Structural",
    contractor_entity: d?.contractor_entity ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    specification_clause: d?.specification_clause ?? null,
    manufacturer_brand: d?.manufacturer_brand ?? "Tender Approved Brand",
    supplier_vendor: d?.supplier_vendor ?? "Authorized Vendor",
    submission_date: d?.submission_date ?? new Date().toISOString().slice(0, 10),
    review_deadline: d?.review_deadline ?? new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    review_code: (d?.review_code as SubmittalReviewCode) ?? "PENDING_REVIEW",
    consultant_remarks: d?.consultant_remarks ?? null,
    reviewed_by: d?.reviewed_by ?? null,
    reviewed_at: d?.reviewed_at ?? null,
    sample_mockup_submitted: Boolean(d?.sample_mockup_submitted),
    test_reports_attached: Boolean(d?.test_reports_attached),
    compliance_statement_attached: Boolean(d?.compliance_statement_attached),
    linked_rfi_number: d?.linked_rfi_number ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalSubmittalsPage() {
  const { project, role, tier } = useActiveRole();
  const [submittals, setSubmittals] = useState<SubmittalRecord[]>([]);
  const [selectedSubmittal, setSelectedSubmittal] = useState<SubmittalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCode, setFilterCode] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Review desk remarks input
  const [remarks, setRemarks] = useState("");

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Lead Consultant";
  const isConsultantOrEngineer =
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleId === "RESIDENT_ENGINEER" ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Engineer") ||
    roleLabel.includes("Director") ||
    roleLabel.includes("Lead");

  // Form State for Creating New Submittal
  const [subNumber, setSubNumber] = useState(
    `MAR-${tier === "RESIDENTIAL" ? "INT" : "STR"}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [title, setTitle] = useState(
    tier === "RESIDENTIAL"
      ? "Action TESA 18mm Boilo Grade High-Density Moisture Resistant (HDHMR) Boards"
      : "UltraTech M40 Design Mix with Silica Fume & Polycarboxylate Superplasticizer"
  );
  const [subType, setSubType] = useState<SubmittalType>(
    tier === "RESIDENTIAL" ? "MATERIAL_SAMPLE" : "MIX_DESIGN"
  );
  const [discipline, setDiscipline] = useState(
    tier === "RESIDENTIAL" ? "Joinery & Millwork" : "Structural / Concrete"
  );
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [specClause, setSpecClause] = useState(
    tier === "RESIDENTIAL" ? "IS 1658:2006 / Specs Section 06400" : "IS 10262:2019 / IS 456 Cl. 10.2"
  );
  const [brand, setBrand] = useState(tier === "RESIDENTIAL" ? "Action TESA (Boilo Series)" : "UltraTech Cement Ltd");
  const [vendor, setVendor] = useState(tier === "RESIDENTIAL" ? "Royal Board Distributors" : "UltraTech Ready-Mix Plant");
  const [sampleSubmitted, setSampleSubmitted] = useState(true);
  const [testReportsAttached, setTestReportsAttached] = useState(true);
  const [complianceAttached, setComplianceAttached] = useState(true);

  const loadSubmittals = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("technical_submittals")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeSubmittal(d));
        setSubmittals(normalized);
        if (!selectedSubmittal) setSelectedSubmittal(normalized[0]);
      } else {
        const defaults: SubmittalRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeSubmittal({
                  id: "sub-res-01",
                  project_id: projectId,
                  submittal_number: "MAR-INT-008",
                  title: "Action TESA 18mm Boilo HDHMR Water-Resistant Core Substrate",
                  submittal_type: "MATERIAL_SAMPLE",
                  discipline: "Joinery & Millwork",
                  contractor_entity: "Royal Woodworks & Interiors",
                  trade_package: "Custom Joinery & Millwork",
                  specification_clause: "IS 1658:2006 / Spec 06400",
                  manufacturer_brand: "Action TESA Boilo Grade",
                  supplier_vendor: "Action TESA Distribution Ltd",
                  submission_date: "2026-08-25",
                  review_deadline: "2026-09-08",
                  review_code: "CODE_A_APPROVED",
                  consultant_remarks: "Approved for all modular kitchen and bedroom joinery carcass carcasses. Complies with 24-hr water boiling test.",
                  reviewed_by: "Principal Architect",
                  reviewed_at: "2026-09-01T14:00:00Z",
                  sample_mockup_submitted: true,
                  test_reports_attached: true,
                  compliance_statement_attached: true,
                }),
                normalizeSubmittal({
                  id: "sub-res-02",
                  project_id: projectId,
                  submittal_number: "MAR-PL-012",
                  title: "Astral SDR-11 CPVC Hot & Cold Water Supply Piping System",
                  submittal_type: "MATERIAL_SAMPLE",
                  discipline: "Plumbing & Sanitary",
                  contractor_entity: "Avadh MEP Solutions",
                  trade_package: "First-Fix Plumbing & Sanitary",
                  specification_clause: "IS 15778:2007 Class 1",
                  manufacturer_brand: "Astral Poly Technik Ltd",
                  supplier_vendor: "Astral Authorized Depot",
                  submission_date: "2026-09-04",
                  review_deadline: "2026-09-18",
                  review_code: "CODE_B_APPROVED_AS_NOTED",
                  consultant_remarks: "Approved. Solvent cement must be Astral approved heavy-duty fast-setting type only. Hydrostatic 10-bar test mandatory.",
                  reviewed_by: "Principal Architect",
                  reviewed_at: "2026-09-08T11:30:00Z",
                  sample_mockup_submitted: true,
                  test_reports_attached: true,
                  compliance_statement_attached: true,
                }),
                normalizeSubmittal({
                  id: "sub-res-03",
                  project_id: projectId,
                  submittal_number: "SD-CEIL-003",
                  title: "Living & Dining False Ceiling Shadow Gap Profile Detail Shop Drawing",
                  submittal_type: "SHOP_DRAWING",
                  discipline: "Architectural Finishes",
                  contractor_entity: "Royal Woodworks & Interiors",
                  trade_package: "Surface Finishes & Ceiling",
                  specification_clause: "Arch Ref GFC-INT-CEIL-01",
                  manufacturer_brand: "Saint-Gobain Gyproc / Metal Profiles",
                  supplier_vendor: "National Ceiling Supply",
                  submission_date: "2026-09-10",
                  review_deadline: "2026-09-24",
                  review_code: "PENDING_REVIEW",
                  sample_mockup_submitted: true,
                  test_reports_attached: false,
                  compliance_statement_attached: true,
                }),
              ]
            : [
                normalizeSubmittal({
                  id: "sub-twr-01",
                  project_id: projectId,
                  submittal_number: "MIX-STR-M40",
                  title: "M40 Grade Pumpable Concrete Mix Design with Fly Ash & Micro-Silica",
                  submittal_type: "MIX_DESIGN",
                  discipline: "Structural / Concrete",
                  contractor_entity: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  specification_clause: "IS 10262:2019 & IS 456 Table 5",
                  manufacturer_brand: "UltraTech RMC Concrete Plant",
                  supplier_vendor: "UltraTech Batching Facility #02",
                  submission_date: "2026-08-15",
                  review_deadline: "2026-08-29",
                  review_code: "CODE_A_APPROVED",
                  consultant_remarks: "Target mean strength 48.2 MPa approved. Slump retention of 140mm at 2 hours verified in laboratory trials.",
                  reviewed_by: "Resident SEOR",
                  reviewed_at: "2026-08-22T16:00:00Z",
                  sample_mockup_submitted: true,
                  test_reports_attached: true,
                  compliance_statement_attached: true,
                }),
                normalizeSubmittal({
                  id: "sub-twr-02",
                  project_id: projectId,
                  submittal_number: "MAR-STR-TMT500",
                  title: "Tata Tiscon 500D High-Yield Strength Deformed TMT Reinforcement Bars",
                  submittal_type: "MATERIAL_SAMPLE",
                  discipline: "Structural / Rebar",
                  contractor_entity: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  specification_clause: "IS 1786:2008 Fe500D Specs",
                  manufacturer_brand: "Tata Steel Ltd (Tata Tiscon)",
                  supplier_vendor: "SteelSpan India Pvt Ltd",
                  submission_date: "2026-08-18",
                  review_deadline: "2026-09-01",
                  review_code: "CODE_A_APPROVED",
                  consultant_remarks: "Primary mill test certificate compliant. Proof stress 528 N/mm² and elongation 18.5% satisfies seismic zone criteria.",
                  reviewed_by: "Resident SEOR",
                  reviewed_at: "2026-08-24T10:00:00Z",
                  sample_mockup_submitted: true,
                  test_reports_attached: true,
                  compliance_statement_attached: true,
                }),
                normalizeSubmittal({
                  id: "sub-twr-03",
                  project_id: projectId,
                  submittal_number: "SD-FACADE-009",
                  title: "Tower A Spider Glazing & 24mm DGU Glass Panel Structural Shop Drawings",
                  submittal_type: "SHOP_DRAWING",
                  discipline: "Building Enclosure",
                  contractor_entity: "Narmada Concrete Works",
                  trade_package: "Facade & Glazing",
                  specification_clause: "ASTM E1300 / IS 875 Part 3",
                  manufacturer_brand: "Saint-Gobain Solar Control DGU",
                  supplier_vendor: "GlassTech Facade Systems",
                  submission_date: "2026-09-08",
                  review_deadline: "2026-09-22",
                  review_code: "CODE_C_REVISE_RESUBMIT",
                  consultant_remarks: "Wind load deflection calculation for 2.4kPa suction exceeds H/200 on corner cantilever transoms. Recalculate with 8mm+12A+8mm glass build-up.",
                  reviewed_by: "Resident SEOR",
                  reviewed_at: "2026-09-12T17:00:00Z",
                  sample_mockup_submitted: false,
                  test_reports_attached: true,
                  compliance_statement_attached: false,
                }),
              ];

        setSubmittals(defaults);
        if (!selectedSubmittal) setSelectedSubmittal(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedSubmittal, tier]);

  useEffect(() => {
    void loadSubmittals();

    const channel = supabase
      .channel(`submittals_realtime_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "technical_submittals" }, () => void loadSubmittals())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadSubmittals]);

  const summary = useMemo(() => {
    const totalCount = submittals.length;
    const approvedCount = submittals.filter(
      (s) => s.review_code === "CODE_A_APPROVED" || s.review_code === "CODE_B_APPROVED_AS_NOTED"
    ).length;
    const rejectedCount = submittals.filter(
      (s) => s.review_code === "CODE_C_REVISE_RESUBMIT" || s.review_code === "CODE_D_REJECTED"
    ).length;
    const pendingCount = submittals.filter((s) => s.review_code === "PENDING_REVIEW").length;

    return { totalCount, approvedCount, rejectedCount, pendingCount };
  }, [submittals]);

  const filteredSubmittals = useMemo(() => {
    return submittals.filter((s) => {
      const matchCode = filterCode === "ALL" || s.review_code === filterCode;
      const matchType = filterType === "ALL" || s.submittal_type === filterType;
      const haystack = `${s.submittal_number} ${s.title} ${s.manufacturer_brand} ${s.contractor_entity}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchCode && matchType && matchSearch;
    });
  }, [submittals, filterCode, filterType, search]);

  // Consultant Review Stamp Action
  const handleReviewStamp = async (code: SubmittalReviewCode) => {
    if (!selectedSubmittal || !isConsultantOrEngineer) return;
    setActionInProgress(`review_${code}`);

    const updatePayload: Partial<SubmittalRecord> = {
      review_code: code,
      consultant_remarks: remarks.trim() || selectedSubmittal.consultant_remarks || "Reviewed per contract specification.",
      reviewed_by: roleLabel || "Resident SEOR",
      reviewed_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("technical_submittals")
        .update(updatePayload)
        .eq("id", selectedSubmittal.id);
    } catch {
      // Local optimistic update
    }

    setSubmittals((prev) =>
      prev.map((s) => (s.id === selectedSubmittal.id ? ({ ...s, ...updatePayload } as SubmittalRecord) : s))
    );
    setSelectedSubmittal((prev) => (prev ? ({ ...prev, ...updatePayload } as SubmittalRecord) : null));
    setRemarks("");
    setFeedbackMessage(`Submittal ${selectedSubmittal.submittal_number} endorsed with ${code.replace(/_/g, " ")}.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Create New Submittal Record
  const handleCreateSubmittal = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_submittal");

    const newDbRecord: Omit<SubmittalRecord, "id"> = {
      project_id: projectId,
      submittal_number: subNumber.trim(),
      title: title.trim(),
      submittal_type: subType,
      discipline: discipline.trim(),
      contractor_entity: contractor.trim(),
      trade_package: tradePackage.trim(),
      specification_clause: specClause.trim(),
      manufacturer_brand: brand.trim(),
      supplier_vendor: vendor.trim(),
      submission_date: new Date().toISOString().slice(0, 10),
      review_deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      review_code: "PENDING_REVIEW",
      sample_mockup_submitted: sampleSubmitted,
      test_reports_attached: testReportsAttached,
      compliance_statement_attached: complianceAttached,
    };

    try {
      const { data, error } = await (supabase as any)
        .from("technical_submittals")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeSubmittal(data);
        setSubmittals((prev) => [normalized, ...prev]);
        setSelectedSubmittal(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeSubmittal({ ...newDbRecord, id: `sub-${Date.now()}` });
      setSubmittals((prev) => [fallback, ...prev]);
      setSelectedSubmittal(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory CPWD / FIDIC Material Approval Request (MAR) Sheet Print
  const handlePrintMas = (sub: SubmittalRecord) => {
    const printWin = window.open("", "_blank", "width=1000,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Material Approval Request (MAR / MAS) — ${sub.submittal_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .code-a { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .code-b { background: #e0f2fe; color: #0369a1; border: 1px solid #0284c7; }
    .code-c { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD Section 3 / FIDIC Clause 4.1 &amp; 4.4</div>
      <h1 class="title">Technical Material Approval Request (MAR / MAS)</h1>
      <div class="meta">Submittal Ref: ${sub.submittal_number} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${sub.review_code.includes("APPROVED") ? "code-a" : sub.review_code.includes("REVISE") ? "code-c" : "code-b"}">
      ${sub.review_code.replace(/_/g, " ")}
    </span>
  </div>

  <table>
    <tr><th>Executing Contractor</th><td><strong>${sub.contractor_entity}</strong></td><th>Discipline &amp; Package</th><td>${sub.trade_package} (${sub.discipline})</td></tr>
    <tr><th>Manufacturer &amp; Brand</th><td><strong>${sub.manufacturer_brand}</strong></td><th>Supplier / Vendor</th><td>${sub.supplier_vendor}</td></tr>
    <tr><th>Specification Clause</th><td>${sub.specification_clause || "CPWD Standard Specs"}</td><th>Submittal Type</th><td><strong>${sub.submittal_type.replace(/_/g, " ")}</strong></td></tr>
    <tr><th>Submission Date</th><td>${sub.submission_date}</td><th>Review Due Date</th><td>${sub.review_deadline}</td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Material Description &amp; Technical Scope</div>
    <div>${sub.title}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Mandatory Technical Enclosure</th>
        <th>Standard Requirement</th>
        <th style="text-align: center;">Verification</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Physical Sample / Architectural Mock-Up Board</td>
        <td>Physical sample delivered to site engineer office</td>
        <td style="text-align: center; font-weight: bold; color: ${sub.sample_mockup_submitted ? "#15803d" : "#b91c1c"};">
          ${sub.sample_mockup_submitted ? "SUBMITTED & TAGGED" : "NOT SUBMITTED"}
        </td>
      </tr>
      <tr>
        <td>2. NABL Accredited Manufacturer Test Certificates (MTC)</td>
        <td>Batch chemical &amp; physical compliance testing reports</td>
        <td style="text-align: center; font-weight: bold; color: ${sub.test_reports_attached ? "#15803d" : "#b91c1c"};">
          ${sub.test_reports_attached ? "ATTACHED & VERIFIED" : "NOT ATTACHED"}
        </td>
      </tr>
      <tr>
        <td>3. Contractor Specification Compliance Statement</td>
        <td>Guarantee of compliance with tender contract specifications</td>
        <td style="text-align: center; font-weight: bold; color: ${sub.compliance_statement_attached ? "#15803d" : "#b91c1c"};">
          ${sub.compliance_statement_attached ? "SIGNED & CONCURRED" : "MISSING"}
        </td>
      </tr>
    </tbody>
  </table>

  <div class="box" style="background: ${sub.review_code.includes("APPROVED") ? "#f0fdf4" : "#fef2f2"}; border-color: ${sub.review_code.includes("APPROVED") ? "#86efac" : "#fca5a5"};">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: ${sub.review_code.includes("APPROVED") ? "#166534" : "#991b1b"}; margin-bottom: 4px;">
      Consultant Engineering Review Determination &amp; Endorsement
    </div>
    <div style="font-size: 12px; font-weight: 500;">
      ${sub.consultant_remarks || "Awaiting engineering review determination."}
    </div>
    ${sub.reviewed_at ? `<div style="margin-top: 6px; font-size: 10px; color: #64748b;">Reviewed on ${new Date(sub.reviewed_at).toLocaleDateString("en-IN")} by ${sub.reviewed_by}</div>` : ""}
  </div>

  <div class="footer">
    <div>
      <div>Contractor Quality Manager</div>
      <div style="color: #64748b;">${sub.contractor_entity}</div>
      <div class="sig">Contractor Submittal Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Principal Consultant</div>
      <div style="color: #64748b;">${sub.reviewed_by || "Pending Review"}</div>
      <div class="sig">Consultant Approval Stamp</div>
    </div>
    <div>
      <div>Stores / Security In-Charge</div>
      <div style="color: #64748b;">Gate Inward Pass Authorized</div>
      <div class="sig">Gate Verification Stamp</div>
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
        INITIALIZING TECHNICAL SUBMITTALS &amp; MATERIAL APPROVAL REGISTRY...
      </div>
    );
  }

  const isApproved =
    selectedSubmittal.review_code === "CODE_A_APPROVED" ||
    selectedSubmittal.review_code === "CODE_B_APPROVED_AS_NOTED";
  const isRejected =
    selectedSubmittal.review_code === "CODE_C_REVISE_RESUBMIT" ||
    selectedSubmittal.review_code === "CODE_D_REJECTED";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Engineering Governance · CPWD Section 3 / FIDIC Clause 4.1 &amp; 4.4</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Technical Submittals &amp; Material Approval (MAR)
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Pre-procurement quality stage-gate. Governs Code A/B/C/D engineering review stamps for material samples, shop drawings, and mix designs before site gate admission.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintMas(selectedSubmittal)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print MAR Dossier</span>
            </button>
            <Link
              href="/site/gate-inward"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Truck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Audit Gate Deliveries</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubNumber(`MAR-${tier === "RESIDENTIAL" ? "INT" : "STR"}-${Math.floor(100 + Math.random() * 900)}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Material Request (MAR)</span>
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
              <span>Total Submittals</span>
              <FileCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {summary.totalCount} Packages
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Managed under CPWD Section 3</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Approved for Site Inward</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {summary.approvedCount} Cleared
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Code A &amp; Code B endorsed</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Revise / Rejected</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold font-mono mt-2 ${summary.rejectedCount > 0 ? "text-rose-400" : "text-zinc-400"}`}>
              {summary.rejectedCount} Held
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Code C &amp; Code D non-compliant</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Pending Consultant Review</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-400 mt-2">
              {summary.pendingCount} In Queue
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Under 14-day SLA horizon</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All (${submittals.length})` },
              { key: "PENDING_REVIEW", label: `Review Queue (${summary.pendingCount})` },
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

          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Submittal Types</option>
              <option value="MATERIAL_SAMPLE">Material Sample (MAR)</option>
              <option value="SHOP_DRAWING">Shop Drawing</option>
              <option value="MIX_DESIGN">Concrete Mix Design</option>
              <option value="METHOD_STATEMENT">Method Statement</option>
              <option value="CALCULATION_REPORT">Calculation Report</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search submittal, brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: SUBMITTAL ROSTER (7 cols) vs REVIEW & ENDORSEMENT DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: SUBMITTAL LISTING (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Pre-Procurement Submittal Schedule
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Sample &amp; Drawing Log</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredSubmittals.length} Records</span>
            </div>

            <div className="space-y-3">
              {filteredSubmittals.map((sub) => {
                const isSelected = selectedSubmittal.id === sub.id;
                const isCodeA = sub.review_code === "CODE_A_APPROVED";
                const isCodeB = sub.review_code === "CODE_B_APPROVED_AS_NOTED";
                const isCodeC = sub.review_code === "CODE_C_REVISE_RESUBMIT";
                const isCodeD = sub.review_code === "CODE_D_REJECTED";

                return (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubmittal(sub)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {sub.submittal_number}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {sub.submittal_type.replace(/_/g, " ")}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isCodeA
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : isCodeB
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                            : isCodeC
                            ? "bg-amber-950 text-amber-400 border border-amber-800/50"
                            : isCodeD
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                            : "bg-zinc-800 text-zinc-400"
                        }`}>
                          {sub.review_code.replace(/_/g, " ")}
                        </span>
                      </div>

                      <span className="text-xs font-mono text-zinc-400">
                        Due: {sub.review_deadline}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{sub.title}</div>
                      <div className="text-xs text-cyan-400 font-mono mt-0.5">
                        Brand: {sub.manufacturer_brand} &bull; Vendor: {sub.supplier_vendor}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Vendor: <strong className="text-zinc-300">{sub.contractor_entity}</strong></span>
                      <span>Enclosures: <strong className="text-zinc-300">
                        {[
                          sub.sample_mockup_submitted ? "Sample" : null,
                          sub.test_reports_attached ? "MTC" : null,
                          sub.compliance_statement_attached ? "Compliance" : null,
                        ]
                          .filter(Boolean)
                          .join(", ") || "None"}
                      </strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: CONSULTANT REVIEW & ENDORSEMENT DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Consultant Review Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedSubmittal.submittal_number}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isApproved
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : isRejected
                  ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                  : "bg-amber-950 text-amber-400 border border-amber-800/50"
              }`}>
                {selectedSubmittal.review_code.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Material / Submittal Subject:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedSubmittal.title}</strong>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Manufacturer / Brand:</span>
                  <span className="text-white font-bold">{selectedSubmittal.manufacturer_brand}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Supplier / Vendor:</span>
                  <span className="text-zinc-200">{selectedSubmittal.supplier_vendor}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Specification Clause:</span>
                  <span className="text-cyan-300 font-bold">{selectedSubmittal.specification_clause || "Standard CPWD Specs"}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Subcontractor:</span>
                  <span className="text-zinc-200">{selectedSubmittal.contractor_entity}</span>
                </div>
              </div>
            </div>

            {/* MANDATORY TECHNICAL ENCLOSURES AUDIT */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Required Technical Enclosures Verification:
              </span>

              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span>Physical Mock-up / Sample Board:</span>
                  <span className={`font-bold ${selectedSubmittal.sample_mockup_submitted ? "text-emerald-400" : "text-rose-400"}`}>
                    {selectedSubmittal.sample_mockup_submitted ? "VERIFIED & TAGGED" : "MISSING"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span>Mill Test Certificates (MTC / NABL):</span>
                  <span className={`font-bold ${selectedSubmittal.test_reports_attached ? "text-emerald-400" : "text-rose-400"}`}>
                    {selectedSubmittal.test_reports_attached ? "ATTACHED" : "MISSING"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span>Specification Compliance Guarantee:</span>
                  <span className={`font-bold ${selectedSubmittal.compliance_statement_attached ? "text-emerald-400" : "text-rose-400"}`}>
                    {selectedSubmittal.compliance_statement_attached ? "SIGNED" : "MISSING"}
                  </span>
                </div>
              </div>
            </div>

            {/* EXISTING REMARKS / ENDORSEMENT TEXTAREA */}
            {selectedSubmittal.consultant_remarks ? (
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/50 space-y-1.5 font-mono text-xs">
                <div className="flex items-center justify-between text-cyan-300 font-bold">
                  <span>Consultant Endorsement &amp; Directives</span>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <p className="text-zinc-200 font-sans text-xs leading-relaxed pt-1">
                  {selectedSubmittal.consultant_remarks}
                </p>
                <div className="text-[10px] text-zinc-500 pt-1 border-t border-cyan-900/60">
                  Reviewed by {selectedSubmittal.reviewed_by} on {selectedSubmittal.reviewed_at ? new Date(selectedSubmittal.reviewed_at).toLocaleDateString("en-IN") : "Recorded"}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-zinc-400 text-xs font-mono">
                  Consultant Review Comments / Qualifications:
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Record mandatory testing conditions, batch limitations, or shop drawing notes..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white text-xs outline-none focus:border-cyan-400 font-sans resize-none"
                />
              </div>
            )}

            {/* CONSULTANT REVIEW STAMP ACTIONS */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Statutory Engineering Determination:
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!isConsultantOrEngineer || actionInProgress?.startsWith("review_")}
                  onClick={() => handleReviewStamp("CODE_A_APPROVED")}
                  className="py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1 font-mono disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Code A (Approved)</span>
                </button>

                <button
                  type="button"
                  disabled={!isConsultantOrEngineer || actionInProgress?.startsWith("review_")}
                  onClick={() => handleReviewStamp("CODE_B_APPROVED_AS_NOTED")}
                  className="py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1 font-mono disabled:opacity-50"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Code B (As Noted)</span>
                </button>

                <button
                  type="button"
                  disabled={!isConsultantOrEngineer || actionInProgress?.startsWith("review_")}
                  onClick={() => handleReviewStamp("CODE_C_REVISE_RESUBMIT")}
                  className="py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1 font-mono disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Code C (Revise)</span>
                </button>

                <button
                  type="button"
                  disabled={!isConsultantOrEngineer || actionInProgress?.startsWith("review_")}
                  onClick={() => handleReviewStamp("CODE_D_REJECTED")}
                  className="py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center gap-1 font-mono disabled:opacity-50"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Code D (Reject)</span>
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD Section 3 &amp; FIDIC Clause 4.1 Pre-Procurement Gate
            </div>
          </div>

        </div>

        {/* SUBMIT NEW MAR MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Submit Material Approval Request (MAR)
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
                      value={subNumber}
                      onChange={(e) => setSubNumber(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Submittal Type</label>
                    <select
                      value={subType}
                      onChange={(e) => setSubType(e.target.value as SubmittalType)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400"
                    >
                      <option value="MATERIAL_SAMPLE">Material Sample (MAR)</option>
                      <option value="SHOP_DRAWING">Shop Drawing</option>
                      <option value="MIX_DESIGN">Concrete Mix Design</option>
                      <option value="METHOD_STATEMENT">Method Statement</option>
                      <option value="CALCULATION_REPORT">Calculation Report</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Material / Package Description</label>
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
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Manufacturer / Brand</label>
                    <input
                      type="text"
                      required
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Supplier / Vendor</label>
                    <input
                      type="text"
                      required
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
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

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Specification Clause Reference</label>
                  <input
                    type="text"
                    required
                    value={specClause}
                    onChange={(e) => setSpecClause(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                  />
                </div>

                {/* ENCLOSURES TOGGLES */}
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-[11px] space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-200">
                    <input
                      type="checkbox"
                      checked={sampleSubmitted}
                      onChange={(e) => setSampleSubmitted(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-800 text-cyan-500 focus:ring-0"
                    />
                    <span>Physical Sample / Mock-up Delivered to Site Office</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-200">
                    <input
                      type="checkbox"
                      checked={testReportsAttached}
                      onChange={(e) => setTestReportsAttached(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-800 text-cyan-500 focus:ring-0"
                    />
                    <span>NABL Accredited Test Certificates (MTC) Attached</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-200">
                    <input
                      type="checkbox"
                      checked={complianceAttached}
                      onChange={(e) => setComplianceAttached(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-800 text-cyan-500 focus:ring-0"
                    />
                    <span>Signed Specification Compliance Guarantee Attached</span>
                  </label>
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
                    disabled={actionInProgress === "creating_submittal"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Transmit for Review</span>
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