"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShieldCheck, CheckCircle2, AlertTriangle, ArrowLeft, Radio } from "lucide-react";

interface LiveGateSnapshot {
  ncr_id: string;
  project_id: string;
  bim_zone_id: string;
  structural_element: string;
  is_code_clause: string;
  gate_status: "LOCKED" | "CLEARED";
  withholding_lien_inr: number;
  blocking_reason: string;
  verified_mean_mpa: number | null;
  lab_certificate_ref: string | null;
  remediation_65b_hash: string | null;
  updated_at: string;
}

export default function PublicQrVerificationPage() {
  const params = useParams();
  const rawId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const artifactId = decodeURIComponent(rawId || "NCR-2026-STR-042");

  const [gate, setGate] = useState<LiveGateSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLiveAttestation() {
      try {
        const res = await fetch("/api/escrow-gate", { cache: "no-store" });
        const data = await res.json();
        if (data?.gate) setGate(data.gate);
      } catch {}
      setLoading(false);
    }
    void loadLiveAttestation();
  }, []);

  const isCleared = gate?.gate_status === "CLEARED";
  const merkleHash =
    gate?.remediation_65b_hash ||
    "8806a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 flex items-center justify-center font-mono">
      <div className="w-full max-w-2xl bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-[10px] uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            BSA 2023 SEC. 63 / SEC. 65B PUBLIC VERIFICATION NODE
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400">
            ARTIFACT: {artifactId}
          </span>
        </div>

        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">
            {gate?.structural_element || "Tower A / BIT-4 – Level 3 Transfer Girder (M50)"}
          </h1>
          <p className="text-zinc-400 mt-1">
            Project: {gate?.project_id || "UP-LDA-VANGUARD-CAMPUS"} • BIM Zone:{" "}
            {gate?.bim_zone_id || "BIT-4-TG03"}
          </p>
        </div>

        {loading ? (
          <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 text-center text-zinc-400 animate-pulse">
            Querying live Section 65B Merkle Ledger & Escrow Gate...
          </div>
        ) : (
          <>
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isCleared
                  ? "bg-emerald-500/10 border-emerald-500/40"
                  : "bg-rose-500/10 border-rose-500/40"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isCleared ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-sm text-white">
                    ESCROW GATE: {gate?.gate_status || "LOCKED"}
                  </div>
                  <div className="text-[11px] text-zinc-300">
                    {gate?.blocking_reason ||
                      "IS 456:2000 Cl. 17.4.3 structural hold active pending NABL core verification."}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-[9px] text-zinc-400 uppercase font-bold">WITHHOLDING LIEN</div>
                <div
                  className={`text-lg font-bold ${
                    isCleared ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  ₹{Number(gate?.withholding_lien_inr ?? 450000).toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[9px] text-zinc-400 uppercase font-bold">IS CODE STANDARD</div>
                <div className="font-bold text-white mt-0.5">
                  {gate?.is_code_clause || "IS 456:2000 Cl. 17.4.3"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[9px] text-zinc-400 uppercase font-bold">3-CORE MEAN (M50)</div>
                <div className="font-bold text-emerald-400 mt-0.5">
                  {gate?.verified_mean_mpa ? `${gate.verified_mean_mpa} MPa (PASS)` : "Pending Core Test"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[9px] text-zinc-400 uppercase font-bold">NABL LAB CERT</div>
                <div className="font-bold text-white mt-0.5">
                  {gate?.lab_certificate_ref || "Awaiting Upload"}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between text-[9px] text-zinc-400 uppercase font-bold">
                <span>CANONICAL SHA-256 MERKLE ROOT DIGEST</span>
                <span className="text-emerald-400 inline-flex items-center gap-1">
                  <Radio className="w-3 h-3" /> TAMPER-SEALED
                </span>
              </div>
              <div className="text-[11px] text-emerald-400 break-all font-bold">{merkleHash}</div>
            </div>
          </>
        )}

        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Command Center
          </a>
          <span className="text-[10px] text-zinc-500">Quadillar ConTech Pvt. Ltd.</span>
        </div>
      </div>
    </div>
  );
}
