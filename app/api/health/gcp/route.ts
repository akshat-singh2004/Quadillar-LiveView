import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const isCloudRun = Boolean(process.env.K_SERVICE);
  const isVercel = Boolean(process.env.VERCEL);

  const hostingEnvironment = isCloudRun
    ? "google-cloud-run"
    : isVercel
    ? `vercel-${process.env.VERCEL_ENV || "production"}`
    : "local-node";

  return NextResponse.json({
    ok: true,
    platform: "Quadillar LiveView Construction OS",
    hostingEnvironment,
    cloudRunService: process.env.K_SERVICE || (isVercel ? "quadillar-live-view" : "local-preview"),
    cloudRunRevision:
      process.env.K_REVISION ||
      (process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 8) : "dev-local"),
    region: process.env.VERCEL_REGION || "asia-south1",
    gcsBucket: process.env.GCS_BUCKET_NAME || "local-hash-vault",
    geminiModel: "gemini-2.5-flash",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    mcpEndpoint: "/api/mcp",
    timestampIso: new Date().toISOString(),
  });
}
