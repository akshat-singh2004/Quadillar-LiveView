"use client";

import React, { useState } from "react";
import { Building2, ArrowRight, ShieldCheck, Sparkles, Loader2, IndianRupee } from "lucide-react";
import { supabase } from "@/app/lib/supabase";

interface ProjectGenesisModalProps {
  open: boolean;
  onProjectCreated: (project: { id: string; name: string; code: string; tier: string }) => void;
}

export function ProjectGenesisModal({ open, onProjectCreated }: ProjectGenesisModalProps) {
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [tier, setTier] = useState<"COMMERCIAL" | "RESIDENTIAL" | "INFRASTRUCTURE">("COMMERCIAL");
  const [contractValue, setContractValue] = useState("");
  const [gccProtocol, setGccProtocol] = useState("CPWD Works Manual / FIDIC Red Book");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !projectCode.trim()) return;

    setLoading(true);
    setError(null);

    const generatedId = projectCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "-");
    const numValue = parseFloat(contractValue.replace(/[^0-9.]/g, "")) || 450000000;

    try {
      const { data, error: dbErr } = await (supabase as any)
        .from("projects")
        .insert({
          project_id: generatedId,
          project_code: projectCode.trim().toUpperCase(),
          project_name: projectName.trim(),
          contract_value: numValue,
          tier,
          gcc_protocol: gccProtocol,
          active_stage: "ONBOARDING_COMPLIANCE",
        })
        .select()
        .single();

      if (dbErr) throw dbErr;

      // Seed Initial AI Readiness Record
      await (supabase as any).from("project_ai_readiness").upsert({
        project_id: generatedId,
        readiness_score_pct: 15,
      });

      onProjectCreated({
        id: generatedId,
        name: projectName.trim(),
        code: projectCode.trim().toUpperCase(),
        tier,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to initialize project charter.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-mono text-xs select-none">
      <div className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-zinc-100">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Architect Onboarding • Project Genesis Gate</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Register Project Entity
          </h2>
          <p className="text-zinc-400 font-sans text-xs mt-1">
            Establish the root project anchor before initiating AI governance protocols and statutory data intake.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-[10px] uppercase mb-1 font-bold">
              Formal Project Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Gomti Nagar Commercial Hub Phase 1"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-cyan-500 font-sans text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 text-[10px] uppercase mb-1 font-bold">
                Project Code Identifier *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. GOMTI-PH1"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-cyan-500 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-[10px] uppercase mb-1 font-bold">
                Asset Classification
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
              >
                <option value="COMMERCIAL">Commercial Core &amp; Shell</option>
                <option value="RESIDENTIAL">Luxury Interior / Residential</option>
                <option value="INFRASTRUCTURE">Civil Infrastructure &amp; Public Works</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 text-[10px] uppercase mb-1 font-bold">
                Sanctioned Baseline (INR ₹)
              </label>
              <input
                type="text"
                placeholder="₹ 45,00,00,000"
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-[10px] uppercase mb-1 font-bold">
                Statutory GCC Conditions
              </label>
              <select
                value={gccProtocol}
                onChange={(e) => setGccProtocol(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
              >
                <option value="CPWD Works Manual / FIDIC Red Book">CPWD Manual / FIDIC Red</option>
                <option value="FIDIC Yellow Book (Design-Build)">FIDIC Yellow Book (D&amp;B)</option>
                <option value="CPWD GCC 2020 (Item Rate)">CPWD GCC 2020 (Item Rate)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Initialize Project Entity</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectGenesisModal;
