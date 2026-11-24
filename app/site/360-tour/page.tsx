"use client";

import dynamic from "next/dynamic";
import { MobileSafeSpatialGate } from "@/components/spatial/MobileSafeSpatialGate";

const HeavySpatialView = dynamic(() => import("./_ClientView"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[65vh] items-center justify-center bg-zinc-950 text-xs font-mono text-zinc-400">
      Loading 360° Reality Tour…
    </div>
  ),
});

export default function SpatialGatedPage() {
  return (
    <MobileSafeSpatialGate title="360° Reality Tour" subtitle="Hardhat Equirectangular Walkthrough + Snag Hotspots">
      <HeavySpatialView />
    </MobileSafeSpatialGate>
  );
}
