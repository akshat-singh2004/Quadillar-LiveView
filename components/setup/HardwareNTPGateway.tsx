// components/setup/HardwareNTPGateway.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Fingerprint,
  Scale,
  Factory,
  Video,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  ShieldCheck,
  Building2,
  FileCheck2,
  ArrowRight,
  Stamp,
  Lock,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types & Hardware States
// ---------------------------------------------------------------------------

interface HardwareNode {
  id: string;
  name: string;
  protocol: string;
  ipAddress: string;
  status: "online" | "warning" | "checking";
  statusText: string;
  latency?: number;
  icon: React.ElementType;
}

const INITIAL_HARDWARE_NODES: HardwareNode[] = [
  {
    id: "node-biometric",
    name: "Biometric Labour Gate",
    protocol: "TCP/IP Edge Reader (ZKTeco Biosecurity)",
    ipAddress: "192.168.10.45:4370",
    status: "online",
    statusText: "Ping successful | Latency 42ms",
    latency: 42,
    icon: Fingerprint,
  },
  {
    id: "node-weighbridge",
    name: "Digital Weighbridge API",
    protocol: "RS-232 to Cloud IoT Bridge (Avery Berkel)",
    ipAddress: "192.168.10.88:8080",
    status: "online",
    statusText: "Ping successful | Calibration Valid",
    latency: 18,
    icon: Scale,
  },
  {
    id: "node-scada",
    name: "Concrete Batching Plant SCADA",
    protocol: "OPC-UA Server (Schwing Stetter M1)",
    ipAddress: "192.168.20.12:4840",
    status: "warning",
    statusText: "Offline | Fallback to manual entry",
    icon: Factory,
  },
  {
    id: "node-rtsp",
    name: "Site Camera RTSP Streams",
    protocol: "RTSP H.265 / ONVIF Profile S (PTZ Array)",
    ipAddress: "rtsp://edge.liveview.quadillar:554/ch0",
    status: "online",
    statusText: "Stream Verified | 1080p 25fps active",
    latency: 64,
    icon: Video,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HardwareNTPGateway() {
  const router = useRouter();

  // Telemetry Hardware State
  const [nodes, setNodes] = useState<HardwareNode[]>(INITIAL_HARDWARE_NODES);
  const [isPinging, setIsPinging] = useState(false);

  // Dual Signatory State
  const [clientPin, setClientPin] = useState("482910");
  const [isClientVerified, setIsClientVerified] = useState(false);
  const [clientSignedAt, setClientSignedAt] = useState<string | null>(null);

  const [architectPin, setArchitectPin] = useState("893124");
  const [isArchitectVerified, setIsArchitectVerified] = useState(false);
  const [architectSignedAt, setArchitectSignedAt] = useState<string | null>(null);

  // Submission State
  const [isIssuingNtp, setIsIssuingNtp] = useState(false);
  const [ntpIssued, setNtpIssued] = useState(false);

  // Re-Ping Hardware Simulation
  const handleRePing = () => {
    setIsPinging(true);
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        status: "checking",
        statusText: "Probing handshake endpoint...",
      }))
    );

    setTimeout(() => {
      setNodes([
        {
          id: "node-biometric",
          name: "Biometric Labour Gate",
          protocol: "TCP/IP Edge Reader (ZKTeco Biosecurity)",
          ipAddress: "192.168.10.45:4370",
          status: "online",
          statusText: "Ping successful | Latency 38ms",
          latency: 38,
          icon: Fingerprint,
        },
        {
          id: "node-weighbridge",
          name: "Digital Weighbridge API",
          protocol: "RS-232 to Cloud IoT Bridge (Avery Berkel)",
          ipAddress: "192.168.10.88:8080",
          status: "online",
          statusText: "Ping successful | Calibration Valid",
          latency: 16,
          icon: Scale,
        },
        {
          id: "node-scada",
          name: "Concrete Batching Plant SCADA",
          protocol: "OPC-UA Server (Schwing Stetter M1)",
          ipAddress: "192.168.20.12:4840",
          status: "warning",
          statusText: "Offline | Fallback to manual entry",
          icon: Factory,
        },
        {
          id: "node-rtsp",
          name: "Site Camera RTSP Streams",
          protocol: "RTSP H.265 / ONVIF Profile S (PTZ Array)",
          ipAddress: "rtsp://edge.liveview.quadillar:554/ch0",
          status: "online",
          statusText: "Stream Verified | 1080p 25fps active",
          latency: 58,
          icon: Video,
        },
      ]);
      setIsPinging(false);
    }, 1400);
  };

  // Signatory Handlers
  const handleVerifyClient = () => {
    if (clientPin.trim().length >= 4) {
      setIsClientVerified(true);
      setClientSignedAt(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    }
  };

  const handleVerifyArchitect = () => {
    if (architectPin.trim().length >= 4) {
      setIsArchitectVerified(true);
      setArchitectSignedAt(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    }
  };

  // Issue Notice to Proceed
  const handleIssueNTP = () => {
    if (!isClientVerified || !isArchitectVerified) return;

    setIsIssuingNtp(true);
    setTimeout(() => {
      setIsIssuingNtp(false);
      setNtpIssued(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2400);
    }, 1600);
  };

  const isNtpUnlocked = isClientVerified && isArchitectVerified;

  return (
    <div className="bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden">
      {/* =====================================================================
          SUCCESS ATTESTATION OVERLAY / BANNER
          ===================================================================== */}
      {ntpIssued && (
        <div className="bg-emerald-950/90 border-b border-emerald-800 p-5 text-emerald-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <Stamp className="h-6 w-6 text-emerald-400 shrink-0 animate-bounce" />
            <div>
              <div className="text-sm font-mono font-bold uppercase tracking-wider text-emerald-300">
                Notice to Proceed Issued & Contract Commenced
              </div>
              <div className="text-xs text-emerald-400/90 mt-0.5">
                Statutory NTP recorded under FIDIC Clause 8.1 / CPWD Clause 5. Initializing LiveView project command hub...
              </div>
            </div>
          </div>
          <span className="text-xs font-mono uppercase bg-emerald-900/80 border border-emerald-700 text-emerald-300 px-3 py-1 font-bold">
            COMMENCED
          </span>
        </div>
      )}

      {/* =====================================================================
          SPLIT-PANE LAYOUT
          ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-12">
        {/* ===================================================================
            LEFT PANE: HARDWARE TELEMETRY HANDSHAKE (col-span-1 md:col-span-6)
            =================================================================== */}
        <div className="col-span-1 md:col-span-6 p-8 border-r border-zinc-800 bg-zinc-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Edge Node Diagnostics
                </span>
                <h2 className="text-lg font-bold text-zinc-100 mt-0.5">
                  Hardware Telemetry Handshake
                </h2>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 bg-zinc-950 border border-zinc-800 text-zinc-400">
                4 NODES MAPPED
              </span>
            </div>

            <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
              Live automated ping diagnostics connecting on-site industrial IoT gateways to Quadillar LiveView event ingestion pipelines.
            </p>

            {/* Hardware Node List */}
            <div className="mt-6 space-y-3.5">
              {nodes.map((node) => {
                const Icon = node.icon;
                const isOnline = node.status === "online";
                const isWarning = node.status === "warning";
                const isChecking = node.status === "checking";

                return (
                  <div
                    key={node.id}
                    className="p-4 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-zinc-900 border border-zinc-800 shrink-0 text-zinc-300">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                            <span>{node.name}</span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              {node.ipAddress}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                            {node.protocol}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                isOnline
                                  ? "bg-emerald-500"
                                  : isWarning
                                  ? "bg-amber-500"
                                  : "bg-zinc-500 animate-ping"
                              }`}
                            />
                            <span
                              className={`text-[11px] font-mono font-medium ${
                                isOnline
                                  ? "text-emerald-400"
                                  : isWarning
                                  ? "text-amber-400"
                                  : "text-zinc-400"
                              }`}
                            >
                              {node.statusText}
                            </span>
                          </div>
                        </div>
                      </div>

                      {node.latency && (
                        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 border border-zinc-800">
                          {node.latency}ms
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action: Re-Ping Hardware Matrix */}
          <div className="mt-8 pt-5 border-t border-zinc-800">
            <button
              type="button"
              disabled={isPinging}
              onClick={handleRePing}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium font-mono uppercase tracking-wider transition-colors disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-zinc-400 ${
                  isPinging ? "animate-spin text-emerald-400" : ""
                }`}
              />
              <span>
                {isPinging ? "Querying Edge Nodes..." : "Re-Ping Hardware Matrix"}
              </span>
            </button>
          </div>
        </div>

        {/* ===================================================================
            RIGHT PANE: NOTICE TO PROCEED ATTESTATION (col-span-1 md:col-span-6)
            =================================================================== */}
        <div className="col-span-1 md:col-span-6 bg-zinc-950 p-8 border-l border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-500 font-bold">
                  FIDIC Clause 8.1 / CPWD Clause 5
                </span>
                <h2 className="text-lg font-bold text-zinc-100 mt-0.5">
                  Notice to Proceed (NTP) Attestation
                </h2>
              </div>
              <Stamp className="h-5 w-5 text-zinc-500" />
            </div>

            {/* Statutory Text Block */}
            <div className="mt-4 p-4 bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 leading-relaxed font-sans">
              <p>
                &ldquo;By countersigning this gateway, both parties agree that the site is handed over, telemetry is active, and the contractual Commencement Date is formally established.&rdquo;
              </p>
              <div className="mt-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                COMMENCEMENT EPOCH: {new Date().toISOString().split("T")[0]} | CONTRACT TENDER REF: DL/CPWD/2026/04
              </div>
            </div>

            {/* Dual Signatory Gate */}
            <div className="mt-6 space-y-5">
              {/* Gate 1: Client Signature */}
              <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-zinc-400" />
                    <span className="text-xs font-semibold text-zinc-200">
                      Client / Employer Representative
                    </span>
                  </div>
                  {isClientVerified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase bg-emerald-950/60 border border-emerald-800 text-emerald-400 px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      Signed ({clientSignedAt})
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase text-amber-500 bg-amber-950/30 px-2 py-0.5 border border-amber-900/60">
                      Signature Pending
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-zinc-400">
                  Shri V. K. Malhotra (Chief Project Engineer / Employer)
                </div>

                {!isClientVerified ? (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative flex-1">
                      <KeyRound className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        placeholder="Enter 6-Digit DSC PIN / OTP"
                        value={clientPin}
                        onChange={(e) => setClientPin(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs pl-9 pr-3 py-2 font-mono tracking-widest focus:outline-none focus:border-zinc-700"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyClient}
                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-mono uppercase tracking-wider border border-zinc-700 transition-colors"
                    >
                      Authenticate
                    </button>
                  </div>
                ) : (
                  <div className="p-2 bg-zinc-950 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                    <span>DSC CERT: IN-EMERG-2026-CLIENT-9921</span>
                    <span className="text-emerald-400">OK</span>
                  </div>
                )}
              </div>

              {/* Gate 2: Principal Architect Signature */}
              <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-zinc-400" />
                    <span className="text-xs font-semibold text-zinc-200">
                      Principal Architect / The Engineer
                    </span>
                  </div>
                  {isArchitectVerified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase bg-emerald-950/60 border border-emerald-800 text-emerald-400 px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      Signed ({architectSignedAt})
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase text-amber-500 bg-amber-950/30 px-2 py-0.5 border border-amber-900/60">
                      Signature Pending
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-zinc-400">
                  Ar. Rajesh Singhania (CoA Reg: CA/2012/54821)
                </div>

                {!isArchitectVerified ? (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative flex-1">
                      <KeyRound className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        placeholder="Enter 6-Digit DSC PIN / OTP"
                        value={architectPin}
                        onChange={(e) => setArchitectPin(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs pl-9 pr-3 py-2 font-mono tracking-widest focus:outline-none focus:border-zinc-700"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyArchitect}
                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-mono uppercase tracking-wider border border-zinc-700 transition-colors"
                    >
                      Authenticate
                    </button>
                  </div>
                ) : (
                  <div className="p-2 bg-zinc-950 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                    <span>DSC CERT: COA-IND-ARCH-2026-8812</span>
                    <span className="text-emerald-400">OK</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===================================================================
              ACTION FOOTER: ISSUE NOTICE TO PROCEED
              =================================================================== */}
          <div className="mt-8 pt-5 border-t border-zinc-800 space-y-3">
            <button
              type="button"
              disabled={!isNtpUnlocked || isIssuingNtp}
              onClick={handleIssueNTP}
              className={`w-full py-4 uppercase font-bold tracking-widest text-sm transition-all flex items-center justify-center gap-2 ${
                isNtpUnlocked && !isIssuingNtp
                  ? "bg-emerald-600 hover:bg-emerald-500 text-zinc-100 shadow-lg cursor-pointer"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60"
              }`}
            >
              {isIssuingNtp ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-zinc-400" />
                  <span>Recording Contractual NTP on Ledger...</span>
                </>
              ) : isNtpUnlocked ? (
                <>
                  <Stamp className="h-4 w-4 text-zinc-100" />
                  <span>Issue Notice to Proceed & Unlock LiveView</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-zinc-500" />
                  <span>Dual Countersignatures Required to Issue NTP</span>
                </>
              )}
            </button>

            <p className="text-[11px] font-mono text-zinc-500 text-center tracking-tight">
              INTERLOCK: Notice to Proceed triggers contract duration clock and initializes automated liquidated damage metrics under CPWD Clause 2.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
