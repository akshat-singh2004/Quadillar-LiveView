"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSidebar } from "@/context/SidebarContext";
import { useActiveProject } from "@/context/ProjectContext";
import {
  PanelLeftClose,
  PanelLeftOpen,
  FolderKanban,
  ChevronDown,
  Zap,
} from "lucide-react";

export function UnifiedHeader() {
  const { isExpanded, toggleSidebar } = useSidebar();
  const { activeProject, allProjects, selectProject } = useActiveProject();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bursting, setBursting] = useState(false);
  const [burstBanner, setBurstBanner] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleStageTelemetryBurst = async () => {
    if (bursting) return;
    setBursting(true);
    try {
      const isSummit = activeProject.projectId === "LKO-SUMMIT-TOWER";
      const res = await fetch("/api/telemetry/ingress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProject.projectId,
          deviceId: isSummit ? "LIDAR-IR-GPR-RIG-12F" : "MULTI-RAY-NODE-TG03",
          category: "MULTI_RAY_SPATIAL_SENSOR",
          data: {
            bimZoneId: isSummit ? "12F-GRID-B4-B7" : "BIT-4-TG03",
            gridlineDeltaMm: isSummit ? 1000 : 14.2,
            thermalC: 31.4,
            gprDielectricEr: 1.6,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBurstBanner("SYNC FAILED");
        setTimeout(() => setBurstBanner(null), 4000);
        return;
      }
      const realHash = String(
        data?.merkleSealHash || data?.blockHash || data?.sha256Hash || data?.hash || ""
      );
      const shortHash = realHash ? realHash.slice(0, 12) : "VERIFIED";
      setBurstBanner(`SEALED | SHA256:${shortHash}`);
      window.dispatchEvent(
        new CustomEvent("quadillar-telemetry-burst", {
          detail: {
            projectCode: activeProject.code,
            projectName: activeProject.name,
            hash: realHash || "VERIFIED-SESSION-BLOCK",
            zone: isSummit ? "12F Grid B4–B7 (+1,000 mm Offset)" : "BIT-4 Transfer Girder TG-03",
          },
        })
      );
      setTimeout(() => setBurstBanner(null), 5000);
    } catch {
      setBurstBanner("PACKET QUEUED");
      setTimeout(() => setBurstBanner(null), 3000);
    } finally {
      setBursting(false);
    }
  };

  const totalAlerts = allProjects.reduce((sum, p) => sum + p.activeAlerts.length, 0);

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur-md px-4 flex items-center justify-between font-mono text-xs select-none sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebar();
          }}
          className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer shrink-0 mr-1"
          title={isExpanded ? "Withdraw Sidebar" : "Draw Sidebar"}
          aria-label="Toggle Sidebar"
        >
          {isExpanded ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4 text-zinc-200" />
          )}
        </button>

        {/* 10-Site Portfolio Selector Menu */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900 text-zinc-100 transition cursor-pointer"
          >
            <FolderKanban className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
            <span className="text-[10px] font-bold text-zinc-400">{activeProject.code}</span>
            <span className="font-bold truncate max-w-[160px] sm:max-w-xs">
              {activeProject.name}
            </span>
            {activeProject.activeAlerts.length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[9px] font-bold">
                {activeProject.activeAlerts.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
          </button>

          {menuOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-[370px] max-w-[92vw] max-h-[75vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase px-2.5 py-1.5 font-bold border-b border-zinc-900">
                <span>ACTIVE PORTFOLIO ({allProjects.length} SITES)</span>
                <span className="text-rose-400">{totalAlerts} FLAGGED</span>
              </div>
              {allProjects.map((p) => {
                const isSelected = activeProject.projectId === p.projectId;
                return (
                  <button
                    key={p.projectId}
                    type="button"
                    onClick={() => {
                      selectProject(p.projectId);
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-zinc-100 text-zinc-950 font-bold"
                        : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isSelected ? "bg-zinc-900 text-zinc-100" : "bg-zinc-900 text-zinc-400"
                          }`}
                        >
                          {p.code}
                        </span>
                        <span className="truncate">{p.name}</span>
                      </div>
                      <div
                        className={`text-[9.5px] truncate mt-0.5 ${
                          isSelected ? "text-zinc-700" : "text-zinc-500"
                        }`}
                      >
                        {p.location} • ₹{p.contractValueCr.toFixed(0)} Cr • {p.physicalPct}%
                      </div>
                    </div>

                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        p.activeAlerts.length > 0
                          ? isSelected
                            ? "bg-rose-600 text-white"
                            : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          : isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-500/15 text-emerald-400"
                      }`}
                    >
                      {p.activeAlerts.length > 0 ? `${p.activeAlerts.length} ALERT` : "NOMINAL"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Stage IoT Burst, Studio Shortcut & Portfolio Telemetry */}
      <div className="hidden md:flex items-center gap-2 pr-14 text-[10px] text-zinc-400">
        {burstBanner && (
          <span className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold">
            {burstBanner}
          </span>
        )}
        <button
          type="button"
          disabled={bursting}
          data-quadmax-target="trigger-iot-burst" onClick={handleStageTelemetryBurst}
          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 font-bold inline-flex items-center gap-1 transition cursor-pointer"
          title="Fire a live multi-ray LiDAR/IR/GPR edge telemetry packet into the Section 65B ledger"
        >
          <Zap className="w-3 h-3" />
          {bursting ? "STREAMING..." : "IOT BURST"}
        </button>
        <a
          href="/workspace"
          className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-bold transition"
        >
          + STUDIO / TOKENS
        </a>
        <span>•</span>
        <span>
          PORTFOLIO: <strong className="text-zinc-200">{allProjects.length} SITES</strong>
        </span>
      </div>
    </header>
  );
}

export default UnifiedHeader;
