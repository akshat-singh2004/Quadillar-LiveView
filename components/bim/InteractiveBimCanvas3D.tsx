"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface Props {
  planCutZ?: number;
}

export default function InteractiveBimCanvas3D({ planCutZ = 100 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("VAV-1-NW-04");
  const clipPlaneRef = useRef<THREE.Plane | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // SCENE & RENDERER SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(38, 26, 42);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.localClippingEnabled = true;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    // CLIPPING PLANE FOR PLAN CUT SLIDER
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 16);
    clipPlaneRef.current = clipPlane;

    // LIGHTS
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xdff0ff, 1.4);
    dirLight.position.set(40, 60, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const cyanRim = new THREE.DirectionalLight(0x00f0ff, 0.6);
    cyanRim.position.set(-30, 20, -30);
    scene.add(cyanRim);

    // BASE DATUM GRID
    const grid = new THREE.GridHelper(60, 30, 0x00f0ff, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    // BIM MODEL ROOT
    const bimGroup = new THREE.Group();
    scene.add(bimGroup);
    const pickables: THREE.Object3D[] = [];

    // MATERIALS
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.8,
      clippingPlanes: [clipPlane]
    });

    const ductMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25,
      clippingPlanes: [clipPlane]
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      roughness: 0.1,
      transmission: 0.6,
      clippingPlanes: [clipPlane]
    });

    const firePipeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.5,
      roughness: 0.3,
      clippingPlanes: [clipPlane]
    });

    const defectMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.7,
      metalness: 0.6,
      roughness: 0.2,
      clippingPlanes: [clipPlane]
    });

    // 1. Level 0 & Level 1 Slabs
    const l0Slab = new THREE.Mesh(new THREE.BoxGeometry(44, 1.2, 32), concreteMat);
    l0Slab.position.set(0, 0.6, 0);
    bimGroup.add(l0Slab);

    const l1Slab = new THREE.Mesh(new THREE.BoxGeometry(44, 0.8, 32), concreteMat);
    l1Slab.position.set(0, 7.5, 0);
    bimGroup.add(l1Slab);

    // 2. Structural Columns (Grids C1 to D4)
    for (let x = -16; x <= 16; x += 11) {
      for (let z = -12; z <= 12; z += 8) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(1.2, 14, 1.2), concreteMat);
        col.position.set(x, 7, z);
        col.userData = { name: `Column Grid (${x > 0 ? "D" : "C"}-${z > 0 ? "4" : "1"})` };
        pickables.push(col);
        bimGroup.add(col);
      }
    }

    // 3. Transparent Facade
    const facade = new THREE.Mesh(new THREE.BoxGeometry(44.2, 14, 32.2), glassMat);
    facade.position.set(0, 7, 0);
    bimGroup.add(facade);

    // 4. Core Shear Wall
    const core = new THREE.Mesh(new THREE.BoxGeometry(8, 16, 10), concreteMat);
    core.position.set(-10, 8, -4);
    bimGroup.add(core);

    // 5. HVAC Ductwork Network
    const mainDuct = new THREE.Mesh(new THREE.BoxGeometry(34, 1.2, 1.8), ductMat);
    mainDuct.position.set(2, 6.2, 3);
    mainDuct.userData = { name: "Main Supply Air Duct (12,000 CFM)" };
    pickables.push(mainDuct);
    bimGroup.add(mainDuct);

    for (let x = -12; x <= 14; x += 7) {
      const branch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 10), ductMat);
      branch.position.set(x, 6.2, 8);
      bimGroup.add(branch);
    }

    // 6. Defect Unit: VAV-1-NW-04 (Grid C3-D4)
    const vavBox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 2.0), defectMat);
    vavBox.position.set(12, 6.2, 8);
    vavBox.userData = { name: "VAV Terminal Unit 1-NW-04 [DLP-TKT-2026-001]" };
    pickables.push(vavBox);
    bimGroup.add(vavBox);

    // Holographic Pulsing Halo
    const haloGeo = new THREE.RingGeometry(1.8, 2.2, 32);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(12, 4.8, 8);
    bimGroup.add(halo);

    // 7. Fire Riser Pipe (AST-FIRE-RSR-01)
    const fireRiser = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 15, 16), firePipeMat);
    fireRiser.position.set(-6, 7.5, -4);
    fireRiser.userData = { name: "Wet Riser Landing Valve (AST-FIRE-RSR-01)" };
    pickables.push(fireRiser);
    bimGroup.add(fireRiser);

    // 360° ORBIT CONTROLS VIA MOUSE
    let isDragging = false;
    let prevX = 0, prevY = 0;
    let sph = { r: 65, phi: Math.PI / 3.2, theta: Math.PI / 4 };

    const updateCam = () => {
      camera.position.x = sph.r * Math.sin(sph.phi) * Math.sin(sph.theta);
      camera.position.y = sph.r * Math.cos(sph.phi);
      camera.position.z = sph.r * Math.sin(sph.phi) * Math.cos(sph.theta);
      camera.lookAt(0, 6, 0);
    };
    updateCam();

    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = (e: MouseEvent) => {
      // Raycasting for Hover
      const rect = mount.getBoundingClientRect();
      const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects(pickables, false);

      if (hits.length > 0) {
        mount.style.cursor = "pointer";
        setHovered(hits[0].object.userData.name || "BIM Asset");
      } else {
        mount.style.cursor = isDragging ? "grabbing" : "default";
        setHovered(null);
      }

      if (!isDragging) return;
      sph.theta -= (e.clientX - prevX) * 0.008;
      sph.phi = Math.max(0.1, Math.min(Math.PI / 2.05, sph.phi - (e.clientY - prevY) * 0.008));
      prevX = e.clientX;
      prevY = e.clientY;
      updateCam();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      sph.r = Math.max(15, Math.min(120, sph.r + e.deltaY * 0.05));
      updateCam();
    };

    const onClick = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects(pickables, false);
      if (hits.length > 0) {
        setSelected(hits[0].object.userData.name);
      }
    };

    mount.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    mount.addEventListener("wheel", onWheel, { passive: false });
    mount.addEventListener("click", onClick);

    // RESIZE OBSERVER
    const ro = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    ro.observe(mount);

    // ANIMATION
    let reqId: number;
    let clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      halo.scale.set(1 + Math.sin(t * 4) * 0.15, 1 + Math.sin(t * 4) * 0.15, 1);
      haloMat.opacity = 0.5 + Math.sin(t * 4) * 0.4;
      if (!isDragging) bimGroup.rotation.y = Math.sin(t * 0.2) * 0.03;
      renderer.render(scene, camera);
      reqId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(reqId);
      mount.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      mount.removeEventListener("wheel", onWheel);
      mount.removeEventListener("click", onClick);
      ro.disconnect();
      renderer.dispose();
    };
  }, []);

  // Update Plan Cut Height based on Slider (0-100% -> Y: 0 to 18m)
  useEffect(() => {
    if (clipPlaneRef.current) {
      clipPlaneRef.current.constant = (planCutZ / 100) * 16.0;
    }
  }, [planCutZ]);

  return (
    <div className="relative w-full h-full min-h-[460px] bg-slate-950 rounded-xl overflow-hidden">
      <div ref={mountRef} className="w-full h-full min-h-[460px]" />
      <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none">
        <div className="px-2.5 py-1 bg-slate-900/90 border border-cyan-500/40 rounded text-xs font-mono text-cyan-300 flex items-center gap-2 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          WebGL 3D Engine: Active (LOD 350 Model)
        </div>
        {hovered && (
          <div className="px-2.5 py-1 bg-blue-950/90 border border-blue-400/50 rounded text-[11px] font-mono text-blue-200">
            {hovered}
          </div>
        )}
      </div>
      {selected && (
        <div className="absolute top-3 right-3 px-3 py-1.5 bg-amber-950/80 border border-amber-500/60 rounded text-xs font-mono text-amber-200 backdrop-blur-md">
          Target: {selected}
        </div>
      )}
      <div className="absolute bottom-3 left-3 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 pointer-events-none">
        [Mouse: 360° Drag Rotate | Scroll: Zoom | Click: Element Metadata]
      </div>
    </div>
  );
}
