export type TriageDisposition =
  | "REQUIRED_VALID"
  | "NOISE_DROPPED"
  | "QUARANTINED_ANOMALY";

export interface NumericBoundRule {
  field: string;
  value: unknown;
  min: number;
  max: number;
  allowZero?: boolean;
  unit?: string;
}

export interface TriageCheckResult {
  valid: boolean;
  disposition: TriageDisposition;
  quarantinedFields: string[];
  reasons: string[];
}

export const PHYSICAL_BOUNDS = {
  WIND_SPEED_MS: { min: 0, max: 120 }, // 0 to 432 km/h physical anemometer ceiling
  SWL_LOAD_PCT: { min: 0, max: 250 },
  BOOM_RADIUS_M: { min: 1, max: 150 },
  RAINFALL_MMH: { min: 0, max: 500 },
  VOLUME_M3: { min: 0.1, max: 5000 },
  WEIGHT_KG: { min: 100, max: 15_000_000 },
  CONCRETE_DENSITY_KG_M3: { min: 1800, max: 3000 },
  GRADE_MPA: { min: 10, max: 120 },
  IN_SITU_MPA: { min: 1, max: 150 },
  CEMENT_BAGS: { min: 1, max: 100_000 },
  CEMENT_KG: { min: 50, max: 5_000_000 },
  WC_RATIO: { min: 0.2, max: 1.2 },
  TEMP_C: { min: -20, max: 150 },
  MAX_TRANSCRIPT_CHARS: 8_000,
} as const;

export function isFiniteInRange(
  val: unknown,
  min: number,
  max: number,
  allowZero = true
): val is number {
  if (typeof val !== "number" || !Number.isFinite(val)) return false;
  if (!allowZero && val === 0) return false;
  return val >= min && val <= max;
}

export function clampFinite(val: unknown, fallback: number, min: number, max: number): number {
  if (typeof val !== "number" || !Number.isFinite(val)) return fallback;
  return Math.min(max, Math.max(min, val));
}

export function validateNumericBounds(rules: NumericBoundRule[]): TriageCheckResult {
  const quarantinedFields: string[] = [];
  const reasons: string[] = [];

  for (const r of rules) {
    const raw = r.value;
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      quarantinedFields.push(r.field);
      reasons.push(`${r.field} is non-finite (${String(raw)})`);
      continue;
    }
    if (r.allowZero === false && raw === 0) {
      quarantinedFields.push(r.field);
      reasons.push(`${r.field} must be non-zero`);
      continue;
    }
    if (raw < r.min || raw > r.max) {
      quarantinedFields.push(r.field);
      reasons.push(
        `${r.field}=${raw}${r.unit ? ` ${r.unit}` : ""} outside physical bounds [${r.min}, ${r.max}]`
      );
    }
  }

  return {
    valid: quarantinedFields.length === 0,
    disposition: quarantinedFields.length === 0 ? "REQUIRED_VALID" : "QUARANTINED_ANOMALY",
    quarantinedFields,
    reasons,
  };
}

const INJECTION_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  {
    label: "prompt_override_directive",
    regex: /\b(?:ignore\s+(?:all\s+)?(?:previous\s+)?rules?|override\s+governor|bypass\s+audit|force\s+approve|approve\s+http\s*200|trust\s+100%)\b/gi,
  },
  {
    label: "script_or_html_tag",
    regex: /<\s*\/?\s*(?:script|iframe|svg|object|embed)[^>]*>/gi,
  },
];

export function stripAdversarialTextNoise(raw: string): {
  cleaned: string;
  droppedNoiseHints: string[];
} {
  let cleaned = (raw || "").replace(/\u0000/g, "").trim();
  const droppedNoiseHints: string[] = [];

  for (const p of INJECTION_PATTERNS) {
    if (p.regex.test(cleaned)) {
      droppedNoiseHints.push(p.label);
      cleaned = cleaned.replace(p.regex, " ");
    }
    p.regex.lastIndex = 0;
  }

  // Drop 10-digit Indian mobile numbers so they never collide with weight/challan numbers
  const phoneRegex = /\b(?:phone|mob|mobile|call|contact|number|no\.?)[^\d]{0,12}[6-9]\d{9}\b/gi;
  if (phoneRegex.test(cleaned)) {
    droppedNoiseHints.push("mobile_phone_noise");
    cleaned = cleaned.replace(phoneRegex, " ");
  }

  return {
    cleaned: cleaned.replace(/\s+/g, " ").trim(),
    droppedNoiseHints,
  };
}
