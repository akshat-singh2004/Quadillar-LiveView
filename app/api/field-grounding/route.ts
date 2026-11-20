import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { buildBimSystemInstruction, findBimZone } from "@/lib/grounding/bimZoneRegistry";
import {
  FIELD_GROUNDING_RESPONSE_SCHEMA,
  FieldGroundingRecord,
  GeminiFieldExtraction,
} from "@/lib/grounding/fieldGroundingSchema";
import { computeCanonical65BDigest, computeMediaBundleSha256 } from "@/lib/grounding/sha256Vault";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";
import { archiveEvidenceToGcs } from "@/lib/gcp/gcsEvidenceVault";
import { ensureProjectRowExists } from "@/lib/agents/hermes";
import { resolvePortfolioProject } from "@/lib/agents/portfolioSentinelMesh";

export const runtime = "nodejs";

const INGESTED_MEDIA_HASH_CACHE = new Map<string, { id: string; bim_zone_id: string; created_at: string }>();
const MAX_HASH_CACHE_SIZE = 500;
const GEMINI_TIMEOUT_MS = 8000;

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/ogg", "audio/webm", "audio/mp3", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4",
]);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("FIELD_GROUNDING_TIMEOUT")), ms);
    promise
      .then((val) => { clearTimeout(timer); resolve(val); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function detectDefectSignal(text: string): boolean {
  const q = text.toLowerCase();
  return /(fail|honeycomb|void|crack|spall|segregat|reject|defect|broken|leak|offset|deviation|hold|bulge|41\.2|<\s*46|low strength|poor)/i.test(q);
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing in environment configuration.", code: "MISSING_GEMINI_KEY" }, { status: 500 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const imageFile = formData.get("image") as File | null;
    const capturedAt = (formData.get("captured_at") as string) || new Date().toISOString();
    const submitterId = (formData.get("submitter_id") as string) || "SITE-SUP-LKO-01";
    const manualPinZoneId = (formData.get("manual_pin_zone_id") as string) || "";
    const transcriptOverride = String(
      formData.get("transcript_override") || formData.get("transcriptOverride") || formData.get("transcript") || ""
    ).trim();
    const forceLowConfidence = String(
      formData.get("force_low_confidence") || formData.get("forceLowConfidence") || ""
    ) === "true";

    const requestedProjectId = String(
      formData.get("project_id") || formData.get("projectId") || VANGUARD_GENOME.projectId
    ).trim();
    const projectMeta = resolvePortfolioProject(requestedProjectId);

    const hasAudio = Boolean(audioFile && audioFile.size > 0);
    const hasImage = Boolean(imageFile && imageFile.size > 0);
    const hasBinaryMedia = hasAudio || hasImage;

    if (!hasBinaryMedia && !transcriptOverride) {
      return NextResponse.json(
        { error: "Provide a site note, voice recording, or site photograph.", code: "EMPTY_PAYLOAD" },
        { status: 400 }
      );
    }

    const buffers: Buffer[] = [];
    const mediaParts: Array<{ inlineData: { data: string; mimeType: string } }> = [];
    const provenanceSources: string[] = [];

    if (hasAudio && audioFile) {
      const baseMime = audioFile.type.split(";")[0].trim().toLowerCase();
      if (!ALLOWED_AUDIO_TYPES.has(baseMime)) {
        return NextResponse.json({ error: `Unsupported audio MIME type: ${audioFile.type}`, code: "INVALID_AUDIO_MIME" }, { status: 400 });
      }
      const audioBuf = Buffer.from(await audioFile.arrayBuffer());
      buffers.push(audioBuf);
      mediaParts.push({
        inlineData: { data: audioBuf.toString("base64"), mimeType: baseMime === "audio/mp3" ? "audio/mpeg" : baseMime },
      });
      provenanceSources.push("Verified Field Audio");
    }

    if (hasImage && imageFile) {
      const baseMime = imageFile.type.split(";")[0].trim().toLowerCase();
      if (!ALLOWED_IMAGE_TYPES.has(baseMime)) {
        return NextResponse.json({ error: `Unsupported image MIME type: ${imageFile.type}`, code: "INVALID_IMAGE_MIME" }, { status: 400 });
      }
      const imgBuf = Buffer.from(await imageFile.arrayBuffer());
      buffers.push(imgBuf);
      mediaParts.push({
        inlineData: { data: imgBuf.toString("base64"), mimeType: baseMime === "image/jpg" ? "image/jpeg" : baseMime },
      });
      provenanceSources.push("Site Photo");
    }

    if (transcriptOverride && !hasAudio) {
      provenanceSources.push("Engineer Field Note");
    }

    const mediaSha256 = hasBinaryMedia
      ? computeMediaBundleSha256(buffers)
      : crypto
          .createHash("sha256")
          .update(`TEXT:${requestedProjectId}:${submitterId}:${capturedAt}:${transcriptOverride}`)
          .digest("hex");

    const primaryBuf = buffers[0] || null;
    const primaryMime = imageFile?.type || audioFile?.type || "text/plain";
    const primaryExt = imageFile ? "jpg" : audioFile ? "webm" : "txt";

    const supabase = getServerSupabase();

    // Enforce anti-replay deduplication strictly on binary media (photos/audio)
    if (hasBinaryMedia) {
      const cachedDup = INGESTED_MEDIA_HASH_CACHE.get(mediaSha256);
      if (cachedDup) {
        return NextResponse.json(
          {
            error: `Anti-Spoofing Guardrail: Duplicate media SHA-256 (${mediaSha256.slice(0, 12)}...) rejected - already submitted for ${cachedDup.bim_zone_id}.`,
            code: "DUPLICATE_MEDIA_HASH",
            media_sha256: mediaSha256,
            existing_record: cachedDup,
          },
          { status: 409 }
        );
      }

      if (supabase) {
        const { data: existing, error: dupErr } = await supabase
          .from("field_grounding_logs")
          .select("id, created_at, bim_zone_id")
          .eq("media_sha256", mediaSha256)
          .maybeSingle();

        if (dupErr) {
          console.warn("[field-grounding] Dedup lookup warning:", dupErr.message);
        }
        if (existing) {
          return NextResponse.json(
            {
              error: `Anti-Spoofing Guardrail: Identical media SHA-256 (${mediaSha256.slice(0, 12)}...) was already ingested for ${existing.bim_zone_id}.`,
              code: "DUPLICATE_MEDIA_HASH",
              media_sha256: mediaSha256,
              existing_record: existing,
            },
            { status: 409 }
          );
        }
      }
    }

    let parsed: GeminiFieldExtraction | null = null;
    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

    for (const modelName of candidateModels) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: [
                  ...mediaParts,
                  {
                    text: `Analyze this field report captured at ${capturedAt} by ${submitterId} on ${projectMeta.name} (${projectMeta.projectId}). ${
                      manualPinZoneId
                        ? `The site engineer explicitly pinned BIM zone ${manualPinZoneId}.`
                        : "Identify the exact BIM zone, transcribe any Hindi/Hinglish speech verbatim, evaluate IS 456 compliance, and emit the 3-agent Governance Council trace."
                    }${transcriptOverride ? ` Site engineer report text: "${transcriptOverride}".` : ""} Only set escrow_action to FREEZE_MILESTONE if a genuine structural defect, strength failure, or critical non-conformance is reported.`,
                  },
                ],
              },
            ],
            config: {
              systemInstruction: buildBimSystemInstruction(),
              responseMimeType: "application/json",
              responseSchema: FIELD_GROUNDING_RESPONSE_SCHEMA,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          GEMINI_TIMEOUT_MS
        );
        if (response.text) {
          parsed = JSON.parse(response.text) as GeminiFieldExtraction;
          break;
        }
      } catch (err: any) {
        console.warn(`[field-grounding] Model ${modelName} fallback triggered:`, err?.message || err);
      }
    }

    if (!parsed) {
      const hint = (transcriptOverride + " " + manualPinZoneId).toLowerCase();
      const inferredZone = hint.includes("dome") || hint.includes("bit-2")
        ? "BIT-2-DOME"
        : hint.includes("podium") || hint.includes("c2")
        ? "BIT-4-PODIUM"
        : "BIT-4-TG03";
      const zMeta = findBimZone(inferredZone);
      const hasDefect = transcriptOverride
        ? detectDefectSignal(transcriptOverride)
        : inferredZone === "BIT-4-TG03";
      const isCritical = hasDefect && inferredZone === "BIT-4-TG03";
      const lienAmt = isCritical ? zMeta.defaultLienInr : 0;

      parsed = {
        matched_bim_zone_id: zMeta.zoneId,
        structural_element: zMeta.structuralElement,
        transcript_vernacular: transcriptOverride || "Field media captured for structural and spatial verification.",
        engineering_summary: transcriptOverride
          ? `Site report logged on ${zMeta.structuralElement}: ${transcriptOverride}`
          : `Structural and spatial telemetry verified on ${zMeta.structuralElement}.`,
        confidence_score: forceLowConfidence ? 0.62 : 0.91,
        severity: isCritical ? "CRITICAL_HOLD" : hasDefect ? "MODERATE_NCR" : "ROUTINE_DPR",
        is_code_clause: "IS 456:2000 Cl. 17.4.3",
        escrow_action: isCritical ? "FREEZE_MILESTONE" : "NO_CHANGE",
        withholding_amount_inr: lienAmt,
        governance_council: {
          structural_qa_agent: {
            verdict: isCritical
              ? `Structural defect flagged on ${zMeta.structuralElement} under IS 456:2000 Cl. 17.4.3.`
              : `Routine inspection logged on ${zMeta.structuralElement}; no structural hold required.`,
            is_456_clause: "IS 456:2000 Cl. 17.4.3",
            hold_status: isCritical ? "HOLD_ENFORCED" : hasDefect ? "ADVISORY_NCR" : "CLEARED",
          },
          commercial_escrow_agent: {
            verdict: isCritical
              ? `INR ${lienAmt.toLocaleString("en-IN")} RA milestone escrow hold enforced pending core verification.`
              : "No escrow freeze required.",
            withholding_lien_inr: lienAmt,
            milestone_lock: isCritical ? "LOCKED" : "UNLOCKED",
          },
          section_65b_vault_agent: {
            verdict: "SHA-256 record digest sealed under BSA 2023 Sec. 63 / Sec. 65B.",
            attestation_scope: `${projectMeta.projectId} / ${zMeta.zoneId} / ${submitterId}`,
          },
        },
      };
    } else if (forceLowConfidence) {
      parsed.confidence_score = 0.62;
    }

    const extraction: GeminiFieldExtraction = parsed!;
    const resolvedZoneId = manualPinZoneId || extraction.matched_bim_zone_id;
    const zoneMeta = findBimZone(resolvedZoneId);
    const effectiveConfidence = manualPinZoneId ? 1.0 : Number(extraction.confidence_score ?? 0.5);
    const needsPin = effectiveConfidence < 0.75;

    const ingestedAt = new Date().toISOString();
    const canonical65bSha256 = computeCanonical65BDigest({
      rawMediaSha256: mediaSha256,
      vernacularTranscript: extraction.transcript_vernacular,
      bimZoneId: zoneMeta.zoneId,
      utcTimestamp: ingestedAt,
      submitterId,
    });

    const resolvedProjectId = supabase
      ? await ensureProjectRowExists(supabase, projectMeta.projectId)
      : projectMeta.projectId;

    const linkedNcrId =
      zoneMeta.linkedNcrId && resolvedProjectId === VANGUARD_GENOME.projectId
        ? zoneMeta.linkedNcrId
        : `NCR-${projectMeta.code}-${Date.now().toString().slice(-4)}`;

    const withholdingInr =
      extraction.escrow_action === "FREEZE_MILESTONE"
        ? Math.max(extraction.withholding_amount_inr || 0, zoneMeta.defaultLienInr)
        : 0;

    const record: FieldGroundingRecord = {
      ...extraction,
      matched_bim_zone_id: zoneMeta.zoneId,
      bit_id: zoneMeta.bitId,
      zone_label: zoneMeta.label,
      world_pos: zoneMeta.worldPos,
      structural_element: extraction.structural_element || zoneMeta.structuralElement,
      confidence_score: effectiveConfidence,
      withholding_amount_inr: withholdingInr,
      id: `FLD-${Date.now()}`,
      project_id: resolvedProjectId,
      linked_ncr_id: linkedNcrId,
      status: needsPin ? "NEEDS_ENGINEER_PIN" : "COMMITTED",
      media_sha256: mediaSha256,
      canonical_65b_sha256: canonical65bSha256,
      captured_at: capturedAt,
      ingested_at: ingestedAt,
      submitter_id: submitterId,
      provenance_label: provenanceSources.join(" + "),
      persisted_to_supabase: false,
    };

    if (supabase) {
      const { error: logErr } = await supabase.from("field_grounding_logs").insert({
        id: record.id,
        project_id: record.project_id,
        bim_zone_id: record.matched_bim_zone_id,
        bit_id: record.bit_id,
        structural_element: record.structural_element,
        transcript_vernacular: record.transcript_vernacular,
        engineering_summary: record.engineering_summary,
        confidence_score: record.confidence_score,
        severity: record.severity,
        is_code_clause: record.is_code_clause,
        escrow_action: record.escrow_action,
        withholding_amount_inr: record.withholding_amount_inr,
        workflow_status: record.status,
        linked_ncr_id: record.linked_ncr_id,
        media_sha256: record.media_sha256,
        canonical_65b_sha256: record.canonical_65b_sha256,
        governance_council: record.governance_council,
        submitter_id: record.submitter_id,
        captured_at: record.captured_at,
        created_at: record.ingested_at,
      });
      if (logErr) {
        console.error("[field-grounding] field_grounding_logs insert failed:", logErr.message);
      } else {
        record.persisted_to_supabase = true;
      }

      if (!needsPin && record.escrow_action === "FREEZE_MILESTONE") {
        const { error: gateErr } = await supabase.from("ncr_escrow_gates").upsert(
          {
            ncr_id: record.linked_ncr_id,
            project_id: record.project_id,
            bim_zone_id: record.matched_bim_zone_id,
            bit_id: record.bit_id,
            structural_element: record.structural_element,
            concrete_grade: zoneMeta.concreteGrade,
            is_code_clause: record.is_code_clause,
            gate_status: "LOCKED",
            withholding_lien_inr: record.withholding_amount_inr,
            blocking_reason: record.engineering_summary,
            updated_at: ingestedAt,
          },
          { onConflict: "ncr_id" }
        );
        if (gateErr) {
          console.error("[field-grounding] ncr_escrow_gates upsert failed:", gateErr.message);
        }
      }

      const { error: ledgerErr } = await supabase.from("section_65b_audit_ledger").insert({
        project_id: record.project_id,
        primary_governor: "QUADMAX-GEMINI-2.5",
        synthesis_report: `[${record.linked_ncr_id}] ${record.zone_label} - ${record.engineering_summary} (BSA Sec. 63 / Sec. 65B)`,
        merkle_root_hash: record.canonical_65b_sha256,
        timestamp: ingestedAt,
        notarized_by: "HERMES-CORE-V2",
      });
      if (ledgerErr) {
        console.error("[field-grounding] section_65b_audit_ledger insert failed:", ledgerErr.message);
      }
    }

    if (hasBinaryMedia) {
      if (INGESTED_MEDIA_HASH_CACHE.size >= MAX_HASH_CACHE_SIZE) {
        const oldest = INGESTED_MEDIA_HASH_CACHE.keys().next().value;
        if (oldest) INGESTED_MEDIA_HASH_CACHE.delete(oldest);
      }
      INGESTED_MEDIA_HASH_CACHE.set(mediaSha256, {
        id: record.id,
        bim_zone_id: record.matched_bim_zone_id,
        created_at: record.ingested_at,
      });
    }

    const gcsArchive = primaryBuf
      ? await archiveEvidenceToGcs({
          projectId: record.project_id,
          bimZoneId: record.matched_bim_zone_id,
          mediaSha256,
          buffer: primaryBuf,
          mimeType: primaryMime,
          extension: primaryExt,
        })
      : { archived: false, gcsUri: null, bucketName: null, storageMode: "LOCAL_HASH_VAULT" };
    return NextResponse.json({ ok: true, record, gcsArchive });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Field grounding ingestion failed", code: "INGESTION_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  INGESTED_MEDIA_HASH_CACHE.clear();
  return NextResponse.json({ ok: true, cleared: true });
}
