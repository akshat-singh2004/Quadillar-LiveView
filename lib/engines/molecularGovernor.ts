const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256Hex(message: string): string {
  const bytes = new TextEncoder().encode(message);
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map((v) => v.toString(16).padStart(8, "0")).join("");
}

export type BimState = "GREEN" | "AMBER" | "RED";
export type GateDecision = "CLEARED" | "PARTIAL_HOLD_422" | "FULL_LOCK_422";

export interface MixerBatch {
  mixerId: string;
  volumeM3: number;
  cementKg: number;
  waterKg: number;
}

export interface BoqTranche {
  boqCode: string;
  description: string;
  bimGlobalIds: string[];
  claimedInr: number;
}

export interface MolecularInput {
  projectId: string;
  raBillNo: string;
  zoneId: string;
  bimGlobalId: string;
  recordedAtUtc: string;
  prevLedgerHash: string;

  designVolumeM3: number;
  gradeFckMpa: number;
  stdDevS: number;
  maxWcRatio: number;
  cementFactorKgPerM3: number;
  cementBaseRateInrPerMt: number;

  billedCementMt: number;
  weighbridgeCementMt: number;
  mixers: MixerBatch[];
  probeCoreTempC: number;
  probeSurfaceTempC: number;
  probeMaturityCHrs: number;
  requiredStripMaturityCHrs: number;
  nablCubesMpa: number[];
  lidarDeviationMm: number;
  lidarToleranceMm: number;

  windSpeedMs: number;
  craneSailAreaM2: number;
  craneDragCoeff: number;
  craneWindLeverArmM: number;
  craneLoadMomentKnm: number;
  craneResistingMomentKnm: number;

  bacInr: number;
  plannedValueInr: number;
  actualCostInr: number;
  priorVerifiedEvInr?: number;
  tranches: BoqTranche[];
}

export interface GovernorViolation {
  code: string;
  loop: "LOOP_1_CONCRETE" | "LOOP_2_MATERIAL" | "LOOP_3_WIND_EOT" | "LOOP_4_SPATIAL";
  severity: "CRITICAL" | "HIGH";
  standardRef: string;
  message: string;
  blocksPayout: boolean;
  blocksStrippingPtw: boolean;
  blocksCranePtw: boolean;
}

