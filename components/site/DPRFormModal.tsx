"use client";

import React, { useMemo, useRef, useState, useTransition } from "react";
import { X, Upload, CheckCircle2, Loader2, Camera, CloudSun, HardHat, Cog } from "lucide-react";
import { uploadFileToBucket } from "@/lib/storage";
import type { SiteDailyProgressReport, SiteDprMilestoneLog } from "@/types/construction";

export interface DPRFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (report: SiteDailyProgressReport) => void;
}

const initialMilestones: SiteDprMilestoneLog[] = [
  { title: "Structural Works", status: "Completed", note: "Core shell slab activity completed to planned lift." },
  { title: "MEP Rough-in", status: "In Progress", note: "Service routing continues in north wing with coordinated access." },
  { title: "Finishes", status: "Delayed", note: "Plaster trim progress dependent on façade fix-out sequencing." },
];

export function DPRFormModal({ open, onClose, onSubmit }: DPRFormModalProps) {
  const [weather, setWeather] = useState({ condition: "Clear", temperatureC: 32, humidityPct: 58, windKph: 12 });
  const [manpower, setManpower] = useState({ total: 148, subcontractors: 82, supervisors: 12 });
  const [machinery, setMachinery] = useState({ active: 14, breakdown: "Crane 02 - minor hydraulic leak" });
  const [narrative, setNarrative] = useState(
    "Implemented staged concrete works and maintained schedule adherence with no critical safety incidents. Coordination on MEP trimming remains in progress."
  );
  const [milestones, setMilestones] = useState<SiteDprMilestoneLog[]>(initialMilestones);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const photoCount = useMemo(() => photos.length, [photos]);

  if (!open) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => {
          const result = await uploadFileToBucket("site-dpr", file, "daily-progress");
          return result.publicUrl ?? result.path;
        })
      );
      setPhotos((current) => [...current, ...uploaded]);
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    const report: SiteDailyProgressReport = {
      id: `dpr-${Date.now()}`,
      projectId: "GOMTI-NAGAR-PH1-FITOUT",
      reportDate: new Date().toISOString(),
      weather,
      manpower,
      machinery: { active: machinery.active, breakdown: machinery.breakdown ? [machinery.breakdown] : [] },
      narrative,
      milestoneLogs: milestones,
      photos: photos.map((url, index) => ({ id: `photo-${index + 1}`, url, uploadedAt: new Date().toISOString() })),
      status: "Draft",
      createdAt: new Date().toISOString(),
    };

    onSubmit(report);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs select-none">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 text-zinc-100">
        {/* MODAL HEADER */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
          <div>
            <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
              Daily Progress Report
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Site Diary Entry &amp; Shift Synthesis
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FORM GRID */}
        <div className="space-y-4">
          {/* Weather Section */}
          <section className="p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2">
            <span className="text-[10px] uppercase text-zinc-400 font-bold flex items-center gap-1.5">
              <CloudSun className="w-3.5 h-3.5 text-cyan-400" />
              <span>Microclimate Telemetry Readings</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase mb-1">Atmosphere</label>
                <input
                  value={weather.condition}
                  onChange={(e) => setWeather({ ...weather, condition: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none"
                />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase mb-1">Temp (°C)</label>
                <input
                  type="number"
                  value={weather.temperatureC}
                  onChange={(e) => setWeather({ ...weather, temperatureC: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none text-right tabular-nums"
                />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase mb-1">Humidity (%)</label>
                <input
                  type="number"
                  value={weather.humidityPct}
                  onChange={(e) => setWeather({ ...weather, humidityPct: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none text-right tabular-nums"
                />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase mb-1">Wind (km/h)</label>
                <input
                  type="number"
                  value={weather.windKph}
                  onChange={(e) => setWeather({ ...weather, windKph: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none text-right tabular-nums"
                />
              </div>
            </div>
          </section>

          {/* Manpower & Machinery */}
          <section className="p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2">
            <span className="text-[10px] uppercase text-zinc-400 font-bold flex items-center gap-1.5">
              <HardHat className="w-3.5 h-3.5 text-emerald-400" />
              <span>Shift Deployment &amp; Plant Fleet</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase mb-1">Total Manpower</label>
                <input
                  type="number"
                  value={manpower.total}
                  onChange={(e) => setManpower({ ...manpower, total: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none text-right tabular-nums"
                />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase mb-1">Subcontractors</label>
                <input
                  type="number"
                  value={manpower.subcontractors}
                  onChange={(e) => setManpower({ ...manpower, subcontractors: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none text-right tabular-nums"
                />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase mb-1">Supervisors</label>
                <input
                  type="number"
                  value={manpower.supervisors}
                  onChange={(e) => setManpower({ ...manpower, supervisors: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none text-right tabular-nums"
                />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase mb-1">Active Machinery</label>
                <input
                  type="number"
                  value={machinery.active}
                  onChange={(e) => setMachinery({ ...machinery, active: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none text-right tabular-nums"
                />
              </div>
            </div>
          </section>

          {/* Machinery Breakdown */}
          <div>
            <label className="block text-zinc-400 text-[10px] uppercase mb-1">Machinery Breakdown / Stoppages</label>
            <textarea
              rows={2}
              value={machinery.breakdown}
              onChange={(e) => setMachinery({ ...machinery, breakdown: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-100 rounded outline-none"
            />
          </div>

          {/* Daily Progress Narrative */}
          <div>
            <label className="block text-zinc-400 text-[10px] uppercase mb-1">Daily Progress Narrative *</label>
            <textarea
              rows={3}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-100 rounded outline-none"
            />
          </div>

          {/* Milestone Logs */}
          <div className="space-y-2">
            <label className="block text-zinc-400 text-[10px] uppercase">Milestone Progress Tracking</label>
            <div className="space-y-2">
              {milestones.map((milestone, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    value={milestone.title}
                    onChange={(e) =>
                      setMilestones(
                        milestones.map((entry, idx) => (idx === index ? { ...entry, title: e.target.value } : entry))
                      )
                    }
                    className="sm:col-span-4 bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none"
                  />
                  <select
                    value={milestone.status}
                    onChange={(e) =>
                      setMilestones(
                        milestones.map((entry, idx) =>
                          idx === index ? { ...entry, status: e.target.value as SiteDprMilestoneLog["status"] } : entry
                        )
                      )
                    }
                    className="sm:col-span-3 bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-zinc-100 rounded outline-none"
                  >
                    <option value="Completed">Completed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Delayed">Delayed</option>
                  </select>
                  <input
                    value={milestone.note}
                    onChange={(e) =>
                      setMilestones(
                        milestones.map((entry, idx) => (idx === index ? { ...entry, note: e.target.value } : entry))
                      )
                    }
                    className="sm:col-span-5 bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Photo Capture */}
          <div className="border border-dashed border-zinc-800 bg-zinc-900/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold block">
                  Geofenced Photographic Evidence
                </span>
                <span className="text-[11px] text-zinc-400">{photoCount} photos attached to diary</span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                <span>{uploading ? "Uploading..." : "Add Photos"}</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => void handleFiles(e.target.files)}
            />

            {photos.length > 0 && (
              <div className="flex gap-2.5 flex-wrap pt-2">
                {photos.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`DPR Photo ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-zinc-800"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded font-semibold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold uppercase text-xs transition cursor-pointer"
            >
              Commit Site Diary Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DPRFormModal;
