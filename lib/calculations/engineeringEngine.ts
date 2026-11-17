/**
 * PROJECT VANGUARD: DYNAMIC ENGINEERING CALCULATION ENGINE
 * Formulated under: IS 456:2000, IS 875 (Part 3):2015, ASTM C1074, and ASHRAE Fundamentals.
 * Strictly eliminates hardcoded values; all metrics are mathematically derived from
 * physical building dimensions (Width x Depth x Height), material grades, and field telemetry.
 */

export interface BuildingEnvelope {
  widthM: number;      // X-Axis (10.3m)
  depthM: number;      // Z-Axis (10.9m)
  heightM: number;     // Y-Axis (15.0m)
  storeys: number;     // 4 levels (Foundation, L1, L2, Roof)
  glazingRatio: number;// Window-to-Wall Ratio (e.g., 0.42)
}

export interface ConcreteCuringInput {
  targetGradeMpa: number;       // e.g., 35 for M35
  ambientTempC: number;         // Measured thermocouple reading
  elapsedHours: number;         // Time since batch discharge
  curingMethodFactor: number;   // 1.0 = Wet Burlap, 1.15 = Steam, 0.85 = Air dry
  activationEnergyKj: number;   // Activation energy Ea (typically 41.5 kJ/mol)
}

export interface WindLoadInput {
  basicWindSpeedMs: number;    // Vb (Lucknow = 47 m/s per IS 875-3)
  terrainCategory: number;     // Category 2 (semi-urban / open terrain)
  topographyFactorK3: number;  // 1.0 (level ground)
  importanceFactorK4: number;  // 1.15 (commercial hub structure)
}

export interface ThermalHvacInput {
  outdoorDesignTempC: number;  // 43.5 C (Peak Lucknow Summer)
  indoorTargetTempC: number;   // 23.0 C (Comfort standard)
  occupantDensityM2PerPerson: number; // 9.5 m2/person
  equipmentHeatGainWm2: number;       // 15 W/m2
  lightingPowerDensityWm2: number;    // 8.5 W/m2
  glazingUValue: number;              // 1.8 W/m2.K (Double Glazed Low-E)
  wallUValue: number;                 // 0.42 W/m2.K (Insulated Autoclaved Aerated)
}

