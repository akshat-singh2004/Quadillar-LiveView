import assert from "node:assert/strict";
import {
  evaluateAlertPolicy,
  isWithinQuietHours,
  type GovernanceAlertEvent,
} from "../lib/notifications/dispatcher";
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPreferences } from "../lib/notifications/preferences";

// 1. Overnight IST quiet hours wrap (22:00 -> 07:00)
assert.equal(isWithinQuietHours(23 * 60 + 30, "22:00", "07:00"), true);
assert.equal(isWithinQuietHours(3 * 60, "22:00", "07:00"), true);
assert.equal(isWithinQuietHours(9 * 60 + 15, "22:00", "07:00"), false);

const prefs: NotificationPreferences = {
  ...DEFAULT_NOTIFICATION_PREFS,
  devicePushEnabled: true,
  emailEnabled: true,
  emailAddress: "ceo@quadillar.in",
  smsEnabled: true,
  smsPhone: "+919876543210",
  whatsappEnabled: true,
  whatsappPhone: "+919876543210",
  minSeverity: "HIGH_AND_CRITICAL",
  quietHoursEnabled: true,
  quietStart: "22:00",
  quietEnd: "07:00",
  bypassQuietForCritical: true,
};

const criticalEscrow: GovernanceAlertEvent = {
  id: "e1",
  trigger: "escrowHold422",
  severity: "CRITICAL",
  title: "HTTP 422 Hold",
  body: "TG-03 frozen",
  url: "/finance/ra-bills",
};

const highWind: GovernanceAlertEvent = {
  id: "e2",
  trigger: "craneWindLockout",
  severity: "HIGH",
  title: "Crane Wind Lockout",
  body: "FoS 1.28",
  url: "/site/wind-stability",
};

const opsSync: GovernanceAlertEvent = {
  id: "e3",
  trigger: "offlineSyncAndDup409",
  severity: "OPS",
  title: "Offline Vault Synced",
  body: "2 packets",
  url: "/site/dpr",
};

// 2. Quiet hours at 23:30 IST: HIGH suppressed, CRITICAL bypasses and hits all 4 channels
const rHighQuiet = evaluateAlertPolicy(prefs, highWind, 23 * 60 + 30);
assert.equal(rHighQuiet.allowed, false);
assert.equal(rHighQuiet.reason, "suppressed_by_ist_quiet_hours");

const rCritQuiet = evaluateAlertPolicy(prefs, criticalEscrow, 23 * 60 + 30);
assert.equal(rCritQuiet.allowed, true);
assert.deepEqual(rCritQuiet.channels, { devicePush: true, email: true, sms: true, whatsapp: true });

// 3. Daytime at 10:00 IST: HIGH allowed, OPS blocked by HIGH_AND_CRITICAL floor
const rHighDay = evaluateAlertPolicy(prefs, highWind, 10 * 60);
assert.equal(rHighDay.allowed, true);

const rOpsDay = evaluateAlertPolicy(prefs, opsSync, 10 * 60);
assert.equal(rOpsDay.allowed, false);
assert.equal(rOpsDay.reason, "below_severity_floor");

console.log("[PASS] IST overnight quiet hours (22:00-07:00) + CRITICAL bypass verified");
console.log("[PASS] Severity floor (HIGH_AND_CRITICAL) + 4-channel routing verified");
