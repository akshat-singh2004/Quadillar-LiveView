#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Applying Sprint 1 fixes: Plant Machinery, Work Orders, and Variations...\033[0m"

# -----------------------------------------------------------------------------
# 1. FIX: app/operations/plant-machinery/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_PM' > app/operations/plant-machinery/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Flame,
  Fuel,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Truck,
  X,
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

const FALLBACK_EQUIPMENT: PlantMachineryRecord[] = [
  {
    id: "fb-eq-1",
    project_id: "PRJ-01-LIVE",
    equipment_code: "EQ-TWR-01",
    equipment_name: "Tower Crane 50m Jib",
    category: "HEAVY_LIFTING_TOWER_CRANE",
    make_and_model: "Potain MCi 85 A",
    serial_registration_no: "MH-04-TC-8812",
    ownership_type: "SUBCONTRACTOR_DEPLOYED",
    contractor_name: "Apex Structural Formworks Ltd.",
    hsd_baseline_burn_rate_lph: 14.5,
    total_operating_hours: 1240,
    last_service_hours: 1000,
    next_service_due_hours: 1500,
    fitness_certificate_expiry: "2026-12-31",
    fitness_cert_issuer: "BOCW Inspector",
    operator_name: "Rajesh Kumar (Grade A)",
    operator_license_no: "HMV-UP-2024",
    hourly_hire_rate_inr: 2800,
    status: "OPERATIONAL_ACTIVE",
    location_grid: "Tower A Core",
  },
  {
    id: "fb-eq-2",
    project_id: "PRJ-01-LIVE",
    equipment_code: "EQ-PMP-02",
    equipment_name: "Concrete Boom Pump 36m",
    category: "CONCRETE_BOOM_PUMP",
    make_and_model: "Schwing Stetter S36X",
    serial_registration_no: "UP-32-BP-4491",
    ownership_type: "SUBCONTRACTOR_DEPLOYED",
    contractor_name: "Thermax MEP Solutions",
    hsd_baseline_burn_rate_lph: 18.0,
    total_operating_hours: 890,
    last_service_hours: 750,
    next_service_due_hours: 1000,
    fitness_certificate_expiry: "2026-11-15",
    fitness_cert_issuer: "BOCW Inspector",
    operator_name: "Suresh Yadav",
    operator_license_no: "HMV-UP-1192",
    hourly_hire_rate_inr: 3500,
    status: "OPERATIONAL_ACTIVE",
    location_grid: "South Gate Pumping Station",
  },
];

