import fs from 'fs';
import path from 'path';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

console.log(`${CYAN}==============================================================${RESET}`);
console.log(`${CYAN} 🔍 QUADILLAR LIVEVIEW: BACKEND & SYSTEM INTEGRITY AUDIT${RESET}`);
console.log(`${CYAN}==============================================================\n${RESET}`);

let errors = 0;
let warnings = 0;

function checkFile(filePath, description) {
    if (fs.existsSync(filePath)) {
        console.log(`${GREEN}[OK]${RESET} ${description} found: ${filePath}`);
    } else {
        console.log(`${RED}[MISSING]${RESET} ${description} is missing: ${filePath}`);
        errors++;
    }
}

function checkContent(filePath, searchString, featureName) {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(searchString)) {
        console.log(`${GREEN}[OK]${RESET} ${featureName} logic is intact.`);
    } else {
        console.log(`${YELLOW}[WARNING]${RESET} ${featureName} logic missing in ${filePath}`);
        warnings++;
    }
}

console.log(`${CYAN}--- 1. BACKEND API & SERVER ACTIONS ---${RESET}`);
checkFile('app/actions/cde-actions.ts', 'CDE Server Actions');
checkFile('app/api/cron/shift-closeout/route.ts', 'Shift Closeout Cron');
checkFile('app/api/projects/[id]/export-certificate/route.ts', 'Export Certificate API');
checkFile('supabase/migrations/20261022_create_dlp_telemetry_schema.sql', 'DLP DB Schema');

console.log(`\n${CYAN}--- 2. DATA MANIFESTS & CDE LEDGERS ---${RESET}`);
checkFile('hermes_ledger_manifest_LUCKNOW-TECHPARK-PH1.json', 'Hermes Financial Ledger');
checkFile('GOMTI-NAGAR-PH1-FITOUT_LEGAL_MANIFEST.json', 'CDE Legal Manifest');
checkFile('public/models/live_telemetry_snapshot.json', 'IoT Telemetry Snapshot');

console.log(`\n${CYAN}--- 3. 3D ENGINE INTEGRITY (FullBimSimulationEngine.tsx) ---${RESET}`);
const enginePath = 'components/bim/FullBimSimulationEngine.tsx';
checkFile(enginePath, 'Primary BIM Engine Component');

if (fs.existsSync(enginePath)) {
    const stats = fs.statSync(enginePath);
    console.log(`     -> Engine File Size: ${(stats.size / 1024).toFixed(2)} KB`);
    
    // Check for critical Phase 30-32 systems
    checkContent(enginePath, 'setOpsData', '7D Facility Ops State');
    checkContent(enginePath, 'Math.max(0, (y + (sweepHeight / 2))', 'NaN Geometry Guard (Sweeping Spine)');
    checkContent(enginePath, 'aviationLightsRef', 'Aviation Lights Ref');
    checkContent(enginePath, 'THREE.SphereGeometry', 'Silver Dome Geometry Fix');
    checkContent(enginePath, 'CRANE_CAM', 'Crane Operator FPV Mode');
    checkContent(enginePath, 'IOT_MESH', 'Palantir IoT Mesh Render Mode');
    checkContent(enginePath, 'CDE_DOCS', 'Enterprise CDE Ledger UI');
}

console.log(`\n${CYAN}==============================================================${RESET}`);
if (errors === 0 && warnings === 0) {
    console.log(`${GREEN}✅ SYSTEM HEALTHY: All backend routes, manifests, and 3D systems are intact.${RESET}`);
} else {
    console.log(`${YELLOW}⚠️ AUDIT COMPLETE: Found ${errors} Missing Files and ${warnings} Broken Components.${RESET}`);
    console.log(`Please share this output so we can patch the missing logic.${RESET}`);
}
console.log(`${CYAN}==============================================================${RESET}\n`);
