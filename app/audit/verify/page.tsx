"use client";

import React, { useState } from "react";
import { supabase } from "@/app/lib/supabase";
import {
    ShieldCheck,
    Search,
    CheckCircle2,
    AlertTriangle,
    FileText,
    Lock,
    ExternalLink,
    QrCode,
    Scale,
} from "lucide-react";

interface AuditResult {
    entity_type: string;
    entity_id: string;
    project_id: string;
    identifier_code: string;
    status: string;
    created_at: string;
    is_valid: boolean;
}

export default function StatutoryHashVerifierPage() {
    const [hashInput, setHashInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [result, setResult] = useState<AuditResult | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hashInput.trim()) return;

        setLoading(true);
        setErrorMsg(null);
        setResult(null);
        setSearched(true);

        try {
            const { data, error } = await (supabase as any).rpc("verify_statutory_hash", {
                query_hash: hashInput.trim(),
            });

            if (error) throw error;

            if (data && data.length > 0) {
                setResult(data[0]);
            } else {
                setResult(null);
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Cryptographic verification service error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-12 font-sans flex items-center justify-center">
            <div className="max-w-3xl w-full bg-zinc-900/40 border border-zinc-800 p-8 space-y-6">

                {/* HEADER */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono text-[10px] font-bold uppercase tracking-wider">
                        <Scale className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Section 65B Indian Evidence Act • Cryptographic Audit Verification</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                        Statutory Document Verifier
                    </h1>
                    <p className="text-xs text-zinc-400 font-mono max-w-lg mx-auto">
                        Paste any SHA-256 integrity hash from a GFC drawing, IPC certificate, or legal contract deed to verify its immutable audit trail.
                    </p>
                </div>

                {/* HASH LOOKUP INPUT */}
                <form onSubmit={handleVerify} className="space-y-3">
                    <div className="relative">
                        <input
                            type="text"
                            required
                            placeholder="e.g. 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
                            value={hashInput}
                            onChange={(e) => setHashInput(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 pl-4 pr-12 py-3 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 placeholder:text-zinc-600"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="absolute right-2 top-2 p-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded transition disabled:opacity-50"
                            title="Verify Checksum"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                    </div>
                </form>

                {errorMsg && (
                    <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* VERIFICATION RESULT */}
                {searched && (
                    <div>
                        {result ? (
                            <div className="p-6 bg-emerald-950/20 border border-emerald-800 space-y-4 font-mono">
                                <div className="flex items-center justify-between border-b border-emerald-900/60 pb-3">
                                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                        <span className="text-sm uppercase tracking-wider">Authentic Statutory Record Verified</span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700 text-[10px] font-bold uppercase">
                                        TAMPER-FREE
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-300">
                                    <div>
                                        <span className="text-[10px] text-zinc-500 uppercase block">Statutory Entity</span>
                                        <strong className="text-white">{result.entity_type.replace(/_/g, " ")}</strong>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-zinc-500 uppercase block">Registered Document Code</span>
                                        <strong className="text-cyan-400">{result.identifier_code}</strong>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-zinc-500 uppercase block">Project Anchor</span>
                                        <strong className="text-white">{result.project_id}</strong>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-zinc-500 uppercase block">Certification Date</span>
                                        <strong className="text-zinc-200">{new Date(result.created_at).toLocaleDateString()}</strong>
                                    </div>
                                </div>

                                <div className="p-3 bg-zinc-950 border border-zinc-850 text-[11px] text-zinc-400 font-sans">
                                    The cryptographically hashed bytecode matches the genesis record in the project ledger. This file holds legal evidentiary standing under Section 65B.
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 bg-rose-950/20 border border-rose-800 text-center space-y-2 font-mono">
                                <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                                <h3 className="text-sm font-bold text-white uppercase">Unrecognized / Altered Checksum</h3>
                                <p className="text-xs text-zinc-400 font-sans max-w-md mx-auto">
                                    No statutory instrument registered in Quadillar LiveView corresponds to this hash. If this document was modified by even 1 byte, its validation fails.
                                </p>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </main>
    );
}