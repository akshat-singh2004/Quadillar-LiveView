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
  Camera,
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
  Radio,
  Receipt,
  RefreshCw,
  Scale,
  Search,
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

export type SnagSeverity =
  | "COSMETIC_MINOR"
  | "FUNCTIONAL_MAJOR"
  | "CRITICAL_HANDOVER_BLOCKER";

export type SnagStatus =
  | "IDENTIFIED_OPEN"
  | "CONTRACTOR_RECTIFIED"
  | "SEOR_VERIFIED_CLOSED"
  | "DEFAULT_ESCALATED_NCR";

export type TocStatus =
  | "DRAFT_INSPECTION"
  | "PUNCH_LIST_PENDING"
  | "SUBSTANTIALLY_COMPLETED"
  | "TOC_ISSUED";

export interface SnagRecord {
  id: string;
  project_id: string;
  snag_number: string;
  toc_ref?: string | null;
  title: string;
  description: string;
  location_grid: string;
  linked_bim_guid?: string | null;
  trade_package: string;
  contractor_entity: string;
  severity: SnagSeverity;
  rectification_deadline: string;
  rectified_date?: string | null;
  status: SnagStatus;
  remedial_cost_estimate_inr: number;
  photo_evidence_url?: string | null;
  linked_ncr_code?: string | null;
  inspected_by: string;
  verified_by?: string | null;
  created_at?: string;
}

