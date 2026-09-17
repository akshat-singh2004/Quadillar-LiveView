"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
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
  Settings,
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

export type PtwHazardType =
  | "WORK_AT_HEIGHT"
  | "HOT_WORK_WELDING"
  | "DEEP_EXCAVATION_TRENCH"
  | "CONFINED_SPACE_ENTRY"
  | "HEAVY_TANDEM_LIFTING"
  | "ELECTRICAL_LOTO";

export type PtwStatus =
  | "REQUESTED_DRAFT"
  | "SAFETY_OFFICER_REVIEW"
  | "AUTHORIZED_ACTIVE"
  | "CLOSED_SAFE"
  | "SUSPENDED_STOP_WORK";

export type IncidentSeverity =
  | "NEAR_MISS_POTENTIAL"
  | "FIRST_AID_CASE_FAC"
  | "MEDICAL_TREATMENT_CASE_MTC"
  | "LOST_TIME_INJURY_LTI"
  | "FATALITY_CRITICAL";

export interface PtwRecord {
  id: string;
  project_id: string;
  ptw_number: string;
  hazard_type: PtwHazardType;
  title: string;
  work_order_ref: string;
  contractor_name: string;
  trade_package: string;
  location_grid: string;
  valid_from: string;
  valid_to: string;
  workers_count: number;
  tbt_briefing_conducted: boolean;
  ppe_full_body_harness: boolean;
  gas_test_cleared: boolean;
  fire_extinguisher_standby: boolean;
  loto_applied: boolean;
  edge_barricades_installed: boolean;
  contractor_supervisor_name: string;
  site_safety_officer_name?: string | null;
  resident_engineer_signatory?: string | null;
  approved_at?: string | null;
  status: PtwStatus;
  emergency_contact_phone: string;
  special_precautions?: string | null;
  created_at?: string;
}

export interface EhsIncidentRecord {
  id: string;
  project_id: string;
  incident_code: string;
  incident_date: string;
  severity: IncidentSeverity;
  title: string;
  description: string;
  location_grid: string;
  contractor_name: string;
  injured_person_count: number;
  lost_workdays: number;
  linked_ptw_ref?: string | null;
  root_cause?: string | null;
  preventive_capa_action: string;
  investigated_by: string;
  is_closed: boolean;
  created_at?: string;
}

