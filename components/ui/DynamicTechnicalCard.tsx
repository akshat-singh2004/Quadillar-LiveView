"use client";

import React, { useState, useRef, useEffect } from "react";
import { Info, X, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";
import { DynamicSpecCard } from "@/lib/dynamicThresholdEngine";

interface DynamicTechnicalCardProps {
    spec: DynamicSpecCard;
}

export function DynamicTechnicalCard({ spec }: DynamicTechnicalCardProps) {
    const [open, setOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    const isCrit = spec.currentStatus === "CRITICAL";
    const isOpt = spec.currentStatus === "OPTIMAL";

    return (
        <div className="relative inline-flex items-center ml-1.5 align-middle select-none" ref={popoverRef}>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((prev) => !prev);
                }}
                className={`p-1 rounded-full transition flex items-center justify-center ${open
                        ? "bg-cyan-500 text-zinc-950 shadow-md"
                        : isCrit
                            ? "text-rose-400 bg-rose-950/60 border border-rose-800 animate-pulse hover:bg-rose-900"
                            : isOpt
                                ? "text-emerald-400 hover:bg-zinc-800"
                                : "text-amber-400 hover:bg-zinc-800"
                    }`}
                title={`Inspect statutory limits for ${spec.title}`}
            >
                <Info className="w-3.5 h-3.5" />
            </button>

            {open && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-80 sm:w-96 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-lg p-4 z-50 font-sans text-xs text-zinc-200">
                    <div className="flex items-start justify-between border-b border-zinc-800 pb-2 mb-2.5">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-white text-xs block">{spec.title}</span>
                                <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${isCrit
                                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                                            : isOpt
                                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                                : "bg-amber-950 text-amber-300 border border-amber-800"
                                        }`}
                                >
                                    {spec.currentStatus}
                                </span>
                            </div>
                            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block mt-0.5">
                                {spec.standardCode}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="text-zinc-500 hover:text-white p-0.5"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded mb-2.5 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                            <span>Current Recorded Value:</span>
                            <strong className="text-white text-xs">{spec.currentValueDisplay}</strong>
                        </div>
                        <p className={`text-[11px] leading-tight ${isCrit ? "text-rose-300 font-bold" : isOpt ? "text-emerald-300" : "text-amber-300"}`}>
                            {spec.statusRemark}
                        </p>
                    </div>

                    <div className="space-y-0.5 mb-2.5">
                        <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                            In Plain English
                        </span>
                        <p className="text-zinc-300 text-[11px] leading-relaxed font-sans">
                            {spec.generalTerm}
                        </p>
                    </div>

                    <div className="space-y-0.5 mb-3">
                        <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                            Dynamic Statutory Basis
                        </span>
                        <p className="text-zinc-400 text-[11px] leading-relaxed font-sans">
                            {spec.technicality}
                        </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-zinc-800 font-mono text-[10px]">
                        <span className="text-[10px] uppercase text-zinc-400 font-bold block">
                            Calculated Project Bands
                        </span>
                        <div className="grid grid-cols-1 gap-1">
                            {spec.thresholds.map((t, idx) => {
                                const rowCrit = t.status === "CRITICAL";
                                const rowOpt = t.status === "OPTIMAL";
                                return (
                                    <div
                                        key={idx}
                                        className={`p-1.5 rounded flex items-center justify-between border ${rowCrit
                                                ? "bg-rose-950/40 border-rose-800 text-rose-300"
                                                : rowOpt
                                                    ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                                                    : "bg-amber-950/40 border-amber-800 text-amber-300"
                                            }`}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {rowCrit ? (
                                                <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
                                            ) : rowOpt ? (
                                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                            ) : (
                                                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                                            )}
                                            <span>{t.label}</span>
                                        </div>
                                        <span className="font-bold">{t.rangeText}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-zinc-900 border-r border-b border-zinc-700 rotate-45 pointer-events-none" />
                </div>
            )}
        </div>
    );
}