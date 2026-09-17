"use client";

import { useMemo, useRef, useState } from "react";
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
  const [narrative, setNarrative] = useState("Implemented staged concrete works and maintained schedule adherence with no critical safety incidents. Coordination on MEP trimming remains in progress.");
  const [milestones, setMilestones] = useState<SiteDprMilestoneLog[]>(initialMilestones);
  const [dragging, setDragging] = useState(false);
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
        }),
      );
      setPhotos((current) => [...current, ...uploaded]);
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    const report: SiteDailyProgressReport = {
      id: `dpr-${Date.now()}`,
      projectId: "proj-1",
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.72)", display: "grid", placeItems: "center", zIndex: 80 }}>
      <div style={{ width: "min(1100px, calc(100vw - 32px))", maxHeight: "90vh", overflowY: "auto", background: "#0b1220", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 24, padding: 24, color: "#e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>Daily Progress Report</div>
            <h3 style={{ margin: "8px 0 0", fontSize: 28, letterSpacing: "-0.04em" }}>Site Diary Entry</h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,163,184,0.18)", color: "#f8fafc", borderRadius: 999, width: 36, height: 36, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <div>
              <label style={{ display: "block", color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Weather</label>
              <input value={weather.condition} onChange={(e) => setWeather((current) => ({ ...current, condition: e.target.value }))} style={fieldStyle} />
            </div>
            <div>
              <label style={{ display: "block", color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Temp °C</label>
              <input type="number" value={weather.temperatureC} onChange={(e) => setWeather((current) => ({ ...current, temperatureC: Number(e.target.value) }))} style={fieldStyle} />
            </div>
            <div>
              <label style={{ display: "block", color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Humidity %</label>
              <input type="number" value={weather.humidityPct} onChange={(e) => setWeather((current) => ({ ...current, humidityPct: Number(e.target.value) }))} style={fieldStyle} />
            </div>
            <div>
              <label style={{ display: "block", color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Wind kph</label>
              <input type="number" value={weather.windKph} onChange={(e) => setWeather((current) => ({ ...current, windKph: Number(e.target.value) }))} style={fieldStyle} />
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <div>
              <label style={{ display: "block", color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Total manpower</label>
              <input type="number" value={manpower.total} onChange={(e) => setManpower((current) => ({ ...current, total: Number(e.target.value) }))} style={fieldStyle} />
            </div>
            <div>
              <label style={{ display: "block", color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Subcontractors</label>
              <input type="number" value={manpower.subcontractors} onChange={(e) => setManpower((current) => ({ ...current, subcontractors: Number(e.target.value) }))} style={fieldStyle} />
            </div>
            <div>
              <label style={{ display: "block", color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Supervisors</label>
              <input type="number" value={manpower.supervisors} onChange={(e) => setManpower((current) => ({ ...current, supervisors: Number(e.target.value) }))} style={fieldStyle} />
            </div>
            <div>
              <label style={{ display: "block", color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Active machinery</label>
              <input type="number" value={machinery.active} onChange={(e) => setMachinery((current) => ({ ...current, active: Number(e.target.value) }))} style={fieldStyle} />
            </div>
          </section>

          <div>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Machinery breakdown</label>
            <textarea value={machinery.breakdown} onChange={(e) => setMachinery((current) => ({ ...current, breakdown: e.target.value }))} style={{ ...fieldStyle, minHeight: 100, resize: "vertical" }} />
          </div>

          <div>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Daily progress narrative</label>
            <textarea value={narrative} onChange={(e) => setNarrative(e.target.value)} style={{ ...fieldStyle, minHeight: 120, resize: "vertical" }} />
          </div>

          <div>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Milestone logs</label>
            <div style={{ display: "grid", gap: 10 }}>
              {milestones.map((milestone, index) => (
                <div key={`${milestone.title}-${index}`} style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1.4fr", gap: 8 }}>
                  <input value={milestone.title} onChange={(e) => setMilestones((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, title: e.target.value } : entry))} style={fieldStyle} />
                  <select value={milestone.status} onChange={(e) => setMilestones((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, status: e.target.value as SiteDprMilestoneLog["status"] } : entry))} style={fieldStyle}>
                    {(["Completed", "In Progress", "Delayed"] as const).map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <input value={milestone.note} onChange={(e) => setMilestones((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, note: e.target.value } : entry))} style={fieldStyle} />
                </div>
              ))}
            </div>
          </div>

          <div
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFiles(event.dataTransfer.files); }}
            style={{ border: `1.5px dashed ${dragging ? "#7dd3fc" : "rgba(148,163,184,0.35)"}`, background: "rgba(15,23,42,0.7)", borderRadius: 18, padding: 18 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>Photo capture</div>
                <div style={{ marginTop: 6, color: "#e2e8f0" }}>{photoCount} photos attached</div>
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: "#2563eb", border: "none", color: "#eff6ff", borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontWeight: 700 }}>
                {uploading ? "Uploading…" : "Add photos"}
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(event) => void handleFiles(event.target.files)} />
            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {photos.map((url, index) => (
                <img key={`${url}-${index}`} src={url} alt={`Field site photo ${index + 1}`} style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(148,163,184,0.16)" }} />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.18)", color: "#e2e8f0", borderRadius: 12, padding: "10px 14px", cursor: "pointer" }}>Cancel</button>
            <button type="button" onClick={submit} style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)", border: "none", color: "#eff6ff", borderRadius: 12, padding: "10px 18px", cursor: "pointer", fontWeight: 700 }}>Save DPR</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(15,23,42,0.8)",
  border: "1px solid rgba(148,163,184,0.18)",
  borderRadius: 12,
  padding: "10px 12px",
  color: "#f8fafc",
  fontSize: 14,
};
