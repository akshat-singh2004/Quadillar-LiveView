const fs = require('fs');
const path = require('path');

function getAllFiles(dir, exts) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, exts));
    } else if (exts.some(ext => file.endsWith(ext))) {
      results.push(filePath);
    }
  });
  return results;
}

const appDir = path.join(process.cwd(), 'app');
const appFiles = getAllFiles(appDir, ['.tsx', '.ts']);
const hrefRegex = /href=[\"'](\/[a-zA-Z0-9\-_/?=&#]+)[\"']/g;
const linksFound = new Set();
const linkOccurrences = {};

appFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = hrefRegex.exec(content)) !== null) {
    const cleanRoute = match[1].split('?')[0].split('#')[0];
    linksFound.add(cleanRoute);
    if (!linkOccurrences[cleanRoute]) linkOccurrences[cleanRoute] = [];
    linkOccurrences[cleanRoute].push(path.relative(process.cwd(), file));
  }
});

console.log('Total unique internal routes linked:', linksFound.size);

const orphaned = [];
linksFound.forEach(route => {
  if (route === '/' || route.startsWith('/_next') || route.startsWith('/api') || route.startsWith('/archive')) return;
  const routeParts = route.split('/').filter(Boolean);
  const possiblePaths = [
    path.join(appDir, ...routeParts, 'page.tsx'),
    path.join(appDir, ...routeParts, 'page.jsx'),
    path.join(appDir, ...routeParts, 'route.ts'),
    path.join(appDir, ...routeParts, 'route.js'),
    path.join(appDir, ...routeParts) + '.tsx',
  ];
  const exists = possiblePaths.some(p => fs.existsSync(p));
  if (!exists) {
    orphaned.push({ route, sources: linkOccurrences[route] });
  }
});

console.log('\n--- ORPHANED ROUTES REPORT ---');
if (orphaned.length === 0) {
  console.log('Zero orphaned routes found!');
} else {
  orphaned.forEach(o => {
    console.log(`[ORPHAN] ${o.route} (linked in: ${o.sources.slice(0, 3).join(', ')}${o.sources.length > 3 ? '...' : ''})`);
  });
}
