"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  MapPin,
  Calendar,
  Lock,
  ArrowRight,
  Loader2,
  BadgeCheck,
} from "lucide-react";
import {
  ExtractedProjectData,
  commitVerifiedProject,
} from "@/app/actions/document-intake-actions";

interface Props {
  stagingId: string;
  initialData: ExtractedProjectData;
  confidenceScores: Record<string, number>;
  onVerificationSuccess: (projectId: string) => void;
}

export function DocumentVerificationConsole({
  stagingId,
  initialData,
  confidenceScores,
  onVerificationSuccess,
}: Props) {
  const [data, setData] = useState<ExtractedProjectData>(initialData);
  const [attesterName, setAttesterName] = useState("Ar. Akshat Singh Rathore");
  const [attesterRole, setAttesterRole] = useState("Principal Architect & Lead SEOR");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const getConfidenceBadge = (key: string) => {
    const score = confidenceScores[key] ?? 0.9;
    const pct = Math.round(score * 100);
    return (
      <span
        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
          pct >= 95
            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
            : pct >= 85
            ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
            : "bg-amber-950 text-amber-300 border border-amber-800"
        }`}
      >
        AI Conf. {pct}%
      </span>
    );
  };

  const handleAttestAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await commitVerifiedProject({
        stagingId,
        verifiedData: data,
        attestedByName: attesterName.trim(),
        attestedByRole: attesterRole.trim(),
      });

      if (res.success && res.projectId) {
        onVerificationSuccess(res.projectId);
      } else {
        setFeedback(res.error || "Failed to commit verified project.");
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto font-mono text-xs select-none space-y-6">
      {/* HEADER */}
      <div className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Human-In-The-Loop Attestation Gate</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Verify &amp; Attest Extracted Document Parameters
          </h1>
          <p className="text-zinc-400 font-sans text-xs mt-0.5">
            The platform extracted these contract values, permissions, and locations from your uploaded documents. Verify or correct each field before locking the statutory baseline.
          </p>
        </div>

        <span className="px-2.5 py-1 bg-amber-950 border border-amber-800 text-amber-300 font-bold uppercase text-[10px] self-start md:self-auto">
          Attestation Pending
        </span>
      </div>

      {feedback && (
        <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl">
          {feedback}
        </div>
      )}

      <form onSubmit={handleAttestAndSubmit} className="space-y-6">
        {/* SECTION 1: IDENTITY & SPATIAL GEOMETRY */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-white font-bold text-xs uppercase border-b border-zinc-850 pb-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>1. Identity, Location &amp; Asset Classification</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-zinc-400 text-[10px] uppercase font-bold">Project Name</label>
                {getConfidenceBadge("projectName")}
              </div>
              <input
                type="text"
                required
                value={data.projectName}
                onChange={(e) => setData({ ...data, projectName: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-sans text-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-zinc-400 text-[10px] uppercase font-bold">Project Code</label>
                {getConfidenceBadge("projectCode")}
              </div>
              <input
                type="text"
                required
                value={data.projectCode}
                onChange={(e) => setData({ ...data, projectCode: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono uppercase"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-zinc-400 text-[10px] uppercase font-bold">Asset Tier</label>
                {getConfidenceBadge("assetTier")}
              </div>
              <select
                value={data.assetTier}
                onChange={(e) => setData({ ...data, assetTier: e.target.value as any })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
              >
                <option value="COMMERCIAL">Commercial Core &amp; Shell</option>
                <option value="RESIDENTIAL">Luxury Interior / Residential</option>
                <option value="INFRASTRUCTURE">Civil Infrastructure &amp; Public Works</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-zinc-400 text-[10px] uppercase font-bold">Physical Site Location Address</label>
                {getConfidenceBadge("locationAddress")}
              </div>
              <input
                type="text"
                required
                value={data.locationAddress}
                onChange={(e) => setData({ ...data, locationAddress: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-zinc-400 text-[10px] uppercase font-bold">Geographic Coordinates (Lat, Long)</label>
                {getConfidenceBadge("siteGeoCoordinates")}
              </div>
              <input
                type="text"
                required
                value={data.siteGeoCoordinates}
                onChange={(e) => setData({ ...data, siteGeoCoordinates: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: STATUTORY SANCTIONS */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-white font-bold text-xs uppercase border-b border-zinc-850 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>2. Municipal Approval &amp; Regulatory Permits</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-zinc-400 text-[10px] uppercase font-bold">Sanction Authority</label>
                {getConfidenceBadge("sanctionAuthority")}
              </div>
              <input
                type="text"
                required
                value={data.sanctionAuthority}
                onChange={(e) => setData({ ...data, sanctionAuthority: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-zinc-400 text-[10px] uppercase font-bold">Sanction Order Number</label>
                {getConfidenceBadge("sanctionOrderNumber")}
              </div>
              <input
                type="text"
                required
                value={data.sanctionOrderNumber}
                onChange={(e) => setData({ ...data, sanctionOrderNumber: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-zinc-400 text-[10px] uppercase font-bold">RERA Registration No.</label>
                {getConfidenceBadge("reraRegistrationNumber")}
              </div>
              <input
                type="text"
                required
                value={data.reraRegistrationNumber}
                onChange={(e) => setData({ ...data, reraRegistrationNumber: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: COMMERCIAL BASELINE & ESCROW */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-white font-bold text-xs uppercase border-b border-zinc-850 pb-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>3. Contract Baseline, Retention &amp; Delay Ceilings</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-zinc-400 text-[10px] uppercase font-bold">Contract Baseline Sum (₹)</label>
                {getConfidenceBadge("contractBaselineValueInr")}
              </div>
              <input
                type="number"
                required
                value={data.contractBaselineValueInr}
                onChange={(e) => setData({ ...data, contractBaselineValueInr: Number(e.target.value) })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono text-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-zinc-400 text-[10px] uppercase font-bold">Retention Escrow %</label>
                {getConfidenceBadge("retentionEscrowPct")}
              </div>
              <input
                type="number"
                step="0.1"
                required
                value={data.retentionEscrowPct}
                onChange={(e) => setData({ ...data, retentionEscrowPct: Number(e.target.value) })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-zinc-400 text-[10px] uppercase font-bold">Defect Liability (Months)</label>
                {getConfidenceBadge("defectLiabilityMonths")}
              </div>
              <input
                type="number"
                required
                value={data.defectLiabilityMonths}
                onChange={(e) => setData({ ...data, defectLiabilityMonths: Number(e.target.value) })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-zinc-400 text-[10px] uppercase font-bold">LD Ceiling (% of Contract)</label>
                {getConfidenceBadge("liquidatedDamagesCeilingPct")}
              </div>
              <input
                type="number"
                step="0.1"
                required
                value={data.liquidatedDamagesCeilingPct}
                onChange={(e) => setData({ ...data, liquidatedDamagesCeilingPct: Number(e.target.value) })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-zinc-400 text-[10px] uppercase font-bold">Appointing Client Entity</label>
                {getConfidenceBadge("clientEntityName")}
              </div>
              <input
                type="text"
                required
                value={data.clientEntityName}
                onChange={(e) => setData({ ...data, clientEntityName: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-zinc-400 text-[10px] uppercase font-bold">Executing Main Contractor</label>
                {getConfidenceBadge("contractorEntityName")}
              </div>
              <input
                type="text"
                required
                value={data.contractorEntityName}
                onChange={(e) => setData({ ...data, contractorEntityName: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-sans"
              />
            </div>
          </div>
        </div>

        {/* ATTESTATION SIGN-OFF BOX */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase">
            <BadgeCheck className="w-4 h-4" />
            <span>Principal Stakeholder Electronic Attestation</span>
          </div>

          <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
            I hereby certify and attest that the above extracted values reflect the true contractual covenants, approved municipal sanction terms, and site geometries. Submitting this record locks the baseline for autonomous AI governance across the project lifecycle.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="text-zinc-400 text-[10px] uppercase font-bold block mb-1">Signatory Name *</label>
              <input
                type="text"
                required
                value={attesterName}
                onChange={(e) => setAttesterName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div>
              <label className="text-zinc-400 text-[10px] uppercase font-bold block mb-1">Designated Role *</label>
              <input
                type="text"
                required
                value={attesterRole}
                onChange={(e) => setAttesterRole(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-sans"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded-xl flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-950/40 text-xs disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Attest &amp; Initialize LiveView Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default DocumentVerificationConsole;
