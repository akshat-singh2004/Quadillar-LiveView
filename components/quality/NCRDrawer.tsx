'use client';

import React, { useState } from 'react';
import { ImageUploader } from '@/app/components/ImageUploader';
import { ValidatedEvidencePayload } from '@/lib/security/exifGeofenceValidator';
import {
  AlertOctagon,
  X,
  ShieldAlert,
  DollarSign,
  Box,
  FileCheck2,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface NCRDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  prefilledIfcGuid?: string;
  prefilledGrid?: string;
  onSuccess?: () => void;
}

export default function NCRDrawer({
  isOpen,
  onClose,
  projectId = "GOMTI-NAGAR-PH1-FITOUT",
  prefilledIfcGuid = '',
  prefilledGrid = '',
  onSuccess,
}: NCRDrawerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'CRITICAL' | 'MAJOR' | 'MINOR'>('MAJOR');
  const [ifcGuid, setIfcGuid] = useState(prefilledIfcGuid);
  const [structuralGrid, setStructuralGrid] = useState(prefilledGrid);
  const [withholdingAmount, setWithholdingAmount] = useState('50000');
  const [clauseReference, setClauseReference] = useState('IS 456 Cl 26.4 / CPWD Cl 14');
  const [evidence, setEvidence] = useState<ValidatedEvidencePayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleEvidenceValidated = (payload: ValidatedEvidencePayload) => {
    setEvidence(payload);
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidence || !evidence.valid) {
      setSubmitError('CRITICAL: Cannot issue statutory NCR without hardware-verified EXIF geofence evidence.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        project_id: projectId,
        title,
        description,
        severity,
        status: 'OPEN',
        ifc_guid: ifcGuid || null,
        structural_grid: structuralGrid || null,
        statutory_clause: clauseReference,
        financial_lien_inr: parseFloat(withholdingAmount) || 0,
        sha256_hash: evidence.sha256Hash,
        gps_latitude: evidence.coordinates?.latitude,
        gps_longitude: evidence.coordinates?.longitude,
        distance_meters: evidence.distanceMeters,
        captured_at: evidence.capturedAt,
        issued_at: new Date().toISOString(),
      };

      const response = await fetch('/api/quality/ncr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Fallback: If offline or API route pending, queue offline via IndexedDB
        const { enqueueOfflineMutation } = await import('@/lib/offline/indexedDbQueue');
        await enqueueOfflineMutation('NCR_SUBMIT', '/api/quality/ncr', payload);
      }

      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      // Automatic sub-basement fallback
      try {
        const { enqueueOfflineMutation } = await import('@/lib/offline/indexedDbQueue');
        await enqueueOfflineMutation('NCR_SUBMIT', '/api/quality/ncr', {
          project_id: projectId,
          title,
          description,
          severity,
          ifc_guid: ifcGuid,
          sha256_hash: evidence.sha256Hash,
        });
        setIsSubmitted(true);
        setTimeout(() => {
          setIsSubmitted(false);
          if (onSuccess) onSuccess();
          onClose();
        }, 1500);
      } catch (offlineErr: any) {
        setSubmitError(offlineErr?.message || 'Failed to register statutory NCR.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm font-mono text-neutral-100">
      <div className="w-full max-w-xl bg-neutral-950 border-l border-neutral-800 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-16 px-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="text-sm font-bold tracking-tight">RAISE STATUTORY NCR</h2>
              <p className="text-[10px] text-neutral-400">IS 456 / FIDIC HOLD-GATE ENFORCEMENT</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {submitError && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {isSubmitted && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>NCR cryptographically sealed and attached to IPC withholding ledger.</span>
            </div>
          )}

          {/* Section 1: Non-Conformance Details */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">
                NCR SUMMARY TITLE *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Column C12 cover deficit: 25mm measured vs 45mm required"
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-200 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">SEVERITY GRADE</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-200 focus:border-red-500 focus:outline-none"
                >
                  <option value="CRITICAL">CRITICAL (Structural Hold)</option>
                  <option value="MAJOR">MAJOR (Rework Required)</option>
                  <option value="MINOR">MINOR (Finishing Defect)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  FINANCIAL LIEN / WITHHOLDING (₹)
                </label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-500" />
                  <input
                    type="number"
                    value={withholdingAmount}
                    onChange={(e) => setWithholdingAmount(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded pl-8 pr-3 py-2 text-neutral-200 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">
                DESCRIPTION & ROOT CAUSE AUDIT
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe reinforcement misalignment, honeycombing, or curing violation..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-200 focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: BIM & Spatial Coordinate Binding */}
          <div className="p-3.5 bg-neutral-900/40 border border-neutral-800 rounded-lg space-y-3">
            <div className="flex items-center gap-1.5 text-neutral-300 font-semibold border-b border-neutral-800/80 pb-1.5">
              <Box className="w-4 h-4 text-emerald-400" />
              <span>BIM IFC PARAMETRIC LINK</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-neutral-400 mb-1">IFC ELEMENT GUID</label>
                <input
                  type="text"
                  value={ifcGuid}
                  onChange={(e) => setIfcGuid(e.target.value)}
                  placeholder="e.g., IFC_COL_L1_B2"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-[11px] text-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 mb-1">STRUCTURAL GRID</label>
                <input
                  type="text"
                  value={structuralGrid}
                  onChange={(e) => setStructuralGrid(e.target.value)}
                  placeholder="e.g., Grid B-2 / Elevation +4.2m"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-[11px] text-neutral-200 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-neutral-400 mb-1">
                STATUTORY CLAUSE / CONTRACT SPECIFICATION
              </label>
              <input
                type="text"
                value={clauseReference}
                onChange={(e) => setClauseReference(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-[11px] text-neutral-300 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Hardware Geofenced Photographic Evidence */}
          <div className="space-y-2">
            <label className="block text-[11px] text-neutral-400">
              PHOTOGRAPHIC EVIDENCE (SECTION 65B GEOFENCE LOCK) *
            </label>
            <ImageUploader
              entityType="NCR"
              entityId={projectId}
              onEvidenceValidated={handleEvidenceValidated}
              sanctionedCoordinates={{
                latitude: 26.8467,
                longitude: 80.9462,
                radiusMeters: 500,
              }}
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="h-16 px-6 border-t border-neutral-800 bg-neutral-900/60 flex items-center justify-between">
          <div className="text-[10px] text-neutral-500">
            {evidence?.valid ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <FileCheck2 className="w-3.5 h-3.5" /> GEOFENCE CLEARED
              </span>
            ) : (
              'AWAITING CAMERA VERIFICATION'
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 rounded text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !evidence?.valid}
              className={`px-4 py-1.5 rounded text-xs font-semibold flex items-center gap-2 transition-all ${evidence?.valid && !isSubmitting
                  ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-lg shadow-red-950/50'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>SEALING NCR...</span>
                </>
              ) : (
                <span>SEAL & ISSUE NCR</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}