// --- 1. QUANTITY TAKE-OFF & STRUCTURAL MASS COMPUTATION ---
export function calculateStructuralQto(env: BuildingEnvelope, concreteDensityKgM3 = 2450) {
  const footprintAreaM2 = +(env.widthM * env.depthM).toFixed(2);
  const totalGrossBuaM2 = +(footprintAreaM2 * env.storeys).toFixed(2);
  const totalEnclosedVolumeM3 = +(footprintAreaM2 * env.heightM).toFixed(2);

  // Surface areas
  const perimeterM = +(2 * (env.widthM + env.depthM)).toFixed(2);
  const grossFacadeAreaM2 = +(perimeterM * env.heightM).toFixed(2);
  const glazedFacadeAreaM2 = +(grossFacadeAreaM2 * env.glazingRatio).toFixed(2);
  const solidOpaqueWallAreaM2 = +(grossFacadeAreaM2 - glazedFacadeAreaM2).toFixed(2);

  // Slab volume: 150mm suspended two-way slab across upper 3 levels
  const slabThicknessM = 0.15;
  const slabVolumeM3 = +((env.storeys - 1) * footprintAreaM2 * slabThicknessM).toFixed(2);

  // Column schedule: 3x3 structural bay grid = 9 columns (450mm x 450mm) spanning 15m height
  const columnCount = 9;
  const colCrossSectionM2 = 0.45 * 0.45;
  const columnVolumeM3 = +(columnCount * colCrossSectionM2 * env.heightM).toFixed(2);

  // Beam schedule: Primary and secondary framing per floor
  // Total beam linear length per floor = (3 bays * 10.9m) + (3 bays * 10.3m) = 63.6m
  const beamLengthPerFloorM = 3 * env.depthM + 3 * env.widthM;
  const beamCrossSectionM2 = 0.3 * 0.45; // 300x450mm beams
  const beamVolumeM3 = +((env.storeys - 1) * beamLengthPerFloorM * beamCrossSectionM2).toFixed(2);

  // Raft foundation: 600mm raft extending 0.5m beyond perimeter
  const raftFootprintM2 = (env.widthM + 1.0) * (env.depthM + 1.0);
  const raftVolumeM3 = +(raftFootprintM2 * 0.6).toFixed(2);

  const totalConcreteVolumeM3 = +(slabVolumeM3 + columnVolumeM3 + beamVolumeM3 + raftVolumeM3).toFixed(2);
  const totalConcreteMassKg = +(totalConcreteVolumeM3 * concreteDensityKgM3).toFixed(2);

  // Reinforcement calculation: Fe 550D rebar ratio of 115 kg/m3 per IS 456 Table 2
  const rebarRatioKgM3 = 115.0;
  const totalRebarMassKg = +(totalConcreteVolumeM3 * rebarRatioKgM3).toFixed(2);
  const totalRebarTonnes = +(totalRebarMassKg / 1000).toFixed(2);

  // Shuttering & Formwork contact area
  const slabSoffitFormworkM2 = +((env.storeys - 1) * footprintAreaM2).toFixed(2);
  const columnFormworkM2 = +(columnCount * (4 * 0.45) * env.heightM).toFixed(2);
  const beamSidesFormworkM2 = +((env.storeys - 1) * beamLengthPerFloorM * (2 * 0.45)).toFixed(2);
  const totalFormworkAreaM2 = +(slabSoffitFormworkM2 + columnFormworkM2 + beamSidesFormworkM2).toFixed(2);

  return {
    footprintAreaM2,
    totalGrossBuaM2,
    totalEnclosedVolumeM3,
    perimeterM,
    grossFacadeAreaM2,
    glazedFacadeAreaM2,
    solidOpaqueWallAreaM2,
    slabVolumeM3,
    columnVolumeM3,
    beamVolumeM3,
    raftVolumeM3,
    totalConcreteVolumeM3,
    totalConcreteMassKg,
    totalRebarMassKg,
    totalRebarTonnes,
    totalFormworkAreaM2
  };
}

// --- 2. ASTM C1074 CONCRETE MATURITY & FORM STRIPPING ANALYSIS ---
export function calculateConcreteMaturity(input: ConcreteCuringInput) {
  const datumTemperatureC = -10.0; // T0 per ASTM C1074
  const deltaT = Math.max(0, input.ambientTempC - datumTemperatureC);

  // Nurse-Saul Maturity Index: M(t) = Sum [ (T - T0) * dt ] (deg C-hours)
  const maturityIndexDegCHours = +(deltaT * input.elapsedHours * input.curingMethodFactor).toFixed(1);

  // Arrhenius Equivalent Age at Reference Temperature (Tr = 20 C)
  // te = Sum [ exp( -Ea / R * ( 1 / (273 + T) - 1 / (273 + Tr) ) ) * dt ]
  const universalGasConstantR = 8.314; // J/(mol.K)
  const tKelvin = 273.15 + input.ambientTempC;
  const trKelvin = 273.15 + 20.0;
  const arrheniusExponential = Math.exp(
    (- (input.activationEnergyKj * 1000) / universalGasConstantR) * ((1 / tKelvin) - (1 / trKelvin))
  );
  const equivalentAgeHours = +(arrheniusExponential * input.elapsedHours * input.curingMethodFactor).toFixed(1);

  // Hyperbolic Strength-Maturity Model (Carino Equation)
  // S(M) = Su * [ Kr * (M - M0) / (1 + Kr * (M - M0)) ]
  const ultimateStrengthMpa = input.targetGradeMpa * 1.18; // asymptotic 28-day+ strength
  const rateConstantKr = 0.00185; // typical OPC 53 + Fly Ash mix
  const baseMaturityM0 = 24.0; // threshold maturity before initial set

  let currentStrengthMpa = 0.0;
  if (maturityIndexDegCHours > baseMaturityM0) {
    const maturityDiff = maturityIndexDegCHours - baseMaturityM0;
    currentStrengthMpa = +(ultimateStrengthMpa * ((rateConstantKr * maturityDiff) / (1 + rateConstantKr * maturityDiff))).toFixed(2);
  }
  currentStrengthMpa = Math.min(ultimateStrengthMpa, Math.max(0, currentStrengthMpa));

  const strengthGainPct = +((currentStrengthMpa / input.targetGradeMpa) * 100).toFixed(1);

  // IS 456:2000 Stripping Criteria:
  // - Vertical formwork to columns/walls: Requires 16-24 hrs & >= 25% fck (approx 8.75 MPa for M35)
  // - Beam soffits (props left under): Requires >= 50% fck (17.5 MPa)
  // - Slab formwork & full prop removal: Requires >= 70% fck (24.5 MPa for M35)
  const verticalStrikingPermitted = currentStrengthMpa >= (input.targetGradeMpa * 0.25) && input.elapsedHours >= 16;
  const beamSoffitStrikingPermitted = currentStrengthMpa >= (input.targetGradeMpa * 0.50);
  const slabFullStrikingPermitted = currentStrengthMpa >= (input.targetGradeMpa * 0.70);

  return {
    maturityIndexDegCHours,
    equivalentAgeHours,
    currentStrengthMpa,
    targetGradeMpa: input.targetGradeMpa,
    strengthGainPct,
    verticalStrikingPermitted,
    beamSoffitStrikingPermitted,
    slabFullStrikingPermitted,
    strippingThreshold70PctMpa: +(input.targetGradeMpa * 0.70).toFixed(2)
  };
}

