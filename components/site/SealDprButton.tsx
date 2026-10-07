"use client";

import React, { useState } from "react";
import { sealAndSignDpr } from "@/app/actions/dpr-actions";
import { ShieldCheck, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  isSealed: boolean;
}

export function SealDprButton({ projectId, isSealed }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSeal = async () => {
    if (isSealed) return;
    if (!confirm("Are you sure you want to seal and sign today's DPR with a statutory SEOR Merkle stamp? This locks the daily diary permanently under Section 65B.")) return;

    setLoading(true);
    try {
      const res = await sealAndSignDpr(projectId);
      if (!res.success) {
        alert(res.error || "Failed to seal DPR.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSeal}
      disabled={loading || isSealed}
      className={`px-5 py-2.5 rounded-xl font-bold uppercase text-xs transition flex items-center gap-2 cursor-pointer shadow-lg ${
        isSealed
          ? "bg-emerald-950 border border-emerald-800 text-emerald-300 cursor-default"
          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40"
      }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <ShieldCheck className="w-4 h-4 text-emerald-300" />
      )}
      <span>{isSealed ? "✓ DPR SEOR SEALED" : "SEAL & SIGN DPR (SEOR STAMP)"}</span>
    </button>
  );
}
