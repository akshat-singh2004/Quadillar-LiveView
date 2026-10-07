// lib/concreteMaturityEngine.ts
// Standards: IS 456:2000 Cl. 11.3, IS 516:2021, ASTM C1074

export interface TemperatureReading {
    timestamp: string;
    coreTempC: number;
    surfaceTempC: number;
    ambientTempC: number;
}

export interface MaturityProjectionResult {
    currentMaturityDegHours: number;
    projectedStrengthMpa: number;
    projectedStrengthRatio: number;
    isStrengthCleared: boolean;
    thermalShockRisk: boolean;
    maxThermalGradientC: number;
    forecast28DayMpa: number;
    statutoryStrippingAllowed: boolean;
    strippingVerdict: string;
}

const DATUM_TEMPERATURE_C = -10.0; // ASTM C1074 Datum for Portland cements

/**
 * Computes Nurse-Saul maturity index M = sum(T - T0) * dt
 */
export function calculateNurseSaulMaturity(readings: TemperatureReading[]): number {
    if (readings.length === 0) return 0;

    let totalMaturity = 0;
    for (let i = 1; i < readings.length; i++) {
        const prev = readings[i - 1];
        const curr = readings[i];

        const dtHours =
            (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) /
            (1000 * 60 * 60);

        const avgCoreTemp = (curr.coreTempC + prev.coreTempC) / 2;
        if (avgCoreTemp > DATUM_TEMPERATURE_C) {
            totalMaturity += (avgCoreTemp - DATUM_TEMPERATURE_C) * dtHours;
        }
    }

    return Math.round(totalMaturity * 100) / 100;
}

/**
 * Estimates in-place compressive strength using Plowman log-maturity formulation
 */
export function estimateStrengthFromMaturity(
    maturityDegHours: number,
    designFck: number
): number {
    if (maturityDegHours <= 0) return 0;

    // Calibrated maturity coefficients for OPC 53 / M35 mix designs
    const A = -18.5;
    const B = 13.2;
    const rawStrength = A + B * Math.log10(Math.max(10, maturityDegHours));

    // Cap at 1.15 * designFck
    return Math.min(designFck * 1.15, Math.max(0, Math.round(rawStrength * 10) / 10));
}

/**
 * Logarithmic 28-day projection from 3-day and 7-day cube crushing tests (IS 516)
 */
export function forecast28DayStrength(strengthDay3: number, strengthDay7: number): number {
    if (strengthDay3 <= 0 || strengthDay7 <= 0) return 0;
    const deltaRate = (strengthDay7 - strengthDay3) / Math.log(7 / 3);
    const projected28 = strengthDay7 + deltaRate * Math.log(28 / 7);
    return Math.round(projected28 * 10) / 10;
}

/**
 * Validates formwork stripping criteria under IS 456:2000 Clause 11.3
 */
export function evaluateStrippingSafety(
    structuralElement: 'COLUMN' | 'BEAM_SOFFIT' | 'SLAB_SOFFIT' | 'CANTILEVER',
    designFck: number,
    estimatedStrength: number,
    elapsedHours: number,
    thermalGradientC: number
): MaturityProjectionResult {
    const strengthRatio = estimatedStrength / designFck;
    const thermalShockRisk = thermalGradientC > 20.0; // Critical cracking limit (20°C diff)

    let requiredRatio = 0.70;
    let minHours = 72;

    switch (structuralElement) {
        case 'COLUMN':
            requiredRatio = 0.25; // 2.5 to 3.0 MPa minimum for vertical formwork
            minHours = 16; // IS 456 16-24 hours
            break;
        case 'SLAB_SOFFIT':
            requiredRatio = 0.70;
            minHours = 72; // 3 days with props retained
            break;
        case 'BEAM_SOFFIT':
            requiredRatio = 0.85;
            minHours = 168; // 7 days with props retained
            break;
        case 'CANTILEVER':
            requiredRatio = 1.0;
            minHours = 336; // 14 days minimum
            break;
    }

    const isStrengthCleared = strengthRatio >= requiredRatio && elapsedHours >= minHours;
    const statutoryStrippingAllowed = isStrengthCleared && !thermalShockRisk;

    let verdict = `STATUTORY HOLD: Current strength is ${(strengthRatio * 100).toFixed(0)}% vs ${(requiredRatio * 100).toFixed(0)}% required (IS 456 Cl. 11.3).`;
    if (statutoryStrippingAllowed) {
        verdict = `CLEARED: Attained ${(strengthRatio * 100).toFixed(0)}% of f_ck (${estimatedStrength} MPa). Formwork stripping authorized.`;
    } else if (thermalShockRisk) {
        verdict = `THERMAL CRACKING HOLD: Core-to-surface gradient (${thermalGradientC.toFixed(1)}°C) exceeds 20°C limit. Stripping will cause thermal shock.`;
    }

    return {
        currentMaturityDegHours: 0,
        projectedStrengthMpa: estimatedStrength,
        projectedStrengthRatio: strengthRatio,
        isStrengthCleared,
        thermalShockRisk,
        maxThermalGradientC: thermalGradientC,
        forecast28DayMpa: forecast28DayStrength(estimatedStrength * 0.65, estimatedStrength),
        statutoryStrippingAllowed,
        strippingVerdict: verdict,
    };
}