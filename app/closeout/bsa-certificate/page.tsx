"use client";

import React from "react";
import Link from "next/link";
import { useGovernor } from "@/context/GovernorContext";

const formatInr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function BsaSection63CertificatePage() {
  const { input, snapshot } = useGovernor();

  return (
    <div className="min-h-screen bg-zinc-950 print:bg-white text-zinc-100 print:text-black p-3 sm:p-6">
      {/* Screen-only toolbar */}
      <div className="print:hidden mx-auto max-w-4xl mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3.5">
        <div className="text-xs font-mono">
          <div className="font-bold text-emerald-400">COURTROOM-READY ELECTRONIC EVIDENCE CERTIFICATE</div>
          <div className="text-zinc-400">Zero-bloat @media print A4 schedule — prints black-on-white</div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/closeout/audit-vault"
            className="min-h-[42px] inline-flex items-center rounded-lg border border-zinc-700 px-3.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
          >
            ← Audit Vault
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[42px] rounded-lg bg-zinc-100 hover:bg-white px-5 text-xs font-bold text-zinc-950"
          >
            Print / Save A4 PDF
          </button>
        </div>
      </div>

      {/* Printable Legal Certificate Document */}
      <article className="mx-auto max-w-4xl rounded-xl border border-zinc-300 bg-white text-zinc-950 p-6 sm:p-10 shadow-xl print:shadow-none print:border-none print:p-0 space-y-6">
        <header className="border-b-2 border-zinc-900 pb-4 text-center space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-600">
            THE SCHEDULE [SEE SECTION 63(4)(c)] — BHARATIYA SAKSHYA ADHINIYAM, 2023
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            CERTIFICATE FOR ADMISSIBILITY OF ELECTRONIC CONSTRUCTION RECORD
          </h1>
          <div className="text-xs font-mono text-zinc-700">
            Issued by Quadillar LiveView Deterministic Molecular Governor • Project {input.projectId}
          </div>
        </header>

        {/* Part A: System & Cryptographic Identification */}
        <section className="space-y-2">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider border-b border-zinc-300 pb-1">
            PART A — ELECTRONIC RECORD & CRYPTOGRAPHIC HASH IDENTIFICATION
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg p-3.5">
            <div><span className="text-zinc-500">Project ID:</span> <strong>{input.projectId}</strong></div>
            <div><span className="text-zinc-500">RA Bill Reference:</span> <strong>{input.raBillNo}</strong></div>
            <div><span className="text-zinc-500">Zone / BIM Element:</span> <strong>{input.zoneId} / {input.bimGlobalId}</strong></div>
            <div><span className="text-zinc-500">Recorded UTC:</span> <strong>{snapshot.bsaSec63Ledger.recordedAtUtc}</strong></div>
            <div><span className="text-zinc-500">Gate Verdict:</span> <strong>{snapshot.escrow.decision} (HTTP {snapshot.escrow.httpStatus})</strong></div>
            <div><span className="text-zinc-500">Hash Algorithm:</span> <strong>FIPS 180-4 SHA-256 (Hex)</strong></div>
            <div className="sm:col-span-2 break-all pt-1 border-t border-zinc-200">
              <span className="text-zinc-500">Record SHA-256 Digest:</span>{" "}
              <strong className="text-zinc-950">{snapshot.bsaSec63Ledger.rowHash}</strong>
            </div>
            <div className="sm:col-span-2 break-all">
              <span className="text-zinc-500">Previous Chain Hash:</span>{" "}
              <span className="text-zinc-700">{snapshot.bsaSec63Ledger.prevHash}</span>
            </div>
          </div>
        </section>

        {/* Engineering & Commercial Determination */}
        <section className="space-y-2">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider border-b border-zinc-300 pb-1">
            DETERMINISTIC ENGINEERING & COMMERCIAL LEDGER VERDICT
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="rounded border border-zinc-300 p-2.5">
              <div className="text-[10px] text-zinc-500">GROSS CLAIM</div>
              <div className="font-bold text-sm">{formatInr(snapshot.escrow.grossClaimInr)}</div>
            </div>
            <div className="rounded border border-zinc-300 p-2.5">
              <div className="text-[10px] text-zinc-500">FROZEN (HTTP 422)</div>
              <div className="font-bold text-sm">{formatInr(snapshot.escrow.frozenInr)}</div>
            </div>
            <div className="rounded border border-zinc-300 p-2.5">
              <div className="text-[10px] text-zinc-500">CPWD CL. 42 PENALTY</div>
              <div className="font-bold text-sm">-{formatInr(snapshot.escrow.clause42PenaltyInr)}</div>
            </div>
            <div className="rounded border border-zinc-900 bg-zinc-100 p-2.5">
              <div className="text-[10px] text-zinc-600">NET CERTIFIED RTGS</div>
              <div className="font-bold text-sm">{formatInr(snapshot.escrow.netCertifiedReleaseInr)}</div>
            </div>
          </div>

          <div className="overflow-x-auto pt-2">
            <table className="w-full border-collapse border border-zinc-300 text-xs font-mono">
              <thead className="bg-zinc-100 text-left">
                <tr>
                  <th className="border border-zinc-300 px-2.5 py-1.5">Code</th>
                  <th className="border border-zinc-300 px-2.5 py-1.5">Standard / Clause</th>
                  <th className="border border-zinc-300 px-2.5 py-1.5">Deterministic Finding</th>
                  <th className="border border-zinc-300 px-2.5 py-1.5">Interlock</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.violations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="border border-zinc-300 px-3 py-3 text-center font-bold">
                      ZERO VIOLATIONS — ALL IS 456, IS 875 & CPWD CLAUSE 42 GATES CLEARED
                    </td>
                  </tr>
                ) : (
                  snapshot.violations.map((v) => (
                    <tr key={v.code}>
                      <td className="border border-zinc-300 px-2.5 py-1.5 font-bold">{v.code}</td>
                      <td className="border border-zinc-300 px-2.5 py-1.5">{v.standardRef}</td>
                      <td className="border border-zinc-300 px-2.5 py-1.5">{v.message}</td>
                      <td className="border border-zinc-300 px-2.5 py-1.5">
                        {[
                          v.blocksPayout ? "PAYOUT_422" : "",
                          v.blocksStrippingPtw ? "STRIP_PTW" : "",
                          v.blocksCranePtw ? "CRANE_PTW" : "",
                        ]
                          .filter(Boolean)
                          .join(", ") || "PENALTY_LOG"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Part B: Statutory Declaration & Signatures */}
        <section className="space-y-3 text-xs leading-relaxed">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider border-b border-zinc-300 pb-1">
            PART B — STATUTORY DECLARATION & SIGNATORIES
          </h2>
          <p className="text-zinc-800">
            I hereby certify that the computer output and cryptographic digest identified in Part A were produced
            deterministically by the Quadillar LiveView Molecular Governor operating regularly during the relevant
            construction period, that the SHA-256 hash matches the unaltered electronic payload captured in the
            ordinary course of site governance, and that no improper modification has occurred affecting accuracy.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 font-mono text-[11px]">
            <div className="border-t border-zinc-900 pt-2">
              <div className="font-bold">PART A — AUTHORIZED PERSON IN CHARGE</div>
              <div className="text-zinc-600">Name / Designation: __________________________</div>
              <div className="text-zinc-600">Date & Place: _______________________________</div>
            </div>
            <div className="border-t border-zinc-900 pt-2">
              <div className="font-bold">PART B — TECHNICAL / SYSTEM EXPERT</div>
              <div className="text-zinc-600">Quadillar ConTech Pvt. Ltd. (System Custodian)</div>
              <div className="text-zinc-600">Hash Seal: {snapshot.bsaSec63Ledger.rowHash.slice(0, 22)}…</div>
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
