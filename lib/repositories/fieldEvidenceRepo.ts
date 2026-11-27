import { getSupabaseAdmin, type StorageMode } from "@/lib/server/supabaseAdmin";

export const DEFAULT_EVIDENCE_BUCKET =
  process.env.SUPABASE_EVIDENCE_BUCKET?.trim() || "field-evidence";
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB decoded binary cap
export const MAX_INLINE_IMAGE_CHARS = 512 * 1024; // 512 KB cap for DB inline fallback
export const MAX_MEM_EVIDENCE_ENTRIES = 500;

export interface FieldEvidenceSyncPayload {
  id: string;
  projectId?: string;
  recordedAtUtc: string;
  zoneId: string;
  bimGlobalId: string;
  qrPayload?: string | null;
  noteText: string;
  voiceDurationSec?: number;
  sha256: string;
  lat?: number | null;
  lon?: number | null;
  gpsAccuracyM?: number | null;
  yawDeg?: number | null;
  pitchDeg?: number | null;
  rollDeg?: number | null;
  plumbDeviationDeg?: number | null;
  plumbPass?: boolean | null;
  weatherWindMs?: number | null;
  surfacePressureHpa?: number | null;
  bandwidthProfile?: string;
  mediaUploaded?: boolean;
  thumbDataUrl?: string | null;
}

export interface ParsedImageDataUrl {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
  buffer: Buffer;
  byteLength: number;
  rawChars: number;
}

export type MediaStorageMode = "supabase_storage" | "inline_fallback" | "none";

export interface StoredEvidenceResult {
  ok: boolean;
  duplicate?: boolean;
  id: string;
  projectId?: string;
  sha256: string;
  mediaUploaded: boolean;
  mediaStorageMode: MediaStorageMode;
  mediaUrl: string | null;
  storageObjectPath: string | null;
  mediaBytes: number;
  savedPostgresBytes: number;
  storageMode: StorageMode | "edge_ledger_fallback";
  detail?: string;
}

const g = globalThis as typeof globalThis & {
  __quadillarCaptureLedger?: Map<
    string,
    FieldEvidenceSyncPayload & {
      receivedAtUtc: string;
      mediaUrl?: string | null;
      storageObjectPath?: string | null;
      mediaStorageMode?: MediaStorageMode;
    }
  >;
};
const memLedger = (g.__quadillarCaptureLedger ??= new Map());

function setBoundedMemLedger(
  key: string,
  val: FieldEvidenceSyncPayload & {
    receivedAtUtc: string;
    mediaUrl?: string | null;
    storageObjectPath?: string | null;
    mediaStorageMode?: MediaStorageMode;
  }
) {
  if (memLedger.size >= MAX_MEM_EVIDENCE_ENTRIES && !memLedger.has(key)) {
    const oldestKey = memLedger.keys().next().value;
    if (oldestKey) memLedger.delete(oldestKey);
  }
  memLedger.set(key, val);
}

export function sanitizeProjectSlug(projectId?: string): string {
  const cleaned = (projectId || "VANGUARD-LKO-01")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return cleaned || "VANGUARD-LKO-01";
}

export function buildEvidenceObjectPath(
  projectId: string | undefined,
  sha256: string,
  ext: "jpg" | "png" | "webp"
): string {
  return `${sanitizeProjectSlug(projectId)}/${sha256.toLowerCase()}.${ext}`;
}

export function hasValidImageMagicBytes(
  mimeType: ParsedImageDataUrl["mimeType"],
  buffer: Buffer
): boolean {
  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mimeType === "image/jpeg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }
  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

export function parseImageDataUrl(
  dataUrl: string | null | undefined,
  maxBytes = MAX_IMAGE_BYTES
): { ok: true; image: ParsedImageDataUrl } | { ok: false; error: string } {
  if (!dataUrl || typeof dataUrl !== "string") {
    return { ok: false, error: "Empty image data URL" };
  }

  const trimmed = dataUrl.trim();
  const maxRawChars = Math.ceil((maxBytes * 4) / 3) + 128;
  if (trimmed.length > maxRawChars) {
    return {
      ok: false,
      error: `Image exceeds max ${Math.round(maxBytes / (1024 * 1024))} MB binary limit`,
    };
  }

  const match = trimmed.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!match) {
    return {
      ok: false,
      error: "Unsupported data URL format (allowed: image/jpeg, image/png, image/webp)",
    };
  }

  const rawMime = match[1].toLowerCase();
  const mimeType: ParsedImageDataUrl["mimeType"] =
    rawMime === "image/jpg" ? "image/jpeg" : (rawMime as ParsedImageDataUrl["mimeType"]);
  const ext: ParsedImageDataUrl["ext"] =
    mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";

  const base64Body = match[2].replace(/\s+/g, "");
  const estimatedBytes = Math.floor((base64Body.length * 3) / 4);
  if (estimatedBytes > maxBytes) {
    return {
      ok: false,
      error: `Image exceeds max ${Math.round(maxBytes / (1024 * 1024))} MB binary limit`,
    };
  }

  const buffer = Buffer.from(base64Body, "base64");
  if (buffer.length === 0) {
    return { ok: false, error: "Decoded image buffer is empty" };
  }
  if (buffer.length > maxBytes) {
    return {
      ok: false,
      error: `Image exceeds max ${Math.round(maxBytes / (1024 * 1024))} MB binary limit`,
    };
  }

  if (!hasValidImageMagicBytes(mimeType, buffer)) {
    return {
      ok: false,
      error: `Binary magic-byte mismatch: decoded payload is not a valid ${mimeType} image`,
    };
  }

  return {
    ok: true,
    image: {
      mimeType,
      ext,
      buffer,
      byteLength: buffer.length,
      rawChars: trimmed.length,
    },
  };
}

