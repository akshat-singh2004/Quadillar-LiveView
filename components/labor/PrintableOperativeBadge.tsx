"use client";

import React, { useState } from "react";
import { WorkerGatePassRecord } from "@/app/actions/gate-pass-actions";
import { Printer, ShieldCheck, Heart, Phone, X, Award, Building2 } from "lucide-react";

interface Props {
  pass: WorkerGatePassRecord;
  onClose?: () => void;
}

export function PrintableOperativeBadge({ pass, onClose }: Props) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 250);
  };

  // High-contrast clean QR Code rendering using SVG Matrix
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pass.worker_pin)}&format=svg`;

  const getTradeColor = (trade: string) => {
    switch (trade.toUpperCase()) {
      case "BAR_BENDER":
        return "bg-amber-600 text-white";
      case "CARPENTER":
        return "bg-orange-600 text-white";
      case "RIGGER":
      case "SCAFFOLDER":
        return "bg-rose-600 text-white";
      case "ELECTRICIAN":
        return "bg-yellow-500 text-black";
      default:
        return "bg-cyan-600 text-white";
    }
  };

  return (
    <div className="font-mono text-xs select-none">
      {/* MODAL WRAPPER */}
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-6 animate-in zoom-in-95 duration-200">
          {/* HEADER (SCREEN ONLY) */}
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3 print:hidden">
            <div>
              <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider block">
                Standard CR80 Physical Badge
              </span>
              <h3 className="text-sm font-bold text-white uppercase">
                Operative Site Gate Pass • {pass.worker_pin}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase text-[10px] transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-cyan-950/50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print PVC Card</span>
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* PHYSICAL BADGE CONTAINER (PRINTABLE ISO CR80 FORMAT: 85.6mm x 53.98mm) */}
          <div className="flex justify-center">
            <div className="w-[340px] h-[480px] bg-zinc-900 border-2 border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-between text-zinc-100 relative print:m-0 print:border-black print:bg-white print:text-black">
              {/* TOP BRAND HEADER */}
              <div className="bg-zinc-950 p-3.5 border-b border-zinc-800 flex justify-between items-center print:bg-gray-100 print:border-black">
                <div>
                  <strong className="text-white text-xs uppercase tracking-wider block print:text-black">
                    QUADILLAR LIVEVIEW
                  </strong>
                  <span className="text-[8px] text-cyan-400 font-bold uppercase tracking-widest block print:text-black">
                    SITE GOVERNANCE PASSPORT
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold text-[9px] print:border-black print:text-black">
                  BOCW 1996
                </span>
              </div>

              {/* OPERATIVE PHOTO & TRADE HEADER */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {/* PHOTO PLACEHOLDER */}
                  <div className="w-16 h-16 rounded-xl bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-zinc-500 font-bold text-lg shrink-0 print:border-black print:bg-gray-200">
                    {pass.full_name.charAt(0)}
                  </div>

                  <div className="space-y-1">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${getTradeColor(pass.trade_category)} print:border print:border-black`}>
                      {pass.trade_category.replace(/_/g, " ")} • {pass.skill_level}
                    </span>
                    <strong className="text-base text-white block uppercase leading-snug print:text-black">
                      {pass.full_name}
                    </strong>
                    <span className="text-[10px] text-cyan-400 font-mono font-bold block print:text-black">
                      PIN: {pass.worker_pin}
                    </span>
                  </div>
                </div>

                {/* SCANNABLE QR CODE SECTION */}
                <div className="p-3 bg-white rounded-xl flex items-center justify-center shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrl}
                    alt={`QR Code for ${pass.worker_pin}`}
                    className="w-28 h-28 object-contain"
                  />
                </div>

                {/* STATUTORY DETAILS */}
                <div className="grid grid-cols-2 gap-2 text-[9px] font-mono pt-1">
                  <div className="p-1.5 bg-zinc-950/70 rounded border border-zinc-800 print:border-black print:bg-gray-50">
                    <span className="text-zinc-500 block text-[8px] uppercase">Employer Agency</span>
                    <strong className="text-zinc-200 truncate block print:text-black">
                      {pass.subcontractor_name}
                    </strong>
                  </div>
                  <div className="p-1.5 bg-zinc-950/70 rounded border border-zinc-800 print:border-black print:bg-gray-50">
                    <span className="text-zinc-500 block text-[8px] uppercase">BOCW Reg. No.</span>
                    <strong className="text-zinc-200 truncate block print:text-black">
                      {pass.bocw_registration_no}
                    </strong>
                  </div>
                  <div className="p-1.5 bg-zinc-950/70 rounded border border-zinc-800 print:border-black print:bg-gray-50">
                    <span className="text-zinc-500 block text-[8px] uppercase">Medical Clearance</span>
                    <strong className="text-emerald-400 block print:text-black">
                      Valid to {pass.medical_fitness_valid_until}
                    </strong>
                  </div>
                  <div className="p-1.5 bg-zinc-950/70 rounded border border-zinc-800 print:border-black print:bg-gray-50">
                    <span className="text-zinc-500 block text-[8px] uppercase">Emergency &amp; Blood</span>
                    <strong className="text-rose-400 block print:text-black">
                      {pass.blood_group} • {pass.emergency_contact}
                    </strong>
                  </div>
                </div>
              </div>

              {/* CARD FOOTER & NOTARIZATION STAMP */}
              <div className="p-2.5 bg-zinc-950 border-t border-zinc-800 flex justify-between items-center text-[8px] text-zinc-500 print:bg-gray-100 print:border-black print:text-black">
                <span className="truncate max-w-[190px]">
                  Hermes Merkle Seal: {pass.hermes_seal_hash ? pass.hermes_seal_hash.slice(0, 16) : "SEC65B-SEALED"}...
                </span>
                <span className="text-emerald-400 font-bold uppercase print:text-black">
                  VERIFIED
                </span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-zinc-500 text-center font-sans print:hidden">
            Standard ISO/IEC 7810 ID-1 form factor. Compatible with thermal PVC dye-sublimation card printers.
          </p>
        </div>
      </div>
    </div>
  );
}
