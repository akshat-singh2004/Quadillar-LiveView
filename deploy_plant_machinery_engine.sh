#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Creating required directory structures...\033[0m"
mkdir -p lib/equipment app/actions components/equipment app/operations/plant-machinery

echo -e "\033[1;36m[+] Deploying Plant & Machinery Telematics & Maintenance Desk (CPWD Form 31)...\033[0m"

# -----------------------------------------------------------------------------
# 1. ACTION: app/actions/equipment-actions.ts
# Server actions to register assets, log fuel shifts, and ground unsafe plant
# -----------------------------------------------------------------------------
cat << 'ACTION_EQUIP' > app/actions/equipment-actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { AnankeAgent } from "@/lib/agents/ananke";
import { HermesAgent } from "@/lib/agents/hermes";

export interface RegisterPlantAssetPayload {
  projectId: string;
  equipmentCode: string;
  equipmentName: string;
  category: string;
  makeAndModel: string;
  registrationNumber?: string;
  oemRatedFuelBurnLph: number;
  operatorName: string;
  operatorLicenseNumber?: string;
  gridCoordinate: string;
  fitnessCertificateExpiry: string;
}

export interface LogEquipmentShiftPayload {
  projectId: string;
  equipmentId: string;
  operatingHours: number;
  idlingHours: number;
  fuelIssuedLiters: number;
  outputAchievedM3: number;
  targetOutputM3: number;
  logNotes?: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Equipment actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function registerPlantAsset(payload: RegisterPlantAssetPayload) {
  try {
    const supabase = getSupabase();

    const isExpired = new Date(payload.fitnessCertificateExpiry).getTime() < Date.now();
    const initialStatus = isExpired ? "GROUNDED_SAFETY_HOLD" : "OPERATIONAL_ACTIVE";

    const { data, error } = await supabase
      .from("equipment_fleet_telematics")
      .insert({
        project_id: payload.projectId,
        equipment_code: payload.equipmentCode.toUpperCase(),
        equipment_name: payload.equipmentName,
        category: payload.category,
        make_and_model: payload.makeAndModel,
        registration_number: payload.registrationNumber || null,
        oem_rated_fuel_burn_lph: payload.oemRatedFuelBurnLph,
        operator_name: payload.operatorName,
        operator_license_number: payload.operatorLicenseNumber || null,
        grid_coordinate: payload.gridCoordinate,
        fitness_certificate_expiry: payload.fitnessCertificateExpiry,
        status: initialStatus,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Plant Asset Registered: ${payload.equipmentName} [${payload.equipmentCode}]`,
      actionCategory: "EQUIPMENT_ASSET_ENROLLED",
      moduleRef: String(data.id),
      details: { ...payload } as Record<string, unknown>,
      signatoryName: "Agent Ananke (Fleet Governor)",
      signatoryRole: "Autonomous Plant & Machinery Auditor",
      severity: initialStatus === "GROUNDED_SAFETY_HOLD" ? "warning" : "info",
    });

    revalidatePath("/operations/plant-machinery");
    revalidatePath("/");

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to register plant asset." };
  }
}

export async function logEquipmentShift(payload: LogEquipmentShiftPayload) {
  try {
    const supabase = getSupabase();

    // 1. Fetch equipment profile
    const { data: asset, error: fetchErr } = await supabase
      .from("equipment_fleet_telematics")
      .select("*")
      .eq("id", payload.equipmentId)
      .single();

    if (fetchErr || !asset) throw new Error("Equipment asset not found.");

    // 2. Evaluate via Agent Ananke (ISO 22400 OEE & Fuel Variance)
    const evalResult = AnankeAgent.evaluateAssetTelematics({
      assetCode: asset.equipment_code,
      category: asset.category,
      plannedOperatingHours: payload.operatingHours + payload.idlingHours,
      actualOperatingHours: payload.operatingHours,
      idlingHours: payload.idlingHours,
      fuelConsumedLiters: payload.fuelIssuedLiters,
      oemRatedFuelBurnLph: Number(asset.oem_rated_fuel_burn_lph || 14.5),
      outputVolumeM3: payload.outputAchievedM3,
      targetVolumeM3: payload.targetOutputM3,
      fitnessExpiryDateIso: asset.fitness_certificate_expiry,
    });

    // 3. Commit shift log (CPWD Form 31)
    const { data: log, error: logErr } = await supabase
      .from("equipment_shift_logs")
      .insert({
        project_id: payload.projectId,
        equipment_id: payload.equipmentId,
        shift_date: new Date().toISOString().slice(0, 10),
        operating_hours: payload.operatingHours,
        idling_hours: payload.idlingHours,
        fuel_issued_liters: payload.fuelIssuedLiters,
        output_achieved_m3: payload.outputAchievedM3,
        target_output_m3: payload.targetOutputM3,
        fuel_variance_pct: evalResult.fuelVariancePct,
        oee_pct: evalResult.overallOeePct,
        log_notes: payload.logNotes || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logErr) throw logErr;

    // 4. Update asset cumulative totals and operational status
    const newTotalHours = Number(asset.cumulative_hours || 0) + payload.operatingHours;
    const newTotalFuel = Number(asset.cumulative_fuel_liters || 0) + payload.fuelIssuedLiters;

    await supabase
      .from("equipment_fleet_telematics")
      .update({
        cumulative_hours: newTotalHours,
        cumulative_fuel_liters: newTotalFuel,
        status: evalResult.operationalStatus,
      })
      .eq("id", payload.equipmentId);

    // 5. Notarize transaction via Hermes
    await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `P&M Shift Logged: ${asset.equipment_code} (${evalResult.overallOeePct}% OEE)`,
      actionCategory: "EQUIPMENT_SHIFT_LOGGED",
      moduleRef: String(log.id),
      details: { ...evalResult } as Record<string, unknown>,
      signatoryName: "Agent Ananke (Fleet Governor)",
      signatoryRole: "Autonomous Plant & Machinery Auditor",
      severity: evalResult.isFuelPilferageFlagged || evalResult.isFitnessExpired ? "warning" : "verified",
    });

    revalidatePath("/operations/plant-machinery");
    revalidatePath("/");

    return { success: true, log, evalResult };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to commit shift log." };
  }
}

export async function toggleGroundEquipment(equipmentId: string, projectId: string, enforceGround: boolean, reason?: string) {
  try {
    const supabase = getSupabase();
    const newStatus = enforceGround ? "GROUNDED_SAFETY_HOLD" : "OPERATIONAL_ACTIVE";

    const { error } = await supabase
      .from("equipment_fleet_telematics")
      .update({ status: newStatus })
      .eq("id", equipmentId);

    if (error) throw error;

    await HermesAgent.notarizeTransaction({
      projectId,
      actionTitle: `Equipment Status Override: ${newStatus}`,
      actionCategory: "EQUIPMENT_SAFETY_GROUNDING",
      moduleRef: equipmentId,
      details: { status: newStatus, reason: reason || "Manual supervisory override." },
      signatoryName: "Resident Plant Engineer",
      signatoryRole: "Superintending Engineer",
      severity: enforceGround ? "critical" : "verified",
    });

    revalidatePath("/operations/plant-machinery");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to override equipment status." };
  }
}
ACTION_EQUIP

# -----------------------------------------------------------------------------
# 2. MODAL: components/equipment/RegisterPlantAssetModal.tsx
# Enrolls heavy plant units with TPI fitness expiry and OEM consumption rates
# -----------------------------------------------------------------------------
cat << 'COMP_REG_MODAL' > components/equipment/RegisterPlantAssetModal.tsx
"use client";

import React, { useState } from "react";
import { registerPlantAsset } from "@/app/actions/equipment-actions";
import { Plus, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

const CATEGORIES = [
  { code: "HEAVY_LIFTING", label: "Tower Crane / Crawler Crane (IS 4573 / IS 13367)", defaultBurn: 14.5 },
  { code: "CONCRETE_PUMPING", label: "Stationary / Mobile Concrete Boom Pump", defaultBurn: 18.0 },
  { code: "EARTHMOVING", label: "Hydraulic Excavator / Wheel Loader", defaultBurn: 16.5 },
  { code: "POWER_GEN", label: "Silent Diesel Generator (DG Set 250kVA+)", defaultBurn: 22.0 },
  { code: "PILING_RIG", label: "Hydraulic Rotary Piling Rig (IS 2911)", defaultBurn: 26.0 },
];

export function RegisterPlantAssetModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [equipmentCode, setEquipmentCode] = useState("EQ-TWR-01");
  const [equipmentName, setEquipmentName] = useState("Tower Crane 50m Jib");
  const [category, setCategory] = useState(CATEGORIES[0].code);
  const [makeAndModel, setMakeAndModel] = useState("Potain MCi 85 A");
  const [registrationNumber, setRegistrationNumber] = useState("MH-04-TC-8812");
  const [oemRatedFuelBurnLph, setOemRatedFuelBurnLph] = useState(CATEGORIES[0].defaultBurn);
  const [operatorName, setOperatorName] = useState("Rajesh Kumar (Grade A Rigger)");
  const [operatorLicenseNumber, setOperatorLicenseNumber] = useState("DL-UP-32-2018-9941");
  const [gridCoordinate, setGridCoordinate] = useState("Tower A Core");
  const [fitnessCertificateExpiry, setFitnessCertificateExpiry] = useState("2026-12-31");

  const handleCategoryChange = (catCode: string) => {
    setCategory(catCode);
    const match = CATEGORIES.find((c) => c.code === catCode);
    if (match) setOemRatedFuelBurnLph(match.defaultBurn);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await registerPlantAsset({
        projectId,
        equipmentCode,
        equipmentName,
        category,
        makeAndModel,
        registrationNumber,
        oemRatedFuelBurnLph,
        operatorName,
        operatorLicenseNumber,
        gridCoordinate,
        fitnessCertificateExpiry,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to register plant asset.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Register Plant Asset</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  CPWD Works Manual Section 19 • Form 31 Plant Master
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Register Plant &amp; Fleet Asset
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Equipment Code Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={equipmentCode}
                    onChange={(e) => setEquipmentCode(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Equipment Description
                  </label>
                  <input
                    type="text"
                    required
                    value={equipmentName}
                    onChange={(e) => setEquipmentName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Equipment Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Make &amp; Model
                  </label>
                  <input
                    type="text"
                    required
                    value={makeAndModel}
                    onChange={(e) => setMakeAndModel(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    OEM Fuel Baseline (L/hr)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={oemRatedFuelBurnLph}
                    onChange={(e) => setOemRatedFuelBurnLph(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-amber-400 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    TPI Safety Fitness Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={fitnessCertificateExpiry}
                    onChange={(e) => setFitnessCertificateExpiry(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Designated Operator
                  </label>
                  <input
                    type="text"
                    required
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Site Grid Location
                  </label>
                  <input
                    type="text"
                    required
                    value={gridCoordinate}
                    onChange={(e) => setGridCoordinate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold uppercase rounded text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Enroll Plant Unit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
COMP_REG_MODAL

# -----------------------------------------------------------------------------
# 3. MODAL: components/equipment/LogEquipmentShiftModal.tsx
# Ingests operating hours, fuel dispensed, and tests ISO 22400 OEE & fuel variance
# -----------------------------------------------------------------------------
cat << 'COMP_SHIFT_MODAL' > components/equipment/LogEquipmentShiftModal.tsx
"use client";

import React, { useState } from "react";
import { logEquipmentShift } from "@/app/actions/equipment-actions";
import { Fuel, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  equipmentId: string;
  equipmentCode: string;
  oemRateLph: number;
}

export function LogEquipmentShiftModal({ projectId, equipmentId, equipmentCode, oemRateLph }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [operatingHours, setOperatingHours] = useState(7.5);
  const [idlingHours, setIdlingHours] = useState(1.0);
  const [fuelIssuedLiters, setFuelIssuedLiters] = useState(115.0);
  const [outputAchievedM3, setOutputAchievedM3] = useState(180);
  const [targetOutputM3, setTargetOutputM3] = useState(200);

  // Live burn rate & variance calculations
  const effectiveHours = Math.max(0.5, operatingHours);
  const actualBurnRateLph = parseFloat((fuelIssuedLiters / effectiveHours).toFixed(2));
  const fuelVariancePct = oemRateLph > 0
    ? parseFloat((((actualBurnRateLph - oemRateLph) / oemRateLph) * 100).toFixed(1))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await logEquipmentShift({
        projectId,
        equipmentId,
        operatingHours,
        idlingHours,
        fuelIssuedLiters,
        outputAchievedM3,
        targetOutputM3,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to commit shift log.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-300 font-bold uppercase text-[9px] transition flex items-center gap-1 cursor-pointer"
      >
        <Fuel className="w-3 h-3" />
        <span>Log Fuel &amp; Hours</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  CPWD Form 31 Shift Logbook • {equipmentCode}
                </span>
                <h3 className="text-sm font-bold text-white uppercase mt-0.5">
                  Record Hours &amp; Fuel Telematics
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Operating Hours (hrs)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Idling Hours (hrs)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={idlingHours}
                    onChange={(e) => setIdlingHours(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-400 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  High-Speed Diesel (HSD) Dispensed (Liters)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={fuelIssuedLiters}
                  onChange={(e) => setFuelIssuedLiters(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-amber-400 text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Output Achieved (m³)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={outputAchievedM3}
                    onChange={(e) => setOutputAchievedM3(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Target Shift Output (m³)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={targetOutputM3}
                    onChange={(e) => setTargetOutputM3(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-400 text-xs"
                  />
                </div>
              </div>

              {/* LIVE FUEL CONSUMPTION TELEMETRY CARD */}
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 uppercase text-[9px] font-bold">Burn Rate</span>
                  <span className="font-bold text-white tabular-nums">{actualBurnRateLph} L/hr (OEM: {oemRateLph} L/hr)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 uppercase text-[9px] font-bold">Burn Variance</span>
                  <span className={`font-bold tabular-nums ${fuelVariancePct <= 15 ? "text-emerald-400" : "text-rose-400"}`}>
                    {fuelVariancePct > 0 ? `+${fuelVariancePct}%` : `${fuelVariancePct}%`} {fuelVariancePct > 15 ? "(Pilferage / Mechanical Flag)" : "(Normal)"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold uppercase rounded text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Commit Shift Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
COMP_SHIFT_MODAL

# -----------------------------------------------------------------------------
# 4. PAGE: app/operations/plant-machinery/page.tsx
# Connected to live equipment_fleet_telematics & equipment_shift_logs
# -----------------------------------------------------------------------------
cat << 'PAGE_PLANT' > app/operations/plant-machinery/page.tsx
import React from "react";
import { RegisterPlantAssetModal } from "@/components/equipment/RegisterPlantAssetModal";
import { LogEquipmentShiftModal } from "@/components/equipment/LogEquipmentShiftModal";
import { createClient } from "@/lib/supabase/server";
import { Wrench, ShieldAlert, ShieldCheck, PowerOff, CheckCircle2, Clock, Fuel } from "lucide-react";
import { toggleGroundEquipment } from "@/app/actions/equipment-actions";

export default async function PlantMachineryPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch real equipment units
  const { data: equipmentRows } = await supabase
    .from("equipment_fleet_telematics")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  // Fetch today's shift logs
  const { data: shiftLogs } = await supabase
    .from("equipment_shift_logs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const fleet = equipmentRows || [];
  const logs = shiftLogs || [];

  const activeUnits = fleet.filter((e) => e.status === "OPERATIONAL_ACTIVE").length;
  const groundedUnits = fleet.filter((e) => e.status === "GROUNDED_SAFETY_HOLD").length;
  const fuelIncidents = logs.filter((l) => Number(l.fuel_variance_pct || 0) > 15.0).length;

  const totalFuelLiters = logs.reduce((sum, l) => sum + (Number(l.fuel_issued_liters) || 0), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Wrench className="w-3.5 h-3.5" />
            <span>PLANT &amp; FLEET OPERATIONS • CPWD WORKS MANUAL SECTION 19 / FORM 31 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Plant &amp; Machinery (P&amp;M), Fuel &amp; Equipment Telematics
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Heavy equipment fleet telematics, BOCW safety fitness enforcement &amp; anti-theft fuel burn tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <RegisterPlantAssetModal projectId={projectId} />
        </div>
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Operational Fleet</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
            {activeUnits} / {fleet.length} Units
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Available for active site pours</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">HSD Diesel Issued</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">
            {totalFuelLiters.toLocaleString()} L
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Bowser &amp; site tanks dispensed</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Fitness Expired / Grounded</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${groundedUnits > 0 ? "text-rose-400" : "text-zinc-300"}`}>
            {groundedUnits} Asset(s)
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Statutory deployment blocked</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Abnormal Fuel Burn Flags</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${fuelIncidents > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {fuelIncidents} Incident(s)
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">&gt;+15% OEM baseline deviation</span>
        </div>
      </div>

      {/* EQUIPMENT MASTER & TELEMETRICS DESK */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Form 31 Heavy Plant &amp; Fleet Inventory ({fleet.length} Assets)
          </span>
          <span className="text-[10px] text-zinc-500">Autonomous Safety &amp; Telematics Desk</span>
        </div>

        <div className="divide-y divide-zinc-800">
          {fleet.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 font-sans">
              Zero plant equipment assets enrolled. Click &quot;+ Register Plant Asset&quot; to register cranes, batching plants, or pumps.
            </div>
          ) : (
            fleet.map((item: any) => {
              const isGrounded = item.status === "GROUNDED_SAFETY_HOLD";
              const isFitnessExpired = new Date(item.fitness_certificate_expiry).getTime() < Date.now();

              return (
                <div key={item.id} className="p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-zinc-850/50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold text-[10px]">
                        {item.equipment_code}
                      </span>
                      <strong className="text-white text-sm">{item.equipment_name}</strong>
                      <span className="text-zinc-500 text-xs">({item.make_and_model})</span>
                    </div>

                    <div className="text-zinc-400 text-[11px] font-sans flex flex-wrap gap-x-4 gap-y-1">
                      <span>Operator: <strong className="text-zinc-300">{item.operator_name}</strong></span>
                      <span>Grid: <strong className="text-zinc-300">{item.grid_coordinate}</strong></span>
                      <span>OEM Burn: <strong className="text-amber-400 font-mono">{item.oem_rated_fuel_burn_lph} L/h</strong></span>
                      <span>
                        Fitness Expiry:{" "}
                        <strong className={isFitnessExpired ? "text-rose-400 font-bold" : "text-emerald-400 font-mono"}>
                          {item.fitness_certificate_expiry} {isFitnessExpired ? "(EXPIRED)" : "(VALID)"}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <LogEquipmentShiftModal
                      projectId={projectId}
                      equipmentId={item.id}
                      equipmentCode={item.equipment_code}
                      oemRateLph={Number(item.oem_rated_fuel_burn_lph || 14.5)}
                    />

                    {/* STATUS BADGE / GROUND BUTTON */}
                    <form
                      action={async () => {
                        "use server";
                        await toggleGroundEquipment(String(item.id), projectId, !isGrounded, "Supervisory status toggle");
                      }}
                    >
                      <button
                        type="submit"
                        className={`px-3 py-1 rounded border text-[9px] font-bold uppercase transition cursor-pointer flex items-center gap-1.5 ${
                          isGrounded
                            ? "bg-rose-950 border-rose-800 text-rose-300 hover:bg-emerald-950 hover:text-emerald-300"
                            : "bg-emerald-950 border-emerald-800 text-emerald-300 hover:bg-rose-950 hover:text-rose-300"
                        }`}
                      >
                        {isGrounded ? (
                          <>
                            <PowerOff className="w-3 h-3 text-rose-400" />
                            <span>Grounded (Safety Hold)</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Operational Active</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
PAGE_PLANT

# -----------------------------------------------------------------------------
# 5. VERIFY COMPILATION HEALTH
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying full TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Plant & Machinery Engine deployed cleanly with ZERO compilation errors!\033[0m"
