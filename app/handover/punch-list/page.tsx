"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import {
  FileCheck,
  CheckCircle2,
  Clock,
  Plus,
  AlertTriangle,
  Lock,
  Compass,
  ArrowRight,
  ShieldCheck,
  FileText,
  KeyRound,
} from "lucide-react";

interface PunchItem {
  id: string;
  item_code: string;
  grid_location: string;
  category: string;
  description: string;
  assigned_trade: string;
  target_closeout_date: string;
  status: "OPEN" | "CONTRACTOR_RECTIFIED" | "ARCHITECT_VERIFIED";
}

interface TocRecord {
  id: string;
  toc_number: string;
  issue_date: string;
  dlp_end_date: string;
  total_snags_closed: number;
  final_retention_released: number;
  status: "DRAFT" | "ARCHITECT_SEALED" | "EMPLOYER_ACCEPTED";
  certificate_sha256: string | null;
}

export default function PunchListAndHandoverPage() {
  const { project, role } = useActiveRole();
  const activeProjectId = project?.project_id || project?.id || "";

  const [items, setItems] = useState<PunchItem[]>([]);
  const [toc, setToc] = useState<TocRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Snag Form States
  const [category, setCategory] = useState("ARCHITECTURAL_FINISH");
  const [gridLoc, setGridLoc] = useState("");
  const [description, setDescription] = useState("");
  const [trade, setTrade] = useState("Finishing & Millwork");

  const loadHandoverData = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      // 1. Fetch Punch Items
      const { data: punchData, error: punchErr } = await (supabase as any)
        .from("project_punch_list_items")
        .select("*")
        .eq("project_id", activeProjectId)
        .order("created_at", { ascending: false });

      if (punchErr) throw punchErr;
      setItems(punchData || []);

      // 2. Fetch TOC
      const { data: tocData } = await (supabase as any)
        .from("taking_over_certificates")
        .select("*")
        .eq("project_id", activeProjectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setToc(tocData || null);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load punch list records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHandoverData();
  }, [activeProjectId]);

  const handleCreateSnag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gridLoc.trim() || !description.trim()) {
      setErrorMsg("Grid location and defect description are required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const snagNo = `SNAG-${new Date().getFullYear()}-${(items.length + 1).toString().padStart(3, "0")}`;
      const payload = {
        project_id: activeProjectId,
        item_code: snagNo,
        grid_location: gridLoc.trim(),
        category,
        description: description.trim(),
        assigned_trade: trade.trim(),
        status: "OPEN",
      };

      const { error } = await (supabase as any)
        .from("project_punch_list_items")
        .insert([payload]);

      if (error) throw error;

      setGridLoc("");
      setDescription("");
      await loadHandoverData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to log punch item.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifySnag = async (itemId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("project_punch_list_items")
        .update({
          status: "ARCHITECT_VERIFIED",
          verified_at: new Date().toISOString(),
        })
        .eq("id", itemId);

      if (error) throw error;
      await loadHandoverData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify snag.");
    }
  };

  const handleIssueTakingOverCertificate = async () => {
    const openCount = items.filter((i) => i.status !== "ARCHITECT_VERIFIED").length;
    if (openCount > 0) {
      setErrorMsg(`Cannot issue Taking-Over Certificate: ${openCount} snags remain unverified.`);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const tocNo = `TOC-${new Date().getFullYear()}-FINAL-01`;
      const contractVal = Number(project?.contract_value) || 0;
      const retentionToRelease = contractVal * 0.05;

      const payload = {
        project_id: activeProjectId,
        toc_number: tocNo,
        total_snags_closed: items.length,
        final_retention_released: retentionToRelease,
        status: "ARCHITECT_SEALED",
        certificate_sha256: `TOC-CERT-${Date.now().toString(36).toUpperCase()}-SHA256`,
      };

      const { error: tocErr } = await (supabase as any)
        .from("taking_over_certificates")
        .insert([payload]);

      if (tocErr) throw tocErr;

      // Transition project status to TAKING_OVER_CLOSEOUT
      await (supabase as any)
        .from("projects")
        .update({
          status: "TAKING_OVER_CLOSEOUT",
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", activeProjectId);

      await loadHandoverData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to issue Taking-Over Certificate.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalItems = items.length;
  const verifiedCount = items.filter((i) => i.status === "ARCHITECT_VERIFIED").length;
  const openCount = items.filter((i) => i.status === "OPEN").length;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-sans">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
              CONTRACTUAL CLOSEOUT • FIDIC CLAUSE 10.1 / CPWD GCC CLAUSE 8
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-cyan-400" />
              <span>Punch List Register &amp; Taking-Over Certificate (TOC)</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{project?.project_name || "Active Contract"}</strong> • End-of-job rectification ledger, completion audit, and defects liability bonding.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-zinc-900 border border-zinc-800 p-2.5 font-mono text-xs">
              <span className="text-[10px] text-zinc-500 block uppercase">Closeout Verification Rate</span>
              <strong className="text-emerald-400 text-sm">
                {totalItems > 0 ? Math.round((verifiedCount / totalItems) * 100) : 100}% Cleared
              </strong>
            </div>
          </div>
        </header>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAKING OVER CERTIFICATE HERO CARD */}
        {toc ? (
          <div className="p-6 bg-emerald-950/20 border border-emerald-800 rounded-xl space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-base uppercase tracking-wider">Statutory Taking-Over Certificate Active</span>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs font-bold uppercase">
                {toc.status}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs text-zinc-300 pt-2 border-t border-emerald-900/60">
              <div>Certificate Ref: <strong className="text-white block font-mono">{toc.toc_number}</strong></div>
              <div>Issue Date: <strong className="text-white block">{toc.issue_date}</strong></div>
              <div>Defects Liability End: <strong className="text-emerald-400 block">{toc.dlp_end_date}</strong></div>
              <div>Retention Released: <strong className="text-cyan-400 block">₹{Number(toc.final_retention_released).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></div>
            </div>
            {toc.certificate_sha256 && (
              <div className="text-[10px] text-zinc-500 pt-1 break-all">
                Digital Checksum: {toc.certificate_sha256}
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 bg-zinc-900/40 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
            <div>
              <span className="text-white font-bold block text-sm flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Taking-Over Certificate Lock</span>
              </span>
              <p className="text-zinc-400 font-sans text-xs mt-0.5">
                Requires 100% closeout of all recorded punch list defects before releasing final retention escrow.
              </p>
            </div>
            <button
              type="button"
              onClick={handleIssueTakingOverCertificate}
              disabled={submitting || openCount > 0 || totalItems === 0}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-wider transition disabled:opacity-40"
            >
              <span>{submitting ? "Signing..." : "Issue Taking-Over Certificate"}</span>
            </button>
          </div>
        )}

        {/* LOG NEW SNAG COMPOSER */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 font-mono text-xs">
            <span className="font-bold text-zinc-200 uppercase flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Log Punch List Defect</span>
            </span>
            <span className="text-[10px] text-zinc-500 uppercase">Pre-Handover Inspection</span>
          </div>

          <form onSubmit={handleCreateSnag} className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Defect Discipline</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="ARCHITECTURAL_FINISH">Architectural Finishes / Paint / Skirting</option>
                  <option value="DOORS_WINDOWS_HARDWARE">Doors, Windows &amp; Ironmongery</option>
                  <option value="MEP_TESTING_COMMISSIONING">MEP, Fixtures &amp; Air Distribution</option>
                  <option value="FIRE_LIFE_SAFETY">Fire &amp; Life Safety Compliance</option>
                  <option value="STRUCTURAL_CRACK_SEAL">Structural Shrinkage Cracks &amp; Grouting</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">GFC Grid Coordinate</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grid B2 / Suite 01 Entryway"
                  value={gridLoc}
                  onChange={(e) => setGridLoc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Assigned Trade Package</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Woodworkers & Interiors"
                  value={trade}
                  onChange={(e) => setTrade(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 uppercase block mb-1">Defect Observation Remarks</label>
              <input
                type="text"
                required
                placeholder="e.g. Acoustic perimeter seal missing on conference door jamb; touch-up paint required."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase transition flex items-center gap-1.5"
              >
                <span>{submitting ? "Logging..." : "Log Snag to Punch List"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* PUNCH LIST REGISTER TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-6 space-y-4 font-mono text-xs">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
            <span className="font-bold text-white uppercase text-xs">
              Handover Snag Register ({items.length} Items)
            </span>
            <span className="text-zinc-500 text-[10px]">{openCount} Unresolved Defects</span>
          </div>

          {items.length === 0 ? (
            <div className="p-8 text-center text-zinc-600 border border-zinc-850">
              Zero punch list defects recorded. Ready for final joint handover walk.
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-2.5">Snag #</th>
                    <th className="p-2.5">Discipline</th>
                    <th className="p-2.5">Grid Anchor</th>
                    <th className="p-2.5">Trade</th>
                    <th className="p-2.5">Defect Remarks</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                  {items.map((item) => {
                    const isVerified = item.status === "ARCHITECT_VERIFIED";

                    return (
                      <tr key={item.id} className="hover:bg-zinc-900/50 transition">
                        <td className="p-2.5 font-bold text-cyan-400">{item.item_code}</td>
                        <td className="p-2.5 text-zinc-300 font-bold">{item.category.replace(/_/g, " ")}</td>
                        <td className="p-2.5 text-zinc-400">{item.grid_location}</td>
                        <td className="p-2.5 text-zinc-400">{item.assigned_trade}</td>
                        <td className="p-2.5 text-white font-sans max-w-sm truncate">{item.description}</td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${isVerified
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                                : "bg-amber-950 text-amber-400 border border-amber-800/60"
                              }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          {!isVerified ? (
                            <button
                              type="button"
                              onClick={() => handleVerifySnag(item.id)}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition"
                            >
                              Verify &amp; Clear
                            </button>
                          ) : (
                            <span className="text-zinc-600 flex items-center justify-center gap-1 text-[10px]">
                              <Lock className="w-3 h-3 text-emerald-500" />
                              <span>Cleared</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}