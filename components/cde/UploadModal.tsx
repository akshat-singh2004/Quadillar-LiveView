"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { ALLOWED_UPLOAD_TYPES, isAllowedUploadType, uploadFileToBucket, type StorageBucketName } from "@/lib/storage";

interface UploadModalProps {
  open: boolean;
  bucket: StorageBucketName;
  onClose: () => void;
  onUploadComplete?: (entry: { name: string; path: string; mimeType: string; fullPath?: string; publicUrl?: string; size: number; uploadedAt: string }) => void;
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
  const [queue, setQueue] = useState<Array<{ file: File; progress: number; status: "ready" | "uploading" | "done" | "error"; error?: string }>>([]);

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
      setQueue((current) => current.map((entry) => entry.file === item.file ? { ...entry, status: "uploading", progress: 15 } : entry));
      try {
        const result = await uploadFileToBucket(bucket, item.file, bucket === "cde-documents" ? "drawings" : "rfi");
        setQueue((current) => current.map((entry) => entry.file === item.file ? { ...entry, status: "done", progress: 100 } : entry));
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
        setQueue((current) => current.map((entry) => entry.file === item.file ? { ...entry, status: "error", progress: 100, error: message } : entry));
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(9,9,11,0.72)", backdropFilter: "blur(8px)", zIndex: 80, display: "grid", placeItems: "center", padding: 20 }} onClick={onClose}>
      <div style={{ width: 560, maxWidth: "100%", background: "rgba(15,23,42,0.96)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 24, padding: 20, color: "#e2e8f0" }} onClick={(event) => event.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7dd3fc" }}>Document upload</div>
            <h3 style={{ margin: "8px 0 0", fontSize: 22, letterSpacing: "-0.04em" }}>{bucket === "cde-documents" ? "CDE / Drawing Vault" : "RFI Attachment"}</h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", borderRadius: 999, padding: "8px 12px", cursor: "pointer" }}>Close</button>
        </div>

        <div onDragOver={(event) => event.preventDefault()} onDragEnter={() => setIsDragging(true)} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} style={{ marginTop: 20, border: `1.5px dashed ${isDragging ? "#7dd3fc" : "rgba(148,163,184,0.35)"}`, background: "rgba(15,23,42,0.75)", borderRadius: 16, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Drag & drop files here</div>
          <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 13 }}>Supported: {acceptedExtensions[bucket]}</div>
          <button type="button" onClick={() => inputRef.current?.click()} style={{ marginTop: 18, background: "#0ea5e9", color: "white", border: "none", borderRadius: 12, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>Choose files</button>
          <input ref={inputRef} type="file" accept={acceptedExtensions[bucket]} multiple onChange={handleInput} hidden />
        </div>

        <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
          {queue.length === 0 ? <div style={{ color: "#94a3b8", fontSize: 14 }}>No files queued yet.</div> : queue.map((entry, index) => (
            <div key={`${entry.file.name}-${index}`} style={{ background: "rgba(15,23,42,0.86)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ fontWeight: 600 }}>{entry.file.name}</div>
                <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: entry.status === "done" ? "#86efac" : entry.status === "error" ? "#fca5a5" : "#facc15" }}>{entry.status}</span>
              </div>
              <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: "rgba(148,163,184,0.12)", overflow: "hidden" }}>
                <div style={{ width: `${entry.progress}%`, height: "100%", background: entry.status === "error" ? "#f87171" : "#38bdf8", borderRadius: 999 }} />
              </div>
              {entry.error ? <div style={{ marginTop: 8, color: "#fca5a5", fontSize: 12 }}>{entry.error}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
