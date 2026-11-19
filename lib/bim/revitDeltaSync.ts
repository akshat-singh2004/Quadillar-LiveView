import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

export interface RevitAsBuiltDeltaPacket {
  schemaVersion: "QUADILLAR-REVIT-IFC-SYNC-2.1";
  projectId: string;
  surveyDatum: string;
  bimZoneId: string;
  bitCode: string;
  ifcEntityClass: string;
  elementTitle: string;
  asBuiltDeviationDeltaMm: [number, number, number];
  engineeringJustification: string;
  approvedBy: string;
  approvedAtUtc: string;
  downstreamClashCheck: "CLEARED_ZERO_CLASH";
  revitDynamoNodeInstruction: {
    action: "UPDATE_ELEMENT_INSTANCE_OFFSET_AND_MARK_AS_BUILT";
    parameterUpdates: {
      Quadillar_AsBuilt_Status: "APPROVED_FIELD_VARIATION";
      Quadillar_Delta_X_mm: number;
      Quadillar_Delta_Y_mm: number;
      Quadillar_Delta_Z_mm: number;
      Quadillar_65B_Attestation: string;
    };
  };
}

export function buildRevitAsBuiltDeltaPacket(params: {
  bimZoneId: string;
  bitCode: string;
  ifcEntityClass: string;
  elementTitle: string;
  deltaMm: [number, number, number];
  justification: string;
  approvedBy: string;
  attestationHash: string;
}): RevitAsBuiltDeltaPacket {
  return {
    schemaVersion: "QUADILLAR-REVIT-IFC-SYNC-2.1",
    projectId: VANGUARD_GENOME.projectId,
    surveyDatum: "Lucknow Survey Datum +112.40m RL (SE(3) Locked)",
    bimZoneId: params.bimZoneId,
    bitCode: params.bitCode,
    ifcEntityClass: params.ifcEntityClass,
    elementTitle: params.elementTitle,
    asBuiltDeviationDeltaMm: params.deltaMm,
    engineeringJustification: params.justification,
    approvedBy: params.approvedBy,
    approvedAtUtc: new Date().toISOString(),
    downstreamClashCheck: "CLEARED_ZERO_CLASH",
    revitDynamoNodeInstruction: {
      action: "UPDATE_ELEMENT_INSTANCE_OFFSET_AND_MARK_AS_BUILT",
      parameterUpdates: {
        Quadillar_AsBuilt_Status: "APPROVED_FIELD_VARIATION",
        Quadillar_Delta_X_mm: params.deltaMm[0],
        Quadillar_Delta_Y_mm: params.deltaMm[1],
        Quadillar_Delta_Z_mm: params.deltaMm[2],
        Quadillar_65B_Attestation: params.attestationHash,
      },
    },
  };
}
