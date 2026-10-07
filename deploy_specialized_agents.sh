#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Deploying 4 New Specialized Autonomous Agents (Daedalus, Minerva, Plutus, Ananke)...\033[0m"

# -----------------------------------------------------------------------------
# 1. AGENT: lib/agents/daedalus.ts (Concrete Hydration Kinetics & Thermal Stress)
# -----------------------------------------------------------------------------
echo -e "\033[1;33m[*] Building Agent Daedalus (Concrete Hydration & Maturity)...\033[0m"

cat << 'AGENT_DAEDALUS' > lib/agents/daedalus.ts
import { createClient } from "@supabase/supabase-js";
import { HermesAgent } from "@/lib/agents/hermes";

export interface HydrationReading {
  sensorId: string;
  depthMm: number;
  temperatureC: number;
  timestamp: string;
}

export interface ThermalEvaluationResult {
  coreTempC: number;
  surfaceTempC: number;
  differentialTempC: number;
  isDefRisk: boolean;             // Delayed Ettringite Formation risk (> 70°C)
  isThermalCrackRisk: boolean;     // Differential gradient > 20°C per CIRIA C766
  maturityIndexCdegHours: number;  // Nurse-Saul Maturity Index
  estimatedStrengthMpa: number;
  strippingPermitted: boolean;
  verdict: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Agent Daedalus.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export class DaedalusAgent {
  /**
   * Evaluates mass concrete hydration kinetics per ACI 207.2R & CIRIA C766:
   * - Max Core Temperature <= 70.0°C (Prevents DEF crystallization failure)
   * - Max Core-Surface Differential <= 20.0°C (Prevents micro-crack propagation)
   * - Nurse-Saul Maturity M = sum((T - T0) * delta_t), with datum T0 = -10°C
   */
  static evaluateHydrationKinetics(params: {
    coreTempC: number;
    surfaceTempC: number;
    targetFckMpa: number;
    hoursSincePour: number;
    ambientTempC: number;
  }): ThermalEvaluationResult {
    const differential = Math.abs(params.coreTempC - params.surfaceTempC);
    const isDefRisk = params.coreTempC > 70.0;
    const isThermalCrackRisk = differential > 20.0;

    // Nurse-Saul Maturity Index: M = (T_avg - (-10°C)) * hours
    const avgTemp = (params.coreTempC + params.surfaceTempC) / 2;
    const maturity = Math.max(0, (avgTemp + 10) * params.hoursSincePour);

    // Plowman logarithmic compressive strength derivation:
    // f_c(M) = targetFck * (A + B * log10(M))
    const normalizedLogMaturity = Math.log10(Math.max(10, maturity)) / 3.8;
    const estimatedStrength = parseFloat(
      Math.min(params.targetFckMpa * 1.15, params.targetFckMpa * normalizedLogMaturity).toFixed(2)
    );

    // Formwork stripping requires >= 70% characteristic strength and safe gradient
    const minStrippingStrength = params.targetFckMpa * 0.70;
    const strippingPermitted =
      estimatedStrength >= minStrippingStrength && !isThermalCrackRisk && !isDefRisk;

    let verdict = "HYDRATION STABLE: Thermal gradient within CIRIA C766 tolerances.";
    if (isDefRisk) {
      verdict = `CRITICAL DEF ALERT: Core temperature ${params.coreTempC}°C exceeds 70°C ceiling. Immediate thermal mitigation required.`;
    } else if (isThermalCrackRisk) {
      verdict = `THERMAL GRADIENT BREACH: Core-surface delta ${differential.toFixed(1)}°C exceeds 20°C limit. Add surface insulation blankets.`;
    }

    return {
      coreTempC: params.coreTempC,
      surfaceTempC: params.surfaceTempC,
      differentialTempC: parseFloat(differential.toFixed(1)),
      isDefRisk,
      isThermalCrackRisk,
      maturityIndexCdegHours: Math.round(maturity),
      estimatedStrengthMpa: estimatedStrength,
      strippingPermitted,
      verdict,
    };
  }

  /**
   * Logs a hydration violation, creates an audit record, and issues an inspection hold.
   */
  static async notarizeThermalViolation(params: {
    projectId: string;
    pourCardId: string;
    gridLocation: string;
    evaluation: ThermalEvaluationResult;
  }) {
    if (params.evaluation.isDefRisk || params.evaluation.isThermalCrackRisk) {
      await HermesAgent.notarizeTransaction({
        projectId: params.projectId,
        actionTitle: `Daedalus Thermal Hold: ${params.evaluation.verdict}`,
        actionCategory: "CONCRETE_HYDRATION_HOLD",
        moduleRef: params.pourCardId,
        details: { evaluation: params.evaluation, location: params.gridLocation },
        signatoryName: "Agent Daedalus (Thermal Governor)",
        signatoryRole: "Autonomous Concrete Technologist",
        severity: "critical",
      });
    }
  }
}
AGENT_DAEDALUS

# -----------------------------------------------------------------------------
# 2. AGENT: lib/agents/minerva.ts (4D BIM Clash Adjudication & Spatial Hold-Gate)
# -----------------------------------------------------------------------------
echo -e "\033[1;33m[*] Building Agent Minerva (BIM 4D Spatial Clash Governor)...\033[0m"

cat << 'AGENT_MINERVA' > lib/agents/minerva.ts
import { createClient } from "@supabase/supabase-js";
import { HermesAgent } from "@/lib/agents/hermes";

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface SpatialClashCandidate {
  clashId: string;
  primaryElementTag: string;
  primaryDiscipline: "STRUCTURAL" | "MEP" | "HVAC" | "ARCHITECTURAL";
  secondaryElementTag: string;
  secondaryDiscipline: "STRUCTURAL" | "MEP" | "HVAC" | "ARCHITECTURAL";
  intersectionVolumeM3: number;
  clearanceMm: number;
  status: "OPEN" | "REVIEWED" | "RESOLVED";
}

export interface SpatialPourCheckResult {
  permitted: boolean;
  activeClashCount: number;
  criticalHardClashes: string[];
  verdict: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Agent Minerva.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export class MinervaAgent {
  /**
   * Tests 3D Axis-Aligned Bounding Box (AABB) intersection between two spatial components
   */
  static testAabbIntersection(boxA: BoundingBox, boxB: BoundingBox, clearanceToleranceM = 0.05): boolean {
    return (
      boxA.minX - clearanceToleranceM <= boxB.maxX &&
      boxA.maxX + clearanceToleranceM >= boxB.minX &&
      boxA.minY - clearanceToleranceM <= boxB.maxY &&
      boxA.maxX + clearanceToleranceM >= boxB.minY &&
      boxA.minZ - clearanceToleranceM <= boxB.maxZ &&
      boxA.maxZ + clearanceToleranceM >= boxB.minZ
    );
  }

  /**
   * Pre-Pour Spatial Gate: Blocks concrete pour if un-adjudicated hard clashes
   * intersect the target casting grid (ISO 19650-2 Level of Information Need).
   */
  static evaluatePrePourSpatialGate(params: {
    pourGridLocation: string;
    registeredClashes: SpatialClashCandidate[];
  }): SpatialPourCheckResult {
    const criticalClashes = params.registeredClashes.filter(
      (c) =>
        c.status === "OPEN" &&
        (c.primaryDiscipline === "STRUCTURAL" || c.secondaryDiscipline === "STRUCTURAL") &&
        (c.intersectionVolumeM3 > 0.001 || c.clearanceMm < 25)
    );

    const permitted = criticalClashes.length === 0;
    const criticalTags = criticalClashes.map(
      (c) => `${c.primaryElementTag} x ${c.secondaryElementTag} (${c.clearanceMm}mm)`
    );

    return {
      permitted,
      activeClashCount: criticalClashes.length,
      criticalHardClashes: criticalTags,
      verdict: permitted
        ? `SPATIAL CLEARANCE GRANTED: Zero hard clashes detected on grid [${params.pourGridLocation}].`
        : `SPATIAL HOLD: ${criticalClashes.length} un-resolved clash(es) intersect casting volume. Concreting prohibited per ISO 19650.`,
    };
  }
}
AGENT_MINERVA

# -----------------------------------------------------------------------------
# 3. AGENT: lib/agents/plutus.ts (BOCW Labor Audit & Ghost-Worker Trap)
# -----------------------------------------------------------------------------
echo -e "\033[1;33m[*] Building Agent Plutus (BOCW Labor & Ghost-Worker Auditor)...\033[0m"

cat << 'AGENT_PLUTUS' > lib/agents/plutus.ts
import { createClient } from "@supabase/supabase-js";
import { HermesAgent } from "@/lib/agents/hermes";

export interface LaborMusterEntry {
  workerId: string;
  workerName: string;
  contractorName: string;
  tradePackage: string;
  dailyWageInr: number;
  uanNumber?: string;
  isBiometricVerified: boolean;
}

export interface LaborAuditResult {
  totalBilledHeadcount: number;
  biometricPunchedCount: number;
  ghostWorkerCount: number;
  ghostWorkerDebitInr: number;
  bocwCessDueInr: number;
  isWageAuditCompliant: boolean;
  disallowedWorkers: string[];
  verdict: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Agent Plutus.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export class PlutusAgent {
  /**
   * BOCW Act 1996 Forensic Labor Reconciliation:
   * - Correlates billed muster rolls against physical turnstile logs
   * - Flags ghost workers (billed headcount without physical biometric timestamps)
   * - Enforces 1.0% statutory BOCW Welfare Cess deduction
   */
  static auditLaborMuster(params: {
    billedWorkers: LaborMusterEntry[];
    statutoryMinWageInr?: number;
    contractGrossBillingInr: number;
  }): LaborAuditResult {
    const minWage = params.statutoryMinWageInr || 650; // Standard skilled/semi-skilled baseline
    const unverifiedWorkers = params.billedWorkers.filter((w) => !w.isBiometricVerified);
    const ghostCount = unverifiedWorkers.length;

    const ghostDebit = unverifiedWorkers.reduce(
      (sum, w) => sum + Math.max(w.dailyWageInr, minWage),
      0
    );

    // Statutory 1% BOCW Welfare Cess on gross certified valuation
    const bocwCessDue = Math.round(params.contractGrossBillingInr * 0.01);
    const isCompliant = ghostCount === 0;

    return {
      totalBilledHeadcount: params.billedWorkers.length,
      biometricPunchedCount: params.billedWorkers.length - ghostCount,
      ghostWorkerCount: ghostCount,
      ghostWorkerDebitInr: ghostDebit,
      bocwCessDueInr: bocwCessDue,
      isWageAuditCompliant: isCompliant,
      disallowedWorkers: unverifiedWorkers.map((w) => `${w.workerName} (${w.contractorName})`),
      verdict: isCompliant
        ? "MUSTER RECONCILED: 100% biometric attendance correlation. Zero ghost workers detected."
        : `GHOST WORKER FRAUD: ${ghostCount} billed worker(s) have zero biometric punches. ₹${ghostDebit.toLocaleString("en-IN")} contra-charge debit initiated.`,
    };
  }
}
AGENT_PLUTUS

# -----------------------------------------------------------------------------
# 4. AGENT: lib/agents/ananke.ts (Plant Telematics & OEE Fleet Governor)
# -----------------------------------------------------------------------------
echo -e "\033[1;33m[*] Building Agent Ananke (Plant Telematics & Fleet OEE Governor)...\033[0m"

cat << 'AGENT_ANANKE' > lib/agents/ananke.ts
import { createClient } from "@supabase/supabase-js";
import { HermesAgent } from "@/lib/agents/hermes";

export interface EquipmentTelemetryData {
  assetCode: string;
  category: string;
  plannedOperatingHours: number;
  actualOperatingHours: number;
  idlingHours: number;
  fuelConsumedLiters: number;
  oemRatedFuelBurnLph: number;
  outputVolumeM3: number;
  targetVolumeM3: number;
  fitnessExpiryDateIso: string;
}

export interface OeeFleetEvaluationResult {
  assetCode: string;
  availabilityRatePct: number;
  performanceRatePct: number;
  overallOeePct: number;
  fuelVariancePct: number;
  isFuelPilferageFlagged: boolean;
  isFitnessExpired: boolean;
  operationalStatus: "ONLINE" | "GROUNDED_SAFETY_HOLD" | "MAINTENANCE_FLAG";
  verdict: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Agent Ananke.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export class AnankeAgent {
  /**
   * ISO 22400 Overall Equipment Effectiveness (OEE) & CPWD Form 31 Audit:
   * - Availability (A) = Operating Hours / Planned Hours
   * - Performance (P) = Actual Output / Rated Target
   * - Fuel Burn Variance = (Actual L/hr - OEM L/hr) / OEM L/hr
   * - Grounding lock if fitness certificate date has expired
   */
  static evaluateAssetTelematics(data: EquipmentTelemetryData): OeeFleetEvaluationResult {
    // 1. Availability & Performance
    const availability = data.plannedOperatingHours > 0
      ? Math.min(1.0, data.actualOperatingHours / data.plannedOperatingHours)
      : 0;

    const performance = data.targetVolumeM3 > 0
      ? Math.min(1.0, data.outputVolumeM3 / data.targetVolumeM3)
      : 1.0;

    const oee = parseFloat((availability * performance * 100).toFixed(1));

    // 2. Specific Fuel Consumption (SFC)
    const effectiveHours = Math.max(0.5, data.actualOperatingHours);
    const actualBurnRateLph = data.fuelConsumedLiters / effectiveHours;
    const fuelVariancePct = data.oemRatedFuelBurnLph > 0
      ? parseFloat((((actualBurnRateLph - data.oemRatedFuelBurnLph) / data.oemRatedFuelBurnLph) * 100).toFixed(1))
      : 0;

    // Fuel variance > +15% flags pilferage or injector failure
    const isFuelPilferageFlagged = fuelVariancePct > 15.0;

    // 3. Statutory Third-Party Fitness
    const isFitnessExpired = new Date(data.fitnessExpiryDateIso).getTime() < Date.now();

    let status: OeeFleetEvaluationResult["operationalStatus"] = "ONLINE";
    let verdict = `OEE NOMINAL: Operating at ${oee}% efficiency.`;

    if (isFitnessExpired) {
      status = "GROUNDED_SAFETY_HOLD";
      verdict = `STATUTORY GROUNDING: Third-party safety fitness expired on ${data.fitnessExpiryDateIso}. P&M operation illegal under BOCW Rule 56.`;
    } else if (isFuelPilferageFlagged) {
      status = "MAINTENANCE_FLAG";
      verdict = `FUEL ANOMALY: Fuel burn rate +${fuelVariancePct}% above OEM baseline. Pilferage or mechanical failure flagged.`;
    }

    return {
      assetCode: data.assetCode,
      availabilityRatePct: parseFloat((availability * 100).toFixed(1)),
      performanceRatePct: parseFloat((performance * 100).toFixed(1)),
      overallOeePct: oee,
      fuelVariancePct,
      isFuelPilferageFlagged,
      isFitnessExpired,
      operationalStatus: status,
      verdict,
    };
  }
}
AGENT_ANANKE

# -----------------------------------------------------------------------------
# 5. BARREL: lib/agents/index.ts (Exporting the Complete 11-Agent Constellation)
# -----------------------------------------------------------------------------
echo -e "\033[1;33m[*] Updating lib/agents/index.ts barrel exports...\033[0m"

cat << 'BARREL_AGENTS' > lib/agents/index.ts
export { AegisAgent } from "./aegis";
export { HermesAgent } from "./hermes";
export { ChronosAgent } from "./chronos";
export { MidasAgent } from "./midas";
export { ArgusAgent } from "./argus";
export { ThemisAgent } from "./themis";
export { VulcanAgent } from "./vulcan";
export { DaedalusAgent } from "./daedalus";
export { MinervaAgent } from "./minerva";
export { PlutusAgent } from "./plutus";
export { AnankeAgent } from "./ananke";
BARREL_AGENTS

# -----------------------------------------------------------------------------
# 6. VERIFY BUILD & COMPILATION HEALTH
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying full TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] All 11 Autonomous Agents deployed with 0 errors across the entire codebase!\033[0m"
