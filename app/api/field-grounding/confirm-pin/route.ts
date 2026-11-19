import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { findBimZone } from "@/lib/grounding/bimZoneRegistry";
import { FieldGroundingRecord } from "@/lib/grounding/fieldGroundingSchema";
import { computeCanonical65BDigest } from "@/lib/grounding/sha256Vault";

export const runtime = "nodejs";

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const record = body.record as FieldGroundingRecord | undefined;
    const pinnedZoneId = String(body.pinned_zone_id || "");

    if (!record || !pinnedZoneId) {
      return NextResponse.json({ error: "Missing record or pinned_zone_id" }, { status: 400 });
    }

    const zoneMeta = findBimZone(pinnedZoneId);
    const pinnedAt = new Date().toISOString();
    const updatedHash = computeCanonical65BDigest({
      rawMediaSha256: record.media_sha256,
      vernacularTranscript: record.transcript_vernacular,
      bimZoneId: zoneMeta.zoneId,
      utcTimestamp: pinnedAt,
      submitterId: `${record.submitter_id}:PINNED`,
    });

    const linkedNcrId = zoneMeta.linkedNcrId || record.linked_ncr_id;
    const withholdingInr =
      record.escrow_action === "FREEZE_MILESTONE"
        ? Math.max(record.withholding_amount_inr || 0, zoneMeta.defaultLienInr)
        : 0;

    const committedRecord: FieldGroundingRecord = {
      ...record,
      matched_bim_zone_id: zoneMeta.zoneId,
      bit_id: zoneMeta.bitId,
      zone_label: zoneMeta.label,
      world_pos: zoneMeta.worldPos,
      structural_element: zoneMeta.structuralElement,
      confidence_score: 1.0,
      linked_ncr_id: linkedNcrId,
      withholding_amount_inr: withholdingInr,
      status: "COMMITTED",
      canonical_65b_sha256: updatedHash,
      ingested_at: pinnedAt,
    };

    const supabase = getServerSupabase();
    if (supabase) {
      try {
        await supabase
          .from("field_grounding_logs")
          .update({
            bim_zone_id: committedRecord.matched_bim_zone_id,
            bit_id: committedRecord.bit_id,
            structural_element: committedRecord.structural_element,
            confidence_score: 1.0,
            linked_ncr_id: committedRecord.linked_ncr_id,
            withholding_amount_inr: committedRecord.withholding_amount_inr,
            workflow_status: "COMMITTED",
            canonical_65b_sha256: committedRecord.canonical_65b_sha256,
          })
          .eq("id", committedRecord.id);

        if (committedRecord.escrow_action === "FREEZE_MILESTONE") {
          await supabase.from("ncr_escrow_gates").upsert(
            {
              ncr_id: committedRecord.linked_ncr_id,
              project_id: committedRecord.project_id,
              bim_zone_id: committedRecord.matched_bim_zone_id,
              bit_id: committedRecord.bit_id,
              structural_element: committedRecord.structural_element,
              concrete_grade: zoneMeta.concreteGrade,
              is_code_clause: committedRecord.is_code_clause,
              gate_status: "LOCKED",
              withholding_lien_inr: committedRecord.withholding_amount_inr,
              blocking_reason: committedRecord.engineering_summary,
              updated_at: pinnedAt,
            },
            { onConflict: "ncr_id" }
          );
        }

        await supabase.from("section_65b_audit_ledger").insert({
          project_id: committedRecord.project_id,
          primary_governor: "ENGINEER-BIM-PIN",
          synthesis_report: `[${committedRecord.linked_ncr_id}] Engineer pinned ${committedRecord.zone_label} • ${committedRecord.engineering_summary}`,
          merkle_root_hash: committedRecord.canonical_65b_sha256,
          created_at: pinnedAt,
        });
      } catch {}
    }

    return NextResponse.json({ ok: true, record: committedRecord });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to confirm BIM zone pin" },
      { status: 500 }
    );
  }
}
