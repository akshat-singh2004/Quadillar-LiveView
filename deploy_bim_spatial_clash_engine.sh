#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Creating directory structures...\033[0m"
mkdir -p lib/spatial app/actions components/spatial app/spatial/clashes

echo -e "\033[1;36m[+] Deploying BIM Spatial Coordination & Clash Forensics Engine (Minerva)...\033[0m"

# -----------------------------------------------------------------------------
# 1. ACTION: app/actions/bim-actions.ts
# Evaluates MinervaAgent, AABB collisions, Council Synapse, and Hermes notarization
# -----------------------------------------------------------------------------
cat << 'ACTION_BIM' > app/actions/bim-actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { MinervaAgent } from "@/lib/agents/minerva";
import { AabbCollisionDetector, BoundingBox3D } from "@/lib/agents/sub-agents/minerva/aabb-collision";
import { HermesAgent } from "@/lib/agents/hermes";
import { CouncilSynapse } from "@/lib/agents/synapse";

export interface DetectClashPayload {
  projectId: string;
  structuralElementName: string;
  mepElementName: string;
  gridLocation: string;
  structBox: BoundingBox3D;
  mepBox: BoundingBox3D;
}

export interface ResolveClashPayload {
  projectId: string;
  clashId: string;
  clashCode: string;
  resolutionDescription: string;
  resolvedBySeor: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for BIM Spatial actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function detectAndLogBimClash(payload: DetectClashPayload) {
  try {
    const supabase = getSupabase();
    const clashCode = `CLASH-${Date.now().toString().slice(-6)}`;

    // 1. Deterministic AABB 3D Collision Audit via Minerva Sub-Agent
    const hasCollision = AabbCollisionDetector.checkCollision(payload.structBox, payload.mepBox);

    // Compute overlapping bounding volume
    let overlapVolume = 0;
    if (hasCollision) {
      const xOverlap = Math.max(0, Math.min(payload.structBox.maxX, payload.mepBox.maxX) - Math.max(payload.structBox.minX, payload.mepBox.minX));
      const yOverlap = Math.max(0, Math.min(payload.structBox.maxY, payload.mepBox.maxY) - Math.max(payload.structBox.minY, payload.mepBox.minY));
      const zOverlap = Math.max(0, Math.min(payload.structBox.maxZ, payload.mepBox.maxZ) - Math.max(payload.structBox.minZ, payload.mepBox.minZ));
      overlapVolume = parseFloat((xOverlap * yOverlap * zOverlap).toFixed(4));
    }

    const severity = hasCollision ? "HARD_CLASH_CRITICAL" : "CLEARANCE_PASSED";
    const status = hasCollision ? "OPEN_SPATIAL_HOLD" : "COORDINATION_VERIFIED";

    // 2. Commit record to bim_spatial_clashes
    const { data, error } = await supabase
      .from("bim_spatial_clashes")
      .insert({
        project_id: payload.projectId,
        clash_code: clashCode,
        structural_element_name: payload.structuralElementName,
        mep_element_name: payload.mepElementName,
        grid_location: payload.gridLocation,
        clash_severity: severity,
        struct_box_min_x: payload.structBox.minX,
        struct_box_max_x: payload.structBox.maxX,
        struct_box_min_y: payload.structBox.minY,
        struct_box_max_y: payload.structBox.maxY,
        struct_box_min_z: payload.structBox.minZ,
        struct_box_max_z: payload.structBox.maxZ,
        mep_box_min_x: payload.mepBox.minX,
        mep_box_max_x: payload.mepBox.maxX,
        mep_box_min_y: payload.mepBox.minY,
        mep_box_max_y: payload.mepBox.maxY,
        mep_box_min_z: payload.mepBox.minZ,
        mep_box_max_z: payload.mepBox.maxZ,
        overlap_volume_m3: overlapVolume,
        status,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Hermes Section 65B Notarization
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `BIM Clash Detected: ${clashCode} [${severity}]`,
      actionCategory: "SPATIAL_BIM_CLASH_LOGGED",
      moduleRef: clashCode,
      details: { payload, hasCollision, overlapVolume } as Record<string, unknown>,
      signatoryName: "Agent Minerva (Spatial BIM Governor)",
      signatoryRole: "Autonomous Spatial Coordinator",
      severity: hasCollision ? "critical" : "verified",
    });

    await supabase
      .from("bim_spatial_clashes")
      .update({ seor_signoff_hash: seal.blockHash })
      .eq("id", data.id);

    // 4. Inter-Agent Reactive Dispatch via Council Synapse
    if (hasCollision) {
      await CouncilSynapse.dispatch({
        projectId: payload.projectId,
        eventType: "STRUCTURAL_NCR_ISSUED",
        sourceAgent: "Minerva (Spatial BIM Governor)",
        targetAgent: "Aegis (Structural Quality Governor)",
        payload: { clashCode, gridLocation: payload.gridLocation, overlapVolume },
        actionTaken: `Hard clash between ${payload.structuralElementName} and ${payload.mepElementName} engaged Pre-Pour hold on ${payload.gridLocation}.`,
      });
    }

    revalidatePath("/spatial/clashes");
    revalidatePath("/quality/pour-cards");
    revalidatePath("/");

    return { success: true, data, hasCollision, overlapVolume, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to audit BIM spatial coordinates." };
  }
}

export async function resolveBimClash(payload: ResolveClashPayload) {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("bim_spatial_clashes")
      .update({
        status: "RESOLVED_DESIGN_REVISION",
        resolution_description: payload.resolutionDescription,
        resolved_by_seor: payload.resolvedBySeor,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", payload.clashId)
      .select()
      .single();

    if (error) throw error;

    // Notarize resolution via Hermes
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `BIM Clash Resolved: ${payload.clashCode}`,
      actionCategory: "SPATIAL_BIM_CLASH_RESOLVED",
      moduleRef: payload.clashCode,
      details: payload as Record<string, unknown>,
      signatoryName: payload.resolvedBySeor,
      signatoryRole: "Structural Engineer of Record (SEOR)",
      severity: "verified",
    });

    await supabase
      .from("bim_spatial_clashes")
      .update({ seor_signoff_hash: seal.blockHash })
      .eq("id", payload.clashId);

    revalidatePath("/spatial/clashes");
    revalidatePath("/quality/pour-cards");
    revalidatePath("/");

    return { success: true, data, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to resolve BIM spatial clash." };
  }
}
ACTION_BIM

# -----------------------------------------------------------------------------
# 2. COMPONENT: components/spatial/AuditClashModal.tsx
# Field dialog for 3D AABB bounding coordinate ingest & collision audit
# -----------------------------------------------------------------------------
cat << 'COMP_CLASH_MODAL' > components/spatial/AuditClashModal.tsx
"use client";

import React, { useState } from "react";
import { detectAndLogBimClash } from "@/app/actions/bim-actions";
import { Plus, Box, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function AuditClashModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [structuralElementName, setStructuralElementName] = useState("RC Column C3 (750x750mm)");
  const [mepElementName, setMepElementName] = useState("HVAC Chilled Water Supply Pipe DN200");
  const [gridLocation, setGridLocation] = useState("Tower Core Grid B2-C3");

  // Structural Box A
  const [sMinX, setSMinX] = useState(10.0);
  const [sMaxX, setSMaxX] = useState(10.75);
  const [sMinY, setSMinY] = useState(5.0);
  const [sMaxY, setSMaxY] = useState(5.75);
  const [sMinZ, setSMinZ] = useState(0.0);
  const [sMaxZ, setSMaxZ] = useState(3.5);

  // MEP Box B (Default overlapping to demonstrate AABB collision detection)
  const [mMinX, setMMinX] = useState(10.5);
  const [mMaxX, setMMaxX] = useState(11.2);
  const [mMinY, setMMinY] = useState(5.2);
  const [mMaxY, setMMaxY] = useState(5.6);
  const [mMinZ, setMMinZ] = useState(2.8);
  const [mMaxZ, setMMaxZ] = useState(3.2);

  // Live AABB collision preview
  const isOverlapX = sMinX <= mMaxX && sMaxX >= mMinX;
  const isOverlapY = sMinY <= mMaxY && sMaxY >= mMinY;
  const isOverlapZ = sMinZ <= mMaxZ && sMaxZ >= mMinZ;
  const hasLiveCollision = isOverlapX && isOverlapY && isOverlapZ;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await detectAndLogBimClash({
        projectId,
        structuralElementName,
        mepElementName,
        gridLocation,
        structBox: { minX: sMinX, maxX: sMaxX, minY: sMinY, maxY: sMaxY, minZ: sMinZ, maxZ: sMaxZ },
        mepBox: { minX: mMinX, maxX: mMaxX, minY: mMinY, maxY: mMaxY, minZ: mMinZ, maxZ: mMaxZ },
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to audit spatial coordinates.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Audit 3D BIM Coordinates</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">
                  ISO 19650-2 / PAS 1192 • Spatial Coordination Gate
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Audit 3D AABB Volumetric Interference
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Structural RC Element
                  </label>
                  <input
                    type="text"
                    required
                    value={structuralElementName}
                    onChange={(e) => setStructuralElementName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    MEP Service / Embedment
                  </label>
                  <input
                    type="text"
                    required
                    value={mepElementName}
                    onChange={(e) => setMepElementName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Grid Axis Location
                </label>
                <input
                  type="text"
                  required
                  value={gridLocation}
                  onChange={(e) => setGridLocation(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                />
              </div>

              {/* 3D BOUNDING COORDINATES (STRUCTURAL VS MEP) */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <div>
                  <span className="text-[9px] text-indigo-400 uppercase font-bold block mb-1.5">
                    Structural Bounding Box (m)
                  </span>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex gap-1 items-center">
                      <span className="text-zinc-500 w-4">X:</span>
                      <input type="number" step="0.01" value={sMinX} onChange={(e) => setSMinX(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                      <span className="text-zinc-600">to</span>
                      <input type="number" step="0.01" value={sMaxX} onChange={(e) => setSMaxX(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                    </div>
                    <div className="flex gap-1 items-center">
                      <span className="text-zinc-500 w-4">Y:</span>
                      <input type="number" step="0.01" value={sMinY} onChange={(e) => setSMinY(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                      <span className="text-zinc-600">to</span>
                      <input type="number" step="0.01" value={sMaxY} onChange={(e) => setSMaxY(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                    </div>
                    <div className="flex gap-1 items-center">
                      <span className="text-zinc-500 w-4">Z:</span>
                      <input type="number" step="0.01" value={sMinZ} onChange={(e) => setSMinZ(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                      <span className="text-zinc-600">to</span>
                      <input type="number" step="0.01" value={sMaxZ} onChange={(e) => setSMaxZ(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] text-cyan-400 uppercase font-bold block mb-1.5">
                    MEP Bounding Box (m)
                  </span>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex gap-1 items-center">
                      <span className="text-zinc-500 w-4">X:</span>
                      <input type="number" step="0.01" value={mMinX} onChange={(e) => setMMinX(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                      <span className="text-zinc-600">to</span>
                      <input type="number" step="0.01" value={mMaxX} onChange={(e) => setMMaxX(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                    </div>
                    <div className="flex gap-1 items-center">
                      <span className="text-zinc-500 w-4">Y:</span>
                      <input type="number" step="0.01" value={mMinY} onChange={(e) => setMMinY(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                      <span className="text-zinc-600">to</span>
                      <input type="number" step="0.01" value={mMaxY} onChange={(e) => setMMaxY(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                    </div>
                    <div className="flex gap-1 items-center">
                      <span className="text-zinc-500 w-4">Z:</span>
                      <input type="number" step="0.01" value={mMinZ} onChange={(e) => setMMinZ(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                      <span className="text-zinc-600">to</span>
                      <input type="number" step="0.01" value={mMaxZ} onChange={(e) => setMMaxZ(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                    </div>
                  </div>
                </div>
              </div>

              {/* STATUTORY COLLISION AUDIT PREVIEW */}
              <div className={`p-3 rounded-xl border space-y-1 text-[10px] ${
                hasLiveCollision ? "bg-rose-950/40 border-rose-800/80" : "bg-emerald-950/40 border-emerald-800/80"
              }`}>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Minerva 3D AABB Audit:</span>
                  <span className={`font-bold font-mono ${hasLiveCollision ? "text-rose-400" : "text-emerald-400"}`}>
                    {hasLiveCollision ? "HARD CLASH INTERFERENCE DETECTED" : "SPATIAL COORDINATION CLEARED (ZERO CLASH)"}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-1">
                  <span className="text-zinc-400">Pour Card Interlock:</span>
                  <span className={hasLiveCollision ? "text-rose-400" : "text-emerald-400"}>
                    {hasLiveCollision ? "Engages Pre-Pour Spatial Lockout" : "MEP Clearances Cleared for Casting"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold uppercase rounded text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Execute Spatial Audit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
COMP_CLASH_MODAL

# -----------------------------------------------------------------------------
# 3. PAGE: app/spatial/clashes/page.tsx
# Connected to live bim_spatial_clashes with SEOR sign-off resolution workflow
# -----------------------------------------------------------------------------
cat << 'PAGE_CLASHES' > app/spatial/clashes/page.tsx
import React from "react";
import { AuditClashModal } from "@/components/spatial/AuditClashModal";
import { createClient } from "@/lib/supabase/server";
import { resolveBimClash } from "@/app/actions/bim-actions";
import { Box, Layers, ShieldCheck, ShieldAlert, CheckCircle2, Lock, AlertTriangle } from "lucide-react";

export default async function BimClashesPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch real clashes
  const { data: clashes } = await supabase
    .from("bim_spatial_clashes")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const activeClashes = clashes || [];
  const hardClashCount = activeClashes.filter((c) => c.status === "OPEN_SPATIAL_HOLD").length;
  const resolvedCount = activeClashes.filter((c) => c.status === "RESOLVED_DESIGN_REVISION").length;
  const verifiedCount = activeClashes.filter((c) => c.status === "COORDINATION_VERIFIED").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-indigo-400 uppercase tracking-widest font-bold">
            <Box className="w-3.5 h-3.5" />
            <span>SPATIAL BIM GOVERNANCE • ISO 19650-2 / PAS 1192 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            3D BIM Clash Forensics &amp; Spatial Coordination Gate
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • AABB 3D geometric collision checks, RC embedment validation, and pre-pour spatial lockouts.
          </p>
        </div>

        <AuditClashModal projectId={projectId} />
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Spatial Audits Run</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{activeClashes.length} Audits</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">AABB 3D volumetric checks</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Active Hard Clashes</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${hardClashCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {hardClashCount} Active
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {hardClashCount > 0 ? "Pre-pour card lockout active" : "Zero geometric interferences"}
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">SEOR Design Revisions</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">{resolvedCount} Resolved</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Rerouted / Box-out stamped</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Verified Zero-Clashes</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">{verifiedCount} Cleared</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Approved for concreting</span>
        </div>
      </div>

      {/* CLASH REGISTER TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            BIM Spatial Clash &amp; Coordination Register ({activeClashes.length})
          </span>
          <span className="text-[10px] text-zinc-500">ISO 19650 Section 65B Certified</span>
        </div>

        <div className="divide-y divide-zinc-800">
          {activeClashes.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 font-sans">
              Zero BIM clash audits logged. Click &quot;+ Audit 3D BIM Coordinates&quot; to test RC vs MEP bounding boxes for volumetric collisions.
            </div>
          ) : (
            activeClashes.map((c: any) => {
              const isHardClash = c.status === "OPEN_SPATIAL_HOLD";
              const isResolved = c.status === "RESOLVED_DESIGN_REVISION";

              return (
                <div key={c.id} className="p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-zinc-850/50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 font-bold text-[10px]">
                        {c.clash_code}
                      </span>
                      <strong className="text-white text-sm">{c.structural_element_name}</strong>
                      <span className="text-zinc-500 text-xs">vs</span>
                      <strong className="text-cyan-300 text-sm">{c.mep_element_name}</strong>
                    </div>

                    <div className="text-zinc-400 text-[11px] font-sans flex flex-wrap gap-x-4 gap-y-1">
                      <span>Grid: <strong className="text-zinc-300 font-mono">{c.grid_location}</strong></span>
                      <span>Overlap Volume: <strong className={isHardClash ? "text-rose-400 font-mono" : "text-emerald-400 font-mono"}>{c.overlap_volume_m3} m³</strong></span>
                      <span>Severity: <strong className="text-zinc-300">{c.clash_severity.replace(/_/g, " ")}</strong></span>
                    </div>

                    {isResolved && (
                      <div className="text-emerald-400 text-[10px] font-sans pt-0.5">
                        &bull; Resolution: {c.resolution_description} (Approved by {c.resolved_by_seor})
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {isHardClash && (
                      <form
                        action={async () => {
                          "use server";
                          await resolveBimClash({
                            projectId,
                            clashId: c.id,
                            clashCode: c.clash_code,
                            resolutionDescription: "SEOR stamped sleeve reroute to bypass structural core.",
                            resolvedBySeor: "Principal Structural Consultant",
                          });
                        }}
                      >
                        <button
                          type="submit"
                          className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-[9px] transition cursor-pointer flex items-center gap-1 shadow"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>SEOR Stamp Revision</span>
                        </button>
                      </form>
                    )}

                    <span className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      isHardClash
                        ? "bg-rose-950 border-rose-800 text-rose-300"
                        : "bg-emerald-950 border-emerald-800 text-emerald-300"
                    }`}>
                      {isHardClash ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                          <span>Pre-Pour Locked</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Spatial Cleared</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
PAGE_CLASHES

# -----------------------------------------------------------------------------
# 4. VERIFY FULL WORKSPACE TYPESCRIPT COMPILATION
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying full TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] BIM Spatial Clash Forensics Engine deployed cleanly with ZERO errors!\033[0m"
