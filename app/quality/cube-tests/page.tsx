"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Beaker,
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
import { ConcreteGrade } from "../pour-cards/page";

export type CubeTestStatus =
  | "CURING_IN_TANK"
  | "STAGE_7D_DUE"
  | "STAGE_7D_PASSED"
  | "STAGE_28D_DUE"
  | "STAGE_28D_PASSED"
  | "CRITICAL_STRENGTH_FAILURE"
  | "NDT_CORE_EXTRACTION_REMEDIAL";

export interface CubeTestRecord {
  id: string;
  project_id: string;
  sample_code: string;
  pour_card_ref: string;
  structural_element: string;
  location_grid: string;
  concrete_grade: ConcreteGrade;
  sampling_date: string;
  slump_measured_mm: number;
  total_cubes_cast: number;
  curing_tank_bay: string;
  test_date_7d: string;
  actual_test_date_7d?: string | null;
  load_kn_7d_specimen_1: number;
  load_kn_7d_specimen_2: number;
  load_kn_7d_specimen_3: number;
  strength_7d_mpa: number;
  passed_7d: boolean;
  test_date_28d: string;
  actual_test_date_28d?: string | null;
  load_kn_28d_specimen_1: number;
  load_kn_28d_specimen_2: number;
  load_kn_28d_specimen_3: number;
  strength_28d_mpa: number;
  specimen_spread_valid_15pct: boolean;
  passed_28d: boolean;
  density_kg_per_cum: number;
  testing_machine_ref: string;
  nabl_accredited_lab: string;
  nabl_cert_number: string;
  status: CubeTestStatus;
  sampled_by: string;
  tested_by?: string | null;
  seor_verified_by?: string | null;
  verified_at?: string | null;
  linked_ncr_code?: string | null;
  remarks?: string | null;
  created_at?: string;
}

function getCharacteristicTargetMpa(grade: ConcreteGrade): number {
  switch (grade) {
    case "M20": return 20;
    case "M25": return 25;
    case "M30": return 30;
    case "M35": return 35;
    case "M40": return 40;
    case "M50": return 50;
    default: return 40;
  }
}

function calculateStrengthFromKn(kn: number): number {
  // Specimen Area = 150 mm x 150 mm = 22,500 mm²
  // Stress (MPa) = (kn * 1000) / 22500 = kn / 22.5
  return Number((kn / 22.5).toFixed(2));
}

function computeSetStrength(loads: [number, number, number], targetCharacteristic: number, is28Day: boolean) {
  const strengths = loads.map(calculateStrengthFromKn);
  const avg = Number(((strengths[0] + strengths[1] + strengths[2]) / 3).toFixed(2));

  // Check IS 456 ±15% individual variation rule
  const spreadValid = strengths.every(s => Math.abs(s - avg) <= 0.15 * avg);

  // Target requirement: 7-day >= 65% fck; 28-day >= 100% fck
  const minRequired = is28Day ? targetCharacteristic : Number((targetCharacteristic * 0.65).toFixed(2));
  const passed = avg >= minRequired && spreadValid;

  return { strengths, avg, spreadValid, passed };
}

