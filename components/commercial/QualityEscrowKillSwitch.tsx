"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Lock,
  Unlock,
  ShieldAlert,
  CheckCircle2,
  FlaskConical,
  AlertTriangle,
  Box,
  BadgeCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { EscrowGateState } from "@/app/api/escrow-gate/route";
import { FieldGroundingRecord } from "@/lib/grounding/fieldGroundingSchema";
import GovernanceCouncilTrace from "@/components/field/GovernanceCouncilTrace";

interface QualityEscrowKillSwitchProps {
  latestFieldRecord: FieldGroundingRecord | null;
  onFocusBimZone: (zoneId: string, ncrId?: string) => void;
  onAuditAppend?: (entry: {
    id: string;
    timeStr: string;
    governor: string;
    title: string;
    detail: string;
    hash: string;
  }) => void;
}

export default function QualityEscrowKillSwitch({
  latestFieldRecord,
  onFocusBimZone,
  onAuditAppend,
}: QualityEscrowKillSwitchProps) {
  const [gate, setGate] = useState<EscrowGateState>({
    ncr_id: "NCR-2026-STR-042",
    project_id: "UP-LDA-VANGUARD-CAMPUS",
    bim_zone_id: "BIT-4-TG03",
    bit_id: "BIT-4",
    structural_element: "Tower A / BIT-4 – Level 3 Transfer Girder (M50)",
    concrete_grade: "M50",
    is_code_clause: "IS 456:2000 Cl. 17.4.3",
    gate_status: "LOCKED",
    withholding_lien_inr: 450000,
    blocking_reason:
      "28-day concrete cube compressive strength 41.2 MPa (< 46.0 MPa IS 456 acceptance) + post-deshuttering honeycombing on Transfer Girder TG-03.",
    core_readings_mpa: null,
    verified_mean_mpa: null,
    lab_certificate_ref: null,
    remediation_65b_hash: null,
    provenance_source: "IS 456 Cube Register + Field NCR",
    updated_at: new Date().toISOString(),
  });

  const [showRemediationForm, setShowRemediationForm] = useState(false);
  const [core1, setCore1] = useState("44.20");
  const [core2, setCore2] = useState("43.80");
  const [core3, setCore3] = useState("44.21");
  const [labCertRef, setLabCertRef] = useState("NABL-LKO-CORE-2026-089");
  const [isMutating, setIsMutating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const loadGate = useCallback(async () => {
    try {
      const res = await fetch("/api/escrow-gate", { cache: "no-store" });
      const data = await res.json();
      if (data?.ok && data.gate) setGate(data.gate);
    } catch {}
  }, []);

  useEffect(() => {
    loadGate();

    // Supabase Realtime subscription on ncr_escrow_gates
    const channel = supabase
      .channel("ncr-escrow-killswitch-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ncr_escrow_gates" },
        (payload) => {
          const row = payload.new as any;
          if (row && row.ncr_id) {
            setGate((prev) => ({
              ...prev,
              ...row,
              withholding_lien_inr: Number(row.withholding_lien_inr ?? 0),
              verified_mean_mpa: row.verified_mean_mpa ? Number(row.verified_mean_mpa) : null,
              provenance_source:
                row.gate_status === "CLEARED"
                  ? "Lab Core Certificate"
                  : "Verified Field Audio + Photo",
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadGate]);

  // React immediately when a new Gemini field NCR freezes milestone escrow
  useEffect(() => {
    if (
      latestFieldRecord &&
      latestFieldRecord.status === "COMMITTED" &&
      latestFieldRecord.escrow_action === "FREEZE_MILESTONE"
    ) {
      setGate((prev) => ({
        ...prev,
        ncr_id: latestFieldRecord.linked_ncr_id,
        bim_zone_id: latestFieldRecord.matched_bim_zone_id,
        bit_id: latestFieldRecord.bit_id,
        structural_element: latestFieldRecord.zone_label,
        is_code_clause: latestFieldRecord.is_code_clause,
        gate_status: "LOCKED",
        withholding_lien_inr: latestFieldRecord.withholding_amount_inr,
        blocking_reason: latestFieldRecord.engineering_summary,
        remediation_65b_hash: latestFieldRecord.canonical_65b_sha256,
        provenance_source: latestFieldRecord.provenance_label,
        updated_at: latestFieldRecord.ingested_at,
      }));
      setShowRemediationForm(false);
    }
  }, [latestFieldRecord]);

  const parsedReadings = [parseFloat(core1), parseFloat(core2), parseFloat(core3)].filter((n) =>
    Number.isFinite(n)
  );
  const previewMean =
    parsedReadings.length === 3
      ? (parsedReadings.reduce((a, b) => a + b, 0) / 3).toFixed(2)
      : "0.00";

  const handleSubmitCoreRemediation = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setIsMutating(true);
    try {
      const res = await fetch("/api/escrow-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REMEDIATE_CORE_TEST",
          ncr_id: gate.ncr_id,
          bim_zone_id: gate.bim_zone_id,
          bit_id: gate.bit_id,
          structural_element: gate.structural_element,
          core_readings_mpa: [parseFloat(core1), parseFloat(core2), parseFloat(core3)],
          lab_certificate_ref: labCertRef,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setValidationError(data.error || "IS 456:2000 Cl. 17.4.3 verification rejected");
        return;
      }
      const updated = data.gate as EscrowGateState;
      setGate(updated);
      setShowRemediationForm(false);

      if (onAuditAppend && updated.remediation_65b_hash) {
        onAuditAppend({
          id: `BLOCK-${Math.floor(18403 + Math.random() * 90)}`,
          timeStr: new Date().toTimeString().slice(0, 8),
          governor: "THEMIS-NDT-CORE",
          title: `${updated.ncr_id} Cleared — ₹0 Lien (${updated.verified_mean_mpa?.toFixed(2)} MPa Core Verified)`,
          detail: `${updated.structural_element} • ${updated.is_code_clause} • Cert ${updated.lab_certificate_ref}`,
          hash: updated.remediation_65b_hash,
        });
      }
    } catch (err: any) {
      setValidationError(err?.message || "Failed to execute remediation");
    } finally {
      setIsMutating(false);
    }
  };

  const handleReTriggerHold = async () => {
    setValidationError(null);
    setIsMutating(true);
    try {
      const res = await fetch("/api/escrow-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TRIGGER_NCR_HOLD",
          ncr_id: "NCR-2026-STR-042",
          bim_zone_id: "BIT-4-TG03",
          bit_id: "BIT-4",
          structural_element: "Tower A / BIT-4 – Level 3 Transfer Girder (M50)",
          withholding_lien_inr: 450000,
        }),
      });
      const data = await res.json();
      if (data?.ok && data.gate) {
        setGate(data.gate);
        if (onAuditAppend && data.gate.remediation_65b_hash) {
          onAuditAppend({
            id: `BLOCK-${Math.floor(18403 + Math.random() * 90)}`,
            timeStr: new Date().toTimeString().slice(0, 8),
            governor: "MIDAS-ESCROW-LOCK",
            title: `${data.gate.ncr_id} Active Hold — ₹4,50,000 RA Bill Lien Locked`,
            detail: data.gate.blocking_reason,
            hash: data.gate.remediation_65b_hash,
          });
        }
      }
    } finally {
      setIsMutating(false);
    }
  };

  const isLocked = gate.gate_status === "LOCKED";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 font-mono">
      {/* Left/Main: Bidirectional Quality-to-Escrow Kill Switch Card */}
      <div
        className={`${
          latestFieldRecord ? "lg:col-span-7" : "lg:col-span-12"
        } bg-zinc-900/75 border rounded-2xl p-4 flex flex-col justify-between gap-3.5 transition-colors ${
          isLocked ? "border-rose-500/45" : "border-emerald-500/40"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                BIDIRECTIONAL QUALITY-TO-ESCROW KILL SWITCH
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300">
                <BadgeCheck className="w-3 h-3 text-emerald-400" />
                {gate.provenance_source}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 mt-1">
              {isLocked ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 font-bold text-sm">
                  <Lock className="w-4 h-4" />
                  LOCKED — ₹{gate.withholding_lien_inr.toLocaleString("en-IN")} Lien Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold text-sm">
                  <Unlock className="w-4 h-4" />
                  CLEARED — ₹0 Lien ({(gate.verified_mean_mpa ?? 44.07).toFixed(2)} MPa Verified)
                </span>
              )}

              <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-bold text-zinc-200">
                {gate.ncr_id} • {gate.is_code_clause}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onFocusBimZone(gate.bim_zone_id, gate.ncr_id)}
              className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-700 text-zinc-200 text-[11px] font-bold flex items-center gap-1.5 transition"
            >
              <Box className="w-3.5 h-3.5 text-zinc-400" />
              Locate in 3D BIM
            </button>

            {isLocked ? (
              <button
                type="button"
                onClick={() => setShowRemediationForm((v) => !v)}
                className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-[11px] font-bold flex items-center gap-1.5 transition"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                {showRemediationForm ? "Hide Core Test Form" : "Log IS 456 Core Remediation"}
              </button>
            ) : (
              <button
                type="button"
                disabled={isMutating}
                onClick={handleReTriggerHold}
                className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center gap-1.5 transition"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Simulate Cube / Field Hold
              </button>
            )}
          </div>
        </div>

        {/* Blocking / Clearance Structural Details */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-bold">STRUCTURAL MEMBER: </span>
            <span className="text-zinc-100 font-bold">{gate.structural_element}</span>
          </div>
          <span className="text-[10px] text-zinc-400">
            GRADE: <strong className="text-zinc-200">{gate.concrete_grade}</strong> • ACCEPTANCE: ≥ 42.50 MPa Mean / ≥ 37.50 MPa Core
          </span>
        </div>

        <p className="text-[11px] text-zinc-300 leading-relaxed bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3">
          {gate.blocking_reason}
        </p>

        {/* Inline IS 456:2000 Cl. 17.4.3 Diamond Core Remediation Panel */}
        {isLocked && showRemediationForm && (
          <form
            onSubmit={handleSubmitCoreRemediation}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 flex flex-col gap-3 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
              <span className="text-[11px] font-bold text-zinc-100">
                IS 456:2000 CL. 17.4.3 IN-SITU DIAMOND CORE VERIFICATION (M50)
              </span>
              <span
                className={`text-[11px] font-bold ${
                  Number(previewMean) >= 42.5 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                Computed Mean: {previewMean} MPa (Req ≥ 42.50 MPa)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-bold">CORE #1 (MPa)</label>
                <input
                  type="number"
                  step="0.01"
                  data-quadmax-target="core-1-input" value={core1}
                  onChange={(e) => setCore1(e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-100 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-bold">CORE #2 (MPa)</label>
                <input
                  type="number"
                  step="0.01"
                  data-quadmax-target="core-2-input" value={core2}
                  onChange={(e) => setCore2(e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-100 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-bold">CORE #3 (MPa)</label>
                <input
                  type="number"
                  step="0.01"
                  data-quadmax-target="core-3-input" value={core3}
                  onChange={(e) => setCore3(e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-100 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-bold">NABL LAB CERT ID</label>
                <input
                  type="text"
                  value={labCertRef}
                  onChange={(e) => setLabCertRef(e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-100 text-xs"
                  required
                />
              </div>
            </div>

            {validationError && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setCore1("39.40");
                  setCore2("38.90");
                  setCore3("40.10");
                }}
                className="text-[10px] text-amber-400 hover:underline"
              >
                Load Failing Core Sample (39.47 MPa) to Test Gate Rejection
              </button>

              <button
                type="submit"
                disabled={isMutating}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isMutating ? "Verifying IS 456 & Unblocking Lien..." : "Verify Core Test & Release ₹4,50,000 Lien"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Right: Live 3-Agent Governance Council Consensus Trace when a field record is active */}
      {latestFieldRecord && (
        <div className="lg:col-span-5">
          <GovernanceCouncilTrace record={latestFieldRecord} />
        </div>
      )}
    </div>
  );
}
