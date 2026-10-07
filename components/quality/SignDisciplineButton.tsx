"use client";

import React, { useState } from "react";
import { signPourDiscipline } from "@/app/actions/pour-card-actions";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  pourCardId: string;
  discipline: "FORMWORK" | "REBAR" | "MEP";
  label: string;
  isCleared: boolean;
  clearedBy?: string;
}

export function SignDisciplineButton({ projectId, pourCardId, discipline, label, isCleared, clearedBy }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSign = async () => {
    if (isCleared) return;
    setLoading(true);
    try {
      const res = await signPourDiscipline({
        projectId,
        pourCardId,
        discipline,
        inspectorName: "Quality Inspection Engineer",
      });
      if (!res.success) {
        alert(res.error || "Failed to sign clearance.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isCleared) {
    return (
      <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold text-[9px] uppercase flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        <span>{label} ✓ ({clearedBy || "Cleared"})</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSign}
      disabled={loading}
      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-cyan-950 border border-zinc-700 hover:border-cyan-700 text-zinc-300 hover:text-cyan-300 font-bold text-[9px] uppercase transition cursor-pointer flex items-center gap-1"
    >
      {loading && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
      <span>Sign {label}</span>
    </button>
  );
}
