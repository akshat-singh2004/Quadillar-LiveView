import React from "react";
import { fetchStatutoryCureNotices } from "@/app/actions/cure-notice-actions";
import { IssueCureNoticeModal } from "@/components/commercial/IssueCureNoticeModal";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, ShieldAlert, Download, Clock, ShieldCheck, Layers } from "lucide-react";

export default async function CureNoticesPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  const notices = await fetchStatutoryCureNotices(projectId);

  const activeNotices = notices.filter((n) => n.status === "CURE_PERIOD_ACTIVE");
  const totalLdExposure = activeNotices.reduce((s, n) => s + Number(n.liquidated_damages_exposure_inr), 0);
  const totalSecurityAtRisk = activeNotices.reduce((s, n) => s + Number(n.security_deposit_at_risk_inr), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-rose-400 uppercase tracking-widest font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>CONTRACTUAL DEFAULT &amp; CURE PERIODS • CPWD CL. 2/3 / FIDIC CL. 15.1 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Subcontractor Statutory Cure Notices &amp; Default Ledger
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Formal 7/14-day cure clocks, liquidated damages exposure warnings, and Section 65B certified legal notices.
          </p>
        </div>

        <IssueCureNoticeModal projectId={projectId} />
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Active Default Clocks</span>
          <div className="text-xl font-bold text-rose-400 mt-1 tabular-nums">{activeNotices.length} Notices</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Cure periods running</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total LD at Risk</span>
          <div className="text-xl font-bold text-amber-400 mt-1 tabular-nums">
            ₹{(totalLdExposure / 100000).toFixed(2)} Lakh
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">CPWD Cl. 2 10% ceiling</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">PBG / Retention at Risk</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">
            ₹{(totalSecurityAtRisk / 100000).toFixed(2)} Lakh
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Subject to Clause 3 forfeiture</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Statutory Admissibility</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">Sec. 65B Certified</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Anchored by Hermes Merkle hash</span>
        </div>
      </div>

      {/* CURE NOTICES REGISTER */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Subcontractor Statutory Cure Register ({notices.length})
          </span>
          <span className="text-[10px] text-zinc-500">CPWD Works Manual Clause 2 &amp; 3 Ledger</span>
        </div>

        <div className="divide-y divide-zinc-800">
          {notices.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 font-sans">
              Zero cure notices issued. Click &quot;+ Issue Statutory Cure Notice&quot; to place a defaulting subcontractor on contractual cure notice.
            </div>
          ) : (
            notices.map((notice) => {
              const isActive = notice.status === "CURE_PERIOD_ACTIVE";

              return (
                <div key={notice.id} className="p-5 space-y-3 hover:bg-zinc-850/50 transition">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-bold text-[10px]">
                        {notice.notice_code}
                      </span>
                      <strong className="text-white text-sm">{notice.defaulting_agency}</strong>
                      <span className="text-zinc-500 text-xs">({notice.trade_classification})</span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1 ${
                      isActive
                        ? "bg-rose-950 border border-rose-800 text-rose-300"
                        : "bg-emerald-950 border border-emerald-800 text-emerald-300"
                    }`}>
                      <Clock className="w-3 h-3" />
                      <span>{isActive ? `CURE DEADLINE: ${notice.cure_deadline}` : notice.status}</span>
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-400 font-sans flex flex-wrap gap-x-5 gap-y-1">
                    <span>Grounds: <strong className="text-rose-400">{notice.default_reason.replace(/_/g, " ")}</strong></span>
                    <span>Clause: <strong className="text-zinc-200">{notice.clause_invoked}</strong></span>
                    <span>LD Exposure: <strong className="text-amber-400 font-mono">₹{Number(notice.liquidated_damages_exposure_inr).toLocaleString("en-IN")}</strong></span>
                    <span>PBG at Risk: <strong className="text-cyan-400 font-mono">₹{Number(notice.security_deposit_at_risk_inr).toLocaleString("en-IN")}</strong></span>
                    <span>Issued By: <strong className="text-zinc-300">{notice.issued_by}</strong></span>
                  </div>

                  {/* NOTICE TEXT PREVIEW & EXPORT ACTIONS */}
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-rose-400 font-bold uppercase">
                        Legal Notice Document Preview:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const element = document.createElement("a");
                          const file = new Blob([notice.notice_text_markdown], { type: "text/markdown" });
                          element.href = URL.createObjectURL(file);
                          element.download = `${notice.notice_code}.md`;
                          document.body.appendChild(element);
                          element.click();
                          document.body.removeChild(element);
                        }}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[9px] uppercase flex items-center gap-1 cursor-pointer transition"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export Legal Notice (.md)</span>
                      </button>
                    </div>

                    <pre className="text-[10px] text-zinc-300 font-mono max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {notice.notice_text_markdown}
                    </pre>
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
