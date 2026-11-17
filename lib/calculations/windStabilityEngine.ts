export interface WindZoneSlice {
  storeyLabel: string;
  elevationM: number;
  k2Factor: number;
  designWindSpeedMs: number;
  windPressureKpa: number;
  lateralForceKn: number;
  overturningMomentKnm: number;
}

export interface WindStabilityReport {
  city: string;
  basicWindSpeedVbMs: number;
  towerHeightM: number;
  maxDesignSpeedMs: number;
  peakPressureKpa: number;
  totalBaseShearKn: number;
  totalOverturningMomentKnm: number;
  restoringMomentKnm: number;
  overturningFos: number;
  topLateralSwayMm: number;
  allowableSwayMm: number;
  isStableAndCompliant: boolean;
  slices: WindZoneSlice[];
}

export function evaluateVanguardTowerWind(
  basicWindSpeedVb = 47.0, // Lucknow, UP (IS 875 Part 3 Annex A)
  towerHeightM = 54.0      // BIT-3 Hotel Core (+54.00m RL)
): WindStabilityReport {
  const k1 = 1.0;
  const k3 = 1.0;
  const k4 = 1.0;
  const cf = 1.25;
  const widthM = 22.0;
  const depthM = 20.0;

  const levels = [
    { label: "Podium (+4.5m)", z: 4.5, hTrib: 4.5, k2: 0.91 },
    { label: "Level 03 (+15.0m)", z: 15.0, hTrib: 10.5, k2: 0.97 },
    { label: "Level 06 (+25.5m)", z: 25.5, hTrib: 10.5, k2: 1.03 },
    { label: "Level 10 (+39.5m)", z: 39.5, hTrib: 14.0, k2: 1.08 },
    { label: "Level 14 Crown (+54.0m)", z: towerHeightM, hTrib: 14.5, k2: 1.12 },
  ];

  let totalShear = 0;
  let totalOtm = 0;

  const slices: WindZoneSlice[] = levels.map((lvl) => {
    const vz = +(basicWindSpeedVb * k1 * lvl.k2 * k3 * k4).toFixed(2);
    const pzKpa = +((0.6 * vz * vz) / 1000).toFixed(3);
    const forceKn = +(pzKpa * widthM * lvl.hTrib * cf).toFixed(1);
    const otmKnm = +(forceKn * lvl.z).toFixed(1);
    totalShear += forceKn;
    totalOtm += otmKnm;
    return {
      storeyLabel: lvl.label,
      elevationM: lvl.z,
      k2Factor: lvl.k2,
      designWindSpeedMs: vz,
      windPressureKpa: pzKpa,
      lateralForceKn: forceKn,
      overturningMomentKnm: otmKnm,
    };
  });

  // BIT-3 Dead Weight = 385,000 kN; lever arm D/2 = 10.0m
  const deadLoadKn = 385000;
  const restoringMomentKnm = +(deadLoadKn * (depthM / 2)).toFixed(0);
  const overturningFos = +((0.9 * restoringMomentKnm) / Math.max(totalOtm, 1)).toFixed(2);

  // Diagrid + Shear Core Lateral Stiffness Sway Estimate
  const topLateralSwayMm = +((totalShear / 2150) * 34.5).toFixed(1);
  const allowableSwayMm = +((towerHeightM * 1000) / 500).toFixed(1); // H/500 = 108.0 mm

  return {
    city: "Lucknow, Uttar Pradesh (IS 875 Pt. 3)",
    basicWindSpeedVbMs: basicWindSpeedVb,
    towerHeightM,
    maxDesignSpeedMs: slices[slices.length - 1].designWindSpeedMs,
    peakPressureKpa: slices[slices.length - 1].windPressureKpa,
    totalBaseShearKn: +totalShear.toFixed(1),
    totalOverturningMomentKnm: +totalOtm.toFixed(1),
    restoringMomentKnm,
    overturningFos,
    topLateralSwayMm,
    allowableSwayMm,
    isStableAndCompliant: overturningFos >= 1.5 && topLateralSwayMm <= allowableSwayMm,
    slices,
  };
}