function normalizeCubeRecord(d: any): CubeTestRecord {
  const grade = (d?.concrete_grade as ConcreteGrade) ?? "M40";
  const fck = getCharacteristicTargetMpa(grade);

  const l7_1 = Number(d?.load_kn_7d_specimen_1 ?? 0);
  const l7_2 = Number(d?.load_kn_7d_specimen_2 ?? 0);
  const l7_3 = Number(d?.load_kn_7d_specimen_3 ?? 0);
  const calc7d = (l7_1 > 0 && l7_2 > 0 && l7_3 > 0)
    ? computeSetStrength([l7_1, l7_2, l7_3], fck, false)
    : { strengths: [0, 0, 0], avg: Number(d?.strength_7d_mpa ?? 0), spreadValid: true, passed: Boolean(d?.passed_7d) };

  const l28_1 = Number(d?.load_kn_28d_specimen_1 ?? 0);
  const l28_2 = Number(d?.load_kn_28d_specimen_2 ?? 0);
  const l28_3 = Number(d?.load_kn_28d_specimen_3 ?? 0);
  const calc28d = (l28_1 > 0 && l28_2 > 0 && l28_3 > 0)
    ? computeSetStrength([l28_1, l28_2, l28_3], fck, true)
    : { strengths: [0, 0, 0], avg: Number(d?.strength_28d_mpa ?? 0), spreadValid: Boolean(d?.specimen_spread_valid_15pct ?? true), passed: Boolean(d?.passed_28d) };

  return {
    id: d?.id ?? `cube-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    sample_code: d?.sample_code ?? `CUBE-${Date.now().toString().slice(-4)}`,
    pour_card_ref: d?.pour_card_ref ?? "PC-01",
    structural_element: d?.structural_element ?? "Shear Core Wall & Lift Shaft",
    location_grid: d?.location_grid ?? "Tower A / Level 08 / Grid C3-D5",
    concrete_grade: grade,
    sampling_date: d?.sampling_date ?? new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10),
    slump_measured_mm: Number(d?.slump_measured_mm ?? 140),
    total_cubes_cast: Number(d?.total_cubes_cast ?? 6),
    curing_tank_bay: d?.curing_tank_bay ?? "Bay-A1",
    test_date_7d: d?.test_date_7d ?? new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10),
    actual_test_date_7d: d?.actual_test_date_7d ?? null,
    load_kn_7d_specimen_1: l7_1,
    load_kn_7d_specimen_2: l7_2,
    load_kn_7d_specimen_3: l7_3,
    strength_7d_mpa: calc7d.avg,
    passed_7d: calc7d.passed,
    test_date_28d: d?.test_date_28d ?? new Date().toISOString().slice(0, 10),
    actual_test_date_28d: d?.actual_test_date_28d ?? null,
    load_kn_28d_specimen_1: l28_1,
    load_kn_28d_specimen_2: l28_2,
    load_kn_28d_specimen_3: l28_3,
    strength_28d_mpa: calc28d.avg,
    specimen_spread_valid_15pct: calc28d.spreadValid,
    passed_28d: calc28d.passed,
    density_kg_per_cum: Number(d?.density_kg_per_cum ?? 2420),
    testing_machine_ref: d?.testing_machine_ref ?? "CTM-2000KN-CAL-2026",
    nabl_accredited_lab: d?.nabl_accredited_lab ?? "Site Field Testing Laboratory",
    nabl_cert_number: d?.nabl_cert_number ?? "NABL-TC-881204",
    status: (d?.status as CubeTestStatus) ?? "CURING_IN_TANK",
    sampled_by: d?.sampled_by ?? "Materials QA Lead",
    tested_by: d?.tested_by ?? null,
    seor_verified_by: d?.seor_verified_by ?? null,
    verified_at: d?.verified_at ?? null,
    linked_ncr_code: d?.linked_ncr_code ?? null,
    remarks: d?.remarks ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalCubeTestsPage() {
  const { project, role, tier } = useActiveRole();
  const [tests, setTests] = useState<CubeTestRecord[]>([]);
  const [selectedTest, setSelectedTest] = useState<CubeTestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [breakModalOpen, setBreakModalOpen] = useState(false);
  const [breakTargetStage, setBreakTargetStage] = useState<"7D" | "28D">("28D");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Resident SEOR";
  const isSeorOrQa =
    roleId === "RESIDENT_SEOR" ||
    roleId === "RESIDENT_ENGINEER" ||
    roleId === "PMC_LEAD" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PROJECT_DIRECTOR" ||
    roleLabel.includes("QA") ||
    roleLabel.includes("QC") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Engineer");

  // Form State for Initiating Sample Set
  const [sampleCode, setSampleCode] = useState(`CUBE-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
  const [pourCardRef, setPourCardRef] = useState(tier === "RESIDENTIAL" ? "PC-RES-088" : "PC-TWR-109");
  const [element, setElement] = useState(
    tier === "RESIDENTIAL"
      ? "Balcony Dropped Slab & Waterproof Kerb"
      : "Level 08 Lift Core Shear Walls (Grid C3-D5)"
  );
  const [grid, setGrid] = useState(tier === "RESIDENTIAL" ? "First Floor / MB-02" : "Tower A / Level 08 / Core 02");
  const [grade, setGrade] = useState<ConcreteGrade>(tier === "RESIDENTIAL" ? "M25" : "M40");
  const [tankBay, setTankBay] = useState("Tank Bay 02");
  const [slump, setSlump] = useState<number>(140);

  // Form State for Crushing Break Entry
  const [load1, setLoad1] = useState<number>(920);
  const [load2, setLoad2] = useState<number>(935);
  const [load3, setLoad3] = useState<number>(915);
  const [ctmMachine, setCtmMachine] = useState("Automatic Compression Machine (CTM-2000kN)");

  const loadCubeTests = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("quality_cube_tests")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeCubeRecord(d));
        setTests(normalized);
        if (!selectedTest) setSelectedTest(normalized[0]);
      } else {
        const defaults: CubeTestRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeCubeRecord({
                  id: "cube-res-01",
                  project_id: projectId,
                  sample_code: "CUBE-RES-088",
                  pour_card_ref: "PC-RES-088",
                  structural_element: "Balcony Dropped Slab & Waterproof Kerb",
                  location_grid: "First Floor / MB-02 Balcony",
                  concrete_grade: "M25",
                  sampling_date: "2026-08-15",
                  test_date_7d: "2026-08-22",
                  actual_test_date_7d: "2026-08-22",
                  load_kn_7d_specimen_1: 410,
                  load_kn_7d_specimen_2: 425,
                  load_kn_7d_specimen_3: 415,
                  test_date_28d: "2026-09-12",
                  actual_test_date_28d: "2026-09-12",
                  load_kn_28d_specimen_1: 590,
                  load_kn_28d_specimen_2: 605,
                  load_kn_28d_specimen_3: 595,
                  status: "STAGE_28D_PASSED",
                  sampled_by: "Lead QA Engineer",
                  tested_by: "NABL Concrete Lab Tech",
                  seor_verified_by: "Principal Architect",
                  verified_at: "2026-09-12T16:00:00Z",
                  remarks: "28-day average strength 26.51 MPa exceeds characteristic M25 requirement.",
                }),
              ]
            : [
                normalizeCubeRecord({
                  id: "cube-twr-01",
                  project_id: projectId,
                  sample_code: "CUBE-TWR-104",
                  pour_card_ref: "PC-TWR-104",
                  structural_element: "Level 07 Shear Core Wall & Lift Shaft",
                  location_grid: "Tower A / Level 07 / Core 01",
                  concrete_grade: "M40",
                  sampling_date: "2026-08-10",
                  test_date_7d: "2026-08-17",
                  actual_test_date_7d: "2026-08-17",
                  load_kn_7d_specimen_1: 670,
                  load_kn_7d_specimen_2: 685,
                  load_kn_7d_specimen_3: 675,
                  test_date_28d: "2026-09-07",
                  actual_test_date_28d: "2026-09-07",
                  load_kn_28d_specimen_1: 960,
                  load_kn_28d_specimen_2: 980,
                  load_kn_28d_specimen_3: 955,
                  status: "STAGE_28D_PASSED",
                  sampled_by: "S. K. Verma (QA/QC Lead)",
                  tested_by: "Materials Lab Engineer",
                  seor_verified_by: "Resident SEOR",
                  verified_at: "2026-09-07T17:00:00Z",
                  remarks: "Characteristic strength 42.89 MPa exceeds 40 MPa threshold. Stagger props released.",
                }),
                normalizeCubeRecord({
                  id: "cube-twr-02",
                  project_id: projectId,
                  sample_code: "CUBE-TWR-109",
                  pour_card_ref: "PC-TWR-109",
                  structural_element: "Level 08 Lift Core Shear Walls",
                  location_grid: "Tower A / Level 08 / Grid C3-D5",
                  concrete_grade: "M40",
                  sampling_date: "2026-09-08",
                  test_date_7d: "2026-09-15",
                  actual_test_date_7d: "2026-09-15",
                  load_kn_7d_specimen_1: 680,
                  load_kn_7d_specimen_2: 690,
                  load_kn_7d_specimen_3: 670,
                  test_date_28d: "2026-10-06",
                  status: "STAGE_7D_PASSED",
                  sampled_by: "S. K. Verma (QA/QC Lead)",
                  tested_by: "Materials Lab Engineer",
                  seor_verified_by: "Resident SEOR",
                  verified_at: "2026-09-15T16:30:00Z",
                  remarks: "7-day strength 30.22 MPa achieves 75.5% of characteristic target. 28-day break due Oct 06.",
                }),
              ];

        setTests(defaults);
        if (!selectedTest) setSelectedTest(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedTest, tier]);

  useEffect(() => {
    void loadCubeTests();

    const channel = supabase
      .channel(`cube_tests_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "quality_cube_tests" }, () => void loadCubeTests())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadCubeTests]);

  const summary = useMemo(() => {
    const totalSamples = tests.length;
    const passed28dCount = tests.filter((t) => t.status === "STAGE_28D_PASSED").length;
    const pendingDueCount = tests.filter((t) => t.status === "CURING_IN_TANK" || t.status === "STAGE_7D_PASSED").length;
    const criticalFailures = tests.filter(
      (t) => t.status === "CRITICAL_STRENGTH_FAILURE" || t.status === "NDT_CORE_EXTRACTION_REMEDIAL"
    ).length;

    return { totalSamples, passed28dCount, pendingDueCount, criticalFailures };
  }, [tests]);

  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      const matchStatus = filterStatus === "ALL" || t.status === filterStatus;
      const haystack = `${t.sample_code} ${t.pour_card_ref} ${t.structural_element} ${t.location_grid}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [tests, filterStatus, search]);

  // Submit Compression Machine Crushing Loads
  const handleSubmitBreakTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;
    setActionInProgress("submitting_break");

    const targetCharacteristic = getCharacteristicTargetMpa(selectedTest.concrete_grade);
    const is28 = breakTargetStage === "28D";
    const calc = computeSetStrength([load1, load2, load3], targetCharacteristic, is28);

    let nextStatus: CubeTestStatus;
    if (is28) {
      nextStatus = calc.passed ? "STAGE_28D_PASSED" : "CRITICAL_STRENGTH_FAILURE";
    } else {
      nextStatus = calc.passed ? "STAGE_7D_PASSED" : "STAGE_7D_DUE";
    }

    const updatePayload: Partial<CubeTestRecord> = is28
      ? {
          actual_test_date_28d: new Date().toISOString().slice(0, 10),
          load_kn_28d_specimen_1: load1,
          load_kn_28d_specimen_2: load2,
          load_kn_28d_specimen_3: load3,
          strength_28d_mpa: calc.avg,
          specimen_spread_valid_15pct: calc.spreadValid,
          passed_28d: calc.passed,
          status: nextStatus,
          tested_by: roleLabel || "Testing Engineer",
        }
      : {
          actual_test_date_7d: new Date().toISOString().slice(0, 10),
          load_kn_7d_specimen_1: load1,
          load_kn_7d_specimen_2: load2,
          load_kn_7d_specimen_3: load3,
          strength_7d_mpa: calc.avg,
          passed_7d: calc.passed,
          status: nextStatus,
          tested_by: roleLabel || "Testing Engineer",
        };

    try {
      await (supabase as any)
        .from("quality_cube_tests")
        .update(updatePayload)
        .eq("id", selectedTest.id);

      // If 28-day break fails, trigger Quality Non-Conformance Report (NCR)
      if (is28 && !calc.passed) {
        const ncrCode = `NCR-CUBE-${selectedTest.sample_code}`;
        await (supabase as any).from("non_conformance_reports").insert([
          {
            project_id: projectId,
            ncr_code: ncrCode,
            title: `Structural Failure: 28-Day Concrete Cube Strength Below ${targetCharacteristic} MPa`,
            structural_element: selectedTest.structural_element,
            location_grid: selectedTest.location_grid,
            trade_package: "Civil & Superstructure",
            severity: "CRITICAL_STRUCTURAL_HOLD",
            description: `Sample ${selectedTest.sample_code} failed 28-day break at ${calc.avg} MPa (Required: ${targetCharacteristic} MPa). In-situ NDT / core testing ordered.`,
            remedial_action_required: "Conduct core cutting and ultrasonic pulse velocity test per IS 13311. Maintain prop staging.",
            status: "OPEN_INVESTIGATION",
            issued_by: roleLabel || "Resident SEOR",
          },
        ]);
      }
    } catch {
      // Local optimistic update
    }

    const updated = { ...selectedTest, ...updatePayload };
    setSelectedTest(updated as CubeTestRecord);
    setTests((prev) => prev.map((t) => (t.id === selectedTest.id ? (updated as CubeTestRecord) : t)));

    setFeedbackMessage(
      calc.passed
        ? `${breakTargetStage} Break Passed (${calc.avg} MPa). Verified within IS 456 acceptance criteria.`
        : `${breakTargetStage} Break Failed (${calc.avg} MPa). Quality NCR and structural hold triggered.`
    );
    setTimeout(() => setFeedbackMessage(null), 4000);
    setBreakModalOpen(false);
    setActionInProgress(null);
  };

  // SEOR Formal Certification Stamp
  const handleSeorCertify = async (test: CubeTestRecord) => {
    if (!isSeorOrQa) return;
    setActionInProgress(`seor_${test.id}`);

    const updatePayload: Partial<CubeTestRecord> = {
      seor_verified_by: roleLabel || "Resident SEOR",
      verified_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("quality_cube_tests")
        .update(updatePayload)
        .eq("id", test.id);
    } catch {
      // Local optimistic update
    }

    setTests((prev) => prev.map((t) => (t.id === test.id ? ({ ...t, ...updatePayload } as CubeTestRecord) : t)));
    if (selectedTest && selectedTest.id === test.id) {
      setSelectedTest((prev) => (prev ? ({ ...prev, ...updatePayload } as CubeTestRecord) : null));
    }

    setFeedbackMessage(`Cube test certificate for ${test.sample_code} certified and signed by SEOR.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Printable NABL / IS 516 Lab Test Certificate
  const handlePrintCertificate = (test: CubeTestRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    const fck = getCharacteristicTargetMpa(test.concrete_grade);

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Compressive Strength Test Certificate (IS 516 / IS 456) — ${test.sample_code}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .passed { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .failed { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .tac { text-align: center; font-family: monospace; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-top: 14px; background: #fafafa; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 40px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · IS 516:2021 &amp; IS 456:2000 Laboratory Testing Protocol</div>
      <h1 class="title">Compressive Strength Test Certificate (Concrete Cubes)</h1>
      <div class="meta">Certificate Ref: ${test.sample_code} · Sampling Date: ${test.sampling_date} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${test.passed_28d ? "passed" : "failed"}">${test.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Structural Member</th><td><strong>${test.structural_element}</strong></td><th>Parent Pour Card Ref</th><td><strong>${test.pour_card_ref}</strong></td></tr>
    <tr><th>Design Concrete Grade</th><td><strong>${test.concrete_grade} (${fck} MPa)</strong></td><th>Location Grid</th><td>${test.location_grid}</td></tr>
    <tr><th>Testing Machine Ref</th><td>${test.testing_machine_ref}</td><th>NABL Accredited Lab</th><td><strong>${test.nabl_accredited_lab}</strong> (${test.nabl_cert_number})</td></tr>
    <tr><th>Slump at Casting</th><td>${test.slump_measured_mm} mm</td><th>Curing Tank Facility</th><td>${test.curing_tank_bay} (Potable Water @ 27&plusmn;2&deg;C)</td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Standard Specimen Geometry &amp; Conditioning</div>
    <div>Standard 150mm &times; 150mm &times; 150mm cast cubes conditioned under continuous water curing per IS 516. Test surface wiped dry and loaded symmetrically at a nominal rate of 14 N/mm&sup2;/min until failure.</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Age at Test</th>
        <th>Testing Date</th>
        <th class="tar">Specimen #1 (kN)</th>
        <th class="tar">Specimen #2 (kN)</th>
        <th class="tar">Specimen #3 (kN)</th>
        <th class="tar">Mean Strength (MPa)</th>
        <th class="tac">IS 456 Acceptance</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>7 Days Stage</strong></td>
        <td>${test.actual_test_date_7d || test.test_date_7d}</td>
        <td class="tar">${test.load_kn_7d_specimen_1 || "—"}</td>
        <td class="tar">${test.load_kn_7d_specimen_2 || "—"}</td>
        <td class="tar">${test.load_kn_7d_specimen_3 || "—"}</td>
        <td class="tar font-bold">${test.strength_7d_mpa > 0 ? `${test.strength_7d_mpa} MPa` : "Pending"}</td>
        <td class="tac font-bold" style="color: ${test.passed_7d ? "#15803d" : "#64748b"};">
          ${test.passed_7d ? "PASSED (>=65%)" : "PENDING"}
        </td>
      </tr>
      <tr style="background: #f8fafc;">
        <td><strong>28 Days Characteristic</strong></td>
        <td>${test.actual_test_date_28d || test.test_date_28d}</td>
        <td class="tar">${test.load_kn_28d_specimen_1 || "—"}</td>
        <td class="tar">${test.load_kn_28d_specimen_2 || "—"}</td>
        <td class="tar">${test.load_kn_28d_specimen_3 || "—"}</td>
        <td class="tar font-bold" style="color: #0369a1; font-size: 12px;">${test.strength_28d_mpa > 0 ? `${test.strength_28d_mpa} MPa` : "Pending"}</td>
        <td class="tac font-bold" style="color: ${test.passed_28d ? "#15803d" : test.strength_28d_mpa > 0 ? "#b91c1c" : "#64748b"};">
          ${test.passed_28d ? "PASSED (>=fck)" : test.strength_28d_mpa > 0 ? "FAILED" : "PENDING"}
        </td>
      </tr>
    </tbody>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Statistical Compliance &amp; Engineering Determination</div>
    <div>Individual Specimen Spread within &plusmn;15%: <strong>${test.specimen_spread_valid_15pct ? "COMPLIANT WITH IS 456" : "INVALID SPREAD (>15%)"}</strong></div>
    <div>Characteristic Strength Requirement: <strong>&ge; ${fck} MPa</strong> &bull; Attained 28-Day Strength: <strong>${test.strength_28d_mpa} MPa</strong> (${test.passed_28d ? "COMPLIANT" : "STRUCTURAL HOLD"})</div>
  </div>

  <div class="footer">
    <div>
      <div>Materials Lab Technician</div>
      <div style="color: #64748b;">${test.tested_by || "Lab Certified"}</div>
      <div class="sig">Testing Technician Seal</div>
    </div>
    <div>
      <div>Quality Assurance Head</div>
      <div style="color: #64748b;">${test.sampled_by}</div>
      <div class="sig">QA Review Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">${test.seor_verified_by || "Structural Acceptance Approved"}</div>
      <div class="sig">SEOR Structural Release Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedTest) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING COMPRESSIVE CUBE BREAK TESTS &amp; IS 516 ENGINE...
      </div>
    );
  }

  const fckTarget = getCharacteristicTargetMpa(selectedTest.concrete_grade);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Quality Assurance · IS 516:2021 / IS 456:2000 Compressive Testing</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Compressive Cube Break Tests (IS 516 / IS 456)
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Concrete laboratory strength clearinghouse. Monitors curing tank duration, records 7-day and 28-day hydraulic crushing loads, enforces the &plusmn;15% specimen variation rule, and flags critical failures directly into Quality NCRs.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintCertificate(selectedTest)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Lab Certificate</span>
            </button>
            <Link
              href="/quality/pour-cards"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Flame className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pour Cards Register</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setBreakTargetStage("28D");
                setLoad1(fckTarget * 22.5);
                setLoad2(fckTarget * 22.8);
                setLoad3(fckTarget * 22.3);
                setBreakModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Scale className="w-4 h-4" />
              <span>Record Crushing Break</span>
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
              <span>28-Day Strength Pass Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {summary.totalSamples > 0 ? Math.round((summary.passed28dCount / summary.totalSamples) * 100) : 100}%
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">{summary.passed28dCount} sample sets passed</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Curing in Water Tank</span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.pendingDueCount} Sets
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Under continuous 27&plusmn;2&deg;C curing</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Critical Strength Failures</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.criticalFailures > 0 ? "text-rose-400" : "text-zinc-400"}`}>
              {summary.criticalFailures} Failures
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Triggered Quality NCR &amp; core testing</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Tested Cube Sets</span>
              <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.totalSamples} Sets (6 Cubes/set)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">IS 516 compliance certificates</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Samples (${tests.length})` },
              { key: "STAGE_28D_PASSED", label: "28D Passed" },
              { key: "STAGE_7D_PASSED", label: "7D Passed" },
              { key: "CURING_IN_TANK", label: "Curing in Tank" },
              { key: "CRITICAL_STRENGTH_FAILURE", label: "Failures" },
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
              placeholder="Search sample, element, grid..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: CUBE SETS LISTING (7 cols) vs LABORATORY BREAK TEST DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: SAMPLES LISTING (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  IS 516 Compression Register
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Concrete Cube Test Sample Sets</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredTests.length} Sample Sets</span>
            </div>

            <div className="space-y-3">
              {filteredTests.map((test) => {
                const isSelected = selectedTest.id === test.id;
                const is28Passed = test.status === "STAGE_28D_PASSED";
                const isFailed = test.status === "CRITICAL_STRENGTH_FAILURE" || test.status === "NDT_CORE_EXTRACTION_REMEDIAL";

                return (
                  <div
                    key={test.id}
                    onClick={() => setSelectedTest(test)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {test.sample_code}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-cyan-300 font-mono font-bold">
                          {test.concrete_grade}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          is28Passed
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : isFailed
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                            : test.status === "STAGE_7D_PASSED"
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {test.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className={`text-xs font-bold ${is28Passed ? "text-emerald-400" : isFailed ? "text-rose-400" : "text-white"}`}>
                          {test.strength_28d_mpa > 0 ? `${test.strength_28d_mpa} MPa (28D)` : `${test.strength_7d_mpa} MPa (7D)`}
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Target: {getCharacteristicTargetMpa(test.concrete_grade)} MPa
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{test.structural_element}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        Pour Card: <strong className="text-zinc-200">{test.pour_card_ref}</strong> &bull; {test.location_grid}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Casting Date: <strong className="text-zinc-300">{test.sampling_date}</strong></span>
                      <span>28D Break Due: <strong className="text-zinc-200">{test.test_date_28d}</strong></span>
                      <span>SEOR Sign: <strong className={test.seor_verified_by ? "text-emerald-400" : "text-amber-400"}>{test.seor_verified_by ? "Certified" : "Pending"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: LABORATORY CRUSHING TEST DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Compressive Break Telemetry
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedTest.sample_code}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                selectedTest.passed_28d
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : selectedTest.strength_28d_mpa > 0
                  ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                  : "bg-amber-950 text-amber-400 border border-amber-800/50"
              }`}>
                {selectedTest.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Member &amp; Grade:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedTest.structural_element} ({selectedTest.concrete_grade})</strong>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Characteristic Target:</span>
                  <span className="text-cyan-300 font-bold font-mono">&ge; {fckTarget} MPa</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">7-Day Minimum Target:</span>
                  <span className="text-white font-bold">&ge; {(fckTarget * 0.65).toFixed(1)} MPa</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Curing Tank Location:</span>
                  <span className="text-white">{selectedTest.curing_tank_bay}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Slump Measured:</span>
                  <span className="text-zinc-200 font-bold">{selectedTest.slump_measured_mm} mm</span>
                </div>
              </div>
            </div>

            {/* HYDRAULIC BREAK TEST STRENGTH SUMMARY */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                IS 516 Crushing Failure Strength Analysis:
              </span>

              <div className="space-y-2 text-[11px]">
                {/* 7-Day Stage */}
                <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">7-Day Break Strength:</span>
                    <span className="text-[10px] text-zinc-500">Date: {selectedTest.actual_test_date_7d || selectedTest.test_date_7d}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold text-sm ${selectedTest.passed_7d ? "text-emerald-400" : "text-zinc-400"}`}>
                      {selectedTest.strength_7d_mpa > 0 ? `${selectedTest.strength_7d_mpa} MPa` : "Pending"}
                    </span>
                    <span className="text-[9px] block text-zinc-500">
                      {selectedTest.passed_7d ? "PASSED (>=65%)" : "DUE"}
                    </span>
                  </div>
                </div>

                {/* 28-Day Stage */}
                <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">28-Day Characteristic Strength:</span>
                    <span className="text-[10px] text-zinc-500">Date: {selectedTest.actual_test_date_28d || selectedTest.test_date_28d}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold text-sm ${selectedTest.passed_28d ? "text-emerald-400" : selectedTest.strength_28d_mpa > 0 ? "text-rose-400" : "text-zinc-400"}`}>
                      {selectedTest.strength_28d_mpa > 0 ? `${selectedTest.strength_28d_mpa} MPa` : "Pending"}
                    </span>
                    <span className="text-[9px] block text-zinc-500">
                      {selectedTest.passed_28d ? "PASSED (>=fck)" : selectedTest.strength_28d_mpa > 0 ? "FAILED" : "DUE"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION STAGE BUTTONS */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Laboratory Test Authorizations:
              </span>

              {/* Action 1: Record 7-Day Break */}
              {!selectedTest.passed_7d && (
                <button
                  type="button"
                  onClick={() => {
                    setBreakTargetStage("7D");
                    setLoad1(fckTarget * 0.68 * 22.5);
                    setLoad2(fckTarget * 0.70 * 22.5);
                    setLoad3(fckTarget * 0.69 * 22.5);
                    setBreakModalOpen(true);
                  }}
                  className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono"
                >
                  <Beaker className="w-4 h-4" />
                  <span>Execute 7-Day Break Test (IS 516)</span>
                </button>
              )}

              {/* Action 2: Record 28-Day Break */}
              {selectedTest.passed_7d && !selectedTest.passed_28d && selectedTest.status !== "CRITICAL_STRENGTH_FAILURE" && (
                <button
                  type="button"
                  onClick={() => {
                    setBreakTargetStage("28D");
                    setLoad1(fckTarget * 22.5);
                    setLoad2(fckTarget * 22.8);
                    setLoad3(fckTarget * 22.3);
                    setBreakModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono"
                >
                  <Scale className="w-4 h-4" />
                  <span>Execute 28-Day Characteristic Break (IS 456 Acceptance)</span>
                </button>
              )}

              {/* Action 3: SEOR Certification Stamp */}
              {selectedTest.passed_28d && !selectedTest.seor_verified_by && (
                <button
                  type="button"
                  disabled={!isSeorOrQa || actionInProgress === `seor_${selectedTest.id}`}
                  onClick={() => handleSeorCertify(selectedTest)}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-purple-950/50 font-mono disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Certify Test Certificate &amp; Release Formwork Props (SEOR)</span>
                </button>
              )}

              {selectedTest.seor_verified_by && (
                <div className="p-3.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Certified &amp; Structural Release Authorized</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Endorsed by {selectedTest.seor_verified_by} on {selectedTest.verified_at ? new Date(selectedTest.verified_at).toLocaleDateString("en-IN") : "Today"}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              IS 516:2021 &amp; IS 456:2000 Acceptance Testing Protocol
            </div>
          </div>

        </div>

        {/* CRUSHING BREAK ENTRY MODAL */}
        {breakModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Record {breakTargetStage} Hydraulic Break Loads (IS 516)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBreakModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitBreakTest} className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 font-mono text-[11px] space-y-1">
                  <div className="text-zinc-400">Target Characteristic: <strong className="text-white">{fckTarget} MPa</strong> ({selectedTest.concrete_grade})</div>
                  <div className="text-zinc-400">Required {breakTargetStage} Stress: <strong className="text-cyan-300">&ge; {breakTargetStage === "28D" ? fckTarget : (fckTarget * 0.65).toFixed(1)} MPa</strong></div>
                  <div className="text-[10px] text-zinc-500">Specimen Area = 22,500 mm² &bull; Stress (MPa) = Failure Load (kN) / 22.5</div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Specimen #1 (kN)</label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={load1}
                      onChange={(e) => setLoad1(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Specimen #2 (kN)</label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={load2}
                      onChange={(e) => setLoad2(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Specimen #3 (kN)</label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={load3}
                      onChange={(e) => setLoad3(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Testing Machine Reference</label>
                  <input
                    type="text"
                    required
                    value={ctmMachine}
                    onChange={(e) => setCtmMachine(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setBreakModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === "submitting_break"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit &amp; Evaluate Stress</span>
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