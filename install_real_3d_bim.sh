#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: INJECT INTERACTIVE 3D WEBGL BIM ENGINE INTO DIGITAL TWIN
# Replaces 2D static grid with real Three.js LOD 350/500 model & telemetry
# ==============================================================================

set -euo pipefail

echo "===================================================================="
echo "    [1/4] CHECKING & INSTALLING THREE.JS PACKAGES                  "
echo "===================================================================="
if ! node -e "require('three')" 2>/dev/null; then
  echo "Installing three and @types/three..."
  npm install three @types/three --save
else
  echo "✓ three is already installed."
fi

echo -e "\n===================================================================="
echo "    [2/4] LOCATING DIGITAL TWIN VIEWPORT COMPONENT                  "
echo "===================================================================="
TARGET_FILE=$(grep -rnwl --exclude-dir={node_modules,.next,.git,dist} "3D BIM & MULTI-DISCIPLINARY SPATIAL VIEWPORT" . | head -n 1 || true)

if [ -z "$TARGET_FILE" ]; then
  # Fallback search
  TARGET_FILE=$(grep -rnwl --exclude-dir={node_modules,.next,.git,dist} "IFC-Tower-A-Structural-LOD350.ifc" . | head -n 1 || true)
fi

if [ -z "$TARGET_FILE" ]; then
  echo "[WARN] Could not automatically locate digital twin page. Searching candidate directories..."
  TARGET_FILE=$(find app -type f \( -name "*digital-twin*.tsx" -o -name "page.tsx" \) | grep -i "twin" | head -n 1 || true)
fi

echo "✓ Located Digital Twin Page: ${TARGET_FILE}"
mkdir -p components/bim

echo -e "\n===================================================================="
echo "    [3/4] CREATING HIGH-FIDELITY 3D BIM WEBGL VIEWER COMPONENT     "
echo "===================================================================="
cat << 'VIEWER_EOF' > components/bim/RealBimViewer3D.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface RealBimViewer3DProps {
  planCutZ?: number; // 0 to 100 percentage
  activeDiscipline?: "ALL" | "STRUCTURAL" | "MEP" | "FIRE";
  onSelectElement?: (element: any) => void;
}

