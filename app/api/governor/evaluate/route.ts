import { NextRequest, NextResponse } from "next/server";
import {
  COMPLIANT_TG03_FIXTURE,
  EXTREME_TG03_FIXTURE,
  evaluateMolecularGovernor,
  type MolecularInput,
} from "@/lib/engines/molecularGovernor";
import { evaluateWindLatch } from "@/lib/server/windLatchStore";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode") || "stress-test";
  const enforce = req.nextUrl.searchParams.get("enforceHttp422") === "true";

  const payload = mode === "compliant" ? COMPLIANT_TG03_FIXTURE : EXTREME_TG03_FIXTURE;
  const snapshot = evaluateMolecularGovernor(payload);

  return NextResponse.json(
    { mode, input: payload, snapshot },
    {
      status: enforce ? snapshot.escrow.httpStatus : 200,
      headers: {
        "X-Governor-Decision": snapshot.escrow.decision,
        "X-BSA-Sec63-Hash": snapshot.bsaSec63Ledger.rowHash,
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<MolecularInput> & { enforceHttp422?: boolean; clearSafetyLatch?: boolean };
    const { enforceHttp422 = true, clearSafetyLatch = false, ...overrides } = body;
    const rawAny = overrides as Record<string, unknown>;
    const projectKey = String(rawAny.projectId || EXTREME_TG03_FIXTURE.projectId || "VANGUARD-LKO-01");
    const incomingWind =
      typeof rawAny.windSpeedMs === "number"
        ? rawAny.windSpeedMs
        : typeof rawAny.windVelocityMs === "number"
          ? rawAny.windVelocityMs
          : undefined;
    const { effectiveWindMs, latch: safetyLatch } = evaluateWindLatch(
      projectKey,
      incomingWind,
      Boolean(clearSafetyLatch)
    );
    if (effectiveWindMs !== undefined) {
      if ("windVelocityMs" in EXTREME_TG03_FIXTURE) rawAny.windVelocityMs = effectiveWindMs;
      if ("windSpeedMs" in EXTREME_TG03_FIXTURE || incomingWind !== undefined) rawAny.windSpeedMs = effectiveWindMs;
    }

    const merged: MolecularInput = {
      ...EXTREME_TG03_FIXTURE,
      ...overrides,
      recordedAtUtc: overrides.recordedAtUtc || new Date().toISOString(),
    };

    const snapshot = evaluateMolecularGovernor(merged);

    return NextResponse.json(
      { input: merged, snapshot },
      {
        status: enforceHttp422 ? snapshot.escrow.httpStatus : 200,
        headers: {
          "X-Governor-Decision": snapshot.escrow.decision,
          "X-BSA-Sec63-Hash": snapshot.bsaSec63Ledger.rowHash,
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid molecular governor payload", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }
}
