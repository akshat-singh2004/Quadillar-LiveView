'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import PanoramaViewer360, { PanoramaPin } from '@/components/site/PanoramaViewer360';
import {
    Compass,
    AlertTriangle,
    Plus,
    Camera,
} from 'lucide-react';

interface PanoramaNode {
    id: string;
    node_code: string;
    title: string;
    spatial_grid: string;
    plan_coord_x: number;
    plan_coord_y: number;
    capture_date: string;
    photo_360_url: string;
    bim_render_360_url?: string | null;
    initial_yaw_degrees: number;
    initial_pitch_degrees: number;
    sha256_hash: string;
}

export default function Site360TourPage() {
    const { project } = useActiveRole();
    const activeProjectId = project?.project_id || project?.id || "GOMTI-NAGAR-PH1-FITOUT";

    const [nodes, setNodes] = useState<PanoramaNode[]>([]);
    const [selectedNode, setSelectedNode] = useState<PanoramaNode | null>(null);
    const [pins, setPins] = useState<PanoramaPin[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [pendingPinCoords, setPendingPinCoords] = useState<{ yaw: number; pitch: number } | null>(null);
    const [newPinTitle, setNewPinTitle] = useState('');
    const [newPinDesc, setNewPinDesc] = useState('');
    const [newPinType, setNewPinType] = useState<PanoramaPin['pin_type']>('NCR_DEFECT');

    const loadPanoramas = async () => {
        if (!activeProjectId) return;
        try {
            const { data, error } = await (supabase as any)
                .from('site_360_panoramas')
                .select('*')
                .eq('project_id', activeProjectId)
                .order('capture_date', { ascending: false });

            if (error) throw error;

            const panoList = data || [];
            setNodes(panoList);

            if (panoList.length > 0 && !selectedNode) {
                setSelectedNode(panoList[0]);
                loadPinsForPanorama(panoList[0].id);
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to load 360 site tour nodes.');
        }
    };

    const loadPinsForPanorama = async (panoramaId: string) => {
        try {
            const { data, error } = await (supabase as any)
                .from('panorama_spatial_pins')
                .select('*')
                .eq('panorama_id', panoramaId);

            if (error) throw error;
            setPins(data || []);
        } catch (err) {
            console.error('Failed to load in-sphere pins:', err);
        }
    };

    useEffect(() => {
        void loadPanoramas();
    }, [activeProjectId]);

    const handleSelectNode = (node: PanoramaNode) => {
        setSelectedNode(node);
        loadPinsForPanorama(node.id);
    };

    const handleSphereClickAddPin = (yaw: number, pitch: number) => {
        setPendingPinCoords({ yaw, pitch });
        setIsPinModalOpen(true);
    };

    const handleCreatePin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedNode || !pendingPinCoords || !newPinTitle.trim()) return;

        try {
            const payload = {
                panorama_id: selectedNode.id,
                pin_type: newPinType,
                title: newPinTitle.trim(),
                description: newPinDesc.trim(),
                sphere_yaw: pendingPinCoords.yaw,
                sphere_pitch: pendingPinCoords.pitch,
                status: 'OPEN',
                created_by: 'Resident Engineer',
            };

            const { data, error } = await (supabase as any)
                .from('panorama_spatial_pins')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;

            setPins([...pins, data]);
            setIsPinModalOpen(false);
            setNewPinTitle('');
            setNewPinDesc('');
            setPendingPinCoords(null);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to pin defect in 360 space.');
        }
    };

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
            <div className="max-w-[1700px] mx-auto space-y-6">
                <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                            REALITY CAPTURE TELEMETRY • 360° EQUIRECTANGULAR SPATIAL TOUR
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                            <Camera className="w-6 h-6 text-emerald-400" />
                            <span>360° Virtual Site Inspection &amp; Walkthrough Hub</span>
                        </h1>
                        <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                            Scope: <strong className="text-zinc-200">{project?.project_name || 'Active Contract'}</strong> • Drag inside spherical bubbles to inspect rebar, finishes, and drop spatial defect pins.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-xs text-emerald-400 px-3 py-1 bg-emerald-950/60 border border-emerald-800 rounded">
                            {nodes.length} SPATIAL NODES RECORDED
                        </span>
                    </div>
                </header>

                {errorMsg && (
                    <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
                    <div className="lg:col-span-8 space-y-3">
                        {selectedNode ? (
                            <PanoramaViewer360
                                photoUrl={selectedNode.photo_360_url}
                                bimRenderUrl={selectedNode.bim_render_360_url}
                                pins={pins}
                                initialYaw={Number(selectedNode.initial_yaw_degrees) || 0}
                                initialPitch={Number(selectedNode.initial_pitch_degrees) || 0}
                                onSphereClickAddPin={handleSphereClickAddPin}
                            />
                        ) : (
                            <div className="h-[620px] bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col items-center justify-center text-neutral-500 space-y-2">
                                <Camera className="w-10 h-10 text-neutral-600 animate-pulse" />
                                <div className="font-bold text-neutral-400 uppercase">No Panorama Node Selected</div>
                                <p className="text-xs text-neutral-600 max-w-sm text-center">
                                    Select a capture node from the spatial floor plan on the right to enter the 360° virtual tour.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-zinc-900/60 border border-zinc-800 p-4 space-y-3 rounded-lg">
                            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                                    <Compass className="w-4 h-4 text-emerald-400" />
                                    <span>Floor Plan Node Grid</span>
                                </span>
                                <span className="text-[10px] text-zinc-500 uppercase">LEVEL 2 LAYOUT</span>
                            </div>

                            <div className="relative w-full h-[220px] bg-neutral-950 border border-neutral-850 rounded overflow-hidden">
                                <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
                                    <pattern id="gridSub" width="20" height="20" patternUnits="userSpaceOnUse">
                                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#262626" strokeWidth="0.5" />
                                    </pattern>
                                    <rect width="100%" height="100%" fill="url(#gridSub)" />
                                    <rect x="20" y="20" width="85%" height="80%" fill="none" stroke="#52525b" strokeWidth="1.5" />
                                    <rect x="120" y="70" width="80" height="70" fill="#18181b" stroke="#71717a" strokeWidth="1" />
                                </svg>

                                {nodes.map((n) => {
                                    const isSelected = selectedNode?.id === n.id;
                                    return (
                                        <button
                                            key={n.id}
                                            onClick={() => handleSelectNode(n)}
                                            style={{ left: `${n.plan_coord_x}%`, top: `${n.plan_coord_y}%` }}
                                            className={`absolute -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full border-2 flex items-center justify-center font-bold text-[9px] transition-transform ${isSelected
                                                    ? 'bg-emerald-500 text-black border-white scale-125 z-20 shadow-lg shadow-emerald-500/50'
                                                    : 'bg-neutral-900 text-emerald-400 border-emerald-500/60 hover:scale-110 z-10'
                                                }`}
                                            title={n.title}
                                        >
                                            360
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-zinc-900/60 border border-zinc-800 p-4 space-y-3 rounded-lg">
                            <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
                                Captured Walkthrough Nodes ({nodes.length})
                            </span>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {nodes.length === 0 ? (
                                    <div className="text-center py-6 text-zinc-600">Zero walkthrough nodes registered.</div>
                                ) : (
                                    nodes.map((n) => {
                                        const isSelected = selectedNode?.id === n.id;
                                        return (
                                            <div
                                                key={n.id}
                                                onClick={() => handleSelectNode(n)}
                                                className={`p-3 rounded border cursor-pointer transition space-y-1 ${isSelected
                                                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                                                        : 'bg-zinc-950 border-zinc-850 hover:border-zinc-700 text-zinc-300'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-center font-bold">
                                                    <span>{n.title}</span>
                                                    <span className="text-[10px] text-zinc-500">{n.capture_date}</span>
                                                </div>
                                                <div className="text-[10px] text-zinc-500">
                                                    {n.node_code} • {n.spatial_grid}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {isPinModalOpen && pendingPinCoords && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-lg p-5 space-y-4 shadow-2xl">
                            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                                <span className="font-bold text-emerald-400 uppercase text-xs flex items-center gap-1.5">
                                    <Plus className="w-4 h-4" />
                                    <span>Pin Defect in 360° Space</span>
                                </span>
                                <span className="text-[10px] text-neutral-500">
                                    Yaw: {pendingPinCoords.yaw}° | Pitch: {pendingPinCoords.pitch}°
                                </span>
                            </div>

                            <form onSubmit={handleCreatePin} className="space-y-3">
                                <div>
                                    <label className="text-[10px] text-neutral-400 uppercase block mb-1">Pin Category</label>
                                    <select
                                        value={newPinType}
                                        onChange={(e) => setNewPinType(e.target.value as any)}
                                        className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-white"
                                    >
                                        <option value="NCR_DEFECT">NCR Defect (Honeycombing / Rebar Exposure)</option>
                                        <option value="SAFETY_HAZARD">HSE Safety Hazard (Missing Railing)</option>
                                        <option value="RFI_CLARIFICATION">RFI Query / Architectural Discrepancy</option>
                                        <option value="VERIFIED_OK">QA Clearance Stamp</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] text-neutral-400 uppercase block mb-1">Observation Title *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Inadequate rebar clear cover on soffit"
                                        value={newPinTitle}
                                        onChange={(e) => setNewPinTitle(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-white"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] text-neutral-400 uppercase block mb-1">Description / Spec Clause</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Describe defect and required rectification..."
                                        value={newPinDesc}
                                        onChange={(e) => setNewPinDesc(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 p-2 text-xs text-white font-sans"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsPinModalOpen(false)}
                                        className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs rounded"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase rounded"
                                    >
                                        Pin to 360 Space
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}