export interface TocRecord {
  id: string;
  project_id: string;
  toc_number: string;
  section_or_milestone: string;
  contractor_name: string;
  inspection_date: string;
  substantial_completion_date?: string | null;
  dlp_commencement_date?: string | null;
  dlp_expiry_date?: string | null;
  total_snags_logged: number;
  open_snags_count: number;
  status: TocStatus;
  consultant_signoff?: string | null;
  employer_signoff?: string | null;
  certified_at?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function normalizeSnag(d: any): SnagRecord {
  return {
    id: d?.id ?? `snag-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    snag_number: d?.snag_number ?? `SNG-${Date.now().toString().slice(-4)}`,
    toc_ref: d?.toc_ref ?? null,
    title: d?.title ?? "Defect observation logged.",
    description: d?.description ?? "Snag detail recorded during substantial completion walk-through.",
    location_grid: d?.location_grid ?? "Site Grid",
    linked_bim_guid: d?.linked_bim_guid ?? null,
    trade_package: d?.trade_package ?? "Finishes & Fit-Out",
    contractor_entity: d?.contractor_entity ?? "Executing Contractor",
    severity: (d?.severity as SnagSeverity) ?? "FUNCTIONAL_MAJOR",
    rectification_deadline: d?.rectification_deadline ?? new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    rectified_date: d?.rectified_date ?? null,
    status: (d?.status as SnagStatus) ?? "IDENTIFIED_OPEN",
    remedial_cost_estimate_inr: Number(d?.remedial_cost_estimate_inr ?? 0),
    photo_evidence_url: d?.photo_evidence_url ?? null,
    linked_ncr_code: d?.linked_ncr_code ?? null,
    inspected_by: d?.inspected_by ?? "Lead QA Inspector",
    verified_by: d?.verified_by ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

function normalizeToc(d: any): TocRecord {
  return {
    id: d?.id ?? `toc-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    toc_number: d?.toc_number ?? `TOC-${Date.now().toString().slice(-4)}`,
    section_or_milestone: d?.section_or_milestone ?? "Whole Works / Primary Structure",
    contractor_name: d?.contractor_name ?? "Main Contractor",
    inspection_date: d?.inspection_date ?? new Date().toISOString().slice(0, 10),
    substantial_completion_date: d?.substantial_completion_date ?? new Date().toISOString().slice(0, 10),
    dlp_commencement_date: d?.dlp_commencement_date ?? new Date().toISOString().slice(0, 10),
    dlp_expiry_date: d?.dlp_expiry_date ?? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    total_snags_logged: Number(d?.total_snags_logged ?? 0),
    open_snags_count: Number(d?.open_snags_count ?? 0),
    status: (d?.status as TocStatus) ?? "DRAFT_INSPECTION",
    consultant_signoff: d?.consultant_signoff ?? null,
    employer_signoff: d?.employer_signoff ?? null,
    certified_at: d?.certified_at ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalPunchListPage() {
  const { project, role, tier } = useActiveRole();
  const [snags, setSnags] = useState<SnagRecord[]>([]);
  const [tocs, setTocs] = useState<TocRecord[]>([]);
  const [selectedSnag, setSelectedSnag] = useState<SnagRecord | null>(null);
  const [selectedToc, setSelectedToc] = useState<TocRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"SNAGS" | "TOC">("SNAGS");
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [snagModalOpen, setSnagModalOpen] = useState(false);
  const [tocModalOpen, setTocModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Lead Consultant";
  const isConsultantOrDirector =
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleId === "RESIDENT_ENGINEER" ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("Director") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Lead") ||
    roleLabel.includes("Engineer");

  // Form State for Logging New Snag
  const [snagNo, setSnagNo] = useState(`SNG-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
  const [title, setTitle] = useState(
    tier === "RESIDENTIAL"
      ? "Master Bedroom Wardrobe Soft-Close Hinge Misalignment"
      : "Level 08 Staircase Fire Exit Door Smoke Seal Gasket Missing"
  );
  const [snagDesc, setSnagDesc] = useState(
    tier === "RESIDENTIAL"
      ? "Right-hand wardrobe shutter rubs against top shadow gap ceiling trim. Re-alignment and re-screwing required."
      : "Perimeter intumescent acoustic smoke seal missing along top transom of fire exit door shaft 02."
  );
  const [grid, setGrid] = useState(tier === "RESIDENTIAL" ? "First Floor / MB-02" : "Tower A / Level 08 / Stair 02");
  const [bimGuid, setBimGuid] = useState(tier === "RESIDENTIAL" ? "GUID-MB02-WARDROBE-01" : "GUID-TWR-LVL08-CORE-02");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Fire Services"
  );
  const [severity, setSeverity] = useState<SnagSeverity>("FUNCTIONAL_MAJOR");
  const [remedialCost, setRemedialCost] = useState<number>(tier === "RESIDENTIAL" ? 2500 : 15000);
  const [targetDeadline, setTargetDeadline] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );

  // Form State for Creating New TOC
  const [tocNo, setTocNo] = useState(`TOC-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-01`);
  const [milestoneSection, setMilestoneSection] = useState(
    tier === "RESIDENTIAL" ? "Apartment Handover & Fit-Out Substantial Completion" : "Tower A Superstructure & MEP Primary Handover"
  );
  const [tocContractor, setTocContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );

  const loadHandoverData = useCallback(async () => {
    try {
      const [{ data: snagData }, { data: tocData }] = await Promise.all([
        (supabase as any)
          .from("site_snag_punch_list")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("taking_over_certificates")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
      ]);

      if (snagData && snagData.length > 0) {
        const normalized = snagData.map((d: any) => normalizeSnag(d));
        setSnags(normalized);
        if (!selectedSnag) setSelectedSnag(normalized[0]);
      } else {
        const defaultSnags: SnagRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeSnag({
                  id: "sng-res-01",
                  project_id: projectId,
                  snag_number: "SNG-RES-014",
                  toc_ref: "TOC-RES-01",
                  title: "Master Bedroom Wardrobe Soft-Close Hinge Misalignment",
                  description: "Right-hand wardrobe shutter rubs against top shadow gap ceiling trim. Re-alignment and re-screwing required.",
                  location_grid: "First Floor / MB-02",
                  linked_bim_guid: "GUID-MB02-WARDROBE-01",
                  trade_package: "Custom Joinery & Millwork",
                  contractor_entity: "Royal Woodworks & Interiors",
                  severity: "FUNCTIONAL_MAJOR",
                  rectification_deadline: "2026-09-20",
                  status: "IDENTIFIED_OPEN",
                  remedial_cost_estimate_inr: 2500,
                  inspected_by: "Principal Architect",
                }),
                normalizeSnag({
                  id: "sng-res-02",
                  project_id: projectId,
                  snag_number: "SNG-RES-015",
                  toc_ref: "TOC-RES-01",
                  title: "Guest Bath Diverter Plate Silicone Grout Discoloration",
                  description: "Antifungal white silicone bead uneven around chrome escutcheon plate. Strip and reapply.",
                  location_grid: "Ground Floor / PB-01",
                  linked_bim_guid: "GUID-PB01-PLUMBING-02",
                  trade_package: "Plumbing & Sanitary",
                  contractor_entity: "Avadh MEP Solutions",
                  severity: "COSMETIC_MINOR",
                  rectification_deadline: "2026-09-18",
                  status: "CONTRACTOR_RECTIFIED",
                  remedial_cost_estimate_inr: 850,
                  inspected_by: "Lead QA Inspector",
                  verified_by: "Site Supervisor",
                }),
              ]
            : [
                normalizeSnag({
                  id: "sng-twr-01",
                  project_id: projectId,
                  snag_number: "SNG-TWR-104",
                  toc_ref: "TOC-TWR-01",
                  title: "Level 08 Fire Exit Smoke Seal Gasket Dislodged",
                  description: "Perimeter intumescent acoustic smoke seal missing along top transom of fire exit door shaft 02.",
                  location_grid: "Tower A / Level 08 / Stair 02",
                  linked_bim_guid: "GUID-TWR-LVL08-CORE-02",
                  trade_package: "Civil & Fire Services",
                  contractor_entity: "Narmada Concrete Works",
                  severity: "CRITICAL_HANDOVER_BLOCKER",
                  rectification_deadline: "2026-09-15",
                  status: "IDENTIFIED_OPEN",
                  remedial_cost_estimate_inr: 15000,
                  inspected_by: "Resident SEOR",
                }),
                normalizeSnag({
                  id: "sng-twr-02",
                  project_id: projectId,
                  snag_number: "SNG-TWR-102",
                  toc_ref: "TOC-TWR-01",
                  title: "Level 07 Core Lobby Skirting Tile Grout Voids",
                  description: "Tile grout missing over 4.5 meters of granite skirting along elevator lobby perimeter.",
                  location_grid: "Tower A / Level 07 / Core Lobby",
                  trade_package: "Finishes & Stonework",
                  contractor_entity: "Narmada Concrete Works",
                  severity: "COSMETIC_MINOR",
                  rectification_deadline: "2026-09-10",
                  rectified_date: "2026-09-08",
                  status: "SEOR_VERIFIED_CLOSED",
                  remedial_cost_estimate_inr: 3200,
                  inspected_by: "Finishes Engineer",
                  verified_by: "Resident SEOR",
                }),
              ];

        setSnags(defaultSnags);
        if (!selectedSnag) setSelectedSnag(defaultSnags[0]);
      }

      if (tocData && tocData.length > 0) {
        const normalizedToc = tocData.map((d: any) => normalizeToc(d));
        setTocs(normalizedToc);
        if (!selectedToc) setSelectedToc(normalizedToc[0]);
      } else {
        const defaultTocs: TocRecord[] = [
          normalizeToc({
            id: "toc-01",
            project_id: projectId,
            toc_number: tier === "RESIDENTIAL" ? "TOC-RES-01" : "TOC-TWR-01",
            section_or_milestone:
              tier === "RESIDENTIAL"
                ? "Substantial Completion of Apartment Interior Fit-Out & Joinery"
                : "Tower A Level 01 to Level 08 Substantial Structural Completion",
            contractor_name:
              tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works",
            inspection_date: "2026-09-12",
            substantial_completion_date: "2026-09-12",
            dlp_commencement_date: "2026-09-13",
            dlp_expiry_date: "2027-09-12",
            total_snags_logged: 2,
            open_snags_count: 1,
            status: "SUBSTANTIALLY_COMPLETED",
            consultant_signoff: tier === "RESIDENTIAL" ? "Principal Architect" : "Resident SEOR",
          }),
        ];
        setTocs(defaultTocs);
        if (!selectedToc) setSelectedToc(defaultTocs[0]);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedSnag, selectedToc, tier]);

  useEffect(() => {
    void loadHandoverData();

    const channel = supabase
      .channel(`handover_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_snag_punch_list" }, () => void loadHandoverData())
      .on("postgres_changes", { event: "*", schema: "public", table: "taking_over_certificates" }, () => void loadHandoverData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadHandoverData]);

  const summary = useMemo(() => {
    const totalSnags = snags.length;
    const openSnags = snags.filter(
      (s) => s.status === "IDENTIFIED_OPEN" || s.status === "CONTRACTOR_RECTIFIED"
    ).length;
    const criticalBlockers = snags.filter(
      (s) => s.severity === "CRITICAL_HANDOVER_BLOCKER" && s.status !== "SEOR_VERIFIED_CLOSED"
    ).length;
    const closedSnags = snags.filter((s) => s.status === "SEOR_VERIFIED_CLOSED").length;
    const readinessPct =
      totalSnags > 0 ? Math.round((closedSnags / totalSnags) * 100) : 100;

    return { totalSnags, openSnags, criticalBlockers, closedSnags, readinessPct };
  }, [snags]);

  const filteredSnags = useMemo(() => {
    return snags.filter((s) => {
      const matchSev = filterSeverity === "ALL" || s.severity === filterSeverity;
      const matchStat = filterStatus === "ALL" || s.status === filterStatus;
      const haystack = `${s.snag_number} ${s.title} ${s.location_grid} ${s.contractor_entity}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchSev && matchStat && matchSearch;
    });
  }, [snags, filterSeverity, filterStatus, search]);

  // Contractor Marks Snag Rectified
  const handleMarkRectified = async (snag: SnagRecord) => {
    setActionInProgress(`rectify_${snag.id}`);
    const updatePayload: Partial<SnagRecord> = {
      status: "CONTRACTOR_RECTIFIED",
      rectified_date: new Date().toISOString().slice(0, 10),
    };

    try {
      await (supabase as any)
        .from("site_snag_punch_list")
        .update(updatePayload)
        .eq("id", snag.id);
    } catch {
      // Local optimistic update
    }

    setSnags((prev) =>
      prev.map((s) => (s.id === snag.id ? ({ ...s, ...updatePayload } as SnagRecord) : s))
    );
    if (selectedSnag && selectedSnag.id === snag.id) {
      setSelectedSnag((prev) => (prev ? ({ ...prev, ...updatePayload } as SnagRecord) : null));
    }
    setActionInProgress(null);
  };

  // Consultant / SEOR Formally Closes Snag
  const handleVerifyCloseSnag = async (snag: SnagRecord) => {
    if (!isConsultantOrDirector) return;
    setActionInProgress(`close_${snag.id}`);

    const updatePayload: Partial<SnagRecord> = {
      status: "SEOR_VERIFIED_CLOSED",
      verified_by: roleLabel || "Resident SEOR",
    };

    try {
      await (supabase as any)
        .from("site_snag_punch_list")
        .update(updatePayload)
        .eq("id", snag.id);
    } catch {
      // Local optimistic update
    }

    setSnags((prev) =>
      prev.map((s) => (s.id === snag.id ? ({ ...s, ...updatePayload } as SnagRecord) : s))
    );
    if (selectedSnag && selectedSnag.id === snag.id) {
      setSelectedSnag((prev) => (prev ? ({ ...prev, ...updatePayload } as SnagRecord) : null));
    }

    setFeedbackMessage(`Snag ${snag.snag_number} verified and formally closed by ${roleLabel}.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Default Escalation into Quality NCR with Commercial Backcharge (FIDIC 11.4 / CPWD Cl. 17)
  const handleEscalateToNcr = async (snag: SnagRecord) => {
    if (!isConsultantOrDirector) return;
    setActionInProgress(`ncr_${snag.id}`);

    const ncrCode = `NCR-SNAG-${snag.snag_number}`;

    try {
      await (supabase as any).from("non_conformance_reports").insert([
        {
          project_id: projectId,
          ncr_code: ncrCode,
          ncr_number: ncrCode,
          title: `Contractor Default: Overdue Punch List Snag (${snag.title})`,
          structural_element: snag.location_grid,
          location_grid: snag.location_grid,
          trade_package: snag.trade_package,
          assigned_contractor: snag.contractor_entity,
          remediation_contractor: snag.contractor_entity,
          severity: "COMMERCIAL_BACKCHARGE",
          defect_category: "Contractor_Default_Abandonment",
          description: `Contractor failed to rectify snag ${snag.snag_number} within statutory deadline (${snag.rectification_deadline}). Remedial backcharge enforced per FIDIC Cl. 11.4 / CPWD Cl. 17.`,
          remedial_action_required: "Execute remedial rectification via third-party agency at contractor cost.",
          estimated_debit_inr: snag.remedial_cost_estimate_inr,
          backcharge_amount: snag.remedial_cost_estimate_inr,
          enforce_auto_debit: true,
          status: "OPEN_DEBIT_PENDING",
          issued_by: roleLabel || "Resident SEOR",
          issued_date: new Date().toISOString().slice(0, 10),
        },
      ]);

      const updatePayload: Partial<SnagRecord> = {
        status: "DEFAULT_ESCALATED_NCR",
        linked_ncr_code: ncrCode,
      };

      await (supabase as any)
        .from("site_snag_punch_list")
        .update(updatePayload)
        .eq("id", snag.id);

      setSnags((prev) =>
        prev.map((s) => (s.id === snag.id ? ({ ...s, ...updatePayload } as SnagRecord) : s))
      );
      if (selectedSnag && selectedSnag.id === snag.id) {
        setSelectedSnag((prev) => (prev ? ({ ...prev, ...updatePayload } as SnagRecord) : null));
      }

      setFeedbackMessage(`Overdue snag escalated to Commercial Backcharge NCR (${ncrCode}).`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch {
      setFeedbackMessage("Failed to escalate snag to NCR.");
      setTimeout(() => setFeedbackMessage(null), 4000);
    }

    setActionInProgress(null);
  };

  // Issue Official Taking-Over Certificate (TOC) & Unlock Retention Release
  const handleIssueToc = async (toc: TocRecord) => {
    if (!isConsultantOrDirector) return;
    setActionInProgress(`issue_toc_${toc.id}`);

    const updatePayload: Partial<TocRecord> = {
      status: "TOC_ISSUED",
      consultant_signoff: roleLabel || "Resident SEOR",
      employer_signoff: "Employer Project Director",
      certified_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("taking_over_certificates")
        .update(updatePayload)
        .eq("id", toc.id);
    } catch {
      // Local optimistic update
    }

    setTocs((prev) =>
      prev.map((t) => (t.id === toc.id ? ({ ...t, ...updatePayload } as TocRecord) : t))
    );
    if (selectedToc && selectedToc.id === toc.id) {
      setSelectedToc((prev) => (prev ? ({ ...prev, ...updatePayload } as TocRecord) : null));
    }

    setFeedbackMessage(`Taking-Over Certificate (${toc.toc_number}) issued! Unlocks Stage 1 (50%) Retention Release.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Create New Snag Entry
  const handleCreateSnag = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_snag");

    const newDbRecord: Omit<SnagRecord, "id"> = {
      project_id: projectId,
      snag_number: snagNo.trim(),
      toc_ref: tocs[0]?.toc_number || "TOC-01",
      title: title.trim(),
      description: snagDesc.trim(),
      location_grid: grid.trim(),
      linked_bim_guid: bimGuid.trim() || null,
      trade_package: tradePackage.trim(),
      contractor_entity: contractor.trim(),
      severity,
      rectification_deadline: targetDeadline,
      status: "IDENTIFIED_OPEN",
      remedial_cost_estimate_inr: Number(remedialCost),
      inspected_by: roleLabel || "QA Inspector",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("site_snag_punch_list")
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

    setSnagModalOpen(false);
    setActionInProgress(null);
  };

  // Create New TOC
  const handleCreateToc = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_toc");

    const newDbRecord: Omit<TocRecord, "id"> = {
      project_id: projectId,
      toc_number: tocNo.trim(),
      section_or_milestone: milestoneSection.trim(),
      contractor_name: tocContractor.trim(),
      inspection_date: new Date().toISOString().slice(0, 10),
      substantial_completion_date: new Date().toISOString().slice(0, 10),
      dlp_commencement_date: new Date().toISOString().slice(0, 10),
      dlp_expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      total_snags_logged: snags.length,
      open_snags_count: summary.openSnags,
      status: summary.criticalBlockers > 0 ? "PUNCH_LIST_PENDING" : "SUBSTANTIALLY_COMPLETED",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("taking_over_certificates")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeToc(data);
        setTocs((prev) => [normalized, ...prev]);
        setSelectedToc(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeToc({ ...newDbRecord, id: `toc-${Date.now()}` });
      setTocs((prev) => [fallback, ...prev]);
      setSelectedToc(fallback);
    }

    setTocModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory CPWD Appendix 20 / FIDIC TOC Printable Certificate
  const handlePrintToc = (toc: TocRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Taking-Over &amp; Substantial Completion Certificate — ${toc.toc_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .issued { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .pending { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · FIDIC Red Book Clause 10.1 / CPWD Appendix 20</div>
      <h1 class="title">Taking-Over &amp; Substantial Completion Certificate (TOC)</h1>
      <div class="meta">Certificate Ref: ${toc.toc_number} · Inspection Date: ${toc.inspection_date} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${toc.status === "TOC_ISSUED" ? "issued" : "pending"}">${toc.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Handover Section / Scope</th><td colspan="3"><strong>${toc.section_or_milestone}</strong></td></tr>
    <tr><th>Executing Main Contractor</th><td>${toc.contractor_name}</td><th>Defects Liability Period</th><td>12 Calendar Months</td></tr>
    <tr><th>Substantial Completion Date</th><td><strong>${toc.substantial_completion_date}</strong></td><th>DLP Expiration Milestone</th><td><strong>${toc.dlp_expiry_date}</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Engineer's Handover Determination &amp; Legal Declaration</div>
    <div>In accordance with FIDIC Red Book Clause 10.1 and CPWD Works Manual Appendix 20, it is certified that the referenced Works have been inspected, tested, and substantially completed in accordance with the contract specifications. The Employer assumes physical possession and operational risk. Attached Punch List snags must be rectified within the stipulated SLAs.</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Snag Ref</th>
        <th>Defect Observation</th>
        <th>Location Grid</th>
        <th>Severity</th>
        <th>Rectification SLA</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${snags
        .map(
          (s) => `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${s.snag_number}</td>
          <td>${s.title}</td>
          <td>${s.location_grid}</td>
          <td style="font-weight: bold; color: ${s.severity === "CRITICAL_HANDOVER_BLOCKER" ? "#b91c1c" : "#09090b"};">${s.severity.replace(/_/g, " ")}</td>
          <td>${s.rectification_deadline}</td>
          <td><strong>${s.status.replace(/_/g, " ")}</strong></td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>Main Contractor Project Manager</div>
      <div style="color: #64748b;">${toc.contractor_name}</div>
      <div class="sig">Contractor Acceptance</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">${toc.consultant_signoff || "Inspection Certified"}</div>
      <div class="sig">Engineer Certification Seal</div>
    </div>
    <div>
      <div>Employer Project Director</div>
      <div style="color: #64748b;">${toc.employer_signoff || "Possession Authorized"}</div>
      <div class="sig">Employer Handover Sanction</div>
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
        INITIALIZING PUNCH LIST SNAG REGISTER &amp; TAKING-OVER CLEARINGHOUSE...
      </div>
    );
  }

  const isClosed = selectedSnag.status === "SEOR_VERIFIED_CLOSED";
  const isRectified = selectedSnag.status === "CONTRACTOR_RECTIFIED";
  const isNcrEscalated = selectedSnag.status === "DEFAULT_ESCALATED_NCR";
  const isOverdue =
    (selectedSnag.status === "IDENTIFIED_OPEN" || selectedSnag.status === "CONTRACTOR_RECTIFIED") &&
    selectedSnag.rectification_deadline < new Date().toISOString().slice(0, 10);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Handover &middot; FIDIC Cl. 10.1 &amp; 11.4 / CPWD Works Manual Appendix 20</span>
              <span>&middot;</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Taking-Over Certificates &amp; Punch List Snag Register
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Substantial completion and defects clearance clearinghouse. Unrectified snags escalate to commercial backcharge NCRs, while certified Taking-Over Certificates (TOC) unlock Stage 1 retention escrow releases.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === "TOC" && selectedToc ? (
              <button
                type="button"
                onClick={() => handlePrintToc(selectedToc)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Taking-Over Certificate</span>
              </button>
            ) : null}

            <Link
              href="/finance/retention-ledger"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Coins className="w-3.5 h-3.5 text-rose-400" />
              <span>Retention Escrow</span>
            </Link>

            {activeTab === "SNAGS" ? (
              <button
                type="button"
                onClick={() => {
                  setSnagNo(`SNG-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
                  setSnagModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
              >
                <Plus className="w-4 h-4" />
                <span>Log Punch List Snag</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setTocModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-emerald-950/50 font-mono"
              >
                <Plus className="w-4 h-4" />
                <span>Issue Taking-Over Certificate</span>
              </button>
            )}
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
              <span>Handover Readiness</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-cyan-300 mt-2">
              {summary.readinessPct}% Cleared
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">{summary.closedSnags} of {summary.totalSnags} snags sealed</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Critical Handover Blockers</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold font-mono mt-2 ${summary.criticalBlockers > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {summary.criticalBlockers} Blockers
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Stops Taking-Over Certificate issuance</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Outstanding Punch Items</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-400 mt-2">
              {summary.openSnags} Pending
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">In contractor rectification SLA</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Taking-Over Certificates</span>
              <FileCheck className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {tocs.length} Section(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Managed under FIDIC Clause 10.1</div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("SNAGS")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeTab === "SNAGS"
                ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Punch List Snag Register ({snags.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("TOC")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeTab === "TOC"
                ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Taking-Over Certificates (TOC) ({tocs.length})</span>
          </button>
        </div>

        {/* TAB 1: PUNCH LIST SNAG REGISTER */}
        {activeTab === "SNAGS" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT: SNAG ROSTER (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    Substantial Completion Defect Docket
                  </span>
                  <h2 className="text-sm font-bold text-white mt-0.5">Punch List Observations</h2>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-cyan-400 font-mono"
                  >
                    <option value="ALL">All Severities</option>
                    <option value="CRITICAL_HANDOVER_BLOCKER">Critical Blocker</option>
                    <option value="FUNCTIONAL_MAJOR">Functional Major</option>
                    <option value="COSMETIC_MINOR">Cosmetic Minor</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {filteredSnags.map((snag) => {
                  const isSelected = selectedSnag.id === snag.id;
                  const isBlocker = snag.severity === "CRITICAL_HANDOVER_BLOCKER";
                  const isClosedSnag = snag.status === "SEOR_VERIFIED_CLOSED";
                  const isSnagOverdue =
                    (snag.status === "IDENTIFIED_OPEN" || snag.status === "CONTRACTOR_RECTIFIED") &&
                    snag.rectification_deadline < new Date().toISOString().slice(0, 10);

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
                            {snag.snag_number}
                          </span>
                          <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                            isBlocker
                              ? "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                              : snag.severity === "FUNCTIONAL_MAJOR"
                              ? "bg-amber-950 text-amber-400 border border-amber-800/50"
                              : "bg-zinc-800 text-zinc-300"
                          }`}>
                            {snag.severity.replace(/_/g, " ")}
                          </span>
                          <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                            isClosedSnag
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                              : snag.status === "CONTRACTOR_RECTIFIED"
                              ? "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                              : isSnagOverdue
                              ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                              : "bg-amber-950 text-amber-400 border border-amber-800/50"
                          }`}>
                            {snag.status.replace(/_/g, " ")}
                          </span>
                        </div>

                        <span className={`text-xs font-mono font-bold ${isSnagOverdue ? "text-rose-400" : "text-zinc-400"}`}>
                          Due: {snag.rectification_deadline} {isSnagOverdue && "[OVERDUE]"}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-white">{snag.title}</div>
                        <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{snag.description}</div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                        <span>Location: <strong className="text-zinc-300">{snag.location_grid}</strong></span>
                        <span>Vendor: <strong className="text-zinc-300">{snag.contractor_entity}</strong></span>
                        <span>Remedial Est: <strong className="text-rose-400">{formatInr(snag.remedial_cost_estimate_inr)}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: SNAG CLEARANCE & DEFAULT ESCALATION DESK (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
              <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    Defect Verification Desk
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{selectedSnag.snag_number}</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  isClosed
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                    : "bg-amber-950 text-amber-400 border border-amber-800/50"
                }`}>
                  {selectedSnag.status.replace(/_/g, " ")}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase block">Snag Observation:</span>
                  <strong className="text-white text-sm font-sans block mt-0.5">{selectedSnag.title}</strong>
                </div>

                <div className="pt-2 border-t border-zinc-800/60">
                  <span className="text-zinc-500 text-[10px] uppercase block">Factual Defect Description:</span>
                  <p className="text-zinc-200 font-sans text-xs mt-1 leading-relaxed">{selectedSnag.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                  <div>
                    <span className="text-zinc-500 block">Location Grid:</span>
                    <span className="text-cyan-300 font-bold">{selectedSnag.location_grid}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Subcontractor:</span>
                    <span className="text-white font-sans">{selectedSnag.contractor_entity}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                  <div>
                    <span className="text-zinc-500 block">Rectification SLA:</span>
                    <span className={isOverdue ? "text-rose-400 font-bold" : "text-zinc-200"}>
                      {selectedSnag.rectification_deadline}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Remedial Backcharge Est:</span>
                    <span className="text-rose-400 font-bold font-mono">{formatInr(selectedSnag.remedial_cost_estimate_inr)}</span>
                  </div>
                </div>
              </div>

              {/* BIM GUID BINDING CALLOUT */}
              {selectedSnag.linked_bim_guid && (
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="font-bold text-white block">Bound 4D BIM Component</span>
                      <span className="text-[10px] text-zinc-400">{selectedSnag.linked_bim_guid}</span>
                    </div>
                  </div>
                  <Link href="/site/digital-twin" className="text-xs text-cyan-400 underline font-mono">
                    View in Model &rarr;
                  </Link>
                </div>
              )}

              {/* ACTION STAGE BUTTONS */}
              <div className="space-y-2 pt-1 border-t border-zinc-800">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                  Defect Clearance Stage Gate:
                </span>

                {/* Action 1: Contractor Marks Rectified */}
                {!isRectified && !isClosed && (
                  <button
                    type="button"
                    disabled={actionInProgress === `rectify_${selectedSnag.id}`}
                    onClick={() => handleMarkRectified(selectedSnag)}
                    className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Defect Rectified (Contractor Handshake)</span>
                  </button>
                )}

                {/* Action 2: Consultant Final Verify & Close */}
                {isRectified && !isClosed && (
                  <button
                    type="button"
                    disabled={!isConsultantOrDirector || actionInProgress === `close_${selectedSnag.id}`}
                    onClick={() => handleVerifyCloseSnag(selectedSnag)}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Rectification &amp; Seal Snag Closed (SEOR)</span>
                  </button>
                )}

                {/* Action 3: Overdue Default Escalation to Commercial NCR */}
                {isOverdue && !isClosed && !isNcrEscalated && (
                  <button
                    type="button"
                    disabled={!isConsultantOrDirector || actionInProgress === `ncr_${selectedSnag.id}`}
                    onClick={() => handleEscalateToNcr(selectedSnag)}
                    className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 font-mono shadow-md shadow-rose-950/50 disabled:opacity-50"
                  >
                    <AlertOctagon className="w-4 h-4" />
                    <span>Escalate Default: Issue Commercial NCR Backcharge</span>
                  </button>
                )}

                {isNcrEscalated && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 font-mono text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-rose-200">
                      <AlertOctagon className="w-4 h-4 text-rose-400" />
                      <span>ESCALATED TO COMMERCIAL BACKCHARGE</span>
                    </div>
                    <div className="text-[10px] text-zinc-300 font-sans">
                      Deduction of {formatInr(selectedSnag.remedial_cost_estimate_inr)} enforced against contractor RA Bill under {selectedSnag.linked_ncr_code}.
                    </div>
                  </div>
                )}

                {isClosed && (
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-center text-xs space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Snag Formally Rectified &amp; Closed</span>
                    </div>
                    <div className="text-[10px]">Verified by {selectedSnag.verified_by || "Resident SEOR"}</div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
                FIDIC Clause 10.1 &amp; CPWD Appendix 20 Handover Protocol
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: TAKING-OVER CERTIFICATES (TOC) */}
        {activeTab === "TOC" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT: TOC LISTING (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <div className="border-b border-zinc-800/80 pb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Statutory Completion Milestones (FIDIC 10.1)
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Taking-Over Certificates Register</h2>
              </div>

              <div className="space-y-3">
                {tocs.map((toc) => {
                  const isSelected = selectedToc?.id === toc.id;
                  const isIssued = toc.status === "TOC_ISSUED";

                  return (
                    <div
                      key={toc.id}
                      onClick={() => setSelectedToc(toc)}
                      className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                        isSelected
                          ? "border-emerald-500/60 bg-emerald-950/20 shadow-lg shadow-emerald-950/30"
                          : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white">
                            {toc.toc_number}
                          </span>
                          <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                            isIssued
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                              : "bg-amber-950 text-amber-400 border border-amber-800/50"
                          }`}>
                            {toc.status.replace(/_/g, " ")}
                          </span>
                        </div>

                        <span className="text-xs font-mono text-zinc-400">
                          Inspection: {toc.inspection_date}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-white">{toc.section_or_milestone}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">Contractor: {toc.contractor_name}</div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                        <span>DLP: <strong className="text-zinc-300">{toc.dlp_commencement_date} &rarr; {toc.dlp_expiry_date}</strong></span>
                        <span>Open Snags: <strong className={summary.criticalBlockers > 0 ? "text-rose-400" : "text-emerald-400"}>{summary.openSnags} Pending</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: TOC ISSUANCE & RETENTION INTERLOCK DESK (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
              {selectedToc ? (
                <>
                  <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                        Completion Certificate Sanction
                      </span>
                      <h3 className="text-sm font-bold text-white mt-0.5">{selectedToc.toc_number}</h3>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      selectedToc.status === "TOC_ISSUED"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                        : "bg-amber-950 text-amber-400 border border-amber-800/50"
                    }`}>
                      {selectedToc.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
                    <div>
                      <span className="text-zinc-500 text-[10px] uppercase block">Handover Milestone:</span>
                      <strong className="text-white text-sm font-sans block mt-0.5">{selectedToc.section_or_milestone}</strong>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                      <div>
                        <span className="text-zinc-500 block">Substantial Completion:</span>
                        <span className="text-white font-bold">{selectedToc.substantial_completion_date}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">DLP Expiration:</span>
                        <span className="text-cyan-300 font-bold">{selectedToc.dlp_expiry_date}</span>
                      </div>
                    </div>
                  </div>

                  {/* RETENTION STAGE 1 INTERLOCK CALLOUT */}
                  <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-emerald-400 font-bold">
                      <span>Retention Escrow Interlock</span>
                      <Coins className="w-4 h-4" />
                    </div>
                    <p className="text-zinc-300 font-sans text-xs leading-relaxed pt-1">
                      Issuing this certificate confirms substantial completion and automatically authorizes the release of Stage 1 (50%) Retention Money Escrow in the commercial ledger.
                    </p>
                  </div>

                  {/* ISSUANCE BUTTON */}
                  <div className="space-y-2 pt-1 border-t border-zinc-800">
                    {selectedToc.status !== "TOC_ISSUED" ? (
                      <button
                        type="button"
                        disabled={summary.criticalBlockers > 0 || !isConsultantOrDirector || actionInProgress === `issue_toc_${selectedToc.id}`}
                        onClick={() => handleIssueToc(selectedToc)}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Issue Taking-Over Certificate (TOC)</span>
                      </button>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs space-y-1">
                        <div className="font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Taking-Over Certificate Issued &bull; DLP Active</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-sans">
                          Sanctioned by {selectedToc.consultant_signoff || "Resident SEOR"} on {selectedToc.certified_at ? new Date(selectedToc.certified_at).toLocaleDateString("en-IN") : "Today"}
                        </div>
                      </div>
                    )}

                    {summary.criticalBlockers > 0 && (
                      <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 font-mono text-xs text-center">
                        TOC locked: {summary.criticalBlockers} critical blocker snag(s) must be resolved first.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-20 text-center text-xs font-mono text-zinc-500">
                  SELECT A TAKING-OVER CERTIFICATE TO REVIEW
                </div>
              )}
            </div>

          </div>
        )}

        {/* LOG NEW SNAG MODAL */}
        {snagModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Log Punch List Snag
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSnagModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSnag} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Snag Ref</label>
                    <input
                      type="text"
                      required
                      value={snagNo}
                      onChange={(e) => setSnagNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Severity Level</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as SnagSeverity)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="COSMETIC_MINOR">Cosmetic Minor</option>
                      <option value="FUNCTIONAL_MAJOR">Functional Major</option>
                      <option value="CRITICAL_HANDOVER_BLOCKER">Critical Handover Blocker</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Snag Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Factual Defect Description</label>
                  <textarea
                    rows={2}
                    required
                    value={snagDesc}
                    onChange={(e) => setSnagDesc(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
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
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Linked BIM GUID</label>
                    <input
                      type="text"
                      value={bimGuid}
                      onChange={(e) => setBimGuid(e.target.value)}
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Rectification Deadline</label>
                    <input
                      type="date"
                      required
                      value={targetDeadline}
                      onChange={(e) => setTargetDeadline(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Remedial Backcharge Est (₹)</label>
                    <input
                      type="number"
                      required
                      value={remedialCost}
                      onChange={(e) => setRemedialCost(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setSnagModalOpen(false)}
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
                    <span>Log Snag Entry</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ISSUE TOC MODAL */}
        {tocModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Prepare Taking-Over Certificate (FIDIC 10.1)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setTocModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateToc} className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">TOC Reference</label>
                  <input
                    type="text"
                    required
                    value={tocNo}
                    onChange={(e) => setTocNo(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Handover Section / Milestone</label>
                  <input
                    type="text"
                    required
                    value={milestoneSection}
                    onChange={(e) => setMilestoneSection(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-emerald-400 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Contractor Entity</label>
                  <input
                    type="text"
                    required
                    value={tocContractor}
                    onChange={(e) => setTocContractor(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-emerald-400 font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setTocModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === "creating_toc"}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-emerald-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Create TOC Milestone</span>
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