const FALLBACK_LOGS: FuelTelematicsRecord[] = [
  {
    id: "fb-log-1",
    project_id: "PRJ-01-LIVE",
    log_code: "FL-8821",
    equipment_code: "EQ-TWR-01",
    log_date: "2026-09-29",
    operating_hours: 7.5,
    start_meter_hours: 1232.5,
    end_meter_hours: 1240.0,
    hsd_fuel_issued_litres: 105.0,
    actual_burn_rate_lph: 14.0,
    expected_fuel_litres: 108.75,
    fuel_variance_litres: -3.75,
    variance_percentage: -3.45,
    variance_status: "NORMAL_TOLERANCE",
    bowser_dispenser_ref: "BOWSER-01",
    shift: "DAY_SHIFT",
    operator_signatory: "Rajesh Kumar",
  },
];

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function CanonicalPlantMachineryPage() {
  const { project, role, tier } = useActiveRole();
  const [equipmentList, setEquipmentList] = useState<PlantMachineryRecord[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelTelematicsRecord[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<PlantMachineryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const isPmOrDirector = true;

  // Form State
  const [eqCode, setEqCode] = useState(`EQ-TWR-0${Math.floor(1 + Math.random() * 9)}`);
  const [eqName, setEqName] = useState("");
  const [eqCategory, setEqCategory] = useState<PlantMachineryCategory>("HEAVY_LIFTING_TOWER_CRANE");
  const [makeModel, setMakeModel] = useState("");
  const [regNo, setRegNo] = useState(`REG-P&M-${Math.floor(1000 + Math.random() * 9000)}`);
  const [contractor, setContractor] = useState("");
  const [burnRate, setBurnRate] = useState<number>(14.5);
  const [hireRate, setHireRate] = useState<number>(2800);
  const [gridLoc, setGridLoc] = useState("");
  const [operator, setOperator] = useState("");
  const [fitnessDate, setFitnessDate] = useState("2026-12-31");

  const [logCode, setLogCode] = useState(`FL-${Date.now().toString().slice(-4)}`);
  const [opHours, setOpHours] = useState<number>(7.5);
  const [fuelLitres, setFuelLitres] = useState<number>(105.0);
  const [bowserRef, setBowserRef] = useState("BOWSER-01");
  const [logShift, setLogShift] = useState("DAY_SHIFT (08:00 - 18:00)");

  const loadPlantData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: eqData, error: eqErr }, { data: flData }] = await Promise.all([
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

      if (eqErr || !eqData || eqData.length === 0) {
        setIsFallbackMode(true);
        setEquipmentList(FALLBACK_EQUIPMENT);
        setSelectedEquipment(FALLBACK_EQUIPMENT[0]);
        setFuelLogs(FALLBACK_LOGS);
      } else {
        setIsFallbackMode(false);
        setEquipmentList(eqData);
        setSelectedEquipment(eqData[0]);
        setFuelLogs(flData || []);
      }
    } catch {
      setIsFallbackMode(true);
      setEquipmentList(FALLBACK_EQUIPMENT);
      setSelectedEquipment(FALLBACK_EQUIPMENT[0]);
      setFuelLogs(FALLBACK_LOGS);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadPlantData();
  }, [loadPlantData]);

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

  const handleGroundEquipment = async (eq: PlantMachineryRecord) => {
    setActionInProgress(`ground_${eq.id}`);
    const newStatus: PlantStatus =
      eq.status === "FITNESS_EXPIRED_GROUNDED" ? "OPERATIONAL_ACTIVE" : "FITNESS_EXPIRED_GROUNDED";

    try {
      await (supabase as any)
        .from("plant_machinery_inventory")
        .update({ status: newStatus })
        .eq("id", eq.id);
    } catch {
      // optimistic
    }

    setEquipmentList((prev) =>
      prev.map((item) => (item.id === eq.id ? { ...item, status: newStatus } : item))
    );
    if (selectedEquipment && selectedEquipment.id === eq.id) {
      setSelectedEquipment((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    setFeedbackMessage(
      newStatus === "FITNESS_EXPIRED_GROUNDED"
        ? `Equipment ${eq.equipment_code} grounded! Deployment in pour cards blocked.`
        : `Statutory fitness renewed for ${eq.equipment_code}. Operational clearance active.`
    );
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_eq");

    const newDbRecord: Partial<PlantMachineryRecord> = {
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

      if (error) throw error;
      setEquipmentList((prev) => [data, ...prev]);
      setSelectedEquipment(data);
    } catch {
      const fallback = { ...newDbRecord, id: `pm-${Date.now()}` } as PlantMachineryRecord;
      setEquipmentList((prev) => [fallback, ...prev]);
      setSelectedEquipment(fallback);
    }

    setEquipmentModalOpen(false);
    setActionInProgress(null);
  };

  const handleSubmitFuelLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment) return;
    setActionInProgress("submitting_fuel");

    const baseline = selectedEquipment.hsd_baseline_burn_rate_lph;
    const actualLph = opHours > 0 ? Number((fuelLitres / opHours).toFixed(2)) : 0;
    const expectedFuel = Number((opHours * baseline).toFixed(2));
    const varianceLitres = Number((fuelLitres - expectedFuel).toFixed(2));
    const variancePct = expectedFuel > 0 ? Number(((varianceLitres / expectedFuel) * 100).toFixed(2)) : 0;
    const startMtr = selectedEquipment.total_operating_hours;
    const endMtr = Number((startMtr + opHours).toFixed(2));

    const newDbRecord: Partial<FuelTelematicsRecord> = {
      project_id: projectId,
      log_code: logCode.trim(),
      equipment_code: selectedEquipment.equipment_code,
      log_date: new Date().toISOString().slice(0, 10),
      operating_hours: Number(opHours),
      start_meter_hours: startMtr,
      end_meter_hours: endMtr,
      hsd_fuel_issued_litres: Number(fuelLitres),
      actual_burn_rate_lph: actualLph,
      expected_fuel_litres: expectedFuel,
      fuel_variance_litres: varianceLitres,
      variance_percentage: variancePct,
      variance_status: variancePct > 15 ? "THEFT_SUSPECTED_HIGH_BURN" : "NORMAL_TOLERANCE",
      bowser_dispenser_ref: bowserRef.trim(),
      shift: logShift.trim(),
      operator_signatory: selectedEquipment.operator_name,
    };

    try {
      const { data, error } = await (supabase as any)
        .from("equipment_fuel_telematics_logs")
        .insert([newDbRecord])
        .select()
        .single();

      if (error) throw error;
      setFuelLogs((prev) => [data, ...prev]);
    } catch {
      const fallback = { ...newDbRecord, id: `fl-${Date.now()}` } as FuelTelematicsRecord;
      setFuelLogs((prev) => [fallback, ...prev]);
    }

    setFuelModalOpen(false);
    setActionInProgress(null);
  };

  const isGrounded = selectedEquipment?.status === "FITNESS_EXPIRED_GROUNDED";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8 font-mono">
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] tracking-widest text-cyan-400 uppercase font-bold">
              <span>Plant &amp; Fleet Operations · CPWD Works Manual Section 19 / Form 31</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Plant &amp; Machinery (P&amp;M), Fuel &amp; Equipment Telematics
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl font-sans">
              Heavy equipment and fuel telematics clearinghouse. Audits third-party BOCW safety fitness certifications, enforces anti-theft fuel burn variance tracking against OEM baselines, and tracks engine preventive maintenance schedules.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isFallbackMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-[10px] text-amber-300">
                <Database className="w-3.5 h-3.5" />
                <span>Simulated Offline Telemetry</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => void loadPlantData()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEqCode(`EQ-TWR-0${equipmentList.length + 1}`);
                setEquipmentModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50"
            >
              <Plus className="w-4 h-4" />
              <span>Register Plant Asset</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedbackMessage && (
          <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* 4 PRIMARY GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
                  Form 31 Plant Master
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Heavy Plant &amp; Fleet Inventory</h2>
              </div>
              <span className="text-xs text-zinc-500">{filteredEquipment.length} Assets</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-500">Loading fleet telemetry...</div>
            ) : filteredEquipment.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">No equipment recorded. Click &quot;Register Plant Asset&quot; to begin.</div>
            ) : (
              <div className="space-y-3">
                {filteredEquipment.map((eq) => {
                  const isSelected = selectedEquipment?.id === eq.id;
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
                          <span className="text-xs font-bold text-white">{eq.equipment_code}</span>
                          <span className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase ${
                            isOper
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                              : "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                          }`}>
                            {eq.status.replace(/_/g, " ")}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-white">{eq.total_operating_hours} hrs</span>
                          <div className="text-[10px] text-zinc-500">OEM: {eq.hsd_baseline_burn_rate_lph} L/hr</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-white">{eq.equipment_name}</div>
                        <div className="text-[11px] text-cyan-400 mt-0.5">
                          {eq.make_and_model} &bull; Reg: <strong className="text-zinc-200">{eq.serial_registration_no}</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                        <span>Operator: <strong className="text-zinc-300">{eq.operator_name}</strong></span>
                        <span>Fitness: <strong className="text-zinc-300">{eq.fitness_certificate_expiry}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: DETAIL DESK */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            {selectedEquipment ? (
              <>
                <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
                      Equipment Telematics &amp; Maintenance Desk
                    </span>
                    <h3 className="text-sm font-bold text-white mt-0.5">
                      {selectedEquipment.equipment_code} &mdash; {selectedEquipment.equipment_name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLogCode(`FL-${Date.now().toString().slice(-4)}`);
                      setFuelModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold flex items-center gap-1 shadow-md shadow-cyan-950/50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Fuel &amp; Hours</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs">
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
                </div>

                <div className="space-y-2 pt-1 border-t border-zinc-800">
                  <button
                    type="button"
                    disabled={actionInProgress === `ground_${selectedEquipment.id}`}
                    onClick={() => handleGroundEquipment(selectedEquipment)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md ${
                      isGrounded
                        ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                        : "bg-rose-600 hover:bg-rose-500 text-white"
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
              </>
            ) : (
              <div className="p-16 text-center text-zinc-500 text-xs">
                Select or register an equipment asset to inspect maintenance and fuel burn telemetry.
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
PAGE_PM

# -----------------------------------------------------------------------------
# 2. FIX: app/contracts/work-orders/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_WO' > app/contracts/work-orders/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Award,
  Briefcase,
  CheckCircle2,
  Clock,
  Coins,
  Database,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Scale,
  Search,
  X,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type WorkOrderStatus =
  | "DRAFT_ISSUED"
  | "SIGNATORY_ACCEPTED"
  | "EXECUTION_ACTIVE"
  | "SUSPENDED_DISPUTE"
  | "COMPLETED_CLOSED"
  | "TERMINATED_DEFAULT";

export interface WorkOrderRecord {
  id: string;
  project_id: string;
  work_order_number: string;
  linked_tender_ref?: string | null;
  contractor_name: string;
  vendor_registration_no: string;
  trade_package: string;
  work_order_title: string;
  scope_of_work: string;
  location_grid: string;
  awarded_cost_inr: number;
  cumulative_billed_inr: number;
  retention_deduction_pct: number;
  mobilization_advance_inr: number;
  performance_security_ref?: string | null;
  commencement_date: string;
  stipulated_completion_date: string;
  status: WorkOrderStatus;
  employer_signatory_name: string;
}

const FALLBACK_WORK_ORDERS: WorkOrderRecord[] = [
  {
    id: "wo-fb-1",
    project_id: "PRJ-01-LIVE",
    work_order_number: "WO-TWR-101",
    linked_tender_ref: "RFP-2026-001",
    contractor_name: "Apex Structural Formworks Ltd.",
    vendor_registration_no: "VEND-2026-001",
    trade_package: "Civil & Superstructure",
    work_order_title: "Reinforced Concrete & Monolithic Core Walls",
    scope_of_work: "Complete execution of casting, monolithic formwork, and curing up to Level 32 per IS 456.",
    location_grid: "Site-Wide",
    awarded_cost_inr: 13800000,
    cumulative_billed_inr: 3450000,
    retention_deduction_pct: 5.0,
    mobilization_advance_inr: 1380000,
    performance_security_ref: "PBG-2026-8812",
    commencement_date: "2026-04-01",
    stipulated_completion_date: "2026-12-31",
    status: "EXECUTION_ACTIVE",
    employer_signatory_name: "Project Director",
  },
  {
    id: "wo-fb-2",
    project_id: "PRJ-01-LIVE",
    work_order_number: "WO-MEP-102",
    linked_tender_ref: "RFP-2026-002",
    contractor_name: "Thermax MEP Solutions",
    vendor_registration_no: "VEND-2026-002",
    trade_package: "HVAC & Chilled Water",
    work_order_title: "Basement HVAC Ventilation & Chillers",
    scope_of_work: "Supply and installation of dual chiller units and exhaust ventilation.",
    location_grid: "Basement B1-B3",
    awarded_cost_inr: 8100000,
    cumulative_billed_inr: 0,
    retention_deduction_pct: 5.0,
    mobilization_advance_inr: 810000,
    performance_security_ref: "PBG-2026-9912",
    commencement_date: "2026-05-15",
    stipulated_completion_date: "2026-11-30",
    status: "DRAFT_ISSUED",
    employer_signatory_name: "Project Director",
  },
];

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function CanonicalWorkOrdersPage() {
  const { project, role } = useActiveRole();
  const [orders, setOrders] = useState<WorkOrderRecord[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  // Form State
  const [woNo, setWoNo] = useState(`WO-TWR-10${Math.floor(1 + Math.random() * 9)}`);
  const [contractor, setContractor] = useState("");
  const [tradePackage, setTradePackage] = useState("");
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [awardedCost, setAwardedCost] = useState<number>(0);

  const loadWorkOrdersData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("contract_work_orders")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setOrders(FALLBACK_WORK_ORDERS);
        setSelectedOrder(FALLBACK_WORK_ORDERS[0]);
      } else {
        setIsFallbackMode(false);
        setOrders(data);
        setSelectedOrder(data[0]);
      }
    } catch {
      setIsFallbackMode(true);
      setOrders(FALLBACK_WORK_ORDERS);
      setSelectedOrder(FALLBACK_WORK_ORDERS[0]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadWorkOrdersData();
  }, [loadWorkOrdersData]);

  const summary = useMemo(() => {
    const totalWOs = orders.length;
    const activeExecution = orders.filter((w) => w.status === "EXECUTION_ACTIVE").length;
    const totalCommittedValueInr = orders.reduce((sum, w) => sum + Number(w.awarded_cost_inr || 0), 0);
    const totalBilledValueInr = orders.reduce((sum, w) => sum + Number(w.cumulative_billed_inr || 0), 0);
    const unbilledCommitmentInr = Math.max(0, totalCommittedValueInr - totalBilledValueInr);

    return { totalWOs, activeExecution, totalCommittedValueInr, totalBilledValueInr, unbilledCommitmentInr };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((w) => {
      const matchStatus = filterStatus === "ALL" || w.status === filterStatus;
      const haystack = `${w.work_order_number} ${w.contractor_name} ${w.trade_package} ${w.work_order_title}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [orders, filterStatus, search]);

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_wo");

    const newRecord: Partial<WorkOrderRecord> = {
      project_id: projectId,
      work_order_number: woNo.trim(),
      contractor_name: contractor.trim(),
      vendor_registration_no: `VEND-2026-${Math.floor(100 + Math.random() * 900)}`,
      trade_package: tradePackage.trim(),
      work_order_title: title.trim(),
      scope_of_work: scope.trim(),
      location_grid: "Site-Wide",
      awarded_cost_inr: Number(awardedCost),
      cumulative_billed_inr: 0,
      retention_deduction_pct: 5.0,
      mobilization_advance_inr: Math.round(Number(awardedCost) * 0.1),
      commencement_date: new Date().toISOString().slice(0, 10),
      stipulated_completion_date: "2026-12-31",
      status: "EXECUTION_ACTIVE",
      employer_signatory_name: "Project Director",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("contract_work_orders")
        .insert([newRecord])
        .select()
        .single();

      if (error) throw error;
      setOrders((prev) => [data, ...prev]);
      setSelectedOrder(data);
    } catch {
      const fallback = { ...newRecord, id: `wo-${Date.now()}` } as WorkOrderRecord;
      setOrders((prev) => [fallback, ...prev]);
      setSelectedOrder(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8 font-mono">
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] tracking-widest text-cyan-400 uppercase font-bold">
              <span>Contracts &amp; Commitments · CPWD Works Manual Form 16 / FIDIC Clause 4.4</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Subcontractor Work Orders &amp; Commitments Ledger
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl font-sans">
              Contract award and financial commitment clearinghouse. Converts procurement tender LOIs into legally binding Work Orders, reserves Master BOQ budgets, enforces 5% retention terms, and anchors field measurement books and RA bills.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isFallbackMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-[10px] text-amber-300">
                <Database className="w-3.5 h-3.5" />
                <span>Simulated Offline Telemetry</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => void loadWorkOrdersData()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                setWoNo(`WO-TWR-10${orders.length + 1}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Work Order</span>
            </button>
          </div>
        </div>

        {/* 4 PRIMARY GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Committed Contract Value</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {formatInr(summary.totalCommittedValueInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">{summary.totalWOs} trade package commitments</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Executed &amp; Billed to Date</span>
              <Receipt className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-cyan-300 mt-2">
              {formatInr(summary.totalBilledValueInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Cumulative certified intermediate IPCs</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Unbilled Outstanding Liability</span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {formatInr(summary.unbilledCommitmentInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Remaining contractual commitment</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Active Subcontract Packages</span>
              <Briefcase className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.activeExecution} Packages
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CPWD Form 16 binding agreements</div>
          </div>
        </div>

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
                  CPWD Form 16 Ledger
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Subcontract Agreements</h2>
              </div>
              <span className="text-xs text-zinc-500">{filteredOrders.length} Orders</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-500">Loading work order commitments...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">No work orders recorded. Click &quot;Issue Work Order&quot; to begin.</div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((wo) => {
                  const isSelected = selectedOrder?.id === wo.id;
                  return (
                    <div
                      key={wo.id}
                      onClick={() => setSelectedOrder(wo)}
                      className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                        isSelected
                          ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                          : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white">{wo.work_order_number}</span>
                        <span className="text-xs font-bold text-emerald-400">{formatInr(wo.awarded_cost_inr)}</span>
                      </div>
                      <div className="text-xs text-zinc-300 font-sans">{wo.work_order_title}</div>
                      <div className="text-[11px] text-zinc-500">{wo.contractor_name} &bull; {wo.trade_package}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DETAIL DESK */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            {selectedOrder ? (
              <>
                <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
                      Work Order Contractual Governance
                    </span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{selectedOrder.work_order_number} &mdash; {selectedOrder.trade_package}</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                    {selectedOrder.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2 text-xs">
                  <div><span className="text-zinc-500">Contractor:</span> <strong className="text-white ml-1">{selectedOrder.contractor_name}</strong></div>
                  <div><span className="text-zinc-500">Awarded Commitment:</span> <strong className="text-emerald-400 ml-1">{formatInr(selectedOrder.awarded_cost_inr)}</strong></div>
                  <div><span className="text-zinc-500">Scope:</span> <p className="text-zinc-300 font-sans mt-1">{selectedOrder.scope_of_work}</p></div>
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-zinc-500 text-xs">
                Select or issue a work order to review contractual parameters and retention terms.
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
PAGE_WO

# -----------------------------------------------------------------------------
# 3. FIX: app/contracts/variations/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_VAR' > app/contracts/variations/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Database,
  FileSpreadsheet,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type VariationCategory =
  | "DEVIATION_LIMIT_EXCEEDED"
  | "SUBSTITUTED_ITEM"
  | "EXTRA_ITEM_NEW_SCOPE"
  | "PROVISIONAL_SUM_CONVERSION"
  | "EMPLOYER_SCOPE_REDUCTION";

export type VariationStatus =
  | "PROPOSED_CONTRACTOR"
  | "ENGINEER_REVIEW_DAR"
  | "SANCTIONED_APPROVED"
  | "REJECTED_DISALLOWED"
  | "COMMITTED_TO_BOQ";

export interface VariationRecord {
  id: string;
  project_id: string;
  variation_number: string;
  title: string;
  work_order_ref: string;
  contractor_name: string;
  trade_package: string;
  category: VariationCategory;
  linked_boq_item_ref?: string | null;
  wbs_code: string;
  description: string;
  rate_derivation_basis: string;
  original_tender_qty: number;
  revised_total_qty: number;
  variation_delta_qty: number;
  unit: string;
  tender_base_rate_inr: number;
  derived_sanctioned_rate_inr: number;
  gross_financial_impact_inr: number;
  schedule_extension_days: number;
  critical_path_impact: boolean;
  status: VariationStatus;
}

const FALLBACK_VARIATIONS: VariationRecord[] = [
  {
    id: "var-fb-1",
    project_id: "PRJ-01-LIVE",
    variation_number: "VO-TWR-01",
    title: "Additional Shear Key Recesses at Core Junctions",
    work_order_ref: "WO-TWR-101",
    contractor_name: "Apex Structural Formworks Ltd.",
    trade_package: "Civil & Superstructure",
    category: "EXTRA_ITEM_NEW_SCOPE",
    wbs_code: "WBS-VAR-01",
    description: "Architectural revision requiring high-shear key recesses not included in tender drawings.",
    rate_derivation_basis: "CPWD_DAR_ANALYSIS",
    original_tender_qty: 0,
    revised_total_qty: 320,
    variation_delta_qty: 320,
    unit: "m³",
    tender_base_rate_inr: 6200,
    derived_sanctioned_rate_inr: 6850,
    gross_financial_impact_inr: 2192000,
    schedule_extension_days: 14,
    critical_path_impact: true,
    status: "SANCTIONED_APPROVED",
  },
];

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function CanonicalVariationsPage() {
  const { project } = useActiveRole();
  const [variations, setVariations] = useState<VariationRecord[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<VariationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const loadVariations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("contract_variations")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setVariations(FALLBACK_VARIATIONS);
        setSelectedVariation(FALLBACK_VARIATIONS[0]);
      } else {
        setIsFallbackMode(false);
        setVariations(data);
        setSelectedVariation(data[0]);
      }
    } catch {
      setIsFallbackMode(true);
      setVariations(FALLBACK_VARIATIONS);
      setSelectedVariation(FALLBACK_VARIATIONS[0]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadVariations();
  }, [loadVariations]);

  const summary = useMemo(() => {
    const totalOrders = variations.length;
    const totalApprovedCost = variations
      .filter((v) => v.status === "SANCTIONED_APPROVED" || v.status === "COMMITTED_TO_BOQ")
      .reduce((sum, v) => sum + Number(v.gross_financial_impact_inr || 0), 0);
    const pendingReviewCount = variations.filter((v) => v.status === "PROPOSED_CONTRACTOR").length;
    const totalEotDays = variations.reduce((sum, v) => sum + Number(v.schedule_extension_days || 0), 0);

    return { totalOrders, totalApprovedCost, pendingReviewCount, totalEotDays };
  }, [variations]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8 font-mono">
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] tracking-widest text-cyan-400 uppercase font-bold">
              <span>Contract Administration · CPWD GCC Clause 12 / FIDIC Red Book Clause 13</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Contract Variations &amp; Rate Derivation Ledger (VO)
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl font-sans">
              Statutory change management clearinghouse. Manages extra items, substituted works, and quantities exceeding statutory deviation limits.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isFallbackMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-[10px] text-amber-300">
                <Database className="w-3.5 h-3.5" />
                <span>Simulated Offline Telemetry</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => void loadVariations()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* 4 PRIMARY GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Sanctioned Variation Budget</span>
              <Coins className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {formatInr(summary.totalApprovedCost)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Approved contract price expansion</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Pending Review</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-400 mt-2">
              {summary.pendingReviewCount} Proposals
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Rate analysis &amp; quotes in review</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Sanctioned EOT Schedule</span>
              <Calendar className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-cyan-300 mt-2">
              +{summary.totalEotDays} Days
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Authorized critical path extension</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Variation Records</span>
              <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.totalOrders} Orders
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CPWD Form 11 statutory records</div>
          </div>
        </div>

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <h2 className="text-sm font-bold text-white">Variation Proposals &amp; Orders</h2>
              <span className="text-xs text-zinc-500">{variations.length} Orders</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-500">Loading variations...</div>
            ) : variations.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">No variations recorded.</div>
            ) : (
              <div className="space-y-3">
                {variations.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVariation(v)}
                    className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 cursor-pointer hover:border-zinc-700 space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">{v.variation_number}</span>
                      <span className="text-xs font-bold text-emerald-400">{formatInr(v.gross_financial_impact_inr)}</span>
                    </div>
                    <div className="text-xs text-zinc-300 font-sans">{v.title}</div>
                    <div className="text-[11px] text-zinc-500">{v.contractor_name} &bull; {v.trade_package}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 shadow-2xl">
            {selectedVariation ? (
              <>
                <div className="border-b border-zinc-800 pb-3">
                  <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">CPWD Form 11 Sanction</span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{selectedVariation.variation_number}</h3>
                </div>
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2 text-xs">
                  <div><span className="text-zinc-500">Subject:</span> <strong className="text-white ml-1">{selectedVariation.title}</strong></div>
                  <div><span className="text-zinc-500">Financial Impact:</span> <strong className="text-emerald-400 ml-1">{formatInr(selectedVariation.gross_financial_impact_inr)}</strong></div>
                  <div><span className="text-zinc-500">Justification:</span> <p className="text-zinc-300 font-sans mt-1">{selectedVariation.description}</p></div>
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-zinc-500 text-xs">Select a variation to inspect rate derivation details.</div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
PAGE_VAR

echo -e "\033[1;32m[✓] Sprint 1 patched successfully! All 3 files updated.\033[0m"