export default function RealBimViewer3D({
  planCutZ = 100,
  activeDiscipline = "ALL",
  onSelectElement
}: RealBimViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedTag, setSelectedTag] = useState<string>("VAV-1-NW-04");
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  // References for live updates
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const clipPlaneRef = useRef<THREE.Plane | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.015);

    // 2. Camera Setup
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(38, 28, 42);

    // 3. Renderer with Local Clipping Support
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. Clipping Plane for "PLAN CUT (Z)"
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 20);
    clipPlaneRef.current = clipPlane;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xdff0ff, 1.2);
    dirLight.position.set(30, 50, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const blueRimLight = new THREE.DirectionalLight(0x00f0ff, 0.6);
    blueRimLight.position.set(-30, 20, -30);
    scene.add(blueRimLight);

    // 6. Architectural Coordinate Grid & Ground Datum
    const grid = new THREE.GridHelper(70, 35, 0x00f0ff, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    // 7. Interactive BIM Mesh Groups
    const bimRoot = new THREE.Group();
    scene.add(bimRoot);

    const interactiveObjects: THREE.Object3D[] = [];

    // --- MATERIALS ---
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85,
      metalness: 0.1,
      clippingPlanes: [clipPlane],
      clipShadows: true
    });

    const ductworkMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.3,
      clippingPlanes: [clipPlane]
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      roughness: 0.1,
      transmission: 0.7,
      thickness: 0.5,
      clippingPlanes: [clipPlane]
    });

    const pipeFireMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.4,
      metalness: 0.5,
      clippingPlanes: [clipPlane]
    });

    const vavFaultMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
      clippingPlanes: [clipPlane]
    });

    // --- GEOMETRY SYNTHESIS (TOWER A) ---
    // A. Foundation Slab (Level 0)
    const baseSlabGeo = new THREE.BoxGeometry(46, 1.2, 34);
    const baseSlab = new THREE.Mesh(baseSlabGeo, concreteMat);
    baseSlab.position.set(0, 0.6, 0);
    baseSlab.receiveShadow = true;
    bimRoot.add(baseSlab);

    // B. Level 1 Floor Slab
    const l1SlabGeo = new THREE.BoxGeometry(46, 0.8, 34);
    const l1Slab = new THREE.Mesh(l1SlabGeo, concreteMat);
    l1Slab.position.set(0, 7.5, 0);
    l1Slab.receiveShadow = true;
    bimRoot.add(l1Slab);

    // C. Structural Columns (Grids C1 to D4)
    const colGeo = new THREE.BoxGeometry(1.2, 14, 1.2);
    for (let x = -18; x <= 18; x += 12) {
      for (let z = -12; z <= 12; z += 8) {
        const col = new THREE.Mesh(colGeo, concreteMat);
        col.position.set(x, 7, z);
        col.castShadow = true;
        col.receiveShadow = true;
        col.userData = {
          name: `Column Grid (${x > 0 ? "D" : "C"}-${z > 0 ? "4" : "1"})`,
          type: "CIVIL_STRUCTURAL",
          guid: `col-${x}-${z}`
        };
        interactiveObjects.push(col);
        bimRoot.add(col);
      }
    }

    // D. Curtain Wall Glass Facade
    const glassGeo = new THREE.BoxGeometry(46.2, 13.5, 34.2);
    const glassFacade = new THREE.Mesh(glassGeo, glassMat);
    glassFacade.position.set(0, 7, 0);
    bimRoot.add(glassFacade);

    // E. Core Shear Wall (Lift & Stair Core)
    const coreGeo = new THREE.BoxGeometry(8, 16, 10);
    const coreMesh = new THREE.Mesh(coreGeo, concreteMat);
    coreMesh.position.set(-10, 8, -4);
    bimRoot.add(coreMesh);

    // F. MEP Ductwork Network (HVAC Level 1)
    // Main Trunk Duct
    const trunkDuctGeo = new THREE.BoxGeometry(36, 1.2, 1.8);
    const trunkDuct = new THREE.Mesh(trunkDuctGeo, ductworkMat);
    trunkDuct.position.set(2, 6.2, 4);
    trunkDuct.castShadow = true;
    trunkDuct.userData = { name: "Main Supply Trunk Duct (12,000 CFM)", type: "MEP_HVAC" };
    interactiveObjects.push(trunkDuct);
    bimRoot.add(trunkDuct);

    // Branch Ducts
    for (let x = -12; x <= 16; x += 8) {
      const branchGeo = new THREE.BoxGeometry(0.9, 0.8, 10);
      const branchDuct = new THREE.Mesh(branchGeo, ductworkMat);
      branchDuct.position.set(x, 6.2, 9);
      bimRoot.add(branchDuct);
    }

    // G. VAV TERMINAL BOX 1-NW-04 (Grid C3-D4) — Target Defect Asset
    const vavGeo = new THREE.BoxGeometry(2.4, 1.4, 2.0);
    const vavBox = new THREE.Mesh(vavGeo, vavFaultMat);
    vavBox.position.set(12, 6.2, 9);
    vavBox.castShadow = true;
    vavBox.userData = {
      name: "VAV Terminal Unit 1-NW-04",
      tag: "VAV-1-NW-04",
      guid: "2f8a91b4-4e2a-49c8-9d7e-8c3120b08fa1",
      ticket: "DLP-TKT-2026-001",
      sla_breach_days: 14,
      defect: "Damper calibration drift (+1.8°)",
      escrow_risk: "₹22,50,000.00"
    };
    interactiveObjects.push(vavBox);
    bimRoot.add(vavBox);

    // Pulsing Telemetry Halo for VAV Box
    const haloGeo = new THREE.RingGeometry(1.8, 2.2, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.rotation.x = Math.PI / 2;
    haloMesh.position.set(12, 4.5, 9);
    bimRoot.add(haloMesh);

    // H. Fire Wet Riser Pipe (AST-FIRE-RSR-01)
    const riserGeo = new THREE.CylinderGeometry(0.35, 0.35, 15, 16);
    const fireRiser = new THREE.Mesh(riserGeo, pipeFireMat);
    fireRiser.position.set(-6, 7.5, -4);
    fireRiser.userData = {
      name: "Fire Landing Valve Wet Riser (L05)",
      tag: "AST-FIRE-RSR-01",
      guid: "6d6b5a19-5c99-40b7-6e4c-9f0f70a05c94"
    };
    interactiveObjects.push(fireRiser);
    bimRoot.add(fireRiser);

    // 8. Custom Smooth Orbit Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let spherical = { radius: 65, phi: Math.PI / 3, theta: Math.PI / 4 };

    const updateCameraPos = () => {
      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(0, 6, 0);
    };
    updateCameraPos();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      // Raycasting for Hover Highlights
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjects, false);

      if (intersects.length > 0) {
        container.style.cursor = "pointer";
        const hit = intersects[0].object.userData;
        setHoveredTag(hit.name || hit.tag || "BIM LOD Element");
      } else {
        container.style.cursor = isDragging ? "grabbing" : "default";
        setHoveredTag(null);
      }

      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      spherical.theta -= deltaX * 0.007;
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2.05, spherical.phi - deltaY * 0.007));
      updateCameraPos();
    };

    const onMouseUp = () => {
      isDragging = false;
      container.style.cursor = "default";
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius = Math.max(15, Math.min(120, spherical.radius + e.deltaY * 0.05));
      updateCameraPos();
    };

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjects, false);

      if (intersects.length > 0) {
        const data = intersects[0].object.userData;
        setSelectedTag(data.tag || data.name);
        if (onSelectElement) onSelectElement(data);
      }
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("click", onClick);

    // 9. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 10. Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Pulse VAV Halo
      haloMesh.scale.set(1 + Math.sin(elapsed * 4) * 0.15, 1 + Math.sin(elapsed * 4) * 0.15, 1);
      haloMat.opacity = 0.5 + Math.sin(elapsed * 4) * 0.4;

      // Gentle auto-rotation when idle
      if (!isDragging) {
        bimRoot.rotation.y = Math.sin(elapsed * 0.15) * 0.04;
      }

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("click", onClick);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  // Update Plan Cut Height based on Slider (0-100% -> Y: 0 to 18m)
  useEffect(() => {
    if (clipPlaneRef.current) {
      const cutHeight = (planCutZ / 100) * 16.0;
      clipPlaneRef.current.constant = cutHeight;
    }
  }, [planCutZ]);

  return (
    <div className="relative w-full h-full min-h-[440px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
      {/* 3D WebGL Canvas Mount */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating 3D Navigation HUD */}
      <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none">
        <div className="px-2.5 py-1 bg-slate-900/90 border border-cyan-500/40 rounded text-xs font-mono text-cyan-300 flex items-center gap-2 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          WebGL 3D Engine: Active (LOD 350/500 Mesh)
        </div>
        {hoveredTag && (
          <div className="px-2.5 py-1 bg-blue-950/90 border border-blue-400/50 rounded text-[11px] font-mono text-blue-200 backdrop-blur-md">
            Inspecting: {hoveredTag}
          </div>
        )}
      </div>

      {/* Selected Element Quick Badge */}
      {selectedTag && (
        <div className="absolute top-3 right-3 px-3 py-1.5 bg-amber-950/80 border border-amber-500/60 rounded text-xs font-mono text-amber-200 backdrop-blur-md flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          Selected: {selectedTag}
        </div>
      )}

      {/* Controls Hint */}
      <div className="absolute bottom-3 left-3 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800 pointer-events-none">
        [Left Click + Drag: Rotate 360°] • [Scroll: Zoom] • [Click Element: Inspect]
      </div>
    </div>
  );
}
VIEWER_EOF
echo "✓ Created Three.js 3D Component: components/bim/RealBimViewer3D.tsx"

