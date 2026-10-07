'use client';
import React, { useState } from 'react';
import { validateSiteEvidence, ValidatedEvidencePayload } from '@/lib/security/exifGeofenceValidator';
import { Camera, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
export const ImageUploader: React.FC<any> = ({ onEvidenceValidated, sanctionedCoordinates = { latitude: 26.8467, longitude: 80.9462, radiusMeters: 500 } }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ValidatedEvidencePayload | null>(null);
  const handleFile = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const v = await validateSiteEvidence(file, sanctionedCoordinates);
      setResult(v);
      if (v.valid) onEvidenceValidated(v, file);
    } catch {
      setResult({ valid: false, sha256Hash: 'ERR', capturedAt: new Date().toISOString() });
    } finally { setIsProcessing(false); }
  };
  return (
    <label className="block border-2 border-dashed border-neutral-800 p-4 text-center cursor-pointer">
      <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <div className="text-xs text-neutral-300 font-mono">Upload Geofenced Site Photo</div>
    </label>
  );
};
export default ImageUploader;
