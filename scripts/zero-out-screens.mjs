import fs from "fs";
import path from "path";

console.log("\n================================================================================");
console.log("       QUADILLAR LIVEVIEW — ZEROING OUT ALL 6 SCREEN METRICS & MOCKS            ");
console.log("================================================================================\n");

// 1. FIX app/finance/ipc/page.tsx
const ipcPath = path.resolve(process.cwd(), "app/finance/ipc/page.tsx");
if (fs.existsSync(ipcPath)) {
  let code = fs.readFileSync(ipcPath, "utf-8");
  code = code.replace(/24875400/g, "0");
  code = code.replace(/5960320/g, "0");
  code = code.replace(/1490080/g, "0");
  code = code.replace(/17425000/g, "0");
  code = code.replace(/7450400/g, "0");
  code = code.replace(/372520/g, "0");
  code = code.replace(/745040/g, "0");
  code = code.replace(/74504/g, "0");
  code = code.replace(/149008/g, "0");
  code = code.replace(/₹\s*2,48,75,400\.00/g, "₹0.00");
  code = code.replace(/₹\s*59,60,320\.00/g, "₹0.00");
  code = code.replace(/-₹\s*14,90,080\.00/g, "-₹0.00");
  code = code.replace(/₹\s*1,74,25,000\.00/g, "₹0.00");
  code = code.replace(/₹\s*74,50,400\.00/g, "₹0.00");
  code = code.replace(/-₹\s*3,72,520\.00/g, "-₹0.00");
  code = code.replace(/-₹\s*7,45,040\.00/g, "-₹0.00");
  code = code.replace(/-₹\s*74,504\.00/g, "-₹0.00");
  code = code.replace(/-₹\s*1,49,008\.00/g, "-₹0.00");
  fs.writeFileSync(ipcPath, code, "utf-8");
  console.log("✓ Zeroed out app/finance/ipc/page.tsx");
}

// 2. FIX app/safety/ptw/page.tsx (Safe man hours 1,77,429 Hrs)
const ptwPath = path.resolve(process.cwd(), "app/safety/ptw/page.tsx");
if (fs.existsSync(ptwPath)) {
  let code = fs.readFileSync(ptwPath, "utf-8");
  code = code.replace(/1,77,429\s*Hrs/g, "0 Hrs");
  code = code.replace(/177429/g, "0");
  code = code.replace(/147\s*Days\s*Zero\s*Harm/g, "0 Days Recorded");
  fs.writeFileSync(ptwPath, code, "utf-8");
  console.log("✓ Zeroed out app/safety/ptw/page.tsx");
}

// 3. FIX app/site/dpr/page.tsx (Weather & default trade roster)
const dprPath = path.resolve(process.cwd(), "app/site/dpr/page.tsx");
if (fs.existsSync(dprPath)) {
  let code = fs.readFileSync(dprPath, "utf-8");
  code = code.replace(/Clear\s*\/\s*32°C\s*\|\s*8\.5\s*Hrs/g, "Pending Weather Log");
  code = code.replace(/const\s+DEFAULT_TRADES:[^=]+=\s*\[[\s\S]*?\];/g, "const DEFAULT_TRADES: any[] = [];");
  fs.writeFileSync(dprPath, code, "utf-8");
  console.log("✓ Zeroed out app/site/dpr/page.tsx");
}

// 4. FIX app/site/gate-inward/page.tsx (Tonnage 482.65 MT)
const gatePath = path.resolve(process.cwd(), "app/site/gate-inward/page.tsx");
if (fs.existsSync(gatePath)) {
  let code = fs.readFileSync(gatePath, "utf-8");
  code = code.replace(/482\.65\s*MT/g, "0.00 MT");
  code = code.replace(/482\.65/g, "0");
  code = code.replace(/480\.00\s*MT/g, "0.00 MT");
  fs.writeFileSync(gatePath, code, "utf-8");
  console.log("✓ Zeroed out app/site/gate-inward/page.tsx");
}

// 5. FIX app/drawings/redlines/page.tsx (Spatial pins)
const redlinesPath = path.resolve(process.cwd(), "app/drawings/redlines/page.tsx");
if (fs.existsSync(redlinesPath)) {
  let code = fs.readFileSync(redlinesPath, "utf-8");
  code = code.replace(/const\s+INITIAL_PINS:[^=]+=\s*\[[\s\S]*?\];/g, "const INITIAL_PINS: any[] = [];");
  fs.writeFileSync(redlinesPath, code, "utf-8");
  console.log("✓ Zeroed out app/drawings/redlines/page.tsx");
}

// 6. FIX app/schedule/gantt/page.tsx (Gantt schedule progress & WBS items)
const ganttPath = path.resolve(process.cwd(), "app/schedule/gantt/page.tsx");
if (fs.existsSync(ganttPath)) {
  let code = fs.readFileSync(ganttPath, "utf-8");
  code = code.replace(/71%/g, "0%");
  code = code.replace(/\+2\s*Days/g, "0 Days");
  code = code.replace(/4\s*Tasks/g, "0 Tasks");
  code = code.replace(/2\/5/g, "0/0");
  code = code.replace(/const\s+INITIAL_WBS:[^=]+=\s*\[[\s\S]*?\];/g, "const INITIAL_WBS: any[] = [];");
  code = code.replace(/const\s+DEFAULT_TASKS:[^=]+=\s*\[[\s\S]*?\];/g, "const DEFAULT_TASKS: any[] = [];");
  fs.writeFileSync(ganttPath, code, "utf-8");
  console.log("✓ Zeroed out app/schedule/gantt/page.tsx");
}

console.log("\n================================================================================");
console.log("                    ALL 6 SCREENS ARE NOW PURGED TO ZERO                        ");
console.log("================================================================================\n");
