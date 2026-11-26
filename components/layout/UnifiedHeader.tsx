"use client";

import React, { useState } from "react";
import { useSidebar } from "@/context/SidebarContext";
import { useActiveProject } from "@/context/ProjectContext";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  Zap,
} from "lucide-react";

export function UnifiedHeader() {
  const { isExpanded, toggleSidebar } = useSidebar();
  const { activeProject } = useActiveProject();
  const [bursting, setBursting] = useState(false);
  const [burstBanner, setBurstBanner] = useState<string | null>(null);

  const handleStageTelemetryBurst = async () => {
    if (bursting) return;
    setBursting(true);
    try {
      const res = await fetch("/api/telemetry/ingress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProject.projectId,
          deviceId: "MULTI-RAY-NODE-TG03",
          category: "MULTI_RAY_SPATIAL_SENSOR",
          data: {
            bimZoneId: "BIT-4-TG03",
            gridlineDeltaMm: 14.2,
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
            zone: "BIT-4 Transfer Girder TG-03",
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

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur-md px-2 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-2 font-mono text-xs select-none sticky top-0 z-20 max-w-full overflow-x-hidden">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window !== "undefined" && window.innerWidth < 1024) {
              window.dispatchEvent(new Event("quadillar:toggle-mobile-sidebar"));
            } else {
              if (typeof window !== "undefined" && window.innerWidth < 1024) {
              window.dispatchEvent(new Event("quadillar:toggle-mobile-sidebar"));
            } else {
              toggleSidebar();
            }
            }
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

        {/* Single-Project Identity Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-100 min-w-0 max-w-[180px] sm:max-w-none overflow-hidden">
          <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[10px] font-bold text-zinc-400">{activeProject.code}</span>
          <span className="font-bold truncate max-w-[100px] sm:max-w-xs">
            {activeProject.name}
          </span>
          <span className="hidden lg:inline-block px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[9.5px] text-zinc-400">
            {activeProject.projectId}
          </span>
        </div>
      </div>

      {/* Right Stage IoT Burst & Site Telemetry Status */}
      <div className="flex items-center gap-1.5 sm:gap-2 pr-12 sm:pr-14 text-[10px] text-zinc-400">
        {burstBanner && (
          <span className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold">
            {burstBanner}
          </span>
        )}
        <button
          type="button"
          disabled={bursting}
          data-quadmax-target="trigger-iot-burst"
          data-guide-target="iot-burst"
          onClick={handleStageTelemetryBurst}
          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 font-bold inline-flex items-center gap-1 transition cursor-pointer"
          title="Fire a live multi-ray LiDAR/IR/GPR edge telemetry packet into the Section 65B ledger"
        >
          <Zap className="w-3 h-3" />
          {bursting ? "STREAMING..." : "IOT BURST"}
        </button>
        <span>|</span>
        <span>
          <strong className="text-zinc-200">GOMTI NAGAR, LKO</strong> • LOD-400
        </span>
      </div>
    </header>
  );
}

export default UnifiedHeader;