export interface GovernorSnapshot {
  bimStatusMap: Record<string, BimState>;
  violations: GovernorViolation[];
  concrete: {
    reqCementMt: number;
    batchedCementMt: number;
    cementVariancePct: number;
    maxBatchWcRatio: number;
    meanCubeMpa: number;
    minCubeMpa: number;
    is456MeanRequiredMpa: number;
    is456IndivRequiredMpa: number;
    thermalGradientC: number;
    maturityRatioPct: number;
  };
  materialRecon: {
    gateShortageMt: number;
    gateShortagePct: number;
    clause42PenalRecoveryInr: number;
  };
  windSafety: {
    windSpeedKmh: number;
    pressurePa: number;
    windMomentKnm: number;
    totalOverturningKnm: number;
    factorOfSafety: number;
    craneLockout: boolean;
    logHindranceEot: boolean;
  };
  permits: {
    strippingPtwAllowed: boolean;
    craneLiftPtwAllowed: boolean;
  };
  evm: {
    claimedEvInr: number;
    verifiedGreenEvInr: number;
    claimedSpi: number;
    verifiedSpi: number;
    claimedCpi: number;
    verifiedCpi: number;
    verifiedEacInr: number;
    projectedOverrunInr: number;
  };
  escrow: {
    decision: GateDecision;
    httpStatus: 200 | 422;
    grossClaimInr: number;
    frozenInr: number;
    eligibleGrossInr: number;
    gst18Inr: number;
    retention5Inr: number;
    mobAdvance10Inr: number;
    itTds2Inr: number;
    bocwCess1Inr: number;
    gstTds2Inr: number;
    clause42PenaltyInr: number;
    netCertifiedReleaseInr: number;
  };
  bsaSec63Ledger: {
    standard: "BSA_2023_SECTION_63";
    recordedAtUtc: string;
    prevHash: string;
    rowHash: string;
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

export function evaluateMolecularGovernor(input: MolecularInput): GovernorSnapshot {
  const violations: GovernorViolation[] = [];

  const reqCementMt = (input.designVolumeM3 * input.cementFactorKgPerM3) / 1000;
  const batchedCementMt = input.mixers.reduce((s, m) => s + m.cementKg, 0) / 1000;
  const cementVariancePct = ((batchedCementMt - reqCementMt) / reqCementMt) * 100;
  const maxBatchWcRatio = Math.max(...input.mixers.map((m) => m.waterKg / m.cementKg));

  if (maxBatchWcRatio > input.maxWcRatio) {
    violations.push({
      code: "WC_RATIO_BREACH",
      loop: "LOOP_1_CONCRETE",
      severity: "CRITICAL",
      standardRef: "IS 456:2000 Table 5",
      message: `Max batch w/c ${r2(maxBatchWcRatio)} exceeds ${input.maxWcRatio} limit`,
      blocksPayout: true,
      blocksStrippingPtw: true,
      blocksCranePtw: false,
    });
  }
  if (cementVariancePct < -3.0) {
    violations.push({
      code: "BATCH_CEMENT_UNDERDOSE",
      loop: "LOOP_1_CONCRETE",
      severity: "CRITICAL",
      standardRef: "CPWD Clause 42 (+/-3%)",
      message: `Batched cement ${r3(batchedCementMt)} MT is ${r2(cementVariancePct)}% below design ${r3(reqCementMt)} MT`,
      blocksPayout: true,
      blocksStrippingPtw: false,
      blocksCranePtw: false,
    });
  }

  const gateShortageMt = Math.max(0, input.billedCementMt - input.weighbridgeCementMt);
  const gateShortagePct = input.billedCementMt > 0 ? (gateShortageMt / input.billedCementMt) * 100 : 0;
  const clause42PenalRecoveryInr = Math.round(gateShortageMt * input.cementBaseRateInrPerMt * 2);

  if (gateShortagePct > 3.0) {
    violations.push({
      code: "GATE_WEIGHBRIDGE_SHORTAGE",
      loop: "LOOP_2_MATERIAL",
      severity: "CRITICAL",
      standardRef: "CPWD Clause 42 (2x Penal Rate)",
      message: `Weighbridge caught ${r2(gateShortageMt)} MT (${r2(gateShortagePct)}%) shortage vs challan`,
      blocksPayout: false,
      blocksStrippingPtw: false,
      blocksCranePtw: false,
    });
  }

  const thermalGradientC = input.probeCoreTempC - input.probeSurfaceTempC;
  const maturityRatioPct = (input.probeMaturityCHrs / input.requiredStripMaturityCHrs) * 100;

  if (input.probeMaturityCHrs < input.requiredStripMaturityCHrs) {
    violations.push({
      code: "MATURITY_STRIP_LOCK",
      loop: "LOOP_1_CONCRETE",
      severity: "CRITICAL",
      standardRef: "ASTM C1074 / IS 456 Cl. 11.3",
      message: `Maturity ${Math.round(input.probeMaturityCHrs)} C-hrs below ${input.requiredStripMaturityCHrs} C-hrs strip threshold`,
      blocksPayout: true,
      blocksStrippingPtw: true,
      blocksCranePtw: false,
    });
  }
  if (input.probeCoreTempC > 70.0 || thermalGradientC > 20.0) {
    violations.push({
      code: "THERMAL_CRACK_DEF_RISK",
      loop: "LOOP_1_CONCRETE",
      severity: "CRITICAL",
      standardRef: "IS 456 / Mass Concrete Thermal Limit",
      message: `Core ${input.probeCoreTempC}C (>70C) & gradient ${r2(thermalGradientC)}C (>20C)`,
      blocksPayout: true,
      blocksStrippingPtw: true,
      blocksCranePtw: false,
    });
  }

  const is456MeanRequiredMpa = Math.max(input.gradeFckMpa + 0.825 * input.stdDevS, input.gradeFckMpa + 3.0);
  const is456IndivRequiredMpa = input.gradeFckMpa - 3.0;
  const meanCubeMpa = input.nablCubesMpa.reduce((a, b) => a + b, 0) / input.nablCubesMpa.length;
  const minCubeMpa = Math.min(...input.nablCubesMpa);

  if (meanCubeMpa < is456MeanRequiredMpa || minCubeMpa < is456IndivRequiredMpa) {
    violations.push({
      code: "IS456_CUBE_FAILURE",
      loop: "LOOP_1_CONCRETE",
      severity: "CRITICAL",
      standardRef: "IS 456:2000 Table 11",
      message: `Mean ${r2(meanCubeMpa)} MPa (min ${is456MeanRequiredMpa}) / Indiv ${minCubeMpa} MPa (min ${is456IndivRequiredMpa})`,
      blocksPayout: true,
      blocksStrippingPtw: true,
      blocksCranePtw: false,
    });
  }

  if (Math.abs(input.lidarDeviationMm) > input.lidarToleranceMm) {
    violations.push({
      code: "LIDAR_TOLERANCE_BREACH",
      loop: "LOOP_4_SPATIAL",
      severity: "CRITICAL",
      standardRef: "IS 456:2000 Cl. 11.1",
      message: `As-built LiDAR deviation ${input.lidarDeviationMm}mm exceeds +/-${input.lidarToleranceMm}mm`,
      blocksPayout: true,
      blocksStrippingPtw: false,
      blocksCranePtw: false,
    });
  }

  const windSpeedKmh = input.windSpeedMs * 3.6;
  const pressurePa = 0.6 * input.windSpeedMs * input.windSpeedMs;
  const windForceKn = (pressurePa * input.craneDragCoeff * input.craneSailAreaM2) / 1000;
  const windMomentKnm = windForceKn * input.craneWindLeverArmM;
  const totalOverturningKnm = windMomentKnm + input.craneLoadMomentKnm;
  const factorOfSafety = input.craneResistingMomentKnm / totalOverturningKnm;
  const craneLockout = factorOfSafety < 1.5 || windSpeedKmh >= 54.0;

  if (craneLockout) {
    violations.push({
      code: "CRANE_WIND_LOCKOUT",
      loop: "LOOP_3_WIND_EOT",
      severity: "HIGH",
      standardRef: "IS 875 (Part 3) / Crane FoS >= 1.50",
      message: `Wind ${r2(windSpeedKmh)} km/h drops crane FoS to ${r2(factorOfSafety)} — auto-logging EOT hindrance`,
      blocksPayout: false,
      blocksStrippingPtw: false,
      blocksCranePtw: true,
    });
  }

  const targetElementBlocked = violations.some((v) => v.blocksPayout);
  const bimStatusMap: Record<string, BimState> = {};
  for (const t of input.tranches) {
    for (const gid of t.bimGlobalIds) {
      bimStatusMap[gid] = gid === input.bimGlobalId && targetElementBlocked ? "RED" : "GREEN";
    }
  }

  let grossClaimInr = 0;
  let frozenInr = 0;
  for (const t of input.tranches) {
    grossClaimInr += t.claimedInr;
    if (t.bimGlobalIds.some((gid) => bimStatusMap[gid] === "RED")) {
      frozenInr += t.claimedInr;
    }
  }
  const eligibleGrossInr = grossClaimInr - frozenInr;

  const gst18Inr = Math.round(eligibleGrossInr * 0.18);
  const retention5Inr = Math.round(eligibleGrossInr * 0.05);
  const mobAdvance10Inr = Math.round(eligibleGrossInr * 0.10);
  const itTds2Inr = Math.round(eligibleGrossInr * 0.02);
  const bocwCess1Inr = Math.round(eligibleGrossInr * 0.01);
  const gstTds2Inr = Math.round(eligibleGrossInr * 0.02);

  const netCertifiedReleaseInr =
    eligibleGrossInr +
    gst18Inr -
    retention5Inr -
    mobAdvance10Inr -
    itTds2Inr -
    bocwCess1Inr -
    gstTds2Inr -
    clause42PenalRecoveryInr;

  const decision: GateDecision =
    frozenInr === 0 ? "CLEARED" : eligibleGrossInr === 0 ? "FULL_LOCK_422" : "PARTIAL_HOLD_422";

  const priorEv = input.priorVerifiedEvInr ?? 0;
  const claimedEvInr = priorEv + grossClaimInr;
  const verifiedGreenEvInr = priorEv + eligibleGrossInr;
  const claimedSpi = claimedEvInr / input.plannedValueInr;
  const verifiedSpi = verifiedGreenEvInr / input.plannedValueInr;
  const claimedCpi = claimedEvInr / input.actualCostInr;
  const verifiedCpi = verifiedGreenEvInr / input.actualCostInr;
  const verifiedEacInr = verifiedCpi > 0 ? Math.round(input.bacInr / verifiedCpi) : input.bacInr;

  const canonicalPayload = JSON.stringify({
    projectId: input.projectId,
    raBillNo: input.raBillNo,
    bimGlobalId: input.bimGlobalId,
    decision,
    frozenInr,
    netCertifiedReleaseInr,
    violationCodes: violations.map((v) => v.code),
  });
  const rowHash = sha256Hex(`${input.prevLedgerHash}|${input.bimGlobalId}|${input.recordedAtUtc}|${canonicalPayload}`);

  return {
    bimStatusMap,
    violations,
    concrete: {
      reqCementMt: r3(reqCementMt),
      batchedCementMt: r3(batchedCementMt),
      cementVariancePct: r2(cementVariancePct),
      maxBatchWcRatio: r3(maxBatchWcRatio),
      meanCubeMpa: r2(meanCubeMpa),
      minCubeMpa,
      is456MeanRequiredMpa: r3(is456MeanRequiredMpa),
      is456IndivRequiredMpa,
      thermalGradientC: r2(thermalGradientC),
      maturityRatioPct: r2(maturityRatioPct),
    },
    materialRecon: {
      gateShortageMt: r2(gateShortageMt),
      gateShortagePct: r2(gateShortagePct),
      clause42PenalRecoveryInr,
    },
    windSafety: {
      windSpeedKmh: r2(windSpeedKmh),
      pressurePa: r2(pressurePa),
      windMomentKnm: r2(windMomentKnm),
      totalOverturningKnm: r2(totalOverturningKnm),
      factorOfSafety: r2(factorOfSafety),
      craneLockout,
      logHindranceEot: craneLockout,
    },
    permits: {
      strippingPtwAllowed: !violations.some((v) => v.blocksStrippingPtw),
      craneLiftPtwAllowed: !violations.some((v) => v.blocksCranePtw),
    },
    evm: {
      claimedEvInr,
      verifiedGreenEvInr,
      claimedSpi: r3(claimedSpi),
      verifiedSpi: r3(verifiedSpi),
      claimedCpi: r3(claimedCpi),
      verifiedCpi: r3(verifiedCpi),
      verifiedEacInr,
      projectedOverrunInr: verifiedEacInr - input.bacInr,
    },
    escrow: {
      decision,
      httpStatus: frozenInr > 0 ? 422 : 200,
      grossClaimInr,
      frozenInr,
      eligibleGrossInr,
      gst18Inr,
      retention5Inr,
      mobAdvance10Inr,
      itTds2Inr,
      bocwCess1Inr,
      gstTds2Inr,
      clause42PenaltyInr: clause42PenalRecoveryInr,
      netCertifiedReleaseInr,
    },
    bsaSec63Ledger: {
      standard: "BSA_2023_SECTION_63",
      recordedAtUtc: input.recordedAtUtc,
      prevHash: input.prevLedgerHash,
      rowHash,
    },
  };
}

export const EXTREME_TG03_FIXTURE: MolecularInput = {
  projectId: "VANGUARD-LKO-01",
  raBillNo: "RA-BILL-14",
  zoneId: "ZONE-4",
  bimGlobalId: "TG-03",
  recordedAtUtc: "2026-11-23T06:00:00.000Z",
  prevLedgerHash: "0000000000000000000000000000000000000000000000000000000000000000",
  designVolumeM3: 42.0,
  gradeFckMpa: 50.0,
  stdDevS: 5.0,
  maxWcRatio: 0.40,
  cementFactorKgPerM3: 430.0,
  cementBaseRateInrPerMt: 7200,
  billedCementMt: 18.5,
  weighbridgeCementMt: 16.2,
  mixers: [
    { mixerId: "TM-01", volumeM3: 7, cementKg: 3015, waterKg: 1175 },
    { mixerId: "TM-02", volumeM3: 7, cementKg: 3010, waterKg: 1180 },
    { mixerId: "TM-03", volumeM3: 7, cementKg: 3020, waterKg: 1178 },
    { mixerId: "TM-04", volumeM3: 7, cementKg: 2590, waterKg: 1295 },
    { mixerId: "TM-05", volumeM3: 7, cementKg: 2610, waterKg: 1280 },
    { mixerId: "TM-06", volumeM3: 7, cementKg: 3005, waterKg: 1172 },
  ],
  probeCoreTempC: 74.2,
  probeSurfaceTempC: 48.0,
  probeMaturityCHrs: 2736,
  requiredStripMaturityCHrs: 5200,
  nablCubesMpa: [56.2, 55.4, 44.1, 45.8],
  lidarDeviationMm: 28.0,
  lidarToleranceMm: 12.0,
  windSpeedMs: 18.5,
  craneSailAreaM2: 42.0,
  craneDragCoeff: 1.6,
  craneWindLeverArmM: 38.0,
  craneLoadMomentKnm: 920.0,
  craneResistingMomentKnm: 1850.0,
  bacInr: 86400000,
  plannedValueInr: 26000000,
  actualCostInr: 24800000,
  priorVerifiedEvInr: 0,
  tranches: [
    { boqCode: "BOQ-301", description: "Zone 1-3 Typical Slabs", bimGlobalIds: ["SLAB-Z1", "SLAB-Z2", "SLAB-Z3"], claimedInr: 14800000 },
    { boqCode: "BOQ-302", description: "Zone 4 Transfer Girder TG-03", bimGlobalIds: ["TG-03"], claimedInr: 6200000 },
    { boqCode: "BOQ-303", description: "Zone 5-6 MEP Risers & Core", bimGlobalIds: ["CORE-Z5", "CORE-Z6"], claimedInr: 3500000 },
  ],
};

export const COMPLIANT_TG03_FIXTURE: MolecularInput = {
  ...EXTREME_TG03_FIXTURE,
  billedCementMt: 18.1,
  weighbridgeCementMt: 18.1,
  mixers: [
    { mixerId: "TM-01", volumeM3: 7, cementKg: 3015, waterKg: 1175 },
    { mixerId: "TM-02", volumeM3: 7, cementKg: 3015, waterKg: 1175 },
    { mixerId: "TM-03", volumeM3: 7, cementKg: 3015, waterKg: 1175 },
    { mixerId: "TM-04", volumeM3: 7, cementKg: 3015, waterKg: 1175 },
    { mixerId: "TM-05", volumeM3: 7, cementKg: 3015, waterKg: 1175 },
    { mixerId: "TM-06", volumeM3: 7, cementKg: 3015, waterKg: 1175 },
  ],
  probeCoreTempC: 58.0,
  probeSurfaceTempC: 44.0,
  probeMaturityCHrs: 7392,
  nablCubesMpa: [56.2, 55.4, 57.1, 56.5],
  lidarDeviationMm: 4.5,
  windSpeedMs: 8.0,
};
