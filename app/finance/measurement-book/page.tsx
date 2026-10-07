import React from "react";
import { AddMeasurementLineModal } from "@/components/billing/AddMeasurementLineModal";
import { createClient } from "@/lib/supabase/server";
import { Calculator, CheckCircle2, XCircle, ShieldCheck, Printer, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toggleAeTestCheck, deleteMeasurementEntry } from "@/app/actions/emb-actions";

export default async function MeasurementBookPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name, contract_value")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch real measurement lines
  const { data: entries } = await supabase
    .from("digital_measurement_book_entries")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const lines = entries || [];
  const verifiedLines = lines.filter((l) => l.ae_test_checked);
  const pendingLines = lines.filter((l) => !l.ae_test_checked);

  // Cumulative quantities
  const totalConcreteM3 = lines
    .filter((l) => l.unit === "CUM")
    .reduce((sum, l) => sum + (Number(l.net_quantity || l.calculated_quantity || 0)), 0);

  const totalGrossValueInr = lines.reduce(
    (sum, l) => sum + (Number(l.net_quantity || l.calculated_quantity || 0) * Number(l.rate_inr || 0)),
    0
  );

  const totalVerifiedValueInr = verifiedLines.reduce(
    (sum, l) => sum + (Number(l.net_quantity || l.calculated_quantity || 0) * Number(l.rate_inr || 0)),
    0
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Calculator className="w-3.5 h-3.5" />
            <span>CPWD WORKS MANUAL CL. 7 • DIGITAL MEASUREMENT BOOK (e-MB) • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Digital Measurement Book Ledger (Form 23)
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Joint measurements bound to DSR items with statutory Assistant Engineer 10% test-checking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="px-3.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white text-[10px] uppercase font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Form 23 (MB)</span>
          </button>
          <AddMeasurementLineModal projectId={projectId} />
        </div>
      </header>

      {/* 4 SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Recorded e-MB Lines</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{lines.length} Lines</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Field measurements committed</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">AE Statutory 10% Status</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${pendingLines.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {verifiedLines.length} / {lines.length} Cleared
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {pendingLines.length > 0 ? `${pendingLines.length} line(s) awaiting check` : "100% test-checked"}
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Cumulative Concrete Vol</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">
            {totalConcreteM3.toFixed(3)} m³
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">All structural casting grades</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Gross Certified Value</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
            ₹{totalGrossValueInr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            ₹{totalVerifiedValueInr.toLocaleString("en-IN")} AE verified
          </span>
        </div>
      </div>

      {/* FORM 23 SPREADSHEET LEDGER */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Form 23 Measurement Ledger ({lines.length} Entries)
          </span>
          <span className="text-[10px] text-zinc-500">Statutory Check Gate: Minimum 10% Sign-Off</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="p-3">Item Code</th>
                <th className="p-3">Description &amp; Location Grid</th>
                <th className="p-3 text-right">L (m)</th>
                <th className="p-3 text-right">B (m)</th>
                <th className="p-3 text-right">D (m)</th>
                <th className="p-3 text-right">Net Qty</th>
                <th className="p-3 text-center">Unit</th>
                <th className="p-3 text-right">Rate (₹)</th>
                <th className="p-3 text-right">Amount (₹)</th>
                <th className="p-3 text-center">AE 10% Check</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-zinc-600 font-sans">
                    Zero measurement lines recorded. Click &quot;+ Add Measurement Line&quot; above to commit field dimensions.
                  </td>
                </tr>
              ) : (
                lines.map((l: any) => {
                  const net = Number(l.net_quantity || l.calculated_quantity || 0);
                  const rate = Number(l.rate_inr || 0);
                  const amount = Math.round(net * rate);

                  return (
                    <tr key={l.id} className="hover:bg-zinc-850 transition">
                      <td className="p-3 font-bold text-cyan-400">{l.item_code}</td>
                      <td className="p-3">
                        <div className="text-white font-bold">{l.grid_location}</div>
                        <div className="text-[10px] text-zinc-400 font-sans line-clamp-1">{l.description}</div>
                      </td>
                      <td className="p-3 text-right tabular-nums">{Number(l.length_m || 0).toFixed(2)}</td>
                      <td className="p-3 text-right tabular-nums">{Number(l.breadth_m || 0).toFixed(2)}</td>
                      <td className="p-3 text-right tabular-nums">{Number(l.depth_m || 0).toFixed(2)}</td>
                      <td className="p-3 text-right tabular-nums font-bold text-emerald-400">{net.toFixed(2)}</td>
                      <td className="p-3 text-center text-[10px] font-bold text-zinc-400">{l.unit}</td>
                      <td className="p-3 text-right tabular-nums">₹{rate.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-right tabular-nums font-bold text-white">₹{amount.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-center">
                        <form
                          action={async () => {
                            "use server";
                            await toggleAeTestCheck(String(l.id), projectId, !l.ae_test_checked);
                          }}
                        >
                          <button
                            type="submit"
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition cursor-pointer border ${
                              l.ae_test_checked
                                ? "bg-emerald-950 border-emerald-800 text-emerald-300 hover:bg-rose-950 hover:text-rose-300"
                                : "bg-amber-950/60 border-amber-800 text-amber-300 hover:bg-emerald-950 hover:text-emerald-300"
                            }`}
                          >
                            {l.ae_test_checked ? "✓ Verified" : "Pending AE"}
                          </button>
                        </form>
                      </td>
                      <td className="p-3 text-center">
                        <form
                          action={async () => {
                            "use server";
                            await deleteMeasurementEntry(String(l.id));
                          }}
                        >
                          <button
                            type="submit"
                            className="text-zinc-600 hover:text-rose-400 text-xs cursor-pointer"
                            title="Delete Line"
                          >
                            ✕
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BOTTOM FREEZE ACTIONS */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-[11px] text-zinc-400 font-sans">
            Assistant Engineer test-checking verified on {verifiedLines.length} of {lines.length} lines.
          </div>

          <Link
            href="/finance/ra-bills"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40"
          >
            <span>Freeze e-MB &amp; Compile RA Bill</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
