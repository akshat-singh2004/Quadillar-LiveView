import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'app/page.tsx');
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace common falsy fallbacks for 45 Cr
  content = content.replace(/contract_value\s*\|\|\s*45/g, 'contract_value ?? 0');
  content = content.replace(/contract_value\s*\?\s*`₹\$\{.*?\}\s*Cr`\s*:\s*["']₹45\.00\s*Cr["']/g, 
    '(project?.contract_value !== undefined && project?.contract_value !== null) ? `₹${Number(project.contract_value).toFixed(2)} Cr` : "₹0.00 Cr"');
  content = content.replace(/["']₹45\.00\s*Cr["']/g, '"₹0.00 Cr"');
  content = content.replace(/Contract Baseline:\s*₹45\.00\s*Cr/g, 'Contract Baseline: ₹${Number(projectRow?.contract_value || 0).toFixed(2)} Cr');

  fs.writeFileSync(file, content, 'utf8');
  console.log("✓ Patched app/page.tsx to respect zero-state contract baseline.");
} else {
  console.log("File app/page.tsx not found.");
}
