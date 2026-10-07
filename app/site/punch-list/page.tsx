"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import {
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  Layers,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";
import { fetchPunchListItems, logSnagTicket, updateSnagStatus, PunchItemRecord } from "@/app/actions/punch-actions";

export default function SitePunchListPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Gomti Nagar Extension Hub";

  const [items, setItems] = useState<PunchItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [location, setLocation] = useState("");
  const [trade, setTrade] = useState("Civil & Superstructure");
  const [contractor, setContractor] = useState("");
  const [severity, setSeverity] = useState<"CATEGORY_A" | "CATEGORY_B" | "CATEGORY_C">("CATEGORY_B");
  const [desc, setDesc] = useState("");

  const loadData = async () => {
    setLoading(true);
    const data = await fetchPunchListItems(projectId);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [projectId]);

  const summary = useMemo(() => {
    const total = items.length;
    const open = items.filter((i) => i.status === "OPEN").length;
    const critical = items.filter((i) => i.severity_tier === "CATEGORY_A" && i.status !== "CLOSED").length;
    return { total, open, critical };
  }, [items]);

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim() || !desc.trim()) {
      setFeedback({ type: "error", text: "Location and defect description are mandatory." });
      return;
    }

    startTransition(async () => {
      const res = await logSnagTicket({
        projectId,
        locationRoom: location.trim(),
        tradeDiscipline: trade,
        defectDescription: desc.trim(),
        severityTier: severity,
        assignedSubcontractor: contractor.trim() || "Lead Subcontractor",
      });

      if (res.success) {
        setFeedback({
          type: "success",
          text: `Defect ticket ${res.data?.ticket_id} registered.${severity === "CATEGORY_A" ? " Aegis structural hold & financial lien initiated." : ""}`,
        });
        setModalOpen(false);
        setLocation("");
        setDesc("");
        await loadData();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to log defect." });
      }
    });
  };

  const handleCloseItem = (id: string, ticketId: string) => {
    startTransition(async () => {
      const res = await updateSnagStatus(id, projectId, ticketId, "CLOSED");
      if (res.success) {
        setFeedback({ type: "success", text: `Defect ${ticketId} inspected, verified & closed.` });
        await loadData();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to close defect." });
      }
    });
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono text-xs select-none">
      <div className="max-w-[1650px] mx-auto space-y-6">
        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>FIELD QUALITY CONTROL • SNAGGING &amp; DEFECT RECTIFICATION ENVELOPE</span>
              <StatutoryInfo
                standardRef="CPWD MANUAL SECTION 20 / ISO 9001"
                title="Field Punch List & Quality De-snagging"
                idealRange="Critical Defects SLA < 48 Hours"
                description="Field snagging console for tagging non-conformances across civil works, MEP, and finishes before final inspection sign-off."
              />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 uppercase">
              <CheckSquare className="w-5 h-5 text-cyan-400" />
              <span>Site Punch List &amp; Defect Registry</span>
            </h1>
            <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> [{projectId}] • Real-time field snagging, severity tracking, and contractor remediation.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => void loadData()}
              disabled={loading || isPending}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              disabled={isPending}
              className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase rounded flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tag Defect Item</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div
            className={`p-3 border flex items-center justify-between gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
                : "bg-rose-950/80 border-rose-800 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-zinc-500 hover:text-zinc-200 uppercase text-[10px]">
              Dismiss
            </button>
          </div>
        )}

        {/* 3 SUMMARY METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Punch List Items</span>
            <div className="text-2xl font-bold text-white mt-1">{items.length} Defects</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Tagged across site zones</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Pending Remediation</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{summary.open} Open</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Awaiting contractor work</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Category A Critical</span>
            <div className={`text-2xl font-bold mt-1 ${summary.critical > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {summary.critical} Urgent
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">TOC Taking-Over Gate Lock</span>
          </div>
        </div>

        {/* PUNCH LIST */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
            Site Punch Items ({items.length})
          </span>

          <div className="divide-y divide-zinc-800/60">
            {items.length === 0 ? (
              <div className="py-8 text-center text-zinc-600 font-sans">
                Zero open punch items recorded. All quality hold-points cleared.
              </div>
            ) : (
              items.map((i) => {
                const isClosed = i.status === "CLOSED";
                const isCatA = i.severity_tier === "CATEGORY_A";

                return (
                  <div key={i.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{i.ticket_id}</span>
                        <span className="text-cyan-400 text-xs font-bold">• {i.location_room}</span>
                        <span
                          className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase border ${
                            isCatA
                              ? "bg-rose-950 text-rose-400 border-rose-800"
                              : "bg-amber-950 text-amber-400 border-amber-800"
                          }`}
                        >
                          {i.severity_tier.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-200 font-sans leading-relaxed">{i.defect_description}</p>
                      <div className="text-[10px] text-zinc-500">
                        Contractor: <strong className="text-zinc-400">{i.subcontractor_name}</strong> • Target: {i.target_rectification_date || "Immediate"}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          isClosed
                            ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                            : "bg-amber-950 text-amber-400 border-amber-800"
                        }`}
                      >
                        {i.status}
                      </span>

                      {!isClosed && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleCloseItem(i.id, i.ticket_id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded transition cursor-pointer"
                        >
                          Verify &amp; Close
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Tag Defect Item</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateItem} className="space-y-3">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1 uppercase">Location Room / Grid *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Level 14 - Column Junction D4"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1 uppercase">Trade Package</label>
                    <select
                      value={trade}
                      onChange={(e) => setTrade(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white outline-none"
                    >
                      <option value="Civil & Superstructure">Civil &amp; Superstructure</option>
                      <option value="MEP / HVAC">MEP / HVAC</option>
                      <option value="Finishes & Fitouts">Finishes &amp; Fitouts</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1 uppercase">Severity Tier</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white outline-none"
                    >
                      <option value="CATEGORY_A">Category A (Blocks Taking-Over)</option>
                      <option value="CATEGORY_B">Category B (Fix in 7 Days)</option>
                      <option value="CATEGORY_C">Category C (Cosmetic / Touchup)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1 uppercase">Contractor</label>
                  <input
                    type="text"
                    placeholder="e.g. Falcon Structural RCC Works"
                    value={contractor}
                    onChange={(e) => setContractor(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1 uppercase">Defect Description *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Describe non-conformance..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white resize-none outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={isPending} className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase rounded flex items-center gap-1.5 cursor-pointer">
                    {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Commit Defect</span>
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
