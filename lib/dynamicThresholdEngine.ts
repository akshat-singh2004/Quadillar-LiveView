// lib/dynamicThresholdEngine.ts

export type ComplianceStatus = "OPTIMAL" | "ACCEPTABLE" | "CRITICAL";

export interface ComputedThreshold {
    label: string;
    rangeText: string;
    min?: number;
    max?: number;
    status: ComplianceStatus;
}

export interface DynamicSpecCard {
    title: string;
    standardCode: string;
    generalTerm: string;
    technicality: string;
    currentValueDisplay: string;
    currentStatus: ComplianceStatus;
    statusRemark: string;
    thresholds: ComputedThreshold[];
}

export interface ProjectContextParams {
    projectDiscipline?: "CIVIL_STR" | "INTERIOR_FITOUT" | "MEP_SERVICES" | "INFRA_HIGHWAY";
    contractValue?: number;
    concreteGrade?: string;
    elementType?: string;
    placementMethod?: "PUMPED" | "CRANE_BUCKET" | "TREMIE";
    ambientTempC?: number;
}

export function calculateDynamicSlumpThresholds(
    inputSlumpMm: number,
    params: ProjectContextParams
): DynamicSpecCard {
    const isPumped = params.placementMethod === "PUMPED" || !params.placementMethod;
    const isShearOrCore = params.elementType === "SHEAR_WALL" || params.elementType === "COLUMN";
    const temp = params.ambientTempC ?? 32;

    let targetMin = isPumped ? 100 : 75;
    let targetMax = isPumped ? 130 : 100;

    if (isShearOrCore) {
        targetMin += 15;
        targetMax += 20;
    }

    const heatFactor = temp > 35 ? -10 : 0;
    const allowableMin = targetMin - 15 + heatFactor;
    const allowableMax = targetMax + 20;

    let currentStatus: ComplianceStatus = "OPTIMAL";
    let statusRemark = "Slump is within optimum design pumpability bandwidth.";

    if (inputSlumpMm < allowableMin) {
        currentStatus = "CRITICAL";
        statusRemark = `Mix has experienced premature stiffening (less than ${allowableMin} mm). High honeycombing risk.`;
    } else if (inputSlumpMm > allowableMax) {
        currentStatus = "CRITICAL";
        statusRemark = `Excessive bleeding and segregation risk (greater than ${allowableMax} mm). Compressive loss guaranteed.`;
    } else if (inputSlumpMm < targetMin || inputSlumpMm > targetMax) {
        currentStatus = "ACCEPTABLE";
        statusRemark = "Workable but borderline. Superplasticizer dosage adjustment recommended.";
    }

    return {
        title: "Dynamic Concrete Workability (Slump)",
        standardCode: "IS 456:2000 Cl. 7.1 / IS 1199",
        generalTerm: "Measures whether the wet concrete is fluid enough to flow through congested steel rebar without blocking pumps or forming hollow pockets.",
        technicality: `Dynamic algorithm calculated for ${params.elementType || "ELEMENT"} placed via ${params.placementMethod || "PUMP"} at ${temp}°C ambient. Tested via 300mm frustum cone.`,
        currentValueDisplay: `${inputSlumpMm} mm`,
        currentStatus,
        statusRemark,
        thresholds: [
            { label: "Design Target (Pumped)", rangeText: `${targetMin} - ${targetMax} mm`, min: targetMin, max: targetMax, status: "OPTIMAL" },
            { label: "Permissible Working Float", rangeText: `${allowableMin} - ${allowableMax} mm`, min: allowableMin, max: allowableMax, status: "ACCEPTABLE" },
            { label: "Statutory Batch Rejection", rangeText: `< ${allowableMin} or > ${allowableMax} mm`, status: "CRITICAL" },
        ],
    };
}

