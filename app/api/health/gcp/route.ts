import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    platform: "Quadillar LiveView Construction OS",
    cloudRunService: process.env.K_SERVICE || "local-preview",
    cloudRunRevision: process.env.K_REVISION || "dev-local",
    region: "asia-south1",
    gcsBucket: process.env.GCS_BUCKET_NAME || "local-hash-vault",
    geminiModel: "gemini-2.5-flash",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    timestampIso: new Date().toISOString(),
  });
}
