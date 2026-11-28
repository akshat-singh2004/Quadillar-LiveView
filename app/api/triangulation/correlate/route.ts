import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonOk, readJsonBody } from "@/lib/server/http";
import {
  VANGUARD_CLEAN_POUR_FIXTURE,
  VANGUARD_FRAUD_FIXTURE,
  evaluateFiveWayTriangulation,
  type TriangulationInput,
} from "@/lib/domain/triangulationEngine";
import { appendGovernorEvent } from "@/lib/repositories/eventLedgerRepo";
import { recordAndEvaluateSalamiDrift } from "@/lib/domain/salamiDriftDetector";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const preset = req.nextUrl.searchParams.get("preset") === "clean" ? "clean" : "fraud";
  const fixture = preset === "clean" ? VANGUARD_CLEAN_POUR_FIXTURE : VANGUARD_FRAUD_FIXTURE;
  const report = evaluateFiveWayTriangulation(fixture);

  return jsonOk(
    {
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

  const rawObj = body as Record<string, unknown>;
  const hasFlatTelemetry =
    !body.input &&
    (rawObj.billedVolumeCum !== undefined ||
      rawObj.batchingPlantVolumeCum !== undefined ||
      rawObj.bimDesignVolumeCum !== undefined ||
      rawObj.cementBatchedKgPerCum !== undefined ||
      rawObj.billedVolumeM3 !== undefined ||
      rawObj.batchPlantVolumeM3 !== undefined ||
      rawObj.projectId !== undefined);

  const rawInput: Record<string, unknown> = body.input
    ? { ...(body.input as Record<string, unknown>) }
    : hasFlatTelemetry
      ? Object.fromEntries(
          Object.entries(rawObj).filter(
            ([k]) => !["preset", "recordToLedger", "actor", "__proto__", "constructor", "prototype"].includes(k)
          )
        )
      : {};

  const normalizedInput: Record<string, unknown> = { ...rawInput };
  if (rawInput.billedVolumeCum !== undefined && normalizedInput.billedVolumeM3 === undefined) {
    normalizedInput.billedVolumeM3 = rawInput.billedVolumeCum;
  }
  if (rawInput.batchingPlantVolumeCum !== undefined && normalizedInput.batchPlantVolumeM3 === undefined) {
    normalizedInput.batchPlantVolumeM3 = rawInput.batchingPlantVolumeCum;
  }
  if (rawInput.bimDesignVolumeCum !== undefined && normalizedInput.bimPlannedVolumeM3 === undefined) {
    normalizedInput.bimPlannedVolumeM3 = rawInput.bimDesignVolumeCum;
  }
  if (rawInput.cementBatchedKgPerCum !== undefined && normalizedInput.cementKgPerM3 === undefined) {
    normalizedInput.cementKgPerM3 = rawInput.cementBatchedKgPerCum;
  }

  const base =
    body.preset === "clean" || (hasFlatTelemetry && !body.preset)
      ? VANGUARD_CLEAN_POUR_FIXTURE
      : VANGUARD_FRAUD_FIXTURE;
  const merged: TriangulationInput = {
    ...base,
    ...(normalizedInput as Partial<TriangulationInput>),
  };

  const report = evaluateFiveWayTriangulation(merged);
  const salamiDrift = recordAndEvaluateSalamiDrift({
    projectId: String((rawInput.projectId as string) || merged.projectId || "VANGUARD-LKO-01"),
    zoneId: typeof rawInput.zoneId === "string" ? rawInput.zoneId : undefined,
    billedVolumeCum:
      rawInput.billedVolumeCum ??
      (merged as unknown as Record<string, unknown>).billedVolumeCum ??
      (merged as unknown as Record<string, unknown>).billedVolumeM3 ??
      (merged as unknown as Record<string, unknown>).raBillVolumeCum,
    batchingPlantVolumeCum:
      rawInput.batchingPlantVolumeCum ??
      (merged as unknown as Record<string, unknown>).batchingPlantVolumeCum ??
      (merged as unknown as Record<string, unknown>).batchPlantVolumeM3 ??
      (merged as unknown as Record<string, unknown>).batchingVolumeCum,
    cementBatchedKgPerCum:
      rawInput.cementBatchedKgPerCum ??
      (merged as unknown as Record<string, unknown>).cementBatchedKgPerCum ??
      (merged as unknown as Record<string, unknown>).cementKgPerM3 ??
      (merged as unknown as Record<string, unknown>).cementPerCumKg,
  });

  const combinedFlags = Array.from(
    new Set([...report.discrepancies.map((d) => d.code), ...salamiDrift.flags])
  );
  const effectiveReport = salamiDrift.triggered
    ? {
        ...report,
        httpStatus: 422 as const,
        recommendedEscrowHoldInr: Math.max(
          report.recommendedEscrowHoldInr,
          salamiDrift.recommendedAdditionalHoldInr
        ),
      }
    : report;
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

  return NextResponse.json(
    {
      ok: true,
      flags: combinedFlags,
      salamiDrift,
      input: merged,
      report: effectiveReport,
      ledgerReceipt,
    },
    { status: salamiDrift.triggered ? 422 : 200 }
  );
}
