'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Camera, AlertTriangle, ShieldCheck, CheckCircle2, Plus, RefreshCw, X, Eye, ExternalLink, Zap } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';

export interface VisionDefect {
  id: string;
  project_id: string;
  detection_code: string;
  defect_type: 'CRACK_STRUCTURAL' | 'HONEYCOMBING_VOID' | 'REBAR_EXPOSURE_CORROSION' | 'SPALLING_CONCRETE' | 'COLD_JOINT_DELAMINATION' | 'PPE_VIOLATION_NO_HELMET';
  confidence_pct: number;
  structural_element: string;
  location_grid: string;
  image_url?: string | null;
  measured_width_mm?: number | null;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL_NCR';
  status: 'DETECTED_UNCONFIRMED' | 'VALIDATED_PROMOTED_TO_NCR' | 'DISMISSED_FALSE_POSITIVE' | 'RECTIFIED_CLOSED';
  detected_at: string;
}

export default function VisionAiPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = (project as any)?.project_name || (project as any)?.name || 'Active Contract';

  const [defects, setDefects] = useState<VisionDefect[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [defectType, setDefectType] = useState<VisionDefect['defect_type']>('CRACK_STRUCTURAL');
  const [element, setElement] = useState('');
  const [grid, setGrid] = useState('');
  const [confidence, setConfidence] = useState('94.5');
  const [widthMm, setWidthMm] = useState('0.35');
  const [severity, setSeverity] = useState<VisionDefect['severity']>('HIGH');

  const loadDefects = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('vision_ai_defect_detections')
        .select('*')
        .eq('project_id', projectId)
        .order('detected_at', { ascending: false });

      if (error) throw error;
      setDefects(data || []);
    } catch (err: any) {
      console.error('Failed to load Vision AI defects:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadDefects();
  }, [loadDefects]);

  const summary = useMemo(() => {
    const totalDetections = defects.length;
    const criticalNcrCount = defects.filter((d) => d.severity === 'CRITICAL_NCR' || d.severity === 'HIGH').length;
    const unconfirmedCount = defects.filter((d) => d.status === 'DETECTED_UNCONFIRMED').length;
    const crackBreaches = defects.filter((d) => Number(d.measured_width_mm || 0) > 0.3).length;

    return { totalDetections, criticalNcrCount, unconfirmedCount, crackBreaches };
  }, [defects]);

  const handleCreateDetection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!element.trim() || !grid.trim()) return;

    setSubmitting(true);
    const code = `AI-DEF-${new Date().getFullYear()}-${(defects.length + 1).toString().padStart(3, '0')}`;

    const payload = {
      project_id: projectId,
      detection_code: code,
      defect_type: defectType,
      confidence_pct: parseFloat(confidence) || 90.0,
      structural_element: element.trim(),
      location_grid: grid.trim(),
      measured_width_mm: widthMm ? parseFloat(widthMm) : null,
      severity,
      status: 'DETECTED_UNCONFIRMED',
    };

    try {
      const { error } = await (supabase as any).from('vision_ai_defect_detections').insert([payload]);
      if (error) throw error;

      setModalOpen(false);
      setElement('');
      setGrid('');
      setFeedback('Visual defect tag recorded from edge telemetry stream.');
      setTimeout(() => setFeedback(null), 3500);
      await loadDefects();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to record defect detection.');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromoteToNcr = async (defect: VisionDefect) => {
    try {
      // 1. Create NCR
      const ncrNum = `NCR-AI-${Date.now().toString(36).toUpperCase()}`;
      const { data: ncrData, error: ncrErr } = await (supabase as any)
        .from('quality_ncr_register')
        .insert([{
          project_id: projectId,
          ncr_number: ncrNum,
          structural_element: defect.structural_element,
          grid_location: defect.location_grid,
          root_cause: `Computer Vision AI flagged ${defect.defect_type} (Confidence: ${defect.confidence_pct}%)`,
          rectification_method: 'Grouting / Polymer modified mortar repair per structural engineer instruction',
          severity_grade: defect.severity === 'CRITICAL_NCR' ? 'MAJOR_STRUCTURAL' : 'MODERATE_SERVICEABILITY',
          status: 'OPEN_HOLD_ACTIVE',
        }])
        .select()
        .single();

      if (ncrErr) throw ncrErr;

      // 2. Update Defect status
      await (supabase as any)
        .from('vision_ai_defect_detections')
        .update({
          status: 'VALIDATED_PROMOTED_TO_NCR',
          linked_ncr_id: ncrData.id,
          verified_by: 'QA/QC Engineer',
        })
        .eq('id', defect.id);

      setFeedback(`Defect promoted to formal Structural Non-Conformance (${ncrNum}).`);
      setTimeout(() => setFeedback(null), 3500);
      await loadDefects();
    } catch (err: any) {
      console.error('Failed to promote defect to NCR:', err);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center">
              COMPUTER VISION QUALITY • ACI 224.1R / IS 456 CL. 15.2 CRACK CLASSIFICATION
              <StatutoryInfo
                standardRef="ACI 224.1R / IS 456 CL. 15.2"
                title="Concrete Crack Width & Surface Defect Thresholds"
                idealRange="Crack Width < 0.30 mm"
                description="Surface cracks exceeding 0.3mm (or 0.2mm in aggressive marine/chemical exposure) breach IS 456 durability requirements. Automated edge AI classifications route critical defects directly into the NCR register for structural evaluation."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Camera className="w-6 h-6 text-cyan-400" />
              <span>Visual Quality Command Console &amp; AI Crack Telemetry</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Edge camera defect detection, automated honeycombing identification, and 1-click promotion to Quality NCRs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadDefects()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Log Visual Inference Tag</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 4 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Vision AI Detections</span>
            <div className="text-2xl font-bold text-white mt-1">
              {summary.totalDetections} Tags
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Edge drone &amp; camera feeds</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Critical Structural Flags</span>
            <div className={`text-2xl font-bold mt-1 ${summary.criticalNcrCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {summary.criticalNcrCount} Critical
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Requires engineer inspection</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Durability Crack Breaches</span>
            <div className={`text-2xl font-bold mt-1 ${summary.crackBreaches > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {summary.crackBreaches} Breaches
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">&gt; 0.30 mm limit (IS 456)</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Pending Human Review</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {summary.unconfirmedCount} Unconfirmed
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Awaiting QA/QC endorsement</span>
          </div>
        </div>

        {/* DETECTIONS TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <span className="text-white font-bold text-xs uppercase block">
              Automated Defect Inference Register ({defects.length})
            </span>
          </div>

          {defects.length === 0 ? (
            <div className="p-12 text-center border border-zinc-850 bg-zinc-950 text-xs">
              <Camera className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <div className="text-zinc-400 font-bold uppercase">Zero Defect Telemetry Tags</div>
              <p className="text-[11px] text-zinc-600 font-sans mt-1 max-w-sm mx-auto">
                No visual defects detected. Connect site edge camera stream or click &quot;Log Visual Inference Tag&quot; above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-3">Code &amp; Defect Type</th>
                    <th className="p-3">Structural Member</th>
                    <th className="p-3">Grid Location</th>
                    <th className="p-3 text-right">Confidence</th>
                    <th className="p-3 text-right">Crack Width</th>
                    <th className="p-3 text-center">Severity</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                  {defects.map((d) => {
                    const isNcr = d.status === 'VALIDATED_PROMOTED_TO_NCR';
                    const isCritical = d.severity === 'CRITICAL_NCR' || d.severity === 'HIGH';

                    return (
                      <tr key={d.id} className="hover:bg-zinc-900/50 transition">
                        <td className="p-3">
                          <span className="text-white font-bold block">{d.detection_code}</span>
                          <span className="text-[10px] text-cyan-400 font-mono">{d.defect_type.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="p-3 text-zinc-200 font-bold">{d.structural_element}</td>
                        <td className="p-3 text-zinc-400 font-mono text-[11px]">{d.location_grid}</td>
                        <td className="p-3 text-right font-bold text-emerald-400 font-mono">
                          {Number(d.confidence_pct).toFixed(1)}%
                        </td>
                        <td className="p-3 text-right font-mono">
                          {d.measured_width_mm ? (
                            <span className={Number(d.measured_width_mm) > 0.3 ? 'text-rose-400 font-bold' : 'text-zinc-300'}>
                              {Number(d.measured_width_mm).toFixed(2)} mm
                            </span>
                          ) : '--'}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            isCritical ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-zinc-800 text-zinc-300'
                          }`}>
                            {d.severity}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            isNcr ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {d.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {!isNcr && (
                            <button
                              type="button"
                              onClick={() => handlePromoteToNcr(d)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] uppercase rounded"
                            >
                              Promote to NCR
                            </button>
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

      </div>

      {/* LOG DEFECT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Log Visual Quality Defect (Edge AI Inference)</span>
              </span>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateDetection} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Defect Classification</label>
                  <select
                    value={defectType}
                    onChange={(e) => setDefectType(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  >
                    <option value="CRACK_STRUCTURAL">Structural Concrete Crack</option>
                    <option value="HONEYCOMBING_VOID">Honeycombing &amp; Void</option>
                    <option value="REBAR_EXPOSURE_CORROSION">Exposed Rebar / Rusting</option>
                    <option value="COLD_JOINT_DELAMINATION">Cold Joint Delamination</option>
                    <option value="SPALLING_CONCRETE">Spalling Surface Failure</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Severity Rating</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL_NCR">Critical (Immediate NCR)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Structural Element *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Column C3 (Level 2)"
                  value={element}
                  onChange={(e) => setElement(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Grid Coordinate / Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Axis B2-C3 / Soffit Area"
                  value={grid}
                  onChange={(e) => setGrid(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Model Confidence (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={confidence}
                    onChange={(e) => setConfidence(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Measured Width (mm)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.35"
                    value={widthMm}
                    onChange={(e) => setWidthMm(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase text-xs rounded transition"
                >
                  {submitting ? 'Recording...' : 'Log Inference Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
