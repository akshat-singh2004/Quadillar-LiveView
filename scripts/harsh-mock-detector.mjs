import fs from 'node:fs';
import path from 'node:path';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m'
};

const searchDirs = ['app', 'components', 'lib', 'data', 'config'];
const targets = [
  { pattern: /45\s*(cr|crore|00,00,000)/i, label: 'Hardcoded 45 Cr Contract/Budget' },
  { pattern: /gomti[-_\s]nagar/i, label: 'Hardcoded Gomti Nagar Identifier' },
  { pattern: /(mock|dummy|sample|seed)[\w]*\s*=\s*(\[|\{)/i, label: 'Static Mock Object/Array Definition' },
  { pattern: /\?\?\s*(mock|dummy|default|initial|sample)[\w]*/i, label: 'Fallback Nullish Coalesce to Mock' },
  { pattern: /\:\s*(mock|dummy|default|initial|sample)[\w]*/i, label: 'Fallback Ternary to Mock Data' },
  { pattern: /(crane|geofence|anemometer).*(\[|\{)/i, label: 'Hardcoded Crane/GIS Coordinates' },
  { pattern: /(ptw|permit).*(\[|\{).*issued/i, label: 'Hardcoded PTW Entry' },
  { pattern: /gang\s*output.*100/i, label: 'Hardcoded 100% Gang Output' },
  { pattern: /merkle|section\s*65b.*(\[|\{)/i, label: 'Hardcoded Section 65B Ledger Mock' }
];

console.log(`\n${C.bold}${C.red}======================================================================${C.reset}`);
console.log(`${C.bold}${C.red}  HARSH CODEBASE AUDIT: HARDCODED FRONTEND MOCKS & FALLBACKS  ${C.reset}`);
console.log(`${C.bold}${C.red}======================================================================${C.reset}\n`);

let totalDetections = 0;

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(entry.name)) {
        walkDir(fullPath);
      }
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    targets.forEach(({ pattern, label }) => {
      if (pattern.test(line)) {
        totalDetections++;
        const lineNum = String(index + 1).padStart(4, ' ');
        console.log(`${C.magenta}${filePath}:${lineNum}${C.reset} - ${C.yellow}${label}${C.reset}`);
        console.log(`  ${C.gray}${line.trim().slice(0, 110)}${C.reset}\n`);
      }
    });
  });
}

searchDirs.forEach(dir => walkDir(path.resolve(process.cwd(), dir)));

console.log(`${C.bold}${C.red}======================================================================${C.reset}`);
console.log(`  Total Hardcoded Mock/Fallback Signatures Found: ${C.bold}${C.red}${totalDetections}${C.reset}`);
console.log(`${C.bold}${C.red}======================================================================${C.reset}\n`);
