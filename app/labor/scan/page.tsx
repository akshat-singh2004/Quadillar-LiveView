"use client";

import React, { useState } from "react";
import { verifyAndPunchGatePass, ScanResult } from "@/app/actions/scan-actions";
import { QrCode, ShieldCheck, ShieldAlert, ArrowLeft, Loader2, CheckCircle2, UserCheck, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function TurnstileScannerPage() {
  const [projectId] = useState("GOMTI-NAGAR-PH1-FITOUT");
  const [inputVal, setInputVal] = useState("PIN-104");
  const [direction, setDirection] = useState<"INGRESS" | "EGRESS">("INGRESS");
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    setLoading(true);
    try {
      const result = await verifyAndPunchGatePass(projectId, inputVal, direction);
      setLastScan(result);
      if (result.accessGranted) {
        setInputVal("");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <QrCode className="w-3.5 h-3.5" />
            <span>FIELD PHYSICAL ACCESS • TURNSTILE TERMINAL #01 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Turnstile QR Ingress Scanner &amp; Verification Gantry
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            Low-latency optical QR credential verification, medical fitness validation, and biometric attendance recording.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/labor/passes"
            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold uppercase text-[10px] transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Manage Gate Passes</span>
          </Link>
        </div>
      </header>

      {/* SCANNER INTERFACE & LIVE VERDICT HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* PANEL 1: SCANNER INPUT */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div>
            <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold block mb-1">
              Optical Scanner / NFC Gantry Simulation
            </span>
            <h3 className="text-base font-bold text-white uppercase">
              Scan QR Credential or Worker PIN
            </h3>
            <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
              USB optical barcode scanner or guard manual PIN keypad input.
            </p>
          </div>

          <form onSubmit={handleScan} className="space-y-4">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                Turnstile Direction
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection("INGRESS")}
                  className={`py-2 rounded-lg font-bold uppercase text-[11px] transition cursor-pointer ${
                    direction === "INGRESS"
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/40"
                      : "bg-zinc-950 text-zinc-400 border border-zinc-800"
                  }`}
                >
                  &darr; Ingress (Entry)
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("EGRESS")}
                  className={`py-2 rounded-lg font-bold uppercase text-[11px] transition cursor-pointer ${
                    direction === "EGRESS"
                      ? "bg-amber-600 text-white shadow-lg shadow-amber-950/40"
                      : "bg-zinc-950 text-zinc-400 border border-zinc-800"
                  }`}
                >
                  &uarr; Egress (Exit)
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                Scan Input (QR Hash / Pass ID / Worker PIN)
              </label>
              <input
                type="text"
                autoFocus
                required
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Scan QR or enter PIN-104..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-cyan-300 font-mono text-sm font-bold tracking-wider placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold uppercase rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              <span>Verify &amp; Punch Turnstile</span>
            </button>
          </form>

          {/* QUICK TEST CHIPS */}
          <div className="pt-2 border-t border-zinc-800 space-y-1.5">
            <span className="text-[9px] text-zinc-500 uppercase font-bold block">
              Quick Test Badges:
            </span>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <button
                type="button"
                onClick={() => setInputVal("PIN-101")}
                className="px-2 py-1 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
              >
                PIN-101 (Skilled)
              </button>
              <button
                type="button"
                onClick={() => setInputVal("PIN-104")}
                className="px-2 py-1 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
              >
                PIN-104 (General)
              </button>
              <button
                type="button"
                onClick={() => setInputVal("PIN-UNKNOWN")}
                className="px-2 py-1 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-rose-400 cursor-pointer"
              >
                PIN-UNKNOWN (Test Fail)
              </button>
            </div>
          </div>
        </div>

        {/* PANEL 2: LIVE ACCESS VERDICT HUD */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-1">
              Gantry Physical Barrier Status
            </span>
            <h3 className="text-base font-bold text-white uppercase">
              Access Clearance HUD
            </h3>

            {!lastScan ? (
              <div className="p-12 text-center text-zinc-600 font-sans mt-4 border border-dashed border-zinc-800 rounded-xl">
                Ready for badge scan. Stand in front of turnstile gantry and present optical QR credential.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {/* VERDICT BANNER */}
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    lastScan.accessGranted
                      ? "bg-emerald-950/60 border-emerald-800 text-emerald-200"
                      : "bg-rose-950/60 border-rose-800 text-rose-200"
                  }`}
                >
                  {lastScan.accessGranted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block text-sm uppercase tracking-wide">
                      {lastScan.accessGranted ? "BARRIER UNLOCKED: ACCESS GRANTED" : "BARRIER LOCKED: ACCESS DENIED"}
                    </strong>
                    <p className="text-[11px] font-sans mt-0.5">
                      {lastScan.message}
                    </p>
                  </div>
                </div>

                {/* WORKER DETAILS CARD */}
                {lastScan.worker && (
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 text-[11px]">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                      <div>
                        <strong className="text-white text-sm">{lastScan.worker.name}</strong>
                        <span className="text-cyan-400 block font-mono">{lastScan.worker.pin}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold text-[10px]">
                        {lastScan.worker.tier}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-1.5 text-zinc-400 font-sans pt-1">
                      <div>Trade: <strong className="text-zinc-200">{lastScan.worker.trade}</strong></div>
                      <div>Agency: <strong className="text-zinc-200">{lastScan.worker.agency}</strong></div>
                      <div>Blood Group: <strong className="text-rose-400 font-mono">{lastScan.worker.bloodGroup}</strong></div>
                      <div>Emergency: <strong className="text-zinc-200 font-mono">{lastScan.worker.emergencyContact}</strong></div>
                    </div>

                    {lastScan.worker.permittedZones && lastScan.worker.permittedZones.length > 0 && (
                      <div className="pt-2 border-t border-zinc-800 flex gap-1">
                        {lastScan.worker.permittedZones.map((z) => (
                          <span key={z} className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[9px] font-mono">
                            {z.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
            <span>Hermes Notarized: Section 65B</span>
            <span className="text-emerald-400 font-bold">100% Biometric Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
}
