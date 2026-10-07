import React from "react";
import { GenerateRABillModal } from "@/components/commercial/GenerateRABillModal";
import { createClient } from "@/lib/supabase/server";
import { Receipt, ShieldCheck, DollarSign, ArrowDownRight, Layers, FileText } from "lucide-react";

export default async function RaBillsPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch real running account bills
  const { data: bills } = await supabase
    .from("running_account_bills")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const activeBills = bills || [];
  const totalGrossInr = activeBills.reduce((s, b) => s + (Number(b.gross_amount_inr) || 0), 0);
  const totalNetInr = activeBills.reduce((s, b) => s + (Number(b.net_payable_inr) || 0), 0);
  const totalRetainedInr = activeBills.reduce((s, b) => s + (Number(b.retention_escrow_inr) || 0), 0);
  const totalLiensInr = activeBills.reduce((s, b) => s + (Number(b.aegis_quality_lien_inr) || 0), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
            <DollarSign className="w-3.5 h-3.5" />
            <span>COMMERCIAL GOVERNANCE • CPWD WORKS MANUAL CL. 7 / FIDIC CL. 14 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Running Account (RA) Bills &amp; Payment Waterfall
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • 5-tier statutory deductions, Aegis quality liens, and Section 65B notarized interim certificates[cite: 1].
          </p>
        </div>

        <GenerateRABillModal projectId={projectId} />
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Gross Certified</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">
            ₹{(totalGrossInr / 100000).toFixed(2)} Lakh
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">{activeBills.length} Interim Certificates</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Retention Escrow (5%)</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">
            ₹{(totalRetainedInr / 100000).toFixed(2)} Lakh
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Held under CPWD Cl. 1A Escrow[cite: 1]</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Aegis Quality Liens</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${totalLiensInr > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            ₹{(totalLiensInr / 100000).toFixed(2)} Lakh
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Withheld for active structural NCRs[cite: 1]</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Net Payable Released</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
            ₹{(totalNetInr / 100000).toFixed(2)} Lakh
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Cleared for electronic RTGS</span>
        </div>
      </div>

      {/* RA BILLS LIST */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Certified Running Account Bills ({activeBills.length})
          </span>
          <span className="text-[10px] text-zinc-500">Section 65B Evidence Act Legal Tender[cite: 1]</span>
        </div>

        <div className="divide-y divide-zinc-800">
          {activeBills.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 font-sans">
              Zero certified RA bills. Click &quot;+ Generate RA Bill (IPC)&quot; to certify interim contractor valuations through the Midas waterfall[cite: 1].
            </div>
          ) : (
            activeBills.map((bill: any) => (
              <div key={bill.id} className="p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-zinc-850/50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold text-[10px]">
                      {bill.bill_number}
                    </span>
                    <strong className="text-white text-sm">{bill.contractor_name}</strong>
                    <span className="text-zinc-500 text-xs">
                      ({bill.bill_period_start} to {bill.bill_period_end})
                    </span>
                  </div>

                  <div className="text-zinc-400 text-[11px] font-sans flex flex-wrap gap-x-4 gap-y-1">
                    <span>Gross: <strong className="text-zinc-200 font-mono">₹{Number(bill.gross_amount_inr).toLocaleString("en-IN")}</strong></span>
                    <span>Retention (5%): <strong className="text-cyan-400 font-mono">-₹{Number(bill.retention_escrow_inr).toLocaleString("en-IN")}</strong>[cite: 1]</span>
                    <span>BOCW Cess (1%): <strong className="text-zinc-300 font-mono">-₹{Number(bill.bocw_cess_inr).toLocaleString("en-IN")}</strong>[cite: 1]</span>
                    <span>TDS (GST+IT 4%): <strong className="text-zinc-300 font-mono">-₹{(Number(bill.gst_tds_inr) + Number(bill.it_tds_inr)).toLocaleString("en-IN")}</strong>[cite: 1]</span>
                    {Number(bill.aegis_quality_lien_inr) > 0 && (
                      <span>Aegis Lien: <strong className="text-rose-400 font-mono">-₹{Number(bill.aegis_quality_lien_inr).toLocaleString("en-IN")}</strong>[cite: 1]</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 uppercase block">Certified Net Disbursement</span>
                    <strong className="text-base text-emerald-400 font-mono">
                      ₹{Number(bill.net_payable_inr).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <span className="px-3 py-1.5 rounded-lg border bg-emerald-950 border-emerald-800 text-emerald-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Certified &amp; Sealed</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