export async function listFieldEvidencePackets(limit = 30): Promise<{
  storageMode: "supabase" | "edge_ledger_fallback";
  count: number;
  packets: unknown[];
}> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("field_evidence_packets")
        .select(
          "id, project_id, zone_id, bim_global_id, sha256, recorded_at_utc, qr_payload, note_text, bandwidth_profile, media_uploaded, thumb_data_url"
        )
        .order("recorded_at_utc", { ascending: false })
        .limit(limit);

      if (!error && data) {
        const sanitized = data.map((row) => {
          const thumb = typeof row.thumb_data_url === "string" ? row.thumb_data_url : null;
          const isRemoteUrl = Boolean(thumb && /^https?:\/\//i.test(thumb));
          return {
            id: row.id,
            project_id: row.project_id,
            zone_id: row.zone_id,
            bim_global_id: row.bim_global_id,
            sha256: row.sha256,
            recorded_at_utc: row.recorded_at_utc,
            qr_payload: row.qr_payload,
            note_text: row.note_text,
            bandwidth_profile: row.bandwidth_profile,
            media_uploaded: row.media_uploaded,
            media_url: isRemoteUrl ? thumb : null,
            media_storage_mode: isRemoteUrl
              ? "supabase_storage"
              : row.media_uploaded
              ? "inline_fallback"
              : "none",
          };
        });
        return { storageMode: "supabase", count: sanitized.length, packets: sanitized };
      }
    } catch {
      // Fall through to in-memory ledger
    }
  }

  const items = Array.from(memLedger.values()).slice(-limit).reverse();
  return { storageMode: "edge_ledger_fallback", count: items.length, packets: items };
}

