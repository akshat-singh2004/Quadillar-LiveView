"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Upload,
  FileCheck2,
  Printer,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  verifyDossierJsonOffline,
  type OfflineVerificationReport,
} from "@/lib/domain/offlineDossierVerifier";

const formatInr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

export default function OfflineDossierVerifierPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);
  const [report, setReport] = useState<OfflineVerificationReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [localTampered, setLocalTampered] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runVerification = useCallback(async (text: string, label: string, tamperedFlag = false) => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await verifyDossierJsonOffline(text);
      setFileName(label);
      setRawJson(text);
      setReport(res);
      setLocalTampered(tamperedFlag);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > 25 * 1024 * 1024) {
        setErrorMsg("File exceeds 25 MB browser verification limit.");
        return;
      }
      const text = await file.text();
      await runVerification(text, file.name, false);
    },
    [runVerification]
  );

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await handleFile(f);
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) await handleFile(f);
  };

  const handleLoadLiveVanguard = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/audit/dossier?projectId=VANGUARD-LKO-01&download=1", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching live Vanguard dossier`);
      const text = await res.text();
      await runVerification(text, "quadillar-bsa63-dossier-vanguard-lko-01 (live fetch).json", false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not fetch live dossier.");
      setBusy(false);
    }
  };

  const handleSimulateLocalOneRupeeTamper = async () => {
    if (!rawJson) return;
    try {
      const parsed = JSON.parse(rawJson);
      const target = parsed?.dossier ? parsed.dossier : parsed;
      const events = target?.hashChain?.events;
      if (Array.isArray(events) && events.length > 0) {
        events[events.length - 1].frozenInr = Number(events[events.length - 1].frozenInr || 0) + 1;
      } else if (target?.governorState) {
        target.governorState.frozenInr = Number(target.governorState.frozenInr || 0) + 1;
      }
      const mutatedText = JSON.stringify(parsed, null, 2);
      await runVerification(
        mutatedText,
        `${fileName || "dossier.json"} [LOCALLY MUTATED +₹1]`,
        true
      );
    } catch {
      setErrorMsg("Unable to simulate tamper on non-JSON input.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 print:bg-white text-zinc-100 print:text-black p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Top Toolbar (Hidden on Print) */}
        <header className="print:hidden flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              <h1 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                Independent Offline BSA Sec 63(4) Dossier Verifier
              </h1>
            </div>
            <p className="text-xs font-mono text-zinc-400">
              100% browser-local Web Crypto SHA-256 verification — zero server trust, zero file upload
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/closeout/bsa-certificate"
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-mono text-zinc-200 hover:bg-zinc-800"
            >
              ← BSA Certificate
            </Link>
            <Link
              href="/executive/war-room"
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-mono text-zinc-200 hover:bg-zinc-800"
            >
              War Room
            </Link>
            {report && (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 hover:bg-white px-3.5 py-1.5 text-xs font-mono font-bold text-zinc-950 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Hash Report</span>
              </button>
            )}
          </div>
        </header>

        {/* Dropzone & Controls (Hidden on Print) */}
        <section className="print:hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
              dragActive
                ? "border-emerald-400 bg-emerald-950/30"
                : "border-zinc-700 bg-zinc-950/60 hover:border-zinc-500"
            }`}
          >
            <Upload className="w-7 h-7 mx-auto mb-2 text-zinc-400" />
            <div className="text-sm font-mono font-bold text-zinc-100">
              Drop a downloaded quadillar-bsa63-dossier-*.json file here
            </div>
            <div className="text-xs font-mono text-zinc-400 mt-1">
              File stays inside your browser RAM and is verified locally with FIPS 180-4 SHA-256
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <label className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-mono font-bold text-white cursor-pointer">
                <span>Choose JSON File</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                disabled={busy}
                onClick={handleLoadLiveVanguard}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 disabled:opacity-50 px-3.5 py-2 text-xs font-mono font-bold text-cyan-200 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} />
                <span>Load Live Vanguard Dossier</span>
              </button>

              {rawJson && !localTampered && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSimulateLocalOneRupeeTamper}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/50 disabled:opacity-50 px-3.5 py-2 text-xs font-mono font-bold text-rose-200 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Simulate +₹1 Local Tamper</span>
                </button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs font-mono text-rose-200">
              {errorMsg}
            </div>
          )}
        </section>

        {/* Printable Independent Hash Verification Report */}
        {report && (
          <article className="rounded-2xl border border-zinc-800 print:border-none bg-zinc-900/50 print:bg-white p-6 space-y-5">
            {/* Verdict Banner */}
            <div
              className={`rounded-xl border-2 p-4 flex flex-wrap items-center justify-between gap-3 ${
                report.valid
                  ? "border-emerald-500/60 bg-emerald-950/30 print:border-zinc-900 print:bg-zinc-50"
                  : "border-rose-500/70 bg-rose-950/40 print:border-rose-700 print:bg-rose-50"
              }`}
            >
              <div className="flex items-start gap-3">
                {report.valid ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-400 print:text-black shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-rose-400 print:text-rose-800 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="text-sm font-mono font-extrabold tracking-wide">
                    VERDICT: {report.verdict}
                  </div>
                  <div className="text-xs font-mono text-zinc-200 print:text-zinc-800">
                    {report.summaryReason}
                  </div>
                </div>
              </div>

              <div className="text-right text-[11px] font-mono text-zinc-300 print:text-zinc-700">
                <div>Engine: {report.cryptoEngine}</div>
                <div>Verified UTC: {report.verifiedAtUtc}</div>
              </div>
            </div>

            {/* File & Manifest Cryptographic Proof */}
            <section className="space-y-2">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider border-b border-zinc-700 print:border-zinc-300 pb-1">
                1. BSA SECTION 63(4) INDEPENDENT HASH REPORT
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono rounded-xl border border-zinc-800 print:border-zinc-300 bg-zinc-950/60 print:bg-zinc-50 p-3.5">
                <div>
                  <span className="text-zinc-400 print:text-zinc-600">Artifact File:</span>{" "}
                  <strong>{fileName || "Uploaded JSON"}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 print:text-zinc-600">Schema / Size:</span>{" "}
                  <strong>
                    {report.schemaVersion || "UNKNOWN"} ({report.rawFileBytes.toLocaleString("en-IN")} bytes)
                  </strong>
                </div>
                {report.project && (
                  <>
                    <div>
                      <span className="text-zinc-400 print:text-zinc-600">Project:</span>{" "}
                      <strong>
                        {report.project.name} ({report.project.projectId})
                      </strong>
                    </div>
                    <div>
                      <span className="text-zinc-400 print:text-zinc-600">RA Bill / Zone:</span>{" "}
                      <strong>
                        {report.project.raBillNo} • {report.project.zoneId}
                      </strong>
                    </div>
                  </>
                )}
                <div className="sm:col-span-2 break-all pt-1 border-t border-zinc-800 print:border-zinc-200">
                  <span className="text-zinc-400 print:text-zinc-600">Raw File SHA-256 (Exhibit Copy):</span>{" "}
                  <strong>{report.rawFileSha256 || "N/A"}</strong>
                </div>
                <div className="sm:col-span-2 break-all">
                  <span className="text-zinc-400 print:text-zinc-600">Declared Manifest SHA-256:</span>{" "}
                  <span>{report.manifestCheck.declaredHash || "MISSING"}</span>
                </div>
                <div className="sm:col-span-2 break-all">
                  <span className="text-zinc-400 print:text-zinc-600">Recomputed Manifest SHA-256:</span>{" "}
                  <strong className={report.manifestCheck.matches ? "text-emerald-400 print:text-black" : "text-rose-400 print:text-rose-800"}>
                    {report.manifestCheck.recomputedHash || "N/A"}{" "}
                    {report.manifestCheck.matches ? "[EXACT MATCH]" : "[MISMATCH]"}
                  </strong>
                </div>
              </div>
            </section>

            {/* Block-by-Block Hash-Chain Audit Table */}
            {report.chainCheck.blocks.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider border-b border-zinc-700 print:border-zinc-300 pb-1">
                  2. BLOCK-BY-BLOCK APPEND-ONLY LEDGER VERIFICATION ({report.chainCheck.passedBlocks}/
                  {report.chainCheck.totalEvents} INTACT)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-zinc-700 print:border-zinc-300 text-[11px] font-mono">
                    <thead className="bg-zinc-900 print:bg-zinc-100 text-left">
                      <tr>
                        <th className="border border-zinc-700 print:border-zinc-300 px-2 py-1.5">Seq</th>
                        <th className="border border-zinc-700 print:border-zinc-300 px-2 py-1.5">Event</th>
                        <th className="border border-zinc-700 print:border-zinc-300 px-2 py-1.5">Actor</th>
                        <th className="border border-zinc-700 print:border-zinc-300 px-2 py-1.5">Frozen INR</th>
                        <th className="border border-zinc-700 print:border-zinc-300 px-2 py-1.5">Link & Digest</th>
                        <th className="border border-zinc-700 print:border-zinc-300 px-2 py-1.5">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.chainCheck.blocks.map((b) => (
                        <tr
                          key={`${b.seq}-${b.declaredChainHash}`}
                          className={
                            b.valid
                              ? ""
                              : "bg-rose-950/40 print:bg-rose-50 text-rose-200 print:text-rose-900"
                          }
                        >
                          <td className="border border-zinc-700 print:border-zinc-300 px-2 py-1.5 font-bold">
                            #{b.seq}
                          </td>
                          <td className="border border-zinc-700 print:border-zinc-300 px-2 py-1.5">
                            {b.eventType}
                          </td>
                          <td className="border border-zinc-700 print:border-zinc-300 px-2 py-1.5">
                            {b.actor}
                          </td>
                          <td className="border border-zinc-700 print:border-zinc-300 px-2 py-1.5">
                            {formatInr(b.frozenInr)}
                          </td>
                          <td className="border border-zinc-700 print:border-zinc-300 px-2 py-1.5">
                            <div>{b.recomputedChainHash.slice(0, 18)}…</div>
                            {b.failureReason && (
                              <div className="text-[10px] font-bold text-rose-400 print:text-rose-800">
                                {b.failureReason}
                              </div>
                            )}
                          </td>
                          <td className="border border-zinc-700 print:border-zinc-300 px-2 py-1.5 font-bold">
                            {b.valid ? (
                              <span className="text-emerald-400 print:text-black">PASS</span>
                            ) : (
                              <span className="text-rose-400 print:text-rose-800">TAMPERED</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </article>
        )}
      </div>
    </div>
  );
}
