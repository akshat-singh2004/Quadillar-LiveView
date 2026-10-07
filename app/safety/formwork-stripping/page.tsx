"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Calendar,
  Layers,
  FileCheck2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface StrippingPermit {
  id: string;
  permit_number: string;
  pour_card_id: string;
  structural_element: string;
  grid_location: string;
  design_fck_mpa: number;
  pour_timestamp: string;
  target_strength_ratio: number;
  current_maturity_index: number;
  estimated_strength_mpa: number;
  is_maturity_cleared: boolean;
  thermal_shock_risk: boolean;
  status: "CURING_HOLD" | "READY_FOR_INSPECTION" | "SEOR_AUTHORIZED" | "REJECTED";
  seor_signatory_hash?: string;
  authorized_at?: string;
}

export default function FormworkStrippingPermitsPage() {
  const { project, role } = useActiveRole();
  const activeProjectId = project?.project_id || project?.id || "GOMTI-NAGAR-PH1-FITOUT";

  const [permits, setPermits] = useState<StrippingPermit[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadPermits = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("formwork_stripping_permits")
        .select("*")
        .eq("project_id", activeProjectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPermits(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load stripping permits.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPermits();
  }, [activeProjectId]);

  const handleAuthorizeStripping = async (permit: StrippingPermit) => {
    if (!permit.is_maturity_cleared || permit.thermal_shock_risk) {
      setErrorMsg("HOLD-GATE ACTIVE: Statutory maturity criteria not satisfied (IS 456 Cl. 11.3).");
      return;
    }

    setSigningId(permit.id);
    setErrorMsg(null);

    const seorSignature = `SEOR-STRIP-${Date.now().toString(36).toUpperCase()}-IS456`;

    try {
      const { error } = await (supabase as any)
        .from("formwork_stripping_permits")
        .update({
          status: "SEOR_AUTHORIZED",
          seor_signatory_hash: seorSignature,
          authorized_at: new Date().toISOString(),
        })
        .eq("id", permit.id);

      if (error) throw error;
      await loadPermits();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute SEOR authorization.");
    } finally {
      setSigningId(null);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
              STRUCTURAL INTEGRITY • IS 456:2000 CLAUSE 11.3 FORMWORK STRIPPING PERMITS
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <span>Formwork Stripping Authorization Gateway</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Shuttering stripping is physically locked until concrete hydration telemetry proves structural adequacy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadPermits()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ACTIVE PERMIT CARDS */}
        <div className="space-y-4">
          {permits.length === 0 ? (
            <div className="p-8 text-center text-zinc-600 border border-zinc-800">
              Zero active stripping permits registered. Pours in `pour_cards` will populate this ledger.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {permits.map((p) => {
                const ratio = p.estimated_strength_mpa / p.design_fck_mpa;
                const isAuthorized = p.status === "SEOR_AUTHORIZED";

                return (
                  <div
                    key={p.id}
                    className={`bg-zinc-900/50 border rounded-lg p-5 flex flex-col justify-between space-y-4 transition ${isAuthorized
                        ? "border-emerald-800/80 shadow-lg shadow-emerald-950/30"
                        : p.is_maturity_cleared
                          ? "border-cyan-800/80"
                          : "border-zinc-800"
                      }`}
                  >
                    <div>
                      <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
                        <div>
                          <span className="text-xs font-bold text-white block">{p.permit_number}</span>
                          <span className="text-[10px] text-zinc-400">{p.structural_element} • {p.grid_location}</span>
                        </div>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${isAuthorized
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : p.is_maturity_cleared
                                ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                                : "bg-amber-950 text-amber-400 border border-amber-800"
                            }`}
                        >
                          {p.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-3">
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Design f_ck</span>
                          <span className="text-white font-bold">{p.design_fck_mpa} MPa</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Attained Strength</span>
                          <span className="text-emerald-400 font-bold">{p.estimated_strength_mpa} MPa ({(ratio * 100).toFixed(0)}%)</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Maturity Index</span>
                          <span className="text-cyan-400">{Number(p.current_maturity_index).toLocaleString()} °C·h</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Required Ratio</span>
                          <span className="text-zinc-300 font-bold">{(p.target_strength_ratio * 100).toFixed(0)}% f_ck</span>
                        </div>
                      </div>

                      {p.seor_signatory_hash && (
                        <div className="mt-3 p-2 bg-zinc-950 border border-zinc-800 text-[10px] text-emerald-400">
                          <span className="text-zinc-500 block">SEOR DIGITAL SIGNATURE:</span>
                          <span className="break-all">{p.seor_signatory_hash}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      {!isAuthorized ? (
                        <button
                          type="button"
                          disabled={!p.is_maturity_cleared || signingId === p.id}
                          onClick={() => handleAuthorizeStripping(p)}
                          className={`w-full py-2 px-3 rounded text-center text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 ${p.is_maturity_cleared
                              ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 cursor-pointer shadow-md shadow-emerald-950/40"
                              : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                            }`}
                        >
                          {signingId === p.id ? (
                            "Sealing Signature..."
                          ) : p.is_maturity_cleared ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Authorize Stripping (SEOR Sign)</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Locked: Strength Deficit</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="p-2 bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-[10px] text-center rounded flex items-center justify-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>SHUTTERING STRIPPING AUTHORIZED</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}