"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BatteryCharging,
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
  Fuel,
  Gauge,
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
  Wrench,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type PlantMachineryCategory =
  | "HEAVY_LIFTING_TOWER_CRANE"
  | "CONCRETE_BATCHING_PLANT"
  | "CONCRETE_BOOM_PUMP"
  | "EARTHMOVING_EXCAVATOR"
  | "DIESEL_GENERATOR_DG"
  | "TRANSIT_MIXER";

export type PlantOwnership =
  | "DEPARTMENTAL_OWNED"
  | "SUBCONTRACTOR_DEPLOYED"
  | "DRY_LEASE_HIRED"
  | "WET_LEASE_HIRED";

export type PlantStatus =
  | "OPERATIONAL_ACTIVE"
  | "UNDER_BREAKDOWN_MAINTENANCE"
  | "IDLE_STANDBY"
  | "FITNESS_EXPIRED_GROUNDED";

export type FuelVarianceStatus =
  | "NORMAL_TOLERANCE"
  | "THEFT_SUSPECTED_HIGH_BURN"
  | "IDLE_WASTAGE_EXCESS";

export interface PlantMachineryRecord {
  id: string;
  project_id: string;
  equipment_code: string;
  equipment_name: string;
  category: PlantMachineryCategory;
  make_and_model: string;
  serial_registration_no: string;
  ownership_type: PlantOwnership;
  contractor_name: string;
  hsd_baseline_burn_rate_lph: number;
  total_operating_hours: number;
  last_service_hours: number;
  next_service_due_hours: number;
  fitness_certificate_expiry: string;
  fitness_cert_issuer: string;
  operator_name: string;
  operator_license_no?: string | null;
  hourly_hire_rate_inr: number;
  status: PlantStatus;
  location_grid: string;
  created_at?: string;
}

