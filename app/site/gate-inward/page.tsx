import React from "react";
import { LogInwardTruckModal } from "@/components/logistics/LogInwardTruckModal";
import { createClient } from "@/lib/supabase/server";
import { Truck, ShieldCheck, ShieldAlert, Scale, CheckCircle2, XCircle } from "lucide-react";

export default async function GateInwardPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch real gate inward records
  const { data: records } = await supabase
    .from("gate_inward_records")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const activeRecords = records || [];

  const totalTonnageInward = activeRecords
    .filter((r) => r.status === "CLEARED_UNLOADED" || r.status === "VARIANCE_DEBIT_FLAG")
    .reduce((sum, r) => sum + (Number(r.net_weight_mt) || 0), 0);

  const rejectedCount = activeRecords.filter((r) => r.status === "REJECTED_DIVERTED").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Truck className="w-3.5 h-3.5" />
            <span>SITE LOGISTICS &amp; INWARD RECONCILIATION • CPWD WORKS MANUAL CL. 13 &amp; FORM 31 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Gate Inward &amp; Digital Weighbridge Telemetry
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Dual-pass weighbridge gross/tare measurement, Legal Metrology tolerance checks &amp; Mill Test Certificate (MTC) audit.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            activeRecords.length > 0 ? "bg-emerald-950 border-emerald-800 text-emerald-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${activeRecords.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
            <span>{activeRecords.length > 0 ? "WEIGHBRIDGE TELEMETRY LINKED" : "WEIGHBRIDGE TELEMETRY UNPAIRED"}</span>
          </span>

          <LogInwardTruckModal projectId={projectId} />
        </div>
      </header>

      {/* 4 STATUTORY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Vehicles Logged</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{activeRecords.length} Trucks</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Dual-pass weighbridge entries</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Tonnage Inward</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
            {totalTonnageInward.toFixed(3)} MT
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Net payload cleared for storage</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Rejected / Diverted</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${rejectedCount > 0 ? "text-rose-400" : "text-zinc-300"}`}>
            {rejectedCount} Vehicles
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {rejectedCount > 0 ? "Variance > 2.5% or Missing MTC" : "Zero vehicles rejected"}
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Legal Metrology Stamping</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">Valid 2026</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Scale tolerance &plusmn;0.5% enforced</span>
        </div>
      </div>

      {/* GRS FORM 31 SPREADSHEET TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Goods Received Sheets (GRS) Ledger ({activeRecords.length})
          </span>
          <span className="text-[10px] text-zinc-500">CPWD Form 31 Statutory Advance Gate</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="p-3">GRS Number</th>
                <th className="p-3">Vehicle #</th>
                <th className="p-3">Vendor / Material</th>
                <th className="p-3 text-right">Challan Wt</th>
                <th className="p-3 text-right">Gross Wt</th>
                <th className="p-3 text-right">Tare Wt</th>
                <th className="p-3 text-right">Net Wt</th>
                <th className="p-3 text-right">Variance</th>
                <th className="p-3 text-center">MTC</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {activeRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-zinc-600 font-sans">
                    Zero inward consignments logged. Click &quot;+ Log Inward Truck&quot; above to record delivery challans and scale weights.
                  </td>
                </tr>
              ) : (
                activeRecords.map((r: any) => {
                  const isRejected = r.status === "REJECTED_DIVERTED";
                  const isDebit = r.status === "VARIANCE_DEBIT_FLAG";

                  return (
                    <tr key={r.id} className="hover:bg-zinc-850 transition">
                      <td className="p-3 font-bold text-cyan-400">{r.grs_number}</td>
                      <td className="p-3 font-bold text-white">{r.vehicle_number}</td>
                      <td className="p-3">
                        <div className="text-zinc-200 font-bold">{r.material_category}</div>
                        <div className="text-[10px] text-zinc-400 font-sans line-clamp-1">{r.vendor_name}</div>
                      </td>
                      <td className="p-3 text-right tabular-nums">{Number(r.challan_weight_mt).toFixed(3)} MT</td>
                      <td className="p-3 text-right tabular-nums">{Number(r.gross_weight_mt).toFixed(3)} MT</td>
                      <td className="p-3 text-right tabular-nums">{Number(r.tare_weight_mt).toFixed(3)} MT</td>
                      <td className="p-3 text-right tabular-nums font-bold text-emerald-400">
                        {Number(r.net_weight_mt).toFixed(3)} MT
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        <span className={`font-bold ${Number(r.weight_variance_pct) <= 0.5 ? "text-emerald-400" : Number(r.weight_variance_pct) <= 2.5 ? "text-amber-400" : "text-rose-400"}`}>
                          {Number(r.weight_variance_pct).toFixed(2)}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          r.mtc_verified ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-rose-950 text-rose-300 border border-rose-800"
                        }`}>
                          {r.mtc_verified ? "Verified" : "Missing"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          isRejected
                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                            : isDebit
                            ? "bg-amber-950 text-amber-300 border border-amber-800"
                            : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
