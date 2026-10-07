"use client";

import React, { useState, useRef, useEffect } from "react";
import { Info, X, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";

export interface TechnicalThreshold {
    label: string;
    range: string;
    status: "OPTIMAL" | "ACCEPTABLE" | "CRITICAL";
}

interface TechnicalTooltipProps {
    title: string;
    standardCode?: string; // e.g., "IS 456:2000 Cl. 10.3" or "FIDIC Cl. 14.6"
    generalTerm: string;
    technicality: string;
    thresholds?: TechnicalThreshold[];
}

export function TechnicalTooltip({
    title,
    standardCode,
    generalTerm,
    technicality,
    thresholds,
}: TechnicalTooltipProps) {
    const [open, setOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Close on outside click
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

    return (
        <div className="relative inline-flex items-center ml-1" ref={popoverRef}>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((prev) => !prev);
                }}
                className={`p-0.5 rounded-full transition ${open
                        ? "bg-cyan-500 text-zinc-950"
                        : "text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800"
                    }`}
                title={`View statutory engineering spec for ${title}`}
            >
                <Info className="w-3.5 h-3.5" />
            </button>

            {open && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-80 sm:w-96 bg-zinc-900 border border-zinc-700/80 shadow-2xl rounded-lg p-4 z-50 font-sans text-xs text-zinc-200 animate-in fade-in zoom-in-95 duration-150">

                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-zinc-850 pb-2 mb-2">
                        <div>
                            <span className="font-mono font-bold text-white text-xs block">{title}</span>
                            {standardCode && (
                                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                                    {standardCode}
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="text-zinc-500 hover:text-zinc-200 p-0.5"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* General Plain-English Definition */}
                    <div className="space-y-1 mb-2.5">
                        <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                            In Plain English
                        </span>
                        <p className="text-zinc-300 text-[11px] leading-relaxed">
                            {generalTerm}
                        </p>
                    </div>

                    {/* Technical Engineering Context */}
                    <div className="space-y-1 mb-3">
                        <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                            Technical Specification
                        </span>
                        <p className="text-zinc-400 text-[11px] leading-relaxed">
                            {technicality}
                        </p>
                    </div>

                    {/* Thresholds / Status Ranges */}
                    {thresholds && thresholds.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-zinc-850">
                            <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                                Compliance Ranges
                            </span>
                            <div className="grid grid-cols-1 gap-1 font-mono text-[10px]">
                                {thresholds.map((t, idx) => {
                                    const isCrit = t.status === "CRITICAL";
                                    const isOpt = t.status === "OPTIMAL";
                                    return (
                                        <div
                                            key={idx}
                                            className={`p-1.5 rounded flex items-center justify-between border ${isCrit
                                                    ? "bg-rose-950/40 border-rose-800 text-rose-300"
                                                    : isOpt
                                                        ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                                                        : "bg-amber-950/40 border-amber-800 text-amber-300"
                                                }`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                {isCrit ? (
                                                    <ShieldAlert className="w-3 h-3 text-rose-400" />
                                                ) : isOpt ? (
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                ) : (
                                                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                                                )}
                                                <span>{t.label}</span>
                                            </div>
                                            <span className="font-bold">{t.range}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Pointer tail */}
                    <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-zinc-900 border-r border-b border-zinc-700/80 rotate-45 pointer-events-none" />
                </div>
            )}
        </div>
    );
}