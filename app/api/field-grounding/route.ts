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
export const maxDuration = 60;

const INGESTED_MEDIA_HASH_CACHE = new Map<string, { id: string; bim_zone_id: string; created_at: string }>();
const MAX_HASH_CACHE_SIZE = 500;
const GEMINI_TIMEOUT_MS = 22000;

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/ogg",
  "audio/webm",
  "audio/mp3",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/aac",
  "audio/x-m4a",
]);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("FIELD_GROUNDING_TIMEOUT")), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
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
  return /(fail|honeycomb|void|crack|spall|segregat|reject|defect|broken|leak|seepage|offset|deviation|hold|bulge|41\.2|<\s*46|low strength|poor|exposed rebar|darar|toot|chhat.*crack|ceiling.*crack)/i.test(
    q
  );
}

function normalizeGeminiPayload(raw: any, projectId: string, submitterId: string): GeminiFieldExtraction | null {
  if (!raw || typeof raw !== "object") return null;
  const zoneId =
    typeof raw.matched_bim_zone_id === "string" && raw.matched_bim_zone_id.trim()
      ? raw.matched_bim_zone_id.trim()
      : "BIT-3-CORE";
  const zMeta = findBimZone(zoneId);
  const transcript = String(raw.transcript_vernacular || raw.transcript || "").trim();
  const summary = String(raw.engineering_summary || raw.summary || "").trim();
  if (!transcript && !summary) return null;

  const severityRaw = String(raw.severity || "MODERATE_NCR").toUpperCase();
  const severity: "CRITICAL_HOLD" | "MODERATE_NCR" | "ROUTINE_DPR" =
    severityRaw === "CRITICAL_HOLD" || severityRaw === "MODERATE_NCR" || severityRaw === "ROUTINE_DPR"
      ? severityRaw
      : "MODERATE_NCR";

  const escrowRaw = String(raw.escrow_action || "NO_CHANGE").toUpperCase();
  const escrow_action: "FREEZE_MILESTONE" | "NO_CHANGE" =
    escrowRaw === "FREEZE_MILESTONE" ? "FREEZE_MILESTONE" : "NO_CHANGE";

  const lien = escrow_action === "FREEZE_MILESTONE" ? Number(raw.withholding_amount_inr || zMeta.defaultLienInr) : 0;
  const isClause = String(raw.is_code_clause || "IS 456:2000 Cl. 17.4.3");
  const element = String(raw.structural_element || zMeta.structuralElement);
  const conf = Number.isFinite(Number(raw.confidence_score)) ? Number(raw.confidence_score) : 0.78;

  const gc = raw.governance_council && typeof raw.governance_council === "object" ? raw.governance_council : null;

  return {
    matched_bim_zone_id: zMeta.zoneId,
    structural_element: element,
    transcript_vernacular: transcript || summary,
    engineering_summary: summary || transcript,
    confidence_score: Math.max(0.1, Math.min(1, conf)),
    severity,
    is_code_clause: isClause,
    escrow_action,
    withholding_amount_inr: lien,
    governance_council: {
      structural_qa_agent: {
        verdict:
          gc?.structural_qa_agent?.verdict ||
          `Field inspection analyzed on ${element} (${isClause}).`,
        is_456_clause: gc?.structural_qa_agent?.is_456_clause || isClause,
        hold_status:
          gc?.structural_qa_agent?.hold_status ||
          (escrow_action === "FREEZE_MILESTONE" ? "HOLD_ENFORCED" : "ADVISORY_NCR"),
      },
      commercial_escrow_agent: {
        verdict:
          gc?.commercial_escrow_agent?.verdict ||
          (escrow_action === "FREEZE_MILESTONE"
            ? `Escrow hold of INR ${lien.toLocaleString("en-IN")} enforced pending verification.`
            : "No automatic escrow hold triggered."),
        withholding_lien_inr: lien,
        milestone_lock: escrow_action === "FREEZE_MILESTONE" ? "LOCKED" : "UNLOCKED",
      },
      section_65b_vault_agent: {
        verdict:
          gc?.section_65b_vault_agent?.verdict ||
          "Canonical SHA-256 record sealed under BSA 2023 Sec. 63 / BSA Sec 63.",
        attestation_scope:
          gc?.section_65b_vault_agent?.attestation_scope || `${projectId} / ${zMeta.zoneId} / ${submitterId}`,
      },
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing in environment configuration.", code: "MISSING_GEMINI_KEY" },
        { status: 500 }
      );
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
    const browserSttHint = String(formData.get("browser_stt_hint") || "").trim();
    const forceLowConfidence =
      String(formData.get("force_low_confidence") || formData.get("forceLowConfidence") || "") === "true";

    const requestedProjectId = String(
      formData.get("project_id") || formData.get("projectId") || VANGUARD_GENOME.projectId
    ).trim();
    const projectMeta = resolvePortfolioProject(requestedProjectId);

    const MAX_MEDIA_BYTES = 15 * 1024 * 1024;
    if ((audioFile && audioFile.size > MAX_MEDIA_BYTES) || (imageFile && imageFile.size > MAX_MEDIA_BYTES)) {
      return NextResponse.json(
        { error: "Media file exceeds 15 MB safety limit.", code: "PAYLOAD_TOO_LARGE" },
        { status: 413 }
      );
    }
    const hasAudio = Boolean(audioFile && audioFile.size > 0);
    const hasImage = Boolean(imageFile && imageFile.size > 0);
    const hasBinaryMedia = hasAudio || hasImage;

    if (!hasBinaryMedia && !transcriptOverride && !browserSttHint) {
      return NextResponse.json(
        { error: "Provide a site note, voice recording, or site photograph.", code: "EMPTY_PAYLOAD" },
        { status: 400 }
      );
    }

    const buffers: Buffer[] = [];
    const mediaParts: Array<{ inlineData: { data: string; mimeType: string } }> = [];
    const provenanceSources: string[] = [];

    if (hasAudio && audioFile) {
      const rawMime = (audioFile.type || "audio/webm").split(";")[0].trim().toLowerCase();
      const baseMime = ALLOWED_AUDIO_TYPES.has(rawMime) ? rawMime : "audio/webm";
      const geminiAudioMime =
        baseMime === "audio/mp3"
          ? "audio/mpeg"
          : baseMime === "audio/m4a" || baseMime === "audio/x-m4a"
          ? "audio/mp4"
          : baseMime;
      const audioBuf = Buffer.from(await audioFile.arrayBuffer());
      buffers.push(audioBuf);
      mediaParts.push({
        inlineData: { data: audioBuf.toString("base64"), mimeType: geminiAudioMime },
      });
      provenanceSources.push("Gemini Verified Audio");
    }

    if (hasImage && imageFile) {
      const baseMime = (imageFile.type || "image/jpeg").split(";")[0].trim().toLowerCase();
      if (!ALLOWED_IMAGE_TYPES.has(baseMime)) {
        return NextResponse.json(
          { error: `Unsupported image MIME type: ${imageFile.type}`, code: "INVALID_IMAGE_MIME" },
          { status: 400 }
        );
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
          .update(`TEXT:${requestedProjectId}:${submitterId}:${capturedAt}:${transcriptOverride || browserSttHint}`)
          .digest("hex");

    const primaryBuf = buffers[0] || null;
    const primaryMime = imageFile?.type || audioFile?.type || "text/plain";
    const primaryExt = imageFile ? "jpg" : audioFile ? "webm" : "txt";

    const supabase = getServerSupabase();

    let liveProjectContext = "";
    if (supabase) {
      try {
        const { data: liveGates } = await supabase
          .from("ncr_escrow_gates")
          .select("ncr_id, bim_zone_id, structural_element, concrete_grade, gate_status, withholding_lien_inr")
          .eq("project_id", projectMeta.projectId)
          .limit(5);
        if (liveGates && liveGates.length > 0) {
          liveProjectContext = `LIVE PROJECT ESCROW CONTEXT (Supabase /api/mcp): ${JSON.stringify(liveGates)}`;
        }
      } catch {}
    }

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
        const { data: existing } = await supabase
          .from("field_grounding_logs")
          .select("id, created_at, bim_zone_id")
          .eq("media_sha256", mediaSha256)
          .maybeSingle();

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

    const groundingDirectives = [
      `Analyze this construction field report captured at ${capturedAt} by ${submitterId} on ${projectMeta.name} (${projectMeta.projectId}).`,
      liveProjectContext,
      hasAudio
        ? `CRITICAL AUDIO TRANSCRIPTION RULE: Listen directly to the attached audio clip and transcribe EXACTLY what the speaker said in English, Hindi, or Hinglish using construction domain vocabulary (wall, right wall, chhat/roof/slab/ceiling, column, beam, transfer girder, rebar, honeycombing, shuttering, plaster, seepage, crack, darar, curing, concrete cube, M50). Put the exact heard speech in transcript_vernacular.`
        : "",
      transcriptOverride
        ? `Explicit typed engineer note: "${transcriptOverride}".`
        : browserSttHint && !hasAudio
        ? `Browser speech transcript (correct obvious construction homophones like "right ball" -> "right wall"): "${browserSttHint}".`
        : "",
      manualPinZoneId
        ? `The site engineer explicitly pinned BIM zone ${manualPinZoneId}.`
        : `ZONE & ELEMENT HONESTY RULE: NEVER default unrelated reports onto Transfer Girder TG-03.
- If the engineer mentions a roof, ceiling, slab, or "chhat", set structural_element to "Roof / Slab Ceiling Inspection (Chhat)" and pick BIT-5-WING, with confidence_score ~0.68 if exact floor/grid was not named.
- If the engineer mentions a wall, right wall, partition, masonry, plaster, or seepage, set structural_element to "Wall / Masonry Inspection" and pick BIT-3-CORE, with confidence_score ~0.68 if exact floor/grid was not named.
- Only assign Transfer Girder TG-03 (BIT-4-TG03) if the report actually discusses a girder, beam, transfer floor, or M50 cube failure.`,
      `Only set escrow_action to FREEZE_MILESTONE if a severe structural failure (e.g. M50 cube fail, girder honeycombing, major structural crack with zone confirmed) is clearly reported.`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const attempts: Array<{ model: string; useSchema: boolean }> = [
      { model: "gemini-3.5-flash-lite", useSchema: true },
      { model: "gemini-3.5-flash-lite", useSchema: false },
      { model: "gemini-3.8-flash", useSchema: false },
    ];

    for (const attempt of attempts) {
      try {
        const promptText = attempt.useSchema
          ? groundingDirectives
          : `${groundingDirectives}\n\nReturn ONLY valid JSON with keys: transcript_vernacular, engineering_summary, matched_bim_zone_id (one of BIT-4-TG03, BIT-1-ARCH, BIT-2-DOME, BIT-3-CORE, BIT-5-WING), structural_element, confidence_score (0.0-1.0), severity (CRITICAL_HOLD|MODERATE_NCR|ROUTINE_DPR), is_code_clause, escrow_action (FREEZE_MILESTONE|NO_CHANGE), withholding_amount_inr.`;

        const config: any = {
          systemInstruction: buildBimSystemInstruction(),
          responseMimeType: "application/json",
        };
        if (attempt.useSchema) {
          config.responseSchema = FIELD_GROUNDING_RESPONSE_SCHEMA;
        }

        const response = await withTimeout(
          ai.models.generateContent({
            model: attempt.model,
            contents: [{ role: "user", parts: [...mediaParts, { text: promptText }] }],
            config,
          }),
          GEMINI_TIMEOUT_MS
        );

        if (response.text) {
          const cleanedJson = response.text
            .trim()
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "");
          const rawObj = JSON.parse(cleanedJson);
          const normalized = normalizeGeminiPayload(rawObj, projectMeta.projectId, submitterId);
          if (normalized) {
            parsed = normalized;
            break;
          }
        }
      } catch (err: any) {
        console.warn(
          `[field-grounding] Attempt ${attempt.model} (schema=${attempt.useSchema}) failed:`,
          err?.message || err
        );
      }
    }

    if (!parsed) {
      const rawText = (transcriptOverride || browserSttHint || "").trim();
      const cleanedFallbackText = rawText.replace(/\bright ball\b/gi, "right wall");
      const hint = (cleanedFallbackText + " " + manualPinZoneId).toLowerCase();

      const mentionsRoof = /\b(chhat|chat|roof|ceiling|slab|terrace|soffit)\b/i.test(hint);
      const mentionsWall = /\b(wall|deewar|plaster|brick|masonry|partition|seepage|paint)\b/i.test(hint);
      const mentionsColumn = /\b(column|pillar|stambh)\b/i.test(hint);
      const mentionsGirder = /\b(girder|tg-03|beam|41\.2|honeycomb|m50)\b/i.test(hint);

      const inferredZone = hint.includes("dome") || hint.includes("bit-2")
        ? "BIT-2-DOME"
        : mentionsRoof
        ? "BIT-5-WING"
        : mentionsWall || mentionsColumn
        ? "BIT-3-CORE"
        : mentionsGirder
        ? "BIT-4-TG03"
        : "BIT-3-CORE";

      const zMeta = findBimZone(inferredZone);
      const hasDefect = cleanedFallbackText ? detectDefectSignal(cleanedFallbackText) : false;
      const isCritical = hasDefect && mentionsGirder;
      const lienAmt = isCritical ? zMeta.defaultLienInr : 0;

      const elementLabel = mentionsRoof
        ? `${projectMeta.name} — Roof / Slab Ceiling Inspection (Chhat)`
        : mentionsWall
        ? `${projectMeta.name} — Wall / Masonry Inspection`
        : mentionsColumn
        ? `${projectMeta.name} — RCC Column Inspection`
        : mentionsGirder
        ? zMeta.structuralElement
        : `${projectMeta.name} — Site Field Observation (Pin Zone Required)`;

      const isClause = mentionsRoof
        ? "IS 456:2000 Cl. 24 (Slabs & Roof Cracking)"
        : mentionsWall
        ? "IS 2212 / IS 1661 (Masonry & Plaster)"
        : "IS 456:2000 Cl. 17.4.3";

      parsed = {
        matched_bim_zone_id: zMeta.zoneId,
        structural_element: elementLabel,
        transcript_vernacular:
          cleanedFallbackText || "Site voice/photo clip sealed (pin exact floor/grid in 3D view).",
        engineering_summary: cleanedFallbackText
          ? `Observation logged for ${elementLabel}: "${cleanedFallbackText}". Exact floor/grid can be pinned in 3D Building.`
          : `Audio/photo evidence sealed on ${elementLabel}. Specify floor/grid or ask QUADMAX to escalate sensors.`,
        confidence_score: forceLowConfidence || !mentionsGirder ? 0.68 : 0.91,
        severity: isCritical ? "CRITICAL_HOLD" : hasDefect ? "MODERATE_NCR" : "ROUTINE_DPR",
        is_code_clause: isClause,
        escrow_action: isCritical ? "FREEZE_MILESTONE" : "NO_CHANGE",
        withholding_amount_inr: lienAmt,
        governance_council: {
          structural_qa_agent: {
            verdict: isCritical
              ? `Structural defect flagged on ${elementLabel} under ${isClause}.`
              : `Field report logged for ${elementLabel}; flagged for engineer verification.`,
            is_456_clause: isClause,
            hold_status: isCritical ? "HOLD_ENFORCED" : hasDefect ? "ADVISORY_NCR" : "CLEARED",
          },
          commercial_escrow_agent: {
            verdict: isCritical
              ? `INR ${lienAmt.toLocaleString("en-IN")} RA milestone escrow hold enforced pending core verification.`
              : "No automatic escrow hold triggered.",
            withholding_lien_inr: lienAmt,
            milestone_lock: isCritical ? "LOCKED" : "UNLOCKED",
          },
          section_65b_vault_agent: {
            verdict: "SHA-256 record digest sealed under BSA 2023 Sec. 63 / BSA Sec 63.",
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
      zoneMeta.linkedNcrId &&
      resolvedProjectId === VANGUARD_GENOME.projectId &&
      extraction.escrow_action === "FREEZE_MILESTONE"
        ? zoneMeta.linkedNcrId
        : `NCR-${projectMeta.code}-${Date.now().toString().slice(-4)}`;

    const withholdingInr =
      extraction.escrow_action === "FREEZE_MILESTONE"
        ? Math.max(extraction.withholding_amount_inr || 0, zoneMeta.defaultLienInr)
        : 0;

    const resolvedElement = extraction.structural_element || zoneMeta.structuralElement;

    const record: FieldGroundingRecord = {
      ...extraction,
      matched_bim_zone_id: zoneMeta.zoneId,
      bit_id: zoneMeta.bitId,
      zone_label: resolvedElement || zoneMeta.label,
      world_pos: zoneMeta.worldPos,
      structural_element: resolvedElement,
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
        await supabase.from("ncr_escrow_gates").upsert(
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
      }

      await supabase.from("section_65b_audit_ledger").insert({
        project_id: record.project_id,
        primary_governor: "QUADMAX-GEMINI-2.5",
        synthesis_report: `[${record.linked_ncr_id}] ${record.zone_label} - ${record.engineering_summary} (BSA Sec. 63 / BSA Sec 63)`,
        merkle_root_hash: record.canonical_65b_sha256,
        timestamp: ingestedAt,
        notarized_by: "HERMES-CORE-V2",
      });
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

export async function DELETE(req: NextRequest) {
  const secret = process.env.ADMIN_SEED_TOKEN;
  const authorized = secret
    ? req.headers.get("authorization") === `Bearer ${secret}`
    : req.headers.get("x-quadillar-reset") === "confirm";
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized cache clear" }, { status: 401 });
  }
  INGESTED_MEDIA_HASH_CACHE.clear();
  return NextResponse.json({ ok: true, cleared: true });
}
