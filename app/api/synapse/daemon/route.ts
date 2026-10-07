import { NextResponse } from "next/server";
import { SynapseDaemon } from "@/lib/agents/synapse-daemon";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const projectId = body.projectId || "GOMTI-NAGAR-PH1-FITOUT";

    const result = await SynapseDaemon.processPendingEvents(projectId);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      projectId,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to process synapse events." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") || "GOMTI-NAGAR-PH1-FITOUT";

  const result = await SynapseDaemon.processPendingEvents(projectId);
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    projectId,
    ...result,
  });
}
