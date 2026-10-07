"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import {
    FileText,
    Printer,
    ShieldCheck,
    CheckCircle2,
    Lock,
    Scale,
    Calendar,
    Layers,
    Award,
    Hash,
    Clock,
} from "lucide-react";

export default function MasterAuditDossierPage() {
    const { project } = useActiveRole();
    const activeProjectId = project?.project_id || project?.id || "";

    const [dossier, setDossier] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        async function loadDossier() {
            if (!activeProjectId) return;
            setLoading(true);
            try {
                const { data, error } = await (supabase as any).rpc("get_project_audit_dossier", {
                    target_project_id: activeProjectId,
                });

                if (error) throw error;
                setDossier(data);
            } catch (err: any) {
                setErrorMsg(err.message || "Failed to compile master audit dossier.");
            } finally {
                setLoading(false);
            }
        }

        void loadDossier();
    }, [activeProjectId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-mono text-xs">
                <Clock className="w-5 h-5 text-cyan-400 animate-spin mr-2" />
                <span>Compiling cryptographic chain-of-custody dossier...</span>
            </main>
        );
    }

    const p = dossier?.project;
    const drawings = dossier?.drawings || [];
    const bills = dossier?.bills || [];
    const quality = dossier?.quality || {};
    const toc = dossier?.toc;
    const finalBill = dossier?.final_bill;

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-12 font-sans print:bg-white print:text-black print:p-0">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* NON-PRINT ACTION BAR */}
                <div className="flex justify-between items-center border-b border-zinc-800 pb-4 print:hidden">
                    <div>
                        <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                            SECTION 65B EVIDENCE DOSSIER • STATUTORY EXPORT
                        </div>
                        <h1 className="text-xl font-bold text-white mt-0.5">
                            Executive Project Audit Certificate
                        </h1>
                    </div>
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold font-mono text-xs uppercase flex items-center gap-1.5 transition shadow-sm"
                    >
                        <Printer className="w-4 h-4" />
                        <span>Print Evidentiary Certificate</span>
                    </button>
                </div>

                {/* PRINTABLE DOSSIER SHEET (Styled for A4 / Clean Paper Output) */}
                <div className="bg-zinc-900/60 border border-zinc-800 p-8 sm:p-12 space-y-8 print:border-none print:bg-transparent print:p-6 print:space-y-6">

                    {/* DOSSIER HEADER */}
                    <div className="border-b-2 border-zinc-700 print:border-black pb-6 space-y-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 print:text-zinc-600 block font-bold">
                                    QUADILLAR LIVEVIEW • DETERMINISTIC STATUTORY AUDIT
                                </span>
                                <h2 className="text-2xl font-black tracking-tight text-white print:text-black">
                                    PROJECT STATUTORY AUDIT DOSSIER
                                </h2>
                                <div className="text-xs font-mono text-cyan-400 print:text-black font-bold mt-1">
                                    ID: {p?.project_id || activeProjectId} • CA: {p?.agreement_ref_no || "VERIFIED"}
                                </div>
                            </div>
                            <div className="text-right font-mono text-[10px] text-zinc-400 print:text-zinc-600">
                                <div>Date of Export: {new Date().toLocaleDateString("en-IN")}</div>
                                <div>Status: <strong className="text-emerald-400 print:text-black uppercase">{p?.status}</strong></div>
                            </div>
                        </div>
                    </div>

                    {/* 1. CONTRACTUAL CHARTER SUMMARY */}
                    <div className="space-y-3 font-mono text-xs">
                        <div className="font-bold uppercase tracking-wider text-zinc-400 print:text-black border-b border-zinc-800 print:border-zinc-300 pb-1 flex items-center gap-2">
                            <Scale className="w-3.5 h-3.5 text-cyan-400 print:text-black" />
                            <span>1. Statutory Contract Charter &amp; Municipal Baseline</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-zinc-300 print:text-zinc-800">
                            <div>Project Title: <strong className="text-white print:text-black block font-sans">{p?.project_name}</strong></div>
                            <div>Municipal Sanction Ref: <strong className="text-white print:text-black block">{p?.sanction_authority_ref || "LDA/BP/2026/0894"}</strong></div>
                            <div>Principal Employer: <strong className="text-white print:text-black block font-sans">{p?.client_entity_name || "Unassigned"}</strong></div>
                            <div>Lead Contractor: <strong className="text-white print:text-black block font-sans">{p?.contractor_entity_name || "Unassigned"}</strong></div>
                            <div>Sanctioned Baseline Value: <strong className="text-emerald-400 print:text-black block">₹{Number(p?.contract_value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></div>
                            <div>Stipulated Period: <strong className="text-white print:text-black block">{p?.stipulated_start_date || "Commencement"} to {p?.stipulated_completion_date || "Scheduled"}</strong></div>
                        </div>
                        {p?.legal_deed_sha256 && (
                            <div className="text-[10px] text-zinc-500 print:text-zinc-600 pt-1 break-all">
                                Contract Deed Checksum: {p.legal_deed_sha256}
                            </div>
                        )}
                    </div>

                    {/* 2. CDE GFC DRAWING REGISTER */}
                    <div className="space-y-3 font-mono text-xs">
                        <div className="font-bold uppercase tracking-wider text-zinc-400 print:text-black border-b border-zinc-800 print:border-zinc-300 pb-1 flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-cyan-400 print:text-black" />
                            <span>2. Verified CDE Drawing Revision Matrix</span>
                        </div>
                        {drawings.length === 0 ? (
                            <div className="text-zinc-500 print:text-zinc-600 text-[11px]">No formal GFC drawings uploaded.</div>
                        ) : (
                            <table className="w-full text-left text-[11px] border border-zinc-800 print:border-zinc-400">
                                <thead className="bg-zinc-950 print:bg-zinc-100 text-zinc-400 print:text-black text-[9px] uppercase border-b border-zinc-800 print:border-zinc-400">
                                    <tr>
                                        <th className="p-2">Sheet Code</th>
                                        <th className="p-2">Revision</th>
                                        <th className="p-2">Discipline</th>
                                        <th className="p-2">Sanction Ref</th>
                                        <th className="p-2">SHA-256 Digest</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800 print:divide-zinc-300">
                                    {drawings.map((d: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="p-2 font-bold text-cyan-400 print:text-black">{d.drawing_code}</td>
                                            <td className="p-2 text-zinc-300 print:text-black">{d.revision}</td>
                                            <td className="p-2 text-zinc-400 print:text-black">{d.discipline}</td>
                                            <td className="p-2 text-zinc-400 print:text-black">{d.sanction_ref_no}</td>
                                            <td className="p-2 text-zinc-500 print:text-zinc-600 text-[9px] truncate max-w-[120px]">{d.file_hash_sha256}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* 3. COMMERCIAL RA BILLING & RETENTION SUMMARY */}
                    <div className="space-y-3 font-mono text-xs">
                        <div className="font-bold uppercase tracking-wider text-zinc-400 print:text-black border-b border-zinc-800 print:border-zinc-300 pb-1 flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-cyan-400 print:text-black" />
                            <span>3. Statutory Interim Payment Certificates (IPC Ledger)</span>
                        </div>
                        {bills.length === 0 ? (
                            <div className="text-zinc-500 print:text-zinc-600 text-[11px]">Zero RA bills compiled.</div>
                        ) : (
                            <table className="w-full text-left text-[11px] border border-zinc-800 print:border-zinc-400">
                                <thead className="bg-zinc-950 print:bg-zinc-100 text-zinc-400 print:text-black text-[9px] uppercase border-b border-zinc-800 print:border-zinc-400">
                                    <tr>
                                        <th className="p-2">Bill #</th>
                                        <th className="p-2">Period</th>
                                        <th className="p-2 text-right">Gross Measured</th>
                                        <th className="p-2 text-right">Retention (5%)</th>
                                        <th className="p-2 text-right">Net Certified</th>
                                        <th className="p-2 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800 print:divide-zinc-300">
                                    {bills.map((b: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="p-2 font-bold text-cyan-400 print:text-black">{b.bill_number}</td>
                                            <td className="p-2 text-zinc-400 print:text-black">{b.period_start} – {b.period_end}</td>
                                            <td className="p-2 text-right text-zinc-200 print:text-black font-bold">₹{Number(b.gross_measured_value).toLocaleString("en-IN")}</td>
                                            <td className="p-2 text-right text-amber-400 print:text-black">₹{Number(b.retention_amount).toLocaleString("en-IN")}</td>
                                            <td className="p-2 text-right text-emerald-400 print:text-black font-bold">₹{Number(b.net_payable_certified).toLocaleString("en-IN")}</td>
                                            <td className="p-2 text-center text-zinc-400 print:text-black uppercase text-[10px]">{b.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* 4. QUALITY & CLOSEOUT METRICS */}
                    <div className="space-y-3 font-mono text-xs">
                        <div className="font-bold uppercase tracking-wider text-zinc-400 print:text-black border-b border-zinc-800 print:border-zinc-300 pb-1 flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 print:text-black" />
                            <span>4. Quality Hold-Gates &amp; Final Closeout Bond</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-zinc-950 print:bg-zinc-100 border border-zinc-800 print:border-zinc-400 text-zinc-300 print:text-black">
                            <div>
                                <span className="text-[9px] uppercase text-zinc-500 print:text-zinc-600 block">Pour Cards Cleared</span>
                                <strong className="text-white print:text-black text-sm">{quality.approved_pour_cards || 0} / {quality.total_pour_cards || 0}</strong>
                            </div>
                            <div>
                                <span className="text-[9px] uppercase text-zinc-500 print:text-zinc-600 block">NCRs Rectified</span>
                                <strong className="text-white print:text-black text-sm">{quality.closed_ncrs || 0} / {quality.total_ncrs || 0}</strong>
                            </div>
                            <div>
                                <span className="text-[9px] uppercase text-zinc-500 print:text-zinc-600 block">Taking-Over Ref</span>
                                <strong className="text-emerald-400 print:text-black text-sm">{toc?.toc_number || "PENDING"}</strong>
                            </div>
                            <div>
                                <span className="text-[9px] uppercase text-zinc-500 print:text-zinc-600 block">PBG Performance</span>
                                <strong className="text-white print:text-black text-sm">{finalBill?.is_pbg_discharged ? "DISCHARGED" : "HELD"}</strong>
                            </div>
                        </div>
                    </div>

                    {/* 5. LEGAL CERTIFICATE & SIGNATURE BOX */}
                    <div className="pt-6 border-t-2 border-zinc-700 print:border-black space-y-6">
                        <p className="text-[11px] text-zinc-400 print:text-zinc-700 font-sans leading-relaxed">
                            I hereby certify under Section 65B of the Indian Evidence Act that the above records represent an unaltered digital transcription of site measurements, engineering hold-gates, and interim payment certifications maintained contemporaneously within the Quadillar LiveView CDE platform.
                        </p>

                        <div className="grid grid-cols-2 gap-8 pt-8 font-mono text-xs">
                            <div className="border-t border-zinc-700 print:border-black pt-2">
                                <span className="text-[10px] uppercase text-zinc-500 print:text-zinc-600 block">Principal Architect / PMC Lead</span>
                                <strong className="text-white print:text-black block mt-1">Authorized Signatory</strong>
                                <span className="text-[10px] text-zinc-500 print:text-zinc-600">Council of Architecture Stamp</span>
                            </div>
                            <div className="border-t border-zinc-700 print:border-black pt-2 text-right">
                                <span className="text-[10px] uppercase text-zinc-500 print:text-zinc-600 block">Principal Employer / Client</span>
                                <strong className="text-white print:text-black block mt-1">Authorized Counter-Signature</strong>
                                <span className="text-[10px] text-zinc-500 print:text-zinc-600">Corporate Seal</span>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </main>
    );
}