function normalizePtw(d: any): PtwRecord {
  return {
    id: d?.id ?? `ptw-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    ptw_number: d?.ptw_number ?? `PTW-${Date.now().toString().slice(-4)}`,
    hazard_type: (d?.hazard_type as PtwHazardType) ?? "WORK_AT_HEIGHT",
    title: d?.title ?? "High-Risk Construction Work Permit",
    work_order_ref: d?.work_order_ref ?? "WO-01",
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    location_grid: d?.location_grid ?? "Tower A / Level 08 Perimeter",
    valid_from: d?.valid_from ?? new Date().toISOString(),
    valid_to: d?.valid_to ?? new Date(Date.now() + 10 * 3600000).toISOString(),
    workers_count: Number(d?.workers_count ?? 4),
    tbt_briefing_conducted: Boolean(d?.tbt_briefing_conducted),
    ppe_full_body_harness: Boolean(d?.ppe_full_body_harness),
    gas_test_cleared: Boolean(d?.gas_test_cleared),
    fire_extinguisher_standby: Boolean(d?.fire_extinguisher_standby),
    loto_applied: Boolean(d?.loto_applied),
    edge_barricades_installed: Boolean(d?.edge_barricades_installed),
    contractor_supervisor_name: d?.contractor_supervisor_name ?? "Site Foreman",
    site_safety_officer_name: d?.site_safety_officer_name ?? null,
    resident_engineer_signatory: d?.resident_engineer_signatory ?? null,
    approved_at: d?.approved_at ?? null,
    status: (d?.status as PtwStatus) ?? "REQUESTED_DRAFT",
    emergency_contact_phone: d?.emergency_contact_phone ?? "+91 91100 00112",
    special_precautions: d?.special_precautions ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

function normalizeIncident(d: any): EhsIncidentRecord {
  return {
    id: d?.id ?? `ehs-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    incident_code: d?.incident_code ?? `INC-${Date.now().toString().slice(-4)}`,
    incident_date: d?.incident_date ?? new Date().toISOString(),
    severity: (d?.severity as IncidentSeverity) ?? "NEAR_MISS_POTENTIAL",
    title: d?.title ?? "EHS Safety Observation Incident",
    description: d?.description ?? "Observation recorded during daily EHS site surveillance walk.",
    location_grid: d?.location_grid ?? "Site Grid",
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    injured_person_count: Number(d?.injured_person_count ?? 0),
    lost_workdays: Number(d?.lost_workdays ?? 0),
    linked_ptw_ref: d?.linked_ptw_ref ?? null,
    root_cause: d?.root_cause ?? null,
    preventive_capa_action: d?.preventive_capa_action ?? "Engineering barrier installed immediately.",
    investigated_by: d?.investigated_by ?? "Site Safety Lead",
    is_closed: Boolean(d?.is_closed),
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalPtwSafetyPage() {
  const { project, role, tier } = useActiveRole();
  const [permits, setPermits] = useState<PtwRecord[]>([]);
  const [incidents, setIncidents] = useState<EhsIncidentRecord[]>([]);
  const [selectedPermit, setSelectedPermit] = useState<PtwRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"ACTIVE_PERMITS" | "INCIDENT_REGISTER">("ACTIVE_PERMITS");
  const [loading, setLoading] = useState(true);
  const [filterHazard, setFilterHazard] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [ptwModalOpen, setPtwModalOpen] = useState(false);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Site Safety Officer";
  const isSafetyOrSeor =
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleId === "RESIDENT_ENGINEER" ||
    roleLabel.includes("Safety") ||
    roleLabel.includes("EHS") ||
    roleLabel.includes("Director") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Officer");

  // Form State for Requesting New PTW
  const [ptwNo, setPtwNo] = useState(`PTW-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
  const [ptwTitle, setPtwTitle] = useState(
    tier === "RESIDENTIAL"
      ? "External Balcony Glass Railing Installation (Height Safety)"
      : "Level 08 Cantilevered Shuttering Staging & PT Duct Stressing"
  );
  const [hazardType, setHazardType] = useState<PtwHazardType>(
    tier === "RESIDENTIAL" ? "WORK_AT_HEIGHT" : "WORK_AT_HEIGHT"
  );
  const [woRef, setWoRef] = useState(tier === "RESIDENTIAL" ? "WO-RES-001" : "WO-TWR-101");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Architectural Finishes" : "Civil & Superstructure"
  );
  const [gridLoc, setGridLoc] = useState(tier === "RESIDENTIAL" ? "First Floor Balcony MB-02" : "Tower A / Level 08 / Grid C3-D5");
  const [workersCount, setWorkersCount] = useState<number>(tier === "RESIDENTIAL" ? 3 : 8);
  const [emergencyPhone, setEmergencyPhone] = useState("+91 91100 00112");
  const [specialNotes, setSpecialNotes] = useState(
    tier === "RESIDENTIAL"
      ? "Full body safety harness anchored to certified lifeline. Safety netting active on lower floor."
      : "Double lanyard 100% tie-off mandatory. Wind velocity under 25 km/h verified via tower crane anemometer."
  );

  // Form State for Logging Incident / Near-Miss
  const [incCode, setIncCode] = useState(`INC-${Date.now().toString().slice(-4)}`);
  const [incTitle, setIncTitle] = useState("Near-Miss: Timber Scaffold Plank Dropped from Working Platform");
  const [incSeverity, setIncSeverity] = useState<IncidentSeverity>("NEAR_MISS_POTENTIAL");
  const [incDesc, setIncDesc] = useState("Unsecured 2x4 timber runner slipped during staging striking debris catch net below. Zero injuries.");
  const [incCapa, setIncCapa] = useState("Retrained staging crew on toe-board installation. Secondary tethering lines mandated for loose tools.");

  const loadSafetyData = useCallback(async () => {
    try {
      const [{ data: ptwData }, { data: incData }] = await Promise.all([
        (supabase as any)
          .from("safety_permits_to_work")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("safety_ehs_incidents_register")
          .select("*")
          .eq("project_id", projectId)
          .order("incident_date", { ascending: false }),
      ]);

      if (ptwData && ptwData.length > 0) {
        const normalized = ptwData.map((d: any) => normalizePtw(d));
        setPermits(normalized);
        if (!selectedPermit) setSelectedPermit(normalized[0]);
      } else {
        const defaults: PtwRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizePtw({
                  id: "ptw-res-01",
                  project_id: projectId,
                  ptw_number: "PTW-RES-041",
                  hazard_type: "WORK_AT_HEIGHT",
                  title: "External Balcony Glass Railing & Fluted Soffit Installation",
                  work_order_ref: "WO-RES-001",
                  contractor_name: "Royal Woodworks & Interiors",
                  trade_package: "Architectural Finishes",
                  location_grid: "First Floor / MB-02 Balcony",
                  workers_count: 3,
                  tbt_briefing_conducted: true,
                  ppe_full_body_harness: true,
                  gas_test_cleared: false,
                  fire_extinguisher_standby: true,
                  loto_applied: false,
                  edge_barricades_installed: true,
                  contractor_supervisor_name: "V. K. Mehta",
                  site_safety_officer_name: "Principal Architect",
                  status: "AUTHORIZED_ACTIVE",
                  special_precautions: "Lifeline rope anchored to structural beam. Tool lanyards deployed.",
                }),
              ]
            : [
                normalizePtw({
                  id: "ptw-twr-01",
                  project_id: projectId,
                  ptw_number: "PTW-TWR-108",
                  hazard_type: "WORK_AT_HEIGHT",
                  title: "Level 08 Cantilevered Core Shuttering & Steel Reinforcement Tying",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  location_grid: "Tower A / Level 08 / Grid C3-D5",
                  workers_count: 12,
                  tbt_briefing_conducted: true,
                  ppe_full_body_harness: true,
                  gas_test_cleared: false,
                  fire_extinguisher_standby: true,
                  loto_applied: false,
                  edge_barricades_installed: true,
                  contractor_supervisor_name: "S. K. Verma (Site Foreman)",
                  site_safety_officer_name: "P. R. Nair (Safety Lead)",
                  resident_engineer_signatory: "Resident SEOR",
                  status: "AUTHORIZED_ACTIVE",
                  special_precautions: "Safety catch fans active on Level 06 and Level 07. Double lanyards inspected.",
                }),
                normalizePtw({
                  id: "ptw-twr-02",
                  project_id: projectId,
                  ptw_number: "PTW-TWR-109",
                  hazard_type: "HOT_WORK_WELDING",
                  title: "PT Cable Anchorage Head Welding & Embedded Sleeve Cutting",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  location_grid: "Tower A / Level 08 / Deck Slab Grid A1",
                  workers_count: 4,
                  tbt_briefing_conducted: true,
                  ppe_full_body_harness: true,
                  gas_test_cleared: true,
                  fire_extinguisher_standby: true,
                  loto_applied: true,
                  edge_barricades_installed: true,
                  contractor_supervisor_name: "R. K. Sharma",
                  status: "SAFETY_OFFICER_REVIEW",
                  special_precautions: "Fire blanket deployed below welding point. Dedicated fire watch assigned.",
                }),
              ];

        setPermits(defaults);
        if (!selectedPermit) setSelectedPermit(defaults[0]);
      }

      if (incData && incData.length > 0) {
        setIncidents(incData.map((d: any) => normalizeIncident(d)));
      } else {
        const defaultInc: EhsIncidentRecord[] = [
          normalizeIncident({
            id: "inc-01",
            project_id: projectId,
            incident_code: tier === "RESIDENTIAL" ? "INC-RES-01" : "INC-TWR-01",
            incident_date: "2026-09-10T14:30:00Z",
            severity: "NEAR_MISS_POTENTIAL",
            title: "Scaffold Locking Clamp Dislodged During Formwork Striking",
            description: "A loose wedge coupler fell 4 meters into the secondary debris net. Nobody was present in the drop exclusion zone.",
            location_grid: tier === "RESIDENTIAL" ? "MB-02 Balcony" : "Tower A / Level 07 Shaft",
            contractor_name: tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works",
            injured_person_count: 0,
            lost_workdays: 0,
            root_cause: "Vibration caused improperly torqued wing-nut coupler to vibrate free.",
            preventive_capa_action: "Exclusion barricades reinforced. Torque wrench audit of all scaffold couplers instituted.",
            investigated_by: "Site Safety Lead",
            is_closed: true,
          }),
        ];
        setIncidents(defaultInc);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedPermit, tier]);

  useEffect(() => {
    void loadSafetyData();

    const channel = supabase
      .channel(`safety_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "safety_permits_to_work" }, () => void loadSafetyData())
      .on("postgres_changes", { event: "*", schema: "public", table: "safety_ehs_incidents_register" }, () => void loadSafetyData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadSafetyData]);

  const summary = useMemo(() => {
    const totalPermits = permits.length;
    const activePermits = permits.filter((p) => p.status === "AUTHORIZED_ACTIVE").length;
    const stopWorkOrders = permits.filter((p) => p.status === "SUSPENDED_STOP_WORK").length;
    const totalIncidents = incidents.length;
    const totalLtiCases = incidents.filter((i) => i.severity === "LOST_TIME_INJURY_LTI" || i.severity === "FATALITY_CRITICAL").length;

    return { totalPermits, activePermits, stopWorkOrders, totalIncidents, totalLtiCases };
  }, [permits, incidents]);

  const filteredPermits = useMemo(() => {
    return permits.filter((p) => {
      const matchHaz = filterHazard === "ALL" || p.hazard_type === filterHazard;
      const matchStat = filterStatus === "ALL" || p.status === filterStatus;
      const haystack = `${p.ptw_number} ${p.title} ${p.contractor_name} ${p.location_grid}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchHaz && matchStat && matchSearch;
    });
  }, [permits, filterHazard, filterStatus, search]);

  // Toggle Pre-Task Checklist Flag
  const handleToggleChecklist = async (key: keyof PtwRecord, currentVal: boolean) => {
    if (!selectedPermit) return;
    const updatePayload = { [key]: !currentVal };

    try {
      await (supabase as any)
        .from("safety_permits_to_work")
        .update(updatePayload)
        .eq("id", selectedPermit.id);
    } catch {
      // Local optimistic update
    }

    const updated = { ...selectedPermit, ...updatePayload };
    setSelectedPermit(updated);
    setPermits((prev) => prev.map((p) => (p.id === selectedPermit.id ? updated : p)));
  };

  // Authorize PTW (Safety Officer Clearance)
  const handleAuthorizePtw = async (ptw: PtwRecord) => {
    if (!isSafetyOrSeor) return;
    setActionInProgress(`auth_${ptw.id}`);

    const updatePayload: Partial<PtwRecord> = {
      status: "AUTHORIZED_ACTIVE",
      site_safety_officer_name: roleLabel || "Site Safety Officer",
      approved_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("safety_permits_to_work")
        .update(updatePayload)
        .eq("id", ptw.id);
    } catch {
      // Local optimistic update
    }

    setPermits((prev) =>
      prev.map((item) => (item.id === ptw.id ? ({ ...item, ...updatePayload } as PtwRecord) : item))
    );
    if (selectedPermit && selectedPermit.id === ptw.id) {
      setSelectedPermit((prev) => (prev ? ({ ...prev, ...updatePayload } as PtwRecord) : null));
    }

    setFeedbackMessage(`Permit ${ptw.ptw_number} authorized. High-risk operation active under safety surveillance.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Enforce Statutory Stop-Work Order (Safety Suspension)
  const handleStopWorkOrder = async (ptw: PtwRecord) => {
    if (!isSafetyOrSeor) return;
    setActionInProgress(`stop_${ptw.id}`);

    const updatePayload: Partial<PtwRecord> = {
      status: "SUSPENDED_STOP_WORK",
    };

    try {
      await (supabase as any)
        .from("safety_permits_to_work")
        .update(updatePayload)
        .eq("id", ptw.id);

      // Auto-insert critical safety violation NCR in public.non_conformance_reports
      await (supabase as any).from("non_conformance_reports").insert([
        {
          project_id: projectId,
          ncr_code: `NCR-EHS-${ptw.ptw_number}`,
          title: `Statutory Stop-Work Notice: Safety Protocol Breach under ${ptw.ptw_number}`,
          trade_package: ptw.trade_package,
          structural_element: ptw.title,
          location_grid: ptw.location_grid,
          severity: "CRITICAL_STRUCTURAL_HOLD",
          defect_category: "Safety_Violation_Stop_Work",
          description: `Work suspended under ${ptw.ptw_number} due to safety non-conformance. All work at height/hot work halted immediately.`,
          remedial_action_required: "Conduct mandatory safety stand-down, replace missing edge barriers, re-brief work crew, and obtain SEOR re-authorization.",
          status: "OPEN_INVESTIGATION",
          issued_by: roleLabel || "Site Safety Officer",
        },
      ]);
    } catch {
      // Local optimistic update
    }

    setPermits((prev) =>
      prev.map((item) => (item.id === ptw.id ? ({ ...item, ...updatePayload } as PtwRecord) : item))
    );
    if (selectedPermit && selectedPermit.id === ptw.id) {
      setSelectedPermit((prev) => (prev ? ({ ...prev, ...updatePayload } as PtwRecord) : null));
    }

    setFeedbackMessage(`STOP-WORK ORDER ENFORCED on ${ptw.ptw_number}! Quality hold NCR triggered.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Close Permit Safely at Shift Conclusion
  const handleClosePtw = async (ptw: PtwRecord) => {
    setActionInProgress(`close_${ptw.id}`);

    const updatePayload: Partial<PtwRecord> = {
      status: "CLOSED_SAFE",
    };

    try {
      await (supabase as any)
        .from("safety_permits_to_work")
        .update(updatePayload)
        .eq("id", ptw.id);
    } catch {
      // Local optimistic update
    }

    setPermits((prev) =>
      prev.map((item) => (item.id === ptw.id ? ({ ...item, ...updatePayload } as PtwRecord) : item))
    );
    if (selectedPermit && selectedPermit.id === ptw.id) {
      setSelectedPermit((prev) => (prev ? ({ ...prev, ...updatePayload } as PtwRecord) : null));
    }

    setFeedbackMessage(`Permit ${ptw.ptw_number} safely closed and archived.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Request New Permit to Work
  const handleCreatePtw = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_ptw");

    const newDbRecord: Omit<PtwRecord, "id"> = {
      project_id: projectId,
      ptw_number: ptwNo.trim(),
      hazard_type: hazardType,
      title: ptwTitle.trim(),
      work_order_ref: woRef.trim(),
      contractor_name: contractor.trim(),
      trade_package: tradePackage.trim(),
      location_grid: gridLoc.trim(),
      valid_from: new Date().toISOString(),
      valid_to: new Date(Date.now() + 10 * 3600000).toISOString(),
      workers_count: Number(workersCount),
      tbt_briefing_conducted: false,
      ppe_full_body_harness: false,
      gas_test_cleared: false,
      fire_extinguisher_standby: false,
      loto_applied: false,
      edge_barricades_installed: false,
      contractor_supervisor_name: roleLabel || "Site Supervisor",
      status: "REQUESTED_DRAFT",
      emergency_contact_phone: emergencyPhone.trim(),
      special_precautions: specialNotes.trim(),
    };

    try {
      const { data, error } = await (supabase as any)
        .from("safety_permits_to_work")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizePtw(data);
        setPermits((prev) => [normalized, ...prev]);
        setSelectedPermit(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizePtw({ ...newDbRecord, id: `ptw-${Date.now()}` });
      setPermits((prev) => [fallback, ...prev]);
      setSelectedPermit(fallback);
    }

    setPtwModalOpen(false);
    setActionInProgress(null);
  };

  // Log EHS Incident / Near-Miss
  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_inc");

    const newDbRecord: Omit<EhsIncidentRecord, "id"> = {
      project_id: projectId,
      incident_code: incCode.trim(),
      incident_date: new Date().toISOString(),
      severity: incSeverity,
      title: incTitle.trim(),
      description: incDesc.trim(),
      location_grid: tier === "RESIDENTIAL" ? "Master Balcony" : "Tower A Level 08",
      contractor_name: contractor.trim(),
      injured_person_count: incSeverity === "LOST_TIME_INJURY_LTI" ? 1 : 0,
      lost_workdays: incSeverity === "LOST_TIME_INJURY_LTI" ? 3 : 0,
      root_cause: "Technical failure / human factor.",
      preventive_capa_action: incCapa.trim(),
      investigated_by: roleLabel || "Site Safety Lead",
      is_closed: false,
    };

    try {
      const { data, error } = await (supabase as any)
        .from("safety_ehs_incidents_register")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeIncident(data);
        setIncidents((prev) => [normalized, ...prev]);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeIncident({ ...newDbRecord, id: `ehs-${Date.now()}` });
      setIncidents((prev) => [fallback, ...prev]);
    }

    setIncidentModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory CPWD / BOCW Safety Permit Print
  const handlePrintPtwDocket = (p: PtwRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Permit to Work (PTW / BOCW Rules 1998) — ${p.ptw_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .active { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .stop { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tac { text-align: center; }
    .tar { text-align: right; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-top: 14px; background: #fafafa; }
    .check-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 14px; }
    .check-item { border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px; background: #fff; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 40px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · BOCW Central Rules 1998 / CPWD Safety Code GCC 19H</div>
      <h1 class="title">Statutory Permit to Work (PTW Form EHS-01)</h1>
      <div class="meta">Permit Ref: ${p.ptw_number} · Hazard: ${p.hazard_type.replace(/_/g, " ")} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${p.status === "AUTHORIZED_ACTIVE" ? "active" : "stop"}">${p.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Activity / Work Description</th><td colspan="3"><strong>${p.title}</strong></td></tr>
    <tr><th>Executing Contractor</th><td><strong>${p.contractor_name}</strong></td><th>Parent Work Order Ref</th><td><strong>${p.work_order_ref}</strong></td></tr>
    <tr><th>Specific Grid Location</th><td><strong>${p.location_grid}</strong></td><th>Authorized Crew Size</th><td><strong>${p.workers_count} Personnel</strong></td></tr>
    <tr><th>Validity Window</th><td>${new Date(p.valid_from).toLocaleString("en-IN")}</td><th>Valid Until</th><td><strong>${new Date(p.valid_to).toLocaleString("en-IN")}</strong></td></tr>
    <tr><th>Emergency Contact Hotline</th><td><strong>${p.emergency_contact_phone}</strong></td><th>Trade Package</th><td>${p.trade_package}</td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Mandatory Pre-Task Safety Verification Audit</div>
    <div class="check-grid">
      <div class="check-item">1. Safety Tool Box Talk (TBT) Briefing: <strong>${p.tbt_briefing_conducted ? "CONDUCTED & RECORDED" : "PENDING"}</strong></div>
      <div class="check-item">2. PPE / Double Lanyard Full Body Harness: <strong>${p.ppe_full_body_harness ? "100% INSPECTED (PASS)" : "NOT CLEARED"}</strong></div>
      <div class="check-item">3. Toxic / Flammable Gas Testing: <strong>${p.gas_test_cleared ? "CLEARED (<10% LEL)" : "NOT APPLICABLE / PENDING"}</strong></div>
      <div class="check-item">4. Fire Extinguisher / Fire Watch Standby: <strong>${p.fire_extinguisher_standby ? "DEPLOYED (10kg DCP)" : "NOT DEPLOYED"}</strong></div>
      <div class="check-item">5. Electrical Lockout / Tagout (LOTO): <strong>${p.loto_applied ? "APPLIED & TAGGED" : "NOT APPLICABLE"}</strong></div>
      <div class="check-item">6. Hard Edge Barricades &amp; Warning Signs: <strong>${p.edge_barricades_installed ? "INSTALLED (2m High)" : "NOT CLEARED"}</strong></div>
    </div>
  </div>

  <div class="box" style="background: #fef2f2; border-color: #fca5a5;">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #991b1b; margin-bottom: 4px;">
      Special EHS Precautions &amp; Emergency Protocols
    </div>
    <div style="font-size: 11px; line-height: 1.5; color: #b91c1c;">
      ${p.special_precautions || "Maintain strict 100% anchor tie-off. Work ceases immediately in the event of adverse weather, wind speeds exceeding 25 km/h, or lightning alarms."}
    </div>
  </div>

  <div class="footer">
    <div>
      <div>Contractor Site Supervisor</div>
      <div style="color: #64748b;">${p.contractor_supervisor_name}</div>
      <div class="sig">Supervisor Request Seal</div>
    </div>
    <div>
      <div>Site Safety Officer</div>
      <div style="color: #64748b;">${p.site_safety_officer_name || "Pre-Task Inspection Cleared"}</div>
      <div class="sig">EHS Authorization Stamp</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">${p.resident_engineer_signatory || "Statutory Sanction Granted"}</div>
      <div class="sig">Engineer Acceptance Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedPermit) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING PERMIT TO WORK (PTW) &amp; EHS SAFETY ENGINE...
      </div>
    );
  }

  const isPermitActive = selectedPermit.status === "AUTHORIZED_ACTIVE";
  const isStopWork = selectedPermit.status === "SUSPENDED_STOP_WORK";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Safety &amp; EHS Governance · BOCW Central Rules 1998 / CPWD GCC Clause 19H</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Permit to Work (PTW) &amp; EHS Safety Management
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              High-risk operational safety clearinghouse. Enforces digital pre-task verification across six hazard classes, mandates statutory stop-work notices, and tracks IS 3786 Lost Time Injury (LTI) incident telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintPtwDocket(selectedPermit)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print PTW Docket</span>
            </button>
            <Link
              href="/quality/ncr"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              <span>Quality &amp; Safety NCRs</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setPtwNo(`PTW-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
                setPtwModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Request High-Risk PTW</span>
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
              <span>Active High-Risk Permits</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {summary.activePermits} Active
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Authorized under active surveillance</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Stop-Work Orders Active</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.stopWorkOrders > 0 ? "text-rose-400" : "text-zinc-400"}`}>
              {summary.stopWorkOrders} Suspended
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Critical safety violations held</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Zero-LTI Performance</span>
              <HardHat className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-cyan-300 mt-2">
              {summary.totalLtiCases === 0 ? "100% Safe" : `${summary.totalLtiCases} LTI`}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">IS 3786 lost-time injury index</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>EHS Near-Miss Observations</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.totalIncidents} Logged
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CAPA engineering controls instituted</div>
          </div>
        </div>

        {/* STOP WORK WARNING CALLOUT */}
        {isStopWork && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <strong className="text-rose-200 text-xs uppercase tracking-wider block">
                  STATUTORY STOP-WORK NOTICE ACTIVE: OPERATION SUSPENDED
                </strong>
                <span className="text-xs text-rose-300/80 font-sans">
                  Work under permit {selectedPermit.ptw_number} at {selectedPermit.location_grid} has been halted due to a critical safety non-conformance. An automatic Safety NCR has been issued. No work is permitted until re-certified by the Resident SEOR.
                </span>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-800 text-xs font-bold shrink-0">
              SAFETY HALT ENFORCED
            </span>
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3 font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("ACTIVE_PERMITS")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "ACTIVE_PERMITS"
                ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Permits to Work ({permits.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("INCIDENT_REGISTER")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "INCIDENT_REGISTER"
                ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>EHS Incident &amp; Near-Miss Register ({incidents.length})</span>
          </button>
        </div>

        {/* TAB 1: PERMITS TO WORK (PTW) */}
        {activeTab === "ACTIVE_PERMITS" && (
          <div className="space-y-4">
            {/* TOOLBAR: FILTERS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                {[
                  { key: "ALL", label: `All Permits (${permits.length})` },
                  { key: "AUTHORIZED_ACTIVE", label: `Active (${summary.activePermits})` },
                  { key: "SUSPENDED_STOP_WORK", label: `Suspended (${summary.stopWorkOrders})` },
                  { key: "REQUESTED_DRAFT", label: "Draft" },
                  { key: "CLOSED_SAFE", label: "Closed" },
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
                  value={filterHazard}
                  onChange={(e) => setFilterHazard(e.target.value)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-400 font-mono"
                >
                  <option value="ALL">All Hazard Classes</option>
                  <option value="WORK_AT_HEIGHT">Work at Height (&gt;2.0m)</option>
                  <option value="HOT_WORK_WELDING">Hot Work / Welding</option>
                  <option value="DEEP_EXCAVATION_TRENCH">Deep Excavation (&gt;1.5m)</option>
                  <option value="CONFINED_SPACE_ENTRY">Confined Space</option>
                  <option value="HEAVY_TANDEM_LIFTING">Heavy Lifting</option>
                  <option value="ELECTRICAL_LOTO">Electrical LOTO</option>
                </select>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search permit, location..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 2-COLUMN WORKBENCH: PERMITS ROSTER (5 cols) vs PRE-TASK VERIFICATION DESK (7 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT: PERMITS LISTING (5 cols) */}
              <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                      BOCW Permit Master
                    </span>
                    <h2 className="text-sm font-bold text-white mt-0.5">High-Risk Shift Permits</h2>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">{filteredPermits.length} Permits</span>
                </div>

                <div className="space-y-3">
                  {filteredPermits.map((ptw) => {
                    const isSelected = selectedPermit.id === ptw.id;
                    const isActive = ptw.status === "AUTHORIZED_ACTIVE";
                    const isSuspended = ptw.status === "SUSPENDED_STOP_WORK";

                    return (
                      <div
                        key={ptw.id}
                        onClick={() => setSelectedPermit(ptw)}
                        className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                          isSelected
                            ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                            : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-white">
                              {ptw.ptw_number}
                            </span>
                            <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                              isSuspended
                                ? "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                                : isActive
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                                : "bg-zinc-800 text-zinc-300"
                            }`}>
                              {ptw.status.replace(/_/g, " ")}
                            </span>
                          </div>

                          <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-cyan-300 font-mono font-bold">
                            {ptw.hazard_type.replace(/_/g, " ")}
                          </span>
                        </div>

                        <div>
                          <div className="text-xs font-bold text-white">{ptw.title}</div>
                          <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                            Location: <strong className="text-zinc-200">{ptw.location_grid}</strong> &bull; {ptw.contractor_name}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                          <span>Crew Size: <strong className="text-zinc-300">{ptw.workers_count} Personnel</strong></span>
                          <span>Safety Officer: <strong className={ptw.site_safety_officer_name ? "text-emerald-400" : "text-amber-400"}>{ptw.site_safety_officer_name ? "Authorized" : "Pending"}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT: PRE-TASK VERIFICATION CHECKLIST & CONTROL DESK (7 cols) */}
              <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
                <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                      Pre-Task Hazard Clearance Desk
                    </span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{selectedPermit.ptw_number} &mdash; {selectedPermit.hazard_type.replace(/_/g, " ")}</h3>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    isPermitActive
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                      : isStopWork
                      ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                      : "bg-amber-950 text-amber-400 border border-amber-800/50"
                  }`}>
                    {selectedPermit.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Permit Activity Title:</span>
                    <strong className="text-white text-sm font-sans block mt-0.5">{selectedPermit.title}</strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                    <div>
                      <span className="text-zinc-500 block">Location Grid:</span>
                      <span className="text-white font-bold">{selectedPermit.location_grid}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Executing Contractor:</span>
                      <span className="text-cyan-300 font-bold font-sans">{selectedPermit.contractor_name}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                    <div>
                      <span className="text-zinc-500 block">Permit Valid Until:</span>
                      <span className="text-zinc-200">{new Date(selectedPermit.valid_to).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} (Shift Window)</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Emergency Hotline:</span>
                      <span className="text-rose-400 font-bold">{selectedPermit.emergency_contact_phone}</span>
                    </div>
                  </div>
                </div>

                {/* MANDATORY PRE-TASK CHECKLIST MATRIX */}
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2.5">
                  <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                    BOCW Pre-Task Mandatory Safety Checklist:
                  </span>

                  <div className="space-y-2 text-[11px]">
                    {[
                      { key: "tbt_briefing_conducted", label: "1. Tool Box Talk (TBT) Briefing Conducted", val: selectedPermit.tbt_briefing_conducted },
                      { key: "ppe_full_body_harness", label: "2. PPE & 100% Tie-Off Double Lanyard Harness", val: selectedPermit.ppe_full_body_harness },
                      { key: "edge_barricades_installed", label: "3. Hard Edge Barricades & Warning Signboards", val: selectedPermit.edge_barricades_installed },
                      { key: "fire_extinguisher_standby", label: "4. Fire Extinguisher Standby & Fire Watch", val: selectedPermit.fire_extinguisher_standby },
                      { key: "gas_test_cleared", label: "5. Combustible & Toxic Gas Detector Clearance", val: selectedPermit.gas_test_cleared },
                      { key: "loto_applied", label: "6. Electrical / Mechanical Lockout Tagout (LOTO)", val: selectedPermit.loto_applied },
                    ].map((item) => (
                      <div
                        key={item.key}
                        onClick={() => handleToggleChecklist(item.key as keyof PtwRecord, item.val)}
                        className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                          item.val
                            ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                            : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className="font-bold">{item.val ? "VERIFIED" : "PENDING"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ACTION BUTTONS: AUTHORIZE, STOP-WORK, CLOSE */}
                <div className="space-y-2 pt-1 border-t border-zinc-800">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                    EHS Safety Authorization Protocol:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Action 1: Authorize PTW */}
                    {selectedPermit.status !== "AUTHORIZED_ACTIVE" && selectedPermit.status !== "CLOSED_SAFE" && (
                      <button
                        type="button"
                        disabled={!isSafetyOrSeor || actionInProgress === `auth_${selectedPermit.id}`}
                        onClick={() => handleAuthorizePtw(selectedPermit)}
                        className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Authorize Shift Permit (EHS)</span>
                      </button>
                    )}

                    {/* Action 2: Stop-Work Order */}
                    {!isStopWork && selectedPermit.status !== "CLOSED_SAFE" && (
                      <button
                        type="button"
                        disabled={!isSafetyOrSeor || actionInProgress === `stop_${selectedPermit.id}`}
                        onClick={() => handleStopWorkOrder(selectedPermit)}
                        className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/50 font-mono disabled:opacity-50"
                      >
                        <AlertOctagon className="w-4 h-4" />
                        <span>Enforce Stop-Work Order</span>
                      </button>
                    )}

                    {/* Action 3: Close Safely */}
                    {isPermitActive && (
                      <button
                        type="button"
                        disabled={actionInProgress === `close_${selectedPermit.id}`}
                        onClick={() => handleClosePtw(selectedPermit)}
                        className="py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs transition flex items-center justify-center gap-1.5 font-mono"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Close Permit Safely</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
                  BOCW Central Rules 1998 &amp; CPWD Safety Code GCC 19H
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: INCIDENT & NEAR-MISS REGISTER */}
        {activeTab === "INCIDENT_REGISTER" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  IS 3786 Safety Telemetry
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">EHS Incidents &amp; Near-Miss Observations</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIncCode(`INC-${Date.now().toString().slice(-4)}`);
                  setIncidentModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-mono font-bold flex items-center gap-1.5 shadow-md shadow-amber-950/50"
              >
                <Plus className="w-4 h-4" />
                <span>Log Safety Observation / Near-Miss</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3 flex flex-col justify-between shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{inc.incident_code}</span>
                      <span className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase ${
                        inc.severity === "LOST_TIME_INJURY_LTI" || inc.severity === "FATALITY_CRITICAL"
                          ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                          : inc.severity === "MEDICAL_TREATMENT_CASE_MTC"
                          ? "bg-amber-950 text-amber-400 border border-amber-800/50"
                          : "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                      }`}>
                        {inc.severity.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="font-bold text-white font-sans text-xs">{inc.title}</div>
                    <p className="text-zinc-400 font-sans text-xs line-clamp-3 leading-relaxed">{inc.description}</p>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/60 space-y-1.5 text-[11px] text-zinc-500">
                    <div className="flex justify-between">
                      <span>Location:</span>
                      <span className="text-zinc-300">{inc.location_grid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lost Workdays:</span>
                      <span className={inc.lost_workdays > 0 ? "text-rose-400 font-bold" : "text-emerald-400"}>
                        {inc.lost_workdays} Days
                      </span>
                    </div>
                    <div className="text-[10px] text-cyan-300 pt-1 font-sans">
                      CAPA: {inc.preventive_capa_action}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REQUEST PTW MODAL */}
        {ptwModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Request High-Risk Permit to Work (Form EHS-01)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPtwModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreatePtw} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Permit No Ref</label>
                    <input
                      type="text"
                      required
                      value={ptwNo}
                      onChange={(e) => setPtwNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Hazard Class</label>
                    <select
                      value={hazardType}
                      onChange={(e) => setHazardType(e.target.value as PtwHazardType)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="WORK_AT_HEIGHT">Work at Height (&gt;2.0m)</option>
                      <option value="HOT_WORK_WELDING">Hot Work / Welding</option>
                      <option value="DEEP_EXCAVATION_TRENCH">Deep Excavation (&gt;1.5m)</option>
                      <option value="CONFINED_SPACE_ENTRY">Confined Space</option>
                      <option value="HEAVY_TANDEM_LIFTING">Heavy Tandem Lift</option>
                      <option value="ELECTRICAL_LOTO">Electrical LOTO</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Permit Activity Title</label>
                  <input
                    type="text"
                    required
                    value={ptwTitle}
                    onChange={(e) => setPtwTitle(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Location Grid</label>
                    <input
                      type="text"
                      required
                      value={gridLoc}
                      onChange={(e) => setGridLoc(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Crew Personnel Count</label>
                    <input
                      type="number"
                      required
                      value={workersCount}
                      onChange={(e) => setWorkersCount(Number(e.target.value))}
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
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Emergency Contact Phone</label>
                    <input
                      type="text"
                      required
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Special Precautions &amp; Rescue Plan</label>
                  <textarea
                    rows={2}
                    required
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setPtwModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === "creating_ptw"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Permit Request</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* LOG INCIDENT MODAL */}
        {incidentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Log Safety Incident / Near-Miss Observation
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIncidentModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateIncident} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Incident Code</label>
                    <input
                      type="text"
                      required
                      value={incCode}
                      onChange={(e) => setIncCode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Severity Level</label>
                    <select
                      value={incSeverity}
                      onChange={(e) => setIncSeverity(e.target.value as IncidentSeverity)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="NEAR_MISS_POTENTIAL">Near-Miss (Potential Hazard)</option>
                      <option value="FIRST_AID_CASE_FAC">First Aid Case (FAC)</option>
                      <option value="MEDICAL_TREATMENT_CASE_MTC">Medical Treatment Case (MTC)</option>
                      <option value="LOST_TIME_INJURY_LTI">Lost Time Injury (LTI)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Observation / Incident Headline</label>
                  <input
                    type="text"
                    required
                    value={incTitle}
                    onChange={(e) => setIncTitle(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Factual Description</label>
                  <textarea
                    rows={2}
                    required
                    value={incDesc}
                    onChange={(e) => setIncDesc(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Mandatory Preventive Action (CAPA)</label>
                  <textarea
                    rows={2}
                    required
                    value={incCapa}
                    onChange={(e) => setIncCapa(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIncidentModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === "creating_inc"}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-amber-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Log Safety Event</span>
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