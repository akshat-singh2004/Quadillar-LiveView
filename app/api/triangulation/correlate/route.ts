import { NextRequest } from "next/server";
import { jsonError, jsonOk, readJsonBody } from "@/lib/server/http";
import {
  VANGUARD_CLEAN_POUR_FIXTURE,
  VANGUARD_FRAUD_FIXTURE,
  evaluateFiveWayTriangulation,
  type TriangulationInput,
} from "@/lib/domain/triangulationEngine";
import { appendGovernorEvent } from "@/lib/repositories/eventLedgerRepo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const preset = req.nextUrl.searchParams.get("preset") === "clean" ? "clean" : "fraud";
  const fixture = preset === "clean" ? VANGUARD_CLEAN_POUR_FIXTURE : VANGUARD_FRAUD_FIXTURE;
  const report = evaluateFiveWayTriangulation(fixture);

  return jsonOk({
    ok: true,
    preset,
    input: fixture,
    report,
  });
}

export async function POST(req: NextRequest) {
  const body = await readJsonBody<{
    input?: Partial<TriangulationInput>;
    preset?: "fraud" | "clean";
    recordToLedger?: boolean;
    actor?: string;
  }>(req);

  if (!body) return jsonError("Invalid JSON body", 400);

  const base = body.preset === "clean" ? VANGUARD_CLEAN_POUR_FIXTURE : VANGUARD_FRAUD_FIXTURE;
  const merged: TriangulationInput = {
    ...base,
    ...(body.input || {}),
  };

  const report = evaluateFiveWayTriangulation(merged);
  let ledgerReceipt: { seq: number; chainHash: string; storageMode: string } | null = null;

  if (body.recordToLedger) {
    const appended = await appendGovernorEvent({
      projectId: merged.projectId,
      eventType: "TRIANGULATION_ALERT",
      actor: body.actor || "triangulation-correlator",
      source: "/api/triangulation/correlate",
      mode: report.verdict,
      httpStatus: report.httpStatus,
      frozenInr: report.recommendedEscrowHoldInr,
      netReleaseInr: 0,
      violationCount: report.discrepancies.length,
      diffJson: {
        challanNo: merged.challanNo,
        zoneId: merged.zoneId,
        trustScorePct: report.trustScorePct,
        discrepancyCodes: report.discrepancies.map((d) => d.code),
        clause42PenaltyInr: report.recommendedClause42PenaltyInr,
      },
      snapshotHash: `TRIANGULATION:${merged.challanNo}:${report.verdict}`,
    });
    ledgerReceipt = {
      seq: appended.event.seq,
      chainHash: appended.event.chainHash,
      storageMode: appended.storageMode,
    };
  }

  return jsonOk(
    {
      ok: true,
      report,
      ledgerReceipt,
    },
    200
  );
}
