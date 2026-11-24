"use client";

import dynamic from "next/dynamic";
import { MobileSafeSpatialGate } from "@/components/spatial/MobileSafeSpatialGate";

const HeavySpatialView = dynamic(() => import("./_ClientView"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[65vh] items-center justify-center bg-zinc-950 text-xs font-mono text-zinc-400">
      Loading LiDAR Scan vs BIM Deviation…
    </div>
  ),
});

export default function SpatialGatedPage() {
  return (
    <MobileSafeSpatialGate title="LiDAR Scan vs BIM Deviation" subtitle="IS 456 Cl. 11.1 Millimeter Tolerance Heatmap">
      <HeavySpatialView />
    </MobileSafeSpatialGate>
  );
}
