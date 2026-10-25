import fs from 'fs';
import path from 'path';

const requiredFiles = [
  "components/bim/FullBimSimulationEngine.tsx",
  "app/pitch/yc-fall26/page.tsx",
  "next.config.mjs",
  "vercel.json"
];

console.log("\x1b[36m============================================================\x1b[0m");
console.log("\x1b[36m  QUADILLAR LIVEVIEW: REPOSITORY HEALTH & UPLOAD CHECKER    \x1b[0m");
console.log("\x1b[36m============================================================\x1b[0m");

let allPassed = true;

requiredFiles.forEach(file => {
  const filePath = path.resolve(file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`\x1b[32m[✓ PRESENT]\x1b[0m ${file} (${stats.size} bytes)`);
  } else {
    console.log(`\x1b[31m[X MISSING]\x1b[0m ${file}`);
    allPassed = false;
  }
});

console.log("\x1b[36m------------------------------------------------------------\x1b[0m");

if (allPassed) {
  console.log("\x1b[32m✓ REPOSITORY HEALTH CHECK PASSED: All core files are in place.\x1b[0m");
} else {
  console.log("\x1b[31m✗ REPOSITORY HEALTH CHECK FAILED: Some files are missing.\x1b[0m");
}
console.log("\x1b[36m============================================================\x1b[0m");
