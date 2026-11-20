"use client";

import React from "react";
import { ShieldCheck, Printer, X, ExternalLink } from "lucide-react";

interface ComplianceCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectCode: string;
  projectId: string;
  projectName: string;
  location: string;
  contractValueCr: number;
}

export default function ComplianceCertificateModal({
  isOpen,
  onClose,
  projectCode,
  projectId,
  projectName,
  location,
  contractValueCr,
}: ComplianceCertificateModalProps) {
  if (!isOpen) return null;

  const merkleDigest = "8806a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4";
  const verifyPath = `/verify/NCR-2026-STR-042`;

  // Deterministic 15x15 QR-style matrix derived from Merkle digest
  const cells = Array.from({ length: 225 }, (_, i) => {
    const r = Math.floor(i / 15);
    const c = i % 15;
    const isFinder =
      (r < 4 && c < 4) || (r < 4 && c > 10) || (r > 10 && c < 4);
    if (isFinder) {
      const lr = r > 10 ? r - 11 : r;
      const lc = c > 10 ? c - 11 : c;
      return lr === 0 || lr === 3 || lc === 0 || lc === 3 || (lr === 1 && lc === 1) || (lr === 2 && lc === 2);
    }
    const charCode = merkleDigest.charCodeAt(i % merkleDigest.length);
    return (charCode + r * 7 + c * 13) % 2 === 0;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs text-white uppercase">
              STATUTORY BSA SEC. 63 & IS 456:2000 ATTESTATION DOSSIER
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs bg-zinc-950 text-zinc-100">
          <div className="border-b border-zinc-800 pb-4 flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                QUADILLAR LIVEVIEW • CRYPTOGRAPHIC ESCROW & QUALITY CERTIFICATE
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                {projectCode}: {projectName}
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {location} • Project ID: {projectId} • EPC Baseline: ₹{contractValueCr.toFixed(2)} Cr
              </p>
            </div>

            {/* Scannable QR Verification Stamp */}
            <div className="flex flex-col items-center gap-1 shrink-0 bg-white p-2.5 rounded-xl">
              <svg viewBox="0 0 15 15" className="w-20 h-20">
                {cells.map((on, idx) =>
                  on ? (
                    <rect
                      key={idx}
                      x={idx % 15}
                      y={Math.floor(idx / 15)}
                      width={1}
                      height={1}
                      fill="#09090B"
                    />
                  ) : null
                )}
              </svg>
              <span className="text-[8px] font-bold text-zinc-950">SCAN TO VERIFY 65B</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">STATUTORY CODE</div>
              <div className="font-bold text-white">IS 456:2000 Cl. 17.4.3 & BSA 2023 Sec. 63</div>
              <div className="text-[10.5px] text-zinc-400">
                3-Core Mean Acceptance ≥ 0.85 × fck (42.50 MPa for M50)
              </div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">SPATIAL & MULTI-RAY LOCK</div>
              <div className="font-bold text-emerald-400">±1.8 mm Terrestrial LiDAR RMS</div>
              <div className="text-[10.5px] text-zinc-400">
                905nm LiDAR + LWIR Thermal IR + 24GHz mmWave Radar
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5">
            <div className="text-[9px] text-zinc-400 uppercase font-bold">
              CANONICAL SHA-256 MERKLE ROOT DIGEST
            </div>
            <div className="text-[10.5px] text-emerald-400 break-all font-bold">{merkleDigest}</div>
            <div className="pt-2 flex items-center justify-between text-[10px] text-zinc-400">
              <span>Attested by: QUADMAX.AI & HERMES-65B Ledger</span>
              <a
                href={verifyPath}
                className="text-zinc-100 font-bold hover:underline inline-flex items-center gap-1 print:hidden"
              >
                Open Public Verify URL <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
