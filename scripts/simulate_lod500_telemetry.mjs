#!/usr/bin/env node
/**
 * QUADILLAR LIVEVIEW: CONTINUOUS IOT TELEMETRY SIMULATOR
 * Emits live LOD 500 sensor frames for Tower A (Airflow CFM, Damper Angles, Pressures, Temps)
 *
 * Usage:
 *   node scripts/simulate_lod500_telemetry.mjs                  # Normal telemetry stream
 *   node scripts/simulate_lod500_telemetry.mjs --inject-drift  # Simulates +1.8 deg VAV actuator drift
 */

import fs from 'fs';
import path from 'path';

const isDriftInjected = process.argv.includes('--inject-drift');
const assetFile = path.resolve('public/models/tower_a_lod500_assets.json');
const assets = JSON.parse(fs.readFileSync(assetFile, 'utf8'));

console.log('\x1b[34m====================================================================\x1b[0m');
console.log('\x1b[36m    QUADILLAR LIVEVIEW: DIGITAL TWIN TELEMETRY ENGINE (RUNNING)    \x1b[0m');
console.log(`    Target Project : LUCKNOW-TECHPARK-PH1 (Tower A)`);
console.log(`    Simulation Mode: ${isDriftInjected ? '\x1b[31mFAULT INJECTION ACTIVE (+1.8° VAV Drift)\x1b[0m' : '\x1b[32mOPTIMAL TELEMETRY (100% HEALTH)\x1b[0m'}`);
console.log('\x1b[34m====================================================================\x1b[0m\n');

let tick = 0;

function generateTelemetryFrame() {
  tick++;
  const timestamp = new Date().toISOString();
  
  // 1. VAV-1-NW-04 (Grid C3-D4)
  const baseDamper = 45.0 + Math.sin(tick * 0.3) * 5.0;
  const driftOffset = isDriftInjected ? 1.82 : (Math.random() * 0.4 - 0.2);
  const liveDamperAngle = +(baseDamper + driftOffset).toFixed(2);
  const liveCfm = Math.round(450 + Math.cos(tick * 0.2) * 20 - (isDriftInjected ? 48 : 0));
  const vavStatus = isDriftInjected ? 'ANOMALY_SLA_ACTIVE' : 'NORMAL';

  // 2. AHU-L01-01
  const staticPressure = +(380 + Math.sin(tick * 0.2) * 15).toFixed(1);
  const chwReturnTemp = +(11.8 + Math.cos(tick * 0.1) * 0.6).toFixed(2);

  // 3. Fire Hydrant Riser AST-FIRE-RSR-01
  const linePressure = +(15.0 + (Math.random() * 0.2 - 0.1)).toFixed(2);

  // 4. Electrical LT-PNL-L01
  const phaseCurrent = Math.round(920 + Math.sin(tick * 0.5) * 45);

  console.log(`\x1b[90m[${timestamp}] Frame #${tick}\x1b[0m`);
  console.log(`  • \x1b[1mVAV-1-NW-04\x1b[0m [${vavStatus === 'NORMAL' ? '\x1b[32mNORMAL\x1b[0m' : '\x1b[31mDRIFT ALERT (+1.8°)\x1b[0m'}] Damper: ${liveDamperAngle}° (Setpoint: 45.0°) | Flow: ${liveCfm} CFM | Supply T: 13.6°C`);
  console.log(`  • \x1b[1mAHU-L01-01 \x1b[0m [\x1b[32mNORMAL\x1b[0m] Static P: ${staticPressure} Pa | CHW Return: ${chwReturnTemp}°C | VFD: 42.5 Hz`);
  console.log(`  • \x1b[1mAST-FIRE   \x1b[0m [\x1b[32mNORMAL\x1b[0m] Wet Riser Pressure: ${linePressure} bar (SLA: >= 12.0 bar)`);
  console.log(`  • \x1b[1mLT-PNL-L01 \x1b[0m [\x1b[32mNORMAL\x1b[0m] Load: ${phaseCurrent} A (415V) | Busbar Temp: 42.1°C\n`);

  // Persist latest telemetry snapshot to disk for Next.js UI consumption
  const snapshot = {
    timestamp,
    tick,
    isDriftInjected,
    telemetry: {
      "2f8a91b4-4e2a-49c8-9d7e-8c3120b08fa1": {
        tag: "VAV-1-NW-04",
        damper_angle: liveDamperAngle,
        drift_degrees: +(liveDamperAngle - 45.0).toFixed(2),
        airflow_cfm: liveCfm,
        status: vavStatus,
        sla_ticket: "DLP-TKT-2026-001"
      },
      "4f9b8c31-7e1b-42d9-8a6e-1b2090c07eb2": {
        tag: "AHU-L01-01",
        static_pressure_pa: staticPressure,
        chw_return_temp_c: chwReturnTemp,
        status: "OPTIMAL"
      },
      "6d6b5a19-5c99-40b7-6e4c-9f0f70a05c94": {
        tag: "AST-FIRE-RSR-01",
        line_pressure_bar: linePressure,
        status: "VERIFIED_IS5290"
      }
    }
  };

  fs.writeFileSync('public/models/live_telemetry_snapshot.json', JSON.stringify(snapshot, null, 2));
}

// Initial frame
generateTelemetryFrame();

// Continuous telemetry pulse every 3 seconds
setInterval(generateTelemetryFrame, 3000);
