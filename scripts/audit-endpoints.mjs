const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const ROUTES = [
  { path: '/dashboard', label: 'Command Spine (Dashboard)', maxMs: 1500 },
  { path: '/operations/gate-register', label: 'Material Gate Register (GDN)', maxMs: 1200 },
  { path: '/operations/dpr', label: 'Daily Progress Reports (DPR)', maxMs: 1200 },
  { path: '/safety/ptw', label: 'Permit to Work (PTW)', maxMs: 1000 },
  { path: '/safety/formwork-stripping', label: 'Formwork Stripping Clearance', maxMs: 1000 },
  { path: '/quality/pour-cards', label: 'Concrete Pour Cards', maxMs: 1200 },
  { path: '/quality/cube-tests', label: 'IS 516 Cube Crushing Tests', maxMs: 1200 },
  { path: '/quality/ncr', label: 'Non-Conformance Reports (NCR)', maxMs: 1000 },
  { path: '/finance/measurement-book', label: 'Digital Measurement Book (MB)', maxMs: 1200 },
  { path: '/finance/ra-bills', label: 'Subcontractor RA Bills & IPC', maxMs: 1500 },
  { path: '/reports/audit', label: 'PMC Weekly Compliance Dossier', maxMs: 2000 },
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
        console.log(`\x1b[32m[PASS]\x1b[0m ${route.label.padEnd(35)} | HTTP ${res.status} | ${elapsed}ms`);
        passed++;
      } else if (isOk && !isFast) {
        console.log(`\x1b[33m[WARN]\x1b[0m ${route.label.padEnd(35)} | HTTP ${res.status} | ${elapsed}ms (Exceeded ${route.maxMs}ms budget)`);
        passed++;
      } else {
        console.log(`\x1b[31m[FAIL]\x1b[0m ${route.label.padEnd(35)} | HTTP ${res.status} | ${elapsed}ms`);
        failed++;
      }
    } catch (err) {
      console.log(`\x1b[31m[CRIT]\x1b[0m ${route.label.padEnd(35)} | Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n---------------------------------------------------------');
  console.log(`Audit Summary: ${passed} Passed, ${failed} Failed out of ${ROUTES.length} Routes`);
  console.log('---------------------------------------------------------\n');

  if (failed > 0) process.exit(1);
}

runAudit();
