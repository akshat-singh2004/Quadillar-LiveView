'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { ImageUploader } from '@/app/components/ImageUploader';
import { ValidatedEvidencePayload } from '@/lib/security/exifGeofenceValidator';
import {
    Layers,
    ShieldCheck,
    ShieldAlert,
    AlertTriangle,
    Lock,
    CheckCircle2,
    Plus,
    RefreshCw,
    Box,
    Palette,
    FileCheck2,
    Gauge,
    Sliders,
    Sparkles,
} from 'lucide-react';

interface FitoutGateRecord {
    id: string;
    project_id: string;
    room_unit_number: string;
    zone_type: 'FALSE_CEILING_PLENUM' | 'DRYWALL_PARTITION' | 'WET_AREA_WATERPROOFING' | 'JOINERY_MILLWORK';
    framing_plumb_verified: boolean;
    mep_pressure_test_passed: boolean;
    acoustic_infill_verified: boolean;
    joint_taping_cured: boolean;
    dft_paint_microns: number;
    woodwork_moisture_pct: number;
    ceiling_closure_authorized: boolean;
    seor_inspector_name?: string;
    seor_signature_hash?: string;
    evidence_sha256?: string;
    status: 'HOLD_PENDING_MEP' | 'HOLD_FRAMING_DEFECT' | 'READY_FOR_CLOSURE' | 'AUTHORIZED_CLOSED';
    created_at: string;
}

interface SoftFurnishingRecord {
    id: string;
    project_id: string;
    room_unit_number: string;
    category: 'CURTAINS_DRAPERY' | 'WALL_COVERINGS' | 'VENEERS_LAMINATES' | 'MATTRESSES_UPHOLSTERY' | 'BESPOKE_MILLWORK';
    item_description: string;
    batch_lot_number: string;
    supplier_name: string;
    quantity_units: number;
    unit_label: string;
    fire_retardancy_certified: boolean;
    shade_lot_variation_cleared: boolean;
    qc_verdict: 'RECEIVED_PENDING_QC' | 'QC_PASSED' | 'REJECTED_SHADE_MISMATCH' | 'INSTALLED_ACCEPTED';
    created_at: string;
}