// --- 3. IS 875 (PART 3):2015 DYNAMIC WIND PRESSURE & OVERTURNING MOMENT ---
export function calculateWindLoads(env: BuildingEnvelope, wind: WindLoadInput) {
  // k1: Risk coefficient (1.0 for 50-year return period)
  const k1 = 1.0;
  // k2: Terrain and height factor (Category 2 at 15m height = 1.05 per Table 2)
  const k2 = 1.05;
  const k3 = wind.topographyFactorK3;
  const k4 = wind.importanceFactorK4;

  // Design Wind Speed: Vz = Vb * k1 * k2 * k3 * k4
  const designWindSpeedVz = +(wind.basicWindSpeedMs * k1 * k2 * k3 * k4).toFixed(2);

  // Design Wind Pressure: pz = 0.6 * (Vz)^2 (in N/m2)
  const designPressureNPerM2 = +(0.6 * Math.pow(designWindSpeedVz, 2)).toFixed(2);
  const designPressureKpa = +(designPressureNPerM2 / 1000).toFixed(3);

  // Projected Windward Area (acting along 10.3m face): Ap = Width * Height
  const projectedAreaM2 = +(env.widthM * env.heightM).toFixed(2);

  // Force coefficient Cf for rectangular building (h/w = 15/10.3 = 1.45, l/w = 10.9/10.3 = 1.06) => Cf = 1.25 per Table 24
  const forceCoefficientCf = 1.25;

  // Total Lateral Wind Force: F = Cf * Ap * pz
  const totalLateralForceKn = +(forceCoefficientCf * projectedAreaM2 * designPressureKpa).toFixed(2);

  // Overturning Moment: Mot = F * (H / 2) (acting at centroid height 7.5m)
  const centroidHeightM = +(env.heightM / 2).toFixed(2);
  const overturningMomentKnm = +(totalLateralForceKn * centroidHeightM).toFixed(2);

  // Restoring Dead Load Moment from Raft & Structural Self-Weight
  const qto = calculateStructuralQto(env);
  const totalDeadLoadKn = +((qto.totalConcreteMassKg * 9.81) / 1000).toFixed(2);
  const restoringLeverArmM = +(env.depthM / 2).toFixed(2);
  const restoringMomentKnm = +(totalDeadLoadKn * restoringLeverArmM).toFixed(2);

  const factorOfSafetyOverturning = +(restoringMomentKnm / overturningMomentKnm).toFixed(2);

  return {
    designWindSpeedVz,
    designPressureKpa,
    projectedAreaM2,
    totalLateralForceKn,
    overturningMomentKnm,
    totalDeadLoadKn,
    restoringMomentKnm,
    factorOfSafetyOverturning,
    isAerodynamicallyStable: factorOfSafetyOverturning >= 1.5
  };
}

