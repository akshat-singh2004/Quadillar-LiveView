const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const ROUTES = [
  // ── Core Site Operations & Quality ──────────────────────────────────────
  { path: '/dashboard', label: 'Command Spine (Dashboard)', maxMs: 1500 },
  { path: '/operations/gate-register', label: 'Material Gate Register (GDN)', maxMs: 1200 },
  { path: '/operations/dpr', label: 'Daily Progress Reports (DPR)', maxMs: 1200 },
  { path: '/safety/ptw', label: 'Permit to Work (PTW)', maxMs: 1000 },
  { path: '/safety/formwork-stripping', label: 'Formwork Stripping Clearance', maxMs: 1000 },
  { path: '/safety/hse-compliance', label: 'Site HSE & BOCW Safety Compliance', maxMs: 2500 },
  { path: '/quality/pour-cards', label: 'Concrete Pour Cards', maxMs: 1200 },
  { path: '/quality/cube-tests', label: 'IS 516 Cube Crushing Tests', maxMs: 1200 },
  { path: '/quality/ncr', label: 'Non-Conformance Reports (NCR)', maxMs: 1000 },
  { path: '/site/sensor-gateway', label: 'IoT Sensor Gateway & Digital Twin', maxMs: 1500 },
  { path: '/drawings/redlines', label: 'CDE Redlines & Drawing Markup', maxMs: 1500 },
  { path: '/handover/punch-list', label: 'Punch List & TOC Clearance', maxMs: 1500 },

  // ── Financial Execution & IPC ───────────────────────────────────────────
  { path: '/finance/measurement-book', label: 'Digital Measurement Book (MB)', maxMs: 1200 },
  { path: '/finance/ra-bills', label: 'Subcontractor RA Bills & IPC', maxMs: 1500 },
  { path: '/reports/audit', label: 'PMC Weekly Compliance Dossier', maxMs: 2000 },

  // ── Pre-Construction & Estimation (CPWD DSR 2023 & Procurement) ───────
  { path: '/estimation/ai-boq', label: 'AI BIM-to-BOQ Estimation Engine', maxMs: 2500 },
  { path: '/procurement/tender-evaluation', label: 'Tender Evaluation & CS Matrix', maxMs: 2500 },
  { path: '/procurement/inventory-store', label: 'Material Inventory & GRS Store', maxMs: 2500 },

  // ── Closeout & Statutory Suite (CPWD GCC & FIDIC) ───────────────────────
  { path: '/finance/final-bill', label: 'Final Bill & Retention Release', maxMs: 2500 },
  { path: '/finance/dlp-bg-tracker', label: 'DLP & Performance BG Tracker', maxMs: 2500 },
  { path: '/finance/statutory-clearance', label: 'Statutory Labour & BOCW Clearance', maxMs: 2500 },
  { path: '/closeout/completion-report', label: 'Project Completion Report (PCR)', maxMs: 2500 },
  { path: '/closeout/vendor-archive', label: 'Vendor Rating & Final Archive', maxMs: 2500 },
  { path: '/closeout/client-ledger', label: 'Client Closeout & Retention', maxMs: 2500 },
  { path: '/closeout/subcontractor-settlement', label: 'Subcontractor Final Settlement', maxMs: 2500 },
  { path: '/closeout/as-built-vault', label: 'As-Built & O&M Vault', maxMs: 2500 },
  { path: '/closeout/escrow-reserve', label: 'Escrow & Warranty Reserve', maxMs: 2500 },
  { path: '/closeout/audit-vault', label: 'Audit Trail & Statutory Vault', maxMs: 2500 },
  { path: '/closeout/command-center', label: 'Closeout Master Command Hub', maxMs: 2500 },
];

async function runAudit() {
  console.log('\x1b[34m%s\x1b[0m', `Starting Quadillar LiveView Endpoints Audit: ${BASE_URL}\n`);
  
  let passed = 0;
  let failed = 0;

  for (const route of ROUTES) {
    const start = performance.now();
    try {
      const res = await fetch(`${BASE_URL}${route.path}`, { method: 'GET' });
      const elapsed = Math.round(performance.now() - start);
      const isOk = res.status === 200;
      const isFast = elapsed <= route.maxMs;

      if (isOk && isFast) {
        console.log(`\x1b[32m[PASS]\x1b[0m ${route.label.padEnd(38)} | HTTP ${res.status} | ${elapsed}ms`);
        passed++;
      } else if (isOk && !isFast) {
        console.log(`\x1b[33m[WARN]\x1b[0m ${route.label.padEnd(38)} | HTTP ${res.status} | ${elapsed}ms (Exceeded ${route.maxMs}ms budget)`);
        passed++;
      } else {
        console.log(`\x1b[31m[FAIL]\x1b[0m ${route.label.padEnd(38)} | HTTP ${res.status} | ${elapsed}ms`);
        failed++;
      }
    } catch (err) {
      console.log(`\x1b[31m[CRIT]\x1b[0m ${route.label.padEnd(38)} | Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n-------------------------------------------------------------------');
  console.log(`Audit Summary: ${passed} Passed, ${failed} Failed out of ${ROUTES.length} Routes`);
  console.log('-------------------------------------------------------------------\n');

  if (failed > 0) process.exit(1);
}

runAudit();