export default function FitoutFinishesMatrixPage() {
    const { project } = useActiveRole();
    const activeProjectId = project?.project_id || project?.id || "GOMTI-NAGAR-PH1-FITOUT";

    const [activeTab, setActiveTab] = useState<'CEILING_HOLDGATES' | 'SOFT_FURNISHINGS'>('CEILING_HOLDGATES');
    const [gates, setGates] = useState<FitoutGateRecord[]>([]);
    const [furnishings, setFurnishings] = useState<SoftFurnishingRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Gate Form
    const [roomNumber, setRoomNumber] = useState('');
    const [zoneType, setZoneType] = useState<FitoutGateRecord['zone_type']>('FALSE_CEILING_PLENUM');
    const [framingPlumb, setFramingPlumb] = useState(false);
    const [mepPressure, setMepPressure] = useState(false);
    const [acousticInfill, setAcousticInfill] = useState(false);
    const [jointTaping, setJointTaping] = useState(false);
    const [dftMicrons, setDftMicrons] = useState('95');
    const [woodMoisture, setWoodMoisture] = useState('8.5');
    const [evidencePayload, setEvidencePayload] = useState<ValidatedEvidencePayload | null>(null);

    // Furnishings Form
    const [furnishRoom, setFurnishRoom] = useState('');
    const [furnishCat, setFurnishCat] = useState<SoftFurnishingRecord['category']>('CURTAINS_DRAPERY');
    const [furnishDesc, setFurnishDesc] = useState('');
    const [batchLot, setBatchLot] = useState('');
    const [supplier, setSupplier] = useState('');
    const [furnishQty, setFurnishQty] = useState('1');
    const [unitLabel, setUnitLabel] = useState('Rmt');
    const [fireRetardant, setFireRetardant] = useState(false);
    const [shadeCleared, setShadeCleared] = useState(false);

    const loadData = async () => {
        if (!activeProjectId) return;
        setLoading(true);
        try {
            const [gatesRes, furnishRes] = await Promise.all([
                (supabase as any)
                    .from('fitout_clearance_gates')
                    .select('*')
                    .eq('project_id', activeProjectId)
                    .order('created_at', { ascending: false }),
                (supabase as any)
                    .from('soft_furnishings_registry')
                    .select('*')
                    .eq('project_id', activeProjectId)
                    .order('created_at', { ascending: false }),
            ]);

            if (gatesRes.error) throw gatesRes.error;
            if (furnishRes.error) throw furnishRes.error;

            setGates(gatesRes.data || []);
            setFurnishings(furnishRes.data || []);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to load fitout matrices.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    }, [activeProjectId]);

    const allPrerequisitesMet = framingPlumb && mepPressure && acousticInfill && jointTaping;
    const moistureCompliant = parseFloat(woodMoisture) <= 12.0;
    const dftCompliant = parseFloat(dftMicrons) >= 80 && parseFloat(dftMicrons) <= 110;

    const handleCreateGate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomNumber.trim()) {
            setErrorMsg('Room/Unit identifier is required.');
            return;
        }

        setSubmitting(true);
        setErrorMsg(null);

        const readyForClosure = allPrerequisitesMet && moistureCompliant;
        const status = readyForClosure ? 'READY_FOR_CLOSURE' : 'HOLD_PENDING_MEP';

        const payload = {
            project_id: activeProjectId,
            room_unit_number: roomNumber.trim(),
            zone_type: zoneType,
            framing_plumb_verified: framingPlumb,
            mep_pressure_test_passed: mepPressure,
            acoustic_infill_verified: acousticInfill,
            joint_taping_cured: jointTaping,
            dft_paint_microns: parseFloat(dftMicrons) || 0,
            woodwork_moisture_pct: parseFloat(woodMoisture) || 0,
            ceiling_closure_authorized: false,
            evidence_sha256: evidencePayload?.sha256Hash || null,
            status,
        };

        try {
            const { error } = await (supabase as any).from('fitout_clearance_gates').insert([payload]);
            if (error) throw error;

            setRoomNumber('');
            setFramingPlumb(false);
            setMepPressure(false);
            setAcousticInfill(false);
            setJointTaping(false);
            setEvidencePayload(null);
            await loadData();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to register fitout hold-gate.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAuthorizeClosure = async (gateId: string) => {
        try {
            const sigHash = `FITOUT-SIGN-${Date.now().toString(36).toUpperCase()}-NBC`;
            const { error } = await (supabase as any)
                .from('fitout_clearance_gates')
                .update({
                    ceiling_closure_authorized: true,
                    status: 'AUTHORIZED_CLOSED',
                    seor_signature_hash: sigHash,
                    seor_inspector_name: 'Lead MEP & Fitout Consultant',
                    cleared_at: new Date().toISOString(),
                })
                .eq('id', gateId);

            if (error) throw error;
            await loadData();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to authorize ceiling closure.');
        }
    };

    const handleCreateFurnishing = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!furnishRoom.trim() || !batchLot.trim() || !furnishDesc.trim()) {
            setErrorMsg('Room, description, and batch/lot number are required.');
            return;
        }

        setSubmitting(true);
        setErrorMsg(null);

        const qcVerdict = shadeCleared && fireRetardant ? 'QC_PASSED' : 'RECEIVED_PENDING_QC';

        const payload = {
            project_id: activeProjectId,
            room_unit_number: furnishRoom.trim(),
            category: furnishCat,
            item_description: furnishDesc.trim(),
            batch_lot_number: batchLot.trim(),
            supplier_name: supplier.trim() || 'Specified Millwork Vendor',
            quantity_units: parseFloat(furnishQty) || 1,
            unit_label: unitLabel,
            fire_retardancy_certified: fireRetardant,
            shade_lot_variation_cleared: shadeCleared,
            qc_verdict: qcVerdict,
        };

        try {
            const { error } = await (supabase as any).from('soft_furnishings_registry').insert([payload]);
            if (error) throw error;

            setFurnishRoom('');
            setFurnishDesc('');
            setBatchLot('');
            setSupplier('');
            setFireRetardant(false);
            setShadeCleared(false);
            await loadData();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to register soft furnishings batch.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
            <div className="max-w-[1650px] mx-auto space-y-6">

                {/* HEADER BAR */}
                <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                            TURNKEY ARCHITECTURAL FINISHES • NBC PART 9 / ASTM C754 PLENUM CLEARANCES
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                            <Layers className="w-6 h-6 text-emerald-400" />
                            <span>Interior Fitout Hold-Gates &amp; Soft Furnishings Registry</span>
                        </h1>
                        <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                            Scope: <strong className="text-zinc-200">{project?.project_name || 'Active Contract'}</strong> • False ceilings cannot be closed until hydrostatic pressure tests and acoustic densities clear.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => void loadData()}
                            className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                {errorMsg && (
                    <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* 4 PRIMARY FITOUT TELEMETRY TILES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div className="bg-zinc-900/60 border border-zinc-800 p-4">
                        <span className="text-[10px] text-zinc-500 uppercase block">Active Ceiling Clearances</span>
                        <div className="text-2xl font-bold text-white mt-1">
                            {gates.filter((g) => g.status === 'AUTHORIZED_CLOSED').length} / {gates.length} Units
                        </div>
                        <span className="text-[10px] text-zinc-500 mt-1 block">
                            {gates.length === 0 ? '0 gates logged (Standby)' : 'Enforced Plenum Closures'}
                        </span>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 p-4">
                        <span className="text-[10px] text-zinc-500 uppercase block">MEP Pressure Holds (10 kg/cm²)</span>
                        <div className={`text-2xl font-bold mt-1 ${gates.some((g) => !g.mep_pressure_test_passed) ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {gates.filter((g) => g.mep_pressure_test_passed).length} Passed
                        </div>
                        <span className="text-[10px] text-zinc-500 mt-1 block">24h Hydrostatic Hold Gate</span>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 p-4">
                        <span className="text-[10px] text-zinc-500 uppercase block">Woodwork Moisture Ceiling</span>
                        <div className="text-2xl font-bold text-white mt-1">&lt; 12.0% W/W</div>
                        <span className="text-[10px] text-zinc-500 mt-1 block">Prevents warping &amp; dry rot</span>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 p-4">
                        <span className="text-[10px] text-zinc-500 uppercase block">Finishes &amp; Soft Furnishings</span>
                        <div className="text-2xl font-bold text-cyan-400 mt-1">{furnishings.length} Batch Lots</div>
                        <span className="text-[10px] text-zinc-500 mt-1 block">Dye lot &amp; fire-retardancy checks</span>
                    </div>
                </div>

                {/* NAVIGATION TABS */}
                <div className="flex border-b border-zinc-800 gap-2 text-xs">
                    <button
                        onClick={() => setActiveTab('CEILING_HOLDGATES')}
                        className={`pb-2.5 px-4 font-bold border-b-2 transition ${activeTab === 'CEILING_HOLDGATES'
                                ? 'border-emerald-400 text-emerald-400'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                            }`}
                    >
                        FALSE CEILING PLENUM &amp; DRYWALL HOLD-GATES
                    </button>
                    <button
                        onClick={() => setActiveTab('SOFT_FURNISHINGS')}
                        className={`pb-2.5 px-4 font-bold border-b-2 transition ${activeTab === 'SOFT_FURNISHINGS'
                                ? 'border-cyan-400 text-cyan-400'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                            }`}
                    >
                        FABRIC DYE LOTS, VENEERS &amp; SOFT FURNISHINGS
                    </button>
                </div>

                {/* TAB 1: FALSE CEILING PLENUM & DRYWALL GATES */}
                {activeTab === 'CEILING_HOLDGATES' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
                        {/* REGISTER LIST (8 COLS) */}
                        <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
                            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                <span className="font-bold text-white uppercase text-xs">
                                    Active Fitout Hold-Gate Register ({gates.length})
                                </span>
                                <span className="text-zinc-500 text-[10px]">NBC Part 9 Inspection Gates</span>
                            </div>

                            {gates.length === 0 ? (
                                <div className="p-8 text-center text-zinc-600 border border-zinc-850">
                                    Zero room fitout hold-gates registered. Complete the form to establish false ceiling clearances.
                                </div>
                            ) : (
                                <div className="overflow-x-auto border border-zinc-800">
                                    <table className="w-full text-left">
                                        <thead className="bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                                            <tr>
                                                <th className="p-2.5">Room / Spatial Unit</th>
                                                <th className="p-2.5">Clearance Type</th>
                                                <th className="p-2.5 text-center">MEP Test</th>
                                                <th className="p-2.5 text-center">Framing</th>
                                                <th className="p-2.5 text-center">Moisture</th>
                                                <th className="p-2.5 text-center">Status</th>
                                                <th className="p-2.5 text-center">Closure Sign-Off</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                                            {gates.map((g) => {
                                                const isClosed = g.status === 'AUTHORIZED_CLOSED';
                                                const isReady = g.status === 'READY_FOR_CLOSURE';

                                                return (
                                                    <tr key={g.id} className="hover:bg-zinc-900/50 transition">
                                                        <td className="p-2.5 text-white font-bold">{g.room_unit_number}</td>
                                                        <td className="p-2.5 text-zinc-400">{g.zone_type.replace(/_/g, ' ')}</td>
                                                        <td className="p-2.5 text-center">
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${g.mep_pressure_test_passed ? 'text-emerald-400 bg-emerald-950' : 'text-rose-400 bg-rose-950'}`}>
                                                                {g.mep_pressure_test_passed ? '10 kg/cm² OK' : 'PENDING'}
                                                            </span>
                                                        </td>
                                                        <td className="p-2.5 text-center">
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${g.framing_plumb_verified ? 'text-emerald-400 bg-emerald-950' : 'text-amber-400 bg-amber-950'}`}>
                                                                {g.framing_plumb_verified ? 'PLUMB OK' : 'HOLD'}
                                                            </span>
                                                        </td>
                                                        <td className="p-2.5 text-center text-zinc-300">
                                                            {g.woodwork_moisture_pct}%
                                                        </td>
                                                        <td className="p-2.5 text-center">
                                                            <span
                                                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${isClosed
                                                                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                                                        : isReady
                                                                            ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                                                                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                                                                    }`}
                                                            >
                                                                {g.status.replace(/_/g, ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="p-2.5 text-center">
                                                            {!isClosed ? (
                                                                <button
                                                                    type="button"
                                                                    disabled={!isReady}
                                                                    onClick={() => handleAuthorizeClosure(g.id)}
                                                                    className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase transition ${isReady
                                                                            ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 cursor-pointer'
                                                                            : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                                                                        }`}
                                                                >
                                                                    {isReady ? 'Authorize Close' : 'Locked'}
                                                                </button>
                                                            ) : (
                                                                <div className="text-[10px] text-emerald-400 flex items-center justify-center gap-1">
                                                                    <Lock className="w-3 h-3" />
                                                                    <span>Closed &amp; Sealed</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* COMPOSER FORM (4 COLS) */}
                        <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
                            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                                    <Plus className="w-4 h-4 text-emerald-400" />
                                    <span>Issue Fitout Hold-Gate</span>
                                </span>
                                <span className="text-[10px] text-zinc-500 uppercase">Pre-Boarding Audit</span>
                            </div>

                            <form onSubmit={handleCreateGate} className="space-y-3">
                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase block mb-1">Room / Unit Location *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Unit 304 - Master Suite / Living Area"
                                        value={roomNumber}
                                        onChange={(e) => setRoomNumber(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase block mb-1">Zone Category</label>
                                    <select
                                        value={zoneType}
                                        onChange={(e) => setZoneType(e.target.value as any)}
                                        className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                    >
                                        <option value="FALSE_CEILING_PLENUM">False Ceiling Plenum (Pre-Closure)</option>
                                        <option value="DRYWALL_PARTITION">Gypsum Stud Partition Framing</option>
                                        <option value="WET_AREA_WATERPROOFING">Toilet / Balcony Waterproofing Ponding</option>
                                        <option value="JOINERY_MILLWORK">Bespoke Millwork &amp; Paneling Sub-Base</option>
                                    </select>
                                </div>

                                {/* 4 MANDATORY INSPECTION CHECKS */}
                                <div className="p-3 bg-zinc-950 border border-zinc-850 space-y-2">
                                    <div className="text-[10px] text-zinc-400 uppercase font-bold">
                                        Pre-Closure Prerequisites (Mandatory Hold)
                                    </div>

                                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                                        <input
                                            type="checkbox"
                                            checked={mepPressure}
                                            onChange={(e) => setMepPressure(e.target.checked)}
                                            className="accent-emerald-500"
                                        />
                                        <span className={mepPressure ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                                            MEP Pressure Test (10 kg/cm² for 24h)
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                                        <input
                                            type="checkbox"
                                            checked={framingPlumb}
                                            onChange={(e) => setFramingPlumb(e.target.checked)}
                                            className="accent-emerald-500"
                                        />
                                        <span className={framingPlumb ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                                            Stud Plumb Line Verified (ASTM C754 &le; 2mm)
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                                        <input
                                            type="checkbox"
                                            checked={acousticInfill}
                                            onChange={(e) => setAcousticInfill(e.target.checked)}
                                            className="accent-emerald-500"
                                        />
                                        <span className={acousticInfill ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                                            Acoustic Rockwool Density (48 kg/m³)
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                                        <input
                                            type="checkbox"
                                            checked={jointTaping}
                                            onChange={(e) => setJointTaping(e.target.checked)}
                                            className="accent-emerald-500"
                                        />
                                        <span className={jointTaping ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                                            Staggered Gypsum Joint Tape &amp; Compound
                                        </span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase block mb-1">Paint DFT (µm)</label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={dftMicrons}
                                            onChange={(e) => setDftMicrons(e.target.value)}
                                            className={`w-full bg-zinc-950 border px-2.5 py-1.5 text-xs font-bold ${dftCompliant ? 'border-zinc-800 text-emerald-400' : 'border-rose-500 text-rose-400'
                                                }`}
                                        />
                                        <span className="text-[9px] text-zinc-600 block mt-0.5">Norm: 80 - 110 µm</span>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase block mb-1">Wood Moisture (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={woodMoisture}
                                            onChange={(e) => setWoodMoisture(e.target.value)}
                                            className={`w-full bg-zinc-950 border px-2.5 py-1.5 text-xs font-bold ${moistureCompliant ? 'border-zinc-800 text-emerald-400' : 'border-rose-500 text-rose-400'
                                                }`}
                                        />
                                        <span className="text-[9px] text-zinc-600 block mt-0.5">Norm: &le; 12.0%</span>
                                    </div>
                                </div>

                                {/* Evidence Ingestion */}
                                <div className="pt-1">
                                    <ImageUploader
                                        entityType="POUR_CARD"
                                        entityId={activeProjectId}
                                        onEvidenceValidated={(p: any) => setEvidencePayload(p)}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase text-xs flex items-center justify-center gap-1.5 transition"
                                >
                                    <span>{submitting ? 'Registering...' : 'Register Fitout Gate'}</span>
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* TAB 2: SOFT FURNISHINGS, FABRICS & MILLWORK BATCH LOTS */}
                {activeTab === 'SOFT_FURNISHINGS' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
                        {/* INVENTORY TABLE (8 COLS) */}
                        <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
                            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                <span className="font-bold text-white uppercase text-xs">
                                    Batch &amp; Lot Registry ({furnishings.length})
                                </span>
                                <span className="text-zinc-500 text-[10px]">Dye Lot &amp; Fire Rating Controls</span>
                            </div>

                            {furnishings.length === 0 ? (
                                <div className="p-8 text-center text-zinc-600 border border-zinc-850">
                                    Zero soft furnishings or bespoke millwork lots logged. Record batches to eliminate shade variations.
                                </div>
                            ) : (
                                <div className="overflow-x-auto border border-zinc-800">
                                    <table className="w-full text-left">
                                        <thead className="bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                                            <tr>
                                                <th className="p-2.5">Unit / Room</th>
                                                <th className="p-2.5">Category</th>
                                                <th className="p-2.5">Item Description</th>
                                                <th className="p-2.5">Batch / Lot #</th>
                                                <th className="p-2.5 text-right">Quantity</th>
                                                <th className="p-2.5 text-center">Fire Rating</th>
                                                <th className="p-2.5 text-center">QC Verdict</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                                            {furnishings.map((f) => (
                                                <tr key={f.id} className="hover:bg-zinc-900/50 transition">
                                                    <td className="p-2.5 text-white font-bold">{f.room_unit_number}</td>
                                                    <td className="p-2.5 text-zinc-400">{f.category.replace(/_/g, ' ')}</td>
                                                    <td className="p-2.5 text-zinc-200">{f.item_description}</td>
                                                    <td className="p-2.5 text-cyan-400 font-bold">{f.batch_lot_number}</td>
                                                    <td className="p-2.5 text-right text-zinc-100">
                                                        {f.quantity_units} {f.unit_label}
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${f.fire_retardancy_certified ? 'text-emerald-400 bg-emerald-950' : 'text-amber-400 bg-amber-950'}`}>
                                                            {f.fire_retardancy_certified ? 'FR CERTIFIED' : 'PENDING LAB'}
                                                        </span>
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                        <span
                                                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${f.qc_verdict === 'QC_PASSED' || f.qc_verdict === 'INSTALLED_ACCEPTED'
                                                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                                                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                                                                }`}
                                                        >
                                                            {f.qc_verdict.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* FURNISHING COMPOSER (4 COLS) */}
                        <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
                            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                                    <Palette className="w-4 h-4 text-cyan-400" />
                                    <span>Log Soft Furnishing Batch</span>
                                </span>
                                <span className="text-[10px] text-zinc-500 uppercase">Shade &amp; Lot Control</span>
                            </div>

                            <form onSubmit={handleCreateFurnishing} className="space-y-3">
                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase block mb-1">Target Room / Suite *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Presidential Suite 501"
                                        value={furnishRoom}
                                        onChange={(e) => setFurnishRoom(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase block mb-1">Finish Classification</label>
                                    <select
                                        value={furnishCat}
                                        onChange={(e) => setFurnishCat(e.target.value as any)}
                                        className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white"
                                    >
                                        <option value="CURTAINS_DRAPERY">Motorized Curtains &amp; Drapery Fabrics</option>
                                        <option value="WALL_COVERINGS">Acoustic Wall Coverings &amp; Wallpaper</option>
                                        <option value="VENEERS_LAMINATES">Natural Wood Veneers &amp; Fluted Panels</option>
                                        <option value="MATTRESSES_UPHOLSTERY">Bespoke Mattresses &amp; Headboard Upholstery</option>
                                        <option value="BESPOKE_MILLWORK">Factory-Finished Wardrobes &amp; Vanities</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase block mb-1">Description / Spec Ref *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 100% Blackout Velvet Fabric - Shade #Charcoal-04"
                                        value={furnishDesc}
                                        onChange={(e) => setFurnishDesc(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase block mb-1">Batch / Dye Lot # *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. LOT-2026-F98"
                                            value={batchLot}
                                            onChange={(e) => setBatchLot(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-cyan-400 font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase block mb-1">Supplier / Mill</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. D'Decor Export Mill"
                                            value={supplier}
                                            onChange={(e) => setSupplier(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase block mb-1">Quantity</label>
                                        <input
                                            type="number"
                                            step="any"
                                            required
                                            value={furnishQty}
                                            onChange={(e) => setFurnishQty(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase block mb-1">Unit</label>
                                        <select
                                            value={unitLabel}
                                            onChange={(e) => setUnitLabel(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white"
                                        >
                                            <option value="Rmt">Running Metres (Rmt)</option>
                                            <option value="Sqm">Square Metres (Sqm)</option>
                                            <option value="Sets">Complete Sets</option>
                                            <option value="Nos">Units (Nos)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="p-3 bg-zinc-950 border border-zinc-850 space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                                        <input
                                            type="checkbox"
                                            checked={fireRetardant}
                                            onChange={(e) => setFireRetardant(e.target.checked)}
                                            className="accent-cyan-500"
                                        />
                                        <span className={fireRetardant ? 'text-cyan-400 font-bold' : 'text-zinc-400'}>
                                            Fire-Retardancy (FR) Test Certified
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                                        <input
                                            type="checkbox"
                                            checked={shadeCleared}
                                            onChange={(e) => setShadeCleared(e.target.checked)}
                                            className="accent-cyan-500"
                                        />
                                        <span className={shadeCleared ? 'text-cyan-400 font-bold' : 'text-zinc-400'}>
                                            Shade Variation &plusmn; 0% Against Master Sample
                                        </span>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase text-xs flex items-center justify-center gap-1.5 transition"
                                >
                                    <span>{submitting ? 'Registering...' : 'Register Batch Lot'}</span>
                                </button>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}