export async function ingestFieldEvidencePacket(
  body: FieldEvidenceSyncPayload
): Promise<StoredEvidenceResult> {
  const normalizedHash = (body.sha256 || "").trim().toLowerCase();
  const projectId = sanitizeProjectSlug(body.projectId);

  if (memLedger.has(normalizedHash)) {
    return {
      ok: false,
      duplicate: true,
      id: body.id,
      projectId,
      sha256: normalizedHash,
      mediaUploaded: false,
      mediaStorageMode: "none",
      mediaUrl: null,
      storageObjectPath: null,
      mediaBytes: 0,
      savedPostgresBytes: 0,
      storageMode: "edge_ledger_fallback",
      detail: `SHA-256 ${normalizedHash.slice(0, 16)} already exists in BSA Sec 63 vault.`,
    };
  }

  const supabase = getSupabaseAdmin();

  let mediaStorageMode: MediaStorageMode = "none";
  let mediaUrl: string | null = null;
  let storageObjectPath: string | null = null;
  let mediaBytes = 0;
  let savedPostgresBytes = 0;
  let storedThumbValue: string | null = null;

  if (body.thumbDataUrl) {
    const trimmedMedia = body.thumbDataUrl.trim();
    if (/^https?:\/\/\S+$/i.test(trimmedMedia) && trimmedMedia.length <= 2048) {
      mediaStorageMode = "supabase_storage";
      mediaUrl = trimmedMedia;
      storedThumbValue = mediaUrl;
    } else {
      const parsed = parseImageDataUrl(trimmedMedia);
      if (!parsed.ok) {
        // Hard fail-closed rejection: never write spoofed or oversized junk to Postgres
        return {
          ok: false,
          id: body.id,
          projectId,
          sha256: normalizedHash,
          mediaUploaded: false,
          mediaStorageMode: "none",
          mediaUrl: null,
          storageObjectPath: null,
          mediaBytes: 0,
          savedPostgresBytes: 0,
          storageMode: supabase ? "supabase" : "edge_ledger_fallback",
          detail: `QUARANTINED_MEDIA: ${parsed.error}`,
        };
      }

      mediaBytes = parsed.image.byteLength;
      const candidatePath = buildEvidenceObjectPath(projectId, normalizedHash, parsed.image.ext);

      if (supabase) {
        try {
          const { error: uploadErr } = await supabase.storage
            .from(DEFAULT_EVIDENCE_BUCKET)
            .upload(candidatePath, parsed.image.buffer, {
              contentType: parsed.image.mimeType,
              upsert: false,
              cacheControl: "31536000",
            });

          const alreadyExists =
            uploadErr && /already exists|duplicate|409/i.test(uploadErr.message || "");

          if (!uploadErr || alreadyExists) {
            const { data: pub } = supabase.storage
              .from(DEFAULT_EVIDENCE_BUCKET)
              .getPublicUrl(candidatePath);
            if (pub?.publicUrl) {
              mediaStorageMode = "supabase_storage";
              mediaUrl = pub.publicUrl;
              storageObjectPath = candidatePath;
              storedThumbValue = pub.publicUrl;
              savedPostgresBytes = Math.max(0, parsed.image.rawChars - pub.publicUrl.length);
            }
          }
        } catch {
          // Fall through to bounded inline fallback for valid images only
        }
      }

      if (mediaStorageMode === "none") {
        if (parsed.image.rawChars > MAX_INLINE_IMAGE_CHARS) {
          return {
            ok: false,
            id: body.id,
            projectId,
            sha256: normalizedHash,
            mediaUploaded: false,
            mediaStorageMode: "none",
            mediaUrl: null,
            storageObjectPath: null,
            mediaBytes,
            savedPostgresBytes: 0,
            storageMode: "edge_ledger_fallback",
            detail: `QUARANTINED_MEDIA: Storage unavailable and image exceeds ${Math.round(
              MAX_INLINE_IMAGE_CHARS / 1024
            )} KB inline fallback cap.`,
          };
        }
        mediaStorageMode = "inline_fallback";
        storedThumbValue = trimmedMedia;
      }
    }
  }

  const safeNote = (body.noteText || "Field evidence capture").slice(0, 4000);
  const coreRow = {
    id: body.id,
    project_id: projectId,
    zone_id: body.zoneId,
    bim_global_id: body.bimGlobalId,
    sha256: normalizedHash,
    recorded_at_utc: body.recordedAtUtc || new Date().toISOString(),
    qr_payload: body.qrPayload ?? null,
    note_text: safeNote,
    voice_duration_sec: body.voiceDurationSec ?? 0,
    lat: body.lat ?? null,
    lon: body.lon ?? null,
    gps_accuracy_m: body.gpsAccuracyM ?? null,
    yaw_deg: body.yawDeg ?? null,
    pitch_deg: body.pitchDeg ?? null,
    roll_deg: body.rollDeg ?? null,
    plumb_deviation_deg: body.plumbDeviationDeg ?? null,
    plumb_pass: body.plumbPass ?? null,
    weather_wind_ms: body.weatherWindMs ?? null,
    surface_pressure_hpa: body.surfacePressureHpa ?? null,
    bandwidth_profile: body.bandwidthProfile || "standard",
    media_uploaded: Boolean(storedThumbValue),
    thumb_data_url: storedThumbValue,
  };

  if (supabase) {
    try {
      const richRow = {
        ...coreRow,
        storage_bucket: storageObjectPath ? DEFAULT_EVIDENCE_BUCKET : null,
        storage_object_path: storageObjectPath,
        media_bytes: mediaBytes || null,
      };

      let insertErr = (await supabase.from("field_evidence_packets").insert(richRow)).error;

      if (
        insertErr &&
        (insertErr.code === "PGRST204" ||
          insertErr.code === "42703" ||
          /column .* does not exist|schema cache/i.test(insertErr.message || ""))
      ) {
        insertErr = (await supabase.from("field_evidence_packets").insert(coreRow)).error;
      }

      if (!insertErr) {
        setBoundedMemLedger(normalizedHash, {
          ...body,
          projectId,
          noteText: safeNote,
          sha256: normalizedHash,
          thumbDataUrl: storedThumbValue,
          mediaUrl,
          storageObjectPath,
          mediaStorageMode,
          receivedAtUtc: new Date().toISOString(),
        });

        return {
          ok: true,
          id: body.id,
          projectId,
          sha256: normalizedHash,
          mediaUploaded: Boolean(storedThumbValue),
          mediaStorageMode,
          mediaUrl,
          storageObjectPath,
          mediaBytes,
          savedPostgresBytes,
          storageMode: "supabase",
        };
      }

      if (insertErr.code === "23505") {
        return {
          ok: false,
          duplicate: true,
          id: body.id,
          projectId,
          sha256: normalizedHash,
          mediaUploaded: false,
          mediaStorageMode: "none",
          mediaUrl: null,
          storageObjectPath: null,
          mediaBytes: 0,
          savedPostgresBytes: 0,
          storageMode: "supabase",
          detail: `SHA-256 ${normalizedHash.slice(0, 16)} already exists in Supabase ledger.`,
        };
      }
    } catch {
      // Fall through cleanly to edge_ledger_fallback
    }
  }

  setBoundedMemLedger(normalizedHash, {
    ...body,
    projectId,
    noteText: safeNote,
    sha256: normalizedHash,
    thumbDataUrl: storedThumbValue,
    mediaUrl,
    storageObjectPath,
    mediaStorageMode,
    receivedAtUtc: new Date().toISOString(),
  });

  return {
    ok: true,
    id: body.id,
    projectId,
    sha256: normalizedHash,
    mediaUploaded: Boolean(storedThumbValue),
    mediaStorageMode,
    mediaUrl,
    storageObjectPath,
    mediaBytes,
    savedPostgresBytes,
    storageMode: "edge_ledger_fallback",
  };
}
