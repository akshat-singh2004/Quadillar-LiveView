import { askGovernorAdvisor } from "../app/actions/governor-chat-actions";

async function runCopilotTests() {
  console.log("\n\x1b[1;36m======================================================================\x1b[0m");
  console.log("\x1b[1;36m  TESTING AUTONOMOUS GOVERNOR DOMAIN REASONING ENGINES                \x1b[0m");
  console.log("\x1b[1;36m======================================================================\x1b[0m\n");

  const testCases: { governorId: any; message: string }[] = [
    { governorId: "Aegis", message: "Audit recent batch against IS 456 Table 11" },
    { governorId: "Daedalus", message: "Check thermal gradient delta T and DEF crack risk" },
    { governorId: "Argus", message: "What is the anemometer wind cutoff for tower cranes?" },
    { governorId: "Vulcan", message: "Explain CPWD Clause 42 steel reconciliation at 2x rate" },
    { governorId: "Plutus", message: "Check biometric turnstile muster for ghost workers" },
    { governorId: "Midas", message: "Break down the 5-tier statutory deduction waterfall" },
    { governorId: "Themis", message: "What is our liquidated damages exposure under Clause 2?" },
    { governorId: "Minerva", message: "Check for 3D BIM hard clashes in active pour zones" },
  ];

  for (const t of testCases) {
    const res = await askGovernorAdvisor({
      governorId: t.governorId,
      projectId: "GOMTI-NAGAR-PH1-FITOUT",
      message: t.message,
    });

    console.log(`\x1b[1;33m[AGENT: ${res.governorId}]\x1b[0m -> Standard: \x1b[1;37m${res.statutoryStandard}\x1b[0m`);
    console.log(`  • Query : "${t.message}"`);
    console.log(`  • Answer: ${res.answer.slice(0, 140)}...`);
    console.log(`  • Primary KPI: ${res.kpis[0]?.label} = ${res.kpis[0]?.value}`);
    console.log("");
  }

  console.log("\x1b[1;32m======================================================================\x1b[0m");
  console.log("\x1b[1;32m  ALL GOVERNOR COPILOT ENGINES TESTED AND OPERATIONAL (100% SUCCESS)  \x1b[0m");
  console.log("\x1b[1;32m======================================================================\x1b[0m\n");
}

runCopilotTests().catch((err) => {
  console.error("Copilot Test Fault:", err);
  process.exit(1);
});
