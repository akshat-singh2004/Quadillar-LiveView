"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Lock,
  Database,
  Clock,
} from "lucide-react";

interface VerificationResponse {
  ok: boolean;
  verified: boolean;
  queriedArtifactId: string;
  projectId: string;
  immutabilityEnforced: boolean;
  statutoryBasis: string;
  verifiedAtIso: string;
  gate: {
    ncr_id: string;
    project_id: string;
    bim_zone_id: string;
    structural_element: string;
    concrete_grade: string;
    is_code_clause: string;
    gate_status: "LOCKED" | "CLEARED";
    withholding_lien_inr: number;
    blocking_reason: string;
    verified_mean_mpa: number | null;
    lab_certificate_ref: string | null;
    remediation_65b_hash: string | null;
    updated_at: string;
  } | null;
  ledgerBlock: {
    id: string;
    project_id: string;
    primary_governor: string;
    synthesis_report: string;
    merkle_root_hash: string;
    timestamp: string;
    notarized_by: string;
  } | null;
  fieldRecord: {
    id: string;
    bim_zone_id: string;
    structural_element: string;
    engineering_summary: string;
    canonical_65b_sha256: string;
    created_at: string;
  } | null;
}

export default function PublicQrVerificationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const artifactId = decodeURIComponent(rawId || "NCR-2026-STR-042");
  const projectIdParam = searchParams?.get("project_id") || "";

  const [payload, setPayload] = useState<VerificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadVerification() {
      try {
        const qs = new URLSearchParams({ id: artifactId });
        if (projectIdParam) qs.set("project_id", projectIdParam);
        const res = await fetch(`/api/verify-artifact?${qs.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setErrorMsg(data?.error || "Could not verify record against ledger.");
        } else {
          setPayload(data);
        }
      } catch {
        setErrorMsg("Network error contacting Quadillar verification node.");
      } finally {
        setLoading(false);
      }
    }
    void loadVerification();
  }, [artifactId, projectIdParam]);

  const gate = payload?.gate || null;
  const ledger = payload?.ledgerBlock || null;
  const isCleared = gate?.gate_status === "CLEARED";
  const activeHash =
    ledger?.merkle_root_hash ||
    gate?.remediation_65b_hash ||
    payload?.fieldRecord?.canonical_65b_sha256 ||
    "UNAVAILABLE";
  const lastUpdated =
    gate?.updated_at || ledger?.timestamp || payload?.verifiedAtIso || "";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 flex items-center justify-center font-sans">
      <div className="w-full max-w-2xl bg-zinc-900/85 border border-zinc-800 rounded-3xl p-5 md:p-8 shadow-2xl space-y-5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px] uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Section 65B / BSA Sec. 63 Public Proof Node</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-[10.5px] font-mono text-zinc-300">
            {artifactId.length > 22 ? `${artifactId.slice(0, 18)}...` : artifactId}
          </span>
        </div>

        {loading ? (
          <div className="p-8 rounded-2xl bg-zinc-950 border border-zinc-800 text-center text-zinc-400">
            Verifying record against live Postgres append-only ledger...
          </div>
        ) : errorMsg ? (
          <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-rose-200 flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10.5px] font-semibold">
                <Database className="w-3 h-3" />
                <span>
                  {payload?.verified
                    ? "VERIFIED LIVE IN APPEND-ONLY POSTGRES LEDGER"
                    : "NO MATCHING RECORD FOUND"}
                </span>
              </div>
              <h1 className="text-lg md:text-2xl font-bold text-white pt-1">
                {gate?.structural_element ||
                  payload?.fieldRecord?.structural_element ||
                  "Verified Statutory Construction Record"}
              </h1>
              <p className="text-zinc-400 font-mono text-[11px]">
                Project: {payload?.projectId} | Zone: {gate?.bim_zone_id || payload?.fieldRecord?.bim_zone_id || "SITE-WIDE"}
              </p>
            </div>

            {gate && (
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCleared
                    ? "bg-emerald-500/10 border-emerald-500/40"
                    : "bg-rose-500/10 border-rose-500/40"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {isCleared ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Lock className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm text-white">
                      {isCleared ? "PAYMENT CLEARED" : "PAYMENT PAUSED (HOLD ACTIVE)"}
                    </div>
                    <div className="text-xs text-zinc-300 leading-relaxed">
                      {gate.blocking_reason}
                    </div>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">
                    Escrow Hold
                  </div>
                  <div
                    className={`text-lg font-bold font-mono ${
                      isCleared ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    INR {Number(gate.withholding_lien_inr ?? 0).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">
                  IS Standard
                </div>
                <div className="font-semibold text-white mt-0.5 font-mono">
                  {gate?.is_code_clause || "IS 456:2000 Cl. 17.4.3"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">
                  Verified Core Mean ({gate?.concrete_grade || "M50"})
                </div>
                <div className="font-semibold text-emerald-400 mt-0.5 font-mono">
                  {gate?.verified_mean_mpa
                    ? `${gate.verified_mean_mpa} MPa (PASS)`
                    : "Pending Core Lab Test"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">
                  NABL Certificate
                </div>
                <div className="font-semibold text-white mt-0.5 font-mono truncate">
                  {gate?.lab_certificate_ref || "Pending Submission"}
                </div>
              </div>
            </div>

            {ledger && (
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-400 uppercase font-semibold">
                  <span>Latest Trigger-Locked Ledger Entry</span>
                  <span className="text-emerald-400 font-mono">
                    {ledger.primary_governor} | {ledger.notarized_by}
                  </span>
                </div>
                <p className="text-zinc-200 text-xs leading-relaxed">
                  {ledger.synthesis_report}
                </p>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-400 uppercase font-semibold">
                <span>Canonical SHA-256 Digest</span>
                <span className="text-emerald-400 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" /> UPDATE/DELETE BLOCKED BY DB TRIGGER
                </span>
              </div>
              <div className="text-[11px] font-mono text-emerald-400 break-all font-semibold">
                {activeHash}
              </div>
              {lastUpdated && (
                <div className="text-[10.5px] text-zinc-500 flex items-center gap-1.5 pt-1 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>Sealed UTC: {new Date(lastUpdated).toISOString()}</span>
                </div>
              )}
            </div>
          </>
        )}

        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Command Center</span>
          </a>
          <span className="text-[10.5px] text-zinc-500">Quadillar ConTech Pvt. Ltd.</span>
        </div>
      </div>
    </div>
  );
}
