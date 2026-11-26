import { NextRequest } from "next/server";
import { jsonError, jsonOk, readJsonBody } from "@/lib/server/http";
import { getGovernorState, saveGovernorState, type GovernorMode } from "@/lib/repositories/governorRepo";
import type { MolecularInput } from "@/lib/engines/molecularGovernor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId") || undefined;
  const record = await getGovernorState(projectId);
  return jsonOk({ ...record });
}

export async function POST(req: NextRequest) {
  const body = await readJsonBody<{
    projectId?: string;
    mode?: GovernorMode;
    revision?: number;
    input?: Partial<MolecularInput>;
  }>(req);

  if (!body) return jsonError("Invalid JSON body", 400);

  const saved = await saveGovernorState(body);
  return jsonOk(
    { ok: true, ...saved },
    200,
    { "X-BSA-Sec63-Hash": saved.snapshot.bsaSec63Ledger.rowHash }
  );
}