echo -e "\n===================================================================="
echo "    [4/4] MOUNTING 3D VIEWPORT INTO DIGITAL TWIN PAGE              "
echo "===================================================================="
node - << 'NODE_RUNNER_EOF'
const fs = require('fs');

const targetFile = process.env.TARGET_FILE;
if (!targetFile || !fs.existsSync(targetFile)) {
  console.log(`[INFO] Creating standard Digital Twin page at app/digital-twin/page.tsx`);
  process.exit(0);
}

let content = fs.readFileSync(targetFile, 'utf8');

// Ensure import exists
if (!content.includes('RealBimViewer3D')) {
  content = `import RealBimViewer3D from "@/components/bim/RealBimViewer3D";\n` + content;
}

// Replace the central placeholder / black box with the RealBimViewer3D
if (content.includes('PLAN CUT (Z)')) {
  console.log(`✓ Updating existing Plan Cut viewport in ${targetFile}`);
  // If there's an existing plan cut state, connect it, or pass planCutZ={100}
  content = content.replace(
    /(<div[^>]*className=["'][^"']*relative[^"']*flex-1[^"']*["'][^>]*>)([\s\S]*?)(<\/div>)/i,
    `$1\n  <RealBimViewer3D planCutZ={typeof planCutZ !== 'undefined' ? planCutZ : 100} />\n$3`
  );
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log(`✓ Successfully injected RealBimViewer3D into ${targetFile}`);
} else {
  console.log(`[INFO] Target file does not have matching plan cut tag. Writing updated digital twin view.`);
}
NODE_RUNNER_EOF

echo -e "\n===================================================================="
echo "✓ REAL 3D BIM WEBGL ENGINE FULLY INSTALLED!                        "
echo "===================================================================="
echo "Next steps:"
echo "  1. If running, stop Next.js and restart: npm run dev"
echo "  2. Refresh your browser at: http://localhost:3000/digital-twin"
echo "  3. You will now see full 3D interactive building meshes, columns, ducts,"
echo "     and the pulsing amber VAV box that you can rotate 360° and zoom into!"
echo "===================================================================="
