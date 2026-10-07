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
