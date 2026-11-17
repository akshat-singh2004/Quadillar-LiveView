"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// --- INLINE SVG ICONS ---
const BookOpenIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
const DollarSignIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);
const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const RefreshIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);
const LayersIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

interface EmbItem {
  id: string;
  itemNo: string;
  bitTarget: string;
  description: string;
  dimensions: { l: number; b: number; d: number; qtyFormula: string };
  unit: string;
  certifiedQty: number;
  contractRateInr: number;
  grossAmountInr: number;
  pmcVerificationStatus: "VERIFIED" | "RECONCILED" | "PENDING";
  ifcLod400Ref: string;
}

const EMB_RECORDS: EmbItem[] = [
  {
    id: "EMB-42-01",
    itemNo: "BOQ Item 4.12",
    bitTarget: "BIT-4 EAST PROW",
    description: "Imported Terreal Terracotta Rain-Screen Cladding Tiles (500x250x30mm) with SS316 Clip Channels",
    dimensions: { l: 94.0, b: 18.5, d: 1.0, qtyFormula: "94.0m Height x 18.5m Average Girth" },
    unit: "Sq.M",
    certifiedQty: 1739.0,
    contractRateInr: 16800,
    grossAmountInr: 29215200,
    pmcVerificationStatus: "VERIFIED",
    ifcLod400Ref: "IFC_PROW_FACADE_TILES_LOD400"
  },
  {
    id: "EMB-42-02",
    itemNo: "BOQ Item 2.08",
    bitTarget: "BIT-2 SILVER DOME",
    description: "Kalzip Standing Seam Aluminium Profile 65/400 (Alloy 3004) with Acoustic Insulation & Vapour Barrier",
    dimensions: { l: 42.0, b: 38.0, d: 1.0, qtyFormula: "Ellipsoidal Dome Surface Curvature Integral" },
    unit: "Sq.M",
    certifiedQty: 2480.0,
    contractRateInr: 14200,
    grossAmountInr: 35216000,
    pmcVerificationStatus: "VERIFIED",
    ifcLod400Ref: "IFC_KALZIP_DOME_SHELL_LOD400"
  },
  {
    id: "EMB-42-03",
    itemNo: "BOQ Item 6.03",
    bitTarget: "BIT-6 HELIPAD",
    description: "M40 Grade Self-Compacting Concrete (SCC) for 38m Diameter Cantilever Post-Tensioned Slabs",
    dimensions: { l: 19.0, b: 19.0, d: 0.8, qtyFormula: "pi x (19m)^2 x 0.8m Average Thickness" },
    unit: "Cu.M",
    certifiedQty: 907.0,
    contractRateInr: 9850,
    grossAmountInr: 8933950,
    pmcVerificationStatus: "VERIFIED",
    ifcLod400Ref: "IFC_HELI_SLAB_M40_LOD400"
  },
  {
    id: "EMB-42-04",
    itemNo: "BOQ Item 3.19",
    bitTarget: "BIT-3 HOTEL CORE",
    description: "High-Yield TMT Fe 550D Rebar Fabricated, Bound & Placed in 14th Floor Primary Transfer Girders",
    dimensions: { l: 1.0, b: 1.0, d: 1.0, qtyFormula: "BBS Schedule BBS-VANGUARD-TWR-FL14 Net Mass" },
    unit: "MT",
    certifiedQty: 84.5,
    contractRateInr: 76500,
    grossAmountInr: 6464250,
    pmcVerificationStatus: "VERIFIED",
    ifcLod400Ref: "IFC_REBAR_FL14_GIRDERS"
  },
  {
    id: "EMB-42-05",
    itemNo: "BOQ Item 5.04",
    bitTarget: "BIT-5 BUTTRESS RIBS",
    description: "Pre-cast Architectural Terracotta Clad Rib Elements (Rib #03 & Rib #04 Erection & Structural Jointing)",
    dimensions: { l: 32.0, b: 2.2, d: 1.8, qtyFormula: "2 Completed Swooping Buttress Arches" },
    unit: "Each",
    certifiedQty: 2.0,
    contractRateInr: 52335300,
    grossAmountInr: 104670600,
    pmcVerificationStatus: "VERIFIED",
    ifcLod400Ref: "IFC_BUTTRESS_RIBS_03_04"
  }
];

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function JpnicEmbRaBillPage() {
  const [selectedItem, setSelectedItem] = useState<EmbItem>(EMB_RECORDS[0]);
  const [isNotarizing, setIsNotarizing] = useState(false);
  const [billStatus, setBillStatus] = useState<"PMC_VERIFIED" | "STATUTORY_NOTARIZED">("PMC_VERIFIED");
  const [billMerkleHash, setBillMerkleHash] = useState<string | null>(null);

  // Financial Ledger Calculations (Running Account Bill #42)
  const grossCertifiedInr = 184500000; // ₹18.45 Cr
  const statutoryRetentionPct = 5.0;
  const statutoryRetentionInr = (grossCertifiedInr * statutoryRetentionPct) / 100; // ₹92.25 Lakh
  const mobilizationRecoveryInr = 18450000; // 10% installment: ₹1.845 Cr
  const gstTdsInr = 3690000; // 2% GST TDS: ₹36.90 Lakh
  const incomeTaxTdsInr = 3690000; // 2% IT TDS: ₹36.90 Lakh
  const laborCessInr = 1845000; // 1% BOCW Cess: ₹18.45 Lakh

  const totalDeductionsInr = statutoryRetentionInr + mobilizationRecoveryInr + gstTdsInr + incomeTaxTdsInr + laborCessInr; // ₹3.69 Cr
  const netPassThroughInr = grossCertifiedInr - totalDeductionsInr; // ₹14.76 Cr

  const handleAuthorizeRaBill = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawPayload = `vanguard_RA_BILL_42_GROSS_${grossCertifiedInr}_NET_${netPassThroughInr}_TIME_${timestamp}_${Date.now()}`;
    const hash = await generateSHA256(rawPayload);

    setTimeout(async () => {
      setBillMerkleHash(hash);
      setBillStatus("STATUTORY_NOTARIZED");
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "UP-LDA-VANGUARD-CAMPUS",
          primary_governor: "MIDAS",
          synthesis_report: `RA BILL #42 NOTARIZED: Gross ₹18.45 Cr • Retainage ₹92.25 L locked • Net Pass-Through ₹14.76 Cr • CPWD Form 26 Signed`,
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
              CPWD FORM 26 • RUNNING ACCOUNT BILL #42
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              MIDAS • COMMERCIAL LEDGER
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            ELECTRONIC MEASUREMENT BOOK (e-MB) & RA BILL #42
          </h1>
          <p className="text-xs text-slate-400">
            PROJECT VANGUARD COMMERCIAL HUB • 3D LOD-400 Quantity Surveys, 5-Tier Statutory Retainage Waterfall & Escrow Accounting
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition"
          >
            ← COMMAND CENTER
          </a>
          <a
            href="/site/digital-twin"
            className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition"
          >
            🏛️ 3D BIM TWIN
          </a>
          <a
            href="/site/dpr"
            className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition"
          >
            📋 DPR #418
          </a>
          <a
            href="/site/hindrance"
            className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs rounded-lg transition"
          >
            ⏱️ EOT CLAIMS
          </a>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">GROSS VALUATION (RA-42)</div>
          <div className="text-xl font-bold text-white mt-1">₹{(grossCertifiedInr / 10000000).toFixed(2)} Cr</div>
          <div className="text-[10px] text-cyan-400 mt-0.5">5 Items Fully Reconciled</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">STATUTORY 5% RETENTION</div>
          <div className="text-xl font-bold text-amber-400 mt-1">₹{(statutoryRetentionInr / 100000).toFixed(2)} Lakh</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Locked to UP-LDA DLP Escrow</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">STATUTORY WITHHOLDINGS</div>
          <div className="text-xl font-bold text-slate-300 mt-1">₹{(totalDeductionsInr / 10000000).toFixed(2)} Cr</div>
          <div className="text-[10px] text-slate-500 mt-0.5">TDS, Mob. Adv & Labor Cess</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">NET PASS-THROUGH</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">₹{(netPassThroughInr / 10000000).toFixed(2)} Cr</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">RTGS Mandate Prepared</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">COMMERCIAL CERTIFICATION</div>
          <div className={`text-sm font-bold mt-1.5 ${billStatus === "STATUTORY_NOTARIZED" ? "text-emerald-400" : "text-cyan-400"}`}>
            {billStatus === "STATUTORY_NOTARIZED" ? "SECTION 65B NOTARIZED" : "PMC APPROVED"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Archohm & UP-LDA Verified</div>
        </div>
      </div>

      {/* Main Grid: Electronic Measurement Book (e-MB) Line Items Table */}
      <div className="border border-slate-800 rounded-2xl bg-slate-900/40 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3 text-xs">
          <div className="flex items-center gap-3">
            <BookOpenIcon className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white uppercase tracking-wider">
              ELECTRONIC MEASUREMENT BOOK (e-MB): VANGUARD CONTRACT BILL #42
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30 text-[10px]">
              LOD-400 REGISTERED
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">CPWD WORKS MANUAL 2019 FORMAT</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-[10px] text-slate-400 uppercase border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">ITEM NO</th>
                <th className="py-2.5 px-4">BIT ALLOCATION</th>
                <th className="py-2.5 px-4">DESCRIPTION OF WORK</th>
                <th className="py-2.5 px-3">DIMENSION DERIVATION</th>
                <th className="py-2.5 px-3">UNIT</th>
                <th className="py-2.5 px-3">QTY CERTIFIED</th>
                <th className="py-2.5 px-3">RATE (INR)</th>
                <th className="py-2.5 px-4 text-right">GROSS AMOUNT (INR)</th>
                <th className="py-2.5 px-3 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {EMB_RECORDS.map(item => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`cursor-pointer transition ${
                    selectedItem.id === item.id ? "bg-slate-900/80" : "hover:bg-slate-900/30"
                  }`}
                >
                  <td className="py-3 px-4 font-bold text-cyan-400">{item.itemNo}</td>
                  <td className="py-3 px-4 font-bold text-amber-400">{item.bitTarget}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white leading-snug">{item.description}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.ifcLod400Ref}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{item.dimensions.qtyFormula}</td>
                  <td className="py-3 px-3 text-slate-300 font-bold">{item.unit}</td>
                  <td className="py-3 px-3 font-bold text-white">{item.certifiedQty.toLocaleString()}</td>
                  <td className="py-3 px-3 font-mono text-slate-400">₹{item.contractRateInr.toLocaleString()}</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-right">
                    ₹{item.grossAmountInr.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                      {item.pmcVerificationStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5-Tier Statutory Retainage Waterfall Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Waterfall Breakdown Panel */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <LayersIcon className="w-3.5 h-3.5 text-cyan-400" />
              5-TIER STATUTORY RETAINAGE WATERFALL (MIDAS DOMAIN)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">UP-LDA CLAUSE 9</span>
          </div>

          <div className="flex flex-col gap-2 text-xs">
            {/* Step 1: Gross */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-bold text-white">Tier 1: Gross Certified Line Value</span>
                <div className="text-[10px] text-slate-500">e-MB Quantities verified against Archohm 3D IFC models</div>
              </div>
              <span className="text-white font-mono font-bold text-sm">₹{(grossCertifiedInr / 10000000).toFixed(2)} Cr</span>
            </div>

            {/* Step 2: 5% Retention Money */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-bold text-amber-400">Tier 2: Statutory 5% Security Retention</span>
                <div className="text-[10px] text-slate-500">Escrow reserved for DLP Tranche 1 & 2 releases</div>
              </div>
              <span className="text-amber-400 font-mono font-bold text-sm">- ₹{(statutoryRetentionInr / 100000).toFixed(2)} Lakh</span>
            </div>

            {/* Step 3: Mobilization Advance Recovery */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-300">Tier 3: Mobilization Advance Recovery (10%)</span>
                <div className="text-[10px] text-slate-500">Pro-rata recovery against initial 10% mobilization tranche</div>
              </div>
              <span className="text-slate-300 font-mono font-bold text-sm">- ₹{(mobilizationRecoveryInr / 10000000).toFixed(2)} Cr</span>
            </div>

            {/* Step 4: Statutory Taxes (GST TDS & IT TDS) */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-400">Tier 4: Statutory Tax Deductions (2% GST + 2% IT)</span>
                <div className="text-[10px] text-slate-500">Direct remittance to Govt Treasury on GSTN portal</div>
              </div>
              <span className="text-slate-400 font-mono font-bold text-sm">- ₹{((gstTdsInr + incomeTaxTdsInr) / 100000).toFixed(2)} Lakh</span>
            </div>

            {/* Step 5: Labor Welfare Cess */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-400">Tier 5: BOCW Labor Welfare Cess (1%)</span>
                <div className="text-[10px] text-slate-500">Remitted to UP Building & Other Construction Workers Board</div>
              </div>
              <span className="text-slate-400 font-mono font-bold text-sm">- ₹{(laborCessInr / 100000).toFixed(2)} Lakh</span>
            </div>

            {/* Net Pass-Through */}
            <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/40 flex justify-between items-center mt-1">
              <div>
                <span className="font-bold text-emerald-300 text-sm">FINAL NET PASS-THROUGH DISBURSEMENT</span>
                <div className="text-[10px] text-emerald-400">Approved for electronic RTGS release to EPC Lead Account</div>
              </div>
              <span className="text-emerald-400 font-mono font-bold text-lg">₹{(netPassThroughInr / 10000000).toFixed(2)} Cr</span>
            </div>
          </div>
        </div>

        {/* Selected Line Item BIM Deep Dive & Multi-Party Sign-Off */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              INSPECTED LINE DETAIL: {selectedItem.itemNo}
            </span>
            <div className="text-white font-bold text-xs leading-snug">{selectedItem.description}</div>
            <div className="text-cyan-400 text-[11px] font-mono">Target: {selectedItem.bitTarget}</div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[9px] text-slate-500">CERTIFIED QUANTITY</span>
                <div className="text-white font-bold text-sm mt-0.5">{selectedItem.certifiedQty.toLocaleString()} {selectedItem.unit}</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[9px] text-slate-500">LINE VALUATION</span>
                <div className="text-emerald-400 font-bold text-sm mt-0.5">₹{(selectedItem.grossAmountInr / 100000).toFixed(2)} Lakh</div>
              </div>
            </div>
          </div>

          {/* Tripartite Sign-off Deck */}
          <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between flex-1 gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">
                <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
                <span>SECTION 65B CPWD FORM 26 ENDORSEMENT</span>
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between border-b border-slate-800 pb-1 text-[11px]">
                  <span className="text-slate-400">Master EPC Contractor:</span>
                  <span className="text-emerald-400 font-bold">✔ Signed by Project Director</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1 text-[11px]">
                  <span className="text-slate-400">Archohm PMC Consultant:</span>
                  <span className="text-emerald-400 font-bold">✔ Quantity Certified (LOD 400)</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">UP-LDA Executive Engineer:</span>
                  <span className="text-cyan-400 font-bold">
                    {billStatus === "STATUTORY_NOTARIZED" ? "✔ Financial Sanction Passed" : "Pending Final Seal"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              {billStatus === "STATUTORY_NOTARIZED" ? (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
                  <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>RA BILL #42 NOTARIZED & SANCTIONED</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    MIDAS Algorithm Reconciled • Section 65B Immutable
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleAuthorizeRaBill}
                  disabled={isNotarizing}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-4 h-4 text-slate-950" />}
                  <span>NOTARIZE & SANCTION RA BILL #42</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 65B Commercial Notarization Strip */}
      <div className="bg-black/60 border border-slate-800 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2 text-[10px]">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 font-bold uppercase">SECTION 65B MERKLE ROOT:</span>
          <span className="text-slate-300 select-all font-mono">
            {billMerkleHash || "8602a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4"}
          </span>
        </div>
        <span className="text-slate-500">
          Sign-off: MIDAS-BILLING-GOVERNOR & UP-LDA CHIEF ACCOUNTS OFFICER
        </span>
      </div>
    </div>
  );
}
