"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGovernor } from "@/context/GovernorContext";

interface PaletteItem {
  id: string;
  label: string;
  group: string;
  keywords: string;
  href?: string;
  action?: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { setMode, patchInput } = useGovernor();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const items: PaletteItem[] = useMemo(
    () => [
      { id: "act-stress", label: "Activate TG-03 Extreme Failure Cascade (HTTP 422)", group: "Governor Actions", keywords: "stress fail 422 tg-03 freeze", action: () => setMode("stress-test") },
      { id: "act-pass", label: "Switch to Rectified Compliant State (HTTP 200)", group: "Governor Actions", keywords: "compliant green pass 200 release", action: () => setMode("compliant") },
      { id: "act-wind", label: "Simulate 18.5 m/s Wind Gust (Crane Lockout)", group: "Governor Actions", keywords: "wind gust crane ptw eot is875", action: () => patchInput({ windSpeedMs: 18.5 }) },
      { id: "nav-home", label: "Command Center", group: "Command & Spatial", keywords: "home dashboard overview", href: "/" },
      { id: "nav-twin", label: "3D BIM Digital Twin", group: "Command & Spatial", keywords: "3d bim revit model spatial", href: "/site/digital-twin" },
      { id: "nav-360", label: "360° Reality Tour", group: "Command & Spatial", keywords: "360 tour walkthrough camera", href: "/site/360-tour" },
      { id: "nav-scan", label: "LiDAR Scan vs BIM", group: "Command & Spatial", keywords: "lidar deviation heatmap tolerance", href: "/quality/scan-vs-bim" },
      { id: "nav-dpr", label: "Site Report (DPR) & Offline Field Capture", group: "Field & Safety", keywords: "dpr capture photo sha256 offline 2g camera", href: "/site/dpr" },
      { id: "nav-qr", label: "Printable ₹5 Zone QR Anchor Stickers", group: "Field & Safety", keywords: "qr print sticker anchor foap", href: "/site/qr-anchors" },
      { id: "nav-gate", label: "Gate Inward & Weighbridge", group: "Field & Safety", keywords: "gate truck cement weighbridge challan", href: "/site/gate-inward" },
      { id: "nav-ptw", label: "Permit to Work (PTW)", group: "Field & Safety", keywords: "ptw safety permit stripping crane", href: "/safety/ptw" },
      { id: "nav-wind", label: "Wind & Crane Stability (IS 875)", group: "Field & Safety", keywords: "wind crane overturning stability", href: "/site/wind-stability" },
      { id: "nav-mat", label: "Concrete Maturity & Thermal Gradient", group: "Quality & Concrete", keywords: "concrete maturity thermal probe is456", href: "/engineering/concrete-maturity" },
      { id: "nav-ncr", label: "NCR & Defect Liens", group: "Quality & Concrete", keywords: "ncr defect snag hold", href: "/quality/ncr" },
      { id: "nav-ra", label: "RA Bills & Escrow Governance", group: "Schedule & Commercial", keywords: "ra bill escrow payment 422 rtgs gst", href: "/finance/ra-bills" },
      { id: "nav-recon", label: "Material Reconciliation (CPWD Clause 42)", group: "Schedule & Commercial", keywords: "material reconciliation clause 42 penalty", href: "/materials/reconciliation" },
      { id: "nav-gantt", label: "Master Schedule & CPM Gantt", group: "Schedule & Commercial", keywords: "gantt schedule cpm delay", href: "/schedule/gantt" },
      { id: "nav-evm", label: "EVM S-Curve (SPI / CPI)", group: "Schedule & Commercial", keywords: "evm spi cpi eac overrun", href: "/executive/evm-scurve" },
      { id: "nav-vault", label: "BSA Section 63 Audit Vault & Live Field Inbox", group: "Audit & Settings", keywords: "audit vault inbox bsa sha256", href: "/closeout/audit-vault" },
      { id: "nav-cert", label: "Print Legal BSA Section 63(4) Certificate (A4 PDF)", group: "Audit & Settings", keywords: "bsa 63 certificate legal pdf print court", href: "/closeout/bsa-certificate" },
      { id: "nav-settings", label: "Notification Settings (SMS, WhatsApp, Email, PC Popups)", group: "Audit & Settings", keywords: "settings notification sms whatsapp email popup alert", href: "/settings" },
    ],
    [patchInput, setMode]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.group.toLowerCase().includes(q) ||
        i.keywords.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpenEvt = () => setOpen(true);

    window.addEventListener("keydown", onKey);
    window.addEventListener("quadillar:open-palette", onOpenEvt);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("quadillar:open-palette", onOpenEvt);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const execute = (item: PaletteItem) => {
    setOpen(false);
    if (item.action) item.action();
    if (item.href) router.push(item.href);
  };

  if (!open) return null;

  return (
    <div
      className="print:hidden fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
          <span className="font-mono text-xs text-sky-400">⌘K</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIdx((i) => Math.min(filtered.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIdx((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter" && filtered[selectedIdx]) {
                e.preventDefault();
                execute(filtered[selectedIdx]);
              }
            }}
            placeholder="Jump to route, TG-03 action, QR stickers, BSA certificate, or settings…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded border border-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 hover:text-white"
          >
            ESC
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-zinc-500">No matching commands or routes.</div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setSelectedIdx(idx)}
                onClick={() => execute(item)}
                className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition-colors ${
                  idx === selectedIdx ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <span className="font-medium truncate">{item.label}</span>
                <span className="shrink-0 rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                  {item.group}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
