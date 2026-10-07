/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; } }
type SpeechRecognitionEvent = any;
type SpeechRecognitionErrorEvent = any;
/* eslint-enable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import {
  Users,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  FileText,
  ShieldAlert,
  Mic,
  MicOff,
  Save,
  Share2,
  Clock,
  Check,
  Hash,
} from "lucide-react";
import { submitDPRRecord } from "@/app/actions/dpr-actions";

export type MachineryStatus = "Running" | "Idle" | "Breakdown";
export type AttributableParty = "Client" | "Contractor" | "Weather";

export interface LaborTrade {
  id: string;
  name: string;
  planned: number;
  actual: number;
}

export interface MachineryItem {
  id: string;
  name: string;
  assetId: string;
  status: MachineryStatus;
  hoursRun: number;
}

export interface ExecutedQuantity {
  id: string;
  boqRef: string;
  elementZone: string;
  quantity: number;
  unit: string;
}

export interface DPRComposerProps {
  projectId?: string;
  dateString?: string;
  initialTrades?: LaborTrade[];
  initialMachinery?: MachineryItem[];
  initialQuantities?: ExecutedQuantity[];
  registeredAssets?: { id: string; assetId: string; name: string }[];
  sanctionedBoqList?: { id: string; code: string; description: string; unit: string }[];
}

const COMMON_TRADE_PRESETS = [
  "Shuttering Carpenters",
  "Barbenders",
  "Masons (Civil)",
  "Scaffolders",
  "MEP Technicians",
  "Welders / Fitters",
  "Tower Crane Operators",
  "Unskilled Helpers",
];

export function DPRComposer({
  projectId = "PRJ-DEFAULT",
  dateString = new Date().toISOString().split("T")[0],
  initialTrades = [],
  initialMachinery = [],
  initialQuantities = [],
  registeredAssets = [],
  sanctionedBoqList = [],
}: DPRComposerProps) {
  const [isPending, startTransition] = useTransition();

  // --- Dynamic State (Zero Mocks) ---
  const [trades, setTrades] = useState<LaborTrade[]>(initialTrades);
  const [machinery, setMachinery] = useState<MachineryItem[]>(initialMachinery);
  const [quantities, setQuantities] = useState<ExecutedQuantity[]>(initialQuantities);

  // New Trade Inline Form
  const [newTradeName, setNewTradeName] = useState("");
  const [newTradePlanned, setNewTradePlanned] = useState("");
  const [newTradeActual, setNewTradeActual] = useState("");
  const [showAddTrade, setShowAddTrade] = useState(false);

  // New Machinery Inline Form
  const [newMachineName, setNewMachineName] = useState("");
  const [newMachineAssetId, setNewMachineAssetId] = useState("");
  const [newMachineHours, setNewMachineHours] = useState("");
  const [newMachineStatus, setNewMachineStatus] = useState<MachineryStatus>("Running");
  const [showAddMachine, setShowAddMachine] = useState(false);

  // Executed Quantity Form
  const [newBoqRef, setNewBoqRef] = useState("");
  const [newElementZone, setNewElementZone] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newUnit, setNewUnit] = useState("m³");

  // Hindrance State
  const [logHindrance, setLogHindrance] = useState(false);
  const [hindranceCause, setHindranceCause] = useState("");
  const [attributableParty, setAttributableParty] = useState<AttributableParty>("Client");
  const [delayImpactHours, setDelayImpactHours] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  // Status & Telemetry
  const [notification, setNotification] = useState<{
    message: string;
    type: "info" | "success" | "error";
  } | null>(null);
  const [isSealed, setIsSealed] = useState(false);
  const [merkleHash, setMerkleHash] = useState<string | null>(null);
  const [lastAutoSaved, setLastAutoSaved] = useState<string | null>(null);

  // Local storage storage key
  const storageKey = useMemo(
    () => `quadillar_dpr_draft_${projectId}_${dateString}`,
    [projectId, dateString]
  );

  // --- 1. Offline Recovery / Local Draft Loader ---
  useEffect(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.trades?.length) setTrades(parsed.trades);
        if (parsed.machinery?.length) setMachinery(parsed.machinery);
        if (parsed.quantities?.length) setQuantities(parsed.quantities);
        if (parsed.hindrance) {
          setLogHindrance(true);
          setHindranceCause(parsed.hindrance.cause || "");
          setAttributableParty(parsed.hindrance.party || "Client");
          setDelayImpactHours(parsed.hindrance.hours || "");
        }
        setLastAutoSaved(new Date().toLocaleTimeString());
      }
    } catch {
      // Storage unavailable or disabled
    }
  }, [storageKey]);

  // --- 2. Auto-Save Debounce (Trench Recovery) ---
  useEffect(() => {
    if (isSealed) return;
    const timeout = setTimeout(() => {
      try {
        const payload = {
          trades,
          machinery,
          quantities,
          hindrance: logHindrance
            ? { cause: hindranceCause, party: attributableParty, hours: delayImpactHours }
            : null,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        setLastAutoSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } catch {
        // Handle quota errors silently
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [trades, machinery, quantities, logHindrance, hindranceCause, attributableParty, delayImpactHours, isSealed, storageKey]);

  // Calculations
  const totalPlanned = useMemo(() => trades.reduce((sum, t) => sum + (t.planned || 0), 0), [trades]);
  const totalActual = useMemo(() => trades.reduce((sum, t) => sum + (t.actual || 0), 0), [trades]);
  const complianceRate = useMemo(
    () => (totalPlanned > 0 ? ((totalActual / totalPlanned) * 100).toFixed(1) : "0.0"),
    [totalActual, totalPlanned]
  );

  // --- Trade Actions ---
  const handleActualChange = (id: string, val: string) => {
    const num = parseInt(val, 10);
    setTrades((prev) =>
      prev.map((t) => (t.id === id ? { ...t, actual: isNaN(num) ? 0 : Math.max(0, num) } : t))
    );
  };

  const handlePlannedChange = (id: string, val: string) => {
    const num = parseInt(val, 10);
    setTrades((prev) =>
      prev.map((t) => (t.id === id ? { ...t, planned: isNaN(num) ? 0 : Math.max(0, num) } : t))
    );
  };

  const handleAddTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTradeName.trim()) return;
    const item: LaborTrade = {
      id: `tr-${Date.now()}`,
      name: newTradeName.trim(),
      planned: parseInt(newTradePlanned, 10) || 0,
      actual: parseInt(newTradeActual, 10) || 0,
    };
    setTrades((prev) => [...prev, item]);
    setNewTradeName("");
    setNewTradePlanned("");
    setNewTradeActual("");
    setShowAddTrade(false);
  };

  const handleAddPresetTrade = (tradeName: string) => {
    if (trades.some((t) => t.name.toLowerCase() === tradeName.toLowerCase())) return;
    setTrades((prev) => [
      ...prev,
      { id: `tr-${Date.now()}-${Math.random()}`, name: tradeName, planned: 0, actual: 0 },
    ]);
  };

  const handleDeleteTrade = (id: string) => {
    setTrades((prev) => prev.filter((t) => t.id !== id));
  };

  // --- Machinery Actions ---
  const handleMachineryStatusChange = (id: string, status: MachineryStatus) => {
    setMachinery((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
  };

  const handleMachineryHoursChange = (id: string, val: string) => {
    const num = parseFloat(val);
    setMachinery((prev) =>
      prev.map((m) => (m.id === id ? { ...m, hoursRun: isNaN(num) ? 0 : Math.max(0, num) } : m))
    );
  };

  const handleAddMachinery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachineName.trim() || !newMachineAssetId.trim()) return;
    const item: MachineryItem = {
      id: `mac-${Date.now()}`,
      name: newMachineName.trim(),
      assetId: newMachineAssetId.trim().toUpperCase(),
      status: newMachineStatus,
      hoursRun: parseFloat(newMachineHours) || 0,
    };
    setMachinery((prev) => [...prev, item]);
    setNewMachineName("");
    setNewMachineAssetId("");
    setNewMachineHours("");
    setShowAddMachine(false);
  };

  const handleDeleteMachinery = (id: string) => {
    setMachinery((prev) => prev.filter((m) => m.id !== id));
  };

  // --- Quantity Actions ---
  const handleAddQuantity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoqRef.trim() || !newElementZone.trim() || !newQuantity) return;
    const item: ExecutedQuantity = {
      id: `qty-${Date.now()}`,
      boqRef: newBoqRef.trim().toUpperCase(),
      elementZone: newElementZone.trim(),
      quantity: parseFloat(newQuantity) || 0,
      unit: newUnit,
    };
    setQuantities((prev) => [...prev, item]);
    setNewBoqRef("");
    setNewElementZone("");
    setNewQuantity("");
  };

  const handleDeleteQuantity = (id: string) => {
    setQuantities((prev) => prev.filter((q) => q.id !== id));
  };

  // --- Voice Dictation for Field Engineers ---
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setNotification({
        message: "Web Speech API not supported on this device/browser.",
        type: "error",
      });
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setHindranceCause((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  // --- Cryptographic Hash & Sealing ---
  const generateSha256 = async (data: string): Promise<string> => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleSealDpr = () => {
    if (trades.length === 0 && quantities.length === 0) {
      setNotification({
        message: "Cannot seal an empty DPR. Add at least one labor trade or executed quantity.",
        type: "error",
      });
      return;
    }

    if (logHindrance && !hindranceCause.trim()) {
      setNotification({
        message: "Hindrance description is mandatory when hindrance switch is ON.",
        type: "error",
      });
      return;
    }

    startTransition(async () => {
      const payload = {
        projectId,
        date: dateString,
        totalHeadcount: totalActual,
        totalPlanned,
        complianceRate: parseFloat(complianceRate),
        trades,
        machinery,
        quantities,
        hindrance: logHindrance
          ? {
            cause: hindranceCause.trim(),
            party: attributableParty,
            hours: parseFloat(delayImpactHours) || 0,
          }
          : null,
      };

      // Generate client-side cryptographic fingerprint
      const payloadString = JSON.stringify(payload);
      const hash = await generateSha256(payloadString);
      setMerkleHash(hash);

      const result = await submitDPRRecord(payload);

      if (result.success) {
        setIsSealed(true);
        localStorage.removeItem(storageKey);
        setNotification({
          message: "DPR sealed and committed to the LiveView immutable ledger.",
          type: "success",
        });
      } else {
        setNotification({
          message: `Submission Failed: ${result.error}`,
          type: "error",
        });
      }
    });
  };

  // --- One-Click WhatsApp Dispatch Format ---
  const handleWhatsAppShare = () => {
    const text = `*QUADILLAR LIVEVIEW - DAILY PROGRESS REPORT*
Project: ${projectId}
Date: ${dateString}
----------------------------------------
*LABOR STRENGTH:* ${totalActual} Present / ${totalPlanned} Planned (${complianceRate}%)
*EQUIPMENT:* ${machinery.filter((m) => m.status === "Running").length} Running, ${machinery.filter((m) => m.status === "Breakdown").length} Breakdown
*MAJOR EXECUTIONS:*
${quantities.map((q) => `• ${q.boqRef} (${q.elementZone}): ${q.quantity} ${q.unit}`).join("\n") || "None logged"}
${logHindrance ? `----------------------------------------\n*⚠️ ACTIVE HINDRANCE:* ${hindranceCause} (${delayImpactHours}h impact - Attributable: ${attributableParty})` : ""}
----------------------------------------
Verified Cryptographic Seal: ${merkleHash ? `${merkleHash.substring(0, 12)}...` : "PENDING"}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6 select-none font-mono">
      {/* Telemetry Alert Bar */}
      {notification && (
        <div
          className={`p-3.5 border text-xs flex items-center justify-between ${notification.type === "success"
              ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
              : notification.type === "error"
                ? "bg-rose-950/80 border-rose-800 text-rose-300"
                : "bg-zinc-900 border-zinc-700 text-zinc-300"
            }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "error" ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            )}
            <span>{notification.message}</span>
          </div>
          {merkleHash && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-zinc-950 px-2 py-0.5 border border-zinc-800 text-zinc-400 font-mono">
                SHA: {merkleHash.substring(0, 10)}...
              </span>
            </div>
          )}
        </div>
      )}

      {/* DPR Header Metric Stripe */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-zinc-400 font-bold uppercase tracking-wider">PROJECT:</span>
          <span className="text-zinc-100 font-bold">{projectId}</span>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-400 font-bold uppercase tracking-wider">DATE:</span>
          <span className="text-zinc-100">{dateString}</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-zinc-400">
          {lastAutoSaved && (
            <span className="flex items-center gap-1 text-zinc-500">
              <Save className="h-3 w-3" /> Auto-saved: {lastAutoSaved}
            </span>
          )}
          <span className="bg-zinc-950 border border-zinc-800 px-2.5 py-1 text-zinc-300">
            Headcount: <strong className="text-zinc-100">{totalActual}</strong> / {totalPlanned}
          </span>
          <span className="bg-zinc-950 border border-zinc-800 px-2.5 py-1 text-zinc-300">
            Compliance:{" "}
            <strong
              className={
                parseFloat(complianceRate) >= 90
                  ? "text-emerald-400"
                  : parseFloat(complianceRate) >= 70
                    ? "text-amber-400"
                    : "text-rose-400"
              }
            >
              {complianceRate}%
            </strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Labor Deployment & Machinery */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Module 1: Labor Deployment */}
          <div className="bg-zinc-900 border border-zinc-800">
            <div className="px-5 py-3.5 border-b border-zinc-800/60 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                  <Users className="h-4 w-4 text-zinc-400" />
                  <span>Statutory Labor Deployment</span>
                </h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">CPWD Cl. 19 Muster Roll Reconciliation</p>
              </div>
              {!isSealed && (
                <button
                  type="button"
                  onClick={() => setShowAddTrade(!showAddTrade)}
                  className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-2 py-1 flex items-center gap-1 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add Trade
                </button>
              )}
            </div>

            {/* Quick-Add Standard Trade Chips */}
            {!isSealed && (
              <div className="p-3 bg-zinc-950/40 border-b border-zinc-800/50">
                <span className="text-[10px] text-zinc-500 block mb-1.5 uppercase tracking-wider">
                  Quick-Add Standard Roster:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_TRADE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddPresetTrade(preset)}
                      disabled={trades.some((t) => t.name.toLowerCase() === preset.toLowerCase())}
                      className="text-[10px] px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Trade In-line Form */}
            {showAddTrade && !isSealed && (
              <form onSubmit={handleAddTrade} className="p-3 bg-zinc-950/90 border-b border-zinc-800 text-xs">
                <div className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Trade Name (e.g. Scaffolder)"
                    value={newTradeName}
                    onChange={(e) => setNewTradeName(e.target.value)}
                    className="col-span-6 bg-zinc-900 border border-zinc-700 px-2 py-1 text-zinc-100 placeholder:text-zinc-600 outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Plan"
                    value={newTradePlanned}
                    onChange={(e) => setNewTradePlanned(e.target.value)}
                    className="col-span-3 bg-zinc-900 border border-zinc-700 px-2 py-1 text-zinc-100 text-right tabular-nums outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Act"
                    value={newTradeActual}
                    onChange={(e) => setNewTradeActual(e.target.value)}
                    className="col-span-3 bg-zinc-900 border border-zinc-700 px-2 py-1 text-zinc-100 text-right tabular-nums outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTrade(false)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1"
                  >
                    Save Row
                  </button>
                </div>
              </form>
            )}

            {/* Labor Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800/60 bg-zinc-950/60 text-[10px] text-zinc-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4 font-normal">Trade Description</th>
                    <th className="py-2.5 px-3 font-normal text-right">Planned</th>
                    <th className="py-2.5 px-4 font-normal text-right">Actual</th>
                    {!isSealed && <th className="py-2.5 px-2 font-normal text-center w-8"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {trades.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-zinc-600 text-xs">
                        No labor trades logged yet. Click quick-add chips or &quot;+ Add Trade&quot; above.
                      </td>
                    </tr>
                  ) : (
                    trades.map((trade) => {
                      const variance = trade.actual - trade.planned;
                      return (
                        <tr key={trade.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="py-2.5 px-4 text-zinc-200 font-medium">{trade.name}</td>
                          <td className="py-2.5 px-3 text-right">
                            {isSealed ? (
                              <span className="text-zinc-400 tabular-nums">{trade.planned}</span>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                value={trade.planned}
                                onChange={(e) => handlePlannedChange(trade.id, e.target.value)}
                                className="w-14 bg-zinc-950 border border-zinc-800 focus:border-zinc-600 text-right px-1.5 py-0.5 text-xs text-zinc-300 tabular-nums"
                              />
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isSealed ? (
                                <span className="font-bold text-zinc-100 tabular-nums">{trade.actual}</span>
                              ) : (
                                <input
                                  type="number"
                                  min={0}
                                  value={trade.actual}
                                  onChange={(e) => handleActualChange(trade.id, e.target.value)}
                                  className="w-14 bg-zinc-950 border border-zinc-700 focus:border-zinc-500 text-right px-1.5 py-0.5 text-xs text-zinc-100 font-bold tabular-nums"
                                />
                              )}
                              <span
                                className={`text-[10px] w-6 text-right tabular-nums ${variance < 0
                                    ? "text-rose-400"
                                    : variance > 0
                                      ? "text-emerald-400"
                                      : "text-zinc-500"
                                  }`}
                              >
                                {variance > 0 ? `+${variance}` : variance}
                              </span>
                            </div>
                          </td>
                          {!isSealed && (
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteTrade(trade.id)}
                                className="text-zinc-600 hover:text-rose-400 transition-colors p-1"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Module 2: Plant & Heavy Machinery */}
          <div className="bg-zinc-900 border border-zinc-800">
            <div className="px-5 py-3.5 border-b border-zinc-800/60 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-zinc-400" />
                  <span>Plant &amp; Machinery Fleet</span>
                </h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">IS 4573 Telematics &amp; Operational Log</p>
              </div>
              {!isSealed && (
                <button
                  type="button"
                  onClick={() => setShowAddMachine(!showAddMachine)}
                  className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-2 py-1 flex items-center gap-1 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Log Equipment
                </button>
              )}
            </div>

            {/* In-Line Machine Form */}
            {showAddMachine && !isSealed && (
              <form onSubmit={handleAddMachinery} className="p-3 bg-zinc-950/90 border-b border-zinc-800 text-xs">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {registeredAssets.length > 0 ? (
                      <select
                        value={newMachineName}
                        onChange={(e) => {
                          const asset = registeredAssets.find((a) => a.name === e.target.value);
                          if (asset) {
                            setNewMachineName(asset.name);
                            setNewMachineAssetId(asset.assetId);
                          } else {
                            setNewMachineName(e.target.value);
                          }
                        }}
                        className="bg-zinc-900 border border-zinc-700 px-2 py-1 text-zinc-100 outline-none"
                      >
                        <option value="">Select Inwarded Asset</option>
                        {registeredAssets.map((a) => (
                          <option key={a.id} value={a.name}>
                            {a.name} ({a.assetId})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        placeholder="Machine Name (e.g. Tower Crane 1)"
                        value={newMachineName}
                        onChange={(e) => setNewMachineName(e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 px-2 py-1 text-zinc-100 placeholder:text-zinc-600 outline-none"
                      />
                    )}
                    <input
                      type="text"
                      required
                      placeholder="Asset Tag (e.g. EQ-TC-01)"
                      value={newMachineAssetId}
                      onChange={(e) => setNewMachineAssetId(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 px-2 py-1 text-zinc-100 uppercase placeholder:text-zinc-600 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      placeholder="Running Hours (e.g. 7.5)"
                      value={newMachineHours}
                      onChange={(e) => setNewMachineHours(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 px-2 py-1 text-zinc-100 tabular-nums outline-none"
                    />
                    <select
                      value={newMachineStatus}
                      onChange={(e) => setNewMachineStatus(e.target.value as MachineryStatus)}
                      className="bg-zinc-900 border border-zinc-700 px-2 py-1 text-zinc-100 outline-none"
                    >
                      <option value="Running">Running</option>
                      <option value="Idle">Idle</option>
                      <option value="Breakdown">Breakdown</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMachine(false)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1"
                  >
                    Commit Equipment
                  </button>
                </div>
              </form>
            )}

            {/* Machinery List */}
            <div className="p-4 space-y-2.5 text-xs">
              {machinery.length === 0 ? (
                <div className="py-6 text-center text-zinc-600">
                  Zero plant machinery logged for this shift. Click &quot;Log Equipment&quot; above.
                </div>
              ) : (
                machinery.map((mac) => (
                  <div
                    key={mac.id}
                    className="bg-zinc-950 border border-zinc-800 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-zinc-200">{mac.name}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        ASSET: <span className="text-zinc-400 font-bold">{mac.assetId}</span> • Logged:{" "}
                        {isSealed ? (
                          <span className="text-zinc-300 font-bold">{mac.hoursRun.toFixed(1)} Hrs</span>
                        ) : (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            value={mac.hoursRun}
                            onChange={(e) => handleMachineryHoursChange(mac.id, e.target.value)}
                            className="w-12 bg-zinc-900 border border-zinc-700 text-right px-1 py-0.5 text-zinc-200 tabular-nums"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(["Running", "Idle", "Breakdown"] as MachineryStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          disabled={isSealed || isPending}
                          onClick={() => handleMachineryStatusChange(mac.id, status)}
                          className={`px-2 py-1 text-[10px] border uppercase tracking-wider transition-colors ${mac.status === status
                              ? status === "Running"
                                ? "bg-emerald-950/80 border-emerald-700 text-emerald-400 font-bold"
                                : status === "Idle"
                                  ? "bg-amber-950/80 border-amber-700 text-amber-400 font-bold"
                                  : "bg-rose-950/80 border-rose-700 text-rose-400 font-bold"
                              : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                            }`}
                        >
                          {status}
                        </button>
                      ))}
                      {!isSealed && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMachinery(mac.id)}
                          className="text-zinc-600 hover:text-rose-400 p-1 ml-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Executed Quantities & Hindrance Journal */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          {/* Module 3: Daily Quantities Executed */}
          <div className="bg-zinc-900 border border-zinc-800">
            <div className="px-5 py-3.5 border-b border-zinc-800/60 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-zinc-400" />
                  <span>Physical Execution Ledger</span>
                </h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">IS 1200 Work Measurement Feed</p>
              </div>
              <span className="text-[10px] text-zinc-400">
                {quantities.length} Verified Entries
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800/60 bg-zinc-950/60 text-[10px] text-zinc-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4 font-normal">BOQ Reference</th>
                    <th className="py-2.5 px-4 font-normal">Element / Grid Zone</th>
                    <th className="py-2.5 px-4 font-normal text-right">Quantity</th>
                    {!isSealed && <th className="py-2.5 px-3 font-normal text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {quantities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-zinc-600 text-xs">
                        No physical execution logged for this shift. Record work below.
                      </td>
                    </tr>
                  ) : (
                    quantities.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="py-3 px-4 font-bold text-zinc-200">{item.boqRef}</td>
                        <td className="py-3 px-4 text-zinc-300">{item.elementZone}</td>
                        <td className="py-3 px-4 text-right font-bold text-zinc-100 tabular-nums">
                          {item.quantity.toFixed(2)} {item.unit}
                        </td>
                        {!isSealed && (
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteQuantity(item.id)}
                              className="text-zinc-600 hover:text-rose-400 transition-colors p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Work Quantity Input Gateway */}
            {!isSealed && (
              <form onSubmit={handleAddQuantity} className="p-4 bg-zinc-950/40 border-t border-zinc-800/60 text-xs">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-bold">
                  + Add Executed Work Line
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-3">
                    {sanctionedBoqList.length > 0 ? (
                      <select
                        value={newBoqRef}
                        onChange={(e) => {
                          const boq = sanctionedBoqList.find((b) => b.code === e.target.value);
                          setNewBoqRef(e.target.value);
                          if (boq?.unit) setNewUnit(boq.unit);
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-zinc-100 outline-none"
                      >
                        <option value="">Select BOQ</option>
                        {sanctionedBoqList.map((b) => (
                          <option key={b.id} value={b.code}>
                            {b.code} - {b.description.substring(0, 20)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        placeholder="BOQ Item (e.g. C-30)"
                        value={newBoqRef}
                        onChange={(e) => setNewBoqRef(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600 uppercase"
                      />
                    )}
                  </div>
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      required
                      placeholder="Structural Zone (e.g. Grid C2 Column)"
                      value={newElementZone}
                      onChange={(e) => setNewElementZone(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Qty"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 text-right outline-none focus:border-zinc-600 tabular-nums"
                    />
                  </div>
                  <div className="sm:col-span-2 flex gap-1">
                    <select
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      className="w-16 bg-zinc-950 border border-zinc-800 px-1 py-1.5 text-zinc-100 outline-none focus:border-zinc-600 text-center"
                    >
                      <option value="m³">m³</option>
                      <option value="sqm">sqm</option>
                      <option value="MT">MT</option>
                      <option value="Rmt">Rmt</option>
                      <option value="Nos">Nos</option>
                    </select>
                    <button
                      type="submit"
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex-1 flex items-center justify-center transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Module 4: Contemporaneous Hindrance Journal */}
          <div className="bg-zinc-900 border border-zinc-800">
            <div className="px-5 py-4 border-b border-zinc-800/60 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100">
                    Contemporaneous Hindrance Journal
                  </h2>
                </div>
                <p className="text-[10px] text-zinc-500 mt-0.5">SCL Protocol Delay Engine Record (Cl. 5 CPWD)</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-zinc-400 text-[11px]">Log Hindrance</span>
                <button
                  type="button"
                  disabled={isSealed || isPending}
                  onClick={() => setLogHindrance(!logHindrance)}
                  className={`w-11 h-6 border transition-colors flex items-center p-0.5 ${logHindrance ? "bg-amber-600 border-amber-500 justify-end" : "bg-zinc-950 border-zinc-700 justify-start"
                    }`}
                >
                  <span className="h-4 w-4 bg-zinc-100 block" />
                </button>
              </div>
            </div>

            {logHindrance ? (
              <div className="p-5 space-y-4 text-xs bg-zinc-950/60 border-t border-zinc-800/80">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                      Attributable Entity
                    </label>
                    <select
                      value={attributableParty}
                      disabled={isSealed || isPending}
                      onChange={(e) => setAttributableParty(e.target.value as AttributableParty)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 outline-none"
                    >
                      <option value="Client">Client / PMC Hold (Compensation Claim)</option>
                      <option value="Contractor">Contractor Fault (Liquidated Damages)</option>
                      <option value="Weather">Weather / Force Majeure (Time Extension Only)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                      Direct Idle Hours Impact
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        placeholder="Hours (e.g. 3.0)"
                        value={delayImpactHours}
                        disabled={isSealed || isPending}
                        onChange={(e) => setDelayImpactHours(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 outline-none tabular-nums pr-8"
                      />
                      <Clock className="h-3.5 w-3.5 text-zinc-500 absolute right-2.5 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-zinc-400 text-[10px] uppercase">
                      Engineering Cause of Delay
                    </label>
                    {!isSealed && (
                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        className={`text-[10px] flex items-center gap-1 px-2 py-0.5 border ${isRecording
                            ? "bg-rose-950 border-rose-700 text-rose-300 animate-pulse"
                            : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                          }`}
                      >
                        {isRecording ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                        {isRecording ? "Listening..." : "Dictate (Voice)"}
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    disabled={isSealed || isPending}
                    value={hindranceCause}
                    onChange={(e) => setHindranceCause(e.target.value)}
                    placeholder="Provide specific engineering hindrance notes (e.g. RFI #42 pending structural approval, grid B3 rebar hold by PMC)..."
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-700"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-zinc-950/30 text-zinc-600 text-xs text-center">
                Zero contemporaneous hindrances logged for this operational shift.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STICKY ACTION GATEWAY */}
      <div className="sticky bottom-0 z-20 bg-zinc-900 border-t border-zinc-800 p-4 -mx-6 -mb-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${isSealed ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                }`}
            />
            <span className="text-zinc-200 font-bold">
              {isSealed ? "SEALED & COMMITTED" : "DRAFT MODE"}
            </span>
          </div>
          <span className="hidden md:inline text-zinc-700">|</span>
          <span className="hidden md:inline">
            Active Trades: <strong className="text-zinc-200">{trades.length}</strong>
          </span>
          <span className="hidden md:inline text-zinc-700">|</span>
          <span className="hidden md:inline">
            Total Plant Units: <strong className="text-zinc-200">{machinery.length}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* WhatsApp Share Button */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 px-3.5 py-2.5 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>WhatsApp DPR</span>
          </button>

          {/* Cryptographic Seal & Commit */}
          <button
            type="button"
            disabled={isSealed || isPending}
            onClick={handleSealDpr}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold uppercase tracking-wider text-xs px-6 py-2.5 transition-colors cursor-pointer flex items-center gap-2"
          >
            {isPending ? (
              "Hashing & Syncing..."
            ) : isSealed ? (
              <>
                <Check className="h-4 w-4" />
                <span>Sealed ✓</span>
              </>
            ) : (
              <>
                <Hash className="h-4 w-4" />
                <span>Seal DPR (Cryptographic)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}