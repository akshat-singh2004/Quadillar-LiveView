"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
    Beaker,
    AlertTriangle,
    CheckCircle2,
    X,
    Loader2,
    Scale,
    ShieldAlert,
    Calendar,
} from "lucide-react";
import { logCubeCrushTest, LogCubeCrushPayload } from "@/app/actions/cube-actions";

export interface LogCubeTestModalProps {
    projectId?: string;
    onSuccess?: () => void;
}

const CONCRETE_GRADES = [20, 25, 30, 35, 40, 45, 50] as const;

export function LogCubeTestModal({
    projectId = "GOMTI-NAGAR-PH1-FITOUT",
    onSuccess,
}: LogCubeTestModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Form State
    const [sampleRefId, setSampleRefId] = useState("");
    const [pourCardId, setPourCardId] = useState("");
    const [structuralElement, setStructuralElement] = useState("");
    const [specifiedGradeFck, setSpecifiedGradeFck] = useState<number>(30);
    const [testAgeDays, setTestAgeDays] = useState<7 | 28>(28);
    const [labTechnicianName, setLabTechnicianName] = useState("NABL Field Technician");
    const [curingTempC, setCuringTempC] = useState("27.0");

    // Crushing Loads for 3 specimens (kN) on 150mm x 150mm face
    const [load1, setLoad1] = useState("");
    const [load2, setLoad2] = useState("");
    const [load3, setLoad3] = useState("");

    const [feedback, setFeedback] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    // Live Compressive Strength Math (1 MPa = Load_kN / 22.5)
    const stats = useMemo(() => {
        const p1 = parseFloat(load1) || 0;
        const p2 = parseFloat(load2) || 0;
        const p3 = parseFloat(load3) || 0;

        if (p1 === 0 && p2 === 0 && p3 === 0) {
            return { s1: 0, s2: 0, s3: 0, avg: 0, spreadValid: true, meetsTarget: false };
        }

        const s1 = parseFloat((p1 / 22.5).toFixed(2));
        const s2 = parseFloat((p2 / 22.5).toFixed(2));
        const s3 = parseFloat((p3 / 22.5).toFixed(2));
        const avg = parseFloat(((s1 + s2 + s3) / 3).toFixed(2));

        // IS 456 Cl 15.4: individual specimen variation must be within ±15% of average
        const delta = avg * 0.15;
        const spreadValid =
            avg > 0 &&
            Math.abs(s1 - avg) <= delta &&
            Math.abs(s2 - avg) <= delta &&
            Math.abs(s3 - avg) <= delta;

        const meetsTarget = testAgeDays === 28 ? avg >= specifiedGradeFck : avg >= 0.67 * specifiedGradeFck;

        return { s1, s2, s3, avg, spreadValid, meetsTarget };
    }, [load1, load2, load3, specifiedGradeFck, testAgeDays]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFeedback(null);

        const p1 = parseFloat(load1);
        const p2 = parseFloat(load2);
        const p3 = parseFloat(load3);

        if (!sampleRefId.trim() || !structuralElement.trim()) {
            setFeedback({ type: "error", message: "Sample ID and Structural Element are mandatory." });
            return;
        }

        if (!p1 || !p2 || !p3) {
            setFeedback({ type: "error", message: "All three specimen crushing loads (kN) are required." });
            return;
        }

        startTransition(async () => {
            const payload: LogCubeCrushPayload = {
                projectId,
                sampleRefId: sampleRefId.trim(),
                pourCardId: pourCardId.trim() || undefined,
                structuralElement: structuralElement.trim(),
                specifiedGradeFck,
                testAgeDays,
                loadKnSpecimen1: p1,
                loadKnSpecimen2: p2,
                loadKnSpecimen3: p3,
                labTechnicianName: labTechnicianName.trim(),
                curingTankTempC: parseFloat(curingTempC) || 27.0,
            };

            const res = await logCubeCrushTest(payload);

            if (res.success) {
                if (res.isCompliant) {
                    setFeedback({
                        type: "success",
                        message: `Crush test passed (${res.averageStrengthMpa} MPa). IS 456 Table 11 compliance confirmed.`,
                    });
                } else {
                    setFeedback({
                        type: "error",
                        message: `Strength deficit logged (${res.averageStrengthMpa} MPa vs M${specifiedGradeFck}). ${res.ncrIssued ? `Aegis issued ${res.ncrNumber} & locked billing.` : ""}`,
                    });
                }

                setTimeout(() => {
                    setIsOpen(false);
                    setLoad1("");
                    setLoad2("");
                    setLoad3("");
                    setSampleRefId("");
                    setStructuralElement("");
                    if (onSuccess) onSuccess();
                }, 2200);
            } else {
                setFeedback({ type: "error", message: res.error || "Failed to record test." });
            }
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
                <Beaker className="h-3.5 w-3.5" />
                <span>+ Log IS 516 Cube Break</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs select-none">
                    <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-4">
                        {/* MODAL HEADER */}
                        <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">
                                        NABL CTM-2000kN INGESTION
                                    </span>
                                </div>
                                <h3 className="text-sm font-bold text-zinc-100 uppercase mt-0.5">
                                    Record Concrete Cube Crushing Test (IS 516)
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* FEEDBACK NOTIFICATION */}
                        {feedback && (
                            <div
                                className={`p-3 border text-xs flex items-start gap-2 ${feedback.type === "success"
                                        ? "bg-emerald-950/70 border-emerald-800 text-emerald-300"
                                        : "bg-rose-950/70 border-rose-800 text-rose-300"
                                    }`}
                            >
                                {feedback.type === "success" ? (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                                ) : (
                                    <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                                )}
                                <span>{feedback.message}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* METADATA IDENTIFIERS */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] uppercase text-zinc-400 mb-1">
                                        Sample Set Ref ID *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. CS-2026-L4-012"
                                        value={sampleRefId}
                                        onChange={(e) => setSampleRefId(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 uppercase outline-none focus:border-zinc-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-zinc-400 mb-1">
                                        Linked Pour Card
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. PC-IS456-042"
                                        value={pourCardId}
                                        onChange={(e) => setPourCardId(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 uppercase outline-none focus:border-zinc-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase text-zinc-400 mb-1">
                                    Structural Member / Location Grid *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Tower A / Level 04 / Columns Grid C3-D5"
                                    value={structuralElement}
                                    onChange={(e) => setStructuralElement(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 outline-none focus:border-zinc-600"
                                />
                            </div>

                            {/* SPECIFICATION PARAMETERS */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] uppercase text-zinc-400 mb-1">
                                        Design Grade (f_ck)
                                    </label>
                                    <select
                                        value={specifiedGradeFck}
                                        onChange={(e) => setSpecifiedGradeFck(Number(e.target.value))}
                                        className="w-full bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 outline-none"
                                    >
                                        {CONCRETE_GRADES.map((g) => (
                                            <option key={g} value={g}>
                                                M{g} ({g} N/mm²)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-zinc-400 mb-1">
                                        Test Age Maturity
                                    </label>
                                    <select
                                        value={testAgeDays}
                                        onChange={(e) => setTestAgeDays(Number(e.target.value) as 7 | 28)}
                                        className="w-full bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 outline-none"
                                    >
                                        <option value={7}>7-Day (Target ≥ 67%)</option>
                                        <option value={28}>28-Day (Statutory f_ck)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-zinc-400 mb-1">
                                        Tank Temp (°C)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={curingTempC}
                                        onChange={(e) => setCuringTempC(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 outline-none text-right tabular-nums"
                                    />
                                </div>
                            </div>

                            {/* MACHINE CRUSHING LOADS (kN) */}
                            <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase text-zinc-400 font-bold flex items-center gap-1.5">
                                        <Scale className="h-3.5 w-3.5 text-emerald-400" />
                                        <span>CTM Load Readings (3 Standard 150mm Specimens)</span>
                                    </span>
                                    <span className="text-[9px] text-zinc-500">1 MPa = Load (kN) ÷ 22.5</span>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[9px] uppercase text-zinc-500 mb-1">
                                            Specimen 1 (kN)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            required
                                            placeholder="e.g. 720"
                                            value={load1}
                                            onChange={(e) => setLoad1(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-zinc-100 outline-none text-right tabular-nums font-bold"
                                        />
                                        <span className="block text-[9px] text-zinc-500 text-right mt-0.5">
                                            {stats.s1} MPa
                                        </span>
                                    </div>

                                    <div>
                                        <label className="block text-[9px] uppercase text-zinc-500 mb-1">
                                            Specimen 2 (kN)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            required
                                            placeholder="e.g. 740"
                                            value={load2}
                                            onChange={(e) => setLoad2(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-zinc-100 outline-none text-right tabular-nums font-bold"
                                        />
                                        <span className="block text-[9px] text-zinc-500 text-right mt-0.5">
                                            {stats.s2} MPa
                                        </span>
                                    </div>

                                    <div>
                                        <label className="block text-[9px] uppercase text-zinc-500 mb-1">
                                            Specimen 3 (kN)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            required
                                            placeholder="e.g. 715"
                                            value={load3}
                                            onChange={(e) => setLoad3(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-zinc-100 outline-none text-right tabular-nums font-bold"
                                        />
                                        <span className="block text-[9px] text-zinc-500 text-right mt-0.5">
                                            {stats.s3} MPa
                                        </span>
                                    </div>
                                </div>

                                {/* COMPUTED IS 456 VALIDATION STRIP */}
                                {stats.avg > 0 && (
                                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
                                        <span className="text-zinc-400">
                                            Mean Compressive Strength:{" "}
                                            <strong className="text-zinc-100 tabular-nums text-sm">{stats.avg} MPa</strong>
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`px-1.5 py-0.5 border text-[9px] font-bold ${stats.spreadValid
                                                        ? "bg-emerald-950 border-emerald-800 text-emerald-400"
                                                        : "bg-rose-950 border-rose-800 text-rose-400"
                                                    }`}
                                            >
                                                {stats.spreadValid ? "Spread ≤ ±15% ✓" : "Spread Invalid (>15%)"}
                                            </span>

                                            <span
                                                className={`px-1.5 py-0.5 border text-[9px] font-bold ${stats.meetsTarget
                                                        ? "bg-emerald-950 border-emerald-800 text-emerald-400"
                                                        : "bg-rose-950 border-rose-800 text-rose-400"
                                                    }`}
                                            >
                                                {stats.meetsTarget ? "Meets Target ✓" : "DEFICIT (< Target)"}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ACTIONS */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    disabled={isPending}
                                    className="px-3.5 py-1.5 border border-zinc-700 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    <span>Commit Test &amp; Seal Ledger</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

export default LogCubeTestModal;