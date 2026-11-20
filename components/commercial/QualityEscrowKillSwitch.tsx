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
import { useActiveProject } from "@/context/ProjectContext";
import { parseConcreteGradeMpa } from "@/lib/grounding/is456Validator";

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
  const { activeProject } = useActiveProject();

  const [gate, setGate] = useState<EscrowGateState>({
    ncr_id: "NCR-2026-STR-042",
    project_id: activeProject.projectId,
    bim_zone_id: "BIT-4-TG03",
    bit_id: "BIT-4",
    structural_element: "Tower A / BIT-4 - Level 3 Transfer Girder (M50)",
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
      const res = await fetch(
        `/api/escrow-gate?project_id=${encodeURIComponent(activeProject.projectId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data?.ok && data.gate) setGate(data.gate);
    } catch (err) {
      console.error("[QualityEscrowKillSwitch] Failed to load escrow gate:", err);
    }
  }, [activeProject.projectId]);

  useEffect(() => {
    loadGate();

    const channel = supabase
      .channel(`ncr-escrow-${activeProject.projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ncr_escrow_gates",
          filter: `project_id=eq.${activeProject.projectId}`,
        },
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
                  ? "Lab Core Certificate (IS 456 Cl. 17.4.3)"
                  : "Verified Field Report / Cube Register",
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeProject.projectId, loadGate]);

  useEffect(() => {
    if (
      latestFieldRecord &&
      latestFieldRecord.project_id === activeProject.projectId &&
      latestFieldRecord.status === "COMMITTED" &&
      latestFieldRecord.escrow_action === "FREEZE_MILESTONE"
    ) {
      setGate((prev) => ({
        ...prev,
        project_id: latestFieldRecord.project_id,
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
  }, [latestFieldRecord, activeProject.projectId]);

  const gradeMpa = parseConcreteGradeMpa(gate.concrete_grade || gate.structural_element);
  const requiredMeanMpa = Number((gradeMpa * 0.85).toFixed(2));
  const requiredMinMpa = Number((gradeMpa * 0.75).toFixed(2));

  const parsedReadings = [parseFloat(core1), parseFloat(core2), parseFloat(core3)].filter((n) =>
    Number.isFinite(n)
  );
  const previewMean =
    parsedReadings.length === 3
      ? (parsedReadings.reduce((a, b) => a + b, 0) / 3).toFixed(2)
      : "0.00";
  const previewPasses =
    parsedReadings.length === 3 &&
    Number(previewMean) >= requiredMeanMpa &&
    Math.min(...parsedReadings) >= requiredMinMpa;

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
          project_id: activeProject.projectId,
          ncr_id: gate.ncr_id,
          bim_zone_id: gate.bim_zone_id,
          bit_id: gate.bit_id,
          structural_element: gate.structural_element,
          concrete_grade: `M${gradeMpa}`,
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
          title: `${updated.ncr_id} Cleared - INR 0 Hold (${updated.verified_mean_mpa?.toFixed(2)} MPa Core Verified)`,
          detail: `${updated.structural_element} | ${updated.is_code_clause} | Cert ${updated.lab_certificate_ref}`,
          hash: updated.remediation_65b_hash,
        });
      }
    } catch (err: any) {
      setValidationError(err?.message || "Failed to execute core verification");
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
          project_id: activeProject.projectId,
          ncr_id: gate.ncr_id || "NCR-2026-STR-042",
          bim_zone_id: gate.bim_zone_id || "BIT-4-TG03",
          bit_id: gate.bit_id || "BIT-4",
          structural_element: gate.structural_element,
          concrete_grade: `M${gradeMpa}`,
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
            title: `${data.gate.ncr_id} Hold Active - INR ${Number(data.gate.withholding_lien_inr).toLocaleString("en-IN")} Paused`,
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
  const formattedLien = Number(gate.withholding_lien_inr || 0).toLocaleString("en-IN");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 font-sans">
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
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Payment Hold & Quality Gate
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 text-[10.5px] text-zinc-300">
                <BadgeCheck className="w-3 h-3 text-emerald-400" />
                {gate.provenance_source}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 mt-1">
              {isLocked ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 font-bold text-sm">
                  <Lock className="w-4 h-4" />
                  PAYMENT PAUSED — INR {formattedLien} Held
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold text-sm">
                  <Unlock className="w-4 h-4" />
                  PAYMENT CLEARED — INR 0 Held ({(gate.verified_mean_mpa ?? 44.07).toFixed(2)} MPa Verified)
                </span>
              )}

              <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono font-semibold text-zinc-200">
                {gate.ncr_id} | {gate.is_code_clause}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onFocusBimZone(gate.bim_zone_id, gate.ncr_id)}
              className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Box className="w-3.5 h-3.5 text-zinc-400" />
              View in 3D Building
            </button>

            {isLocked ? (
              <button
                type="button"
                data-guide-target="open-core-form"
                onClick={() => setShowRemediationForm((v) => !v)}
                className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                {showRemediationForm ? "Close Lab Form" : "Submit Lab Core Test"}
              </button>
            ) : (
              <button
                type="button"
                disabled={isMutating}
                onClick={handleReTriggerHold}
                className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Re-Lock Payment Hold
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-[11px] text-zinc-500 uppercase font-semibold">Element: </span>
            <span className="text-zinc-100 font-semibold">{gate.structural_element}</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Grade <strong className="text-zinc-200">M{gradeMpa}</strong> | Pass Rule: Mean {">="} {requiredMeanMpa.toFixed(2)} MPa, Min {">="} {requiredMinMpa.toFixed(2)} MPa
          </span>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3">
          {gate.blocking_reason}
        </p>

        {isLocked && showRemediationForm && (
          <form
            onSubmit={handleSubmitCoreRemediation}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 flex flex-col gap-3 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
              <span className="font-semibold text-zinc-100">
                IS 456:2000 Cl. 17.4.3 Lab Core Verification (M{gradeMpa})
              </span>
              <span
                className={`font-mono font-semibold ${
                  previewPasses ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                Average: {previewMean} MPa (Need {">="} {requiredMeanMpa.toFixed(2)} MPa)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10.5px] text-zinc-400 uppercase font-semibold">Core #1 (MPa)</label>
                <input
                  type="number"
                  step="0.01"
                  data-quadmax-target="core-1-input"
                  value={core1}
                  onChange={(e) => setCore1(e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-100 text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-[10.5px] text-zinc-400 uppercase font-semibold">Core #2 (MPa)</label>
                <input
                  type="number"
                  step="0.01"
                  data-quadmax-target="core-2-input"
                  value={core2}
                  onChange={(e) => setCore2(e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-100 text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-[10.5px] text-zinc-400 uppercase font-semibold">Core #3 (MPa)</label>
                <input
                  type="number"
                  step="0.01"
                  data-quadmax-target="core-3-input"
                  value={core3}
                  onChange={(e) => setCore3(e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-100 text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-[10.5px] text-zinc-400 uppercase font-semibold">NABL Lab Cert ID</label>
                <input
                  type="text"
                  value={labCertRef}
                  onChange={(e) => setLabCertRef(e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-100 text-xs font-mono"
                  required
                />
              </div>
            </div>

            {validationError && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
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
                className="text-[11px] text-amber-400 hover:underline cursor-pointer"
              >
                Load failing sample (39.47 MPa) to test automatic block
              </button>

              <button
                type="submit"
                disabled={isMutating}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isMutating
                  ? "Verifying IS 456 & Releasing Hold..."
                  : `Verify Core Test & Release INR ${formattedLien}`}
              </button>
            </div>
          </form>
        )}
      </div>

      {latestFieldRecord && (
        <div className="lg:col-span-5">
          <GovernanceCouncilTrace record={latestFieldRecord} />
        </div>
      )}
    </div>
  );
}
