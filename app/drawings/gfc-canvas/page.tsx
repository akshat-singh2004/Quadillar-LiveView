'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';
import {
    Compass,
    Layers,
    AlertTriangle,
    Plus,
    RefreshCw,
    CheckCircle2,
    Lock,
    FileCheck2,
    FileText,
    MapPin,
    Pencil,
    Crosshair,
    ExternalLink,
} from 'lucide-react';

interface GFCDrawing {
    id: string;
    project_id: string;
    drawing_number: string;
    sheet_title: string;
    discipline: string;
    revision_code: string;
    iso19650_status: 'S0_WORK_IN_PROGRESS' | 'S1_COORDINATION_REVIEW' | 'A1_APPROVED_FOR_CONSTRUCTION' | 'B1_SUPERSEDED_DO_NOT_CONSTRUCT' | 'AS_BUILT_FINAL';
    scale_ratio: string;
    file_url?: string;
    sha256_hash?: string;
    seor_signatory_hash?: string;
    is_active_gfc: boolean;
    issued_date: string;
}

interface DrawingRedline {
    id: string;
    drawing_id: string;
    pin_code: string;
    category: 'ARCHITECTURAL_CLASH' | 'SITE_DEVIATION' | 'AS_BUILT_CORRECTION' | 'RFI_QUERY';
    coord_x_pct: number;
    coord_y_pct: number;
    description: string;
    status: 'OPEN_UNDER_REVIEW' | 'RESOLVED_REVISED_DRAWING_ISSUED' | 'ACCEPTED_AS_BUILT';
    logged_by: string;
}

