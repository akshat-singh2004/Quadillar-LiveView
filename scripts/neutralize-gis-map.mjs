import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'components/gis/SiteGeospatialMap.tsx');
if (fs.existsSync(file)) {
  let code = fs.readFileSync(file, 'utf8');

  // 1. Clear static boundaries array
  code = code.replace(
    /const (?:defaultBoundaries|boundaries)[^=]*=\s*\[[\s\S]*?\];/m,
    'const boundaries: any[] = [];'
  );

  // 2. Clear static zones array
  code = code.replace(
    /const (?:defaultZones|zones)[^=]*=\s*\[[\s\S]*?\];/m,
    'const zones: any[] = [];'
  );

  // 3. Fallback any prop fallbacks referencing Gomti Nagar mock geometry
  code = code.replace(/boundaries\s*\|\|\s*defaultBoundaries/g, 'boundaries || []');
  code = code.replace(/zones\s*\|\|\s*defaultZones/g, 'zones || []');

  fs.writeFileSync(file, code, 'utf8');
  console.log("✓ Successfully neutralized hardcoded SVG geometry in SiteGeospatialMap.tsx");
} else {
  console.log("File components/gis/SiteGeospatialMap.tsx not found.");
}
