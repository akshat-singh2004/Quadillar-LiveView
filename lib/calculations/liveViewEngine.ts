/**
 * PROJECT VANGUARD: QUADILLAR LIVEVIEW EDGE CAMERA POLE & TELEMETRY ENGINE
 * 
 * Solves the critical site infrastructure challenge:
 * Commercial job sites lack reliable site-wide Wi-Fi and permanent grid power.
 * LiveView poles operate as autonomous edge telemetry stations:
 * 1. Independent Solar Photovoltaic (120W) + LiFePO4 (100Ah @ 24V) battery energy balance
 * 2. Industrial Dual-SIM 4G/5G Cellular Gateway with adaptive uplink throttling
 * 3. 3-Axis MEMS Tilt/Impact Accelerometer for anti-theft and vandalism protection
 * 4. On-Device Edge NPU Inference: Real-time bounding-box detection for PPE compliance,
 *    unauthorized exclusion zone intrusion (11kV powerline buffer), and ANPR plate recognition
 * 5. Cryptographic Frame Hashing for Section 65B Indian Evidence Act court admissibility
 */

export interface CameraPoleTelemetryState {
  poleId: string;
  poleLabel: string;
  locationDescription: string;
  gpsCoordinates: { lat: number; lng: number };
  powerSystem: {
    batteryVoltageV: number;       // Nominal 25.6V (24V LiFePO4 8S)
    batteryStateOfChargePct: number;// 0 - 100%
    solarIrradianceWm2: number;    // 0 - 1000 W/m2
    solarPowerGeneratedWatts: number;
    systemPowerLoadWatts: number;  // PTZ camera + Edge NPU + Cellular Router (~28W)
    netCurrentAmps: number;
    batteryAutonomyHoursRemaining: number;
  };
  cellularUplink: {
    networkBearer: "5G_SA" | "4G_LTE_ADV";
    carrier: "Jio Commercial" | "Airtel Enterprise";
    signalStrengthRssiDbm: number; // -50 (Excellent) to -105 (Degraded)
    bandwidthMbps: number;
    dataThrottlingActive: boolean;
  };
  physicalSecurity: {
    memsTiltAngleDeg: number;      // Tilt from vertical (nominal < 0.8 deg)
    isTamperAlertTriggered: boolean;// Tilt > 3.5 deg or enclosure door breached
    enclosureDoorLocked: boolean;
    internalCabinetTempC: number;  // Safe: -10 to +55 deg C
  };
  edgeInference: {
    fps: number;
    workersDetected: number;
    ppeHardhatViolations: number;
    ppeVestViolations: number;
    exclusionZoneBreaches: number;
    anprPlateLastRead: string;
  };
}

// 1. Solar Photovoltaic & LiFePO4 Battery Energy Balance:
// P_solar = A_panel * eta_pv * G_irradiance (Watts)
// I_net = (P_solar - P_load) / V_bus (Amperes)
export function computeSolarBatteryBalance(
  irradianceWm2: number,
  systemLoadWatts = 28.5,
  currentBatteryPct = 84.0
): {
  solarPowerWatts: number;
  netCurrentAmps: number;
  updatedBatteryPct: number;
  batteryAutonomyHours: number;
} {
  const panelAreaM2 = 0.65; // 120W monocrystalline panel
  const panelEfficiency = 0.195; // 19.5% conversion efficiency
  const busVoltage = 25.6; // 24V LiFePO4 bus

  const solarPowerWatts = +(panelAreaM2 * panelEfficiency * irradianceWm2).toFixed(1);
  const netPowerWatts = solarPowerWatts - systemLoadWatts;
  const netCurrentAmps = +(netPowerWatts / busVoltage).toFixed(2);

  // 100Ah @ 24V = 2400 Wh total capacity; 80% usable depth of discharge = 1920 Wh
  const usableCapacityWh = 1920.0;
  const hoursAutonomy = netPowerWatts < 0
    ? +((usableCapacityWh * (currentBatteryPct / 100)) / Math.abs(netPowerWatts)).toFixed(1)
    : 99.9;

  let deltaPct = (netCurrentAmps * 1.0) / 100.0 * 100.0; // Simulated 1-hr step
  const updatedBatteryPct = Math.min(100.0, Math.max(15.0, +(currentBatteryPct + deltaPct).toFixed(1)));

  return {
    solarPowerWatts,
    netCurrentAmps,
    updatedBatteryPct,
    batteryAutonomyHours: hoursAutonomy
  };
}

// 2. Anti-Theft MEMS Accelerometer Tilt Calculation:
// theta = arccos( az / sqrt(ax^2 + ay^2 + az^2) )
export function evaluatePoleTamperState(
  accelX: number,
  accelY: number,
  accelZ: number,
  enclosureOpen = false
): {
  tiltAngleDeg: number;
  isTamperTriggered: boolean;
  tamperMessage: string;
} {
  const norm = Math.sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);
  const zClamped = Math.max(-1.0, Math.min(1.0, accelZ / (norm || 1.0)));
  const tiltAngleDeg = +(Math.acos(zClamped) * (180.0 / Math.PI)).toFixed(2);

  const isTilted = tiltAngleDeg > 3.5;
  const isTamperTriggered = isTilted || enclosureOpen;

  let tamperMessage = "POLE STABLE: Physical vertical alignment within tolerance.";
  if (isTilted && enclosureOpen) {
    tamperMessage = `CRITICAL THEFT ALERT: Pole impact tilt ${tiltAngleDeg}° & cabinet door breached!`;
  } else if (isTilted) {
    tamperMessage = `POLE TILT WARNING: Lateral displacement ${tiltAngleDeg}° exceeds 3.5° foundation threshold.`;
  } else if (enclosureOpen) {
    tamperMessage = "SECURITY ALERT: Enclosure access door magnetic reed switch open.";
  }

  return { tiltAngleDeg, isTamperTriggered, tamperMessage };
}