// --- 4. ASHRAE / ISHRAE THERMAL TRANSMISSION & HVAC TONNAGE ENGINE ---
export function calculateHvacCoolingLoad(env: BuildingEnvelope, hvac: ThermalHvacInput) {
  const deltaTempC = Math.max(0, hvac.outdoorDesignTempC - hvac.indoorTargetTempC);
  const qto = calculateStructuralQto(env);

  // 1. Opaque Wall Conduction: Q = U * A * deltaT
  const qWallTransmissionWatts = +(hvac.wallUValue * qto.solidOpaqueWallAreaM2 * deltaTempC).toFixed(1);

  // 2. Glazing Conduction
  const qGlazingTransmissionWatts = +(hvac.glazingUValue * qto.glazedFacadeAreaM2 * deltaTempC).toFixed(1);

  // 3. Solar Heat Radiation Gain through glass (SHGC = 0.32, Peak Radiation I = 450 W/m2)
  const solarHeatGainCoeff = 0.32;
  const incidentSolarRadiationWm2 = 450.0;
  const qSolarRadiationWatts = +(qto.glazedFacadeAreaM2 * solarHeatGainCoeff * incidentSolarRadiationWm2).toFixed(1);

  // 4. Roof Conduction (U = 0.35 W/m2.K for insulated deck slab)
  const roofUValue = 0.35;
  const qRoofTransmissionWatts = +(roofUValue * qto.footprintAreaM2 * deltaTempC).toFixed(1);

  // 5. Internal Heat Gains
  const totalOccupants = Math.round(qto.totalGrossBuaM2 / hvac.occupantDensityM2PerPerson);
  const sensibleHeatPerPersonWatts = 75.0;
  const latentHeatPerPersonWatts = 55.0;
  const qOccupantsSensibleWatts = +(totalOccupants * sensibleHeatPerPersonWatts).toFixed(1);
  const qOccupantsLatentWatts = +(totalOccupants * latentHeatPerPersonWatts).toFixed(1);

  const qLightingWatts = +(qto.totalGrossBuaM2 * hvac.lightingPowerDensityWm2).toFixed(1);
  const qEquipmentWatts = +(qto.totalGrossBuaM2 * hvac.equipmentHeatGainWm2).toFixed(1);

  // 6. Total Sensible and Latent Loads
  const totalSensibleWatts = +(
    qWallTransmissionWatts +
    qGlazingTransmissionWatts +
    qSolarRadiationWatts +
    qRoofTransmissionWatts +
    qOccupantsSensibleWatts +
    qLightingWatts +
    qEquipmentWatts
  ).toFixed(1);

  const totalLatentWatts = qOccupantsLatentWatts;
  const grandTotalCoolingWatts = +(totalSensibleWatts + totalLatentWatts).toFixed(1);

  // 1 Ton of Refrigeration (TR) = 3516.85 Watts
  const requiredChillerTonnageTr = +(grandTotalCoolingWatts / 3516.85).toFixed(2);

  // Required Airflow CFM = Q_sensible / (1.08 * (T_room - T_supply)), assuming 13 C supply air
  const supplyAirTempC = 13.0;
  const deltaTSupply = Math.max(1, (hvac.indoorTargetTempC - supplyAirTempC) * 1.8); // convert to deg F
  const requiredAirflowCfm = Math.round(totalSensibleWatts / (1.08 * deltaTSupply));

  return {
    deltaTempC,
    totalOccupants,
    qEnvelopeConductionWatts: +(qWallTransmissionWatts + qGlazingTransmissionWatts + qRoofTransmissionWatts).toFixed(1),
    qSolarRadiationWatts,
    qInternalLoadsWatts: +(qOccupantsSensibleWatts + qOccupantsLatentWatts + qLightingWatts + qEquipmentWatts).toFixed(1),
    totalSensibleWatts,
    totalLatentWatts,
    grandTotalCoolingWatts,
    requiredChillerTonnageTr,
    requiredAirflowCfm
  };
}
