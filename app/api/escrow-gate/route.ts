import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateIs456CoreTest } from "@/lib/grounding/is456Validator";
import { computeCanonical65BDigest } from "@/lib/grounding/sha256Vault";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

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

const DEFAULT_GATE: EscrowGateState = {
  ncr_id: "NCR-2026-STR-042",
  project_id: VANGUARD_GENOME.projectId,
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
};

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: true, gate: DEFAULT_GATE });
  }

  try {
    const { data, error } = await supabase
      .from("ncr_escrow_gates")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ ok: true, gate: DEFAULT_GATE });
    }

    const gate: EscrowGateState = {
      ...DEFAULT_GATE,
      ...data,
      withholding_lien_inr: Number(data.withholding_lien_inr ?? 0),
      verified_mean_mpa: data.verified_mean_mpa ? Number(data.verified_mean_mpa) : null,
      provenance_source:
        data.gate_status === "CLEARED"
          ? "Lab Core Certificate (IS 456 Cl. 17.4.3)"
          : "Verified Field Audio + Photo / Cube Register",
    };

    return NextResponse.json({ ok: true, gate });
  } catch {
    return NextResponse.json({ ok: true, gate: DEFAULT_GATE });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || "");
    const ncrId = String(body.ncr_id || "NCR-2026-STR-042");
    const bimZoneId = String(body.bim_zone_id || "BIT-4-TG03");
    const bitId = String(body.bit_id || "BIT-4");
    const structuralElement = String(
      body.structural_element || "Tower A / BIT-4 – Level 3 Transfer Girder (M50)"
    );
    const now = new Date().toISOString();
    const supabase = getServerSupabase();

    if (action === "TRIGGER_NCR_HOLD") {
      const lienInr = Number(body.withholding_lien_inr || 450000);
      const reason = String(
        body.blocking_reason ||
          "28-day concrete cube break failure (41.2 MPa < 46.0 MPa M50 threshold) & shuttering honeycombing hold active."
      );
      const hash65b = computeCanonical65BDigest({
        rawMediaSha256: `HOLD:${ncrId}:${lienInr}`,
        vernacularTranscript: reason,
        bimZoneId,
        utcTimestamp: now,
        submitterId: "QUADMAX-QA-ESCROW-GATE",
      });

      const lockedGate: EscrowGateState = {
        ncr_id: ncrId,
        project_id: VANGUARD_GENOME.projectId,
        bim_zone_id: bimZoneId,
        bit_id: bitId,
        structural_element: structuralElement,
        concrete_grade: "M50",
        is_code_clause: "IS 456:2000 Cl. 17.4.3",
        gate_status: "LOCKED",
        withholding_lien_inr: lienInr,
        blocking_reason: reason,
        core_readings_mpa: null,
        verified_mean_mpa: null,
        lab_certificate_ref: null,
        remediation_65b_hash: hash65b,
        provenance_source: "Verified Field Audio + Photo",
        updated_at: now,
      };

      if (supabase) {
        try {
          await supabase.from("ncr_escrow_gates").upsert(
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

          await supabase.from("section_65b_audit_ledger").insert({
            project_id: lockedGate.project_id,
            primary_governor: "MIDAS-ESCROW-LOCK",
            synthesis_report: `[${lockedGate.ncr_id}] ESCROW LOCKED — ₹${lienInr.toLocaleString("en-IN")} Lien Enforced on ${lockedGate.structural_element} (IS 456:2000 Cl. 17.4.3)`,
            merkle_root_hash: hash65b,
            timestamp: now,
            notarized_by: "HERMES-CORE-V2",
          });
        } catch {}
      }

      return NextResponse.json({ ok: true, gate: lockedGate });
    }

    if (action === "REMEDIATE_CORE_TEST") {
      const rawReadings = Array.isArray(body.core_readings_mpa)
        ? body.core_readings_mpa.map((n: unknown) => Number(n))
        : [];
      const labCertRef = String(body.lab_certificate_ref || "").trim();

      if (!labCertRef) {
        return NextResponse.json(
          {
            error: "NABL Accredited Lab Core Test Certificate reference is mandatory before releasing escrow lien.",
            code: "MISSING_LAB_CERTIFICATE",
          },
          { status: 422 }
        );
      }

      const validation = validateIs456CoreTest(rawReadings, 50);
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
        rawMediaSha256: `CORE-PASS:${ncrId}:${rawReadings.join(",")}:CERT:${labCertRef}`,
        vernacularTranscript: `IS 456:2000 Cl. 17.4.3 In-Situ Diamond Core Verification (${validation.actualMeanMpa} MPa mean) — Cert ${labCertRef}`,
        bimZoneId,
        utcTimestamp: now,
        submitterId: "THEMIS-NDT-CORE-GATE",
      });

      const clearedGate: EscrowGateState = {
        ncr_id: ncrId,
        project_id: VANGUARD_GENOME.projectId,
        bim_zone_id: bimZoneId,
        bit_id: bitId,
        structural_element: structuralElement,
        concrete_grade: "M50",
        is_code_clause: "IS 456:2000 Cl. 17.4.3",
        gate_status: "CLEARED",
        withholding_lien_inr: 0,
        blocking_reason: `Cleared via IS 456:2000 Cl. 17.4.3 in-situ diamond core test (${validation.actualMeanMpa} MPa avg >= 42.50 MPa M50 threshold; Lab Cert ${labCertRef}).`,
        core_readings_mpa: rawReadings,
        verified_mean_mpa: validation.actualMeanMpa,
        lab_certificate_ref: labCertRef,
        remediation_65b_hash: hash65b,
        provenance_source: "Lab Core Certificate",
        updated_at: now,
      };

      if (supabase) {
        try {
          await supabase.from("ncr_escrow_gates").upsert(
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
              core_readings_mpa: rawReadings,
              verified_mean_mpa: validation.actualMeanMpa,
              lab_certificate_ref: labCertRef,
              remediation_65b_hash: hash65b,
              updated_at: now,
            },
            { onConflict: "ncr_id" }
          );

          await supabase.from("section_65b_audit_ledger").insert({
            project_id: clearedGate.project_id,
            primary_governor: "THEMIS-NDT-CORE",
            synthesis_report: `[${clearedGate.ncr_id}] CLEARED — ₹0 Lien (${validation.actualMeanMpa} MPa Verified per IS 456:2000 Cl. 17.4.3 • Cert ${labCertRef})`,
            merkle_root_hash: hash65b,
            timestamp: now,
            notarized_by: "HERMES-CORE-V2",
          });
        } catch {}
      }

      return NextResponse.json({ ok: true, gate: clearedGate, validation });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Escrow gate mutation failed" },
      { status: 500 }
    );
  }
}
