"use client";

import React, { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  MessageSquare,
  ShieldAlert,
  UploadCloud,
  X
} from "lucide-react";

export interface PunchItem {
  id: string;
  project_id?: string;
  trade: string;
  assigned_contractor: string;
  space_location_code: string;
  issue_description: string;
  priority: "High Priority" | "Medium Priority" | "Low Priority";
  rectification_status: "Open" | "Pending_Reinspection" | "Closed";
  sla_hours_remaining: number;
  backcharge_amount_inr: number;
  before_photo_url?: string | null;
  after_photo_url?: string | null;
  created_at?: string;
}

interface PunchListManagerProps {
  items: PunchItem[];
  onStatusChange: (id: string, nextStatus: PunchItem["rectification_status"], afterPhotoUrl?: string) => Promise<void>;
  onWhatsApp: (item: PunchItem) => void;
}

export function PunchListManager({ items, onStatusChange, onWhatsApp }: PunchListManagerProps) {
  const [filter, setFilter] = useState<"ALL" | "CRITICAL" | "PENDING" | "RESOLVED">("ALL");
  const [activeUploadItem, setActiveUploadItem] = useState<PunchItem | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredItems = items.filter((item) => {
    if (filter === "CRITICAL") return item.priority === "High Priority" && item.rectification_status !== "Closed";
    if (filter === "PENDING") return item.rectification_status === "Pending_Reinspection";
    if (filter === "RESOLVED") return item.rectification_status === "Closed";
    return true;
  });

  const handleOpenUploadModal = (item: PunchItem) => {
    setActiveUploadItem(item);
    setProofUrl(
      item.after_photo_url ||
      "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80"
    );
  };

  const handleConfirmProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUploadItem || !proofUrl.trim()) return;

    setSubmitting(true);
    await onStatusChange(activeUploadItem.id, "Pending_Reinspection", proofUrl.trim());
    setSubmitting(false);
    setActiveUploadItem(null);
    setProofUrl("");
  };

  return (
    <div className="space-y-4">
      {/* FILTER TABS */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
        {[
          { key: "ALL", label: `All Items (${items.length})` },
          { key: "CRITICAL", label: "Critical Path" },
          { key: "PENDING", label: "Ready to Inspect" },
          { key: "RESOLVED", label: "Resolved" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
              filter === tab.key
                ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SNAG GRID CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const isClosed = item.rectification_status === "Closed";
          const isPendingInspection = item.rectification_status === "Pending_Reinspection";

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-zinc-800/80 bg-zinc-950 p-5 space-y-4 hover:border-zinc-700 transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white">
                    {item.space_location_code}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                    item.priority === "High Priority"
                      ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                      : "bg-amber-950 text-amber-400 border border-amber-800/50"
                  }`}>
                    {item.priority}
                  </span>
                </div>

                <div className="text-xs text-zinc-300 font-medium leading-snug">
                  {item.issue_description}
                </div>

                <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50 text-[11px] font-mono space-y-1 text-zinc-400">
                  <div className="flex justify-between">
                    <span>Trade:</span>
                    <strong className="text-zinc-200">{item.trade}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Assigned:</span>
                    <span className="text-cyan-400 truncate max-w-[180px]">{item.assigned_contractor}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-zinc-800/60">
                    <span>Liability Risk:</span>
                    <strong className="text-rose-400">₹{Number(item.backcharge_amount_inr).toLocaleString("en-IN")}</strong>
                  </div>
                </div>

                {/* PHOTO PROOF STRIP */}
                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono">
                  <div className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/30">
                    <span className="text-zinc-500 block mb-1">Defect Proof</span>
                    {item.before_photo_url ? (
                      <a href={item.before_photo_url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center justify-center gap-1">
                        <ImageIcon className="w-3 h-3" /> View Photo
                      </a>
                    ) : (
                      <span className="text-zinc-600">No Photo</span>
                    )}
                  </div>

                  <div className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/30">
                    <span className="text-zinc-500 block mb-1">Resolution</span>
                    {item.after_photo_url ? (
                      <a href={item.after_photo_url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </a>
                    ) : (
                      <span className="text-zinc-600">Pending</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onWhatsApp(item)}
                  className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 text-xs transition"
                  title="Dispatch WhatsApp Notice"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>

                {!isClosed && !isPendingInspection && (
                  <button
                    type="button"
                    onClick={() => handleOpenUploadModal(item)}
                    className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload Proof</span>
                  </button>
                )}

                {isPendingInspection && (
                  <button
                    type="button"
                    onClick={() => onStatusChange(item.id, "Closed")}
                    className="flex-1 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Authorize Closeout</span>
                  </button>
                )}

                {isClosed && (
                  <span className="flex-1 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs font-bold flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Closed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODERN INLINE RECTIFICATION MODAL (NO WINDOW.PROMPT) */}
      {activeUploadItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Submit Rectification Proof
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveUploadItem(null)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-zinc-400 space-y-1">
              <div>Location: <strong className="text-white font-mono">{activeUploadItem.space_location_code}</strong></div>
              <div>Defect: <span className="text-zinc-300">{activeUploadItem.issue_description}</span></div>
            </div>

            <form onSubmit={handleConfirmProof} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 text-[11px] mb-1.5 font-mono">
                  Rectification Photographic Evidence URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/... or Supabase storage link"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-white font-mono outline-none focus:border-cyan-400 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveUploadItem(null)}
                  className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-cyan-950/50"
                >
                  {submitting ? "Uploading..." : "Confirm & Submit Proof"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}