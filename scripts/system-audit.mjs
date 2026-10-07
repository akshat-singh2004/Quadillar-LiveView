import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ANSI = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

console.log(`${ANSI.bold}${ANSI.cyan}================================================================${ANSI.reset}`);
console.log(`${ANSI.bold}  QUADILLAR LIVEVIEW.OS: COMPREHENSIVE ARCHITECTURAL AUDIT      ${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}================================================================${ANSI.reset}\n`);

// Helper: Recursively walk a directory
function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('.next') && !filePath.includes('.git')) {
        walkDir(filePath, fileList);
      }
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// --------------------------------------------------------------------------
// 1. EMPTY / STUB FILE DETECTION
// --------------------------------------------------------------------------
console.log(`${ANSI.bold}1. AUDITING CORRUPTED & EMPTY STUB FILES...${ANSI.reset}`);
const allSourceFiles = walkDir('.');
let stubIssues = 0;

allSourceFiles.forEach((file) => {
  if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.mjs')) {
    const stats = fs.statSync(file);
    if (stats.size < 10) {
      console.log(`  ${ANSI.red}[EMPTY STUB]${ANSI.reset} ${file} (${stats.size} bytes)`);
      stubIssues++;
    }
  }
});
if (stubIssues === 0) {
  console.log(`  ${ANSI.green}✓ Clean: Zero empty or corrupted stub files found.${ANSI.reset}\n`);
} else {
  console.log(`  ${ANSI.red}⚠ Found ${stubIssues} stub files that may break Next.js route compilation.${ANSI.reset}\n`);
}

// --------------------------------------------------------------------------
// 2. TYPESCRIPT COMPILATION AUDIT
// --------------------------------------------------------------------------
console.log(`${ANSI.bold}2. COMPILING TYPESCRIPT CHECK (npx tsc --noEmit)...${ANSI.reset}`);
try {
  const tscOut = execSync('npx tsc --noEmit', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  console.log(`  ${ANSI.green}✓ TypeScript Compilation Clean: 0 Type Errors.${ANSI.reset}\n`);
} catch (err) {
  console.log(`  ${ANSI.red}✖ TypeScript Compilation Failed:${ANSI.reset}`);
  const errLines = (err.stdout || err.stderr || '').split('\n').filter(l => l.includes('error TS'));
  errLines.slice(0, 10).forEach(l => console.log(`    ${l}`));
  if (errLines.length > 10) {
    console.log(`    ... and ${errLines.length - 10} more errors.`);
  }
  console.log('');
}

// --------------------------------------------------------------------------
// 3. SIDEBAR NAVIGATION ROUTE INTEGRITY (404 CHECK)
// --------------------------------------------------------------------------
console.log(`${ANSI.bold}3. AUDITING SIDEBAR NAVIGATION INTEGRITY (404 PREVENTION)...${ANSI.reset}`);
const sidebarPath = 'components/layout/Sidebar.tsx';
let sidebarHrefs = [];

if (fs.existsSync(sidebarPath)) {
  const content = fs.readFileSync(sidebarPath, 'utf8');
  const matches = [...content.matchAll(/href:\s*['"]([^'"]+)['"]/g)];
  sidebarHrefs = matches.map(m => m[1]);

  let brokenLinks = 0;
  sidebarHrefs.forEach(href => {
    // Exclude external anchors or query params
    const cleanPath = href.split('?')[0];
    let expectedPage = cleanPath === '/' ? 'app/page.tsx' : `app${cleanPath}/page.tsx`;
    
    // Also check for index or route aliases
    const altExpected = cleanPath === '/' ? 'app/page.js' : `app${cleanPath}/page.js`;
    
    if (!fs.existsSync(expectedPage) && !fs.existsSync(altExpected)) {
      console.log(`  ${ANSI.red}[BROKEN 404 LINK]${ANSI.reset} Sidebar points to "${href}", but neither "${expectedPage}" nor "${altExpected}" exists.`);
      brokenLinks++;
    }
  });

  if (brokenLinks === 0) {
    console.log(`  ${ANSI.green}✓ All ${sidebarHrefs.length} navigation links in Sidebar.tsx resolve to valid pages.${ANSI.reset}\n`);
  } else {
    console.log(`  ${ANSI.red}⚠ Found ${brokenLinks} broken sidebar links.${ANSI.reset}\n`);
  }
} else {
  console.log(`  ${ANSI.yellow}⚠ Sidebar file not found at ${sidebarPath}${ANSI.reset}\n`);
}

// --------------------------------------------------------------------------
// 4. VACANT / ORPHAN PAGES (PAGES NOT IN SIDEBAR)
// --------------------------------------------------------------------------
console.log(`${ANSI.bold}4. AUDITING VACANT / UNLINKED PAGES...${ANSI.reset}`);
const allPages = walkDir('app').filter(f => f.endsWith('page.tsx') || f.endsWith('page.js'));
const normalizedPages = allPages.map(p => {
  let route = p.replace(/\\/g, '/').replace(/^app/, '').replace(/\/page\.(tsx|js)$/, '');
  return route === '' ? '/' : route;
});

const unlinkedPages = normalizedPages.filter(p => !sidebarHrefs.includes(p) && !p.startsWith('/api'));
if (unlinkedPages.length > 0) {
  console.log(`  ${ANSI.yellow}ℹ Found ${unlinkedPages.length} pages that exist on disk but are NOT linked in Sidebar.tsx:${ANSI.reset}`);
  unlinkedPages.forEach(p => console.log(`    - ${p}`));
  console.log(`  ${ANSI.cyan}Tip: Consider linking them in Sidebar.tsx or removing them if obsolete.${ANSI.reset}\n`);
} else {
  console.log(`  ${ANSI.green}✓ 100% of application pages are mapped in the sidebar.${ANSI.reset}\n`);
}

// --------------------------------------------------------------------------
// 5. SUPABASE POSTGRESQL TABLE FOOTPRINT
// --------------------------------------------------------------------------
console.log(`${ANSI.bold}5. MAPPING SUPABASE DATABASE FOOTPRINT...${ANSI.reset}`);
const tableSet = new Set();
const srcFiles = walkDir('.').filter(f => 
  (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js')) &&
  !f.includes('.next') && !f.includes('node_modules')
);

srcFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const matches = [...content.matchAll(/\.from\(\s*['"]([a-zA-Z0-9_]+)['"]\s*\)/g)];
  matches.forEach(m => tableSet.add(m[1]));
});

const sortedTables = Array.from(tableSet).sort();
console.log(`  ${ANSI.cyan}Active PostgreSQL Tables queried across the frontend (${sortedTables.length}):${ANSI.reset}`);
sortedTables.forEach(t => console.log(`    • public.${t}`));

console.log(`\n${ANSI.bold}${ANSI.cyan}================================================================${ANSI.reset}`);
console.log(`${ANSI.bold}  AUDIT COMPLETE                                                ${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}================================================================${ANSI.reset}`);
