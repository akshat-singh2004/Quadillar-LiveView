import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/server/http";
import {
  buildRateLimitHeaders,
  checkRateLimit,
  extractClientIp,
  rateLimitExceededResponse,
} from "@/lib/server/securityGuard";
import { getGovernorState } from "@/lib/repositories/governorRepo";
import { listGovernorEvents } from "@/lib/repositories/eventLedgerRepo";
import {
  listFieldEvidencePackets,
  sanitizeProjectSlug,
} from "@/lib/repositories/fieldEvidenceRepo";
import {
  hydratePortfolioGovernorState,
  resolvePortfolioProject,
} from "@/lib/domain/portfolioRegistry";
import { assembleForensicDossier } from "@/lib/domain/forensicDossier";

export const dynamic = "force-dynamic";

const DOSSIER_RATE_POLICY = {
  bucket: "forensic_dossier_export",
  limit: 30,
  windowSec: 60,
};

export async function GET(req: NextRequest) {
  const rl = await checkRateLimit(extractClientIp(req), DOSSIER_RATE_POLICY);
  if (!rl.allowed) return rateLimitExceededResponse(rl);
  const rlHeaders = buildRateLimitHeaders(rl);

  const requestedProjectId = req.nextUrl.searchParams.get("projectId");
  const downloadFlag = req.nextUrl.searchParams.get("download");
  const simulateTamper = req.nextUrl.searchParams.get("simulateTamper") === "1";

  if (requestedProjectId !== null && requestedProjectId.trim() !== "") {
    if (!/^[A-Za-z0-9_-]{2,64}$/.test(requestedProjectId.trim())) {
      return jsonError("Invalid projectId format", 400, {
        code: "INVALID_PROJECT_ID",
        expectedPattern: "^[A-Za-z0-9_-]{2,64}$",
      });
    }
  }

  const project = resolvePortfolioProject(requestedProjectId);

  const [rawState, ledgerData, evidenceData] = await Promise.all([
    getGovernorState(project.projectId),
    listGovernorEvents(project.projectId, 2000),
    listFieldEvidencePackets(100),
  ]);

  const hydrated = hydratePortfolioGovernorState(project.projectId, rawState);
  const workingEvents = ledgerData.events.map((ev) => ({
    ...ev,
    diffJson: { ...ev.diffJson },
  }));

  if (simulateTamper && workingEvents.length > 0) {
    const idx = workingEvents.length - 1;
    workingEvents[idx].frozenInr = Number(workingEvents[idx].frozenInr) + 1;
  }

  const dossier = assembleForensicDossier({
    project: hydrated.project,
    input: hydrated.input,
    snapshot: hydrated.snapshot,
    mode: hydrated.mode,
    storageMode: ledgerData.storageMode,
    events: workingEvents,
    rawEvidencePackets: evidenceData.packets,
  });

  const responseHeaders: Record<string, string> = {
    ...rlHeaders,
    "X-BSA-Dossier-Hash": dossier.manifest.dossierHash,
    "X-BSA-Chain-Status": dossier.manifest.integrityStatus,
    "Cache-Control": "no-store",
  };

  if (downloadFlag === "1" || downloadFlag === "true") {
    const slug = sanitizeProjectSlug(dossier.project.projectId).toLowerCase();
    const dateStamp = dossier.generatedAtUtc.slice(0, 10);
    const filename = `quadillar-bsa63-dossier-${slug}-${dateStamp}.json`;
    return new Response(JSON.stringify(dossier, null, 2), {
      status: 200,
      headers: {
        ...responseHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return jsonOk(
    {
      ok: true,
      simulatedTamperDemo: simulateTamper,
      dossier,
    },
    200,
    responseHeaders
  );
}
