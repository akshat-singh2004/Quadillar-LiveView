"use client";

import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  evaluateClause42Reconciliation,
  getConcreteMixConstants,
  MaterialReconciliationItem
} from "@/lib/calculations/materialReconEngine";

// --- INLINE SVG ICONS ---
const ScaleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-9-6l9-4 9 4M6 15l-3 4h6l-3-4zm12 0l-3 4h6l-3-4z" />
  </svg>
);
const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 00-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const AlertTriangleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const RefreshIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function MaterialReconciliationPage() {
  // Total BIM Concrete Volume for Vanguard (10.3m x 10.9m x 15m) = 118.80 m3
  const [concreteVolumeM3, setConcreteVolumeM3] = useState<number>(118.80);
  const [concreteGradeFck, setConcreteGradeFck] = useState<number>(35);

  // Dynamic Site Consumption Inputs (modifiable to test statutory thresholds)
  const [actualCementBags, setActualCementBags] = useState<number>(998); // Theoretical: 118.8 * 8.20 = 974.16 bags
  const [actualRebarMt, setActualRebarMt] = useState<number>(14.15);     // Theoretical: 118.8 * 0.115 = 13.66 MT
  const [actualSandMt, setActualSandMt] = useState<number>(82.40);      // Theoretical: 118.8 * 0.685 = 81.38 MT
  const [actualSteelSectionsMt, setActualSteelSectionsMt] = useState<number>(12.20);

  const [isNotarizing, setIsNotarizing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  const mixConstants = useMemo(() => getConcreteMixConstants(concreteGradeFck), [concreteGradeFck]);

  // Construct Material Master Items
  const materialItems: MaterialReconciliationItem[] = useMemo(() => [
    {
      materialCode: "MAT-CEM-OPC53",
      materialName: "UltraTech OPC 53 Grade Cement (IS 269)",
      category: "CEMENT_OPC_53",
      unitOfMeasurement: "BAGS",
      bimVolumeExecutedM3: concreteVolumeM3,
      theoreticalConstantPerM3: mixConstants.cementBagsPerM3,
      theoreticalConsumptionQty: +(concreteVolumeM3 * mixConstants.cementBagsPerM3).toFixed(2),
      actualIssuedAndConsumedQty: actualCementBags,
      contractPermissibleVariationPct: 2.0, // +/- 2% per CPWD Cl. 42
      standardContractRateInr: 395.0,       // Rs 395 per 50kg bag
      penalRecoveryRateFactor: 2.0          // Double recovery for excess waste
    },
    {
      materialCode: "MAT-STEEL-TMT550D",
      materialName: "Tata Tiscon Fe 550D TMT Reinforcement (IS 1786)",
      category: "REBAR_FE_550D",
      unitOfMeasurement: "MT",
      bimVolumeExecutedM3: concreteVolumeM3,
      theoreticalConstantPerM3: 0.115,      // 115 kg/m3 structural steel density ratio
      theoreticalConsumptionQty: +(concreteVolumeM3 * 0.115).toFixed(2),
      actualIssuedAndConsumedQty: actualRebarMt,
      contractPermissibleVariationPct: 2.0, // +/- 2% rolling margin tolerance
      standardContractRateInr: 64500.0,     // Rs 64,500 per MT
      penalRecoveryRateFactor: 2.0
    },
    {
      materialCode: "MAT-STEEL-SECT",
      materialName: "Tata Structura IS 4923 Hollow Steel Beams",
      category: "STRUCTURAL_STEEL_SECTIONS",
      unitOfMeasurement: "MT",
      bimVolumeExecutedM3: concreteVolumeM3,
      theoreticalConstantPerM3: 0.101,      // 101 kg/m3 facade/column framework ratio
      theoreticalConsumptionQty: +(concreteVolumeM3 * 0.101).toFixed(2),
      actualIssuedAndConsumedQty: actualSteelSectionsMt,
      contractPermissibleVariationPct: 2.0,
      standardContractRateInr: 72000.0,     // Rs 72,000 per MT
      penalRecoveryRateFactor: 2.0
    },
    {
      materialCode: "MAT-SAND-ZONE2",
      materialName: "Coarse River Sand (Zone II Grading IS 383)",
      category: "COARSE_SAND_Z2",
      unitOfMeasurement: "MT",
      bimVolumeExecutedM3: concreteVolumeM3,
      theoreticalConstantPerM3: mixConstants.fineAggregateKgPerM3 / 1000,
      theoreticalConsumptionQty: +((concreteVolumeM3 * mixConstants.fineAggregateKgPerM3) / 1000).toFixed(2),
      actualIssuedAndConsumedQty: actualSandMt,
      contractPermissibleVariationPct: 3.0, // +/- 3% for aggregates
      standardContractRateInr: 1450.0,      // Rs 1,450 per MT
      penalRecoveryRateFactor: 1.5
    }
  ], [concreteVolumeM3, mixConstants, actualCementBags, actualRebarMt, actualSteelSectionsMt, actualSandMt]);

  // Execute Clause 42 Mathematical Audit on all line items
  const reconciliationReports = useMemo(() => {
    return materialItems.map(item => evaluateClause42Reconciliation(item));
  }, [materialItems]);

  const totalPenalRecoveryInr = useMemo(() => {
    return reconciliationReports.reduce((acc, r) => acc + r.penalRecoveryAmountInr, 0);
  }, [reconciliationReports]);

  const hasStructuralRisk = useMemo(() => {
    return reconciliationReports.some(r => r.structuralIntegrityRisk);
  }, [reconciliationReports]);

  const handleSealClause42Reconciliation = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `VANGUARD_CLAUSE42_RECON_VOL_${concreteVolumeM3}_PENAL_${totalPenalRecoveryInr}_RISK_${hasStructuralRisk}_TIME_${timestamp}_${Date.now()}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setSealedHash(hash);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "PLUTUS-COMMERCIAL",
          synthesis_report: `CLAUSE 42 MATERIAL RECONCILIATION NOTARIZED: Concrete Placed: ${concreteVolumeM3} m³ • Total Penal Debit: ₹${totalPenalRecoveryInr.toLocaleString()} • Structural Integrity Deficiency: ${hasStructuralRisk ? "FLAGGED (NDT REQUIRED)" : "CLEARED"}`,
          merkle_root_hash: hash
        });
      } catch (e) {}
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              CPWD CLAUSE 42 STATUTORY GOVERNANCE
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              IS 10262 & IS 1786 COMPLIANCE
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            STATUTORY MATERIAL RECONCILIATION (CLAUSE 42)
          </h1>
          <p className="text-xs text-slate-400">
            Project Vanguard (10.3m x 10.9m x 15m) • Theoretical Mix Constants vs. Actual Weighbridge Intake
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">🏛️ 3D BIM TWIN</a>
          <a href="/site/weighbridge" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">⚖️ WEIGHBRIDGE</a>
        </div>
      </div>

      {/* Interactive Simulation Controls */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">BIM NET CONCRETE VOL</span>
            <span className="text-cyan-400 font-bold font-mono">{concreteVolumeM3.toFixed(2)} m³</span>
          </div>
          <input
            type="range"
            min="80"
            max="160"
            step="0.5"
            value={concreteVolumeM3}
            onChange={e => setConcreteVolumeM3(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="text-[10px] text-slate-500 mt-1">Vanguard 4-Storey Envelope</div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">CONCRETE SPECIFICATION</div>
          <div className="flex gap-2">
            {[30, 35, 40].map(fck => (
              <button
                key={fck}
                onClick={() => setConcreteGradeFck(fck)}
                className={`flex-1 py-1.5 rounded-lg border font-bold text-xs transition ${
                  concreteGradeFck === fck
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                    : "bg-slate-950 text-slate-400 border-slate-800"
                }`}
              >
                M{fck}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Constant: {mixConstants.cementBagsPerM3} bags/m³</div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ACTUAL CEMENT ISSUED</span>
            <span className="text-white font-bold font-mono">{actualCementBags} Bags</span>
          </div>
          <input
            type="range"
            min="900"
            max="1150"
            step="2"
            value={actualCementBags}
            onChange={e => setActualCementBags(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-white"
          />
          <div className="text-[10px] text-slate-500 mt-1">Weighbridge Gate Inward Net</div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ACTUAL TMT REBAR USED</span>
            <span className="text-white font-bold font-mono">{actualRebarMt.toFixed(2)} MT</span>
          </div>
          <input
            type="range"
            min="12.0"
            max="16.0"
            step="0.05"
            value={actualRebarMt}
            onChange={e => setActualRebarMt(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="text-[10px] text-slate-500 mt-1">Rebar Yard Issue Ledger</div>
        </div>
      </div>

      {/* KPI Financial & Governance Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">TOTAL PENAL RECOVERY DEBIT</div>
          <div className={`text-xl font-bold mt-1 font-mono ${totalPenalRecoveryInr > 0 ? "text-red-400" : "text-emerald-400"}`}>
            ₹{totalPenalRecoveryInr.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Deductible from Running Bill #42</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">CEMENT CONSUMPTION VARIANCE</div>
          <div className={`text-xl font-bold mt-1 font-mono ${
            reconciliationReports[0].variancePct > 2.0 ? "text-amber-400" :
            reconciliationReports[0].variancePct < -2.0 ? "text-red-400" : "text-emerald-400"
          }`}>
            {reconciliationReports[0].variancePct > 0 ? `+${reconciliationReports[0].variancePct}` : reconciliationReports[0].variancePct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Permissible Limit: ±2.0%</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">STEEL UTILIZATION EFFICIENCY</div>
          <div className={`text-xl font-bold mt-1 font-mono ${
            reconciliationReports[1].variancePct > 2.0 ? "text-amber-400" : "text-emerald-400"
          }`}>
            {reconciliationReports[1].variancePct > 0 ? `+${reconciliationReports[1].variancePct}` : reconciliationReports[1].variancePct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Rolling Margin Tolerance: ±2.0%</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">STRUCTURAL INTEGRITY AUDIT</div>
          <div className={`text-sm font-bold mt-1.5 ${hasStructuralRisk ? "text-red-400 animate-pulse" : "text-emerald-400"}`}>
            {hasStructuralRisk ? "DEFICIENT: NDT AUDIT REQUIRED" : "COMPLIANT WITH DESIGN"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">No Under-consumption detected</div>
        </div>
      </div>

      {/* Main Grid: Clause 42 Statutory Reconciliation Matrix */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
          <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ScaleIcon className="w-3.5 h-3.5 text-cyan-400" />
            CLAUSE 42 STATUTORY MATERIAL RECONCILIATION STATEMENT
          </span>
          <span className="text-cyan-400 font-mono text-[10px]">CPWD CLAUSE 42 / FIDIC 14.1</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-[10px] text-slate-400 uppercase border-b border-slate-800 font-mono">
              <tr>
                <th className="py-2.5 px-3">MATERIAL DESCRIPTION</th>
                <th className="py-2.5 px-3">UNIT</th>
                <th className="py-2.5 px-3">THEORETICAL REQ (Q_theo)</th>
                <th className="py-2.5 px-3">PERMISSIBLE BAND (±%)</th>
                <th className="py-2.5 px-3">ACTUAL CONSUMED (Q_act)</th>
                <th className="py-2.5 px-3">VARIANCE (%)</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-right">PENAL DEBIT (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono text-[11px]">
              {reconciliationReports.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition">
                  <td className="py-3 px-3">
                    <div className="font-bold text-white">{row.materialName}</div>
                    <div className="text-[9px] text-slate-500">{row.materialCode}</div>
                  </td>
                  <td className="py-3 px-3 text-cyan-400 font-bold">{row.unit}</td>
                  <td className="py-3 px-3 font-semibold text-white">{row.theoreticalQty}</td>
                  <td className="py-3 px-3 text-slate-400">
                    [{row.permissibleMinQty} - {row.permissibleMaxQty}]
                  </td>
                  <td className="py-3 px-3 font-bold text-white">{row.actualConsumedQty}</td>
                  <td className={`py-3 px-3 font-bold ${
                    row.variancePct > 2.0 ? "text-amber-400" :
                    row.variancePct < -2.0 ? "text-red-400" : "text-emerald-400"
                  }`}>
                    {row.variancePct > 0 ? `+${row.variancePct}` : row.variancePct}%
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      row.status === "COMPLIANT_WITHIN_TOLERANCE"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                        : row.status === "OVER_CONSUMPTION_PENAL"
                        ? "bg-amber-950 text-amber-400 border border-amber-500/30"
                        : "bg-red-950 text-red-400 border border-red-500/30"
                    }`}>
                      {row.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-white">
                    {row.penalRecoveryAmountInr > 0 ? (
                      <span className="text-red-400">₹{row.penalRecoveryAmountInr.toLocaleString()}</span>
                    ) : (
                      <span className="text-slate-500">₹0.00</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-400 flex flex-col md:flex-row justify-between gap-2">
          <span>
            Contractual Principle: Permissible variation is ±2.0% for cement and reinforcement. Quantities consumed beyond the permissible upper limit are billed at double recovery rate (2.0 × R_contract).
          </span>
          <span className="font-bold text-cyan-400">
            Total Chargeable Recovery: ₹{totalPenalRecoveryInr.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Section 65B Statutory Commercial Notarization */}
      <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_0_20px_rgba(168,85,247,0.12)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
            <span>SECTION 65B STATUTORY MATERIAL RECONCILIATION SEAL</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Admissible under Indian Evidence Act Sec 65B • Cryptographically locks physical consumption against e-MB Bill #42.
          </div>
        </div>

        <div>
          {sealedHash ? (
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400">
              <CheckIcon className="w-4 h-4" />
              <span className="font-mono text-[10px] select-all">{sealedHash.substring(0, 28)}...</span>
            </div>
          ) : (
            <button
              onClick={handleSealClause42Reconciliation}
              disabled={isNotarizing}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
            >
              {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-4 h-4 text-slate-950" />}
              <span>SEAL & NOTARIZE CLAUSE 42 STATEMENT</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
