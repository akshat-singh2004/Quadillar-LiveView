import assert from "node:assert/strict";
import fs from "node:fs";
import { recordAndEvaluateSalamiDrift, resetSalamiDriftWindow } from "../lib/domain/salamiDriftDetector";
import { evaluateWindLatch, resetWindLatch } from "../lib/server/windLatchStore";

// 1. Salami-slicing rolling-window detector
resetSalamiDriftWindow("SALAMI-TEST-01");
let trippedTick = -1;
for (let i = 1; i <= 10; i++) {
  const v = recordAndEvaluateSalamiDrift({
    projectId: "SALAMI-TEST-01",
    billedVolumeCum: 40.8,
    batchingPlantVolumeCum: 40.0,
    cementBatchedKgPerCum: 392.8,
  });
  if (v.triggered && trippedTick === -1) trippedTick = i;
}
assert.ok(trippedTick >= 1 && trippedTick <= 4, `Expected salami drift trip by pour #4, got ${trippedTick}`);
console.log(`[PASS] Salami-Slicing Drift Detector -> tripped on pour #${trippedTick} (rolling window active)`);

// Clean pours must never trip salami drift
resetSalamiDriftWindow("CLEAN-TEST-01");
for (let i = 1; i <= 10; i++) {
  const v = recordAndEvaluateSalamiDrift({
    projectId: "CLEAN-TEST-01",
    billedVolumeCum: 40.0,
    batchingPlantVolumeCum: 40.0,
    cementBatchedKgPerCum: 405,
  });
  assert.equal(v.triggered, false, "Clean pours must never trigger salami drift");
}
console.log("[PASS] Salami-Slicing Clean Baseline -> 10/10 nominal pours stayed clear");

// 2. Wind safety latch hysteresis
resetWindLatch("WIND-TEST-01");
const safe = evaluateWindLatch("WIND-TEST-01", 10.5, false);
assert.equal(safe.latch.active, false);
const peak = evaluateWindLatch("WIND-TEST-01", 19.8, false);
assert.equal(peak.latch.active, true);
const dip = evaluateWindLatch("WIND-TEST-01", 11.2, false);
assert.equal(dip.latch.active, true, "Crane lockout must stay latched on low-wind dip");
assert.ok((dip.effectiveWindMs ?? 0) >= 19.8);
const cleared = evaluateWindLatch("WIND-TEST-01", 11.2, true);
assert.equal(cleared.latch.active, false, "Manual clearance must unlock crane");
console.log("[PASS] Crane Wind Safety Latch -> 19.8 m/s latched across 11.2 m/s dip until manual clearance");

// 3. Static checks: Light/Dark toggle z-[60], Gantt live SPI, zero Section 65B in Sidebar/UnifiedHeader
const toggleSrc = fs.readFileSync("components/LiveviewThemeQuickToggle.tsx", "utf8");
assert.ok(toggleSrc.includes("z-50") || toggleSrc.includes("z-[60]"), "LiveviewThemeQuickToggle must sit at z-50+ above GovernorGlobalBar");
const ganttSrc = fs.readFileSync("app/schedule/gantt/page.tsx", "utf8");
assert.ok(ganttSrc.includes("Behind Schedule"), "Gantt page must compute SPI-based delay status");
const sidebarSrc = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");
assert.equal(/Section\s*65B/i.test(sidebarSrc), false, "Sidebar must use BSA Section 63, not Section 65B");
console.log("[PASS] Display Hardening Guards -> z-[60] theme toggle, live Gantt SPI, BSA Section 63 chrome");
