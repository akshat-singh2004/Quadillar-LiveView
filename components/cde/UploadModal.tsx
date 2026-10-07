"use client";

import React, { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Upload, X, FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { ALLOWED_UPLOAD_TYPES, isAllowedUploadType, uploadFileToBucket, type StorageBucketName } from "@/lib/storage";

interface UploadModalProps {
  open: boolean;
  bucket: StorageBucketName;
  onClose: () => void;
  onUploadComplete?: (entry: {
    name: string;
    path: string;
    mimeType: string;
    fullPath?: string;
    publicUrl?: string;
    size: number;
    uploadedAt: string;
  }) => void;
}

const acceptedExtensions: Record<StorageBucketName, string> = {
  "cde-documents": ".pdf,.ifc,.dwg,.png,.jpg,.jpeg",
  "rfi-attachments": ".pdf,.png,.jpg,.jpeg",
  "site-dpr": ".png,.jpg,.jpeg,.webp",
  "punch-photos": ".png,.jpg,.jpeg,.webp",
} as const;

export function UploadModal({ open, bucket, onClose, onUploadComplete }: UploadModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<
    Array<{
      file: File;
      progress: number;
      status: "ready" | "uploading" | "done" | "error";
      error?: string;
    }>
  >([]);

  const addFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;

    const nextItems = Array.from(incoming).map((file) => {
      if (!isAllowedUploadType(bucket, file)) {
        return {
          file,
          progress: 0,
          status: "error" as const,
          error: `Unsupported file type. Accepted: ${acceptedExtensions[bucket]}`,
        };
      }
      return {
        file,
        progress: 0,
        status: "ready" as const,
      };
    });

    setQueue((current) => [...current, ...nextItems]);

    nextItems.forEach(async (item) => {
      if (item.status === "error") return;
      setQueue((current) =>
        current.map((entry) => (entry.file === item.file ? { ...entry, status: "uploading", progress: 25 } : entry))
      );
      try {
        const result = await uploadFileToBucket(bucket, item.file, bucket === "cde-documents" ? "drawings" : "rfi");
        setQueue((current) =>
          current.map((entry) => (entry.file === item.file ? { ...entry, status: "done", progress: 100 } : entry))
        );
        onUploadComplete?.({
          name: result.name,
          path: result.path,
          mimeType: result.mimeType,
          fullPath: result.fullPath,
          publicUrl: result.publicUrl,
          size: result.size,
          uploadedAt: result.uploadedAt,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        setQueue((current) =>
          current.map((entry) =>
            entry.file === item.file ? { ...entry, status: "error", progress: 100, error: message } : entry
          )
        );
      }
    });
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-100"
      >
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <div>
            <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">Document Ingestion</div>
            <h3 className="text-base font-bold text-white mt-0.5">
              {bucket === "cde-documents" ? "ISO 19650 Drawing Container Vault" : "RFI Attachment Ingress"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border border-zinc-800 bg-zinc-900 rounded text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* DROPZONE */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
            isDragging ? "border-cyan-400 bg-cyan-950/20" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
          }`}
        >
          <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
          <div className="text-sm font-bold text-white">Drag &amp; drop design files here</div>
          <div className="text-[10px] text-zinc-500 mt-1">Accepted Extensions: {acceptedExtensions[bucket]}</div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase rounded text-xs transition cursor-pointer"
          >
            Choose Local Files
          </button>
          <input ref={inputRef} type="file" accept={acceptedExtensions[bucket]} multiple onChange={handleInput} hidden />
        </div>

        {/* QUEUE */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {queue.length === 0 ? (
            <div className="text-[10px] text-zinc-500 text-center py-2">Zero files currently queued for upload.</div>
          ) : (
            queue.map((entry, index) => (
              <div key={`${entry.file.name}-${index}`} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-semibold text-zinc-200 truncate max-w-xs">{entry.file.name}</span>
                  <span
                    className={`uppercase text-[9px] font-bold ${
                      entry.status === "done"
                        ? "text-emerald-400"
                        : entry.status === "error"
                        ? "text-rose-400"
                        : "text-amber-400"
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${entry.progress}%` }}
                    className={`h-full transition-all duration-300 ${
                      entry.status === "error" ? "bg-rose-500" : "bg-cyan-500"
                    }`}
                  />
                </div>
                {entry.error && <div className="text-[10px] text-rose-400">{entry.error}</div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default UploadModal;
