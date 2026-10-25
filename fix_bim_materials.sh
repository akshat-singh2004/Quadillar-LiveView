#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: FIX MATERIAL PROPERTY CRASH (UNDEFINED SETHEX)
# ==============================================================================

set -euo pipefail

node - << 'NODE_RUNNER_EOF'
const fs = require('fs');
const file = "components/bim/FullBimSimulationEngine.tsx";

if (!fs.existsSync(file)) {
  console.log(`[ERROR] File ${file} not found.`);
  process.exit(1);
}

let code = fs.readFileSync(file, 'utf8');

const startMarker = "// --- UPDATE VISIBILITY & VARIANCE ---";
const endMarker = "}, [timelineWeek, timelineMode, activeLevel, activeZone, selectedEntity, isHydrated]);";

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const before = code.slice(0, startIndex);
  const after = code.slice(endIndex + endMarker.length);
  
  const safeEffectBlock = `${startMarker}
  useEffect(() => {
    if (!elementsGroupRef.current || !isHydrated) return;

    elementsGroupRef.current.children.forEach((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.userData || !mesh.material) return;

      // Ignore cameras and auxiliary UI meshes (like the halo RingGeometry)
      if (mesh.userData.isCamera || mesh.userData.minWeek === undefined) return;

      const { minWeek, plannedWeek, level, zone, originalColor, originalEmissive, originalEmissiveIntensity, entityId } = mesh.userData;

      const isConstructed = timelineWeek >= minWeek;
      const levelMatches = activeLevel === "ALL" || level === activeLevel;
      const zoneMatches = activeZone === "ALL_ZONES" || zone === activeZone;
      mesh.visible = isConstructed && levelMatches && zoneMatches;

      // Cast to any to safely check for properties
      const mat = mesh.material as any;
      
      // 1. Safe Color Resolution (Variance vs Original)
      if (mat.color && originalColor !== undefined) {
        if (timelineMode === "VARIANCE") {
          const delta = minWeek - plannedWeek;
          if (delta > 0) mat.color.setHex(0xef4444); // Delayed (Red)
          else if (delta < 0) mat.color.setHex(0x10b981); // Ahead (Green)
          else mat.color.setHex(0x0284c7); // On Schedule (Blue)
        } else {
          mat.color.setHex(originalColor);
        }
      }

      // 2. Safe Emissive Selection Highlighting
      if (mat.emissive && originalEmissive !== undefined) {
        const isSelected = selectedEntity.id === entityId || (selectedEntity.type === "ZONE" && zone === selectedEntity.id.replace("ZONE_", ""));
        if (isSelected) {
          mat.emissive.setHex(0x0a5c7a);
          mat.emissiveIntensity = 0.6;
        } else {
          mat.emissive.setHex(originalEmissive);
          mat.emissiveIntensity = originalEmissiveIntensity;
        }
      }
    });
  }, [timelineWeek, timelineMode, activeLevel, activeZone, selectedEntity, isHydrated]);`;

  fs.writeFileSync(file, before + safeEffectBlock + after, 'utf8');
  console.log("\x1b[32m✓ FIXED: Material properties crash resolved.\x1b[0m");
} else {
  console.log("\x1b[31m[ERROR] Could not find the target useEffect block. Manual inspection required.\x1b[0m");
}
NODE_RUNNER_EOF
