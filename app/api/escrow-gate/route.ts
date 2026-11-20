import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  parseConcreteGradeMpa,
  validateIs456CoreTest,
} from "@/lib/grounding/is456Validator";
import { computeCanonical65BDigest } from "@/lib/grounding/sha256Vault";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";
import { ensureProjectRowExists } from "@/lib/agents/hermes";

export const runtime = "nodejs";

export interface EscrowGateState {
  ncr_id: string;
  project_id: string;
  bim_zone_id: string;
  bit_id: string;
  structural_element: string;
  concrete_grade: string;
  is_code_clause: string;
  gate_status: "LOCKED" | "CLEARED";
  withholding_lien_inr: number;
  blocking_reason: string;
  core_readings_mpa: number[] | null;
  verified_mean_mpa: number | null;
  lab_certificate_ref: string | null;
  remediation_65b_hash: string | null;
  provenance_source: string;
  updated_at: string;
}

function buildDefaultGate(projectId?: string | null): EscrowGateState {
  const pid = (projectId || "").trim() || VANGUARD_GENOME.projectId;
  return {
    ncr_id: "NCR-2026-STR-042",
    project_id: pid,
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
  };
}

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id") || "";
  const fallbackGate = buildDefaultGate(projectId);
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: true, gate: fallbackGate, persisted: false });
  }

  try {
    let query = supabase
      .from("ncr_escrow_gates")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (projectId && projectId.toUpperCase() !== "ALL_10") {
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("[escrow-gate GET] Supabase read failed:", error.message);
      return NextResponse.json({ ok: true, gate: fallbackGate, persisted: false });
    }
    if (!data) {
      return NextResponse.json({ ok: true, gate: fallbackGate, persisted: false });
    }

    const gate: EscrowGateState = {
      ...fallbackGate,
      ...data,
      withholding_lien_inr: Number(data.withholding_lien_inr ?? 0),
      verified_mean_mpa: data.verified_mean_mpa ? Number(data.verified_mean_mpa) : null,
      provenance_source:
        data.gate_status === "CLEARED"
          ? "Lab Core Certificate (IS 456 Cl. 17.4.3)"
          : "Verified Field Report / Cube Register",
    };

    return NextResponse.json({ ok: true, gate, persisted: true });
  } catch (err: any) {
    console.error("[escrow-gate GET] Unexpected error:", err?.message || err);
    return NextResponse.json({ ok: true, gate: fallbackGate, persisted: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || "");
    const ncrId = String(body.ncr_id || "NCR-2026-STR-042");
    const requestedProjectId = String(
      body.project_id || body.projectId || VANGUARD_GENOME.projectId
    ).trim();
    const bimZoneId = String(body.bim_zone_id || "BIT-4-TG03");
    const bitId = String(body.bit_id || "BIT-4");
    const structuralElement = String(
      body.structural_element || "Tower A / BIT-4 - Level 3 Transfer Girder (M50)"
    );
    const gradeMpa = parseConcreteGradeMpa(body.concrete_grade || structuralElement);
    const concreteGrade = `M${gradeMpa}`;
    const now = new Date().toISOString();
    const supabase = getServerSupabase();
    const resolvedProjectId = supabase
      ? await ensureProjectRowExists(supabase, requestedProjectId)
      : requestedProjectId;

    if (action === "TRIGGER_NCR_HOLD") {
      const lienInr = Number(body.withholding_lien_inr || 450000);
      const reason = String(
        body.blocking_reason ||
          `28-day concrete cube break failure below ${concreteGrade} IS 456 acceptance threshold.`
      );
      const hash65b = computeCanonical65BDigest({
        rawMediaSha256: `HOLD:${resolvedProjectId}:${ncrId}:${lienInr}`,
        vernacularTranscript: reason,
        bimZoneId,
        utcTimestamp: now,
        submitterId: "QUADMAX-QA-ESCROW-GATE",
      });

      const lockedGate: EscrowGateState = {
        ncr_id: ncrId,
        project_id: resolvedProjectId,
        bim_zone_id: bimZoneId,
        bit_id: bitId,
        structural_element: structuralElement,
        concrete_grade: concreteGrade,
        is_code_clause: "IS 456:2000 Cl. 17.4.3",
        gate_status: "LOCKED",
        withholding_lien_inr: lienInr,
        blocking_reason: reason,
        core_readings_mpa: null,
        verified_mean_mpa: null,
        lab_certificate_ref: null,
        remediation_65b_hash: hash65b,
        provenance_source: "Verified Site Inspection",
        updated_at: now,
      };

      let persisted = false;
      if (supabase) {
        const { error: upsertErr } = await supabase.from("ncr_escrow_gates").upsert(
          {
            ncr_id: lockedGate.ncr_id,
            project_id: lockedGate.project_id,
            bim_zone_id: lockedGate.bim_zone_id,
            bit_id: lockedGate.bit_id,
            structural_element: lockedGate.structural_element,
            concrete_grade: lockedGate.concrete_grade,
            is_code_clause: lockedGate.is_code_clause,
            gate_status: "LOCKED",
            withholding_lien_inr: lockedGate.withholding_lien_inr,
            blocking_reason: lockedGate.blocking_reason,
            core_readings_mpa: null,
            verified_mean_mpa: null,
            lab_certificate_ref: null,
            remediation_65b_hash: hash65b,
            updated_at: now,
          },
          { onConflict: "ncr_id" }
        );
        if (upsertErr) {
          console.error("[escrow-gate HOLD] ncr_escrow_gates upsert failed:", upsertErr.message);
        } else {
          persisted = true;
        }

        const { error: ledgerErr } = await supabase.from("section_65b_audit_ledger").insert({
          project_id: lockedGate.project_id,
          primary_governor: "MIDAS-ESCROW-LOCK",
          synthesis_report: `[${lockedGate.ncr_id}] ESCROW LOCKED - INR ${lienInr.toLocaleString("en-IN")} Lien Enforced on ${lockedGate.structural_element} (${concreteGrade}, IS 456:2000 Cl. 17.4.3)`,
          merkle_root_hash: hash65b,
          timestamp: now,
          notarized_by: "HERMES-CORE-V2",
        });
        if (ledgerErr) {
          console.error("[escrow-gate HOLD] section_65b_audit_ledger insert failed:", ledgerErr.message);
        }
      }

      return NextResponse.json({ ok: true, gate: lockedGate, persisted });
    }

    if (action === "REMEDIATE_CORE_TEST") {
      const rawReadings = Array.isArray(body.core_readings_mpa)
        ? body.core_readings_mpa.map((n: unknown) => Number(n))
        : [];
      const labCertRef = String(body.lab_certificate_ref || "").trim();
      const inputMode = body.input_mode === "RAW_CORE" ? "RAW_CORE" : "EQUIVALENT_CUBE";

      if (!labCertRef) {
        return NextResponse.json(
          {
            error: "NABL Accredited Lab Core Test Certificate reference is mandatory before releasing escrow lien.",
            code: "MISSING_LAB_CERTIFICATE",
          },
          { status: 422 }
        );
      }

      const validation = validateIs456CoreTest(rawReadings, gradeMpa, {
        inputMode,
        lengthToDiameterRatio: Number(body.ld_ratio || 2.0),
        coreDiameterMm: Number(body.core_diameter_mm || 75),
      });
      if (!validation.passed) {
        return NextResponse.json(
          {
            error: validation.reason,
            code: "IS_456_CORE_TEST_FAILED",
            validation,
          },
          { status: 422 }
        );
      }

      const hash65b = computeCanonical65BDigest({
        rawMediaSha256: `CORE-PASS:${resolvedProjectId}:${ncrId}:${validation.equivalentReadingsMpa.join(",")}:CERT:${labCertRef}`,
        vernacularTranscript: `IS 456:2000 Cl. 17.4.3 In-Situ Core Verification (${validation.actualMeanMpa} MPa mean for ${concreteGrade}) - Cert ${labCertRef}`,
        bimZoneId,
        utcTimestamp: now,
        submitterId: "THEMIS-NDT-CORE-GATE",
      });

      const clearedGate: EscrowGateState = {
        ncr_id: ncrId,
        project_id: resolvedProjectId,
        bim_zone_id: bimZoneId,
        bit_id: bitId,
        structural_element: structuralElement,
        concrete_grade: concreteGrade,
        is_code_clause: "IS 456:2000 Cl. 17.4.3",
        gate_status: "CLEARED",
        withholding_lien_inr: 0,
        blocking_reason: `Cleared via IS 456:2000 Cl. 17.4.3 core test (${validation.actualMeanMpa} MPa >= ${validation.requiredMeanMpa} MPa ${concreteGrade} threshold; Lab Cert ${labCertRef}).`,
        core_readings_mpa: validation.equivalentReadingsMpa,
        verified_mean_mpa: validation.actualMeanMpa,
        lab_certificate_ref: labCertRef,
        remediation_65b_hash: hash65b,
        provenance_source: "Lab Core Certificate",
        updated_at: now,
      };

      let persisted = false;
      if (supabase) {
        const { error: upsertErr } = await supabase.from("ncr_escrow_gates").upsert(
          {
            ncr_id: clearedGate.ncr_id,
            project_id: clearedGate.project_id,
            bim_zone_id: clearedGate.bim_zone_id,
            bit_id: clearedGate.bit_id,
            structural_element: clearedGate.structural_element,
            concrete_grade: clearedGate.concrete_grade,
            is_code_clause: clearedGate.is_code_clause,
            gate_status: "CLEARED",
            withholding_lien_inr: 0,
            blocking_reason: clearedGate.blocking_reason,
            core_readings_mpa: validation.equivalentReadingsMpa,
            verified_mean_mpa: validation.actualMeanMpa,
            lab_certificate_ref: labCertRef,
            remediation_65b_hash: hash65b,
            updated_at: now,
          },
          { onConflict: "ncr_id" }
        );
        if (upsertErr) {
          console.error("[escrow-gate CLEAR] ncr_escrow_gates upsert failed:", upsertErr.message);
        } else {
          persisted = true;
        }

        const { error: ledgerErr } = await supabase.from("section_65b_audit_ledger").insert({
          project_id: clearedGate.project_id,
          primary_governor: "THEMIS-NDT-CORE",
          synthesis_report: `[${clearedGate.ncr_id}] CLEARED - INR 0 Lien (${validation.actualMeanMpa} MPa verified for ${concreteGrade}, IS 456:2000 Cl. 17.4.3 - Cert ${labCertRef})`,
          merkle_root_hash: hash65b,
          timestamp: now,
          notarized_by: "HERMES-CORE-V2",
        });
        if (ledgerErr) {
          console.error("[escrow-gate CLEAR] section_65b_audit_ledger insert failed:", ledgerErr.message);
        }
      }

      return NextResponse.json({ ok: true, gate: clearedGate, validation, persisted });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: any) {
    console.error("[escrow-gate POST] Error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Escrow gate mutation failed" },
      { status: 500 }
    );
  }
}