export function calculateDynamicCubeStrengthThresholds(
    achievedMpa: number,
    dayTest: 7 | 28,
    gradeString: string
): DynamicSpecCard {
    const fck = parseInt(gradeString.replace(/[^0-9]/g, ""), 10) || 35;
    const targetMin = dayTest === 7 ? Math.round(fck * 0.67) : fck;
    const targetOptimal = dayTest === 7 ? Math.round(fck * 0.72) : Math.round(fck * 1.15);

    let currentStatus: ComplianceStatus = "OPTIMAL";
    let statusRemark = `Crushing strength exceeds target specification for ${gradeString}.`;

    if (achievedMpa < targetMin) {
        currentStatus = "CRITICAL";
        statusRemark = `Strength failed target (${achievedMpa} MPa < ${targetMin} MPa). Core cutting or rebound hammer test mandated.`;
    } else if (achievedMpa >= targetMin && achievedMpa < targetOptimal) {
        currentStatus = "ACCEPTABLE";
        statusRemark = `Passed minimum threshold (${targetMin} MPa) but lower than standard standard deviation mean.`;
    }

    return {
        title: `${dayTest}-Day Compressive Cube Strength`,
        standardCode: "IS 516 / IS 456 Cl. 15 Table 2",
        generalTerm: `A heavy hydraulic crusher squashes standard 150mm concrete cubes cured in water to verify if the mix has achieved design structural hardness.`,
        technicality: `Dynamic algorithm calculated for characteristic grade ${gradeString} (f_ck = ${fck} MPa). Target at 7 days is 67% f_ck, at 28 days is 100% f_ck + 1.65σ.`,
        currentValueDisplay: `${achievedMpa} MPa`,
        currentStatus,
        statusRemark,
        thresholds: [
            { label: `Target Design Mean (${dayTest}d)`, rangeText: `≥ ${targetOptimal} MPa`, status: "OPTIMAL" },
            { label: `Statutory Minimum Pass (${dayTest}d)`, rangeText: `${targetMin} - ${targetOptimal} MPa`, status: "ACCEPTABLE" },
            { label: `Structural Failure Lien (${dayTest}d)`, rangeText: `< ${targetMin} MPa`, status: "CRITICAL" },
        ],
    };
}

export function calculateDynamicRetentionThresholds(
    inputRetentionPct: number,
    contractValue: number
): DynamicSpecCard {
    const isMegaProject = contractValue > 500000000;
    const statutoryCeiling = isMegaProject ? 2.5 : 5.0;

    let currentStatus: ComplianceStatus = "OPTIMAL";
    let statusRemark = "Withholding matches sanctioned statutory contractual rate.";

    if (inputRetentionPct > statutoryCeiling + 1.0) {
        currentStatus = "CRITICAL";
        statusRemark = `Excessive retention lien (${inputRetentionPct}% > ${statutoryCeiling}%). Employer in breach of prompt payment regulations.`;
    } else if (inputRetentionPct < statutoryCeiling) {
        currentStatus = "ACCEPTABLE";
        statusRemark = `Lower than standard ${statutoryCeiling}% ceiling. Verify if Bank Guarantee was submitted in lieu of cash retention.`;
    }

    const retentionAmount = (contractValue * (inputRetentionPct / 100));

    return {
        title: "Statutory Retention / Security Deposit Escrow",
        standardCode: "CPWD GCC Clause 1A / FIDIC Clause 14.3",
        generalTerm: "A mandatory escrow deducted from each bill to secure defect repairs during the 12-month warranty period.",
        technicality: `Dynamic algorithm calibrated for ₹${(contractValue / 10000000).toFixed(2)} Cr baseline. Computed escrow value: ₹${retentionAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}.`,
        currentValueDisplay: `${inputRetentionPct.toFixed(1)}%`,
        currentStatus,
        statusRemark,
        thresholds: [
            { label: "Statutory Sanctioned Baseline", rangeText: `${statutoryCeiling.toFixed(1)}%`, status: "OPTIMAL" },
            { label: "Permissible with BG Substitution", rangeText: `2.0% - ${statutoryCeiling.toFixed(1)}%`, status: "ACCEPTABLE" },
            { label: "Non-Compliant Withholding", rangeText: `> ${(statutoryCeiling + 1.0).toFixed(1)}%`, status: "CRITICAL" },
        ],
    };
}