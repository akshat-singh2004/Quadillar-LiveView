"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useGovernor } from "@/context/GovernorContext";
import type { SealedForensicDossier } from "@/lib/domain/forensicDossier";

interface PortfolioOption {
  projectId: string;
  code: string;
  name: string;
}

const formatInr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

export default function BsaSection63CertificatePage() {
  const { input: fallbackInput, snapshot: fallbackSnapshot } = useGovernor();

  const [projects, setProjects] = useState<PortfolioOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(fallbackInput.projectId || "VANGUARD-LKO-01");
  const [dossier, setDossier] = useState<SealedForensicDossier | null>(null);
  const [simulateTamper, setSimulateTamper] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadDossier = useCallback(async (projectId: string, tamper: boolean) => {
    setLoading(true);
    setFetchError(null);
    try {
      const q = encodeURIComponent(projectId);
      const [projRes, dosRes] = await Promise.all([
        fetch("/api/portfolio/projects", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch(`/api/audit/dossier?projectId=${q}${tamper ? "&simulateTamper=1" : ""}`, {
          cache: "no-store",
        }),
      ]);

      if (Array.isArray(projRes?.projects)) {
        setProjects(projRes.projects);
      }
      if (!dosRes.ok) {
        throw new Error(`Dossier API returned HTTP ${dosRes.status}`);
      }
      const data = await dosRes.json();
      if (data?.dossier) {
        setDossier(data.dossier as SealedForensicDossier);
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load live forensic dossier.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let initialId = fallbackInput.projectId || "VANGUARD-LKO-01";
    if (typeof window !== "undefined") {
      const qp = new URLSearchParams(window.location.search).get("projectId");
      if (qp && qp.trim()) initialId = qp.trim();
    }
    setSelectedProjectId(initialId);
    loadDossier(initialId, false);
  }, [fallbackInput.projectId, loadDossier]);

  const handleProjectChange = (nextId: string) => {
    setSelectedProjectId(nextId);
    setSimulateTamper(false);
    loadDossier(nextId, false);
  };

  const handleToggleTamper = () => {
    const next = !simulateTamper;
    setSimulateTamper(next);
    loadDossier(selectedProjectId, next);
  };

  // Use live server dossier when loaded; gracefully fall back to client context before hydration
  const projectId = dossier?.project.projectId ?? fallbackInput.projectId;
  const projectName = dossier?.project.name ?? "Project Vanguard Commercial Hub";
  const projectLocation = dossier?.project.location ?? "Lucknow, Uttar Pradesh";
  const raBillNo = dossier?.project.raBillNo ?? fallbackInput.raBillNo;
  const zoneId = dossier?.project.zoneId ?? fallbackInput.zoneId;
  const bimGlobalId = dossier?.project.bimGlobalId ?? fallbackInput.bimGlobalId;

  const recordedAtUtc =
    dossier?.governorState.bsaSec63Ledger.recordedAtUtc ?? fallbackSnapshot.bsaSec63Ledger.recordedAtUtc;
  const decision = dossier?.governorState.decision ?? fallbackSnapshot.escrow.decision;
  const httpStatus = dossier?.governorState.httpStatus ?? fallbackSnapshot.escrow.httpStatus;
  const rowHash =
    dossier?.governorState.bsaSec63Ledger.rowHash ?? fallbackSnapshot.bsaSec63Ledger.rowHash;
  const prevHash =
    dossier?.governorState.bsaSec63Ledger.prevHash ?? fallbackSnapshot.bsaSec63Ledger.prevHash;
  const grossClaimInr = dossier?.governorState.grossClaimInr ?? fallbackSnapshot.escrow.grossClaimInr;
  const frozenInr = dossier?.governorState.frozenInr ?? fallbackSnapshot.escrow.frozenInr;
  const clause42PenaltyInr =
    dossier?.governorState.clause42PenaltyInr ?? fallbackSnapshot.escrow.clause42PenaltyInr;
  const netCertifiedReleaseInr =
    dossier?.governorState.netCertifiedReleaseInr ?? fallbackSnapshot.escrow.netCertifiedReleaseInr;
  const violations = dossier?.governorState.violations ?? fallbackSnapshot.violations;

  const chainIntact = dossier ? dossier.manifest.integrityStatus === "INTACT" : true;
  const downloadUrl = `/api/audit/dossier?projectId=${encodeURIComponent(projectId)}&download=1`;

  return (
    <div className="min-h-screen bg-zinc-950 print:bg-white text-zinc-100 print:text-black p-3 sm:p-6">
      {/* Screen-only toolbar */}
      <div className="print:hidden mx-auto max-w-4xl mb-4 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono">
            <div className="font-bold text-emerald-400">
              COURTROOM-READY ELECTRONIC EVIDENCE DOSSIER (BSA SEC 63(4))
            </div>
            <div className="text-zinc-400">
              Live Postgres hash-chain + Storage Vault proofs • Prints clean black-on-white A4
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/executive/war-room"
              className="min-h-[38px] inline-flex items-center rounded-lg border border-zinc-700 px-3 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              ← War Room
            </Link>
            <Link
              href="/closeout/audit-vault"
              className="min-h-[38px] inline-flex items-center rounded-lg border border-zinc-700 px-3 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              Audit Vault
            </Link>
            <a
              href={downloadUrl}
              className="min-h-[38px] inline-flex items-center rounded-lg border border-cyan-500/50 bg-cyan-950/60 hover:bg-cyan-900/70 px-3.5 text-xs font-mono font-bold text-cyan-200"
            >
              Download Sealed JSON
            </a>
            <Link
              href="/closeout/verify-dossier"
              className="min-h-[38px] inline-flex items-center rounded-lg border border-emerald-500/50 bg-emerald-950/60 hover:bg-emerald-900/70 px-3.5 text-xs font-mono font-bold text-emerald-200"
            >
              Verify JSON Offline
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[38px] rounded-lg bg-zinc-100 hover:bg-white px-4 text-xs font-bold text-zinc-950 cursor-pointer"
            >
              Print / Save A4 PDF
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Site Scope:</span>
            <select
              aria-label="Select Portfolio Project for Dossier"
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 cursor-pointer"
            >
              {projects.length === 0 ? (
                <option value={selectedProjectId}>{selectedProjectId}</option>
              ) : (
                projects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.code} — {p.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleTamper}
              disabled={loading}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                simulateTamper
                  ? "border-emerald-500/50 bg-emerald-950/50 text-emerald-300"
                  : "border-rose-500/40 bg-rose-950/40 text-rose-200 hover:bg-rose-900/50"
              }`}
            >
              {simulateTamper ? "Restore Intact Chain" : "Simulate ₹1 Tamper Check"}
            </button>
            <span className="text-[11px] text-zinc-400">
              {loading ? "Syncing live ledger..." : dossier ? `Mode: ${dossier.storageMode}` : "Fallback"}
            </span>
          </div>
        </div>

        {fetchError && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs font-mono text-amber-200">
            Live dossier sync notice: {fetchError} (showing cached context snapshot).
          </div>
        )}
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
            Issued by Quadillar LiveView Deterministic Molecular Governor • {projectName} ({projectId})
          </div>
        </header>

        {/* Integrity Banner */}
        {dossier && (
          <div
            className={`rounded-lg border-2 p-3 text-xs font-mono flex flex-wrap items-center justify-between gap-2 ${
              chainIntact
                ? "border-zinc-900 bg-zinc-50 text-zinc-950"
                : "border-rose-700 bg-rose-50 text-rose-950"
            }`}
          >
            <div>
              <strong>CHAIN INTEGRITY STATUS: {dossier.manifest.integrityStatus}</strong> —{" "}
              {dossier.hashChain.verification.reason}
            </div>
            <div className="font-bold">
              {dossier.hashChain.totalEvents} SEALED BLOCKS • {dossier.evidenceVault.count} VAULT PROOFS
            </div>
          </div>
        )}

        {/* Part A: System & Cryptographic Identification */}
        <section className="space-y-2">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider border-b border-zinc-300 pb-1">
            PART A — ELECTRONIC RECORD & CRYPTOGRAPHIC HASH IDENTIFICATION
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg p-3.5">
            <div><span className="text-zinc-500">Project ID:</span> <strong>{projectId}</strong></div>
            <div><span className="text-zinc-500">Site Location:</span> <strong>{projectLocation}</strong></div>
            <div><span className="text-zinc-500">RA Bill Reference:</span> <strong>{raBillNo}</strong></div>
            <div><span className="text-zinc-500">Zone / BIM Element:</span> <strong>{zoneId} / {bimGlobalId}</strong></div>
            <div><span className="text-zinc-500">Recorded UTC:</span> <strong>{recordedAtUtc}</strong></div>
            <div><span className="text-zinc-500">Gate Verdict:</span> <strong>{decision} (HTTP {httpStatus})</strong></div>
            <div><span className="text-zinc-500">Hash Algorithm:</span> <strong>FIPS 180-4 SHA-256 (Hex)</strong></div>
            <div>
              <span className="text-zinc-500">Dossier Sealed UTC:</span>{" "}
              <strong>{dossier?.manifest.sealedAtUtc ?? recordedAtUtc}</strong>
            </div>
            <div className="sm:col-span-2 break-all pt-1 border-t border-zinc-200">
              <span className="text-zinc-500">Record SHA-256 Digest:</span>{" "}
              <strong className="text-zinc-950">{rowHash}</strong>
            </div>
            <div className="sm:col-span-2 break-all">
              <span className="text-zinc-500">Previous Chain Hash:</span>{" "}
              <span className="text-zinc-700">{prevHash}</span>
            </div>
            {dossier && (
              <div className="sm:col-span-2 break-all pt-1 border-t border-zinc-200">
                <span className="text-zinc-500">Dossier Manifest SHA-256 ({dossier.schemaVersion}):</span>{" "}
                <strong className="text-zinc-950">{dossier.manifest.dossierHash}</strong>
              </div>
            )}
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
              <div className="font-bold text-sm">{formatInr(grossClaimInr)}</div>
            </div>
            <div className="rounded border border-zinc-300 p-2.5">
              <div className="text-[10px] text-zinc-500">FROZEN (HTTP 422)</div>
              <div className="font-bold text-sm">{formatInr(frozenInr)}</div>
            </div>
            <div className="rounded border border-zinc-300 p-2.5">
              <div className="text-[10px] text-zinc-500">CPWD CL. 42 PENALTY</div>
              <div className="font-bold text-sm">-{formatInr(clause42PenaltyInr)}</div>
            </div>
            <div className="rounded border border-zinc-900 bg-zinc-100 p-2.5">
              <div className="text-[10px] text-zinc-600">NET CERTIFIED RTGS</div>
              <div className="font-bold text-sm">{formatInr(netCertifiedReleaseInr)}</div>
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
                {violations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="border border-zinc-300 px-3 py-3 text-center font-bold">
                      ZERO VIOLATIONS — ALL IS 456, IS 875 & CPWD CLAUSE 42 GATES CLEARED
                    </td>
                  </tr>
                ) : (
                  violations.map((v) => (
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

        {/* Part A2: Append-Only Hash-Chain Ledger Audit Trail */}
        {dossier && dossier.hashChain.events.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider border-b border-zinc-300 pb-1">
              PART A2 — APPEND-ONLY HASH-CHAIN AUDIT TRAIL ({dossier.hashChain.totalEvents} EVENTS)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-zinc-300 text-[11px] font-mono">
                <thead className="bg-zinc-100 text-left">
                  <tr>
                    <th className="border border-zinc-300 px-2 py-1">Seq</th>
                    <th className="border border-zinc-300 px-2 py-1">Event</th>
                    <th className="border border-zinc-300 px-2 py-1">Actor / Identity</th>
                    <th className="border border-zinc-300 px-2 py-1">HTTP</th>
                    <th className="border border-zinc-300 px-2 py-1">Frozen INR</th>
                    <th className="border border-zinc-300 px-2 py-1">Sealed Chain Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {dossier.hashChain.events.slice(-15).map((ev) => (
                    <tr key={`${ev.seq}-${ev.chainHash}`}>
                      <td className="border border-zinc-300 px-2 py-1 font-bold">#{ev.seq}</td>
                      <td className="border border-zinc-300 px-2 py-1">{ev.eventType}</td>
                      <td className="border border-zinc-300 px-2 py-1">{ev.actor}</td>
                      <td className="border border-zinc-300 px-2 py-1">{ev.httpStatus}</td>
                      <td className="border border-zinc-300 px-2 py-1">{formatInr(ev.frozenInr)}</td>
                      <td className="border border-zinc-300 px-2 py-1">
                        {ev.chainHash.slice(0, 18)}…
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Part A3: Linked Field Evidence & IFC4X3 Vernacular Grounding Proofs */}
        {dossier && (dossier.evidenceVault.count > 0 || dossier.ifcGrounding.count > 0) && (
          <section className="space-y-2">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider border-b border-zinc-300 pb-1">
              PART A3 — LINKED FIELD EVIDENCE VAULT & IFC4X3 GROUNDING PROOFS
            </h2>
            <div className="space-y-2 text-[11px] font-mono">
              {dossier.ifcGrounding.records.slice(-5).map((rec) => (
                <div
                  key={`ifc-${rec.seq}`}
                  className="rounded border border-zinc-300 bg-zinc-50 p-2.5 flex flex-wrap justify-between gap-2"
                >
                  <div>
                    <strong>
                      #{rec.seq} {rec.ifcClass} ({rec.zoneId})
                    </strong>{" "}
                    • Challan: {rec.challanNo} • Lang: {rec.detectedLanguage} • GlobalId:{" "}
                    {rec.bimGlobalId}
                  </div>
                  <div>
                    <strong>
                      HTTP {rec.httpStatus} (Trust {rec.trustScorePct}%)
                    </strong>
                  </div>
                </div>
              ))}

              {dossier.evidenceVault.packets.slice(-5).map((pkt) => (
                <div
                  key={pkt.sha256}
                  className="rounded border border-zinc-300 bg-zinc-50 p-2.5 space-y-0.5"
                >
                  <div>
                    <strong>{pkt.id}</strong> • Zone: {pkt.zoneId} • Mode: {pkt.mediaStorageMode}
                  </div>
                  <div className="break-all text-zinc-700">SHA-256: {pkt.sha256}</div>
                  {pkt.mediaUrl && (
                    <div className="break-all text-zinc-700">
                      Vault CDN:{" "}
                      <a href={pkt.mediaUrl} target="_blank" rel="noreferrer" className="underline">
                        {pkt.mediaUrl}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

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
              <div className="text-zinc-600">
                Manifest Seal: {(dossier?.manifest.dossierHash ?? rowHash).slice(0, 22)}…
              </div>
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