export default function GFCSpatialRedlinePage() {
    const { project } = useActiveRole();
    const activeProjectId = (project as any)?.project_id || (project as any)?.id || "GOMTI-NAGAR-PH1-FITOUT";

    const [drawings, setDrawings] = useState<GFCDrawing[]>([]);
    const [selectedDrawing, setSelectedDrawing] = useState<GFCDrawing | null>(null);
    const [redlines, setRedlines] = useState<DrawingRedline[]>([]);
    const [selectedRedline, setSelectedRedline] = useState<DrawingRedline | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // New Drawing Sheet Inputs
    const [drawingNum, setDrawingNum] = useState('');
    const [sheetTitle, setSheetTitle] = useState('');
    const [discipline, setDiscipline] = useState('ARCHITECTURAL');
    const [revisionCode, setRevisionCode] = useState('Rev-00');
    const [isoStatus, setIsoStatus] = useState<GFCDrawing['iso19650_status']>('A1_APPROVED_FOR_CONSTRUCTION');
    const [scaleRatio, setScaleRatio] = useState('1:100');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);

    // Redline Interactive Pinning State
    const [isPinModeActive, setIsPinModeActive] = useState(false);
    const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number } | null>(null);
    const [redlineCategory, setRedlineCategory] = useState<DrawingRedline['category']>('SITE_DEVIATION');
    const [redlineDesc, setRedlineDesc] = useState('');
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    const loadData = async () => {
        if (!activeProjectId) return;
        setLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('gfc_drawings')
                .select('*')
                .eq('project_id', activeProjectId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            const list = data || [];
            setDrawings(list);

            if (list.length > 0 && !selectedDrawing) {
                setSelectedDrawing(list[0]);
                loadRedlinesForDrawing(list[0].id);
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to load GFC Drawing register.');
        } finally {
            setLoading(false);
        }
    };

    const loadRedlinesForDrawing = async (drawingId: string) => {
        try {
            const { data, error } = await (supabase as any)
                .from('drawing_redlines')
                .select('*')
                .eq('drawing_id', drawingId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRedlines(data || []);
        } catch (err) {
            console.error('Failed to load drawing redlines:', err);
        }
    };

    useEffect(() => {
        void loadData();
    }, [activeProjectId]);

    const handleSelectDrawing = (dwg: GFCDrawing) => {
        setSelectedDrawing(dwg);
        setSelectedRedline(null);
        loadRedlinesForDrawing(dwg.id);
    };

    // Canvas Click Coordinate Capture
    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isPinModeActive || !canvasContainerRef.current) return;

        const rect = canvasContainerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setPendingCoords({
            x: parseFloat(x.toFixed(2)),
            y: parseFloat(y.toFixed(2)),
        });
    };

    const handleCreateDrawing = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!drawingNum.trim() || !sheetTitle.trim()) {
            setErrorMsg('Drawing Number and Sheet Title are strictly required.');
            return;
        }

        setSubmitting(true);
        setErrorMsg(null);

        const seorSig = `SEOR-GFC-${Date.now().toString(36).toUpperCase()}-ISO19650`;

        const payload = {
            project_id: activeProjectId,
            drawing_number: drawingNum.trim(),
            sheet_title: sheetTitle.trim(),
            discipline,
            revision_code: revisionCode.trim(),
            iso19650_status: isoStatus,
            scale_ratio: scaleRatio,
            issued_date: issueDate,
            is_active_gfc: isoStatus === 'A1_APPROVED_FOR_CONSTRUCTION',
            seor_signatory_hash: isoStatus === 'A1_APPROVED_FOR_CONSTRUCTION' ? seorSig : null,
        };

        try {
            const { data: newDwg, error } = await (supabase as any)
                .from('gfc_drawings')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;

            setDrawingNum('');
            setSheetTitle('');
            await loadData();
            if (newDwg) {
                setSelectedDrawing(newDwg);
                setRedlines([]);
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to sanction GFC Drawing.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateRedline = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDrawing || !pendingCoords || !redlineDesc.trim()) return;

        setSubmitting(true);
        setErrorMsg(null);

        const pinCode = `RED-${selectedDrawing.drawing_number.slice(0, 6)}-${(redlines.length + 1).toString().padStart(3, '0')}`;

        const payload = {
            drawing_id: selectedDrawing.id,
            pin_code: pinCode,
            category: redlineCategory,
            coord_x_pct: pendingCoords.x,
            coord_y_pct: pendingCoords.y,
            description: redlineDesc.trim(),
            status: 'OPEN_UNDER_REVIEW',
            logged_by: 'Site Project Engineer',
        };

        try {
            const { error } = await (supabase as any).from('drawing_redlines').insert([payload]);
            if (error) throw error;

            setPendingCoords(null);
            setRedlineDesc('');
            setIsPinModeActive(false);
            await loadRedlinesForDrawing(selectedDrawing.id);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to drop spatial redline pin.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResolveRedline = async (redlineId: string) => {
        try {
            const { error } = await (supabase as any)
                .from('drawing_redlines')
                .update({
                    status: 'ACCEPTED_AS_BUILT',
                    resolved_by: 'Er. Rajesh Srivastava (SEOR)',
                    resolved_at: new Date().toISOString(),
                })
                .eq('id', redlineId);

            if (error) throw error;
            if (selectedDrawing) await loadRedlinesForDrawing(selectedDrawing.id);
            setSelectedRedline(null);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to resolve redline variance.');
        }
    };

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
            <div className="max-w-[1700px] mx-auto space-y-6">

                {/* HEADER BAR */}
                <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center">
                            COMMON DATA ENVIRONMENT (CDE) • ISO 19650-2 / IS 962 GFC REVISION LEDGER
                            <StatutoryInfo
                                standardRef="ISO 19650-2 / IS 962"
                                title="GFC Sanctioning & CDE Suitability"
                                idealRange="Status: A1 Approved For Construction"
                                description="Executing structural work against preliminary sketches (S0) or superseded revisions (B1) is contractually prohibited. All physical setting out must reference active A1-stamped GFC drawings."
                            />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                            <Compass className="w-6 h-6 text-emerald-400" />
                            <span>GFC Interactive Floor Canvas &amp; Redline Ledger</span>
                        </h1>
                        <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                            Scope: <strong className="text-zinc-200">{project?.project_name || 'Active Contract'}</strong> • Real-time GFC drawing distribution, spatial deviation pins, and as-built markups.
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

                {/* 4 SUMMARY METRIC TILES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div className="bg-zinc-900/60 border border-zinc-800 p-4">
                        <span className="text-[10px] text-zinc-500 uppercase block">Sanctioned GFC Sheets</span>
                        <div className="text-2xl font-bold text-white mt-1">
                            {drawings.filter((d) => d.iso19650_status === 'A1_APPROVED_FOR_CONSTRUCTION').length} / {drawings.length} Sheets
                        </div>
                        <span className="text-[10px] text-zinc-500 mt-1 block">A1-Approved for construction</span>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 p-4">
                        <span className="text-[10px] text-zinc-500 uppercase block flex items-center">
                            Active Floor Redlines
                            <StatutoryInfo
                                standardRef="AS-BUILT TRACKING"
                                title="Spatial Variance Points"
                                idealRange="0 Unresolved Deviations"
                                description="Redline pins designate on-site variances requiring architect clarification (RFI) or structural confirmation before casting."
                            />
                        </span>
                        <div className={`text-2xl font-bold mt-1 ${redlines.some((r) => r.status === 'OPEN_UNDER_REVIEW') ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {redlines.filter((r) => r.status === 'OPEN_UNDER_REVIEW').length} Open Pins
                        </div>
                        <span className="text-[10px] text-zinc-500 mt-1 block">Mapped to structural canvas[cite: 1]</span>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 p-4">
                        <span className="text-[10px] text-zinc-500 uppercase block">Current Active Revision</span>
                        <div className="text-2xl font-bold text-cyan-400 mt-1">
                            {selectedDrawing ? selectedDrawing.revision_code : '--'}
                        </div>
                        <span className="text-[10px] text-zinc-500 mt-1 block">
                            {selectedDrawing ? selectedDrawing.drawing_number : 'No Sheet Selected'}
                        </span>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 p-4">
                        <span className="text-[10px] text-zinc-500 uppercase block">Statutory Drawing Standard</span>
                        <div className="text-2xl font-bold text-zinc-200 mt-1">IS 962 / ISO 19650</div>
                        <span className="text-[10px] text-zinc-500 mt-1 block">CDE Strict Suitability Locked</span>
                    </div>
                </div>

                {/* 2-COLUMN VIEWPORT: INTERACTIVE CANVAS (8 COLS) + SHEETS & PINS LEDGER (4 COLS) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">

                    {/* LEFT: BLUEPRINT VECTOR CANVAS (8 COLS) */}
                    <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                            <div>
                                <span className="text-white font-bold text-xs uppercase block">
                                    {selectedDrawing ? `${selectedDrawing.drawing_number} — ${selectedDrawing.sheet_title}` : 'Floor Canvas Viewport'}[cite: 1]
                                </span>
                                <span className="text-[10px] text-zinc-500">
                                    {selectedDrawing ? `Discipline: ${selectedDrawing.discipline} | Scale: ${selectedDrawing.scale_ratio} | ${selectedDrawing.revision_code}` : 'Select a drawing sheet to view architectural canvas'}
                                </span>
                            </div>

                            {selectedDrawing && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setIsPinModeActive(!isPinModeActive); setPendingCoords(null); }}
                                        className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition flex items-center gap-1.5 ${isPinModeActive
                                                ? 'bg-rose-500 text-white animate-pulse'
                                                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700'
                                            }`}
                                    >
                                        <Crosshair className="w-3.5 h-3.5" />
                                        <span>{isPinModeActive ? 'Click Blueprint to Drop Pin' : 'Drop Redline Pin'}</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Canvas Blueprint Container */}
                        <div
                            ref={canvasContainerRef}
                            onClick={handleCanvasClick}
                            className={`relative w-full h-[520px] bg-neutral-950 border rounded-lg overflow-hidden select-none transition ${isPinModeActive ? 'cursor-crosshair border-rose-500' : 'cursor-default border-zinc-800'
                                }`}
                        >
                            {/* Vector Architectural Floor Blueprint Grid[cite: 1] */}
                            <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <pattern id="gfcGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#27272a" strokeWidth="0.5" />
                                    </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#gfcGrid)" />
                                {/* Structural Outer Perimeter Wireframe */}
                                <rect x="40" y="40" width="88%" height="84%" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2" />
                                {/* Grid Axes Lines */}
                                <line x1="40" y1="180" x2="92%" y2="180" stroke="#52525b" strokeWidth="1" strokeDasharray="2 4" />
                                <line x1="40" y1="340" x2="92%" y2="340" stroke="#52525b" strokeWidth="1" strokeDasharray="2 4" />
                                <line x1="300" y1="40" x2="300" y2="88%" stroke="#52525b" strokeWidth="1" strokeDasharray="2 4" />
                                <line x1="600" y1="40" x2="600" y2="88%" stroke="#52525b" strokeWidth="1" strokeDasharray="2 4" />
                                {/* Core Shear Wall / Shaft[cite: 1] */}
                                <rect x="420" y="200" width="160" height="120" fill="#18181b" stroke="#06b6d4" strokeWidth="2" />
                                <text x="460" y="265" fill="#71717a" fontSize="12" fontFamily="monospace">CORE SHAFT</text>
                            </svg>

                            {/* Zero-Drawings State Overlay */}
                            {drawings.length === 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center space-y-2">
                                    <Compass className="w-10 h-10 text-neutral-600 animate-pulse" />
                                    <div className="font-bold text-neutral-300 uppercase">No GFC Drawings Sanctioned</div>
                                    <p className="text-xs text-neutral-500 max-w-sm">
                                        The drawing canvas is currently empty[cite: 1]. Upload and sanction an active A1 sheet using the form to establish structural setting out.
                                    </p>
                                </div>
                            )}

                            {/* Spatial Redline Marker Pins on Blueprint Canvas */}
                            {redlines.map((pin) => {
                                const isSelected = selectedRedline?.id === pin.id;
                                const isResolved = pin.status === 'ACCEPTED_AS_BUILT';

                                return (
                                    <button
                                        key={pin.id}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setSelectedRedline(pin); }}
                                        style={{ left: `${pin.coord_x_pct}%`, top: `${pin.coord_y_pct}%` }}
                                        className={`absolute -translate-x-1/2 -translate-y-1/2 h-7 w-7 rounded-full border-2 flex items-center justify-center font-bold text-[9px] transition-transform ${isSelected
                                                ? 'bg-amber-400 text-black border-white scale-125 z-30 shadow-lg shadow-amber-400/50'
                                                : isResolved
                                                    ? 'bg-emerald-950 text-emerald-400 border-emerald-500 z-10'
                                                    : 'bg-rose-950 text-rose-400 border-rose-500 animate-bounce z-20'
                                            }`}
                                        title={pin.description}
                                    >
                                        PIN
                                    </button>
                                );
                            })}

                            {/* Pending Dropped Coordinate Indicator */}
                            {pendingCoords && (
                                <div
                                    style={{ left: `${pendingCoords.x}%`, top: `${pendingCoords.y}%` }}
                                    className="absolute -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full border-2 border-white bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xl animate-pulse z-40"
                                >
                                    +
                                </div>
                            )}
                        </div>

                        {/* Selected Pin Details Popover */}
                        {selectedRedline && (
                            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-amber-400">{selectedRedline.pin_code}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-neutral-900 border border-neutral-700 text-neutral-300">
                                            {selectedRedline.category.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-200 font-sans">{selectedRedline.description}</p>
                                    <span className="text-[10px] text-zinc-500 font-mono block">
                                        Location: ({selectedRedline.coord_x_pct}%, {selectedRedline.coord_y_pct}%) • Logged by: {selectedRedline.logged_by}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {selectedRedline.status !== 'ACCEPTED_AS_BUILT' ? (
                                        <button
                                            type="button"
                                            onClick={() => handleResolveRedline(selectedRedline.id)}
                                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-[10px] rounded transition"
                                        >
                                            Sign Off As-Built
                                        </button>
                                    ) : (
                                        <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>RESOLVED AS-BUILT</span>
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRedline(null)}
                                        className="p-1.5 text-zinc-500 hover:text-white"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: SHEETS DIRECTORY & COMPOSER (4 COLS) */}
                    <div className="lg:col-span-4 space-y-4">

                        {/* PENDING REDLINE PIN FORM (IF USER DROPPED PIN ON CANVAS) */}
                        {pendingCoords && (
                            <div className="bg-zinc-900/60 border border-rose-500/60 p-4 rounded-lg space-y-3">
                                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                    <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-rose-400" />
                                        <span>Drop Spatial Redline Pin</span>
                                    </span>
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                        ({pendingCoords.x}%, {pendingCoords.y}%)
                                    </span>
                                </div>

                                <form onSubmit={handleCreateRedline} className="space-y-3">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase block mb-1">Variance Category</label>
                                        <select
                                            value={redlineCategory}
                                            onChange={(e) => setRedlineCategory(e.target.value as any)}
                                            className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-xs text-white"
                                        >
                                            <option value="SITE_DEVIATION">Site Setting-Out Deviation</option>
                                            <option value="ARCHITECTURAL_CLASH">MEP / Structural Clash</option>
                                            <option value="RFI_QUERY">Architectural Clarification (RFI)</option>
                                            <option value="AS_BUILT_CORRECTION">As-Built Field Markup</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase block mb-1">Observation Details *</label>
                                        <textarea
                                            rows={2}
                                            required
                                            placeholder="e.g. Shear wall edge shifted 50mm north due to pile offset..."
                                            value={redlineDesc}
                                            onChange={(e) => setRedlineDesc(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 p-2 text-xs text-white font-sans"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setPendingCoords(null)}
                                            className="px-3 py-1 bg-zinc-900 text-zinc-400 text-xs rounded"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="px-3 py-1 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs uppercase rounded"
                                        >
                                            Pin to Canvas
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* SANCTION NEW GFC DRAWING SHEET */}
                        <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-lg space-y-3">
                            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                                    <Plus className="w-4 h-4 text-emerald-400" />
                                    <span>Sanction GFC Drawing</span>
                                </span>
                                <span className="text-[10px] text-zinc-500 uppercase">ISO 19650</span>
                            </div>

                            <form onSubmit={handleCreateDrawing} className="space-y-2.5">
                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase block mb-0.5">Drawing Sheet Number *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. ARC-L02-GA-101"
                                        value={drawingNum}
                                        onChange={(e) => setDrawingNum(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-xs text-white"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase block mb-0.5">Sheet Title *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Level 2 Floor General Arrangement"
                                        value={sheetTitle}
                                        onChange={(e) => setSheetTitle(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-xs text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase block mb-0.5">Discipline</label>
                                        <select
                                            value={discipline}
                                            onChange={(e) => setDiscipline(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1 text-xs text-white"
                                        >
                                            <option value="ARCHITECTURAL">Architectural</option>
                                            <option value="STRUCTURAL">Structural</option>
                                            <option value="MEP_PLUMBING">MEP Plumbing</option>
                                            <option value="MEP_ELECTRICAL">MEP Electrical</option>
                                            <option value="FIRE_FIGHTING">Fire Fighting</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase block mb-0.5">Revision</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Rev-01"
                                            value={revisionCode}
                                            onChange={(e) => setRevisionCode(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1 text-xs text-cyan-400 font-bold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase block mb-0.5">ISO 19650 CDE Suitability</label>
                                    <select
                                        value={isoStatus}
                                        onChange={(e) => setIsoStatus(e.target.value as any)}
                                        className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1 text-xs text-emerald-400 font-bold"
                                    >
                                        <option value="A1_APPROVED_FOR_CONSTRUCTION">A1 - Approved for Construction (GFC)</option>
                                        <option value="S1_COORDINATION_REVIEW">S1 - Coordination Review Only</option>
                                        <option value="S0_WORK_IN_PROGRESS">S0 - Preliminary WIP</option>
                                        <option value="B1_SUPERSEDED_DO_NOT_CONSTRUCT">B1 - Superseded (Do Not Build)</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase text-xs rounded transition mt-1"
                                >
                                    Sanction GFC Sheet
                                </button>
                            </form>
                        </div>

                        {/* DRAWING SHEETS DIRECTORY LIST */}
                        <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-lg space-y-3">
                            <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
                                Sanctioned Sheets ({drawings.length})
                            </span>

                            <div className="space-y-2 max-h-[220px] overflow-y-auto">
                                {drawings.length === 0 ? (
                                    <div className="text-center py-6 text-zinc-600">Zero drawings sanctioned.</div>
                                ) : (
                                    drawings.map((d) => {
                                        const isSelected = selectedDrawing?.id === d.id;
                                        const isApproved = d.iso19650_status === 'A1_APPROVED_FOR_CONSTRUCTION';

                                        return (
                                            <div
                                                key={d.id}
                                                onClick={() => handleSelectDrawing(d)}
                                                className={`p-2.5 rounded border cursor-pointer transition space-y-1 ${isSelected
                                                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                                                        : 'bg-zinc-950 border-zinc-850 hover:border-zinc-700 text-zinc-300'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-center font-bold">
                                                    <span>{d.drawing_number}</span>
                                                    <span className="text-[10px] text-cyan-400">{d.revision_code}</span>
                                                </div>
                                                <div className="text-xs truncate">{d.sheet_title}</div>
                                                <div className="flex justify-between items-center text-[9px] pt-1 border-t border-zinc-850">
                                                    <span className={isApproved ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                                                        {d.iso19650_status.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className="text-zinc-500">{d.discipline}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                    </div>

                </div>

            </div>
        </main>
    );
}