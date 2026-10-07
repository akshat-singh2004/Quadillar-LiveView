#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Creating directory app/governance/arbitration/petition...\033[0m"
mkdir -p app/governance/arbitration/petition

cat << 'PAGE_PETITION' > app/governance/arbitration/petition/page.tsx
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { Scale, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function Section9PetitionPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  const [dossierRes, hindrancesRes, certRes] = await Promise.all([
    supabase.from("arbitral_dispute_dossiers").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("site_hindrance_register").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(5),
    supabase.from("section_65b_certificates").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const dossier = dossierRes.data;
  const hindrances = hindrancesRes.data || [];
  const cert65b = certRes.data;

  const claimant = dossier?.claimant_entity || "Quadillar ConTech Pvt. Ltd. (Lead EPC Contractor)";
  const respondent = dossier?.respondent_entity || "State Infrastructure & Buildings Department";
  const quantum = dossier?.claimed_quantum_inr ? Number(dossier.claimed_quantum_inr).toLocaleString("en-IN") : "3,50,00,000";
  const delayDays = dossier?.delay_days_claimed || 42;
  const certNumber = dossier?.section_65b_certificate_no || cert65b?.certificate_number || "SEC65B-ARB-2026";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-mono text-xs select-none space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-zinc-800 pb-4 print:hidden">
        <div className="flex items-center gap-2">
          <Link href="/governance/arbitration" className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-[10px] text-indigo-400 uppercase tracking-widest font-bold">
              <Scale className="w-3.5 h-3.5" />
              <span>JUDICIAL EVIDENCE PLEADING • HIGH COURT OF JUDICATURE</span>
            </div>
            <h1 className="text-base font-bold text-white uppercase">
              Section 9 Petition for Interim Measures of Protection
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto bg-zinc-900 border border-zinc-800 p-8 md:p-14 rounded-2xl shadow-2xl space-y-8 text-zinc-200 font-serif leading-relaxed text-sm print:bg-white print:text-black">
        <div className="text-center space-y-1.5 uppercase font-sans">
          <p className="tracking-widest font-bold text-xs text-zinc-400">IN THE HIGH COURT OF JUDICATURE AT LUCKNOW</p>
          <p className="text-xs font-semibold text-zinc-400">ORDINARY ORIGINAL CIVIL JURISDICTION</p>
          <h2 className="text-base font-bold tracking-wider pt-2 border-b border-zinc-700 pb-2">
            ARBITRATION PETITION (INTERIM MEASURES) NO. _______ OF 2026
          </h2>
        </div>

        <div className="space-y-4 font-sans text-xs">
          <div className="flex justify-between items-start">
            <div>
              <strong className="block text-white text-sm">{claimant}</strong>
              <span className="text-zinc-400">Registered Office: Gomti Nagar Extension, Lucknow, UP</span>
            </div>
            <strong className="tracking-wider uppercase text-zinc-300">... PETITIONER / CLAIMANT</strong>
          </div>
          <div className="text-center font-bold text-zinc-500 uppercase tracking-widest">VERSUS</div>
          <div className="flex justify-between items-start">
            <div>
              <strong className="block text-white text-sm">{respondent}</strong>
              <span className="text-zinc-400">Through Executive Engineer, Provincial Division</span>
            </div>
            <strong className="tracking-wider uppercase text-zinc-300">... RESPONDENT</strong>
          </div>
        </div>

        <div className="space-y-4 text-justify leading-relaxed text-[13px]">
          <p><strong>MOST RESPECTFULLY SHOWETH:</strong></p>
          <p>
            <strong>1.</strong> That the Petitioner is executing engineering works for Project <em>{projectName}</em> (Code: <code>{projectId}</code>).
          </p>
          <p>
            <strong>2. CONTEMPORANEOUS FORENSICS &amp; EVIDENCE:</strong> Automated IS 456 testing, CIRIA thermal records, and SCL delay analyses prove that critical delays of <strong>+{delayDays} Calendar Days</strong> are solely employer-risk events. Total disputed quantum at risk stands at <strong>₹{quantum}</strong>.
          </p>
          <p>
            <strong>3. SECTION 65B CERTIFICATION:</strong> This pleading is electronically authenticated under Section 65B of the Indian Evidence Act via Certificate <code>{certNumber}</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
PAGE_PETITION

echo -e "\033[1;36m[+] Verifying TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;36m[+] Appending app/governance/arbitration/petition/page.tsx to council_governance_source_bundle.txt...\033[0m"
{
  echo ""
  echo "================================================================================"
  echo " FILE: app/governance/arbitration/petition/page.tsx"
  echo "================================================================================"
  cat app/governance/arbitration/petition/page.tsx
  echo ""
} >> council_governance_source_bundle.txt

TOTAL_LINES=$(wc -l < council_governance_source_bundle.txt)
FILE_SIZE=$(du -h council_governance_source_bundle.txt | cut -f1)

echo -e "\033[1;32m[✓] Bundle updated successfully: ${TOTAL_LINES} lines (${FILE_SIZE}) at ./council_governance_source_bundle.txt\033[0m"
