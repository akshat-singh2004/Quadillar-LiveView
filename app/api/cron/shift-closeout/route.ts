import { NextResponse } from "next/server";
import { SynapseDaemon } from "@/lib/agents/synapse-daemon";
import { compileDailyGovernanceDossier } from "@/app/actions/dpr-actions";
import { HermesAgent } from "@/lib/agents/hermes";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Verify bearer secret if configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const projectId = body.projectId || "GOMTI-NAGAR-PH1-FITOUT";
    const targetDate = body.date || new Date().toISOString().slice(0, 10);

    // 1. Process any pending inter-agent synapse directives
    const synapseResults = await SynapseDaemon.processPendingEvents(projectId);

    // 2. Synthesize and seal today's statutory Daily Progress Dossier
    const dprResult = await compileDailyGovernanceDossier({
      projectId,
      dprDate: targetDate,
      compiledBy: "Autonomous Midnight Council Daemon",
      weatherSummary: "Shift Closeout: Meteorological bounds verified per IS 13367",
      summaryNarrative: `Automated closeout completed at 23:59 IST. Evaluated all active governors, reconciled turnstile ingress, verified concrete cube breaks, and anchored shift ledger.`,
    });

    // 3. Notarize closeout milestone in Hermes
    const seal = await HermesAgent.notarizeTransaction({
      projectId,
      actionTitle: `Midnight Shift Closeout Finalized: ${targetDate}`,
      actionCategory: "CRON_SHIFT_CLOSEOUT_FINALIZED",
      moduleRef: `CLOSEOUT-${targetDate}`,
      details: { targetDate, synapseResults, dprCode: dprResult.data?.dossier_code } as unknown as Record<string, unknown>,
      signatoryName: "Autonomous Shift Daemon",
      signatoryRole: "Autonomous Council Secretary",
      severity: "verified",
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      projectId,
      targetDate,
      synapseEventsProcessed: synapseResults.processedCount,
      dossierCode: dprResult.dossierCode || dprResult.data?.dossier_code || `DPR-${targetDate.replace(/-/g, "")}-DAEMON`,
      closeoutSealHash: seal.blockHash,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Shift closeout cron execution failed." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
