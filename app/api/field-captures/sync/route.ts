import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface SyncPayload {
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

const g = globalThis as typeof globalThis & {
  __quadillarCaptureLedger?: Map<string, SyncPayload & { receivedAtUtc: string }>;
};
const ledger = (g.__quadillarCaptureLedger ??= new Map());

function getSupabaseAdminOrAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const supabase = getSupabaseAdminOrAnon();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("field_evidence_packets")
        .select("id, project_id, zone_id, bim_global_id, sha256, recorded_at_utc, qr_payload, note_text, bandwidth_profile, media_uploaded")
        .order("recorded_at_utc", { ascending: false })
        .limit(30);
      if (!error && data) {
        return NextResponse.json({ storageMode: "supabase", count: data.length, packets: data });
      }
    } catch {
      // Fall through to in-memory pilot ledger
    }
  }
  const items = Array.from(ledger.values()).slice(-30).reverse();
  return NextResponse.json({ storageMode: "edge_ledger_fallback", count: items.length, packets: items });
}

export async function POST(req: NextRequest) {
  let body: SyncPayload;
  try {
    body = (await req.json()) as SyncPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!body.id || !body.zoneId || !body.bimGlobalId || !body.sha256 || !/^[a-f0-9]{64}$/i.test(body.sha256)) {
    return NextResponse.json(
      { error: "Missing required fields or invalid 64-char SHA-256 hash" },
      { status: 400 }
    );
  }

  const normalizedHash = body.sha256.toLowerCase();

  // Fast deterministic in-process duplicate guard
  if (ledger.has(normalizedHash)) {
    return NextResponse.json(
      {
        error: "HTTP 409 DUPLICATE_EVIDENCE_HASH",
        detail: `SHA-256 ${normalizedHash.slice(0, 16)} already exists in BSA Sec 63 vault.`,
        sha256: normalizedHash,
      },
      { status: 409, headers: { "X-BSA-Sec63-Hash": normalizedHash } }
    );
  }

  // Attempt persistent Supabase write first
  const supabase = getSupabaseAdminOrAnon();
  if (supabase) {
    try {
      const { error } = await supabase.from("field_evidence_packets").insert({
        id: body.id,
        project_id: body.projectId || "VANGUARD-LKO-01",
        zone_id: body.zoneId,
        bim_global_id: body.bimGlobalId,
        sha256: normalizedHash,
        recorded_at_utc: body.recordedAtUtc || new Date().toISOString(),
        qr_payload: body.qrPayload ?? null,
        note_text: body.noteText || "Field evidence capture",
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
        media_uploaded: Boolean(body.thumbDataUrl),
        thumb_data_url: body.thumbDataUrl ?? null,
      });

      if (!error) {
        ledger.set(normalizedHash, { ...body, sha256: normalizedHash, receivedAtUtc: new Date().toISOString() });
        return NextResponse.json(
          {
            ok: true,
            id: body.id,
            sha256: normalizedHash,
            mediaUploaded: Boolean(body.thumbDataUrl),
            storageMode: "supabase",
          },
          { status: 201, headers: { "X-BSA-Sec63-Hash": normalizedHash } }
        );
      }

      // Postgres unique constraint violation (23505) => hard HTTP 409
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error: "HTTP 409 DUPLICATE_EVIDENCE_HASH",
            detail: `SHA-256 ${normalizedHash.slice(0, 16)} already exists in Supabase ledger.`,
            sha256: normalizedHash,
          },
          { status: 409, headers: { "X-BSA-Sec63-Hash": normalizedHash } }
        );
      }
      // If table not yet migrated, fall through gracefully to edge ledger fallback
    } catch {
      // Network/Supabase unavailable -> fall through gracefully
    }
  }

  ledger.set(normalizedHash, { ...body, sha256: normalizedHash, receivedAtUtc: new Date().toISOString() });
  return NextResponse.json(
    {
      ok: true,
      id: body.id,
      sha256: normalizedHash,
      mediaUploaded: Boolean(body.thumbDataUrl),
      storageMode: "edge_ledger_fallback",
    },
    { status: 201, headers: { "X-BSA-Sec63-Hash": normalizedHash } }
  );
}
