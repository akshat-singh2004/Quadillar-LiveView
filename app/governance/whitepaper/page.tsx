import React from "react";
import { FileText, Download, Printer, ArrowLeft, ShieldCheck, Scale, Cpu, Layers } from "lucide-react";
import Link from "next/link";
import fs from "fs";
import path from "path";

export default async function WhitepaperPage() {
  const specPath = path.resolve(process.cwd(), "docs/QUADILLAR_LIVEVIEW_SYSTEM_SPEC_WHITEPAPER.md");
  let whitepaperContent = "";
  try {
    if (fs.existsSync(specPath)) {
      whitepaperContent = fs.readFileSync(specPath, "utf8");
    }
  } catch {
    whitepaperContent = "# Technical Architecture Specification\nUnable to load documentation.";
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-mono text-xs select-none space-y-6">
      {/* ACTION BAR (HIDDEN IN PRINT) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-zinc-800 pb-4 print:hidden">
        <div className="flex items-center gap-2">
          <Link
            href="/governance/council"
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
              <FileText className="w-3.5 h-3.5" />
              <span>TECHNICAL WHITE PAPER • SYSTEM ARCHITECTURE SPECIFICATION</span>
            </div>
            <h1 className="text-base font-bold text-white uppercase mt-0.5">
              Quadillar LiveView: Autonomous Governance &amp; Forensics Specification
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/governance/council"
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold uppercase text-[10px] transition"
          >
            Council War Room
          </Link>
        </div>
      </div>

      {/* FORMAL WHITEPAPER CONTAINER (PRINT OPTIMIZED) */}
      <div className="max-w-4xl mx-auto bg-zinc-900 border border-zinc-800 p-8 md:p-14 rounded-2xl shadow-2xl space-y-8 text-zinc-200 font-sans leading-relaxed text-sm print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        {/* HEADER BLOCK */}
        <div className="border-b border-zinc-800 pb-6 print:border-black space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 print:text-black text-xs font-mono font-bold uppercase tracking-wider">
            <Cpu className="w-4 h-4" />
            <span>Platform Specification Document • Section 65B Certified</span>
          </div>
          <h1 className="text-2xl font-bold text-white print:text-black uppercase tracking-tight">
            Quadillar LiveView: Autonomous Digital Governance Operating System
          </h1>
          <p className="text-xs text-zinc-400 print:text-gray-600 font-mono">
            Compliant with Indian Evidence Act 1872 (Sec. 65B) / BSA 2023 • FIDIC Red Book • CPWD Works Manual • IS 456 • CIRIA C766
          </p>
        </div>

        {/* METRICS & OVERVIEW CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs print:grid-cols-4">
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl print:bg-gray-100 print:border-gray-300">
            <span className="text-[10px] text-zinc-500 uppercase block font-bold">Autonomous Nodes</span>
            <strong className="text-base text-cyan-400 print:text-black">10 Governors</strong>
          </div>
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl print:bg-gray-100 print:border-gray-300">
            <span className="text-[10px] text-zinc-500 uppercase block font-bold">Cryptographic Base</span>
            <strong className="text-base text-emerald-400 print:text-black">SHA-256 Merkle</strong>
          </div>
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl print:bg-gray-100 print:border-gray-300">
            <span className="text-[10px] text-zinc-500 uppercase block font-bold">Field Ingress Feeds</span>
            <strong className="text-base text-amber-400 print:text-black">5 Protocols</strong>
          </div>
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl print:bg-gray-100 print:border-gray-300">
            <span className="text-[10px] text-zinc-500 uppercase block font-bold">PWA Continuity</span>
            <strong className="text-base text-white print:text-black">IndexedDB FIFO</strong>
          </div>
        </div>

        {/* WHITEPAPER NARRATIVE */}
        <div className="space-y-6 text-justify text-[13px] leading-relaxed text-zinc-300 print:text-black">
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase text-white print:text-black font-mono border-b border-zinc-800 print:border-black pb-1">
              1. The Construction Governance Dilemma
            </h2>
            <p>
              The structural failure of mega-scale engineering delivery originates from unverified manual records. Whether during structural concrete fractures, critical path float slippage, or subcontractor wage defaults, physical reality is separated from commercial administration. By the time disputes reach arbitration tribunals, crucial contemporaneous delay notices under FIDIC Clause 20.1 have expired, leaving contractors exposed to unilateral Liquidated Damages deductions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase text-white print:text-black font-mono border-b border-zinc-800 print:border-black pb-1">
              2. The 10 Council Governors &amp; Mathematical Baselines
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px] border border-zinc-800 print:border-black">
                <thead className="bg-zinc-950 print:bg-gray-200 border-b border-zinc-800 print:border-black">
                  <tr>
                    <th className="p-2 text-white print:text-black">Governor</th>
                    <th className="p-2 text-white print:text-black">Domain</th>
                    <th className="p-2 text-white print:text-black">Statutory Standard</th>
                    <th className="p-2 text-white print:text-black">Automated Interlock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 print:divide-black">
                  <tr>
                    <td className="p-2 font-bold text-cyan-400 print:text-black">Aegis</td>
                    <td className="p-2">Structural Quality</td>
                    <td className="p-2">IS 456 Cl. 15 / Tab. 11</td>
                    <td className="p-2">Locks pour cards on cube strength deficit</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-amber-400 print:text-black">Daedalus</td>
                    <td className="p-2">Thermodynamics</td>
                    <td className="p-2">CIRIA C766 / ASTM C1074</td>
                    <td className="p-2">Flags thermal shock if ΔT &gt; 20°C</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-emerald-400 print:text-black">Argus</td>
                    <td className="p-2">HSE &amp; Weather</td>
                    <td className="p-2">IS 13367 / BOCW R. 34</td>
                    <td className="p-2">Grounds tower cranes when wind &gt; 38 km/h</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-rose-400 print:text-black">Vulcan</td>
                    <td className="p-2">Materials &amp; Steel</td>
                    <td className="p-2">CPWD GCC Cl. 42 / IS 2502</td>
                    <td className="p-2">Levies 2x penal debit on rebar waste &gt; +3%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-indigo-400 print:text-black">Plutus</td>
                    <td className="p-2">Labor &amp; Wages</td>
                    <td className="p-2">BOCW Act / Min Wages</td>
                    <td className="p-2">Debits ghost workers; audits turnstile ingress</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-purple-400 print:text-black">Ananke</td>
                    <td className="p-2">Heavy Fleet</td>
                    <td className="p-2">ISO 22400 / Form 31</td>
                    <td className="p-2">Audits plant OEE (≥85%) &amp; fuel pilferage</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-yellow-400 print:text-black">Midas</td>
                    <td className="p-2">Commercial Escrow</td>
                    <td className="p-2">FIDIC Cl. 14 / CPWD Cl. 7</td>
                    <td className="p-2">5-Tier statutory withholding on gross IPCs</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-blue-400 print:text-black">Chronos</td>
                    <td className="p-2">4D Schedule</td>
                    <td className="p-2">SCL Delay Protocol</td>
                    <td className="p-2">Contemporaneous Time Impact Analysis (TIA)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-red-400 print:text-black">Themis</td>
                    <td className="p-2">Legal &amp; Claims</td>
                    <td className="p-2">Arbitration Act 1996</td>
                    <td className="p-2">High Court Section 9 petition generation</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-teal-400 print:text-black">Minerva</td>
                    <td className="p-2">3D Spatial BIM</td>
                    <td className="p-2">ISO 19650-2 / PAS 1192</td>
                    <td className="p-2">3D AABB clash detection locks pour authorization</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase text-white print:text-black font-mono border-b border-zinc-800 print:border-black pb-1">
              3. Section 65B Cryptographic Evidence Engine (Hermes)
            </h2>
            <p>
              Electronic records logged by Quadillar LiveView are anchored in cryptographic Merkle blocks. Each transaction incorporates the previous block hash, a canonical SHA-256 digest of the payload, the timestamp, and the actor’s cryptographic signature. In judicial proceedings, this eliminates objections regarding document tampering and guarantees admissibility in High Court arbitral disputes.
            </p>
          </section>
        </div>

        {/* SIGN-OFF & CERTIFICATION BLOCK */}
        <div className="border-t border-zinc-800 print:border-black pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-xs font-mono">
          <div>
            <span className="text-zinc-500 uppercase block text-[10px]">Architectural Forensics Stamp:</span>
            <strong className="text-white print:text-black">Quadillar ConTech Pvt. Ltd.</strong>
            <span className="text-zinc-400 print:text-gray-600 block text-[10px]">FOAP Incubation Cell, Lucknow, UP</span>
          </div>

          <div className="text-right sm:text-right">
            <span className="text-zinc-500 uppercase block text-[10px]">Lead System Architect:</span>
            <strong className="text-emerald-400 print:text-black">Akshat Singh Rathore</strong>
            <span className="text-zinc-400 print:text-gray-600 block text-[10px]">Founder &amp; CEO, Quadillar ConTech</span>
          </div>
        </div>
      </div>
    </div>
  );
}
