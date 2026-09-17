"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { VirtualInspectionDefectPin } from "@/types/construction";

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function VirtualInspectionRoom({
  hostEngineer,
  remoteInspector,
  location,
  durationMinutes,
  projectName,
}: {
  hostEngineer: string;
  remoteInspector: string;
  location: string;
  durationMinutes: number;
  projectName: string;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(durationMinutes * 60);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [defectPins, setDefectPins] = useState<VirtualInspectionDefectPin[]>([
    { id: "pin-1", title: "Waterproofing junction gap", severity: "High", x: 64, y: 52, notes: "Sealant depression at tower edge needs immediate closure before handover review.", createdAt: new Date().toISOString() },
    { id: "pin-2", title: "Facade panel alignment drift", severity: "Medium", x: 38, y: 68, notes: "Panel plane offset visible under oblique site angle. Consultant sign-off pending.", createdAt: new Date().toISOString() },
  ]);
  const [draft, setDraft] = useState({ title: "", severity: "Medium" as VirtualInspectionDefectPin["severity"], notes: "", x: 48, y: 52 });

  useEffect(() => {
    const id = window.setInterval(() => setDurationSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const meetingSummary = useMemo(
    () => `Remote inspection covered the live facade and MEP access review. ${defectPins.length} snag pins were flagged for closure, including waterproofing checks and panel alignment verification.`,
    [defectPins.length],
  );

  const captureFreezeFrame = () => {
    if (!viewportRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const context = canvas.getContext("2d");

    if (!context) return;

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(0.5, "#111827");
    gradient.addColorStop(1, "#0b1120");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "rgba(148, 163, 184, 0.14)";
    for (let i = 0; i < 14; i += 1) {
      context.fillRect(i * 95, 0, 1, canvas.height);
    }

    context.fillStyle = "rgba(34, 197, 94, 0.18)";
    context.fillRect(160, 180, 940, 240);
    context.fillStyle = "rgba(59, 130, 246, 0.16)";
    context.fillRect(200, 220, 860, 180);
    context.fillStyle = "#f9fafb";
    context.fillRect(220, 200, 840, 30);
    context.fillStyle = "rgba(148, 163, 184, 0.2)";
    context.fillRect(220, 430, 840, 120);
    context.fillStyle = "#f8fafc";
    context.font = "700 36px sans-serif";
    context.fillText("LIVE SITE VIDEO", 220, 120);
    context.font = "500 24px sans-serif";
    context.fillText(`${hostEngineer} • ${remoteInspector}`.toUpperCase(), 220, 165);

    const url = canvas.toDataURL("image/png");
    setSnapshotUrl(url);
    setDraft((current) => ({ ...current, x: 52, y: 58 }));
    setDrawerOpen(true);
  };

  const savePin = () => {
    if (!draft.title.trim()) return;

    const nextPin: VirtualInspectionDefectPin = {
      id: `pin-${Date.now()}`,
      title: draft.title.trim(),
      severity: draft.severity,
      x: draft.x,
      y: draft.y,
      notes: draft.notes.trim() || "Remote inspection defect pin logged from live telepresence session.",
      createdAt: new Date().toISOString(),
    };

    setDefectPins((current) => [...current, nextPin]);
    setDraft({ title: "", severity: "Medium", notes: "", x: 50, y: 52 });
    setDrawerOpen(false);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <section className="surface-shell p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">Telepresence viewport</div>
            <div className="mt-1 text-xl font-medium tracking-tight text-neutral-100">{projectName}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.9)]" />
            <span className="text-[11px] font-medium tracking-[0.12em] text-emerald-200 uppercase">Live</span>
          </div>
        </div>

        <div ref={viewportRef} className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b1120] shadow-[0_24px_60px_rgba(15,23,42,0.8)]" style={{ height: 500 }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.3),transparent_35%),linear-gradient(135deg,#0f172a,#111827_35%,#0b1120)]" />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
          <div className="absolute left-5 top-5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium tracking-[0.12em] text-emerald-200 uppercase">
            WebRTC telepresence
          </div>

          <div className="absolute left-5 top-12 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium tracking-[0.12em] text-neutral-200 uppercase">
            {location}
          </div>

          <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full border border-white/10 bg-neutral-950/70 px-3 py-2 text-[11px] font-medium tracking-[0.12em] text-neutral-200 uppercase">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            {formatDuration(durationSeconds)}
          </div>

          <div className="absolute right-5 top-5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-[10px] font-medium tracking-[0.12em] text-sky-200 uppercase">
            Host: {hostEngineer}
          </div>

          {defectPins.map((pin) => (
            <button
              key={pin.id}
              type="button"
              aria-label={pin.title}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-300/80 bg-rose-500/80 p-2 text-[10px] font-bold text-white shadow-[0_0_20px_rgba(244,63,94,0.8)]"
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              title={`${pin.title} (${pin.severity})`}
            >
              !
            </button>
          ))}

          {snapshotUrl && (
            <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/10 bg-neutral-950/80 p-2 backdrop-blur-sm">
              <div className="text-[10px] font-medium tracking-[0.14em] text-neutral-400 uppercase">Freeze frame</div>
              <img src={snapshotUrl} alt="Freeze-frame capture" className="mt-2 h-28 w-full rounded-xl object-cover" />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={captureFreezeFrame} className="rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-[11px] font-medium tracking-[0.12em] text-rose-200 uppercase transition-all duration-200 hover:bg-rose-500/20">
            Capture & Flag Defect
          </button>
          <button type="button" onClick={() => setDrawerOpen((current) => !current)} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-medium tracking-[0.12em] text-neutral-200 uppercase transition-all duration-200 hover:border-white/[0.12]">
            {drawerOpen ? "Hide Pin Drawer" : "Open Pin Drawer"}
          </button>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="surface-shell p-4">
          <div className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">Session telemetry</div>
          <div className="mt-4 space-y-3 text-sm text-neutral-300">
            <div className="flex items-center justify-between gap-3"><span className="text-neutral-400">Host Engineer</span><span className="font-medium text-neutral-100">{hostEngineer}</span></div>
            <div className="flex items-center justify-between gap-3"><span className="text-neutral-400">Remote Inspector</span><span className="font-medium text-neutral-100">{remoteInspector}</span></div>
            <div className="flex items-center justify-between gap-3"><span className="text-neutral-400">Duration</span><span className="font-medium text-neutral-100">{formatDuration(durationSeconds)}</span></div>
          </div>
        </div>

        <div className="surface-shell p-4">
          <div className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">Auto summary</div>
          <p className="mt-3 text-sm leading-6 text-neutral-300">{meetingSummary}</p>
        </div>

        <div className="surface-shell p-4">
          <div className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">Defect pins</div>
          <div className="mt-3 space-y-2">
            {defectPins.map((pin) => (
              <div key={pin.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-neutral-100">{pin.title}</div>
                  <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-[9px] font-medium tracking-[0.1em] text-rose-200 uppercase">{pin.severity}</span>
                </div>
                <div className="mt-1 text-[11px] font-mono tracking-[0.08em] text-neutral-500">{pin.x}%, {pin.y}%</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {drawerOpen && (
        <div className="surface-shell fixed bottom-6 right-6 z-20 w-[360px] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.9)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">Quick-pin defect</div>
              <div className="mt-1 text-lg font-medium tracking-tight text-neutral-100">New snag log</div>
            </div>
            <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-medium tracking-[0.12em] text-neutral-200 uppercase">
              Close
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block text-[11px] font-mono tracking-[0.12em] text-neutral-400 uppercase">
              Defect title
              <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/[0.08] bg-neutral-950/80 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-500" placeholder="Sealant crack / panel misalignment" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[11px] font-mono tracking-[0.12em] text-neutral-400 uppercase">
                Severity
                <select value={draft.severity} onChange={(event) => setDraft((current) => ({ ...current, severity: event.target.value as VirtualInspectionDefectPin["severity"] }))} className="mt-2 w-full rounded-xl border border-white/[0.08] bg-neutral-950/80 px-3 py-2 text-sm text-neutral-100 outline-none">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </label>

              <div className="text-[11px] font-mono tracking-[0.12em] text-neutral-400 uppercase">
                Pin location
                <div className="mt-2 rounded-xl border border-white/[0.08] bg-neutral-950/80 px-3 py-2 text-sm text-neutral-200">{draft.x.toFixed(0)}%, {draft.y.toFixed(0)}%</div>
              </div>
            </div>

            <label className="block text-[11px] font-mono tracking-[0.12em] text-neutral-400 uppercase">
              Notes
              <textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} className="mt-2 min-h-[96px] w-full rounded-xl border border-white/[0.08] bg-neutral-950/80 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-500" placeholder="Describe the issue, repair requirement, and urgency." />
            </label>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-medium tracking-[0.12em] text-neutral-200 uppercase">
              Cancel
            </button>
            <button type="button" onClick={savePin} className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-medium tracking-[0.12em] text-emerald-200 uppercase">
              Save pin
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
