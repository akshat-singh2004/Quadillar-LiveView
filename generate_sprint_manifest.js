const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const agentsDir = path.join(rootDir, "lib", "agents");
const outputFile = path.join(rootDir, "sprint_agents_manifest.txt");

if (!fs.existsSync(agentsDir)) {
  console.error(`[-] Error: Directory ${agentsDir} does not exist.`);
  process.exit(1);
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allAgentFiles = getAllFiles(agentsDir);
allAgentFiles.sort();

let manifestContent = `========================================================================================
QUADILLAR DIGITAL GOVERNANCE COUNCIL: AGENTS & SUB-AGENTS COMPLETE CODEBASE MANIFEST
Generated at: ${new Date().toISOString()} | Target: sprint_agents_manifest.txt
Standards Enforced: IS 456, CIRIA C766, ASTM C1074, CPWD GCC Cl. 10CC/42, BOCW Act 1996
Total Files Captured: ${allAgentFiles.length}
========================================================================================\n\n`;

for (const filePath of allAgentFiles) {
  const relativePath = path.relative(rootDir, filePath);
  const content = fs.readFileSync(filePath, "utf8");
  const lineCount = content.split("\n").length;

  manifestContent += `========================================================================================\n`;
  manifestContent += `FILE: ${relativePath}\n`;
  manifestContent += `LINES: ${lineCount}\n`;
  manifestContent += `========================================================================================\n`;
  manifestContent += content;
  manifestContent += `\n\n`;
}

fs.writeFileSync(outputFile, manifestContent, "utf8");

// Also create council_agents_and_subagents_manifest.txt as an identical mirror
fs.writeFileSync(path.join(rootDir, "council_agents_and_subagents_manifest.txt"), manifestContent, "utf8");

const stats = fs.statSync(outputFile);
console.log(`\x1b[1;32m[✓] Successfully generated: ${outputFile}\x1b[0m`);
console.log(`    Total files bundled: ${allAgentFiles.length}`);
console.log(`    File size: ${(stats.size / 1024).toFixed(2)} KB`);