export interface FuelTelematicsRecord {
  id: string;
  project_id: string;
  log_code: string;
  equipment_code: string;
  log_date: string;
  operating_hours: number;
  start_meter_hours: number;
  end_meter_hours: number;
  hsd_fuel_issued_litres: number;
  actual_burn_rate_lph: number;
  expected_fuel_litres: number;
  fuel_variance_litres: number;
  variance_percentage: number;
  variance_status: FuelVarianceStatus;
  bowser_dispenser_ref: string;
  shift: string;
  operator_signatory: string;
  verified_by_pm_lead?: string | null;
  remarks?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function computeFuelVariance(
  operatingHours: number,
  fuelIssuedLitres: number,
  baselineLph: number
) {
  const actualLph = operatingHours > 0 ? Number((fuelIssuedLitres / operatingHours).toFixed(2)) : 0;
  const expectedFuel = Number((operatingHours * baselineLph).toFixed(2));
  const varianceLitres = Number((fuelIssuedLitres - expectedFuel).toFixed(2));
  const variancePct = expectedFuel > 0 ? Number(((varianceLitres / expectedFuel) * 100).toFixed(2)) : 0;

  let status: FuelVarianceStatus = "NORMAL_TOLERANCE";
  if (variancePct > 15.0) {
    status = "THEFT_SUSPECTED_HIGH_BURN";
  } else if (variancePct < -20.0 && operatingHours > 3.0) {
    status = "IDLE_WASTAGE_EXCESS";
  }

  return { actualLph, expectedFuel, varianceLitres, variancePct, status };
}

function normalizePlantRecord(d: any): PlantMachineryRecord {
  const expiry = d?.fitness_certificate_expiry ?? new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const isExpired = new Date(expiry).getTime() < Date.now();

  return {
    id: d?.id ?? `pm-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    equipment_code: d?.equipment_code ?? `EQ-${Date.now().toString().slice(-4)}`,
    equipment_name: d?.equipment_name ?? "Heavy Plant Asset",
    category: (d?.category as PlantMachineryCategory) ?? "HEAVY_LIFTING_TOWER_CRANE",
    make_and_model: d?.make_and_model ?? "Potain MCi 85 A",
    serial_registration_no: d?.serial_registration_no ?? "MH-04-TC-8812",
    ownership_type: (d?.ownership_type as PlantOwnership) ?? "SUBCONTRACTOR_DEPLOYED",
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    hsd_baseline_burn_rate_lph: Number(d?.hsd_baseline_burn_rate_lph ?? 14.5),
    total_operating_hours: Number(d?.total_operating_hours ?? 1240),
    last_service_hours: Number(d?.last_service_hours ?? 1000),
    next_service_due_hours: Number(d?.next_service_due_hours ?? 1250),
    fitness_certificate_expiry: expiry,
    fitness_cert_issuer: d?.fitness_cert_issuer ?? "BOCW Approved Third Party Inspector",
    operator_name: d?.operator_name ?? "Certified Crane Operator",
    operator_license_no: d?.operator_license_no ?? "HMV-UP-2021-9921",
    hourly_hire_rate_inr: Number(d?.hourly_hire_rate_inr ?? 2500),
    status: isExpired ? "FITNESS_EXPIRED_GROUNDED" : (d?.status as PlantStatus) ?? "OPERATIONAL_ACTIVE",
    location_grid: d?.location_grid ?? "Tower A Core Base",
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

function normalizeFuelLog(d: any, baselineRate: number): FuelTelematicsRecord {
  const hours = Number(d?.operating_hours ?? 0);
  const issued = Number(d?.hsd_fuel_issued_litres ?? 0);
  const calc = computeFuelVariance(hours, issued, baselineRate);

  return {
    id: d?.id ?? `fl-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    log_code: d?.log_code ?? `FL-${Date.now().toString().slice(-4)}`,
    equipment_code: d?.equipment_code ?? "EQ-01",
    log_date: d?.log_date ?? new Date().toISOString().slice(0, 10),
    operating_hours: hours,
    start_meter_hours: Number(d?.start_meter_hours ?? 0),
    end_meter_hours: Number(d?.end_meter_hours ?? (Number(d?.start_meter_hours ?? 0) + hours)),
    hsd_fuel_issued_litres: issued,
    actual_burn_rate_lph: Number(d?.actual_burn_rate_lph ?? calc.actualLph),
    expected_fuel_litres: Number(d?.expected_fuel_litres ?? calc.expectedFuel),
    fuel_variance_litres: Number(d?.fuel_variance_litres ?? calc.varianceLitres),
    variance_percentage: Number(d?.variance_percentage ?? calc.variancePct),
    variance_status: (d?.variance_status as FuelVarianceStatus) ?? calc.status,
    bowser_dispenser_ref: d?.bowser_dispenser_ref ?? "BOWSER-01",
    shift: d?.shift ?? "DAY_SHIFT",
    operator_signatory: d?.operator_signatory ?? "Operator",
    verified_by_pm_lead: d?.verified_by_pm_lead ?? null,
    remarks: d?.remarks ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalPlantMachineryPage() {
  const { project, role, tier } = useActiveRole();
  const [equipmentList, setEquipmentList] = useState<PlantMachineryRecord[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelTelematicsRecord[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<PlantMachineryRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"EQUIPMENT_FLEET" | "FUEL_TELEMATICS">("EQUIPMENT_FLEET");
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Plant & Machinery Lead";
  const isPmOrDirector =
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleId === "RESIDENT_ENGINEER" ||
    roleLabel.includes("Machinery") ||
    roleLabel.includes("Plant") ||
    roleLabel.includes("Mechanical") ||
    roleLabel.includes("Director") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Lead");

  // Form State for Adding Plant Asset
  const [eqCode, setEqCode] = useState(`EQ-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-0${Math.floor(1 + Math.random() * 9)}`);
  const [eqName, setEqName] = useState(
    tier === "RESIDENTIAL"
      ? "Portable Dust-Free Plunge Saw & Edge Banding Rig"
      : "Liebherr 85 EC-B 5 Flat-Top Tower Crane"
  );
  const [eqCategory, setEqCategory] = useState<PlantMachineryCategory>(
    tier === "RESIDENTIAL" ? "DIESEL_GENERATOR_DG" : "HEAVY_LIFTING_TOWER_CRANE"
  );
  const [makeModel, setMakeModel] = useState(
    tier === "RESIDENTIAL" ? "Festool TS 55 FEBQ & Edge Bander" : "Liebherr 85 EC-B 5"
  );
  const [regNo, setRegNo] = useState(`REG-P&M-${Math.floor(1000 + Math.random() * 9000)}`);
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [burnRate, setBurnRate] = useState<number>(tier === "RESIDENTIAL" ? 3.5 : 16.0);
  const [hireRate, setHireRate] = useState<number>(tier === "RESIDENTIAL" ? 450 : 3200);
  const [gridLoc, setGridLoc] = useState(tier === "RESIDENTIAL" ? "First Floor Joinery Bay" : "Tower A Base Mast Grid B2");
  const [operator, setOperator] = useState("R. S. Chauhan");
  const [fitnessDate, setFitnessDate] = useState(
    new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10)
  );

  // Form State for Logging Fuel & Operating Hours
  const [logCode, setLogCode] = useState(`FL-${Date.now().toString().slice(-4)}`);
  const [opHours, setOpHours] = useState<number>(7.5);
  const [fuelLitres, setFuelLitres] = useState<number>(128.0);
  const [bowserRef, setBowserRef] = useState("BOWSER-01 (Site Central Tank)");
  const [logShift, setLogShift] = useState("DAY_SHIFT (08:00 - 18:00)");

  const loadPlantData = useCallback(async () => {
    try {
      const [{ data: eqData }, { data: flData }] = await Promise.all([
        (supabase as any)
          .from("plant_machinery_inventory")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("equipment_fuel_telematics_logs")
          .select("*")
          .eq("project_id", projectId)
          .order("log_date", { ascending: false }),
      ]);

      if (eqData && eqData.length > 0) {
        const normalized = eqData.map((d: any) => normalizePlantRecord(d));
        setEquipmentList(normalized);
        if (!selectedEquipment) setSelectedEquipment(normalized[0]);
      } else {
        const defaults: PlantMachineryRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizePlantRecord({
                  id: "pm-res-01",
                  project_id: projectId,
                  equipment_code: "DG-RES-01",
                  equipment_name: "Silent Canopy Diesel Generator (62.5 kVA)",
                  category: "DIESEL_GENERATOR_DG",
                  make_and_model: "Kirloskar Green KG62.5WS",
                  serial_registration_no: "KG-CANOPY-2026-881",
                  ownership_type: "SUBCONTRACTOR_DEPLOYED",
                  contractor_name: "Royal Woodworks & Interiors",
                  hsd_baseline_burn_rate_lph: 7.5,
                  total_operating_hours: 310,
                  last_service_hours: 250,
                  next_service_due_hours: 500,
                  fitness_certificate_expiry: "2027-02-15",
                  fitness_cert_issuer: "State Pollution Control Board Certified",
                  operator_name: "M. K. Tiwari",
                  hourly_hire_rate_inr: 850,
                  status: "OPERATIONAL_ACTIVE",
                  location_grid: "Ground Floor Utility Courtyard",
                }),
              ]
            : [
                normalizePlantRecord({
                  id: "pm-twr-01",
                  project_id: projectId,
                  equipment_code: "TC-TWR-01",
                  equipment_name: "Flat-Top Heavy Tower Crane (5 Ton)",
                  category: "HEAVY_LIFTING_TOWER_CRANE",
                  make_and_model: "Potain MCi 85 A (50m Jib)",
                  serial_registration_no: "MH-04-TC-881201",
                  ownership_type: "SUBCONTRACTOR_DEPLOYED",
                  contractor_name: "Narmada Concrete Works",
                  hsd_baseline_burn_rate_lph: 14.5,
                  total_operating_hours: 1480,
                  last_service_hours: 1250,
                  next_service_due_hours: 1500,
                  fitness_certificate_expiry: "2026-11-30",
                  fitness_cert_issuer: "Competent Person (BOCW Form 10)",
                  operator_name: "R. K. Yadav (Lic #HMV-99214)",
                  hourly_hire_rate_inr: 3500,
                  status: "OPERATIONAL_ACTIVE",
                  location_grid: "Tower A Mast Grid B2",
                }),
                normalizePlantRecord({
                  id: "pm-twr-02",
                  project_id: projectId,
                  equipment_code: "BP-TWR-01",
                  equipment_name: "High-Pressure Stationary Concrete Boom Pump",
                  category: "CONCRETE_BOOM_PUMP",
                  make_and_model: "Putzmeister BSA 1409 D",
                  serial_registration_no: "KA-01-PUMP-4412",
                  ownership_type: "SUBCONTRACTOR_DEPLOYED",
                  contractor_name: "Narmada Concrete Works",
                  hsd_baseline_burn_rate_lph: 18.0,
                  total_operating_hours: 890,
                  last_service_hours: 750,
                  next_service_due_hours: 1000,
                  fitness_certificate_expiry: "2026-10-15",
                  fitness_cert_issuer: "BOCW Safety Inspectorate",
                  operator_name: "Sunil Verma",
                  hourly_hire_rate_inr: 4200,
                  status: "OPERATIONAL_ACTIVE",
                  location_grid: "Ground Level Batching Point",
                }),
                normalizePlantRecord({
                  id: "pm-twr-03",
                  project_id: projectId,
                  equipment_code: "EXC-TWR-01",
                  equipment_name: "Hydraulic Crawler Excavator (20 Ton)",
                  category: "EARTHMOVING_EXCAVATOR",
                  make_and_model: "Tata Hitachi EX 200LC",
                  serial_registration_no: "UP-32-EX-1049",
                  ownership_type: "DRY_LEASE_HIRED",
                  contractor_name: "Narmada Concrete Works",
                  hsd_baseline_burn_rate_lph: 20.0,
                  total_operating_hours: 2490,
                  last_service_hours: 2250,
                  next_service_due_hours: 2500,
                  fitness_certificate_expiry: "2026-09-01", // Expired
                  fitness_cert_issuer: "BOCW Safety Board",
                  operator_name: "D. K. Singh",
                  hourly_hire_rate_inr: 2800,
                  status: "FITNESS_EXPIRED_GROUNDED",
                  location_grid: "Basement B2 Sump Area",
                }),
              ];

        setEquipmentList(defaults);
        if (!selectedEquipment) setSelectedEquipment(defaults[0]);
      }

      if (flData && flData.length > 0) {
        const baseline = selectedEquipment?.hsd_baseline_burn_rate_lph || 14.5;
        setFuelLogs(flData.map((d: any) => normalizeFuelLog(d, baseline)));
      } else {
        const defaultLogs: FuelTelematicsRecord[] = [
          normalizeFuelLog({
            id: "fl-01",
            project_id: projectId,
            log_code: "FL-2026-108",
            equipment_code: tier === "RESIDENTIAL" ? "DG-RES-01" : "TC-TWR-01",
            log_date: "2026-09-12",
            operating_hours: 8.0,
            start_meter_hours: 1472,
            end_meter_hours: 1480,
            hsd_fuel_issued_litres: 116.0,
            actual_burn_rate_lph: 14.5,
            bowser_dispenser_ref: "BOWSER-01",
            shift: "DAY_SHIFT",
            operator_signatory: "R. K. Yadav",
            verified_by_pm_lead: "P&M Superintendent",
            remarks: "Standard crane hoisting cycle for shear core rebar bundling. Fuel burn matches baseline exactly.",
          }, 14.5),
          normalizeFuelLog({
            id: "fl-02",
            project_id: projectId,
            log_code: "FL-2026-109",
            equipment_code: tier === "RESIDENTIAL" ? "DG-RES-01" : "BP-TWR-01",
            log_date: "2026-09-08",
            operating_hours: 6.5,
            start_meter_hours: 883.5,
            end_meter_hours: 890,
            hsd_fuel_issued_litres: 142.0,
            actual_burn_rate_lph: 21.85,
            expected_fuel_litres: 117.0,
            fuel_variance_litres: 25.0,
            variance_percentage: 21.37,
            variance_status: "THEFT_SUSPECTED_HIGH_BURN",
            bowser_dispenser_ref: "BOWSER-01",
            shift: "DAY_SHIFT",
            operator_signatory: "Sunil Verma",
            remarks: "Burn rate exceeded baseline by +21.4%. High pumping resistance on Level 08 vertical pipe column.",
          }, 18.0),
        ];

        setFuelLogs(defaultLogs);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedEquipment, tier]);

  useEffect(() => {
    void loadPlantData();

    const channel = supabase
      .channel(`plant_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "plant_machinery_inventory" }, () => void loadPlantData())
      .on("postgres_changes", { event: "*", schema: "public", table: "equipment_fuel_telematics_logs" }, () => void loadPlantData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadPlantData]);

  const currentEquipmentLogs = useMemo(() => {
    if (!selectedEquipment) return [];
    return fuelLogs.filter((l) => l.equipment_code === selectedEquipment.equipment_code);
  }, [fuelLogs, selectedEquipment]);

  const summary = useMemo(() => {
    const totalAssets = equipmentList.length;
    const activeUnits = equipmentList.filter((e) => e.status === "OPERATIONAL_ACTIVE").length;
    const groundedGroundedCount = equipmentList.filter(
      (e) => e.status === "FITNESS_EXPIRED_GROUNDED" || e.status === "UNDER_BREAKDOWN_MAINTENANCE"
    ).length;
    const totalFuelConsumed = fuelLogs.reduce((sum, l) => sum + Number(l.hsd_fuel_issued_litres || 0), 0);
    const theftSuspectedCount = fuelLogs.filter((l) => l.variance_status === "THEFT_SUSPECTED_HIGH_BURN").length;

    return { totalAssets, activeUnits, groundedGroundedCount, totalFuelConsumed, theftSuspectedCount };
  }, [equipmentList, fuelLogs]);

  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((e) => {
      const matchCat = filterCategory === "ALL" || e.category === filterCategory;
      const matchStat = filterStatus === "ALL" || e.status === filterStatus;
      const haystack = `${e.equipment_code} ${e.equipment_name} ${e.make_and_model} ${e.operator_name}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchCat && matchStat && matchSearch;
    });
  }, [equipmentList, filterCategory, filterStatus, search]);

  // Stage 1: Ground Equipment or Clear Statutory Fitness
  const handleGroundEquipment = async (eq: PlantMachineryRecord) => {
    if (!isPmOrDirector) return;
    setActionInProgress(`ground_${eq.id}`);

    const newStatus: PlantStatus =
      eq.status === "FITNESS_EXPIRED_GROUNDED" ? "OPERATIONAL_ACTIVE" : "FITNESS_EXPIRED_GROUNDED";

    const updatePayload: Partial<PlantMachineryRecord> = {
      status: newStatus,
      fitness_certificate_expiry:
        newStatus === "OPERATIONAL_ACTIVE"
          ? new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10)
          : eq.fitness_certificate_expiry,
    };

    try {
      await (supabase as any)
        .from("plant_machinery_inventory")
        .update(updatePayload)
        .eq("id", eq.id);
    } catch {
      // Local optimistic update
    }

    setEquipmentList((prev) =>
      prev.map((item) => (item.id === eq.id ? ({ ...item, ...updatePayload } as PlantMachineryRecord) : item))
    );
    if (selectedEquipment && selectedEquipment.id === eq.id) {
      setSelectedEquipment((prev) => (prev ? ({ ...prev, ...updatePayload } as PlantMachineryRecord) : null));
    }

    setFeedbackMessage(
      newStatus === "FITNESS_EXPIRED_GROUNDED"
        ? `Equipment ${eq.equipment_code} grounded! Deployment in pour cards blocked.`
        : `Statutory fitness renewed for ${eq.equipment_code}. Operational clearance active.`
    );
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Add New Plant Machinery Asset
  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_eq");

    const newDbRecord: Omit<PlantMachineryRecord, "id"> = {
      project_id: projectId,
      equipment_code: eqCode.trim(),
      equipment_name: eqName.trim(),
      category: eqCategory,
      make_and_model: makeModel.trim(),
      serial_registration_no: regNo.trim(),
      ownership_type: "SUBCONTRACTOR_DEPLOYED",
      contractor_name: contractor.trim(),
      hsd_baseline_burn_rate_lph: Number(burnRate),
      total_operating_hours: 0,
      last_service_hours: 0,
      next_service_due_hours: 250,
      fitness_certificate_expiry: fitnessDate,
      fitness_cert_issuer: "BOCW Safety Board Competent Person",
      operator_name: operator.trim(),
      hourly_hire_rate_inr: Number(hireRate),
      status: "OPERATIONAL_ACTIVE",
      location_grid: gridLoc.trim(),
    };

    try {
      const { data, error } = await (supabase as any)
        .from("plant_machinery_inventory")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizePlantRecord(data);
        setEquipmentList((prev) => [normalized, ...prev]);
        setSelectedEquipment(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizePlantRecord({ ...newDbRecord, id: `pm-${Date.now()}` });
      setEquipmentList((prev) => [fallback, ...prev]);
      setSelectedEquipment(fallback);
    }

    setEquipmentModalOpen(false);
    setActionInProgress(null);
  };

  // Submit Daily Fuel Issue & Telematics Log
  const handleSubmitFuelLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment) return;
    setActionInProgress("submitting_fuel");

    const baseline = selectedEquipment.hsd_baseline_burn_rate_lph;
    const calc = computeFuelVariance(Number(opHours), Number(fuelLitres), baseline);
    const startMtr = selectedEquipment.total_operating_hours;
    const endMtr = Number((startMtr + Number(opHours)).toFixed(2));

    const newDbRecord: Omit<FuelTelematicsRecord, "id"> = {
      project_id: projectId,
      log_code: logCode.trim(),
      equipment_code: selectedEquipment.equipment_code,
      log_date: new Date().toISOString().slice(0, 10),
      operating_hours: Number(opHours),
      start_meter_hours: startMtr,
      end_meter_hours: endMtr,
      hsd_fuel_issued_litres: Number(fuelLitres),
      actual_burn_rate_lph: calc.actualLph,
      expected_fuel_litres: calc.expectedFuel,
      fuel_variance_litres: calc.varianceLitres,
      variance_percentage: calc.variancePct,
      variance_status: calc.status,
      bowser_dispenser_ref: bowserRef.trim(),
      shift: logShift.trim(),
      operator_signatory: selectedEquipment.operator_name,
      verified_by_pm_lead: roleLabel || "P&M Superintendent",
      remarks: calc.variancePct > 15 ? "High burn rate flagged for mechanical audit." : "Burn within OEM baseline.",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("equipment_fuel_telematics_logs")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeFuelLog(data, baseline);
        setFuelLogs((prev) => [normalized, ...prev]);
      } else {
        throw error;
      }

      // Update machine total running hours
      await (supabase as any)
        .from("plant_machinery_inventory")
        .update({ total_operating_hours: endMtr })
        .eq("id", selectedEquipment.id);

      setSelectedEquipment((prev) => (prev ? { ...prev, total_operating_hours: endMtr } : null));
      setEquipmentList((prev) =>
        prev.map((item) => (item.id === selectedEquipment.id ? { ...item, total_operating_hours: endMtr } : item))
      );
    } catch {
      const fallback = normalizeFuelLog({ ...newDbRecord, id: `fl-${Date.now()}` }, baseline);
      setFuelLogs((prev) => [fallback, ...prev]);
    }

    setFuelModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory CPWD Form 31 / Plant Machinery Log Sheet Print
  const handlePrintLogSheet = (eq: PlantMachineryRecord, logs: FuelTelematicsRecord[]) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Plant &amp; Machinery Logbook (CPWD Form 31) — ${eq.equipment_code}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .active { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .grounded { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD Works Manual Section 19 / Form 31 P&amp;M Logbook</div>
      <h1 class="title">Plant &amp; Machinery Log Sheet &amp; Fuel Telematics</h1>
      <div class="meta">Asset Code: ${eq.equipment_code} · Reg: ${eq.serial_registration_no} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${eq.status === "OPERATIONAL_ACTIVE" ? "active" : "grounded"}">${eq.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Equipment Description</th><td><strong>${eq.equipment_name}</strong></td><th>Category</th><td>${eq.category.replace(/_/g, " ")}</td></tr>
    <tr><th>Make &amp; Model</th><td>${eq.make_and_model}</td><th>Location Grid</th><td><strong>${eq.location_grid}</strong></td></tr>
    <tr><th>Operating Contractor</th><td><strong>${eq.contractor_name}</strong></td><th>Assigned Operator</th><td>${eq.operator_name} (${eq.operator_license_no || "HMV License"})</td></tr>
    <tr><th>Statutory Fitness Expiry</th><td><strong>${eq.fitness_certificate_expiry}</strong></td><th>Third-Party Issuer</th><td>${eq.fitness_cert_issuer}</td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Telemetry Performance &amp; Preventive Maintenance Status</div>
    <div>Total Operating Hours: <strong>${eq.total_operating_hours} Hours</strong> &bull; Next Service Threshold: <strong>${eq.next_service_due_hours} Hours</strong> &bull; OEM Baseline Fuel Rate: <strong>${eq.hsd_baseline_burn_rate_lph} L/hr</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Log Ref</th>
        <th class="tac">Shift</th>
        <th class="tar">Hours Run</th>
        <th class="tar">Fuel Issued (L)</th>
        <th class="tar">Burn Rate (L/hr)</th>
        <th class="tar">Variance</th>
        <th class="tac">Telematics Status</th>
      </tr>
    </thead>
    <tbody>
      ${logs.map((l) => `
        <tr>
          <td>${l.log_date}</td>
          <td style="font-family: monospace;">${l.log_code}</td>
          <td class="tac">${l.shift.replace(/_/g, " ")}</td>
          <td class="tar font-bold">${l.operating_hours} hrs</td>
          <td class="tar font-bold">${l.hsd_fuel_issued_litres} L</td>
          <td class="tar">${l.actual_burn_rate_lph} L/hr</td>
          <td class="tar" style="color: ${l.variance_percentage > 15 ? "#b91c1c" : "#15803d"}; font-weight: bold;">
            ${l.variance_percentage > 0 ? `+${l.variance_percentage}%` : `${l.variance_percentage}%`}
          </td>
          <td class="tac font-bold" style="color: ${l.variance_status === "THEFT_SUSPECTED_HIGH_BURN" ? "#b91c1c" : "#15803d"}; font-size: 10px;">
            ${l.variance_status.replace(/_/g, " ")}
          </td>
        </tr>
      `).join("")}
      <tr class="total-row">
        <td colspan="3"><strong>CUMULATIVE TELEMETRY TOTALS</strong></td>
        <td class="tar font-bold" style="color: #0369a1;">${logs.reduce((sum, l) => sum + l.operating_hours, 0).toFixed(1)} hrs</td>
        <td class="tar font-bold" style="color: #0369a1;">${logs.reduce((sum, l) => sum + l.hsd_fuel_issued_litres, 0).toFixed(1)} L</td>
        <td colspan="3"></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>Authorized Plant Operator</div>
      <div style="color: #64748b;">${eq.operator_name}</div>
      <div class="sig">Operator Signature</div>
    </div>
    <div>
      <div>Site P&amp;M Superintendent</div>
      <div style="color: #64748b;">Meter &amp; Fuel Log Verified</div>
      <div class="sig">P&amp;M Inspection Stamp</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">Safety Fitness Authenticated</div>
      <div class="sig">Engineer Sanction Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedEquipment) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING PLANT &amp; MACHINERY (P&amp;M) &amp; FUEL TELEMATICS ENGINE...
      </div>
    );
  }

  const isGrounded = selectedEquipment.status === "FITNESS_EXPIRED_GROUNDED";
  const hoursToNextService = Number((selectedEquipment.next_service_due_hours - selectedEquipment.total_operating_hours).toFixed(1));
  const isServiceOverdue = hoursToNextService <= 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Plant &amp; Fleet Operations · CPWD Works Manual Section 19 / Form 31</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Plant &amp; Machinery (P&amp;M), Fuel &amp; Equipment Telematics
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Heavy equipment and fuel telematics clearinghouse. Audits third-party BOCW safety fitness certifications, enforces anti-theft fuel burn variance tracking against OEM baselines, and tracks engine preventive maintenance schedules.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintLogSheet(selectedEquipment, currentEquipmentLogs)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form 31 Log</span>
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
                setEqCode(`EQ-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-0${equipmentList.length + 1}`);
                setEquipmentModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Register Plant Asset</span>
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
              <span>Operational Fleet</span>
              <Truck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {summary.activeUnits} / {summary.totalAssets} Units
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Available for active site pours</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>HSD Diesel Issued</span>
              <Fuel className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.totalFuelConsumed.toLocaleString("en-IN")} L
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Bowsers &amp; site tanks dispensed</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Fitness Expired / Grounded</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.groundedGroundedCount > 0 ? "text-rose-400" : "text-zinc-400"}`}>
              {summary.groundedGroundedCount} Asset(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Statutory deployment blocked</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Abnormal Fuel Burn Flags</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.theftSuspectedCount > 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {summary.theftSuspectedCount} Incident(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">&gt;+15% OEM baseline deviation</div>
          </div>
        </div>

        {/* GROUNDED WARNING CALLOUT */}
        {isGrounded && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <strong className="text-rose-200 text-xs uppercase tracking-wider block">
                  Statutory Equipment Grounding: Fitness Certificate Expired
                </strong>
                <span className="text-xs text-rose-300/80 font-sans">
                  The statutory third-party fitness certification for {selectedEquipment.equipment_name} ({selectedEquipment.equipment_code}) expired on {selectedEquipment.fitness_certificate_expiry}. Under BOCW Central Rules, equipment operation is prohibited.
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={actionInProgress === `ground_${selectedEquipment.id}`}
              onClick={() => handleGroundEquipment(selectedEquipment)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 transition font-mono"
            >
              Renew Fitness &amp; Clear
            </button>
          </div>
        )}

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Equipment (${equipmentList.length})` },
              { key: "OPERATIONAL_ACTIVE", label: "Active" },
              { key: "FITNESS_EXPIRED_GROUNDED", label: `Grounded (${summary.groundedGroundedCount})` },
              { key: "UNDER_BREAKDOWN_MAINTENANCE", label: "Maintenance" },
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
              <option value="HEAVY_LIFTING_TOWER_CRANE">Tower Cranes</option>
              <option value="CONCRETE_BOOM_PUMP">Boom Pumps</option>
              <option value="CONCRETE_BATCHING_PLANT">Batching Plants</option>
              <option value="EARTHMOVING_EXCAVATOR">Excavators</option>
              <option value="DIESEL_GENERATOR_DG">Diesel Generators</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search equipment, code, model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: EQUIPMENT ROSTER (5 cols) vs FUEL TELEMATICS & MAINTENANCE DESK (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: EQUIPMENT LISTING (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Form 31 Plant Master
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Heavy Plant &amp; Fleet Inventory</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredEquipment.length} Assets</span>
            </div>

            <div className="space-y-3">
              {filteredEquipment.map((eq) => {
                const isSelected = selectedEquipment.id === eq.id;
                const isOper = eq.status === "OPERATIONAL_ACTIVE";

                return (
                  <div
                    key={eq.id}
                    onClick={() => setSelectedEquipment(eq)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {eq.equipment_code}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isOper
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                        }`}>
                          {eq.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-white">
                          {eq.total_operating_hours} hrs
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          OEM: {eq.hsd_baseline_burn_rate_lph} L/hr
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{eq.equipment_name}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        {eq.make_and_model} &bull; Reg: <strong className="text-zinc-200">{eq.serial_registration_no}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Operator: <strong className="text-zinc-300">{eq.operator_name}</strong></span>
                      <span>Fitness Expiry: <strong className={new Date(eq.fitness_certificate_expiry).getTime() < Date.now() ? "text-rose-400" : "text-zinc-300"}>{eq.fitness_certificate_expiry}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: FUEL TELEMATICS & MAINTENANCE TELEMETRY (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Equipment Telematics &amp; Maintenance Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedEquipment.equipment_code} &mdash; {selectedEquipment.equipment_name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLogCode(`FL-${Date.now().toString().slice(-4)}`);
                    setFuelModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-mono font-bold flex items-center gap-1 shadow-md shadow-cyan-950/50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Fuel &amp; Hours</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-zinc-500 block">Category:</span>
                  <strong className="text-white block mt-0.5">{selectedEquipment.category.replace(/_/g, " ")}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">Make &amp; Model:</span>
                  <span className="text-cyan-300 font-bold block mt-0.5">{selectedEquipment.make_and_model}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Grid Coordinate:</span>
                  <span className="text-white block mt-0.5">{selectedEquipment.location_grid}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">OEM Baseline Burn:</span>
                  <span className="text-white font-bold">{selectedEquipment.hsd_baseline_burn_rate_lph} L/hr</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Service Due In:</span>
                  <span className={`font-bold ${isServiceOverdue ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
                    {hoursToNextService > 0 ? `${hoursToNextService} Hours` : "SERVICE OVERDUE"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Fitness Expiry:</span>
                  <span className={`font-bold ${new Date(selectedEquipment.fitness_certificate_expiry).getTime() < Date.now() ? "text-rose-400" : "text-zinc-300"}`}>
                    {selectedEquipment.fitness_certificate_expiry}
                  </span>
                </div>
              </div>
            </div>

            {/* FUEL DISPENSING & VARIANCE TELEMETRY LOGS */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                  High-Speed Diesel (HSD) Fuel Dispensing &amp; Burn Audit:
                </span>
                <span className="text-[10px] text-zinc-400">{currentEquipmentLogs.length} Dispensing Events</span>
              </div>

              <div className="space-y-2.5">
                {currentEquipmentLogs.map((log) => {
                  const isTheft = log.variance_status === "THEFT_SUSPECTED_HIGH_BURN";

                  return (
                    <div
                      key={log.id}
                      className={`p-3 rounded-xl border transition space-y-2 ${
                        isTheft
                          ? "bg-rose-950/20 border-rose-800/50"
                          : "bg-zinc-950/60 border-zinc-800"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white font-mono text-xs">{log.log_code}</span>
                          <span className="text-[10px] text-zinc-400">{log.log_date} &bull; {log.shift.replace(/_/g, " ")}</span>
                          <span className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase ${
                            isTheft
                              ? "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                              : "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                          }`}>
                            {log.variance_status.replace(/_/g, " ")}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-xs text-white">{log.hsd_fuel_issued_litres} L</span>
                          <span className={`text-[10px] ml-2 font-bold ${
                            log.variance_percentage > 15 ? "text-rose-400" : "text-emerald-400"
                          }`}>
                            {log.actual_burn_rate_lph} L/hr ({log.variance_percentage > 0 ? `+${log.variance_percentage}%` : `${log.variance_percentage}%`})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1.5 border-t border-zinc-800/60">
                        <span>Meter Hours: <strong className="text-zinc-200">{log.start_meter_hours} &rarr; {log.end_meter_hours} ({log.operating_hours} hrs)</strong></span>
                        <span>Dispenser: <strong className="text-cyan-300">{log.bowser_dispenser_ref}</strong></span>
                      </div>

                      {log.remarks && (
                        <div className="text-[10px] text-zinc-400 font-sans italic">
                          {log.remarks}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ACTIONS: GROUND / RELEASE ASSET */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Statutory Safety Control:
              </span>

              <button
                type="button"
                disabled={!isPmOrDirector || actionInProgress === `ground_${selectedEquipment.id}`}
                onClick={() => handleGroundEquipment(selectedEquipment)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 font-mono shadow-md ${
                  isGrounded
                    ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-950/50"
                    : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50"
                }`}
              >
                {isGrounded ? (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Renew BOCW Safety Certificate &amp; Clear for Operation</span>
                  </>
                ) : (
                  <>
                    <AlertOctagon className="w-4 h-4" />
                    <span>Ground Equipment (Enforce Statutory Safety Halt)</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD Works Manual Section 19 &amp; BOCW Act Central Rules 1998
            </div>
          </div>

        </div>

        {/* REGISTER PLANT ASSET MODAL */}
        {equipmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Register Heavy Plant Asset (Form 31)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEquipmentModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateEquipment} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Equipment Code</label>
                    <input
                      type="text"
                      required
                      value={eqCode}
                      onChange={(e) => setEqCode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Category</label>
                    <select
                      value={eqCategory}
                      onChange={(e) => setEqCategory(e.target.value as PlantMachineryCategory)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="HEAVY_LIFTING_TOWER_CRANE">Tower Crane</option>
                      <option value="CONCRETE_BOOM_PUMP">Concrete Boom Pump</option>
                      <option value="CONCRETE_BATCHING_PLANT">Batching Plant</option>
                      <option value="EARTHMOVING_EXCAVATOR">Excavator</option>
                      <option value="DIESEL_GENERATOR_DG">Diesel Generator</option>
                      <option value="TRANSIT_MIXER">Transit Mixer</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Equipment Asset Description</label>
                  <input
                    type="text"
                    required
                    value={eqName}
                    onChange={(e) => setEqName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Make &amp; Model</label>
                    <input
                      type="text"
                      required
                      value={makeModel}
                      onChange={(e) => setMakeModel(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Registration / Serial No.</label>
                    <input
                      type="text"
                      required
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Baseline Burn (L/hr)</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={burnRate}
                      onChange={(e) => setBurnRate(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Hourly Hire (₹)</label>
                    <input
                      type="number"
                      required
                      value={hireRate}
                      onChange={(e) => setHireRate(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Fitness Expiry</label>
                    <input
                      type="date"
                      required
                      value={fitnessDate}
                      onChange={(e) => setFitnessDate(e.target.value)}
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
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Assigned Operator</label>
                    <input
                      type="text"
                      required
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setEquipmentModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === "creating_eq"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Register Equipment Asset</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* LOG FUEL & OPERATING HOURS MODAL */}
        {fuelModalOpen && selectedEquipment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Log Fuel &amp; Hours: {selectedEquipment.equipment_code}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setFuelModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitFuelLog} className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 font-mono text-[11px] space-y-1">
                  <div className="text-zinc-400">Current Total Hours: <strong className="text-white">{selectedEquipment.total_operating_hours} hrs</strong></div>
                  <div className="text-zinc-400">OEM Baseline Burn: <strong className="text-cyan-300">{selectedEquipment.hsd_baseline_burn_rate_lph} Litres/hour</strong></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Operating Hours Run</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={opHours}
                      onChange={(e) => setOpHours(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">HSD Fuel Issued (Litres)</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={fuelLitres}
                      onChange={(e) => setFuelLitres(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Fuel Bowser / Tank Dispenser</label>
                  <input
                    type="text"
                    required
                    value={bowserRef}
                    onChange={(e) => setBowserRef(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Operational Shift</label>
                  <input
                    type="text"
                    required
                    value={logShift}
                    onChange={(e) => setLogShift(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setFuelModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === "submitting_fuel"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Commit Telematics Entry</span>
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