// components/setup/ProjectHandshakeForm.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Unlock,
  UploadCloud,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Coins,
  FileText,
  Scale,
} from "lucide-react";

export function ProjectHandshakeForm() {
  const router = useRouter();

  // Section 1: Identity & Clearances State
  const [coaNo, setCoaNo] = useState("CA/2012/58912");
  const [cinPan, setCinPan] = useState("U45200UP2018PTC109824 / AABCQ1234F");
  const [gstin, setGstin] = useState("09AAACQ1234F1Z5");

  // Section 2: Contract Parameters State
  const [contractValue, setContractValue] = useState("24,87,50,000");
  const [commencementDate, setCommencementDate] = useState("2026-10-01");
  const [completionDurationMonths, setCompletionDurationMonths] = useState("24");
  const [boqBaseline, setBoqBaseline] = useState("CPWD DSR 2023");

  // Section 3: File Vault Mock Uploads State
  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: string }>({
    loa: "LOA-GOMTI-PH1-SIGNED.pdf",
    sanctionPlan: "LDA-MUNICIPAL-SANCTION-REV03.dwg",
    contractAgreement: "FIDIC-RED-BOOK-EXEC-AGREEMENT.pdf",
  });

  const handleSimulateUpload = (key: string, defaultName: string) => {
    setUploadedFiles((prev) => ({
      ...prev,
      [key]: prev[key] ? "" : defaultName,
    }));
  };

  // Right Pane: Dual-Signatory Handshake State
  // Gate 1: Principal Architect
  const [gate1Certified, setGate1Certified] = useState(false);
  const [gate1Signature, setGate1Signature] = useState("");
  const [gate1Verified, setGate1Verified] = useState(false);

  // Gate 2: Client / Employer
  const [gate2Accepted, setGate2Accepted] = useState(false);
  const [gate2Signature, setGate2Signature] = useState("");
  const [gate2Verified, setGate2Verified] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  // Verification Triggers
  const handleVerifyGate1 = () => {
    if (gate1Certified && gate1Signature.trim().length >= 4) {
      setGate1Verified(true);
    } else {
      alert("Please certify the legal baseline and enter a valid Digital Signature / OTP token.");
    }
  };

  const handleVerifyGate2 = () => {
    if (!gate1Verified) {
      alert("Gate 2 Locked: Principal Architect Attestation must be verified first.");
      return;
    }
    if (gate2Accepted && gate2Signature.trim().length >= 4) {
      setGate2Verified(true);
    } else {
      alert("Please accept baseline metrics and enter the Client Digital Signature / OTP token.");
    }
  };

  // Interlock Condition: Both gates must be verified
  const isInterlockCleared = gate1Verified && gate2Verified;

  const handleInitializeProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInterlockCleared) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessNotice(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    }, 1200);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 shadow-2xl grid grid-cols-1 md:grid-cols-12 overflow-hidden font-sans">
      {/* ===================================================================
          LEFT PANE: Project Metadata & Contract Baseline (col-span-7)
          =================================================================== */}
      <div className="col-span-1 md:col-span-7 p-8 space-y-6">
        {/* SECTION 1: Identity & Clearances */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <ShieldCheck className="h-4 w-4 text-zinc-400" />
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-200">
              Section 1: Identity &amp; Statutory Clearances
            </h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-zinc-400 text-[10px] uppercase font-mono mb-1">
                Council of Architecture (CoA) Registration No. (Architect) *
              </label>
              <input
                type="text"
                required
                value={coaNo}
                onChange={(e) => setCoaNo(e.target.value)}
                placeholder="e.g. CA/2012/58912"
                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 font-mono text-xs focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase font-mono mb-1">
                  Corporate CIN / Employer PAN (Client) *
                </label>
                <input
                  type="text"
                  required
                  value={cinPan}
                  onChange={(e) => setCinPan(e.target.value)}
                  placeholder="e.g. U45200UP2018PTC109824"
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 font-mono text-xs focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] uppercase font-mono mb-1">
                  Contractor GSTIN *
                </label>
                <input
                  type="text"
                  required
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="e.g. 09AAACQ1234F1Z5"
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 font-mono text-xs focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: Contract Parameters (The Baseline) */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <Coins className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-200">
              Section 2: Contract Parameters (The Legal Baseline)
            </h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-zinc-400 text-[10px] uppercase font-mono mb-1">
                Sanctioned Contract Value (₹ - Base Contract Amount) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-zinc-500 font-mono text-xs">₹</span>
                <input
                  type="text"
                  required
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 pl-7 pr-3 py-2 text-zinc-100 font-mono text-xs tabular-nums focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-zinc-400 text-[10px] uppercase font-mono mb-1">
                  Stipulated Commencement Date *
                </label>
                <input
                  type="date"
                  required
                  value={commencementDate}
                  onChange={(e) => setCommencementDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 font-mono text-xs focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-zinc-400 text-[10px] uppercase font-mono mb-1">
                  Target Duration (Months) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={completionDurationMonths}
                  onChange={(e) => setCompletionDurationMonths(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 font-mono text-xs tabular-nums focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-zinc-400 text-[10px] uppercase font-mono mb-1">
                  Standard BOQ Baseline *
                </label>
                <select
                  value={boqBaseline}
                  onChange={(e) => setBoqBaseline(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-2 text-zinc-100 font-mono text-xs focus:outline-none focus:border-zinc-600"
                >
                  <option value="CPWD DSR 2023">CPWD DSR 2023</option>
                  <option value="CPWD DSR 2021">CPWD DSR 2021</option>
                  <option value="State PWD Schedule 2023">State PWD Schedule 2023</option>
                  <option value="FIDIC Red Book Custom BOQ">FIDIC Red Book Custom BOQ</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: File Vault Uploads */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <UploadCloud className="h-4 w-4 text-zinc-400" />
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-200">
              Section 3: Statutory File Vault Uploads
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            {/* Upload 1: Letter of Acceptance */}
            <div
              onClick={() => handleSimulateUpload("loa", "LOA-GOMTI-PH1-SIGNED.pdf")}
              className={`p-3 border text-center transition-colors cursor-pointer flex flex-col justify-between min-h-[96px] ${
                uploadedFiles.loa
                  ? "bg-zinc-950 border-emerald-800 text-emerald-400"
                  : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-400"
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-zinc-300">
                Letter of Acceptance (LoA)
              </div>
              <div className="text-[11px] truncate mt-1">
                {uploadedFiles.loa ? (
                  <span className="flex items-center justify-center gap-1 text-emerald-400 font-bold">
                    <FileCheck className="h-3.5 w-3.5" />
                    <span>Attached</span>
                  </span>
                ) : (
                  <span className="text-zinc-500">Click to Upload PDF</span>
                )}
              </div>
              <div className="text-[9px] text-zinc-500 uppercase">CPWD Cl. 10 / FIDIC 1.1</div>
            </div>

            {/* Upload 2: Municipal Sanction Plan */}
            <div
              onClick={() =>
                handleSimulateUpload("sanctionPlan", "LDA-MUNICIPAL-SANCTION-REV03.dwg")
              }
              className={`p-3 border text-center transition-colors cursor-pointer flex flex-col justify-between min-h-[96px] ${
                uploadedFiles.sanctionPlan
                  ? "bg-zinc-950 border-emerald-800 text-emerald-400"
                  : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-400"
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-zinc-300">
                Municipal Sanction Plan
              </div>
              <div className="text-[11px] truncate mt-1">
                {uploadedFiles.sanctionPlan ? (
                  <span className="flex items-center justify-center gap-1 text-emerald-400 font-bold">
                    <FileCheck className="h-3.5 w-3.5" />
                    <span>Attached</span>
                  </span>
                ) : (
                  <span className="text-zinc-500">Click to Upload DWG/PDF</span>
                )}
              </div>
              <div className="text-[9px] text-zinc-500 uppercase">Statutory Layout Approval</div>
            </div>

            {/* Upload 3: Signed Contract Agreement */}
            <div
              onClick={() =>
                handleSimulateUpload(
                  "contractAgreement",
                  "FIDIC-RED-BOOK-EXEC-AGREEMENT.pdf"
                )
              }
              className={`p-3 border text-center transition-colors cursor-pointer flex flex-col justify-between min-h-[96px] ${
                uploadedFiles.contractAgreement
                  ? "bg-zinc-950 border-emerald-800 text-emerald-400"
                  : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-400"
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-zinc-300">
                Signed Contract Agreement
              </div>
              <div className="text-[11px] truncate mt-1">
                {uploadedFiles.contractAgreement ? (
                  <span className="flex items-center justify-center gap-1 text-emerald-400 font-bold">
                    <FileCheck className="h-3.5 w-3.5" />
                    <span>Attached</span>
                  </span>
                ) : (
                  <span className="text-zinc-500">Click to Upload PDF</span>
                )}
              </div>
              <div className="text-[9px] text-zinc-500 uppercase">FIDIC Formal Instrument</div>
            </div>
          </div>
        </section>
      </div>

      {/* ===================================================================
          RIGHT PANE: The Dual-Signatory Handshake (col-span-5)
          =================================================================== */}
      <div className="col-span-1 md:col-span-5 bg-zinc-950 p-8 border-t md:border-t-0 md:border-l border-zinc-800 flex flex-col justify-between font-mono text-xs">
        <div className="space-y-6">
          {/* Header */}
          <div className="border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-emerald-400" />
              <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                Phase 2 Handshake
              </span>
            </div>
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide mt-1">
              Dual-Signatory Authorization Gate
            </h3>
            <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
              Requires irrevocable countersignature from both the Principal Architect and the Employer before workspace instantiation.
            </p>
          </div>

          {/* GATE 1: Principal Architect Attestation */}
          <div
            className={`p-4 border space-y-3 transition-colors ${
              gate1Verified
                ? "bg-zinc-900 border-emerald-800"
                : "bg-zinc-900/60 border-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-zinc-300 font-bold">
                Gate 1: Principal Architect
              </span>
              <span
                className={`px-2 py-0.5 text-[9px] font-bold uppercase border ${
                  gate1Verified
                    ? "bg-emerald-950/80 border-emerald-800 text-emerald-400"
                    : "bg-zinc-950 border-zinc-800 text-zinc-500"
                }`}
              >
                {gate1Verified ? "Verified ✓" : "Pending Attestation"}
              </span>
            </div>

            {/* Checkbox Action */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={gate1Certified}
                onChange={(e) => {
                  setGate1Certified(e.target.checked);
                  if (!e.target.checked) setGate1Verified(false);
                }}
                className="mt-0.5 h-3.5 w-3.5 rounded-none border-zinc-700 bg-zinc-950 text-emerald-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-[11px] text-zinc-300 font-sans leading-snug">
                I certify the uploaded documents form the true legal baseline.
              </span>
            </label>

            {/* Digital Signature / OTP Input */}
            <div className="space-y-2 pt-1">
              <input
                type="text"
                value={gate1Signature}
                disabled={gate1Verified}
                onChange={(e) => setGate1Signature(e.target.value)}
                placeholder="Enter CoA Digital Key or OTP (e.g. ARCH-8912)"
                className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 font-mono text-[11px] focus:outline-none focus:border-zinc-600 disabled:opacity-50"
              />

              {!gate1Verified && (
                <button
                  type="button"
                  onClick={handleVerifyGate1}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-1.5 uppercase font-bold text-[10px] tracking-wider transition-colors cursor-pointer border border-zinc-700"
                >
                  Verify Architect Signature
                </button>
              )}
            </div>
          </div>

          {/* GATE 2: Client / Employer Counter-Verification */}
          <div
            className={`p-4 border space-y-3 transition-colors ${
              !gate1Verified
                ? "bg-zinc-950/40 border-zinc-900 opacity-60"
                : gate2Verified
                ? "bg-zinc-900 border-emerald-800"
                : "bg-zinc-900/60 border-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-zinc-300 font-bold">
                Gate 2: Client / Employer
              </span>
              <span
                className={`px-2 py-0.5 text-[9px] font-bold uppercase border ${
                  !gate1Verified
                    ? "bg-zinc-950 border-zinc-900 text-zinc-600 flex items-center gap-1"
                    : gate2Verified
                    ? "bg-emerald-950/80 border-emerald-800 text-emerald-400"
                    : "bg-zinc-950 border-zinc-800 text-zinc-500"
                }`}
              >
                {!gate1Verified ? (
                  <>
                    <Lock className="h-2.5 w-2.5 text-zinc-600" />
                    <span>Locked</span>
                  </>
                ) : gate2Verified ? (
                  "Verified ✓"
                ) : (
                  "Pending Counter-Sign"
                )}
              </span>
            </div>

            {/* Checkbox Action */}
            <label
              className={`flex items-start gap-2.5 ${
                !gate1Verified ? "cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <input
                type="checkbox"
                disabled={!gate1Verified}
                checked={gate2Accepted}
                onChange={(e) => {
                  setGate2Accepted(e.target.checked);
                  if (!e.target.checked) setGate2Verified(false);
                }}
                className="mt-0.5 h-3.5 w-3.5 rounded-none border-zinc-700 bg-zinc-950 text-emerald-600 focus:ring-0 focus:ring-offset-0 disabled:opacity-40"
              />
              <span className="text-[11px] text-zinc-300 font-sans leading-snug">
                I accept the baseline metrics and authorize the Notice to Proceed (NTP).
              </span>
            </label>

            {/* Digital Signature / OTP Input */}
            <div className="space-y-2 pt-1">
              <input
                type="text"
                value={gate2Signature}
                disabled={!gate1Verified || gate2Verified}
                onChange={(e) => setGate2Signature(e.target.value)}
                placeholder="Enter CIN/Corporate OTP (e.g. CLIENT-4410)"
                className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 font-mono text-[11px] focus:outline-none focus:border-zinc-600 disabled:opacity-40"
              />

              {gate1Verified && !gate2Verified && (
                <button
                  type="button"
                  onClick={handleVerifyGate2}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-1.5 uppercase font-bold text-[10px] tracking-wider transition-colors cursor-pointer border border-zinc-700"
                >
                  Verify Employer Signature
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===================================================================
            ACTION FOOTER: Initialize Project Workspace & Lock Baseline
            =================================================================== */}
        <div className="pt-6 border-t border-zinc-800/80 mt-6 space-y-2">
          {successNotice ? (
            <div className="bg-emerald-950/90 border border-emerald-700 text-emerald-300 p-3 text-center text-xs font-mono font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Project Baseline Locked. Launching Live Dashboard...</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleInitializeProject}
              disabled={!isInterlockCleared || isSubmitting}
              className={`w-full py-4 uppercase font-bold tracking-widest text-sm transition-all font-mono ${
                !isInterlockCleared
                  ? "opacity-30 cursor-not-allowed bg-zinc-800 text-zinc-500 border border-zinc-700/50"
                  : "bg-emerald-600 hover:bg-emerald-500 text-zinc-100 cursor-pointer shadow-none"
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4 animate-spin text-zinc-100" />
                  <span>Locking Statutory Baseline...</span>
                </span>
              ) : (
                <span>Initialize Project Workspace &amp; Lock Baseline</span>
              )}
            </button>
          )}

          <div className="text-[10px] text-zinc-500 text-center font-mono">
            {!isInterlockCleared
              ? "Statutory Interlock: Both Gate 1 & Gate 2 signatures required."
              : "Interlock Cleared: Ready for immutable baseline registration."}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectHandshakeForm;
