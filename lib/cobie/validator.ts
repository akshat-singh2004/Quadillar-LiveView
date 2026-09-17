import type { CobieComponent, CobieType } from "@/types/construction";

export interface CobieAuditResult {
  score: number;
  compliant: boolean;
  threshold: number;
  tierIntegrity: boolean;
  missingAttributes: string[];
  warnings: string[];
  blockers: string[];
  summary: string;
}

export function validateCobieAudit(input: {
  types: CobieType[];
  components: CobieComponent[];
  documentCount?: number;
  systems?: string[];
}): CobieAuditResult {
  const tiers = ["Facility", "Floor", "Space", "Type", "Component", "System", "Document"];
  const requiredComponentFields = [
    "componentName",
    "componentType",
    "location",
    "serialNumber",
    "manufacturer",
    "warrantyStartDate",
    "spaceLocationCode",
  ];

  const missingAttributes: string[] = [];
  const warnings: string[] = [];
  const blockers: string[] = [];

  const typeCodes = input.types.filter((type) => Boolean(type.uniclass)).length;
  if (typeCodes < input.types.length && input.types.length > 0) {
    blockers.push("Some COBie asset types are missing Uniclass classification codes.");
  }

  input.components.forEach((component, index) => {
    const missing = requiredComponentFields.filter((field) => {
      const value = component[field as keyof CobieComponent];
      return value === undefined || value === null || value === "";
    });

    if (missing.length > 0) {
      missingAttributes.push(`Component ${index + 1}: missing ${missing.join(", ")}`);
    }
  });

  if (!input.documentCount || input.documentCount < 1) {
    blockers.push("No handover documents are linked to the COBie dataset.");
  }

  if ((input.systems ?? []).length === 0) {
    warnings.push("No system mapping is defined for the facility handover package.");
  }

  const totalChecks = Math.max(1, tiers.length + input.components.length * requiredComponentFields.length);
  const penalties = missingAttributes.length * 12 + blockers.length * 20 + warnings.length * 5;
  const score = Math.max(0, Math.min(100, 100 - penalties));

  const tierIntegrity = input.types.length > 0 && input.components.length > 0 && (input.documentCount ?? 0) > 0;

  return {
    score: Number(score.toFixed(1)),
    compliant: score >= 95,
    threshold: 95,
    tierIntegrity,
    missingAttributes,
    warnings,
    blockers,
    summary: score >= 95
      ? "EIR compliance is acceptable for statutory handover approval."
      : "EIR compliance is below the statutory threshold and blocks final AIM export.",
  };
}
