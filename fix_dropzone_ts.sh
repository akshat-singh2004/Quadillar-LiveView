#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Patching components/onboarding/DocumentUploadDropzone.tsx...\033[0m"

cat << 'COMP_DROPZONE' > components/onboarding/DocumentUploadDropzone.tsx
"use client";

import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, ShieldCheck, Sparkles, Loader2, X } from "lucide-react";
import { parseAndExtractDocuments, ExtractedProjectData } from "@/app/actions/document-intake-actions";

interface Props {
  onExtractionComplete: (result: {
    stagingId: string;
    extracted: ExtractedProjectData;
    confidenceScores: Record<string, number>;
  }) => void;
}

export function DocumentUploadDropzone({ onExtractionComplete }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const newFiles = Array.from(droppedFiles);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const newFiles = Array.from(selectedFiles);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartExtraction = async () => {
    if (files.length === 0) return;
    setLoading(true);

    const filesMeta = files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type || "application/pdf",
    }));

    const res = await parseAndExtractDocuments(filesMeta);
    setLoading(false);

    if (res.success && res.extracted && res.confidenceScores) {
      onExtractionComplete({
        stagingId: res.stagingId || "staging-temp",
        extracted: res.extracted,
        confidenceScores: res.confidenceScores,
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-mono text-xs select-none">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-[10px] uppercase font-bold tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multimodal Ingestion Engine</span>
        </div>
        <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
          Upload Project Statutory &amp; Contract Bundle
        </h1>
        <p className="text-zinc-400 font-sans text-xs max-w-xl mx-auto">
          Upload municipal sanction orders, FIDIC/CPWD contract agreements, title deeds, and site specifications. The system automatically reads location, permissions, baseline sums, and commercial escrow rules.
        </p>
      </div>

      {/* DROPZONE */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition ${
          isDragging
            ? "border-cyan-400 bg-cyan-950/20"
            : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
        }`}
      >
        <Upload className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-white uppercase">
          Drop Project Documents Here
        </h3>
        <p className="text-[11px] text-zinc-500 mt-1 font-sans">
          Supports Municipal Sanctions, RERA Filings, Contract Agreements, and Bill of Quantities (PDF, Scans, Word).
        </p>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-bold uppercase text-[10px] transition cursor-pointer"
        >
          Select Files from Disk
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          onChange={handleFileSelect}
          hidden
        />
      </div>

      {/* STAGED FILE LIST */}
      {files.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center text-zinc-400 text-[10px] uppercase font-bold border-b border-zinc-800 pb-2">
            <span>Staged Ingestion Files ({files.length})</span>
            <span>Ready for Machine Extraction</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="font-semibold text-zinc-200 truncate">{file.name}</span>
                  <span className="text-[10px] text-zinc-500 shrink-0">
                    ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="text-zinc-500 hover:text-rose-400 p-1 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={loading}
              onClick={handleStartExtraction}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded-xl flex items-center gap-2 transition cursor-pointer shadow-lg shadow-cyan-950/40 text-xs"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{loading ? "Extracting Clauses & Parameters..." : "Run AI Extraction"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentUploadDropzone;
COMP_DROPZONE

echo -e "\033[1;36m[+] Verifying TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] TS2769 resolved cleanly! Build verified with zero errors.\033[0m"
