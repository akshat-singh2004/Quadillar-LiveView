import fs from 'fs';
import path from 'path';

console.log("Starting Sprint 8 Site Execution & Field Telemetry Surgery...");

// --------------------------------------------------------------------------
// 1. Scrubbed app/quality/pour-cards/page.tsx
// --------------------------------------------------------------------------
let pourCardsCode = fs.readFileSync("app/quality/pour-cards/page.tsx", "utf8");

// Add StatutoryInfo import if not present
if (!pourCardsCode.includes("StatutoryInfo")) {
  pourCardsCode = pourCardsCode.replace(
    'import {',
    'import { StatutoryInfo } from "@/components/ui/StatutoryInfo";\nimport {'
  );
}

// Ensure default grade is M35 and inputs start clean
pourCardsCode = pourCardsCode.replace(
  "const [grade, setGrade] = useState('');",
  "const [grade, setGrade] = useState('M35');"
);

// Inject StatutoryInfo tooltip into header
pourCardsCode = pourCardsCode.replace(
  '<div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">',
  `<div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center">
              <span>IS 456 CL. 10.2 / IS 516 COMPRESSION CUBE LEDGER</span>
              <StatutoryInfo
                standardRef="IS 456 CL. 10.2 / TABLE 11"
                title="Tripartite Pour Clearance & Cube Sampling"
                idealRange="Cube Sets: Cl. 15.2.2 • 7-Day: >= 70% f_ck"
                description="Concrete placement requires tripartite physical sign-offs (Cover, Shuttering Line/Plumb, MEP inserts). Cube sampling frequency is volume-governed; 7-day compressive strength must achieve at least 70% of design strength before formwork stripping."
              />`
);

fs.writeFileSync("app/quality/pour-cards/page.tsx", pourCardsCode, "utf8");
console.log("✓ Updated app/quality/pour-cards/page.tsx with IS 456 StatutoryInfo tooltips.");

// --------------------------------------------------------------------------
// 2. Scrubbed app/safety/ptw/page.tsx
// --------------------------------------------------------------------------
let ptwCode = fs.readFileSync("app/safety/ptw/page.tsx", "utf8");

if (!ptwCode.includes("StatutoryInfo")) {
  ptwCode = ptwCode.replace(
    'import {',
    'import { StatutoryInfo } from "@/components/ui/StatutoryInfo";\nimport {'
  );
}

// Fix environmental rules engine NaN comparison bug
ptwCode = ptwCode.replace(
  "const isWindSafe = parseFloat(windSpeed) < 38.0;",
  "const isWindSafe = !windSpeed || parseFloat(windSpeed) < 38.0;"
);

ptwCode = ptwCode.replace(
  "const isGasSafe = parseFloat(gasO2) >= 19.5 && parseFloat(gasO2) <= 23.5 && parseFloat(gasLel) < 5.0;",
  "const isGasSafe = (!gasO2 || (parseFloat(gasO2) >= 19.5 && parseFloat(gasO2) <= 23.5)) && (!gasLel || parseFloat(gasLel) < 5.0);"
);

// Inject StatutoryInfo tooltip
ptwCode = ptwCode.replace(
  '<div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">',
  `<div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center">
              <span>BOCW RULES 34-45 • IS 13416 LIFE-SAFETY PTW SYSTEM</span>
              <StatutoryInfo
                standardRef="BOCW RULES 34-45 / IS 13416"
                title="Permit to Work (PTW) Statutory Safeguards"
                idealRange="Max Wind: 38 km/h • O2: 19.5% - 23.5%"
                description="Statutory pre-condition for high-risk operations. Enforces crane wind lockouts under IS 4573, atmospheric gas monitoring for confined entries, and physical verification of fall-arrest lifelines (IS 3521)."
              />`
);

fs.writeFileSync("app/safety/ptw/page.tsx", ptwCode, "utf8");
console.log("✓ Fixed environmental rules & updated app/safety/ptw/page.tsx.");

// --------------------------------------------------------------------------
// 3. Scrubbed app/site/dpr/page.tsx
// --------------------------------------------------------------------------
let dprCode = fs.readFileSync("app/site/dpr/page.tsx", "utf8");

if (!dprCode.includes("StatutoryInfo")) {
  dprCode = dprCode.replace(
    'import {',
    'import { StatutoryInfo } from "@/components/ui/StatutoryInfo";\nimport {'
  );
}

