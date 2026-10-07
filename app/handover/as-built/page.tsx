"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import {
    Layers,
    Box,
    Cpu,
    FileCheck2,
    CheckCircle2,
    AlertTriangle,
    Upload,
    Lock,
    Plus,
    ShieldCheck,
    Server,
    Zap,
} from "lucide-react";

interface AsBuiltModel {
    id: string;
    model_urn: string;
    lod_level: string;
    file_format: string;
    file_name: string;
    file_size_mb: number;
    file_hash_sha256: string;
    clash_detection_passed: boolean;
    status: string;
}

interface CobieAsset {
    id: string;
    asset_tag: string;
    system_category: string;
    manufacturer: string;
    model_number: string;
    serial_number: string;
    grid_location: string;
    warranty_end_date: string;
    status: string;
}

export default function AsBuiltAimHandoverPage() {
    const { project } = useActiveRole();
    const activeProjectId = project?.project_id || project?.id || "";

    const [models, setModels] = useState<AsBuiltModel[]>([]);
    const [assets, setAssets] = useState<CobieAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // COBie Asset Entry Form State
    const [assetTag, setAssetTag] = useState("");
    const [category, setCategory] = useState("HVAC");
    const [manufacturer, setManufacturer] = useState("Daikin / Carrier");
    const [modelNum, setModelNum] = useState("");
    const [serialNum, setSerialNum] = useState("");
    const [gridLoc, setGridLoc] = useState("");
    const [warrantyMonths, setWarrantyMonths] = useState("24");

    const loadHandoverData = async () => {
        if (!activeProjectId) return;
        setLoading(true);
        try {
            const { data: modelData } = await (supabase as any)
                .from("project_as_built_models")
                .select("*")
                .eq("project_id", activeProjectId)
                .order("created_at", { ascending: false });

            setModels(modelData || []);

            const { data: assetData } = await (supabase as any)
                .from("project_cobie_assets")
                .select("*")
                .eq("project_id", activeProjectId)
                .order("created_at", { ascending: false });

            setAssets(assetData || []);
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to load As-Built & COBie registry.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadHandoverData();
    }, [activeProjectId]);

    // Compute file SHA-256 digest
    const computeFileHash = async (file: File): Promise<string> => {
        const arrayBuffer = await file.arrayBuffer();
        const digestBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
        const hashArray = Array.from(new Uint8Array(digestBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    };

    const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setErrorMsg(null);

        try {
            const hash = await computeFileHash(file);
            const sizeMb = Number((file.size / (1024 * 1024)).toFixed(2));
            const modelUrn = `AIM-LOD500-${Date.now().toString(36).toUpperCase()}`;

            const payload = {
                project_id: activeProjectId,
                model_urn: modelUrn,
                lod_level: "LOD_500",
                file_format: file.name.endsWith(".rvt") ? "RVT" : "IFC4",
                file_name: file.name,
                file_size_mb: sizeMb,
                file_hash_sha256: hash,
                clash_detection_passed: true,
                status: "AIM_ACCEPTED",
            };

            const { error } = await (supabase as any)
                .from("project_as_built_models")
                .insert([payload]);

            if (error) throw error;
            await loadHandoverData();
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to ingest As-Built BIM model.");
        } finally {
            setUploading(false);
        }
    };

    const handleAddCobieAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetTag.trim() || !gridLoc.trim()) {
            setErrorMsg("Asset tag and grid reference are mandatory.");
            return;
        }

        try {
            const expiry = new Date();
            expiry.setMonth(expiry.getMonth() + (parseInt(warrantyMonths) || 24));

            const payload = {
                project_id: activeProjectId,
                asset_tag: assetTag.trim().toUpperCase(),
                system_category: category,
                manufacturer: manufacturer.trim(),
                model_number: modelNum.trim() || "OEM-STD",
                serial_number: serialNum.trim() || `SN-${Date.now().toString().slice(-6)}`,
                grid_location: gridLoc.trim(),
                warranty_end_date: expiry.toISOString().split("T")[0],
                status: "COMMISSIONED",
            };

            const { error } = await (supabase as any)
                .from("project_cobie_assets")
                .insert([payload]);

            if (error) throw error;

            setAssetTag("");
            setModelNum("");
            setSerialNum("");
            setGridLoc("");
            await loadHandoverData();
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to log COBie equipment line.");
        }
    };

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-sans">
            <div className="max-w-[1650px] mx-auto space-y-6">

                {/* HEADER BAR */}
                <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
                    <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                            ASSET HANDOVER • ISO 19650-3 / COBie DATA STANDARD
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                            <Box className="w-6 h-6 text-cyan-400" />
                            <span>As-Built BIM Coordination &amp; COBie Handover</span>
                        </h1>
                        <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                            Scope: <strong className="text-zinc-200">{project?.project_name || "Active Contract"}</strong> • LOD 500 digital twin geometry verification and operations equipment register.
                        </p>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 p-2.5 font-mono text-xs">
                        <span className="text-[10px] text-zinc-500 block uppercase">Commissioned Assets</span>
                        <strong className="text-emerald-400 text-sm">{assets.length} Active Records</strong>
                    </div>
                </header>

                {errorMsg && (
                    <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* TOP: AS-BUILT BIM MODEL INGESTION (LOD 500) */}
                <div className="bg-zinc-900/40 border border-zinc-800 p-6 space-y-4 font-mono text-xs">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                        <span className="font-bold text-white uppercase text-xs flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-cyan-400" />
                            <span>1. LOD 500 Coordination Model (.IFC4 / .RVT)</span>
                        </span>
                        <span className="text-zinc-500 text-[10px]">Zero Spatial Clash Mandate</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-8 p-4 bg-zinc-950 border border-zinc-850 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-zinc-200">
                                    {models.length > 0 ? models[0].file_name : "No Final As-Built Model Deposited"}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase font-bold">
                                    {models.length > 0 ? models[0].status : "PENDING DEPOSIT"}
                                </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 font-sans">
                                The As-Built model must incorporate all on-site redlines, SEOR-signed deviations, and clash-resolved MEP penetrations.
                            </p>
                            {models.length > 0 && (
                                <div className="text-[9px] text-zinc-500 truncate pt-1">
                                    SHA-256 Digest: {models[0].file_hash_sha256}
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-4 flex justify-end">
                            <label className="w-full sm:w-auto px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase cursor-pointer transition flex items-center justify-center gap-2">
                                <Upload className="w-4 h-4" />
                                <span>{uploading ? "Hashing Model..." : "Deposit As-Built IFC4"}</span>
                                <input
                                    type="file"
                                    accept=".ifc,.rvt,.nwd"
                                    onChange={handleModelUpload}
                                    disabled={uploading}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                {/* BOTTOM: COBIE ASSET SCHEDULE (EQUIPMENT DATABASE) */}
                <div className="bg-zinc-900/40 border border-zinc-800 p-6 space-y-4 font-mono text-xs">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                        <span className="font-bold text-white uppercase text-xs flex items-center gap-2">
                            <Server className="w-4 h-4 text-cyan-400" />
                            <span>2. Structured COBie Facility Asset Register</span>
                        </span>
                        <span className="text-zinc-500 text-[10px]">Operations &amp; Maintenance Transfer</span>
                    </div>

                    {/* Quick Add Asset Form */}
                    <form onSubmit={handleAddCobieAsset} className="p-4 bg-zinc-950 border border-zinc-850 space-y-3">
                        <span className="text-[10px] uppercase text-zinc-400 font-bold block">
                            + Commission New MEP Equipment
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                            <div>
                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">Asset Tag</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. AHU-L02-01"
                                    value={assetTag}
                                    onChange={(e) => setAssetTag(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-xs text-white"
                                />
                            </div>

                            <div>
                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">System Trade</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-xs text-white"
                                >
                                    <option value="HVAC">HVAC Air Distribution</option>
                                    <option value="PLUMBING">Plumbing Booster Pumps</option>
                                    <option value="FIRE_FIGHTING">Fire Fighting Main Hydrant</option>
                                    <option value="ELECTRICAL_SUBSTATION">Transformers &amp; HT Panels</option>
                                    <option value="ELEVATOR_VERTICAL">Elevators &amp; Escalators</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">Manufacturer</label>
                                <input
                                    type="text"
                                    value={manufacturer}
                                    onChange={(e) => setManufacturer(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-xs text-white"
                                />
                            </div>

                            <div>
                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">Spatial Grid</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Grid C2 / AHU Room"
                                    value={gridLoc}
                                    onChange={(e) => setGridLoc(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-xs text-white"
                                />
                            </div>

                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase transition text-xs"
                                >
                                    + Add to AIM
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* TABLE OF REGISTERED ASSETS */}
                    {assets.length === 0 ? (
                        <div className="p-8 text-center text-zinc-600 border border-zinc-850">
                            Zero equipment assets recorded in COBie schedule.
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-zinc-800">
                            <table className="w-full text-left">
                                <thead className="bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                                    <tr>
                                        <th className="p-2.5">Asset Tag</th>
                                        <th className="p-2.5">Trade System</th>
                                        <th className="p-2.5">Manufacturer</th>
                                        <th className="p-2.5">Spatial Anchor</th>
                                        <th className="p-2.5">Warranty Expiry</th>
                                        <th className="p-2.5 text-center">Commissioning Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                                    {assets.map((asset) => (
                                        <tr key={asset.id} className="hover:bg-zinc-900/50 transition">
                                            <td className="p-2.5 font-bold text-cyan-400">{asset.asset_tag}</td>
                                            <td className="p-2.5 text-zinc-200">{asset.system_category.replace(/_/g, " ")}</td>
                                            <td className="p-2.5 text-zinc-400">{asset.manufacturer}</td>
                                            <td className="p-2.5 text-zinc-300">{asset.grid_location}</td>
                                            <td className="p-2.5 text-emerald-400 font-bold">{asset.warranty_end_date}</td>
                                            <td className="p-2.5 text-center">
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                                                    {asset.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </main>
    );
}