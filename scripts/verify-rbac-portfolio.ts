import assert from "node:assert/strict";
import {
  DEMO_ROLE_PINS,
  authorizeOperatorAction,
} from "../lib/server/securityGuard";
import {
  getPortfolioProjectBaseline,
  listPortfolioProjects,
} from "../lib/domain/portfolioRegistry";
import { evaluateMolecularGovernor } from "../lib/engines/molecularGovernor";

// 1. Portfolio Registry & Isolated Baselines
const projects = listPortfolioProjects();
assert.ok(projects.length >= 6, `Expected at least 6 portfolio sites, got ${projects.length}`);

const vanguard = getPortfolioProjectBaseline("VANGUARD-LKO-01");
const vanguardSnap = evaluateMolecularGovernor(vanguard.input);
assert.equal(vanguardSnap.escrow.httpStatus, 422, "Vanguard baseline must remain HTTP 422");

const hazratganj = getPortfolioProjectBaseline("LKO-HAZRATGANJ-HERITAGE");
const hazratganjSnap = evaluateMolecularGovernor(hazratganj.input);
assert.equal(hazratganjSnap.escrow.httpStatus, 200, "Nominal site LKO-HAZRATGANJ-HERITAGE must start HTTP 200");
assert.notEqual(hazratganj.input.zoneId, vanguard.input.zoneId, "Sites must have isolated zone IDs");

const summit = getPortfolioProjectBaseline("LKO-SUMMIT-TOWER");
const summitSnap = evaluateMolecularGovernor(summit.input);
assert.ok(summitSnap.violations.some((v) => v.code === "CRANE_WIND_LOCKOUT"), "Deviation-flagged site LKO-SUMMIT-TOWER must trip CRANE_WIND_LOCKOUT");
console.log(
  `[PASS] Portfolio Registry -> ${projects.length} sites loaded | Vanguard=422 (escrow), Summit=CRANE_WIND_LOCKOUT (PTW), Hazratganj=200 (nominal)`
);

// 2. 3-Tier RBAC Authorization Matrix (200 / 401 / 403)
const dirClear = authorizeOperatorAction({
  role: "DIRECTOR",
  suppliedPin: DEMO_ROLE_PINS.DIRECTOR,
  actionType: "CLEAR_FOR_RTGS",
  overrideEnvPins: { DIRECTOR: "" },
});
assert.equal(dirClear.authorized, true);
assert.equal(dirClear.httpStatus, 200);

const engPtw = authorizeOperatorAction({
  role: "SITE_ENGINEER",
  suppliedPin: DEMO_ROLE_PINS.SITE_ENGINEER,
  actionType: "REVOKE_CRANE_PTW",
  overrideEnvPins: { SITE_ENGINEER: "" },
});
assert.equal(engPtw.authorized, true, "Site Engineer must be permitted to revoke crane PTW");
assert.equal(engPtw.httpStatus, 200);

const engRtgs = authorizeOperatorAction({
  role: "SITE_ENGINEER",
  suppliedPin: DEMO_ROLE_PINS.SITE_ENGINEER,
  actionType: "CLEAR_FOR_RTGS",
  overrideEnvPins: { SITE_ENGINEER: "" },
});
assert.equal(engRtgs.authorized, false, "Site Engineer must be denied RTGS release");
assert.equal(engRtgs.httpStatus, 403, "Authenticated privilege escalation must return HTTP 403");

const audWrite = authorizeOperatorAction({
  role: "AUDITOR",
  suppliedPin: DEMO_ROLE_PINS.AUDITOR,
  actionType: "REVOKE_CRANE_PTW",
  overrideEnvPins: { AUDITOR: "" },
});
assert.equal(audWrite.authorized, false, "Auditor must be strictly read-only");
assert.equal(audWrite.httpStatus, 403);

const badPin = authorizeOperatorAction({
  role: "SITE_ENGINEER",
  suppliedPin: "9999",
  actionType: "REVOKE_CRANE_PTW",
  overrideEnvPins: { SITE_ENGINEER: "5555" },
});
assert.equal(badPin.authorized, false);
assert.equal(badPin.httpStatus, 401, "Wrong PIN must return HTTP 401");

console.log(
  "[PASS] 3-Tier RBAC Matrix -> DIRECTOR(200 all) | SITE_ENGINEER(200 PTW / 403 RTGS) | AUDITOR(403 read-only) | Wrong PIN(401)"
);