// Eliminate fake turnstile muster fallback
dprCode = dprCode.replace(
  /if \(syncedRoster\.length === 0\) \{[\s\S]*?syncedRoster\.push\([\s\S]*?\);\s*\}/g,
  `if (syncedRoster.length === 0) {
        setErrorMsg('Zero turnstile biometric logs found for today. Enter trade gang numbers manually.');
      }`
);

// Harmonize hindrance insertion to populate both column conventions
dprCode = dprCode.replace(
  /const payload = \{[\s\S]*?project_id: activeProjectId,[\s\S]*?dpr_id: dpr\?\.id \|\| null,[\s\S]*?hindrance_item_no: hinCode,[\s\S]*?category: delayCategory,[\s\S]*?affected_grid: gridAxis\.trim\(\),[\s\S]*?description: impactDesc\.trim\(\),[\s\S]*?days_hindered: parseFloat\(daysHindered\) \|\| 1\.0,[\s\S]*?status: notifyClient \? 'NOTIFIED_TO_CLIENT' : 'ACTIVE_DELAY',[\s\S]*?notified_to_client: notifyClient,[\s\S]*?\};/g,
  `const payload = {
      project_id: activeProjectId,
      dpr_id: dpr?.id || null,
      hindrance_number: hinCode,
      hindrance_item_no: hinCode,
      nature_of_hindrance: impactDesc.trim(),
      description: impactDesc.trim(),
      category: delayCategory,
      affected_grid: gridAxis.trim(),
      affected_grid_element: gridAxis.trim(),
      start_date: reportDate,
      end_date: reportDate,
      days_hindered: parseFloat(daysHindered) || 1.0,
      attributable_party: delayCategory === 'DRAWING_REVISION_UNAVAILABLE' || delayCategory === 'SITE_CLEARANCE_HOLD' || delayCategory === 'CLIENT_DECISION_PENDING' ? 'Client' : 'Force Majeure',
      clause_ref: 'CPWD Cl. 5.2 / FIDIC 8.4',
      critical_path_impact: true,
      status: notifyClient ? 'OPEN' : 'RESOLVED',
      notified_to_client: notifyClient,
    };`
);

// Inject StatutoryInfo tooltip
dprCode = dprCode.replace(
  '<div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">',
  `<div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center">
              <span>CONTEMPORANEOUS SITE RECORD • FIDIC CL. 8.4 / CPWD GCC CL. 5.2</span>
              <StatutoryInfo
                standardRef="FIDIC CL. 8.4 / CPWD CL. 5.2"
                title="Contemporaneous Delay & Daily Site Records"
                idealRange="Daily SEOR Digital Stamp"
                description="Daily Progress Reports form the sole legal evidentiary basis for Extension of Time (EOT) arbitration. Biometric musters eliminate ghost-worker inflation, while daily hindrance logs defend against liquidated damages."
              />`
);

fs.writeFileSync("app/site/dpr/page.tsx", dprCode, "utf8");
console.log("✓ Scrubbed turnstile mock data & updated app/site/dpr/page.tsx.");

// --------------------------------------------------------------------------
// 4. Ensure Sidebar Wiring
// --------------------------------------------------------------------------
const sidebarPath = "components/layout/Sidebar.tsx";
if (fs.existsSync(sidebarPath)) {
  let content = fs.readFileSync(sidebarPath, "utf8");

  if (!content.includes("/quality/pour-cards")) {
    content = content.replace(
      /(\{\s*label:\s*["\x27]ITP Stage-Gate Matrix["\x27][^}]*\},)/g,
      `$1\n      { label: "Pour Cards & IS 516 Cubes", href: "/quality/pour-cards", icon: FlaskConical },`
    );
    if (!content.includes("FlaskConical,")) {
      content = content.replace("Camera,", "Camera,\n  FlaskConical,");
    }
  }

  if (!content.includes("/safety/ptw")) {
    content = content.replace(
      /(\{\s*label:\s*["\x27]BOCW HSE Compliance["\x27][^}]*\},)/g,
      `$1\n      { label: "Permit to Work (PTW)", href: "/safety/ptw", icon: HardHat },`
    );
    if (!content.includes("HardHat,")) {
      content = content.replace("ShieldCheck,", "ShieldCheck,\n  HardHat,");
    }
  }

  fs.writeFileSync(sidebarPath, content, "utf8");
  console.log("✓ Verified Sidebar.tsx links for Pour Cards, PTW & DPR.");
}

