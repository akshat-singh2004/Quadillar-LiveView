// scripts/audit-project.mjs
import fs from "fs";
import path from "path";

const SCAN_DIRS = ["app", "components", "lib"];
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

// ANSI Color Codes for Terminal Output
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

// Audit Rule Definitions
const RULES = [
    {
        id: "SCHEMA-NONEXISTENT-TABLE",
        name: "Non-Existent Table Query: boq_subheads",
        regex: /from\(["']boq_subheads["']\)|boq_subheads\s*\(/g,
        severity: "CRITICAL",
        message: "Table 'boq_subheads' does not exist in Supabase and will crash with schema cache errors.",
    },
    {
        id: "SCHEMA-OBSOLETE-TABLE-MB",
        name: "Obsolete Table Query: measurement_book_entries",
        regex: /from\(["']measurement_book_entries["']\)/g,
        severity: "CRITICAL",
        message: "Use 'digital_measurement_book_entries'. 'measurement_book_entries' fails on non-UUID project IDs.",
    },
    {
        id: "SCHEMA-OBSOLETE-TABLE-PROFILES",
        name: "Mismatched Table Query: profiles",
        regex: /from\(["']profiles["']\)/g,
        severity: "HIGH",
        message: "User profile table in database is 'user_profiles'.",
    },
    {
        id: "SCHEMA-OBSOLETE-TABLE-LEDGERS",
        name: "Non-Existent Table Query: statutory_ledgers",
        regex: /from\(["']statutory_ledgers["']\)/g,
        severity: "HIGH",
        message: "Table 'statutory_ledgers' does not exist. Query 'ra_bills' or 'running_account_bills' instead.",
    },
    {
        id: "LAYOUT-DUPLICATE-SHELL",
        name: "Nested Layout Sidebar Mounting",
        custom: (filePath, content) => {
            const normalized = filePath.replace(/\\/g, "/");
            if (normalized.endsWith("app/layout.tsx")) return null;
            if (normalized.includes("/layout.tsx") && /<Sidebar\s*\/?>|from\s+["'].*Sidebar["']/.test(content)) {
                return "Duplicate <Sidebar /> imported in sub-route layout. Root layout already wraps pages.";
            }
            return null;
        },
        severity: "CRITICAL",
    },
    {
        id: "MOCK-DATA-HARDCODED",
        name: "Hardcoded Mock Array Remnant",
        regex: /const\s+(CUBE_REGISTER|NCR_LEDGER|DEFAULT_PERMITS|DRAWING_PACKAGES)\s*:\s*[^=]+=\s*\[/g,
        severity: "WARN",
        message: "File still defines mock data arrays. Ensure production pages query live Supabase tables.",
    },
    {
        id: "CLIENT-SERVER-CLIENT-IMPORT",
        name: "Client Component Using Server Supabase Client",
        custom: (filePath, content) => {
            if (content.includes('"use client"') && content.includes("@/lib/supabase/server")) {
                return "Client components cannot import createClient from server-side modules.";
            }
            return null;
        },
        severity: "CRITICAL",
    },
];

function getFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== ".git") {
                getFiles(fullPath, files);
            }
        } else if (EXTENSIONS.includes(path.extname(entry.name))) {
            files.push(fullPath);
        }
    }
    return files;
}

function runAudit() {
    console.log(`\n${BOLD}${CYAN}======================================================${RESET}`);
    console.log(`${BOLD}${CYAN}   QUADILLAR LIVEVIEW — SYSTEM HEALTH & SCHEMA AUDIT  ${RESET}`);
    console.log(`${BOLD}${CYAN}======================================================${RESET}\n`);

    let totalFilesChecked = 0;
    let criticalCount = 0;
    let highCount = 0;
    let warnCount = 0;
    const issues = [];

    for (const dir of SCAN_DIRS) {
        const files = getFiles(path.resolve(process.cwd(), dir));
        for (const filePath of files) {
            totalFilesChecked++;
            const content = fs.readFileSync(filePath, "utf-8");
            const relativePath = path.relative(process.cwd(), filePath);
            const lines = content.split("\n");

            for (const rule of RULES) {
                if (rule.regex) {
                    rule.regex.lastIndex = 0;
                    let match;
                    while ((match = rule.regex.exec(content)) !== null) {
                        const lineNum = content.substring(0, match.index).split("\n").length;
                        issues.push({
                            file: relativePath,
                            line: lineNum,
                            ruleId: rule.id,
                            severity: rule.severity,
                            ruleName: rule.name,
                            message: rule.message,
                            snippet: lines[lineNum - 1]?.trim(),
                        });
                        if (rule.severity === "CRITICAL") criticalCount++;
                        else if (rule.severity === "HIGH") highCount++;
                        else if (rule.severity === "WARN") warnCount++;
                    }
                } else if (rule.custom) {
                    const customErr = rule.custom(relativePath, content);
                    if (customErr) {
                        issues.push({
                            file: relativePath,
                            line: 1,
                            ruleId: rule.id,
                            severity: rule.severity,
                            ruleName: rule.name,
                            message: customErr,
                            snippet: "Sub-layout component tree",
                        });
                        if (rule.severity === "CRITICAL") criticalCount++;
                        else if (rule.severity === "HIGH") highCount++;
                        else if (rule.severity === "WARN") warnCount++;
                    }
                }
            }
        }
    }

    // Print Issues
    if (issues.length > 0) {
        console.log(`${BOLD}Audit Findings (${issues.length}):${RESET}\n`);
        for (const issue of issues) {
            const color =
                issue.severity === "CRITICAL" ? RED : issue.severity === "HIGH" ? YELLOW : CYAN;
            console.log(
                `${color}${BOLD}[${issue.severity}]${RESET} ${BOLD}${issue.file}:${issue.line}${RESET}`
            );
            console.log(`  ${BOLD}Rule:${RESET} ${issue.ruleName} (${issue.ruleId})`);
            console.log(`  ${BOLD}Issue:${RESET} ${issue.message}`);
            if (issue.snippet) {
                console.log(`  ${BOLD}Code:${RESET}  ${issue.snippet}`);
            }
            console.log("");
        }
    }

    // Summary Report
    console.log(`${BOLD}${CYAN}------------------------------------------------------${RESET}`);
    console.log(`${BOLD}Scan Complete:${RESET} ${totalFilesChecked} files audited.`);
    console.log(
        `Status: ${criticalCount > 0
            ? `${RED}${BOLD}FAILED${RESET}`
            : highCount > 0
                ? `${YELLOW}${BOLD}WARNINGS FOUND${RESET}`
                : `${GREEN}${BOLD}PASSED — PRODUCTION READY${RESET}`
        }`
    );
    console.log(`  • Critical Errors: ${criticalCount > 0 ? RED : GREEN}${criticalCount}${RESET}`);
    console.log(`  • High Warnings:   ${highCount > 0 ? YELLOW : GREEN}${highCount}${RESET}`);
    console.log(`  • Review Items:    ${warnCount > 0 ? CYAN : GREEN}${warnCount}${RESET}`);
    console.log(`${BOLD}${CYAN}======================================================${RESET}\n`);

    if (criticalCount > 0) {
        process.exit(1);
    }
}

runAudit();